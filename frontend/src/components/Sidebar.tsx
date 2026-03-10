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
      // API not yet available, that's okay
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
    <aside className="w-72 h-full flex flex-col bg-(--bg-secondary) border-r border-(--border-subtle)">
      {/* Header */}
      <div className="p-4 border-b border-(--border-subtle)">
        <Link href="/" className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#6c5ce7] to-[#a78bfa] flex items-center justify-center text-white font-bold text-sm">
            K
          </div>
          <span className="text-lg font-bold">
            Kharcha<span className="gradient-text">AI</span>
          </span>
        </Link>
        <button
          onClick={onNewChat}
          className="w-full px-4 py-2.5 rounded-xl border border-(--border-subtle) bg-(--bg-card) text-sm font-medium text-(--text-primary) hover:bg-(--bg-card-hover) hover:border-[rgba(108,92,231,0.3)] transition-all flex items-center justify-center gap-2"
        >
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Estimation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg animate-shimmer" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-(--text-muted)">
            No conversations yet.
            <br />
            Start by describing your project!
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all text-sm ${
                  currentConversationId === conv.id
                    ? "bg-[rgba(108,92,231,0.15)] border border-[rgba(108,92,231,0.3)]"
                    : "hover:bg-(--bg-card) border border-transparent"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-(--text-primary)">
                    {conv.title}
                  </div>
                  <div className="text-xs text-(--text-muted) mt-0.5">
                    {formatDate(conv.updated_at)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[rgba(239,68,68,0.15)] text-(--text-muted) hover:text-(--error) transition-all"
                  title="Delete"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-(--border-subtle) text-xs text-(--text-muted) text-center">
        Prices scraped in real-time
      </div>
    </aside>
  );
}
