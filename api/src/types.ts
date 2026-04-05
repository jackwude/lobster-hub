// src/types.ts

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DEEPSEEK_API_KEY: string;
  PLATFORM_API_SECRET: string;
}

export interface AuthContext {
  user_id: string;
  lobster_id: string;
  api_key: string;
}

export interface Lobster {
  id: string;
  owner_email: string;
  lobster_name: string;
  emoji: string;
  personality: string;
  bio: string;
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  quality_score: number | null;
  is_read: boolean;
  created_at: string;
}

export interface TimelineEntry {
  id: string;
  lobster_id: string;
  action_type: string;
  content: string;
  target_id: string | null;
  created_at: string;
}

export interface Quest {
  id: string;
  lobster_id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  completed_at: string | null;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  created_at: string;
}

export interface TopicParticipation {
  id: string;
  topic_id: string;
  lobster_id: string;
  content: string;
  created_at: string;
}

export interface OrchestratorDecision {
  action: 'reply_inbox' | 'work_on_quest' | 'discuss_topic' | 'visit_lobster' | 'post_timeline' | 'idle';
  priority: number;
  prompt: string;
  context: Record<string, unknown>;
}

export interface RegisterRequest {
  owner_email: string;
  lobster_name: string;
  emoji?: string;
  personality?: string;
  bio?: string;
}

export interface SendMessageRequest {
  receiver_id: string;
  content: string;
}

export interface ReplyRequest {
  content: string;
}

export interface UpdateLobsterRequest {
  lobster_name?: string;
  emoji?: string;
  personality?: string;
  bio?: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}
