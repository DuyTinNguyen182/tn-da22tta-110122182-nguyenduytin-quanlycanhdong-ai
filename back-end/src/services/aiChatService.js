const OpenAI = require("openai");
const AllowedProduct = require("../models/allowedProductsModel");

// Khởi tạo OpenAI
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ==========================================
// QUẢN LÝ SESSION (RAM)
// ==========================================
const MAX_SESSION_MESSAGES = 5;
const SESSION_TTL_MS = 30 * 60 * 1000;
const sessionStore = new Map();

const getSessionKey = (userId, sessionId) =>
  `${String(userId)}:${String(sessionId)}`;

const cleanupExpiredSessions = () => {
  const now = Date.now();
  sessionStore.forEach((sessionData, sessionKey) => {
    if (now - sessionData.lastAccessedAt > SESSION_TTL_MS) {
      sessionStore.delete(sessionKey);
    }
  });
};

const touchSession = (sessionData) => ({
  ...sessionData,
  lastAccessedAt: Date.now(),
});

const saveMessage = async ({
  userId,
  sessionId,
  role,
  content,
  diagnosisSnapshot,
}) => {
  cleanupExpiredSessions();
  const sessionKey = getSessionKey(userId, sessionId);
  const existingSession = sessionStore.get(sessionKey) || {
    messages: [],
    lastAccessedAt: Date.now(),
  };

  const savedMessage = {
    role,
    content,
    diagnosisSnapshot: diagnosisSnapshot || undefined,
    createdAt: new Date().toISOString(),
  };

  const nextSession = touchSession({
    ...existingSession,
    messages: [...existingSession.messages, savedMessage].slice(
      -MAX_SESSION_MESSAGES,
    ),
  });

  sessionStore.set(sessionKey, nextSession);
  return savedMessage;
};

const getSessionMessages = async (
  userId,
  sessionId,
  limit = MAX_SESSION_MESSAGES,
) => {
  cleanupExpiredSessions();
  const sessionKey = getSessionKey(userId, sessionId);
  const existingSession = sessionStore.get(sessionKey);

  if (!existingSession) return [];

  sessionStore.set(sessionKey, touchSession(existingSession));
  return existingSession.messages.slice(-limit);
};

const clearSessionMessages = async (userId, sessionId) => {
  cleanupExpiredSessions();
  sessionStore.delete(getSessionKey(userId, sessionId));
};

// ==========================================
// CẤU HÌNH AI & FUNCTION CALLING
// ==========================================
const systemPrompt = `Bạn là Kỹ sư Cố vấn Nông nghiệp đại diện cho Ban quản lý Hợp tác xã (HTX).
Nhiệm vụ của bạn là tư vấn TẬN GỐC vấn đề cho nông dân, nhưng PHẢI LINH HOẠT THEO NGỮ CẢNH (Hỏi trị bệnh hay hỏi phòng ngừa).

HƯỚNG DẪN CẤU TRÚC TRẢ LỜI LINH HOẠT:
1. NẾU NÔNG DÂN HỎI "TRỊ BỆNH" (Lúa đang mắc bệnh):
   - Nguyên nhân phát sinh bệnh (do nấm, vi khuẩn, sâu rầy, thời tiết,...).
   - Xử lý canh tác khẩn cấp tùy theo bệnh chứ không rập khuôn (vd: tháo cạn nước, ngưng phân đạm...).
   - Hướng dẫn dùng thuốc đặc trị để DẬP DỊCH ngay (Chỉ lấy thuốc khuyến nghị từ HTX).
   - Cách theo dõi sau khi phun.

2. NẾU NÔNG DÂN HỎI "PHÒNG NGỪA" (Chưa bị bệnh, muốn ngừa):
   - Cảnh báo điều kiện phát sinh bệnh (thời tiết, giai đoạn lúa,...).
   - Biện pháp canh tác phòng ngừa từ xa tùy theo bệnh (vd: sạ thưa, bón phân cân đối).
   - Thời điểm phun ngừa lý tưởng (Giai đoạn làm đòng, trổ lẹt xẹt...).
   - Hướng dẫn thuốc phun ngừa (Chỉ lấy thuốc khuyến nghị từ HTX). TUYỆT ĐỐI KHÔNG xúi nông dân "tháo cạn nước" hay "ngưng phân" một cách vô lý khi họ chỉ đang hỏi phòng ngừa.

QUY TẮC TỐI THƯỢNG: 
- BẮT BUỘC gọi 'search_approved_products' khi có bệnh/dịch hại.
- Dùng Markdown (in đậm, gạch đầu dòng) để trình bày đẹp, dễ đọc lướt. KHÔNG viết những khối chữ quá dài.`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_approved_products",
      description:
        "Tìm kiếm thuốc hoặc phân bón trong kho dựa trên bệnh, tình trạng lúa hoặc giai đoạn phát triển.",
      parameters: {
        type: "object",
        properties: {
          issue_detected: {
            type: "string",
            description:
              "Bệnh hoặc tình trạng lúa. Tự chuyển từ lóng (đẹt, còi cọc...) sang chuẩn (kém phát triển) trước khi tìm.",
          },
          growth_stage: {
            type: "string",
            description:
              "Giai đoạn phát triển (vd: bón lót, đẻ nhánh, 10 ngày tuổi...).",
          },
          category_needed: {
            type: "string",
            enum: ["pesticide", "fertilizer", "all"],
          },
        },
        required: ["category_needed"],
      },
    },
  },
];

