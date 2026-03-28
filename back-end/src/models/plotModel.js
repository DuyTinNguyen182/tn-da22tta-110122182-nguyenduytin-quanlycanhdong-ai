const mongoose = require("mongoose");

const plotSchema = new mongoose.Schema({
  name: { type: String, required: true },
  area: { type: Number, required: true },
  status: { type: String, default: "active" },
  addressDetail: { type: String, default: "" },
  field: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Field",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Plot", plotSchema);
