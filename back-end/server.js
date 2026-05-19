const { PORT, FRONTEND_URL } = require("./src/config/env");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/authRoute");
const userRoutes = require("./src/routes/userRoute");
const fieldRoutes = require("./src/routes/fieldRoute");
const plotRoutes = require("./src/routes/plotRoute");
const seasonRoutes = require("./src/routes/seasonRoute");
const seasonRecommendationRoutes = require("./src/routes/seasonRecommendationRoute");
const announcementRoutes = require("./src/routes/announcementRoute");
const seasonDetailRoutes = require("./src/routes/seasonDetailRoute");
const farmingLogRoutes = require("./src/routes/farmingLogRoute");
const diseaseLogRoutes = require("./src/routes/diseaseLogRoute");
const stageRoutes = require("./src/routes/stageRoute");
const taskRoutes = require("./src/routes/taskRoute");
const aiRoutes = require("./src/routes/aiRoute");
const adminProgressRoutes = require("./src/routes/adminProgressRoute");
const farmerDashboardRoutes = require("./src/routes/farmerDashboardRoute");

const app = express();

// --- Middlewares ---
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

// --- Database Connection ---
connectDB();

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/plots", plotRoutes);
app.use("/api/seasons", seasonRoutes);
app.use("/api/season-recommendations", seasonRecommendationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/season-details", seasonDetailRoutes);
app.use("/api/farming-logs", farmingLogRoutes);
app.use("/api/disease-logs", diseaseLogRoutes);
app.use("/api/stages", stageRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);

app.use("/api/admin", adminProgressRoutes);
app.use("/api/farmer-dashboard", farmerDashboardRoutes);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
