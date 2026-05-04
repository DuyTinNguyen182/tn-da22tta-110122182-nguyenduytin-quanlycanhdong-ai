const mongoose = require("mongoose");

const seasonPlotAssignmentSchema = new mongoose.Schema(
  {
    seasonDetail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeasonDetail",
      required: true,
    },
    field: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Field",
      required: true,
    },
    plot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plot",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    collection: "season_plot_assignments",
    timestamps: true,
  }
);

seasonPlotAssignmentSchema.index({ seasonDetail: 1, plot: 1 }, { unique: true });
seasonPlotAssignmentSchema.index({ seasonDetail: 1, user: 1, field: 1, status: 1 });

module.exports = mongoose.model("SeasonPlotAssignment", seasonPlotAssignmentSchema);
