const express = require("express");
const router = express.Router();
const multer = require("multer");
const aiController = require("../controllers/aiController");
const { protect } = require("../middlewares/authMiddleware");

// Cấu hình Multer để lưu ảnh tạm vào RAM (hoặc disk)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.use(protect);

// Route: POST /api/ai/diagnose
router.post("/diagnose", upload.single("image"), aiController.diagnoseDisease);
router.post("/chat", aiController.chat);
router.post("/chat/reset", aiController.resetChatSession);
router.get("/chat/history", aiController.getChatHistory);

module.exports = router;
