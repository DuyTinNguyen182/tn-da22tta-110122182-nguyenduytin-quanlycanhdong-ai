const express = require("express");
const router = express.Router();
const multer = require("multer");
const aiController = require("../controllers/aiController");
const { protect } = require("../middlewares/authMiddleware");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/i;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.test(file.mimetype || "")) {
      return cb(
        new Error("Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF")
      );
    }
    cb(null, true);
  },
});

const handleDiagnoseUpload = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `Ảnh vượt quá dung lượng cho phép (tối đa ${MAX_IMAGE_BYTES / (1024 * 1024)} MB).`,
        });
      }
      return res.status(400).json({
        message: err.message || "Không thể xử lý file tải lên",
      });
    }
    next();
  });
};

router.use(protect);

router.post("/diagnose", handleDiagnoseUpload, aiController.diagnoseDisease);
router.post("/chat", aiController.chat);
router.post("/chat/reset", aiController.resetChatSession);
router.get("/chat/history", aiController.getChatHistory);

module.exports = router;
