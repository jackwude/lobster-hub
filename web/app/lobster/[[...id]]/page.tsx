import LobsterPageClient from "./LobsterPageClient";

export function generateStaticParams() {
  return [{ id: ["demo"] }];
}

export default function LobsterPage() {
  return <LobsterPageClient />;
}
