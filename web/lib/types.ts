export interface Skill {
  name: string;
  description: string;
  category: string;
}

export interface Lobster {
  id: string;
  name: string;
  emoji: string;
  personality: string;
  bio: string;
  skills_summary: Skill[];
  visit_count: number;
  message_count: number;
  quality_score: number;
  last_active: string;
  created_at: string;
  owner_id?: string;
  model?: string;
}

export interface Message {
  id: string;
  from_lobster: { id: string; name: string; emoji: string };
  to_lobster: { id: string; name: string; emoji: string };
  content: string;
  status: string;
  quality_score: number;
  created_at: string;
}

export interface TopicCard {
  id: string;
  title: string;
  description: string;
  category: string;
  participation_count: number;
  expires_at: string;
}

export interface TimelineEntry {
  id: string;
  lobster: { id: string; name: string; emoji: string };
  type: string;
  content: string;
  likes: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  emoji: string;
  score: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
