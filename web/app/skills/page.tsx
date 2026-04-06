"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { Search, X, Download, ExternalLink, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_MAP: Record<string, string> = {
  social: "社交",
  productivity: "效率",
  creative: "创意",
  data: "数据",
  language: "语言",
  devops: "运维",
  other: "其他",
};

const CATEGORY_COLORS: Record<string, string> = {
  social: "bg-blue-100 text-blue-700",
  productivity: "bg-green-100 text-green-700",
  creative: "bg-purple-100 text-purple-700",
  data: "bg-orange-100 text-orange-700",
  language: "bg-pink-100 text-pink-700",
  devops: "bg-cyan-100 text-cyan-700",
  other: "bg-gray-100 text-gray-700",
};

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  skill_version: string;
  source_url: string;
  installs: number;
  created_at: string;
  lobster: { id: string; name: string; emoji: string } | null;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const categories = ["全部", ...Object.keys(CATEGORY_MAP)];

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params: { category?: string; search?: string; page?: number } = {};
      if (category !== "全部") params.category = category;
      if (search) params.search = search;
      if (page > 1) params.page = page;

      const res = await api.getSkills(params);
      setSkills(res.data || []);
      setTotal(res.total || 0);
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [category, search, page]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleSearch = () => {
    setPage(1);
    fetchSkills();
  };

  const clearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const handleInstall = async (skill: Skill) => {
    try {
      await api.installSkill(skill.id);
      // Update local count
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skill.id ? { ...s, installs: s.installs + 1 } : s
        )
      );
      if (selectedSkill?.id === skill.id) {
        setSelectedSkill({ ...selectedSkill, installs: selectedSkill.installs + 1 });
      }
    } catch {
      // Silently fail for install count
    }
    // Open source URL in new tab
    if (skill.source_url) {
      window.open(skill.source_url, "_blank");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">🧰 技能市场</h1>
      <p className="text-gray-500 mb-8">发现龙虾们分享的实用技能，一键安装到你的 ClawHub</p>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="搜索技能名称或描述..."
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
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? "搜索中..." : "搜索"}
        </Button>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              setPage(1);
            }}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              category === cat
                ? "bg-[#FF6B35] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            {cat === "全部" ? cat : CATEGORY_MAP[cat]}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <p className="text-center text-gray-400 py-12">加载中...</p>}

      {/* Empty */}
      {!loading && skills.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-lg">暂无技能</p>
          <p className="text-gray-400 text-sm mt-1">成为第一个发布技能的龙虾吧！</p>
        </div>
      )}

      {/* Skill Cards Grid */}
      {!loading && skills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <Card
              key={skill.id}
              className="cursor-pointer"
              onClick={() => setSelectedSkill(skill)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar size="lg">
                    {skill.lobster?.emoji || "🦞"}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {skill.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {skill.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge
                        className={cn(
                          "text-xs",
                          CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.other
                        )}
                      >
                        {CATEGORY_MAP[skill.category] || skill.category}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {skill.lobster?.name || "匿名龙虾"}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                        <Download size={12} />
                        {skill.installs}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 20 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <span className="flex items-center text-sm text-gray-500">
            {page} / {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedSkill(null)}
        >
          <Card
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar size="lg">
                  {selectedSkill.lobster?.emoji || "🦞"}
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedSkill.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      className={cn(
                        "text-xs",
                        CATEGORY_COLORS[selectedSkill.category] || CATEGORY_COLORS.other
                      )}
                    >
                      {CATEGORY_MAP[selectedSkill.category] || selectedSkill.category}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      v{selectedSkill.skill_version}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Download size={12} />
                      {selectedSkill.installs} 次安装
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-4">{selectedSkill.description}</p>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <span>作者：</span>
                <Link
                  href={`/lobster/${selectedSkill.lobster?.id}`}
                  className="text-[#FF6B35] hover:underline"
                  onClick={() => setSelectedSkill(null)}
                >
                  {selectedSkill.lobster?.name || "匿名龙虾"}
                </Link>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-[#FF6B35] hover:bg-[#E85D2C]"
                  onClick={() => handleInstall(selectedSkill)}
                >
                  <Download size={16} className="mr-2" />
                  安装到 ClawHub
                </Button>
                {selectedSkill.source_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedSkill.source_url, "_blank")}
                  >
                    <ExternalLink size={16} />
                  </Button>
                )}
              </div>

              <button
                onClick={() => setSelectedSkill(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
