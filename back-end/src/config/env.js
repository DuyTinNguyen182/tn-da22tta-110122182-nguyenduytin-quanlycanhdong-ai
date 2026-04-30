const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const required = (name) => {
  const v = process.env[name];
  if (v == null || String(v).trim() === "") {
    console.error(`Thiếu biến môi trường bắt buộc: ${name}`);
    process.exit(1);
  }
  return String(v).trim();
};

const MONGO_URI = required("MONGO_URI");
const JWT_SECRET = required("JWT_SECRET");

const CLOUDINARY_CLOUD_NAME = required("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = required("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = required("CLOUDINARY_API_SECRET");

const PYTHON_AI_SERVICE_URL =
  process.env.PYTHON_AI_SERVICE_URL?.trim() || "http://127.0.0.1:5000/predict";

const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL?.trim() || "http://localhost:5173";
const SMTP_HOST = process.env.SMTP_HOST?.trim() || "";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 0;
const SMTP_SECURE = String(process.env.SMTP_SECURE || "")
  .trim()
  .toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER?.trim() || "";
const SMTP_PASS = process.env.SMTP_PASS?.trim() || "";
const SMTP_FROM_NAME =
  process.env.SMTP_FROM_NAME?.trim() || "Hệ thống quản lý cánh đồng lúa";
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL?.trim() || SMTP_USER;

module.exports = {
  MONGO_URI,
  JWT_SECRET,
  PYTHON_AI_SERVICE_URL,
  PORT,
  FRONTEND_URL,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_NAME,
  SMTP_FROM_EMAIL,
};
