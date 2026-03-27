const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true }, // Email không được trùng
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  role: { type: String, default: "farmer" }, // Phân quyền: farmer, admin...
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
