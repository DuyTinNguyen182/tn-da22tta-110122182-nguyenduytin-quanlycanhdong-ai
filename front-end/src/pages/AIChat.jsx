import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import api from "../services/api";

const CHAT_SESSION_STORAGE_KEY = "aiChatSessionId";

const AIChat = () => {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(CHAT_SESSION_STORAGE_KEY) || "");
  const messagesEndRef = useRef(null);

  const formatDiagnosisPrompt = (diagnosisResult) => {
    const disease = diagnosisResult?.disease || "Không xác định";
    const confidence =
      typeof diagnosisResult?.confidence === "number"
        ? `${(diagnosisResult.confidence * 100).toFixed(1)}%`
        : "Không xác định";

    return `Tôi vừa quét lá lúa và hệ thống phát hiện bệnh: ${disease} (Độ tin cậy: ${confidence}). Hãy tư vấn cho tôi hướng xử lý, phòng ngừa và các bước theo dõi.`;
  };

  const sendMessageToBackend = async (message, diagnosisResult, forceNewSession = false) => {
    const res = await api.post("/ai/chat", {
      message,
      sessionId: forceNewSession ? undefined : (sessionId || undefined),
      diagnosisResult,
    });

    const responseData = res.data?.data;
    if (responseData?.sessionId) {
      setSessionId(responseData.sessionId);
      localStorage.setItem(CHAT_SESSION_STORAGE_KEY, responseData.sessionId);
    }

    if (Array.isArray(responseData?.messages)) {
      setMessages(responseData.messages);
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
        setMessages(historyMessages);
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
        // Khi đi từ trang chẩn đoán, luôn mở một phiên chat mới để ngữ cảnh không bị lẫn.
        setSessionId("");
        localStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
        setMessages([
          {
            role: "assistant",
            content: "Đã nhận kết quả chẩn đoán. Tôi sẽ tư vấn dựa trên bệnh vừa quét.",
          },
        ]);

        const prompt = formatDiagnosisPrompt(location.state.result);
        setIsTyping(true);
        try {
          await sendMessageToBackend(prompt, location.state.result, true);
        } catch (error) {
          console.error("Lỗi khi gửi prompt chẩn đoán", error);
        } finally {
          setIsTyping(false);
          window.history.replaceState({}, document.title);
        }
        return;
      }

      const hasHistory = await loadHistory(sessionId);

      if (!hasHistory) {
        setMessages([
          {
            role: "assistant",
            content: "Chào bạn! Tôi là trợ lý AI nông nghiệp. Hãy gửi câu hỏi hoặc kết quả chẩn đoán để tôi tư vấn.",
          },
        ]);
      }
    };

    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const messageText = input.trim();
    setInput("");
    setIsTyping(true);

    try {
      await sendMessageToBackend(messageText);
    } catch (error) {
      console.error("Lỗi khi gửi chat AI", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error?.response?.data?.message || "Không thể gửi câu hỏi tới AI. Vui lòng thử lại.",
        },
      ]);
    } finally {
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
      {/* Header */}
      {/* <div className="bg-white px-4 md:px-5 py-2.5 md:py-3 border-b border-gray-100 flex items-center gap-2.5 shadow-sm z-10">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex flex-shrink-0 items-center justify-center shadow-inner">
          <Sparkles className="text-emerald-600" size={18} />
        </div>
        <div>
          <h1 className="text-base md:text-lg font-bold text-gray-800">AI Tư Vấn Nông Nghiệp</h1>
          <p className="text-[11px] md:text-xs text-emerald-600 font-medium">Trợ lý ảo 24/7</p>
        </div>
      </div> */}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-3 md:px-4 py-2 md:py-3 space-y-3">
        <div className="w-full space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} px-1 md:px-2`}>
              <div className={`flex max-w-[92%] md:max-w-[88%] lg:max-w-[85%] gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex flex-shrink-0 items-center justify-center shadow-sm ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"}`}>
                  {msg.role === "user" ? <User size={14} /> : <Bot size={16} />}
                </div>

                {/* Message Bubble */}
                <div className={`px-3.5 md:px-4 py-2 md:py-2.5 rounded-xl shadow-sm text-xs md:text-sm leading-relaxed break-words ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none whitespace-pre-wrap" : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"}`}>
                  {msg.role === "user" ? (
                    <>{msg.content}</>
                  ) : (
                    <div className="prose prose-sm max-w-none space-y-2">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc mb-2 ml-4">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal mb-2 ml-4">{children}</ol>,
                          li: ({ children }) => <li className="mb-1 ml-2">{children}</li>,
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
                          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          a: ({ children, href }) => (
                            <a href={href} className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">
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
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-100 px-3 md:px-4 py-2.5 md:py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="w-full relative flex flex-col justify-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi của bạn..."
            className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border-2 border-transparent transition-colors text-sm md:text-base text-gray-800 rounded-xl py-2 md:py-2.5 pl-3.5 md:pl-4 pr-11 focus:outline-none focus:border-emerald-200 focus:ring-4 focus:ring-emerald-50 resize-none shadow-inner"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-1.5 md:p-2 rounded-lg transition-all duration-200 ${input.trim() && !isTyping ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 text-white scale-100 active:scale-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            <Send size={16} className={input.trim() && !isTyping ? "translate-x-[1px] -translate-y-[1px]" : ""} />
          </button>
        </div>
        <p className="text-center text-[10px] md:text-xs text-gray-400 mt-2 font-medium">AI có thể không chính xác. Kiểm tra lại các lời khuyên quan trọng.</p>
      </div>
    </div>
  );
};

export default AIChat;