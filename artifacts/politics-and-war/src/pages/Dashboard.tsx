import { useGetMyNation, useCollectTaxes, getGetMyNationQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, isPast } from "date-fns";
import { useEffect, useState } from "react";
import { Link } from "wouter";

const NAV_BG = "#1a237e";
const LINK_BLUE = "#1565c0";

const STAT_ROWS = (nation: any) => [
  { label: "Score", value: nation.score.toLocaleString() },
  { label: "Population", value: nation.population.toLocaleString() },
  { label: "Cities", value: nation.cityCount },
  { label: "GDP", value: "$" + nation.gdp.toLocaleString() },
  { label: "Leader", value: nation.leaderName },
  { label: "Government", value: nation.governmentType },
  { label: "Continent", value: nation.continent },
  { label: "War Policy", value: nation.warPolicy || "Standard" },
  { label: "Domestic Policy", value: nation.domesticPolicy || "Standard" },
  { label: "Alliance", value: nation.allianceName || "None" },
];

const RESOURCES = [
  { key: "money",     label: "Money",     emoji: "💵" },
  { key: "food",      label: "Food",      emoji: "🍖" },
  { key: "coal",      label: "Coal",      emoji: "⚫" },
  { key: "oil",       label: "Oil",       emoji: "🛢️" },
  { key: "iron",      label: "Iron",      emoji: "🔩" },
  { key: "bauxite",   label: "Bauxite",   emoji: "🪨" },
  { key: "lead",      label: "Lead",      emoji: "🟤" },
  { key: "uranium",   label: "Uranium",   emoji: "☢️" },
  { key: "gasoline",  label: "Gasoline",  emoji: "⛽" },
  { key: "steel",     label: "Steel",     emoji: "⚙️" },
  { key: "munitions", label: "Munitions", emoji: "💣" },
  { key: "aluminum",  label: "Aluminum",  emoji: "✈️" },
];

export default function Dashboard() {
  const { data: nation, isLoading } = useGetMyNation();
  const collectMut = useCollectTaxes();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: 20, color: "#757575" }}>Loading nation data…</div>
    );
  }
  if (!nation) return null;

  const taxDate = nation.taxCollectedAt ? new Date(nation.taxCollectedAt) : new Date(0);
  const nextTaxDate = new Date(taxDate.getTime() + 2 * 60 * 60 * 1000);
  const canCollect = isPast(nextTaxDate);

  const handleCollect = () => {
    collectMut.mutate(undefined, {
      onSuccess: (res: any) => {
        toast({ title: "Taxes Collected", description: `Collected $${res.moneyCollected.toLocaleString()}` });
        queryClient.invalidateQueries({ queryKey: getGetMyNationQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Cannot collect yet", description: err?.error, variant: "destructive" });
      }
    });
  };

  const r = nation.resources as any;

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* Nation header */}
      <div style={{
        backgroundColor: NAV_BG,
        color: "white",
        padding: "10px 12px",
        fontWeight: 600,
        fontSize: 15,
        marginBottom: 12,
        borderRadius: 2,
      }}>
        {nation.name}
        {nation.allianceName && (
          <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>[{nation.allianceName}]</span>
        )}
      </div>

      {/* Tax collect */}
      {canCollect && (
        <div style={{ marginBottom: 12, padding: "10px 12px", backgroundColor: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 3 }}>
          <div style={{ fontSize: 13, color: "#2e7d32", marginBottom: 6 }}>💰 Taxes are ready to collect!</div>
          <button
            onClick={handleCollect}
            disabled={collectMut.isPending}
            style={{
              padding: "7px 16px",
              backgroundColor: "#2e7d32",
              color: "white",
              border: "none",
              borderRadius: 3,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {collectMut.isPending ? "Collecting…" : "Collect Taxes"}
          </button>
        </div>
      )}
      {!canCollect && (
        <div style={{ marginBottom: 12, padding: "8px 12px", backgroundColor: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 3, fontSize: 13, color: "#757575" }}>
          💰 Next tax collection {formatDistanceToNow(nextTaxDate, { addSuffix: true })}
        </div>
      )}

      {/* Nation stats */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ backgroundColor: NAV_BG, color: "white", padding: "8px 12px", fontSize: 14, fontWeight: 600 }}>
          Nation Overview
        </div>
        {STAT_ROWS(nation).map((row, i) => (
          <div key={row.label} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderBottom: i < STAT_ROWS(nation).length - 1 ? "1px solid #f0f0f0" : "none",
            backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa",
            fontSize: 14,
          }}>
            <span style={{ color: "#555" }}>{row.label}</span>
            <span style={{ fontWeight: 600, color: "#212121" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Resources */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ backgroundColor: NAV_BG, color: "white", padding: "8px 12px", fontSize: 14, fontWeight: 600 }}>
          Resources
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {RESOURCES.map((res, i) => (
            <div key={res.key} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              borderBottom: "1px solid #f0f0f0",
              borderRight: i % 2 === 0 ? "1px solid #f0f0f0" : "none",
              fontSize: 13,
              backgroundColor: Math.floor(i / 2) % 2 === 0 ? "#fff" : "#fafafa",
            }}>
              <span style={{ color: "#555" }}>{res.emoji} {res.label}</span>
              <span style={{ fontWeight: 600 }}>{(r[res.key] ?? 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ backgroundColor: NAV_BG, color: "white", padding: "8px 12px", fontSize: 14, fontWeight: 600 }}>
          Quick Actions
        </div>
        {[
          { href: "/cities",    label: "Manage Cities" },
          { href: "/military",  label: "Military" },
          { href: "/wars",      label: "Wars" },
          { href: "/market",    label: "Trade Market" },
          { href: "/alliances", label: "Alliances" },
          { href: "/leaderboard", label: "Leaderboards" },
          { href: "/map",       label: "World Map" },
          { href: "/diplomacy", label: "Diplomacy / Messages" },
        ].map((item, i, arr) => (
          <div key={item.href} style={{ borderBottom: i < arr.length - 1 ? "1px solid #e8e8e8" : "none" }}>
            <Link href={item.href} style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 12px",
              color: LINK_BLUE,
              fontSize: 14,
              textDecoration: "none",
            }}>
              <span style={{ fontSize: 10, marginRight: 8 }}>▶</span>
              {item.label}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
