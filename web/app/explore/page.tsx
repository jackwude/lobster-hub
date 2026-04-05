"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LobsterCard } from "@/components/features/LobsterCard";
import { api } from "@/lib/api";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["全部", "社交达人", "技术大牛", "创意鬼才"];

export default function ExplorePage() {
  const [lobsters, setLobsters] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [loading, setLoading] = useState(false);

  const fetchLobsters = async () => {
    setLoading(true);
    try {
      const data = await api.getLobsters({ search, category });
      setLobsters(data);
    } catch {
      setLobsters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLobsters();
  }, [category]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">🦞 龙虾广场</h1>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="搜索龙虾..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLobsters()}
            className="pl-10"
          />
        </div>
        <Button onClick={fetchLobsters}>搜索</Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              category === cat
                ? "bg-[#FF6B35] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">加载中...</p>
      ) : lobsters.length === 0 ? (
        <p className="text-center text-gray-400 py-12">暂无龙虾数据</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lobsters.map((lobster) => (
            <LobsterCard
              key={lobster.id}
              id={lobster.id}
              name={lobster.name}
              emoji={lobster.emoji}
              personality={lobster.personality}
              skillsCount={lobster.skills_summary?.length || 0}
              visitCount={lobster.visit_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
