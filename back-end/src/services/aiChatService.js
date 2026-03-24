const AIChatMessage = require("../models/aiChatMessageModel");

const saveMessage = async ({ userId, sessionId, role, content, diagnosisSnapshot }) => {
  return AIChatMessage.create({
    user: userId,
    sessionId,
    role,
    content,
    diagnosisSnapshot: diagnosisSnapshot || undefined,
  });
};

const getSessionMessages = async (userId, sessionId, limit = 50) => {
  return AIChatMessage.find({ user: userId, sessionId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
};

module.exports = {
  saveMessage,
  getSessionMessages,
};
