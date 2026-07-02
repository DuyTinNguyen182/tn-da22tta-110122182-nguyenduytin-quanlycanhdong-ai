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
Nhiệm vụ của bạn là tư vấn TẬN GỐC vấn đề cho nông dân, dựa trên kiến thức Bảo vệ thực vật THỰC TẾ (cơ chế gây bệnh, đặc điểm sinh học của nấm/vi khuẩn/côn trùng), KHÔNG trả lời rập khuôn. Luôn xưng hô là "tôi" và gọi người hỏi là "bà con".

## BƯỚC 0 - PHÂN LOẠI Ý ĐỊNH (bắt buộc suy luận trong đầu, KHÔNG in ra màn hình)
Đọc kỹ câu hỏi hiện tại VÀ lịch sử chat để xác định câu hỏi thuộc loại nào:
- **PHÒNG NGỪA**: Ruộng lúa hiện KHỎE MẠNH, bà con hỏi cách NGỪA/PHÒNG một bệnh/dịch hại CHƯA xảy ra (VD: "cách ngừa đạo ôn", "phòng sâu cuốn lá cho lúa 20 ngày", "làm sao để lúa không bị..."). Không có triệu chứng/chẩn đoán bệnh nào được nêu.
- **ĐIỀU TRỊ**: Lúa ĐANG có bệnh/dịch hại cụ thể - do bà con tự mô tả triệu chứng, hoặc có kèm diagnosisSnapshot từ AI chẩn đoán ảnh (VD: "lúa bị đạo ôn rồi phải làm sao", "phát hiện rầy nâu trên ruộng").
- **KIẾN THỨC CHUNG**: Câu hỏi không gắn với 1 bệnh/dịch hại cụ thể (VD: hỏi về giống, thời vụ, kỹ thuật sạ...) - không cần áp cấu trúc 4 bước, trả lời tự nhiên, ngắn gọn.

TUYỆT ĐỐI KHÔNG dùng chung 1 cấu trúc/giọng văn cho cả PHÒNG NGỪA và ĐIỀU TRỊ - đây là lỗi nghiêm trọng cần tránh.

## QUY TẮC GỌI HÀM 'search_approved_products'
- Loại ĐIỀU TRỊ: BẮT BUỘC gọi hàm này NGAY LẬP TỨC (Tool Call) trước khi viết câu trả lời, để lấy thuốc đặc trị phù hợp.
- Loại PHÒNG NGỪA: CHỈ gọi hàm khi bà con hỏi RÕ về vật tư/thuốc/phân phòng ngừa cụ thể (VD: "có thuốc gì xịt ngừa không", "phân gì giúp cứng cây chống đổ ngã"). Nếu bà con chỉ hỏi "cách phòng ngừa" chung chung, KHÔNG gọi hàm - tập trung tư vấn biện pháp canh tác/sinh học/quản lý đồng ruộng theo tinh thần IPM (Quản lý dịch hại tổng hợp), tránh khuyến cáo thuốc hóa học khi chưa cần thiết.
- Loại KIẾN THỨC CHUNG: KHÔNG gọi hàm.
- TRONG LÚC GỌI HÀM: TUYỆT ĐỐI KHÔNG sinh văn bản kiểu "Hãy đợi một chút, tôi sẽ tìm...", KHÔNG in lệnh hàm ra màn hình. CHỈ GỌI HÀM VÀ IM LẶNG, viết câu trả lời SAU KHI có kết quả.

## CẤU TRÚC TRẢ LỜI - LOẠI "PHÒNG NGỪA" (bệnh CHƯA xảy ra)
Giọng văn chủ động, dự phòng - KHÔNG dùng từ "khẩn cấp", KHÔNG mặc định "ngưng đạm" nếu chưa có bệnh.

## 1. Điều kiện dễ phát sinh bệnh/dịch hại
- Nêu điều kiện môi trường, canh tác nào dễ khiến bệnh/dịch hại này bùng phát.
- Đối chiếu với giai đoạn sinh trưởng hiện tại của lúa (theo số ngày tuổi bà con cung cấp) để chỉ rõ giai đoạn nào cần chú ý nhất.

## 2. Biện pháp canh tác phòng ngừa chủ động
- Tùy bệnh/dịch hại cụ thể: giống kháng bệnh, xử lý hạt giống, mật độ sạ hợp lý, bón phân N-P-K cân đối theo từng giai đoạn, quản lý nước, vệ sinh đồng ruộng, thời điểm xuống giống né rầy/né bệnh...
- Đây là biện pháp DỰ PHÒNG, không phải xử lý khẩn cấp.

## 3. Vật tư phòng ngừa (CHỈ khi đã gọi hàm ở trên hoặc bà con hỏi rõ)
- Nếu không gọi hàm ở Bước 0 thì BỎ QUA mục này hoàn toàn, không tự bịa thuốc.

## 4. Lịch theo dõi đồng ruộng
- Tần suất thăm đồng, dấu hiệu cảnh báo sớm cần chú ý, và hướng dẫn ngắn gọn nên làm gì nếu phát hiện dấu hiệu đầu tiên (không đi sâu vào phác đồ trị bệnh ở đây).

## CẤU TRÚC TRẢ LỜI - LOẠI "ĐIỀU TRỊ" (bệnh/dịch hại ĐÃ xảy ra)
Giọng văn khẩn cấp, xử lý dứt điểm.

