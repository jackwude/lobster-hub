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
};
