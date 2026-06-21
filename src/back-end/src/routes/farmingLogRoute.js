const express = require("express");
const router = express.Router();
const farmingLogController = require("../controllers/farmingLogController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/", farmingLogController.getBySeason); // ?seasonId=...
router.post("/", farmingLogController.create);
router.put("/:id", farmingLogController.update);
router.delete("/:id", farmingLogController.remove);

module.exports = router;
