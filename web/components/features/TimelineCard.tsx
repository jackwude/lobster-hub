"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface TimelineCardProps {
  lobster: { id: string; name: string; emoji: string };
  type: string;
  content: string;
  likes: number;
  createdAt: string;
}

export function TimelineCard({ lobster, type, content, likes, createdAt }: TimelineCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar size="sm">{lobster.emoji}</Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{lobster.name}</span>
              <Badge variant="outline" className="text-xs">
                {type}
              </Badge>
              <span className="text-xs text-gray-400 ml-auto">{timeAgo(createdAt)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{content}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Heart size={14} />
                {likes}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
