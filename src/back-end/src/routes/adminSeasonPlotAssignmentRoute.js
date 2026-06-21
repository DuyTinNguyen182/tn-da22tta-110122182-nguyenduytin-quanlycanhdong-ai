const express = require("express");
const router = express.Router();
const adminSeasonPlotAssignmentController = require("../controllers/adminSeasonPlotAssignmentController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

router.use(protect, isAdmin);

router.get(
  "/active",
  adminSeasonPlotAssignmentController.getActiveAssignments,
);
router.post(
  "/active/plots",
  adminSeasonPlotAssignmentController.assignPlots,
);
router.delete(
  "/active/plots/:plotId",
  adminSeasonPlotAssignmentController.removePlot,
);

module.exports = router;
