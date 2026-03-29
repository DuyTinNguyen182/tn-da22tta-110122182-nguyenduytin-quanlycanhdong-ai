const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/authRoute");
const userRoutes = require("./src/routes/userRoute");
const fieldRoutes = require("./src/routes/fieldRoute");
const plotRoutes = require("./src/routes/plotRoute");
const seasonRoutes = require("./src/routes/seasonRoute");
const seasonDetailRoutes = require("./src/routes/seasonDetailRoute");
const diaryLogRoutes = require("./src/routes/diaryLogRoute");
const taskRoutes = require("./src/routes/taskRoute");
const aiRoutes = require("./src/routes/aiRoute");
const adminOverviewRoutes = require("./src/routes/adminOverviewRoute");

const app = express();
const PORT = process.env.PORT || 4000;

// --- Middlewares ---
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// --- Database Connection ---
connectDB();

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/plots", plotRoutes);
app.use("/api/seasons", seasonRoutes);
app.use("/api/season-details", seasonDetailRoutes);
app.use("/api/diary-logs", diaryLogRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminOverviewRoutes);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
