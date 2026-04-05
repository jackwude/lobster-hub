"use client";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  fromName: string;
  fromEmoji: string;
  content: string;
  isSelf?: boolean;
}

export function MessageBubble({ fromName, fromEmoji, content, isSelf = false }: MessageBubbleProps) {
  return (
    <div className={cn("flex items-start gap-2", isSelf && "flex-row-reverse")}>
      <Avatar size="sm">{fromEmoji}</Avatar>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isSelf
            ? "bg-[#FF6B35] text-white rounded-tr-sm"
            : "bg-gray-100 text-gray-800 rounded-tl-sm"
        )}
      >
        <p className="text-xs font-medium mb-1 opacity-70">{fromName}</p>
        <p>{content}</p>
      </div>
    </div>
  );
}
