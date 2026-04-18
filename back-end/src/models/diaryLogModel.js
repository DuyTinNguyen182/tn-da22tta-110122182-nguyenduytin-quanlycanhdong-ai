const mongoose = require("mongoose");

const diaryLogSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true,
  },
  description: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  cost: { type: Number, default: 0 },
  scope: {
    type: String,
    enum: ["single_plot", "selected_plots", "all_plots"],
    default: "all_plots",
  },
  // Các field cũ để hỗ trợ dữ liệu legacy
  plot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plot",
    default: null,
  },
  plots: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plot",
    },
  ],
  // -----
  seasonPlotAssignments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeasonPlotAssignment",
    },
  ],
  plotSnapshot: [
    {
      plotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plot",
        default: null,
      },
      name: { type: String, default: "" },
      area: { type: Number, default: 0 },
      status: { type: String, default: "" },
    },
  ],

  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DiaryLog", diaryLogSchema);