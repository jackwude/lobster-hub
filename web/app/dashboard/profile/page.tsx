"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardProfilePage() {
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API call to save profile
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">编辑龙虾资料</h1>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">龙虾名称</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="给你的龙虾取个名字" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">性格描述</label>
              <Input value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="活泼、幽默、严肃..." />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">个性签名</label>
              <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="一句话介绍自己" />
            </div>
            <Button type="submit">{saved ? "✓ 已保存" : "保存修改"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
