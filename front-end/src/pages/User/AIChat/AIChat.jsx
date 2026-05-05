import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, RotateCcw, Send, User, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import api from "../../../services/api";

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
  const navigate = useNavigate();
  const [pinnedMessage, setPinnedMessage] = useState(buildWelcomeMessage);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(getOrCreateTransientSessionId);
  const messagesEndRef = useRef(null);

  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = (e) => {
    const rawScrollY = e.target.scrollTop;
    const maxScroll = e.target.scrollHeight - e.target.clientHeight;
    
    // Nếu nội dung không có thanh cuộn, luôn hiển thị header
    if (maxScroll <= 0) {
      setShowHeader(true);
      return;
    }

    // Ép giá trị scroll thực vào trong giới hạn [0, maxScroll] để khử quán tính nảy (overscroll/rubber-band bounce) ở đáy hoặc đỉnh màn hình
    const currentScrollY = Math.max(0, Math.min(rawScrollY, maxScroll));
    
    // Nếu chạm đỉnh thực sự, chắc chắn hiện header
    if (currentScrollY <= 0) {
      setShowHeader(true);
      lastScrollY.current = currentScrollY;
      return;
    }

    const diff = currentScrollY - lastScrollY.current;

    // Ngưỡng 30px để bỏ qua các rung động li ti
    if (Math.abs(diff) < 30) return;

    if (diff > 0 && currentScrollY > 80) {
      setShowHeader(false); // cuộn xuống
    } else if (diff < 0) {
      setShowHeader(true); // cuộn lên
    }
    lastScrollY.current = currentScrollY;
  };

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
      // NẾU TỪ TRANG QUÉT QUA
      if (location.state?.result) {
        const previousSessionId = sessionId;
        const nextSessionId = createSessionId();
        const prompt = buildDiagnosisPrompt(location.state.result);

        setActiveSessionId(nextSessionId);
        setPinnedMessage(buildDiagnosisIntroMessage());
        
        // Optimistic setup: Show the user's message immediately
        syncConversationMessages([{
          role: "user",
          content: prompt,
          clientId: `local-${Date.now()}`,
        }]);
        
        setIsTyping(true);

        try {
          await clearRemoteSession(previousSessionId);
          await sendMessageToBackend(
            prompt,
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

      // TRẠNG THÁI NORMAL
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
  }, [conversationMessages.length, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const messageText = input.trim();
    const optimisticMessage = {
      role: "user",
      content: messageText,
      clientId: `local-${Date.now()}`,
    };

    setInput("");
    const textarea = document.getElementById("ai-chat-input");
    if (textarea) textarea.style.height = 'auto';
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
            clientId: `error-${Date.now()}`
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
      const textarea = document.getElementById("ai-chat-input");
      if (textarea) textarea.style.height = 'auto';
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
    <div className="app-page-shell relative flex flex-col overflow-hidden bg-slate-50">
      {/* Smart Scrolling Header */}
      <div 
        className={`absolute top-0 left-0 right-0 z-30 transition-transform duration-300 ease-in-out border-b border-slate-200/60 bg-white/85 backdrop-blur-xl px-4 md:px-6 py-2.5 shadow-sm hook-header ${
          showHeader ? "translate-y-0" : "-translate-y-[120%]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/ai-scan")}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-sm md:text-base font-bold text-slate-800">Cố vấn Nông nghiệp AI</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ring-[2px] ring-emerald-100"></span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Đang trực tuyến</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetChat}
            disabled={isTyping}
            className="h-8 inline-flex items-center gap-1.5 rounded-xl bg-rose-50 text-rose-600 px-3 text-xs font-semibold transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      <div 
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pt-[60px]"
        onScroll={handleScroll}
      >
        {/* Chat messages wrapper */}
        <div className="px-4 md:px-6 py-4 md:py-6 space-y-6">
          <div className="w-full max-w-5xl mx-auto space-y-6">
          {displayedMessages.map((msg, idx) => (
            <div
              key={msg.clientId || `${msg.role}-${idx}`}
              className={`flex w-full animate-slide-up ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex w-full max-w-[95%] md:max-w-[85%] lg:max-w-[75%] gap-3 items-end ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex flex-shrink-0 items-center justify-center shadow-sm ${
                    msg.role === "user"
                      ? "bg-slate-800 text-white"
                      : "bg-emerald-100/50 text-emerald-600 ring-4 ring-white shadow-emerald-100"
                  }`}
                >
                  {msg.role === "user" ? <User size={16} /> : <Bot size={20} />}
                </div>

                {/* Bubble */}
                <div
                  className={`px-5 py-4 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-sm md:text-[15px] leading-relaxed break-words relative w-fit overflow-hidden ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-br-[8px]"
                      : "bg-white border border-slate-100/60 text-slate-800 rounded-bl-[8px]"
                  }`}
                >
                  {msg.role === "user" ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="prose prose-sm md:prose-base prose-emerald max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc mb-3 ml-5 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal mb-3 ml-5 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="pl-1">{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 font-mono text-[13px]">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto mb-3 text-[13px] shadow-inner">
                              {children}
                            </pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-emerald-400 pl-4 py-1 italic text-slate-600 mb-3 bg-emerald-50/50 rounded-r-lg">
                              {children}
                            </blockquote>
                          ),
                          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          a: ({ children, href }) => (
                            <a href={href} className="text-emerald-600 font-medium hover:text-emerald-700 hover:underline transition-colors" target="_blank" rel="noopener noreferrer">
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
            <div className="flex w-full animate-slide-up justify-start">
              <div className="flex max-w-[95%] gap-3 items-end flex-row">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full flex flex-shrink-0 items-center justify-center bg-emerald-100/50 text-emerald-600 ring-4 ring-white shadow-sm shadow-emerald-100">
                  <Bot size={20} />
                </div>
                <div className="px-5 py-4 rounded-[24px] rounded-bl-[8px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white border border-slate-100/60 flex items-center gap-1.5 h-[52px]">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>
        </div>
      </div>

      {/* Input Box */}
      <div className="sticky bottom-0 bg-white/75 backdrop-blur-xl border-t border-white/50 px-4 py-2.5 md:py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
        <div className="max-w-5xl mx-auto flex items-end gap-2.5 w-full">
          <div className="flex-1 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400 focus-within:shadow-emerald-100/50 transition-all duration-200">
            <textarea
              id="ai-chat-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Nhập dấu hiệu bệnh hoặc câu hỏi cho AI..."
              className="w-full bg-transparent text-sm md:text-[15px] text-slate-800 py-2.5 md:py-3 px-4 focus:outline-none resize-none min-h-[44px] max-h-48"
              rows={1}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`h-[44px] md:h-[48px] w-[44px] md:w-[48px] flex-shrink-0 inline-flex items-center justify-center rounded-2xl transition-all duration-300 ${
              input.trim() && !isTyping
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-500/20 text-white active:scale-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Send size={18} className={input.trim() && !isTyping ? "ml-0.5" : ""} />
          </button>
        </div>
        <p className="text-center text-[10px] md:text-[11px] text-slate-400 mt-2 font-medium">
          Trí tuệ nhân tạo có thể sai sót, luôn đối chiếu với thực tế để có quyết định tốt nhất.
        </p>
      </div>
    </div>
  );
};

export default AIChat;
