const express = require("express");
const router = express.Router();
const multer = require("multer");
const aiController = require("../controllers/aiController");

// Cấu hình Multer để lưu ảnh tạm vào RAM (hoặc disk)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route: POST /api/ai/diagnose
router.post("/diagnose", upload.single("image"), aiController.diagnoseDisease);

module.exports = router;