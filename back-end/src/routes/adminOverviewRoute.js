const express = require("express");
const adminOverviewController = require("../controllers/adminOverviewController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect, isAdmin);

router.get("/overview", adminOverviewController.getOverview);

module.exports = router;
