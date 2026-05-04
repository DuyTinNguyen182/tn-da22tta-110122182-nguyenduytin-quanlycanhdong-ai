const mongoose = require("mongoose");

const diaryLogSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    taskDetail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskDetail",
      default: null,
    },
    description: { type: String, default: "", trim: true },
    date: { type: Date, default: Date.now },
    cost: { type: Number, default: 0, min: 0 },
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
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    collection: "diary_logs",
    timestamps: true,
  }
);

diaryLogSchema.index({ user: 1, date: -1, createdAt: -1 });
diaryLogSchema.index({ seasonPlotAssignments: 1, date: -1 });

module.exports = mongoose.model("DiaryLog", diaryLogSchema);
