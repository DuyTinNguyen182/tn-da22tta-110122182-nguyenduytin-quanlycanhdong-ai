const express = require("express");
const router = express.Router();
const taskDetailController = require("../controllers/taskDetailController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/", taskDetailController.getAll);
router.post("/", isAdmin, taskDetailController.create);
router.put("/:id", isAdmin, taskDetailController.update);
router.delete("/:id", isAdmin, taskDetailController.remove);

module.exports = router;
