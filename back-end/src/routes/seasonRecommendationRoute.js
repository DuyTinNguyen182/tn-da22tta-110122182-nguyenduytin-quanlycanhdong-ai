const express = require("express");
const router = express.Router();
const seasonRecommendationController = require("../controllers/seasonRecommendationController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/", seasonRecommendationController.getVisibleRecommendations);
router.get("/admin/overview", isAdmin, seasonRecommendationController.getAdminOverview);
router.put("/season/:seasonId", isAdmin, seasonRecommendationController.upsertBySeason);

module.exports = router;
