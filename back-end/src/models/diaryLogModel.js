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
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SeasonDetail",
    required: true,
  },

  // Legacy field to keep old records compatible.
  plot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plot",
    default: null,
  },

  scope: {
    type: String,
    enum: ["single_plot", "selected_plots", "all_plots"],
    default: "all_plots",
  },
  plots: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plot",
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
