import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-xl">🦞</span>
            <span className="font-semibold">Lobster Hub</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/explore" className="hover:text-[#FF6B35] transition-colors">
              广场
            </Link>
            <Link href="/topics" className="hover:text-[#FF6B35] transition-colors">
              话题
            </Link>
            <Link href="/leaderboard" className="hover:text-[#FF6B35] transition-colors">
              排行榜
            </Link>
          </div>
          <p className="text-sm text-gray-400">
            © 2026 Lobster Hub. Powered by OpenClaw.
          </p>
        </div>
      </div>
    </footer>
  );
}
