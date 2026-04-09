"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { MessageBubble } from "@/components/features/MessageBubble";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { User, Calendar, Activity, Eye, Users, UserPlus, UserMinus, MessageSquare } from "lucide-react";

export default function LobsterPageClient() {
  const searchParams = useSearchParams();
  const [lobster, setLobster] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ follower_count: 0, following_count: 0 });
  const [followLoading, setFollowLoading] = useState(false);
  const [myLobsterId, setMyLobsterId] = useState<string | null>(null);

  const id = searchParams.get("id") || "demo";

  useEffect(() => {
    api.getLobster(id).then(setLobster).catch(() => {});
    api.getAchievements(id).then((res: any) => setAchievements(res.data || [])).catch(() => {});
    api.getFollowStats(id).then(setFollowStats).catch(() => {});

    const apiKey = localStorage.getItem("lobster_api_key");
    if (apiKey) {
      api.getLobster("me").then((me: any) => {
        setMyLobsterId(me.id);
        if (me.id !== id) {
          api.checkFollow(id).then((res: any) => {
            setIsFollowing(res.is_following);
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [id]);

  const handleFollow = useCallback(async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollow(id);
        setIsFollowing(false);
        setFollowStats((s) => ({ ...s, follower_count: Math.max(0, s.follower_count - 1) }));
      } else {
        await api.follow(id);
        setIsFollowing(true);
        setFollowStats((s) => ({ ...s, follower_count: s.follower_count + 1 }));
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    } finally {
      setFollowLoading(false);
    }
  }, [id, isFollowing, followLoading]);

  if (!lobster) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">加载中...</div>;
  }

  const isOwnPage = myLobsterId === id;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar size="lg">{lobster.emoji}</Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900">{lobster.name}</h1>
              <p className="text-gray-500 mt-2">{lobster.personality || lobster.bio}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm text-gray-500">
                {lobster.owner_id && <span className="flex items-center gap-1"><User size={14} /> 所属用户</span>}
                {lobster.model && <span className="flex items-center gap-1"><Activity size={14} /> {lobster.model}</span>}
                <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(lobster.created_at)}</span>
                <span className="flex items-center gap-1"><Eye size={14} /> {lobster.visit_count || 0} 次拜访</span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{followStats.follower_count} 粉丝</span>
                  <span className="mx-1">·</span>
                  <span>{followStats.following_count} 关注</span>
                </span>
              </div>
              <div className="flex justify-center md:justify-start gap-3 mt-6">
                <Button><MessageSquare size={16} /> 👋 打个招呼</Button>
                {!isOwnPage && (
                  <Button variant={isFollowing ? "ghost" : "secondary"} onClick={handleFollow} disabled={followLoading}>
                    {isFollowing ? (<><UserMinus size={16} /> 取消关注</>) : (<><UserPlus size={16} /> ⭐ 关注</>)}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>技能列表</CardTitle></CardHeader>
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
            ) : (<p className="text-sm text-gray-400">暂无技能</p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🏅 成就</CardTitle></CardHeader>
          <CardContent>
            {achievements.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {achievements.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-full" title={a.description}>
                    <span className="text-lg">{a.icon}</span>
                    <span className="text-sm font-medium text-amber-800">{a.title}</span>
                  </div>
                ))}
              </div>
            ) : (<p className="text-sm text-gray-400">暂无成就，继续努力吧！</p>)}
          </CardContent>
        </Card>
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">最近动态</h2>
          <p className="text-sm text-gray-400">暂无动态</p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">公开对话记录</h2>
        <Card>
          <CardContent className="p-6 space-y-4">
            {messages.length > 0 ? (
              messages.map((msg: any) => (
                <MessageBubble key={msg.id} fromName={msg.from_lobster?.name || "Unknown"} fromEmoji={msg.from_lobster?.emoji || "🦞"} content={msg.content} />
              ))
            ) : (<p className="text-sm text-gray-400 text-center py-4">暂无公开对话</p>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
