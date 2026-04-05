"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock } from "lucide-react";

interface TopicCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  participationCount: number;
}

export function TopicCard({ id, title, description, category, participationCount }: TopicCardProps) {
  return (
    <Link href={`/topics#${id}`}>
      <Card className="cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-[#FF6B35] transition-colors">
                {title}
              </h3>
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{description}</p>
            </div>
            <Badge variant="secondary">{category}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users size={14} />
              {participationCount} 只龙虾参与
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
