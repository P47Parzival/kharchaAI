"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import BOMTable from "@/components/BOMTable";
import {
  sendMessage,
  getConversation,
  ChatResponse,
  MessageData,
  BOMData,
  AgentStep,
} from "@/lib/api";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  bom: BOMData | null;
  steps: AgentStep[];
  status: string;
}

function AgentSteps({ steps }: { steps: AgentStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div style={{ marginBottom: "1rem", padding: "1rem", borderRadius: "12px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
        Agent Reasoning
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {steps.map((step, i) => {
          const statusColors: Record<string, string> = {
            done: "#10b981",
            "in_progress": "#f59e0b",
            error: "#ef4444",
            warning: "#f59e0b",
            waiting: "#a78bfa",
          };
          const dotColor = statusColors[step.status] || "#606078";

          return (
            <div
              key={i}
              className="animate-slide-up"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                fontSize: "0.85rem",
                animationDelay: `${i * 0.05}s`,
                opacity: 0,
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: dotColor,
                  marginTop: "0.4rem",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ color: "var(--text-secondary)" }}>{step.step}</span>
                {step.detail && (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Thinking...");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      bom: null,
      steps: [],
      status: "sent",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setLoadingMessage("🧠 Understanding your request...");

    try {
      const res: ChatResponse = await sendMessage({
        message: text,
        conversation_id: conversationId || undefined,
      });

      const assistantMsg: DisplayMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: res.response,
        bom: res.bom,
        steps: res.steps || [],
        status: res.status,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (!conversationId) {
        setConversationId(res.conversation_id);
        setRefreshSidebar((p) => p + 1);
      }
    } catch {
      const errorMsg: DisplayMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Failed to connect to KharchaAI backend. Make sure the backend server is running on port 8000.",
        bom: null,
        steps: [],
        status: "error",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectConversation(id: string) {
    try {
      const detail = await getConversation(id);
      setConversationId(id);
      setMessages(
        detail.messages.map((m: MessageData) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          bom: m.bom,
          steps: [],
          status: "complete",
        }))
      );
    } catch {
      // ignore
    }
  }

  function handleNewChat() {
    setMessages([]);
    setConversationId(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)" }}>
      {sidebarOpen && (
        <Sidebar
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          refreshTrigger={refreshSidebar}
        />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            height: "56px",
            display: "flex",
            alignItems: "center",
            padding: "0 1.25rem",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ padding: "0.5rem", borderRadius: "8px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex" }}
            title="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 style={{ marginLeft: "0.75rem", fontWeight: 600, fontSize: "1.1rem", color: "var(--text-primary)" }}>
            Kharcha<span className="gradient-text">AI</span>
          </h1>
          <span style={{ marginLeft: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>Hardware Cost Estimator</span>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem 1.5rem" }}>
          {messages.length === 0 ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: "540px", margin: "0 auto" }}>
              <div
                className="animate-float"
                style={{ width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg, #6c5ce7, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", marginBottom: "1.5rem", boxShadow: "0 8px 24px rgba(108, 92, 231, 0.25)" }}
              >
                💰
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-primary)" }}>What are you building?</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem", lineHeight: 1.7 }}>
                Describe your hardware project and I&apos;ll generate a complete Bill of Materials with real-time pricing.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", width: "100%" }}>
                {[
                  "4-channel EEG device for BCI research",
                  "ESP32-based weather station with solar power",
                  "Arduino-based home automation hub",
                  "Raspberry Pi security camera system",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    style={{ padding: "1rem 1.25rem", borderRadius: "12px", fontSize: "0.85rem", textAlign: "left", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s ease" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card-hover)"; e.currentTarget.style.borderColor = "rgba(108,92,231,0.3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="animate-slide-up"
                  style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: msg.role === "user" ? "0.75rem 1.25rem" : "1rem 1.25rem",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: msg.role === "user" ? "linear-gradient(135deg, #6c5ce7, #7c6cf7)" : "var(--bg-card)",
                      color: msg.role === "user" ? "white" : "var(--text-primary)",
                      border: msg.role === "user" ? "none" : "1px solid var(--border-subtle)",
                    }}
                  >
                    {msg.role === "assistant" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #6c5ce7, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.65rem", fontWeight: 700 }}>K</div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)" }}>KharchaAI</span>
                        {msg.status === "awaiting_clarification" && (
                          <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "rgba(167,139,250,0.15)", color: "#a78bfa", fontWeight: 500 }}>Needs your input</span>
                        )}
                      </div>
                    )}

                    {/* Agent Steps */}
                    {msg.role === "assistant" && msg.steps.length > 0 && (
                      <AgentSteps steps={msg.steps} />
                    )}

                    {/* Message content */}
                    <div
                      className={msg.role === "assistant" ? "chat-markdown" : ""}
                      style={{ fontSize: "0.875rem", lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }}
                    />

                    {/* BOM Table */}
                    {msg.bom && <BOMTable bom={msg.bom} />}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="animate-fade-in" style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px 16px 16px 4px", padding: "1rem 1.25rem", maxWidth: "70%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #6c5ce7, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.65rem", fontWeight: 700 }}>K</div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)" }}>KharchaAI</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#6c5ce7", animation: "pulse-glow 1s ease-in-out infinite" }} />
                        <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#6c5ce7", animation: "pulse-glow 1s ease-in-out infinite 0.2s" }} />
                        <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#6c5ce7", animation: "pulse-glow 1s ease-in-out infinite 0.4s" }} />
                      </div>
                      {loadingMessage}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", alignItems: "flex-end", gap: "0.75rem" }}>
            <div style={{ flex: 1 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your hardware project..."
                rows={1}
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "12px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: "0.875rem", outline: "none", resize: "none", minHeight: "48px", maxHeight: "120px", fontFamily: "inherit", lineHeight: 1.5 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border-focus)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 120)}px`; }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="btn-primary"
              style={{ padding: "0.75rem 1.5rem", fontSize: "0.875rem", opacity: !input.trim() || loading ? 0.5 : 1, cursor: !input.trim() || loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Working..." : "Send"}
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Prices are scraped in real-time and may vary. Always verify with the supplier.
          </div>
        </div>
      </div>
    </div>
  );
}

function simpleMarkdown(text: string): string {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  html = html.replace(/(<li>.*?<\/li>(?:\s*<br\/>)?)+/g, (match) => `<ul>${match.replace(/<br\/>/g, "")}</ul>`);
  return `<p>${html}</p>`;
}
