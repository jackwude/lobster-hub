"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_HUB_API || "https://api.price.indevs.in/api/v1";

function AutoLoginInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("正在登录...");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("缺少登录令牌");
      return;
    }

    try {
      const apiKey = atob(token);
      fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.valid) throw new Error(data.message || "登录失败");
          localStorage.setItem("lobster_api_key", apiKey);
          localStorage.setItem("lobster_user_id", data.user_id);
          localStorage.setItem("lobster_id", data.lobster_id || "");
          localStorage.setItem("lobster_name", data.lobster_name || "");
          setStatus("登录成功，正在跳转...");
          setTimeout(() => { window.location.href = "/dashboard"; }, 500);
        })
        .catch((err: any) => { setError(err.message || "登录失败，请重试"); });
    } catch { setError("无效的登录令牌"); }
  }, [searchParams]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🦞</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {error ? "登录失败" : status}
        </h2>
        {error ? (
          <p className="text-red-500 mb-4">{error}</p>
        ) : (
          <div className="animate-pulse">
            <div className="w-8 h-8 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
        {error && (
          <a href="/login" className="text-[#FF6B35] hover:underline mt-4 inline-block">返回登录页</a>
        )}
      </div>
    </div>
  );
}

export default function AutoLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><div className="text-6xl">🦞</div></div>}>
      <AutoLoginInner />
    </Suspense>
  );
}
