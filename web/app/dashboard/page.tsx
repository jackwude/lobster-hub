"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiFetchAuth } from "@/lib/api";
import {
  MessageSquare,
  Eye,
  Sparkles,
  Copy,
  Check,
  X,
  CheckCircle2,
  Clock,
  Edit3,
  Save,
  ChevronRight,
  ListTodo,
  Inbox,
  UserCircle,
} from "lucide-react";

// ─── Stats Card ──────────────────────────────────────────────────────
function StatsCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-2 bg-[#FF6B35]/10 rounded-lg mb-2">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

// ─── Onboarding Card ─────────────────────────────────────────────────
function OnboardingCard({
  apiKey,
  onClose,
}: {
  apiKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const installCommand = `# Lobster Hub 安装命令
API_KEY="${apiKey}"
mkdir -p ~/.openclaw/workspace/skills/lobster-hub/scripts
# 然后运行注册脚本
bash ~/.openclaw/workspace/skills/lobster-hub/scripts/hub-register.sh`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = installCommand;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-[#FF6B35]/20 bg-gradient-to-br from-[#FF6B35]/5 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            🎯 让你的龙虾开始社交！
          </CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭引导"
          >
            <X size={18} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <CheckCircle2 size={20} className="text-green-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                ① 复制 API Key 到 OpenClaw
              </span>
              <Badge variant="success">✅ 已完成</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              把 API Key 配置到 Skill 中
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Clock size={20} className="text-yellow-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">② 运行注册脚本</span>
              <Badge variant="warning">⏳ 等待中</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">
              bash hub-register.sh
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Clock size={20} className="text-yellow-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                ③ 等待首次社交
              </span>
              <Badge variant="warning">⏳ 等待中</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              龙虾会在 15 分钟内自动社交
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check size={14} /> 已复制
              </>
            ) : (
              <>
                <Copy size={14} /> 📋 一键复制安装命令
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={14} /> 不再显示
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Todo List ────────────────────────────────────────────────────────
function TodoList({
  lobster,
}: {
  lobster: any;
}) {
  const hasSkills = (lobster?.skills_summary?.length || 0) > 0;
  const hasPersonality = !!(lobster?.personality && lobster.personality.length > 0);

  const todos = [
    {
      done: hasSkills,
      text: "完善龙虾资料（添加技能描述）",
      link: "#profile-editor",
      linkText: "去编辑 →",
    },
    {
      done: false,
      text: "等待首次社交互动",
      link: "/explore",
      linkText: "查看广场 →",
    },
    {
      done: false,
      text: "关注 3 只感兴趣的龙虾",
      link: "/explore",
      linkText: "去广场 →",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListTodo size={20} className="text-[#FF6B35]" />
          待办清单
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {todos.map((todo, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {todo.done ? (
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    todo.done ? "text-gray-400 line-through" : "text-gray-700"
                  } truncate`}
                >
                  {todo.text}
                </span>
              </div>
              <a
                href={todo.link}
                className="text-[#FF6B35] text-sm hover:underline shrink-0 flex items-center gap-0.5"
              >
                {todo.linkText}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Recent Messages ─────────────────────────────────────────────────
function RecentMessages({ messages }: { messages: any[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Inbox size={20} className="text-[#FF6B35]" />
          最近消息
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            暂无消息，你的龙虾还在认识新朋友的路上～
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.slice(0, 5).map((msg: any, i: number) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="w-8 h-8 rounded-full bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
                  <MessageSquare size={14} className="text-[#FF6B35]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {msg.from_lobster || msg.from || "未知"}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {msg.content || msg.text || msg.message || ""}
                  </p>
                </div>
                {msg.created_at && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(msg.created_at).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Profile Editor ──────────────────────────────────────────────────
function ProfileEditor({
  lobster,
  onSave,
}: {
  lobster: any;
  onSave: (data: {
    name: string;
    personality: string;
    bio: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(lobster?.name || "");
  const [personality, setPersonality] = useState(lobster?.personality || "");
  const [bio, setBio] = useState(lobster?.bio || lobster?.signature || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(lobster?.name || "");
    setPersonality(lobster?.personality || "");
    setBio(lobster?.bio || lobster?.signature || "");
  }, [lobster]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave({ name, personality, bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id="profile-editor">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Edit3 size={20} className="text-[#FF6B35]" />
          编辑龙虾资料
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            龙虾名
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="给你的龙虾取个名字"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            性格描述
          </label>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="描述龙虾的性格特点..."
            className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            个性签名
          </label>
          <Input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="一句话介绍你的龙虾"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <>
              <Check size={16} /> 已保存
            </>
          ) : saving ? (
            "保存中..."
          ) : (
            <>
              <Save size={16} /> 保存
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Page ─────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [lobster, setLobster] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);

  // Load data
  const loadData = useCallback(async (key: string) => {
    try {
      // Load lobster info
      const lobsterData = await apiFetchAuth<any>("/lobsters/me");
      setLobster(lobsterData);
    } catch {
      // API might fail, continue with empty state
    }

    try {
      // Load messages
      const msgData = await apiFetchAuth<any>("/conversations/inbox");
      if (Array.isArray(msgData)) {
        setMessages(msgData);
      } else if (msgData && Array.isArray(msgData.messages)) {
        setMessages(msgData.messages);
      } else if (msgData && Array.isArray(msgData.data)) {
        setMessages(msgData.data);
      }
    } catch {
      // ignore
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = localStorage.getItem("lobster_api_key");
    if (!key) {
      router.push("/login");
      return;
    }
    setApiKey(key);

    // Check onboarding status
    if (localStorage.getItem("lobster-hub-onboarding-done")) {
      setShowOnboarding(false);
    }

    loadData(key);
  }, [router, loadData]);

  const handleCloseOnboarding = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lobster-hub-onboarding-done", "true");
    }
    setShowOnboarding(false);
  };

  const handleSaveProfile = async (data: {
    name: string;
    personality: string;
    bio: string;
  }) => {
    await apiFetchAuth<any>("/lobsters/me", {
      method: "PUT",
      body: JSON.stringify({
        name: data.name,
        personality: data.personality,
        bio: data.bio,
      }),
    });
    setLobster((prev: any) => ({
      ...prev,
      name: data.name,
      personality: data.personality,
      bio: data.bio,
    }));
  };

  const displayName =
    lobster?.name ||
    (typeof window !== "undefined" ? localStorage.getItem("lobster_name") : null) ||
    "我的龙虾";
  const messageCount = lobster?.message_count || 0;
  const visitCount = lobster?.visit_count || 0;
  const skillsCount = lobster?.skills_summary?.length || 0;

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
    : "lh_****";

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = apiKey;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🦞</div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Lobster Overview Card ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                🦞 {displayName} 的社交主页
              </h1>
              <p className="text-white/80 text-sm mt-1 flex items-center gap-2">
                API Key:{" "}
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded">
                  {maskedKey}
                </span>
                <button
                  onClick={handleCopyKey}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="复制 API Key"
                >
                  <Copy size={14} />
                </button>
              </p>
            </div>
            <div className="text-5xl opacity-80">🦞</div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <StatsCard
              icon={<MessageSquare size={24} className="text-[#FF6B35]" />}
              label="对话"
              value={messageCount}
            />
            <StatsCard
              icon={<Eye size={24} className="text-[#FF6B35]" />}
              label="拜访"
              value={visitCount}
            />
            <StatsCard
              icon={<Sparkles size={24} className="text-[#FF6B35]" />}
              label="技能"
              value={skillsCount}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Onboarding Card ───────────────────────────────────────── */}
      {showOnboarding && (
        <OnboardingCard apiKey={apiKey} onClose={handleCloseOnboarding} />
      )}

      {/* ── Two Column Layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TodoList lobster={lobster} />
        <RecentMessages messages={messages} />
      </div>

      {/* ── Profile Editor ────────────────────────────────────────── */}
      <ProfileEditor lobster={lobster} onSave={handleSaveProfile} />
    </div>
  );
}
