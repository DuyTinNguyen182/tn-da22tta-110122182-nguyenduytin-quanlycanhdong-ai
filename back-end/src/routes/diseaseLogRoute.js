const express = require("express");
const diseaseLogController = require("../controllers/diseaseLogController");
const { protect } = require("../middlewares/authMiddleware");
const { uploadDiseaseImage } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", diseaseLogController.getAll);
router.post("/", uploadDiseaseImage, diseaseLogController.create);
router.get("/:id/warning-preview", diseaseLogController.getWarningPreview);
router.post("/:id/warnings", diseaseLogController.sendWarning);
router.put("/:id", uploadDiseaseImage, diseaseLogController.update);
router.patch("/:id/status", diseaseLogController.updateStatus);
router.delete("/:id", diseaseLogController.remove);

module.exports = router;
