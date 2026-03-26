const express = require("express");
const router = express.Router();
const seasonController = require("../controllers/seasonController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/", seasonController.getSeasons); // Danh mục mùa vụ
router.get("/:id", isAdmin, seasonController.getSeasonById);
router.post("/", isAdmin, seasonController.createSeason);
router.put("/:id", isAdmin, seasonController.updateSeason);
router.delete("/:id", isAdmin, seasonController.deleteSeason);

module.exports = router;