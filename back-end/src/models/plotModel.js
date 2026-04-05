const mongoose = require("mongoose");

const plotSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  area: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  addressDetail: { type: String, default: "", trim: true },
  field: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Field",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Plot", plotSchema);
