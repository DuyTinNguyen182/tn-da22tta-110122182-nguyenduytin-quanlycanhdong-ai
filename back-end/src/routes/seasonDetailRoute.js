const express = require("express");
const router = express.Router();
const seasonDetailController = require("../controllers/seasonDetailController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

router.use(protect);

// Public route — farmer can get the currently active season detail
router.get("/active", seasonDetailController.getActiveSeasonDetail);
router.get("/member", seasonDetailController.getFarmerSeasonDetails);

// Admin-only routes
router.get("/admin/all", isAdmin, seasonDetailController.getAllSeasonDetails);
router.post("/", isAdmin, seasonDetailController.createSeasonDetail);
router.put("/:id", isAdmin, seasonDetailController.updateSeasonDetail);
router.put("/:id/finish", isAdmin, seasonDetailController.finishSeasonDetail);
router.delete("/:id", isAdmin, seasonDetailController.deleteSeasonDetail);

module.exports = router;
