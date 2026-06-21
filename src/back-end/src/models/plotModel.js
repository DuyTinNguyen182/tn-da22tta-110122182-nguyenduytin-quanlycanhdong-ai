const mongoose = require("mongoose");

const plotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    area: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    imageUrl: { type: String, default: "" },
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
  },
  {
    collection: "plots",
    timestamps: true,
  }
);

plotSchema.index({ field: 1, user: 1, status: 1 });

module.exports = mongoose.model("Plot", plotSchema);
