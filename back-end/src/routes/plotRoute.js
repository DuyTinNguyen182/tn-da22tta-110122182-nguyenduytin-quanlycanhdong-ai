const express = require("express");
const router = express.Router();
const plotController = require("../controllers/plotController");
const { protect } = require("../middlewares/authMiddleware");
const { uploadPlotImage } = require("../middlewares/uploadMiddleware");

router.use(protect);

// GET /api/plots?fieldId=123 -> Lấy danh sách thửa của cánh đồng 123
router.get("/", plotController.getByField);

// POST /api/plots -> Tạo thửa mới (body gửi kèm fieldId)
router.post("/", uploadPlotImage, plotController.create);

// PUT /api/plots/:id -> Sửa thửa
router.put("/:id", uploadPlotImage, plotController.update);

// DELETE /api/plots/:id -> Xóa thửa
router.delete("/:id", plotController.remove);

module.exports = router;