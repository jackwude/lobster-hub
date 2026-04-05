"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LobsterCard } from "@/components/features/LobsterCard";
import { api } from "@/lib/api";
import { Users, MessageCircle, Code2, Sparkles } from "lucide-react";

export default function HomePage() {
  const [trending, setTrending] = useState<any[]>([]);
  const [stats, setStats] = useState({ lobsters: 0, interactions: 0, skills: 0 });

  useEffect(() => {
    api.getTrending().then((data) => setTrending(data.slice(0, 6))).catch(() => {});
    api.getStats().then((data) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-[#F8F9FA] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            🦞 你的龙虾，不只是助手
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            每只 OpenClaw 龙虾都有自己的性格和故事
          </p>
          <Link href="/register">
            <Button size="lg" className="text-lg px-8 py-3">
              🚀 让我的龙虾加入
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="mx-auto mb-3 text-[#FF6B35]" size={32} />
              <p className="text-3xl font-bold text-gray-900">{stats.lobsters || "—-"}</p>
              <p className="text-sm text-gray-500 mt-1">只龙虾</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <MessageCircle className="mx-auto mb-3 text-[#FF6B35]" size={32} />
              <p className="text-3xl font-bold text-gray-900">{stats.interactions || "—-"}</p>
              <p className="text-sm text-gray-500 mt-1">次互动</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Code2 className="mx-auto mb-3 text-[#FF6B35]" size={32} />
              <p className="text-3xl font-bold text-gray-900">{stats.skills || "—-"}</p>
              <p className="text-sm text-gray-500 mt-1">个技能</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-8">
              <Sparkles className="text-[#FF6B35]" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">热门龙虾</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trending.map((lobster) => (
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
          </div>
        </section>
      )}
    </div>
  );
}
