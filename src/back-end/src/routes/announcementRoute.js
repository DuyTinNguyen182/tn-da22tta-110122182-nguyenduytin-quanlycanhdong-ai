const express = require("express");
const router = express.Router();
const announcementController = require("../controllers/announcementController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/", announcementController.getVisible);
router.get("/unread-summary", announcementController.getUnreadSummary);
router.post("/mark-read", announcementController.markVisibleAsRead);
router.get("/admin", isAdmin, announcementController.getAdminList);
router.get("/admin/options", isAdmin, announcementController.getAdminOptions);
router.post("/admin", isAdmin, announcementController.create);
router.post("/admin/bulk-delete", isAdmin, announcementController.removeMany);
router.put("/admin/:id", isAdmin, announcementController.update);
router.delete("/admin/:id", isAdmin, announcementController.remove);

module.exports = router;
