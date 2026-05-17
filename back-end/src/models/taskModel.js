const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stage",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ["FERTILIZER", "PESTICIDE", "WATER", "LABOR", "SEED", "OTHER"],
      default: "OTHER",
      required: true,
    },
    isRepeatable: {
      type: Boolean,
      default: true,
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
  },
  {
    timestamps: true,
    collection: "tasks",
  }
);

// Index for efficient queries
taskSchema.index({ stage: 1, order: 1 });
taskSchema.index({ stage: 1, name: 1 });
taskSchema.index({ prerequisites: 1 });

module.exports = mongoose.model("Task", taskSchema);