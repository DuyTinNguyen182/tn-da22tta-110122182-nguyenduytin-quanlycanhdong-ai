const express = require("express");
const adminOverviewController = require("../controllers/adminOverviewController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect, isAdmin);

router.get("/overview", adminOverviewController.getOverview);
router.get("/current-season", adminOverviewController.getCurrentSeasonInfo);
router.get("/plot-statistics/options", adminOverviewController.getPlotStatisticsOptions);
router.get("/plot-statistics", adminOverviewController.getPlotTaskStatistics);
router.post("/plot-statistics/warnings", adminOverviewController.sendPlotTaskWarnings);

module.exports = router;
