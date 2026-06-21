const mongoose = require("mongoose");

const seasonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isVisible: { type: Boolean, default: true },
  },
  {
    collection: "seasons",
    timestamps: true,
  }
);

module.exports = mongoose.model("Season", seasonSchema);
