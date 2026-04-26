const mongoose = require("mongoose");

const taskDetailSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "task_details",
  }
);

taskDetailSchema.index({ task: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("TaskDetail", taskDetailSchema);
