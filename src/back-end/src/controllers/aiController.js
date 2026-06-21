const { randomUUID } = require("crypto");
const aiChatService = require("../services/aiChatService");
const aiScanService = require("../services/aiScanService");

// ==========================================
// LUỒNG AI SCAN
// ==========================================
exports.diagnoseDisease = async (req, res) => {
  try {
    // 1. Kiểm tra đầu vào
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Vui lòng tải lên hình ảnh lá lúa" });
    }

    // 2. Gọi Service xử lý
    const scanResult = await aiScanService.scanImage(req.file);

    // 3. Trả kết quả thành công
    res.json({
      success: true,
      data: scanResult,
      imageName: req.file.originalname,
    });
  } catch (error) {
    // 4. Xử lý các mã lỗi ném ra từ Service
    if (error.isAxiosError) {
      const { status, data } = error;

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

    console.error("AI Service Error:", error.message);
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
