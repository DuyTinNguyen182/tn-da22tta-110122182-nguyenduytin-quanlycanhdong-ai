const express = require("express");
const diseaseLogController = require("../controllers/diseaseLogController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", diseaseLogController.getAll);
router.post("/", diseaseLogController.create);
router.put("/:id", diseaseLogController.update);
router.patch("/:id/status", diseaseLogController.updateStatus);
router.delete("/:id", diseaseLogController.remove);

module.exports = router;
