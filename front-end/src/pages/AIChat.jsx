import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Send, Bot, User, Sparkles } from "lucide-react";
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
      <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center gap-3 shadow-sm z-10">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex flex-shrink-0 items-center justify-center shadow-inner">
          <Sparkles className="text-emerald-600" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">AI Tư Vấn Nông Nghiệp</h1>
          <p className="text-xs text-emerald-600 font-medium">Trợ lý ảo thông minh 24/7</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex flex-shrink-0 items-center justify-center shadow-sm ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"}`}>
                  {msg.role === "user" ? <User size={18} /> : <Bot size={20} />}
                </div>

                {/* Message Bubble */}
                <div className={`px-4 py-3 md:px-5 md:py-3.5 rounded-2xl shadow-sm whitespace-pre-wrap text-[15px] leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] gap-3 flex-row">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full flex flex-shrink-0 items-center justify-center shadow-sm bg-emerald-600 text-white">
                  <Bot size={20} />
                </div>
                <div className="px-5 py-4 rounded-2xl rounded-tl-none shadow-sm bg-white border border-gray-100 flex items-center gap-1.5 h-[52px]">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-100 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto w-full relative flex flex-col justify-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi của bạn về nông nghiệp, mùa vụ, sâu bệnh..."
            className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border-2 border-transparent transition-colors text-gray-800 rounded-2xl py-3.5 pl-5 pr-14 focus:outline-none focus:border-emerald-200 focus:ring-4 focus:ring-emerald-50 resize-none shadow-inner"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all duration-200 ${input.trim() && !isTyping ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 text-white scale-100 active:scale-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            <Send size={18} className={input.trim() && !isTyping ? "translate-x-[1px] -translate-y-[1px]" : ""} />
          </button>
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">AI có thể cung cấp thông tin không chính xác. Hãy kiểm tra lại các lời khuyên quan trọng.</p>
      </div>
    </div>
  );
};

export default AIChat;