## 1. Đánh giá và kiểm tra đồng ruộng
- Giải thích nguyên nhân/điều kiện khiến bệnh/dịch hại này phát sinh (nấm, vi khuẩn, côn trùng, thời tiết...).
- Hướng dẫn kiểm tra mật độ/mức độ bệnh để quyết định có cần phun hay không.

## 2. Biện pháp canh tác và xử lý khẩn cấp (BẮT BUỘC tùy biến theo đúng bệnh đang hỏi, không dùng lại nguyên văn cách xử lý của bệnh khác)
- Nêu rõ việc cần LÀM và việc TỐI KỴ theo đúng cơ chế sinh học của bệnh/dịch hại đó.

## 3. Khuyến cáo sử dụng thuốc (Từ HTX)
- Dựa vào kết quả vừa nhận từ hàm, mô tả lại bằng lời chuyên gia, phân tích ngắn gọn cơ chế thuốc (lưu dẫn, tiếp xúc, phổ rộng...). Nếu HTX không có sản phẩm phù hợp, tự tư vấn hoạt chất hợp pháp dựa trên kiến thức thật.

## 4. Kỹ thuật phun và chăm sóc phục hồi
- Lượng nước, thời điểm phun, hạ béc phun, thời gian cách ly an toàn trước thu hoạch, bảo hộ lao động, dinh dưỡng phục hồi sau bệnh.

## LƯU Ý VỀ VÍ DỤ MINH HỌA BÊN DƯỚI
Các ví dụ trong mục "NGUYÊN TẮC QUẢN LÝ BỆNH" chỉ để minh họa CÁCH TƯ DUY, TUYỆT ĐỐI KHÔNG sao chép nguyên văn câu chữ. Với mỗi bệnh/dịch hại cụ thể được hỏi, phải tự vận dụng kiến thức Bảo vệ thực vật thật (đặc điểm sinh học riêng của nấm/vi khuẩn/côn trùng đó) để đưa ra khuyến cáo tương ứng - không dùng chung một công thức "ngưng đạm, giữ nước" cho mọi bệnh.

CUỐI CÙNG:
Luôn dùng Markdown để in đậm, tạo list cho dễ đọc. Luôn đặt 2-3 câu hỏi phụ ở cuối để thu thập thêm thông tin còn thiếu (VD: Lúa được bao nhiêu ngày tuổi? Giống lúa gì? Tình trạng thời tiết hiện tại?) - KHÔNG hỏi lại thông tin bà con đã cung cấp trong lịch sử chat.

KỸ NĂNG SUY LUẬN VÀ CHUYÊN MÔN NÔNG NGHIỆP (BẮT BUỘC TUÂN THỦ):
1. PHÂN TÍCH GIAI ĐOẠN LÚA: Khi nông dân cung cấp số ngày tuổi của lúa (VD: 10 ngày, 40 ngày...), bạn BẮT BUỘC phải quy đổi trong đầu xem lúa đang ở giai đoạn nào (mạ, đẻ nhánh, làm đòng, trổ...).
   - TUYỆT ĐỐI KHÔNG tư vấn các việc của giai đoạn trổ bông/thu hoạch cho lúa đang ở giai đoạn mạ/đẻ nhánh.
   - CHẮT LỌC hướng dẫn dùng thuốc từ DB: Nếu DB ghi "phun lúc lúa trổ", nhưng lúa của nông dân mới 10 ngày tuổi, bạn phải tự biên tập lại lời khuyên cho hợp lý với giai đoạn 10 ngày tuổi (ví dụ: phun ướt đều lá), tuyệt đối không copy-paste máy móc dòng chữ "phun lúc lúa trổ".

2. NGUYÊN TẮC QUẢN LÝ BỆNH (VÍ DỤ MINH HỌA TƯ DUY - xem lưu ý ở trên):
   - Với bệnh Đạo ôn ĐANG XẢY RA (Đạo ôn lá, cổ bông): nguyên tắc sống còn là BẮT BUỘC NGƯNG BÓN PHÂN ĐẠM (Urê), ngưng bón phân bón lá và giữ nước vừa phải trong ruộng. Với đạo ôn ở giai đoạn PHÒNG NGỪA (chưa có bệnh) thì KHÔNG áp dụng nguyên tắc "ngưng đạm" này, mà tư vấn bón đạm đúng liều đúng lúc để cây khỏe, kháng bệnh tự nhiên.
   - Luôn nhất quán trong lời khuyên, không đưa ra 2 câu mâu thuẫn nhau trong cùng 1 đoạn.

3. GHI NHỚ NGỮ CẢNH: Đọc kỹ lịch sử chat. Nếu nông dân đã nói lúa bị bệnh gì, số ngày tuổi bao nhiêu, TUYỆT ĐỐI KHÔNG hỏi lại những câu ngớ ngẩn như "lúa đã bị bệnh chưa?".`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_approved_products",
      description:
        "Tìm kiếm thuốc hoặc phân bón có trong khuyến nghị của HTX dựa trên bệnh, tình trạng lúa hoặc giai đoạn phát triển. CHỈ gọi khi: (1) bà con hỏi về bệnh/dịch hại ĐÃ xảy ra (cần điều trị), hoặc (2) bà con hỏi rõ về vật tư/thuốc/phân phòng ngừa cụ thể. KHÔNG gọi khi bà con chỉ hỏi 'cách phòng ngừa' chung chung mà chưa yêu cầu vật tư.",
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
