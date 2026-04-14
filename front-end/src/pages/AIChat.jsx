import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bot, RotateCcw, Send, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import api from "../services/api";

let transientChatSessionId = "";

const MAX_CONVERSATION_MESSAGES = 5;

const createSessionId = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getOrCreateTransientSessionId = () => {
  if (!transientChatSessionId) {
    transientChatSessionId = createSessionId();
  }

  return transientChatSessionId;
};

const buildWelcomeMessage = () => ({
  role: "assistant",
  content:
    "Chào bạn! Tôi là trợ lý AI nông nghiệp. Hãy gửi câu hỏi hoặc kết quả chẩn đoán để tôi tư vấn.",
});

const buildDiagnosisIntroMessage = () => ({
  role: "assistant",
  content:
    "Đã nhận kết quả chẩn đoán. Tôi sẽ tư vấn dựa trên bệnh vừa quét.",
});

const trimConversationMessages = (messages) =>
  messages.slice(-MAX_CONVERSATION_MESSAGES);

const formatPercent = (score) =>
  typeof score === "number" ? `${(score * 100).toFixed(1)}%` : "Không xác định";

const buildLowConfidenceMessage = (diagnosisResult) => {
  if (!diagnosisResult?.is_low_confidence) return null;

  const reasons = [];
  if (
    typeof diagnosisResult?.confidence === "number" &&
    typeof diagnosisResult?.confidence_threshold === "number" &&
    diagnosisResult.confidence < diagnosisResult.confidence_threshold
  ) {
    reasons.push(
      `độ tin cậy hiện tại dưới ngưỡng ${formatPercent(
        diagnosisResult.confidence_threshold
      )}`
    );
  }

  if (
    typeof diagnosisResult?.confidence_gap === "number" &&
    typeof diagnosisResult?.confidence_gap_threshold === "number" &&
    diagnosisResult.confidence_gap < diagnosisResult.confidence_gap_threshold
  ) {
    reasons.push(
      `chênh lệch giữa dự đoán 1 và 2 chỉ ${formatPercent(
        diagnosisResult.confidence_gap
      )}`
    );
  }

  if (reasons.length === 0) {
    return "Kết quả AI chưa đủ chắc chắn, cần đối chiếu thêm.";
  }

  return `Kết quả AI chưa đủ chắc chắn vì ${reasons.join(" và ")}.`;
};

const buildDiagnosisPrompt = (diagnosisResult) => {
  const disease = diagnosisResult?.disease || "Không xác định";
  const confidence = formatPercent(diagnosisResult?.confidence);
  const confidenceWarning = buildLowConfidenceMessage(diagnosisResult);
  const topPredictions = Array.isArray(diagnosisResult?.top_predictions)
    ? diagnosisResult.top_predictions.slice(0, 3)
    : [];
  const topPredictionText =
    topPredictions.length > 0
      ? `Top dự đoán gần nhất: ${topPredictions
          .map(
            (prediction, index) =>
              `${index + 1}. ${prediction.disease || prediction.class_name} (${formatPercent(
                prediction.confidence
              )})`
          )
          .join("; ")}.`
      : "";

  return [
    `Tôi vừa quét lá lúa và hệ thống phát hiện bệnh: ${disease} (Độ tin cậy: ${confidence}).`,
    confidenceWarning,
    topPredictionText,
    "Hãy tư vấn cho tôi hướng xử lý, phòng ngừa và các bước theo dõi.",
  ]
    .filter(Boolean)
    .join(" ");
};

