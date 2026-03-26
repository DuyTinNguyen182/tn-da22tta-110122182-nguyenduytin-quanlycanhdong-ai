const express = require("express");
const router = express.Router();
const seasonDetailController = require("../controllers/seasonDetailController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/admin/all", seasonDetailController.getAllSeasonDetails);
router.get("/", seasonDetailController.getSeasonDetailsByField); // ?fieldId=...
router.post("/", seasonDetailController.createSeasonDetail);
router.put("/:id", seasonDetailController.updateSeasonDetail);
router.put("/:id/finish", seasonDetailController.finishSeasonDetail);
router.delete("/:id", seasonDetailController.deleteSeasonDetail);

module.exports = router;
