const express = require("express");
const adminProgressController = require("../controllers/adminProgressController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect, isAdmin);

router.get("/overview", adminProgressController.getOverview);
router.get("/current-season", adminProgressController.getCurrentSeasonInfo);
router.get(
  "/plot-statistics/options",
  adminProgressController.getPlotStatisticsOptions,
);
router.get("/plot-statistics", adminProgressController.getPlotTaskStatistics);
router.post(
  "/plot-statistics/warnings",
  adminProgressController.sendPlotTaskWarnings,
);

module.exports = router;