const AIChat = () => {
  const location = useLocation();
  const [pinnedMessage, setPinnedMessage] = useState(buildWelcomeMessage);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(getOrCreateTransientSessionId);
  const messagesEndRef = useRef(null);

  const displayedMessages = [pinnedMessage, ...conversationMessages];

  const setActiveSessionId = (nextSessionId) => {
    transientChatSessionId = nextSessionId;
    setSessionId(nextSessionId);
  };

  const syncConversationMessages = (messages) => {
    setConversationMessages(
      trimConversationMessages(Array.isArray(messages) ? messages : [])
    );
  };

  const clearRemoteSession = async (targetSessionId) => {
    if (!targetSessionId) return;

    await api.post("/ai/chat/reset", {
      sessionId: targetSessionId,
    });
  };

  const sendMessageToBackend = async (
    message,
    diagnosisResult,
    targetSessionId = sessionId
  ) => {
    const res = await api.post("/ai/chat", {
      message,
      sessionId: targetSessionId || undefined,
      diagnosisResult,
    });

    const responseData = res.data?.data;
    if (responseData?.sessionId) {
      setActiveSessionId(responseData.sessionId);
    }

    if (Array.isArray(responseData?.messages)) {
      syncConversationMessages(responseData.messages);
    }
  };

  const loadHistory = async (targetSessionId) => {
    if (!targetSessionId) return false;

    try {
      const res = await api.get("/ai/chat/history", {
        params: { sessionId: targetSessionId },
      });

      const historyMessages = res.data?.data?.messages || [];
      if (historyMessages.length > 0) {
        syncConversationMessages(historyMessages);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Lỗi khi tải lịch sử chat", error);
      return false;
    }
  };

  useEffect(() => {
    const initChat = async () => {
      if (location.state?.result) {
        const previousSessionId = sessionId;
        const nextSessionId = createSessionId();

        setActiveSessionId(nextSessionId);
        setPinnedMessage(buildDiagnosisIntroMessage());
        syncConversationMessages([]);
        setIsTyping(true);

        try {
          await clearRemoteSession(previousSessionId);
          await sendMessageToBackend(
            buildDiagnosisPrompt(location.state.result),
            location.state.result,
            nextSessionId
          );
        } catch (error) {
          console.error("Lỗi khi gửi prompt chẩn đoán", error);
        } finally {
          setIsTyping(false);
          window.history.replaceState({}, document.title);
        }

        return;
      }

      setPinnedMessage(buildWelcomeMessage());
      const hasHistory = await loadHistory(sessionId);
      if (!hasHistory) {
        syncConversationMessages([]);
      }
    };

    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const messageText = input.trim();
    const optimisticMessage = {
      role: "user",
      content: messageText,
      clientId: `local-${Date.now()}`,
    };

    setInput("");
    setIsTyping(true);
    setConversationMessages((prev) =>
      trimConversationMessages([...prev, optimisticMessage])
    );

    try {
      await sendMessageToBackend(messageText);
    } catch (error) {
      console.error("Lỗi khi gửi chat AI", error);
      setConversationMessages((prev) =>
        trimConversationMessages([
          ...prev,
          {
            role: "assistant",
            content:
              error?.response?.data?.message ||
              "Không thể gửi câu hỏi tới AI. Vui lòng thử lại.",
          },
        ])
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = async () => {
    if (isTyping) return;

    const previousSessionId = sessionId;
    const nextSessionId = createSessionId();

    setIsTyping(true);
    try {
      await clearRemoteSession(previousSessionId);
    } catch (error) {
      console.error("Lỗi khi reset chat AI", error);
    } finally {
      setActiveSessionId(nextSessionId);
      setPinnedMessage(buildWelcomeMessage());
      syncConversationMessages([]);
      setInput("");
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50">
      <div className="flex-1 overflow-y-auto px-3 md:px-4 py-2 md:py-3 space-y-3">
        <div className="w-full space-y-3">
          {displayedMessages.map((msg, idx) => (
            <div
              key={msg.clientId || `${msg.role}-${idx}`}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } px-1 md:px-2`}
            >
              <div
                className={`flex max-w-[92%] md:max-w-[88%] lg:max-w-[85%] gap-2 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex flex-shrink-0 items-center justify-center shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {msg.role === "user" ? <User size={14} /> : <Bot size={16} />}
                </div>

                <div
                  className={`px-3.5 md:px-4 py-2 md:py-2.5 rounded-xl shadow-sm text-xs md:text-sm leading-relaxed break-words ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none whitespace-pre-wrap"
                      : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                  }`}
                >
                  {msg.role === "user" ? (
                    <>{msg.content}</>
                  ) : (
                    <div className="prose prose-sm max-w-none space-y-2">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc mb-2 ml-4">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal mb-2 ml-4">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="mb-1 ml-2">{children}</li>
                          ),
                          code: ({ children }) => (
                            <code className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 font-mono text-xs">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-gray-900 text-gray-100 p-2 md:p-3 rounded-lg overflow-x-auto mb-2 text-xs">
                              {children}
                            </pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-emerald-300 pl-3 italic text-gray-600 mb-2">
                              {children}
                            </blockquote>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-bold">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic">{children}</em>
                          ),
                          a: ({ children, href }) => (
                            <a
                              href={href}
                              className="text-emerald-600 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start px-1 md:px-2">
              <div className="flex max-w-[92%] md:max-w-[88%] lg:max-w-[85%] gap-2 flex-row">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full flex flex-shrink-0 items-center justify-center shadow-sm bg-emerald-600 text-white">
                  <Bot size={16} />
                </div>
                <div className="px-3 md:px-3.5 py-2 md:py-2.5 rounded-xl rounded-tl-none shadow-sm bg-white border border-gray-100 flex items-center gap-1 h-[32px] md:h-[36px]">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 px-3 md:px-4 py-2.5 md:py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 bg-gray-50 hover:bg-gray-100/50 focus:bg-white border-2 border-transparent transition-colors text-sm md:text-base text-gray-800 rounded-xl py-2 md:py-2.5 px-3.5 md:px-4 focus:outline-none focus:border-emerald-200 focus:ring-4 focus:ring-emerald-50 resize-none shadow-inner"
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`h-[42px] md:h-[46px] inline-flex items-center justify-center rounded-xl px-3.5 md:px-4 transition-all duration-200 ${
              input.trim() && !isTyping
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 text-white active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send size={16} />
          </button>

          <button
            type="button"
            onClick={handleResetChat}
            disabled={isTyping}
            className="h-[42px] md:h-[46px] inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 md:px-4 text-xs md:text-sm font-medium text-gray-600 transition-colors hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        <p className="text-center text-[10px] md:text-xs text-gray-400 mt-2 font-medium">
          AI có thể không chính xác. Kiểm tra lại các lời khuyên quan trọng.
        </p>
      </div>
    </div>
  );
};

export default AIChat;
