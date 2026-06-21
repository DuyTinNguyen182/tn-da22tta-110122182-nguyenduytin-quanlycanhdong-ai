const express = require("express");
const adminDashboardController = require("../controllers/adminDashboardController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect, isAdmin);

router.get("/", adminDashboardController.getDashboard);

module.exports = router;
