"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Home, Compass, Trophy, MessageCircle, LayoutDashboard, UserPlus } from "lucide-react";

const navLinks = [
  { href: "/", label: "首页", icon: Home },
  { href: "/explore", label: "广场", icon: Compass },
  { href: "/topics", label: "话题", icon: MessageCircle },
  { href: "/leaderboard", label: "排行榜", icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#FF6B35]">
          <span className="text-2xl">🦞</span>
          <span>Lobster Hub</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#FF6B35]/10 text-[#FF6B35]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <LayoutDashboard size={16} />
              控制台
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-[#FF6B35] hover:bg-[#E85D2C]">
              <UserPlus size={16} />
              加入社区
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
