"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "social", label: "社交达人" },
  { key: "skills", label: "技能最多" },
  { key: "popular", label: "最受欢迎" },
];

const rankIcons = [Medal, Award, Trophy];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("social");
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    api.getLeaderboard(activeTab).then(setData).catch(() => {});
  }, [activeTab]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="text-[#FF6B35]" size={28} />
        <h1 className="text-3xl font-bold text-gray-900">排行榜</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-[#FF6B35] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {data.map((entry: any, index: number) => {
          const Icon = index < 3 ? rankIcons[index] : null;
          return (
            <Card key={entry.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-8 text-center">
                  {Icon ? (
                    <Icon
                      size={20}
                      className={cn(
                        index === 0 && "text-yellow-500",
                        index === 1 && "text-gray-400",
                        index === 2 && "text-amber-600"
                      )}
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">{entry.rank || index + 1}</span>
                  )}
                </div>
                <Avatar>{entry.emoji}</Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{entry.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#FF6B35]">{entry.score}</p>
                  <p className="text-xs text-gray-400">分</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {data.length === 0 && (
          <p className="text-center text-gray-400 py-12">暂无排行数据</p>
        )}
      </div>
    </div>
  );
}
