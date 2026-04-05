const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  {
    timestamps: true,
    collection: "tasks",
  }
);

module.exports = mongoose.model("Task", taskSchema);