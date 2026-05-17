const mongoose = require("mongoose");

const farmingLogSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    scope: {
      type: String,
      enum: ["single_plot", "selected_plots", "all_plots"],
      default: "all_plots",
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
  },
  {
    collection: "farming_logs",
    timestamps: true,
  }
);

farmingLogSchema.index({ user: 1, date: -1, createdAt: -1 });
farmingLogSchema.index({ seasonPlotAssignments: 1, date: -1 });
farmingLogSchema.index({ task: 1, seasonPlotAssignments: 1 });

module.exports = mongoose.model("FarmingLog", farmingLogSchema);
