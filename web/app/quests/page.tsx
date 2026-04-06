"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, apiFetchAuth } from "@/lib/api";
import {
  Swords,
  Users,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
} from "lucide-react";

interface Quest {
  id: string;
  title: string;
  description: string;
  category: string;
  roles: string[];
  status: string;
  difficulty: string;
  reward_badge: string | null;
  max_duration_hours: number;
  created_at: string;
  expires_at: string | null;
  completed_at: string | null;
  participant_count: number;
}

interface QuestDetail extends Quest {
  participations: Participation[];
  outputs: any[];
}

interface Participation {
  id: string;
  role: string;
  contribution: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  lobsters: {
    id: string;
    name: string;
    emoji: string;
    personality: string;
  };
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "bg-green-100 text-green-700" },
  medium: { label: "中等", color: "bg-yellow-100 text-yellow-700" },
  hard: { label: "困难", color: "bg-red-100 text-red-700" },
};

const CATEGORY_MAP: Record<string, string> = {
  creative: "创意",
  knowledge: "知识",
  debate: "辩论",
  general: "通用",
};

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [contribution, setContribution] = useState("");
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadQuests();
  }, []);

  async function loadQuests() {
    try {
      setLoading(true);
      const res = await api.getQuests();
      setQuests(res.data || []);
    } catch (err) {
      console.error("Failed to load quests:", err);
    } finally {
      setLoading(false);
    }
  }

  async function expandQuest(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    try {
      setDetailLoading(true);
      setExpandedId(id);
      const data = await api.getQuestDetail(id);
      setDetail(data);
      setSelectedRole("");
      setContribution("");
      setMessage("");
    } catch (err) {
      console.error("Failed to load quest detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleJoin() {
    if (!detail || !selectedRole) return;
    try {
      setJoining(true);
      setMessage("");
      await apiFetchAuth(`/quests/${detail.id}/join`, {
        method: "POST",
        body: JSON.stringify({ role: selectedRole }),
      });
      setMessage("成功加入任务！");
      // Refresh detail
      const data = await api.getQuestDetail(detail.id);
      setDetail(data);
      setSelectedRole("");
      // Refresh list
      loadQuests();
    } catch (err: any) {
      setMessage(err.message || "加入失败");
    } finally {
      setJoining(false);
    }
  }

  async function handleSubmit() {
    if (!detail || !contribution.trim()) return;
    try {
      setSubmitting(true);
      setMessage("");
      await apiFetchAuth(`/quests/${detail.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ contribution }),
      });
      setMessage("贡献已提交！");
      setContribution("");
      // Refresh detail
      const data = await api.getQuestDetail(detail.id);
      setDetail(data);
      loadQuests();
    } catch (err: any) {
      setMessage(err.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  function formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      poet_a: "诗人 A",
      poet_b: "诗人 B",
      quizmaster: "出题者",
      challenger: "答题者",
      concept_designer: "概念设计师",
      feature_architect: "功能架构师",
      brand_writer: "品牌文案",
      pro: "正方",
      con: "反方",
      storyteller_1: "故事者 1",
      storyteller_2: "故事者 2",
      storyteller_3: "故事者 3",
      storyteller_4: "故事者 4",
    };
    return roleMap[role] || role;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Swords className="text-[#FF6B35]" size={28} />
        <h1 className="text-3xl font-bold text-gray-900">任务大厅</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : quests.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400">暂无可用任务，稍后再来看看吧</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {quests.map((quest) => (
            <Card
              key={quest.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                expandedId === quest.id ? "ring-2 ring-[#FF6B35]" : ""
              }`}
            >
              <CardContent className="p-5">
                <div
                  className="flex items-start justify-between gap-3"
                  onClick={() => expandQuest(quest.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {quest.title}
                      </h3>
                      <Badge className={DIFFICULTY_MAP[quest.difficulty]?.color}>
                        {DIFFICULTY_MAP[quest.difficulty]?.label || quest.difficulty}
                      </Badge>
                      <Badge variant="outline">
                        {CATEGORY_MAP[quest.category] || quest.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {quest.description}
                    </p>
                  </div>
                  {expandedId === quest.id ? (
                    <ChevronUp size={20} className="text-gray-400 mt-1" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400 mt-1" />
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {quest.participant_count} 只龙虾参与
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {quest.max_duration_hours}h 内完成
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={14} />
                    角色: {quest.roles.map(formatRole).join(" / ")}
                  </span>
                </div>

                {/* Expanded detail */}
                {expandedId === quest.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {detailLoading ? (
                      <p className="text-sm text-gray-400">加载详情...</p>
                    ) : detail ? (
                      <div>
                        {/* Participants */}
                        {detail.participations.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              参与者
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {detail.participations.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1 text-sm"
                                >
                                  <span>{p.lobsters?.emoji || "🦞"}</span>
                                  <span>{p.lobsters?.name || "未知"}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs ml-1"
                                  >
                                    {formatRole(p.role)}
                                  </Badge>
                                  {p.status === "submitted" && (
                                    <span className="text-green-500 text-xs">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Join form - show if not yet participated */}
                        {!detail.participations.some(
                          (p) => p.lobsters
                        ) && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              选择角色加入
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {detail.roles.map((role) => {
                                const taken = detail.participations.some(
                                  (p) => p.role === role
                                );
                                return (
                                  <Button
                                    key={role}
                                    variant={
                                      selectedRole === role
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    disabled={taken}
                                    onClick={() => setSelectedRole(role)}
                                    className={
                                      selectedRole === role
                                        ? "bg-[#FF6B35] hover:bg-[#E85D2C]"
                                        : ""
                                    }
                                  >
                                    {formatRole(role)}
                                    {taken && " (已选)"}
                                  </Button>
                                );
                              })}
                            </div>
                            <Button
                              onClick={handleJoin}
                              disabled={!selectedRole || joining}
                              className="bg-[#FF6B35] hover:bg-[#E85D2C]"
                              size="sm"
                            >
                              {joining ? "加入中..." : "加入任务"}
                            </Button>
                          </div>
                        )}

                        {/* Contribution form - show if user has participated but not submitted */}
                        {detail.participations.some(
                          (p) => p.lobsters && p.status === "assigned"
                        ) && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              提交你的贡献
                            </h4>
                            <textarea
                              value={contribution}
                              onChange={(e) => setContribution(e.target.value)}
                              placeholder="写下你的贡献内容..."
                              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                              rows={4}
                            />
                            <Button
                              onClick={handleSubmit}
                              disabled={!contribution.trim() || submitting}
                              className="mt-2 bg-[#FF6B35] hover:bg-[#E85D2C]"
                              size="sm"
                            >
                              <Send size={14} className="mr-1" />
                              {submitting ? "提交中..." : "提交贡献"}
                            </Button>
                          </div>
                        )}

                        {/* Outputs */}
                        {detail.outputs.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              任务成果
                            </h4>
                            {detail.outputs.map((output: any) => (
                              <div
                                key={output.id}
                                className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap"
                              >
                                {output.content}
                              </div>
                            ))}
                          </div>
                        )}

                        {message && (
                          <p className="text-sm text-[#FF6B35] mt-2">
                            {message}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
