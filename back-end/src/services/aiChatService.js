const MAX_SESSION_MESSAGES = 5;
const SESSION_TTL_MS = 30 * 60 * 1000;
const sessionStore = new Map();

const getSessionKey = (userId, sessionId) => `${String(userId)}:${String(sessionId)}`;

const cleanupExpiredSessions = () => {
  const now = Date.now();

  sessionStore.forEach((sessionData, sessionKey) => {
    if (now - sessionData.lastAccessedAt > SESSION_TTL_MS) {
      sessionStore.delete(sessionKey);
    }
  });
};

const touchSession = (sessionData) => ({
  ...sessionData,
  lastAccessedAt: Date.now(),
});

const saveMessage = async ({ userId, sessionId, role, content, diagnosisSnapshot }) => {
  cleanupExpiredSessions();

  const sessionKey = getSessionKey(userId, sessionId);
  const existingSession = sessionStore.get(sessionKey) || {
    messages: [],
    lastAccessedAt: Date.now(),
  };

  const savedMessage = {
    role,
    content,
    diagnosisSnapshot: diagnosisSnapshot || undefined,
    createdAt: new Date().toISOString(),
  };

  const nextSession = touchSession({
    ...existingSession,
    messages: [...existingSession.messages, savedMessage].slice(-MAX_SESSION_MESSAGES),
  });

  sessionStore.set(sessionKey, nextSession);
  return savedMessage;
};

const getSessionMessages = async (userId, sessionId, limit = MAX_SESSION_MESSAGES) => {
  cleanupExpiredSessions();

  const sessionKey = getSessionKey(userId, sessionId);
  const existingSession = sessionStore.get(sessionKey);

  if (!existingSession) {
    return [];
  }

  sessionStore.set(sessionKey, touchSession(existingSession));
  return existingSession.messages.slice(-limit);
};

const clearSessionMessages = async (userId, sessionId) => {
  cleanupExpiredSessions();
  sessionStore.delete(getSessionKey(userId, sessionId));
};

module.exports = {
  MAX_SESSION_MESSAGES,
  clearSessionMessages,
  getSessionMessages,
  saveMessage,
};
