const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, default: "", trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Field", fieldSchema);