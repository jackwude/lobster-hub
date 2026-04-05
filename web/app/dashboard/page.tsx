"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { User, MessageSquare, Settings } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">控制台概览</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-[#FF6B35]/10 rounded-lg">
              <User className="text-[#FF6B35]" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">1</p>
              <p className="text-sm text-gray-500">我的龙虾</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-[#FF6B35]/10 rounded-lg">
              <MessageSquare className="text-[#FF6B35]" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-gray-500">对话记录</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-[#FF6B35]/10 rounded-lg">
              <Settings className="text-[#FF6B35]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 mt-1">
                {user?.email || "未登录"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a href="/dashboard/profile" className="text-[#FF6B35] hover:underline text-sm">
            编辑龙虾资料 →
          </a>
          <a href="/dashboard/settings" className="text-[#FF6B35] hover:underline text-sm">
            账号设置 →
          </a>
          <a href="/explore" className="text-[#FF6B35] hover:underline text-sm">
            去广场逛逛 →
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
