import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api/client";

const quickPrompts = [
  "Ask about US requirements",
  "Timeline & Deadlines",
  "Ask about UK requirements",
  "Ask about China admissions",
  "Review my profile strengths",
  "What tests do I need?"
];

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm EduBot, your AI admissions assistant. Ask me about university requirements, timelines, or your profile strengths." }
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    
    try {
      const data = await apiFetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, sessionId })
      });
      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, I encountered an error. Please try again." }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="chat-layout">
      {/* Chat History Sidebar */}
      <div className="chat-history">
        <h3 className="section-title small" style={{ marginBottom: "1rem" }}>Chat History</h3>
        {chatHistory.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.875rem" }}>No previous chats</p>
        ) : (
          chatHistory.map((session, idx) => (
            <div
              key={idx}
              className={`chat-history-item ${activeSession === idx ? "active" : ""}`}
              onClick={() => setActiveSession(idx)}
            >
              <div className="subtitle" style={{ fontSize: "0.875rem" }}>Session {idx + 1}</div>
              <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {new Date(session.date).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Main Chat Window */}
      <div className="chat-window">
        <div className="section-title small" style={{ marginBottom: "1rem" }}>EduBot</div>
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-bubble ${msg.role === "user" ? "user" : "bot"}`}>
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about admissions, requirements, or your profile..."
            style={{ flex: 1 }}
          />
          <button className="button" onClick={() => sendMessage(input)}>
            Send
          </button>
        </div>
      </div>

      {/* Quick Prompts Sidebar */}
      <div className="chat-quick-prompts">
        <h3>Quick Prompts</h3>
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            className="chat-quick-prompt"
            onClick={() => sendMessage(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
