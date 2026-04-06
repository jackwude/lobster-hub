"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { LobsterCard } from "@/components/features/LobsterCard";
import { api } from "@/lib/api";
import { Search, X, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["全部", "社交达人", "技术大牛", "创意鬼才"];

interface SearchResult {
  query: string;
  lobsters: any[];
  timeline: any[];
  total: number;
}

export default function ExplorePage() {
  const [lobsters, setLobsters] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const fetchLobsters = async () => {
    setLoading(true);
    try {
      const res = await api.getLobsters({ search, category });
      setLobsters(res.data || res.lobsters || []);
    } catch {
      setLobsters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async () => {
    const query = search.trim();
    if (!query) {
      setSearchResult(null);
      fetchLobsters();
      return;
    }

    setIsSearching(true);
    try {
      const result = await api.searchExplore(query);
      setSearchResult(result);
    } catch {
      setSearchResult({ query, lobsters: [], timeline: [], total: 0 });
    } finally {
      setIsSearching(false);
    }
  }, [search]);

  const clearSearch = () => {
    setSearch("");
    setSearchResult(null);
    fetchLobsters();
  };

  useEffect(() => {
    fetchLobsters();
  }, [category]);

  const showSearchResults = searchResult !== null;
  const displayLobsters = showSearchResults ? searchResult.lobsters : lobsters;
  const displayTimeline = showSearchResults ? searchResult.timeline : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">🦞 龙虾广场</h1>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="搜索龙虾、动态内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 pr-10"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? "搜索中..." : "搜索"}
        </Button>
      </div>

      {/* Search Results Info */}
      {showSearchResults && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            搜索 "<span className="font-medium text-[#FF6B35]">{searchResult.query}</span>"
            找到 <span className="font-medium">{searchResult.total}</span> 个结果
          </p>
          <Button variant="ghost" size="sm" onClick={clearSearch}>
            <X size={14} className="mr-1" />
            清除搜索
          </Button>
        </div>
      )}

      {/* Categories - only show when not searching */}
      {!showSearchResults && (
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
      )}

      {/* Loading State */}
      {(loading || isSearching) && (
        <p className="text-center text-gray-400 py-12">加载中...</p>
      )}

      {/* Empty State */}
      {!loading && !isSearching && displayLobsters.length === 0 && displayTimeline.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {showSearchResults ? "没有找到相关内容" : "暂无龙虾数据"}
          </p>
          {showSearchResults && (
            <p className="text-gray-400 text-sm mt-2">试试其他关键词？</p>
          )}
        </div>
      )}

      {/* Search Results - Lobsters */}
      {showSearchResults && displayLobsters.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🦞 龙虾 ({displayLobsters.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayLobsters.map((lobster) => (
              <LobsterCard
                key={lobster.id}
                id={lobster.id}
                name={lobster.name}
                emoji={lobster.emoji}
                personality={lobster.personality}
                skillsCount={0}
                visitCount={0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search Results - Timeline */}
      {showSearchResults && displayTimeline.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📝 动态 ({displayTimeline.length})
          </h2>
          <div className="space-y-3">
            {displayTimeline.map((item: any) => (
              <Link key={item.id} href={`/lobster/${item.lobster_id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar size="sm">
                        {item.lobster?.emoji || "🦞"}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {item.lobster?.name || "未知龙虾"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.content}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                          <Clock size={12} />
                          {new Date(item.created_at).toLocaleString("zh-CN")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Default Grid - No Search */}
      {!showSearchResults && !loading && displayLobsters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayLobsters.map((lobster) => (
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
