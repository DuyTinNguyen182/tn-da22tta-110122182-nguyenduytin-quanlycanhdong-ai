const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/", taskController.getAll);
router.post("/", isAdmin, taskController.create);
router.put("/:id", isAdmin, taskController.update);
router.delete("/:id", isAdmin, taskController.remove);

module.exports = router;
