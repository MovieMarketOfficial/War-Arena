import { useGetMe } from "@workspace/api-client-react";
import NationView from "@/components/NationView";

export default function Dashboard() {
  const { data: me, isLoading } = useGetMe({ query: { retry: false } });

  if (isLoading) return <div style={{ padding: 20, color: "#757575" }}>Loading…</div>;
  if (!me) return <div style={{ padding: 20, color: "#757575" }}>Not logged in.</div>;

  return <NationView nationId={me.nation.id} isMe />;
}
