const mongoose = require("mongoose");

const seasonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: "season_catalogs",
  }
);

module.exports = mongoose.model("Season", seasonSchema);
