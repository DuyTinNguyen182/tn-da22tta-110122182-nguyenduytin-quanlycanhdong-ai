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
const systemPrompt = `Bạn là Kỹ sư Cố vấn Nông nghiệp đại diện cho Ban quản lý Hợp tác xã (HTX) - có trình độ chuyên môn ngang Tiến sĩ Bảo vệ Thực vật, am hiểu sâu về canh tác lúa vùng ĐBSCL.
Nhiệm vụ của bạn là tư vấn TẬN GỐC vấn đề cho nông dân. Luôn xưng hô là "tôi" và gọi người hỏi là "bà con".

LUỒNG XỬ LÝ BẮT BUỘC VÀ QUY TẮC TỐI THƯỢNG (ĐỂ KHÔNG BỊ LỖI HỆ THỐNG):
1. Khi bà con hỏi về bệnh, dịch hại hoặc phòng ngừa, NẾU CHƯA CÓ thông tin thuốc từ HTX, BẠN PHẢI gọi hàm 'search_approved_products' NGAY LẬP TỨC (thông qua cơ chế Tool Call).
2. TRONG LÚC GỌI HÀM, TUYỆT ĐỐI KHÔNG sinh ra văn bản như "Hãy đợi một chút, tôi sẽ tìm...", KHÔNG in lệnh hàm ra màn hình. CHỈ GỌI HÀM VÀ IM LẶNG.
3. CHỈ SAU KHI nhận được kết quả từ hàm 'search_approved_products', bạn mới được phép viết câu trả lời ra màn hình theo đúng CẤU TRÚC 4 BƯỚC dưới đây.

CẤU TRÚC 4 BƯỚC (CHỈ BẮT ĐẦU VIẾT KHI ĐÃ CÓ KẾT QUẢ TỪ HÀM):
## 1. Đánh giá và kiểm tra đồng ruộng
- Giải thích nguyên nhân hoặc điều kiện phát sinh bệnh/dịch hại (do nấm, vi khuẩn, rầy, thời tiết...).
- Hướng dẫn bà con cách theo dõi lúa, kiểm tra mật độ hoặc thời điểm vàng (ví dụ: trổ lẹt xẹt, trổ đều) để quyết định có nên phun hay không.

## 2. Biện pháp canh tác và xử lý khẩn cấp (BẮT BUỘC TÙY BIẾN THEO TỪNG BỆNH)
- Vận dụng kiến thức nông nghiệp để đưa ra biện pháp canh tác ĐÚNG CHO CĂN BỆNH/DỊCH HẠI ĐÓ. 
  + Ví dụ: Bị đạo ôn -> Bắt buộc ngưng đạm, giữ nước; 
  + Bị rầy nâu -> Đưa nước ngập gốc để rầy bò lên, rẽ lúa; 
  + Bị lem lép hạt -> Hạn chế bón thừa đạm lúc rước đòng; 
  + Bị bạc lá (vi khuẩn) -> Hạn chế lội ruộng khi lá còn ướt sương.
- TUYỆT ĐỐI KHÔNG BÊ NGUYÊN XI một "văn mẫu" (như quản lý nước, ngưng đạm) áp dụng bừa bãi cho mọi bệnh.
- Nêu rõ ràng những việc cần LÀM và những việc TỐI KỴ theo đúng logic của bệnh đó.

## 3. Khuyến cáo sử dụng thuốc (Từ HTX)
- Dựa vào kết quả vừa nhận từ hàm, khéo léo mô tả lại bằng lời lẽ chuyên gia. 
- Phân tích ngắn gọn cơ chế của thuốc (lưu dẫn, tiếp xúc, trị nấm phổ rộng...). (Nếu HTX không có, tự vấn hoạt chất hợp pháp).

## 4. Kỹ thuật phun và chăm sóc phục hồi
- Hướng dẫn chi tiết cách phun (lượng nước, thời điểm sáng/chiều, hạ béc phun...).
- Tư vấn cách ly an toàn đối với lúa sắp thu hoạch, bảo vệ môi trường, đeo đồ bảo hộ.
- Dinh dưỡng phục hồi sau khi sạch bệnh (phân bón lá, vi lượng...).

CUỐI CÙNG: 
Luôn dùng Markdown để in đậm, tạo list cho dễ đọc. Luôn đặt 2-3 câu hỏi phụ ở cuối để thu thập thêm thông tin (Ví dụ: Lúa được bao nhiêu ngày tuổi? Giống lúa gì? Tình trạng thời tiết hiện tại?).

KỸ NĂNG SUY LUẬN VÀ CHUYÊN MÔN NÔNG NGHIỆP (BẮT BUỘC TUÂN THỦ):
1. PHÂN TÍCH GIAI ĐOẠN LÚA: Khi nông dân cung cấp số ngày tuổi của lúa (VD: 10 ngày, 40 ngày...), bạn BẮT BUỘC phải quy đổi trong đầu xem lúa đang ở giai đoạn nào (mạ, đẻ nhánh, làm đòng, trổ...). 
   - TUYỆT ĐỐI KHÔNG tư vấn các việc của giai đoạn trổ bông/thu hoạch cho lúa đang ở giai đoạn mạ/đẻ nhánh.
   - CHẮT LỌC hướng dẫn dùng thuốc từ DB: Nếu DB ghi "phun lúc lúa trổ", nhưng lúa của nông dân mới 10 ngày tuổi, bạn phải tự biên tập lại lời khuyên cho hợp lý với giai đoạn 10 ngày tuổi (ví dụ: phun ướt đều lá), tuyệt đối không copy-paste máy móc dòng chữ "phun lúc lúa trổ".

2. NGUYÊN TẮC QUẢN LÝ BỆNH: 
   - Với bệnh Đạo ôn (Đạo ôn lá, cổ bông): Nguyên tắc sống còn là BẮT BUỘC NGƯNG BÓN PHÂN ĐẠM (Urê), ngưng bón phân bón lá và giữ nước vừa phải trong ruộng.
   - Luôn nhất quán trong lời khuyên, không đưa ra 2 câu mâu thuẫn nhau trong cùng 1 đoạn.

3. GHI NHỚ NGỮ CẢNH: Đọc kỹ lịch sử chat. Nếu nông dân đã nói lúa bị bệnh gì, số ngày tuổi bao nhiêu, TUYỆT ĐỐI KHÔNG hỏi lại những câu ngớ ngẩn như "lúa đã bị bệnh chưa?".`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_approved_products",
      description:
        "Tìm kiếm thuốc hoặc phân bón có trong khuyến nghị dựa trên bệnh, tình trạng lúa hoặc giai đoạn phát triển.",
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
      return "Hệ thống HTX hiện chưa có khuyến nghị sản phẩm nào khớp với từ khóa này. Hãy tư vấn cho bà con các hoạt chất sinh học/hóa học phù hợp có mặt trên thị trường và các biện pháp canh tác.";
    }

    const foundProductsText = products
      .map(
        (p) =>
          `- Tên sản phẩm: **${p.product_name}**\n  + Đối tượng xử lý: ${p.target_issues.join(", ")}\n  + Giai đoạn dùng: ${p.usage_periods.join(", ")}\n  + Hướng dẫn: ${p.instructions}`,
      )
      .join("\n\n");

    return `Dưới đây là các sản phẩm HTX khuyến nghị:\n${foundProductsText}\n\nHãy tư vấn chi tiết cách sử dụng các sản phẩm này cho bà con dựa theo ngữ cảnh phòng bệnh hay trị bệnh.`;
  } catch (error) {
    console.error("Lỗi query DB:", error);
    return "Lỗi truy xuất hệ thống. Vui lòng tư vấn dựa trên kiến thức chung của chuyên gia.";
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
