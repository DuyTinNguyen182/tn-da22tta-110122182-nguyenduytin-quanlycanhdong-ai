const express = require("express");
const router = express.Router();
const allowedProductController = require("../controllers/allowedProductController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

// Tất cả route đều yêu cầu đăng nhập
router.use(protect);

// Xem danh mục (Nông dân cũng có thể xem nếu cần)
router.get("/", allowedProductController.getAll);
router.get("/:id", allowedProductController.getById);

// Các thao tác Thêm/Sửa/Xóa chỉ dành cho Admin
router.post("/", isAdmin, allowedProductController.create);
router.put("/:id", isAdmin, allowedProductController.update);
router.delete("/:id", isAdmin, allowedProductController.remove);

module.exports = router;
