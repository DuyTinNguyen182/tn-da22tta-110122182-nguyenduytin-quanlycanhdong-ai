const mongoose = require("mongoose");

const aiChatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  sessionId: { type: String, required: true, index: true },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: { type: String, required: true },
  diagnosisSnapshot: {
    disease: { type: String },
    confidence: { type: Number },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AIChatMessage", aiChatMessageSchema);
