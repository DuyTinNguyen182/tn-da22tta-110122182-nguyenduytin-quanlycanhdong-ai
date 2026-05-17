const express = require("express");
const router = express.Router();
const stageController = require("../controllers/stageController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/", stageController.getAll);
router.get("/:id", stageController.getById);
router.post("/", isAdmin, stageController.create);
router.put("/:id", isAdmin, stageController.update);
router.delete("/:id", isAdmin, stageController.remove);

module.exports = router;
