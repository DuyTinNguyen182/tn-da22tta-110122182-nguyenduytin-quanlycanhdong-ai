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
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "season_plot_assignments",
  }
);

seasonPlotAssignmentSchema.index({ seasonDetail: 1, plot: 1 }, { unique: true });

seasonPlotAssignmentSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("SeasonPlotAssignment", seasonPlotAssignmentSchema);