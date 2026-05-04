const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    role: {
      type: String,
      enum: ["farmer", "admin"],
      default: "farmer",
      trim: true,
    },
  },
  {
    collection: "users",
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
