const mongoose = require("mongoose");

const seasonDetailSchema = new mongoose.Schema(
  {
    season: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  {
    collection: "season_details",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

seasonDetailSchema.index(
  { season: 1, startDate: 1 },
  {
    unique: true,
    partialFilterExpression: { startDate: { $type: "date" } },
  }
);
seasonDetailSchema.index({ startDate: 1, endDate: 1 });

seasonDetailSchema.virtual("status").get(function () {
  const now = new Date();
  if (this.endDate && this.endDate < now) return "completed";
  if (this.startDate && this.startDate <= now && (!this.endDate || this.endDate >= now)) {
    return "active";
  }
  return "planned";
});

module.exports = mongoose.model("SeasonDetail", seasonDetailSchema);
