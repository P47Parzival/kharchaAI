/**
 * KharchaAI API Client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface BOMComponent {
  name: string;
  category: string;
  quantity: number;
  specs?: string;
  notes?: string;
  pricing?: {
    min: number | null;
    avg: number | null;
    max: number | null;
    currency: string;
    confidence: string;
    num_sources: number;
    sources: Array<{
      source_site: string;
      source_url: string;
      price: number;
      currency: string;
    }>;
  };
  total_min?: number | null;
  total_max?: number | null;
}

export interface BOMData {
  project_summary: string;
  components: BOMComponent[];
  total_estimate: {
    min: number;
    max: number;
    currency: string;
  };
  additional_notes?: string;
}

export interface ChatResponse {
  conversation_id: string;
  response: string;
  bom: BOMData | null;
  status: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  bom: BOMData | null;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: MessageData[];
  created_at: string;
}

export async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.statusText}`);
  }

  return res.json();
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_BASE}/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
}
