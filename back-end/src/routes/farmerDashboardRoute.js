const express = require("express");
const farmerDashboardController = require("../controllers/farmerDashboardController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Chỉ cần protect để lấy được req.user._id
router.get("/", protect, farmerDashboardController.getDashboard);

module.exports = router;
