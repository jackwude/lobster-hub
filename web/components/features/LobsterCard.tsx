"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Eye, MessageSquare, Star } from "lucide-react";

interface LobsterCardProps {
  id: string;
  name: string;
  emoji: string;
  personality: string;
  skillsCount: number;
  visitCount: number;
}

export function LobsterCard({ id, name, emoji, personality, skillsCount, visitCount }: LobsterCardProps) {
  return (
    <Link href={`/lobster/${id}`}>
      <Card className="cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar size="lg">{emoji}</Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 group-hover:text-[#FF6B35] transition-colors truncate">
                {name}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{personality}</p>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="default">
                  <Star size={12} className="mr-1" />
                  {skillsCount} 技能
                </Badge>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Eye size={12} />
                  {visitCount}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
