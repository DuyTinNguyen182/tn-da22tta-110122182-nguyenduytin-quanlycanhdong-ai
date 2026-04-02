const axios = require("axios");
const FormData = require("form-data");
const { randomUUID } = require("crypto");
const OpenAI = require("openai");
const aiChatService = require("../services/aiChatService");

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const systemPrompt =
  "Bạn là trợ lý nông nghiệp Việt Nam. Trả lời rõ ràng, dễ áp dụng, ưu tiên an toàn cho cây lúa, môi trường và người dùng. Nếu thiếu dữ liệu thì nêu giả định.";

exports.diagnoseDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng tải lên hình ảnh lá lúa" });
    }

    // Chuẩn bị form data để gửi sang Python Service
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Gọi sang Python Flask Service (Port 5000)
    const pythonServiceUrl = "http://127.0.0.1:5000/predict";
    const response = await axios.post(pythonServiceUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Trả kết quả về Frontend
    // Sau này có thể lưu kết quả vào MongoDB (Model DiagnosisLog) tại đây
    res.json({
      success: true,
      data: response.data,
      imageName: req.file.originalname
    });

  } catch (error) {
    console.error("AI Service Error:", error.message);
    res.status(500).json({ 
      message: "Không thể kết nối tới dịch vụ AI. Vui lòng thử lại sau.",
      details: error.message 
    });
  }
};

const buildFallbackReply = (userMessage, diagnosisSnapshot) => {
  const disease = diagnosisSnapshot?.disease;
  const confidence =
    typeof diagnosisSnapshot?.confidence === "number"
      ? `${(diagnosisSnapshot.confidence * 100).toFixed(1)}%`
      : null;

  if (disease) {
    return [
      `Đã nhận câu hỏi về bệnh ${disease}${confidence ? ` (độ tin cậy ${confidence})` : ""}.`,
      "Hệ thống AI đang bận hoặc gặp lỗi kết nối tới mô hình.",
      "Bạn vui lòng thử lại sau ít phút hoặc đặt câu hỏi ngắn gọn hơn để hệ thống xử lý tốt hơn.",
      `Nội dung bạn gửi: ${userMessage}`,
    ].join("\n");
  }

  return [
    "Đã nhận câu hỏi của bạn.",
    "Hệ thống AI đang bận hoặc gặp lỗi kết nối tới mô hình.",
    "Bạn vui lòng thử lại sau ít phút hoặc đặt câu hỏi ngắn gọn hơn để hệ thống xử lý tốt hơn.",
  ].join("\n");
};

const buildLLMMessages = (chatHistory) => {
  const llmMessages = [{ role: "system", content: systemPrompt }];
  chatHistory.forEach((msg) => {
    llmMessages.push({
      role: msg.role,
      content: msg.content,
    });
  });
  return llmMessages;
};

exports.chat = async (req, res) => {
  try {
    const { message, sessionId, diagnosisResult } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Nội dung chat không được để trống" });
    }

    const resolvedSessionId =
      sessionId && String(sessionId).trim()
        ? String(sessionId).trim()
        : randomUUID();

    await aiChatService.saveMessage({
      userId: req.user.id,
      sessionId: resolvedSessionId,
      role: "user",
      content: message.trim(),
      diagnosisSnapshot: diagnosisResult || undefined,
    });

    const recentMessages = await aiChatService.getSessionMessages(
      req.user.id,
      resolvedSessionId,
      aiChatService.MAX_SESSION_MESSAGES
    );

    if (!openaiClient) {
      return res.status(500).json({
        message: "Máy chủ chưa cấu hình OPENAI_API_KEY.",
      });
    }

    let assistantReply;
    try {
      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: buildLLMMessages(recentMessages),
        temperature: 0.3,
      });

      assistantReply = completion.choices?.[0]?.message?.content?.trim();
    } catch (openaiError) {
      console.error("OpenAI request error:", openaiError.message);
      assistantReply = buildFallbackReply(message.trim(), diagnosisResult);
    }

    if (!assistantReply) {
      assistantReply = buildFallbackReply(message.trim(), diagnosisResult);
    }

    await aiChatService.saveMessage({
      userId: req.user.id,
      sessionId: resolvedSessionId,
      role: "assistant",
      content: assistantReply,
    });

    const messages = await aiChatService.getSessionMessages(
      req.user.id,
      resolvedSessionId,
      aiChatService.MAX_SESSION_MESSAGES
    );

    res.json({
      success: true,
      data: {
        sessionId: resolvedSessionId,
        reply: assistantReply,
        messages,
      },
    });
  } catch (error) {
    console.error("AI Chat Error:", error.message);
    res.status(500).json({
      message: "Không thể xử lý yêu cầu chat AI",
      details: error.message,
    });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ message: "Thiếu sessionId" });
    }

    const messages = await aiChatService.getSessionMessages(
      req.user.id,
      sessionId,
      aiChatService.MAX_SESSION_MESSAGES
    );

    res.json({
      success: true,
      data: {
        sessionId,
        messages,
      },
    });
  } catch (error) {
    console.error("Get AI chat history error:", error.message);
    res.status(500).json({ message: "Không thể lấy lịch sử chat" });
  }
};

exports.resetChatSession = async (req, res) => {
  try {
    const sessionId = req.body?.sessionId?.trim();

    if (!sessionId) {
      return res.status(400).json({ message: "Thiếu sessionId" });
    }

    await aiChatService.clearSessionMessages(req.user.id, sessionId);

    res.json({
      success: true,
      message: "Đã reset phiên chat tạm",
    });
  } catch (error) {
    console.error("Reset AI chat session error:", error.message);
    res.status(500).json({ message: "Không thể reset phiên chat" });
  }
};
