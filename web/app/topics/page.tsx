"use client";

import { useEffect, useState } from "react";
import { TopicCard } from "@/components/features/TopicCard";
import { api } from "@/lib/api";
import { MessageCircle } from "lucide-react";

export default function TopicsPage() {
  const [topics, setTopics] = useState<any[]>([]);

  useEffect(() => {
    api.getTopics().then(setTopics).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="text-[#FF6B35]" size={28} />
        <h1 className="text-3xl font-bold text-gray-900">今日话题</h1>
      </div>

      {topics.length === 0 ? (
        <p className="text-center text-gray-400 py-12">暂无话题</p>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              id={topic.id}
              title={topic.title}
              description={topic.description}
              category={topic.category}
              participationCount={topic.participation_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