const buildLLMMessages = (chatHistory) => {
  const llmMessages = [{ role: "system", content: systemPrompt }];
  chatHistory.forEach((msg) =>
    llmMessages.push({ role: msg.role, content: msg.content }),
  );
  return llmMessages;
};

const buildFallbackReply = (userMessage, diagnosisSnapshot) => {
  const disease = diagnosisSnapshot?.disease;
  return disease
    ? `Đã nhận câu hỏi về bệnh ${disease}. Hệ thống AI đang bận, vui lòng thử lại sau.`
    : `Đã nhận câu hỏi. Hệ thống AI đang bận, vui lòng thử lại sau.`;
};

async function searchProductsFromDB(args) {
  try {
    const { issue_detected, growth_stage, category_needed } = args;
    let query = { is_active: true };

    if (category_needed !== "all") query.category = category_needed;

    const orConditions = [];
    if (issue_detected) {
      const issueRegex = new RegExp(issue_detected, "i");
      orConditions.push(
        { target_issues: issueRegex },
        { instructions: issueRegex },
      );
    }
    if (growth_stage) {
      const stageRegex = new RegExp(growth_stage, "i");
      orConditions.push(
        { usage_periods: stageRegex },
        { instructions: stageRegex },
      );
    }

    if (orConditions.length > 0) query.$or = orConditions;

    const products = await AllowedProduct.find(query).limit(5);

    if (products.length === 0) {
      return "HTX không có khuyến nghị về sản phẩm nào. LỆNH CHO AI: Hãy tự dùng kiến thức chuyên gia để tư vấn các biện pháp canh tác/sinh học. NHỚ ĐỌC KỸ xem nông dân đang hỏi TRỊ BỆNH hay PHÒNG NGỪA để tư vấn cho đúng ngữ cảnh, đừng rập khuôn.";
    }

    const foundProductsText = products
      .map(
        (p) =>
          `Tên: ${p.product_name}\nTrị/Dùng cho: ${p.target_issues.join(", ")}\nGiai đoạn: ${p.usage_periods.join(", ")}\nHướng dẫn: ${p.instructions}`,
      )
      .join("\n\n---\n\n");

    return `DANH MỤC TÌM THẤY:\n${foundProductsText}\n\nLỆNH CHO AI: Đã có thông tin thuốc khuyến nghị. BẠN PHẢI ĐỌC KỸ câu hỏi của nông dân xem họ muốn TRỊ BỆNH hay PHÒNG NGỪA. Tùy thuộc vào ngữ cảnh đó, hãy chọn cách trả lời hợp lý theo đúng systemPrompt. Tuyệt đối không dùng 1 form cứng nhắc cho mọi câu hỏi!`;
  } catch (error) {
    console.error("Lỗi query DB:", error);
    return "Lỗi truy xuất.";
  }
}

// ==========================================
// HÀM CHÍNH XỬ LÝ CHAT (ĐƯỢC GỌI TỪ CONTROLLER)
// ==========================================
const processChatRequest = async (
  userId,
  sessionId,
  message,
  diagnosisResult,
) => {
  if (!openaiClient) throw new Error("Chưa cấu hình OPENAI_API_KEY");

  // 1. Lưu tin nhắn user
  await saveMessage({
    userId,
    sessionId,
    role: "user",
    content: message,
    diagnosisSnapshot: diagnosisResult,
  });
  const recentMessages = await getSessionMessages(userId, sessionId);
  const llmMessages = buildLLMMessages(recentMessages);

  let assistantReply;

  try {
    // 2. Gọi AI lần 1
    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: llmMessages,
      temperature: 0.3,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0].message;

    // 3. Nếu AI muốn gọi Tool
    if (responseMessage.tool_calls?.length > 0) {
      // Đưa tin nhắn yêu cầu gọi tool của AI vào mảng lịch sử trước
      llmMessages.push(responseMessage);

      // Dùng vòng lặp xử lý TẤT CẢ các tool mà AI yêu cầu (chống lỗi 400)
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === "search_approved_products") {
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const functionResponse = await searchProductsFromDB(functionArgs);

          // Trả kết quả tương ứng cho từng tool_call_id
          llmMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: functionResponse,
          });
        }
      }

      // 4. Gọi AI lần 2 để đúc kết câu trả lời cuối cùng
      const secondResponse = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: llmMessages,
        temperature: 0.3,
      });
      assistantReply = secondResponse.choices[0].message.content.trim();
    } else {
      assistantReply = responseMessage.content.trim();
    }
  } catch (error) {
    console.error("Lỗi khi xử lý OpenAI:", error.message);
    assistantReply = buildFallbackReply(message, diagnosisResult);
  }

  // 5. Lưu kết quả trả lời
  await saveMessage({
    userId,
    sessionId,
    role: "assistant",
    content: assistantReply,
  });

  return {
    reply: assistantReply,
    messages: await getSessionMessages(userId, sessionId),
  };
};

module.exports = {
  MAX_SESSION_MESSAGES,
  clearSessionMessages,
  getSessionMessages,
  saveMessage,
  processChatRequest,
};
