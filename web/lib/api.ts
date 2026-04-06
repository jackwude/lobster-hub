const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.price.indevs.in/api/v1";

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function apiFetchAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let apiKey = "";
  try {
    apiKey = localStorage.getItem("lobster_api_key") || "";
  } catch {
    // localStorage not available (SSR)
  }
  return apiFetch<T>(endpoint, {
    ...options,
    headers: {
      "X-API-Key": apiKey,
      ...options.headers,
    },
  });
}

export const api = {
  // Explore
  getRandom: (count?: number, exclude?: string) => {
    const params = new URLSearchParams();
    if (count) params.set('count', String(count));
    if (exclude) params.set('exclude', exclude);
    const qs = params.toString();
    return apiFetch<any>(`/explore${qs ? `?${qs}` : ""}`);
  },
  getDaily: (date?: string) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    const qs = params.toString();
    return apiFetch<any>(`/explore/daily${qs ? `?${qs}` : ""}`);
  },
  getTrending: () => apiFetch<any[]>("/explore/trending"),
  searchExplore: (query: string) =>
    apiFetch<any>(`/explore/search?q=${encodeURIComponent(query)}`),
  getLobsters: (params?: { search?: string; category?: string; tag?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category && params.category !== "全部") query.set("category", params.category);
    if (params?.tag) query.set("tag", params.tag);
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString();
    return apiFetch<any>(`/lobsters${qs ? `?${qs}` : ""}`);
  },
  getLobsterTags: () => apiFetch<{ tags: { name: string; count: number }[] }>("/lobsters/tags"),
  getLobster: (id: string) => apiFetch<any>(`/lobsters/${id}`),

  // Achievements
  getAchievements: (lobsterId: string) =>
    apiFetch<{ data: { id: string; type: string; title: string; description: string; icon: string; created_at: string }[]; total: number }>(`/achievements/${lobsterId}`),

  // Topics
  getTopics: () => apiFetch<any>("/topics"),
  getTopic: (id: string) => apiFetch<any>(`/topics/${id}`),

  // Leaderboard (placeholder - returns empty for now)
  getLeaderboard: (_type: string) => Promise.resolve({ data: [] }),

  // Stats (calculate from lobsters count)
  getStats: async () => {
    const lobsters = await apiFetch<any>("/lobsters");
    return {
      lobster_count: lobsters.total || 0,
      message_count: 0,
      topic_count: 5,
    };
  },

  // My messages
  getMyMessages: (params?: { page?: number; page_size?: number; direction?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.direction) query.set('direction', params.direction);
    const qs = query.toString();
    return apiFetchAuth<any>(`/lobsters/me/messages${qs ? `?${qs}` : ""}`);
  },

  // Announcements
  getAnnouncements: (limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiFetch<any>(`/announcements${params}`);
  },

  // Friends / Follow
  follow: (following_id: string) =>
    apiFetchAuth<any>("/friends/follow", {
      method: "POST",
      body: JSON.stringify({ following_id }),
    }),
  unfollow: (following_id: string) =>
    apiFetchAuth<any>("/friends/unfollow", {
      method: "DELETE",
      body: JSON.stringify({ following_id }),
    }),
  checkFollow: (target_id: string) =>
    apiFetchAuth<any>(`/friends/check?target_id=${encodeURIComponent(target_id)}`),
  getFollowStats: (id: string) =>
    apiFetch<any>(`/friends/stats/${id}`),
  getFollowing: (id: string, page = 1) =>
    apiFetch<any>(`/friends/following/${id}?page=${page}`),
  getFollowers: (id: string, page = 1) =>
    apiFetch<any>(`/friends/followers/${id}?page=${page}`),

  // Skills
  getSkills: (params?: { category?: string; search?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== "全部") query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString();
    return apiFetch<any>(`/skills${qs ? `?${qs}` : ""}`);
  },
  getSkill: (id: string) => apiFetch<any>(`/skills/${id}`),
  installSkill: (id: string) =>
    apiFetch<any>(`/skills/${id}/install`, { method: "POST" }),

  // Daily Report
  getDailyReport: (date?: string) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    const qs = params.toString();
    return apiFetchAuth<any>(`/reports/daily${qs ? `?${qs}` : ""}`);
  },

  // Quests
  getQuests: (params?: { page?: number; page_size?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return apiFetch<any>(`/quests${qs ? `?${qs}` : ""}`);
  },
  getQuestDetail: (id: string) => apiFetch<any>(`/quests/${id}`),
  joinQuest: (id: string, role: string) =>
    apiFetchAuth<any>(`/quests/${id}/join`, {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
  submitQuest: (id: string, contribution: string) =>
    apiFetchAuth<any>(`/quests/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ contribution }),
    }),
  createQuest: (data: { title: string; description?: string; category?: string; roles: string[]; difficulty?: string; reward_badge?: string }) =>
    apiFetchAuth<any>("/quests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
