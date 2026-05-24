const mongoose = require("mongoose");

const diseaseLogSchema = new mongoose.Schema(
  {
    diseaseName: { type: String, required: true, trim: true },
    confidence: { type: Number, default: null },
    description: { type: String, default: "", trim: true },
    source: {
      type: String,
      enum: ["ai_scan", "manual"],
      default: "ai_scan",
    },
    imageName: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    detectedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["unprocessed", "processed"],
      default: "unprocessed",
    },
    processedAt: { type: Date, default: null },
    processingNote: { type: String, default: "", trim: true },
    scope: {
      type: String,
      enum: ["all_plots", "selected_plots"],
      required: true,
    },
    seasonPlotAssignments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SeasonPlotAssignment",
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
    warningSent: { type: Boolean, default: false },
    warningSentAt: { type: Date, default: null },
  },
  {
    collection: "disease_logs",
    timestamps: true,
  }
);

diseaseLogSchema.index({ user: 1, status: 1, detectedAt: -1 });
diseaseLogSchema.index({ seasonPlotAssignments: 1, detectedAt: -1 });
diseaseLogSchema.index({ warningSent: 1, warningSentAt: -1 });

module.exports = mongoose.model("DiseaseLog", diseaseLogSchema);
