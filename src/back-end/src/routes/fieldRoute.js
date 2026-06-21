const express = require("express");
const router = express.Router();
const fieldController = require("../controllers/fieldController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/summary", fieldController.getSummary);
router.post("/", fieldController.create, isAdmin);
router.get("/", fieldController.getAll);
router.put("/:id", fieldController.update, isAdmin);
router.delete("/:id", fieldController.remove, isAdmin);

module.exports = router;
