const mongoose = require("mongoose");

const seasonDetailSchema = new mongoose.Schema(
  {
    season: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    year: { type: Number, required: true },
    field: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Field",
      required: true,
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["active", "completed", "planned"],
      default: "active",
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: "season_details",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

seasonDetailSchema.index({ season: 1, year: 1, field: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("SeasonDetail", seasonDetailSchema);