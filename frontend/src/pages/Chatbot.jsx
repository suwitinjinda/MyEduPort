import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api/client";

const QUICK_PROMPTS = [
  "What's the SAT score I need for Ivy League?",
  "Critique my activity list",
  "Walk me through Common App prompt 2",
  "What's a 'spike' and how do I build one?",
  "Compare US vs UK admissions",
  "How do I ask for a recommendation letter?",
  "What summer programs should I apply to in Grade 10?",
  "Help me find my hook"
];

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Welcome. I'm EduBot — your AI admissions advisor. Ask me about academic targets, the spike strategy, essay prompts, recommendations, or anything else from the Excellent Portfolio Guide."
    }
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const messagesEndRef = useRef(null);
  const [sending, setSending] = useState(false);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || sending) return;
    setSending(true);
    const userMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    try {
      const data = await apiFetch("/api/ai/chat", { method: "POST", body: JSON.stringify({ message: text, sessionId }) });
      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      const msg = err.message && !/failed|network/i.test(err.message)
        ? err.message
        : "Apologies — I ran into an error. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: msg }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">EduBot · AI Admissions Advisor</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Ask anything about admissions.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
          Trained on the Excellent Portfolio Guide. EduBot answers in the
          same voice as a thoughtful admissions coach.
        </p>
      </header>

      <div className="chat-layout">
        <aside className="chat-history">
          <h3 className="chat-quick-prompts h3" style={{ fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 700, color: "var(--ink-muted)", marginBottom: "0.85rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            History
          </h3>
          {chatHistory.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.85rem", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>
              Your conversations will appear here as you work.
            </p>
          ) : (
            chatHistory.map((session, idx) => (
              <div
                key={idx}
                className={`chat-history-item ${activeSession === idx ? "active" : ""}`}
                onClick={() => setActiveSession(idx)}
              >
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink)" }}>Session {idx + 1}</div>
                <p className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                  {new Date(session.date).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </aside>

        <div className="chat-window">
          <div className="flex-between" style={{ marginBottom: "1rem", paddingBottom: "0.85rem", borderBottom: "1px solid var(--rule-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ width: "10px", height: "10px", background: "var(--success)", borderRadius: "50%", boxShadow: "0 0 0 3px rgba(45, 106, 79, 0.15)" }} />
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}>EduBot</strong>
            </div>
            <span className="badge primary">Live</span>
          </div>

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role === "user" ? "user" : "bot"}`}>
                {msg.text}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble bot" style={{ opacity: 0.6 }}>
                EduBot is thinking…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about requirements, activities, essays, or your portfolio…"
              disabled={sending}
            />
            <button className="button" onClick={() => sendMessage(input)} disabled={sending}>
              Send
            </button>
          </div>
        </div>

        <aside className="chat-quick-prompts">
          <h3>Quick prompts</h3>
          {QUICK_PROMPTS.map((p) => (
            <button key={p} className="chat-quick-prompt" onClick={() => sendMessage(p)}>
              {p}
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
