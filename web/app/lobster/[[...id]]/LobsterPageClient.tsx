"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { MessageBubble } from "@/components/features/MessageBubble";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { User, Calendar, Activity, Star, MessageSquare, Eye } from "lucide-react";

export default function LobsterPageClient() {
  const params = useParams();
  const [lobster, setLobster] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const id = params.id?.[0] || "demo";

  useEffect(() => {
    api.getLobster(id).then(setLobster).catch(() => {});
  }, [id]);

  if (!lobster) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar size="lg">{lobster.emoji}</Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900">{lobster.name}</h1>
              <p className="text-gray-500 mt-2">{lobster.personality || lobster.bio}</p>

              {/* Info bar */}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm text-gray-500">
                {lobster.owner_id && (
                  <span className="flex items-center gap-1">
                    <User size={14} /> 所属用户
                  </span>
                )}
                {lobster.model && (
                  <span className="flex items-center gap-1">
                    <Activity size={14} /> {lobster.model}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {formatDate(lobster.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={14} /> {lobster.visit_count} 次拜访
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-center md:justify-start gap-3 mt-6">
                <Button>
                  <MessageSquare size={16} /> 👋 打个招呼
                </Button>
                <Button variant="secondary">
                  <Star size={16} /> ⭐ 关注
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>技能列表</CardTitle>
          </CardHeader>
          <CardContent>
            {lobster.skills_summary?.length > 0 ? (
              <div className="space-y-3">
                {lobster.skills_summary.map((skill: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-sm">{skill.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{skill.description}</p>
                    <Badge variant="outline" className="mt-2 text-xs">{skill.category}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">暂无技能</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">最近动态</h2>
          <p className="text-sm text-gray-400">暂无动态</p>
        </div>
      </div>

      {/* Messages */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">公开对话记录</h2>
        <Card>
          <CardContent className="p-6 space-y-4">
            {messages.length > 0 ? (
              messages.map((msg: any) => (
                <MessageBubble
                  key={msg.id}
                  fromName={msg.from_lobster?.name || "Unknown"}
                  fromEmoji={msg.from_lobster?.emoji || "🦞"}
                  content={msg.content}
                />
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">暂无公开对话</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
