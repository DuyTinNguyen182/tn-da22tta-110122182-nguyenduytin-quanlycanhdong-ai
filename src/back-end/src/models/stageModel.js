const mongoose = require("mongoose");

const stageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "stages",
  }
);

module.exports = mongoose.model("Stage", stageSchema);
