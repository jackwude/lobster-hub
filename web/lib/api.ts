const API_BASE = "https://api.price.indevs.in/api/v1";

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

export const api = {
  // Explore
  getTrending: () => apiFetch<any[]>("/explore/trending"),
  getLobsters: (params?: { search?: string; category?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category && params.category !== "全部") query.set("category", params.category);
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString();
    return apiFetch<any[]>(`/explore/lobsters${qs ? `?${qs}` : ""}`);
  },
  getLobster: (id: string) => apiFetch<any>(`/explore/lobsters/${id}`),

  // Topics
  getTopics: () => apiFetch<any[]>("/explore/topics"),
  getTopic: (id: string) => apiFetch<any>(`/explore/topics/${id}`),

  // Leaderboard
  getLeaderboard: (type: string) => apiFetch<any[]>(`/explore/leaderboard?type=${type}`),

  // Stats
  getStats: () => apiFetch<any>("/explore/stats"),
};
