const mongoose = require("mongoose");

const diseaseLogSchema = new mongoose.Schema(
  {
    diseaseName: { type: String, required: true, trim: true },
    confidence: { type: Number, default: null },
    description: { type: String, default: "" },
    source: {
      type: String,
      enum: ["ai_scan", "manual"],
      default: "ai_scan",
    },
    imageName: { type: String, default: "" },
    detectedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["unprocessed", "processed"],
      default: "unprocessed",
    },
    processedAt: { type: Date, default: null },
    processingNote: { type: String, default: "" },
    scope: {
      type: String,
      enum: ["all_plots", "selected_plots"],
      required: true,
    },
    season: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeasonDetail",
      required: true,
    },
    field: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Field",
      required: true,
    },
    plots: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plot",
      },
    ],
    plotSnapshot: [
      {
        plotId: { type: mongoose.Schema.Types.ObjectId, ref: "Plot", default: null },
        name: { type: String, default: "" },
        area: { type: Number, default: 0 },
        status: { type: String, default: "" },
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    collection: "disease_logs",
    timestamps: true,
  }
);

diseaseLogSchema.index({ season: 1, user: 1, detectedAt: -1 });
diseaseLogSchema.index({ field: 1, status: 1, detectedAt: -1 });

module.exports = mongoose.model("DiseaseLog", diseaseLogSchema);
