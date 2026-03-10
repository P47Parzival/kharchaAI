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
} from "@/lib/api";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  bom: BOMData | null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

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
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (!conversationId) {
        setConversationId(res.conversation_id);
        setRefreshSidebar((p) => p + 1);
      }
    } catch (err) {
      const errorMsg: DisplayMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "⚠️ Failed to connect to KharchaAI backend. Make sure the backend server is running on port 8000.",
        bom: null,
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
    <div className="flex h-screen bg-(--bg-primary)">
      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          refreshTrigger={refreshSidebar}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center px-4 border-b border-(--border-subtle) bg-(--bg-secondary)">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-(--bg-card) transition-colors text-(--text-secondary)"
            title="Toggle sidebar"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="ml-3 font-semibold text-(--text-primary)">
            Kharcha<span className="gradient-text">AI</span>
          </h1>
          <span className="ml-2 text-xs text-(--text-muted)">
            Hardware Cost Estimator
          </span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#6c5ce7] to-[#a78bfa] flex items-center justify-center text-3xl mb-6 animate-float shadow-lg">
                💰
              </div>
              <h2 className="text-2xl font-bold mb-3 text-(--text-primary)">
                What are you building?
              </h2>
              <p className="text-(--text-secondary) mb-8 leading-relaxed">
                Describe your hardware project and I&apos;ll generate a complete
                Bill of Materials with real-time pricing from DigiKey, Mouser,
                Amazon, and more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {[
                  "4-channel EEG device for BCI research",
                  "ESP32-based weather station with solar power",
                  "Arduino-based home automation hub",
                  "Raspberry Pi security camera system",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-3 rounded-xl text-sm text-left bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-card-hover) hover:border-[rgba(108,92,231,0.3)] transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } animate-slide-up`}
                >
                  <div
                    className={`max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-linear-to-r from-[#6c5ce7] to-[#7c6cf7] text-white rounded-2xl rounded-br-md px-5 py-3"
                        : "bg-(--bg-card) border border-(--border-subtle) rounded-2xl rounded-bl-md px-5 py-4"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-(--border-subtle)">
                        <div className="w-6 h-6 rounded-md bg-linear-to-br from-[#6c5ce7] to-[#a78bfa] flex items-center justify-center text-white text-xs font-bold">
                          K
                        </div>
                        <span className="text-xs font-medium text-(--text-muted)">
                          KharchaAI
                        </span>
                      </div>
                    )}
                    <div
                      className={
                        msg.role === "assistant"
                          ? "chat-markdown text-sm"
                          : "text-sm"
                      }
                      dangerouslySetInnerHTML={{
                        __html: simpleMarkdown(msg.content),
                      }}
                    />
                    {msg.bom && <BOMTable bom={msg.bom} />}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-(--bg-card) border border-(--border-subtle) rounded-2xl rounded-bl-md px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-linear-to-br from-[#6c5ce7] to-[#a78bfa] flex items-center justify-center text-white text-xs font-bold">
                        K
                      </div>
                      <span className="text-xs font-medium text-(--text-muted)">
                        KharchaAI
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-(--text-secondary)">
                      <div className="flex gap-1">
                        <span
                          className="w-2 h-2 rounded-full bg-(--accent-primary) animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-(--accent-primary) animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-(--accent-primary) animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      Analyzing project &amp; scraping live prices...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-(--border-subtle) bg-(--bg-secondary)">
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your hardware project..."
                rows={1}
                className="w-full px-4 py-3 rounded-xl bg-(--bg-input) border border-(--border-subtle) text-(--text-primary) text-sm placeholder:text-(--text-muted) focus:outline-none focus:border-(--border-focus) focus:ring-1 focus:ring-[rgba(108,92,231,0.3)] resize-none transition-all"
                style={{ minHeight: "48px", maxHeight: "120px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-5 py-3 rounded-xl bg-linear-to-r from-[#6c5ce7] to-[#a78bfa] text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-[rgba(108,92,231,0.3)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Working...
                </>
              ) : (
                <>
                  Send
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </>
              )}
            </button>
          </div>
          <div className="text-center mt-2 text-xs text-(--text-muted)">
            Prices are scraped in real-time and may vary. Always verify with the
            supplier.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Very lightweight markdown to HTML converter for chat messages.
 * Handles: bold, italic, headers, links, code, lists, and line breaks.
 */
function simpleMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML special chars (but preserve existing markdown)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    // Unordered lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  // Wrap list items
  html = html.replace(
    /(<li>.*?<\/li>(?:\s*<br\/>)?)+/g,
    (match) => `<ul>${match.replace(/<br\/>/g, "")}</ul>`
  );

  return `<p>${html}</p>`;
}
