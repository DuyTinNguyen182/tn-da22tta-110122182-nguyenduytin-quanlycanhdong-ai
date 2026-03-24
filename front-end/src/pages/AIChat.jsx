import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Send, Bot, User, Sparkles } from "lucide-react";

const AIChat = () => {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize with prompt from AIScan if exists
  useEffect(() => {
    if (location.state?.result) {
      const { disease, confidence } = location.state.result;
      const initialPrompt = `Tôi vừa quét lá lúa và AI phát hiện bệnh: ${disease} (Độ tin cậy: ${(confidence * 100).toFixed(1)}%). Hãy tư vấn cho tôi cách phòng ngừa và điều trị bệnh này.`;
      
      setMessages([
        { role: "user", content: initialPrompt },
        { role: "assistant", content: `Chào bạn! Tính năng tư vấn AI đang được phát triển. Tương lai tôi sẽ gọi API backend để phản hồi về cách điều trị bệnh "${disease}" nhé!` }
      ]);
      
      // Xoá state để không bị lặp lại nếu trang re-render
      window.history.replaceState({}, document.title);
    } else {
      setMessages([
        { role: "assistant", content: "Chào bạn! Tôi là trợ lý AI nông nghiệp. Tôi có thể giúp gì cho bạn hôm nay?" }
      ]);
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Mock API call to AI
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Tính năng này đang trong quá trình phát triển. Bạn có thể kết nối API thực tế sau này." }
      ]);
      setIsTyping(false);
    }, 1500);
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