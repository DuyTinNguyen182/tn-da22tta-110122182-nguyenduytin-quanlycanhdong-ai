const express = require("express");
const router = express.Router();
const userOverviewController = require("../controllers/userOverviewController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

// Lấy options cho dashboard nông dân
router.get("/dashboard/options", userOverviewController.getDashboardOptions);
// Lấy thống kê dashboard nông dân
router.get("/dashboard/statistics", userOverviewController.getDashboardStatistics);

// Lấy mùa vụ hiện tại của nông dân
router.get("/dashboard/current-season", userOverviewController.getCurrentSeasonInfo);

module.exports = router;
