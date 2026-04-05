const mongoose = require("mongoose");

const seasonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    isVisible: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: "seasons",
  }
);

module.exports = mongoose.model("Season", seasonSchema);