const axios = require("axios");
const FormData = require("form-data");
const { randomUUID } = require("crypto");
const { PYTHON_AI_SERVICE_URL } = require("../config/env");
const aiChatService = require("../services/aiChatService");

// ==========================================
// LUỒNG AI SCAN
// ==========================================
exports.diagnoseDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Vui lòng tải lên hình ảnh lá lúa" });
    }

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(PYTHON_AI_SERVICE_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    res.json({
      success: true,
      data: response.data,
      imageName: req.file.originalname,
    });
  } catch (error) {
    console.error("AI Service Error:", error.message);
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;

      if (status === 422 && data?.status === "rejected") {
        return res.status(422).json({
          success: false,
          rejected: true,
          errorCode: data.error_code || "UNSUPPORTED_IMAGE",
          message:
            data.message ||
            "Ảnh tải lên không đủ điều kiện để chẩn đoán bệnh lá lúa.",
          guidance:
            data.guidance ||
            "Vui lòng dùng ảnh cận cảnh lá lúa rõ nét, đủ ánh sáng.",
          data: data.prediction || null,
          imageName: req.file?.originalname,
        });
      }

      if (status === 400) {
        return res.status(400).json({
          success: false,
          message: data?.error || data?.message || "Ảnh đầu vào không hợp lệ.",
        });
      }
    }

    res.status(500).json({
      message: "Không thể kết nối tới dịch vụ AI. Vui lòng thử lại sau.",
      details: error.message,
    });
  }
};

// ==========================================
// LUỒNG CHAT AI
// ==========================================
exports.chat = async (req, res) => {
  try {
    const { message, sessionId, diagnosisResult } = req.body;

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ message: "Nội dung chat không được để trống" });
    }

    const resolvedSessionId =
      sessionId && String(sessionId).trim()
        ? String(sessionId).trim()
        : randomUUID();

    // Controller gọi Service
    const chatResult = await aiChatService.processChatRequest(
      req.user.id,
      resolvedSessionId,
      message.trim(),
      diagnosisResult,
    );

    res.json({
      success: true,
      data: {
        sessionId: resolvedSessionId,
        reply: chatResult.reply,
        messages: chatResult.messages,
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
      aiChatService.MAX_SESSION_MESSAGES,
    );

    res.json({
      success: true,
      data: { sessionId, messages },
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
