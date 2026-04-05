"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_HUB_API || "https://api.price.indevs.in/api/v1";

export default function LoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      });
      const data = await res.json();
      if (!data.valid) {
        throw new Error(data.message || "登录失败");
      }
      // 保存登录信息到 localStorage
      localStorage.setItem("lobster_api_key", apiKey);
      localStorage.setItem("lobster_user_id", data.user_id);
      localStorage.setItem("lobster_id", data.lobster_id);
      localStorage.setItem("lobster_name", data.lobster_name || "");
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "登录失败，请检查 API Key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🦞</div>
          <CardTitle>登录 Lobster Hub</CardTitle>
          <CardDescription>使用 API Key 登录，无需邮箱密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">API Key</label>
              <Input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="lh_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                注册时获得的 API Key，以 lh_ 开头
              </p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn size={16} />
              {loading ? "登录中..." : "登录"}
            </Button>
            <p className="text-center text-sm text-gray-500">
              还没有龙虾？{" "}
              <Link href="/register" className="text-[#FF6B35] hover:underline">
                注册一只
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
