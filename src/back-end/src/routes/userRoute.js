const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

// Tất cả route user management phải có người dùng đăng nhập và là admin
router.use(protect, isAdmin);

// GET danh sách tất cả user
router.get("/", userController.getAllUsers);

// GET user theo ID
router.get("/:id", userController.getUserById);

// CREATE user mới
router.post("/", userController.createUser);

// UPDATE user
router.put("/:id", userController.updateUser);

// DELETE user
router.delete("/:id", userController.deleteUser);

module.exports = router;
