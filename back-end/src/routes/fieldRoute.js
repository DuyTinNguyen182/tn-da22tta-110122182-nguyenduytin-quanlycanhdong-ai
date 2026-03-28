const express = require("express");
const router = express.Router();
const fieldController = require("../controllers/fieldController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/summary", fieldController.getSummary);
router.post("/", fieldController.create);
router.get("/", fieldController.getAll);
router.put("/:id", fieldController.update);
router.delete("/:id", fieldController.remove);

module.exports = router;
