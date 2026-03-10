"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getConversations,
  deleteConversation,
  ConversationSummary,
} from "@/lib/api";

interface SidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  refreshTrigger: number;
}

export default function Sidebar({
  currentConversationId,
  onSelectConversation,
  onNewChat,
  refreshTrigger,
}: SidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, [refreshTrigger]);

  async function fetchConversations() {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {
      // API not yet available
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) onNewChat();
    } catch {
      // ignore
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return "Yesterday";
    return d.toLocaleDateString();
  }

  return (
    <aside
      style={{
        width: "280px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", textDecoration: "none" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #6c5ce7, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.8rem" }}>
            K
          </div>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Kharcha<span className="gradient-text">AI</span>
          </span>
        </Link>
        <button
          onClick={onNewChat}
          style={{
            width: "100%",
            padding: "0.6rem 1rem",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-card-hover)";
            e.currentTarget.style.borderColor = "rgba(108,92,231,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-card)";
            e.currentTarget.style.borderColor = "var(--border-subtle)";
          }}
        >
          + New Estimation
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
        {loading ? (
          <div style={{ padding: "0.5rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-shimmer" style={{ height: "56px", borderRadius: "8px", marginBottom: "0.5rem" }} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: "1.5rem 1rem", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            No conversations yet.<br />Start by describing your project!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  background: currentConversationId === conv.id ? "rgba(108,92,231,0.15)" : "transparent",
                  border: currentConversationId === conv.id ? "1px solid rgba(108,92,231,0.3)" : "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (currentConversationId !== conv.id) {
                    e.currentTarget.style.background = "var(--bg-card)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentConversationId !== conv.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500, color: "var(--text-primary)" }}>
                    {conv.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    {formatDate(conv.updated_at)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  style={{
                    padding: "0.3rem",
                    borderRadius: "6px",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    opacity: 0.3,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--error)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.3"; e.currentTarget.style.color = "var(--text-muted)"; }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "1rem", borderTop: "1px solid var(--border-subtle)", textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        Prices scraped in real-time
      </div>
    </aside>
  );
}
