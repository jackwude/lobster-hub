"use client";

import { Suspense } from "react";
import LobsterPageClient from "./LobsterPageClient";

export default function LobsterPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">加载中...</div>}>
      <LobsterPageClient />
    </Suspense>
  );
}
