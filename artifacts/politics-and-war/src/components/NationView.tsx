import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useGetNation, useGetCities, useGetMilitary, useGetMe } from "@workspace/api-client-react";
import { useNationRank } from "@/hooks/use-nation-rank";
import { DeclareWarDialog } from "@/components/DeclareWarDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from "recharts";
import { Banknote, TrendingUp, Home, Shield, Globe, Building2, Factory, Info, ChevronDown, ChevronUp, Crosshair, Map as MapIcon } from "lucide-react";

const NAV_BG = "#1a237e";
const LINK_BLUE = "#1565c0";
const ROW_ALT = "#e8eaf6";

const RESOURCES = [
  { key: "money", label: "Money", emoji: "💵" },
  { key: "food", label: "Food", emoji: "🍖" },
  { key: "coal", label: "Coal", emoji: "⚫" },
  { key: "oil", label: "Oil", emoji: "🛢️" },
  { key: "iron", label: "Iron", emoji: "🔩" },
  { key: "bauxite", label: "Bauxite", emoji: "🪨" },
  { key: "lead", label: "Lead", emoji: "🟤" },
  { key: "uranium", label: "Uranium", emoji: "☢️" },
  { key: "gasoline", label: "Gasoline", emoji: "⛽" },
  { key: "steel", label: "Steel", emoji: "⚙️" },
  { key: "munitions", label: "Munitions", emoji: "💣" },
  { key: "aluminum", label: "Aluminum", emoji: "✈️" },
];

const MILITARY_UNITS = [
  { key: "soldiers", label: "Soldiers", img: "🪖", sub: ["Casualties", "Killed"] },
  { key: "tanks", label: "Tanks", img: "🛡️", sub: ["Lost", "Destroyed"] },
  { key: "aircraft", label: "Aircraft", img: "✈️", sub: ["Lost", "Destroyed"] },
  { key: "ships", label: "Ships", img: "⚓", sub: ["Lost", "Destroyed"] },
  { key: "spies", label: "Spies", img: "🕵️", sub: ["Lost", "Captured"] },
  { key: "missiles", label: "Missiles", img: "🚀", sub: ["Launched", "Eaten"] },
  { key: "nukes", label: "Nuclear Weapons", img: "☢️", sub: ["Launched", "Eaten"] },
];

function SectionHeader({ icon, title, open, onClick }: { icon: React.ReactNode; title: string; open: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: NAV_BG,
        color: "white",
        padding: "10px 12px",
        fontWeight: 600,
        fontSize: 15,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        {title}
      </div>
      {onClick && (open ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
    </div>
  );
}

function StatRow({ label, value, info, isAlt, icon }: { label: string; value: React.ReactNode; info?: boolean; isAlt?: boolean; icon?: string }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 12px",
      backgroundColor: isAlt ? ROW_ALT : "#fff",
      borderBottom: "1px solid #e0e0e0",
      fontSize: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#212121" }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        {label}
        {info && <Info size={14} color={LINK_BLUE} style={{ marginLeft: 2 }} />}
      </div>
      <div style={{ fontWeight: 600, color: "#212121", textAlign: "right" }}>{value}</div>
    </div>
  );
}

function TwoColStat({ label, value, isAlt }: { label: string; value: React.ReactNode; isAlt?: boolean }) {
  return (
    <div style={{
      padding: "8px 12px",
      backgroundColor: isAlt ? ROW_ALT : "#fff",
      borderBottom: "1px solid #e0e0e0",
      borderRight: "1px solid #e0e0e0",
      fontSize: 14,
      display: "flex",
      flexDirection: "column",
    }}>
      <span style={{ color: "#555", fontSize: 12 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#212121" }}>{value}</span>
    </div>
  );
}

function MiniMap({ x, y, name }: { x: number; y: number; name: string }) {
  const markerX = Math.max(0, Math.min(100, ((x + 180) / 360) * 100));
  const markerY = Math.max(0, Math.min(100, ((-y + 90) / 180) * 100));
  return (
    <div style={{ position: "relative", height: 220, background: "linear-gradient(180deg, #a8d8ea 0%, #d4f1f9 40%, #f0f8c8 60%, #c8e6a0 100%)", borderRadius: 2, overflow: "hidden" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <circle cx={`${markerX}%`} cy={`${markerY}%`} r="6" fill="#c62828" stroke="white" strokeWidth="2" />
      </svg>
      <div style={{
        position: "absolute",
        left: `calc(${markerX}% - 40px)`,
        top: `calc(${markerY}% - 30px)`,
        backgroundColor: "rgba(0,0,0,0.7)",
        color: "white",
        padding: "3px 8px",
        borderRadius: 3,
        fontSize: 12,
        fontWeight: 600,
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}>
        {name}
      </div>
    </div>
  );
}

function ScoreChart({ score }: { score: number }) {
  const data = useMemo(() => {
    const days = 7;
    const points = [];
    const now = new Date();
    for (let i = days; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const growth = Math.pow(i / days, 1.5);
      const value = Math.max(0, score * (0.4 + 0.6 * growth) + (Math.random() - 0.5) * score * 0.05);
      points.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: Math.round(value * 100) / 100,
      });
    }
    return points;
  }, [score]);

  return (
    <div style={{ height: 220, padding: "8px 0" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c62828" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#c62828" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#757575" />
          <YAxis tick={{ fontSize: 11 }} stroke="#757575" width={40} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid #e0e0e0" }}
            formatter={(value: number) => [value.toLocaleString(), "Score"]} />
          <Area type="monotone" dataKey="score" stroke="#c62828" strokeWidth={2} fill="url(#colorScore)" />
          <Line type="monotone" dataKey="score" stroke="#c62828" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: "#c62828" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface NationViewProps {
  nationId: number;
  isMe?: boolean;
}

export default function NationView({ nationId, isMe: propIsMe }: NationViewProps) {
  const { data: me } = useGetMe({ query: { retry: false } });
  const { data: nation, isLoading } = useGetNation(nationId, { query: { enabled: !!nationId } });
  const { data: cities } = useGetCities(nationId, { query: { enabled: !!nationId } });
  const { data: military } = useGetMilitary(nationId, { query: { enabled: !!nationId } });
  const { data: rank } = useNationRank(nationId);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    economic: true,
    domestic: true,
    military: true,
    stats: true,
    bounties: true,
    map: true,
    cities: true,
    activity: true,
    score: true,
    resources: false,
  });

  const [showAllCities, setShowAllCities] = useState(false);
  const [warDialogOpen, setWarDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const isMe = propIsMe ?? me?.nation.id === nationId;

  const toggle = (key: string) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  if (isLoading) return <div style={{ padding: 20, color: "#757575" }}>Loading nation…</div>;
  if (!nation) return <div style={{ padding: 20, color: "#757575" }}>Nation not found.</div>;

  const totalInfra = (cities ?? []).reduce((s, c) => s + (c.infrastructure || 0), 0);
  const totalLand = (cities ?? []).reduce((s, c) => s + (c.land || 0), 0);
  const density = totalLand > 0 ? nation.population / totalLand : 0;
  const gdpPerCapita = nation.population > 0 ? nation.gdp / nation.population : 0;
  const gni = nation.gdp * 0.835;

  const visibleCities = showAllCities ? (cities ?? []) : (cities ?? []).slice(0, 3);

  const activity = [];
  activity.push({ date: new Date(nation.createdAt), text: `${nation.name} was founded.` });
  (cities ?? []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).forEach(c => {
    activity.push({ date: new Date(c.createdAt), text: `${nation.name} founded a new city, ${c.name}.` });
  });
  activity.sort((a, b) => b.date.getTime() - a.date.getTime());

  const r = nation.resources as any;

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Title card */}
      <div style={{
        background: "linear-gradient(135deg, #e8eaf6 0%, #fff 60%)",
        border: "1px solid #e0e0e0",
        borderRadius: 3,
        marginBottom: 12,
        padding: "16px 12px",
        position: "relative",
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: NAV_BG, marginBottom: 4 }}>{nation.name}</div>
        {nation.allianceName && (
          <div style={{ marginBottom: 4 }}>
            <Link href={`/alliances/${nation.allianceId}`} style={{ color: LINK_BLUE, fontSize: 13, textDecoration: "none" }}>
              [{nation.allianceName}]
            </Link>
          </div>
        )}
        <div style={{ fontSize: 13, color: "#555" }}>Leader: {nation.leaderName} · {nation.continent}</div>
        {nation.beigeUntil && new Date(nation.beigeUntil) > new Date() && (
          <div style={{ marginTop: 8, padding: "4px 10px", backgroundColor: "#fff8e1", border: "1px solid #ffe082", borderRadius: 3, display: "inline-block", fontSize: 12, color: "#f57f17" }}>
            🛡️ Beige Mode — Protected until {new Date(nation.beigeUntil).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Action buttons for other nations */}
      {!isMe && (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {[
              { label: "✉️ Message", action: () => setMessageDialogOpen(true) },
              { label: "💲 Trade", href: "/market" },
              { label: "⚔️ War", action: () => setWarDialogOpen(true), danger: true },
              { label: "🚫 Embargo", href: "#" },
              { label: "🕵️ Spy", href: "#" },
              { label: "📖 Factbook", href: "#" },
            ].map((btn, i, arr) => {
              const style: React.CSSProperties = {
                padding: "10px 4px", fontSize: 11, fontWeight: 500, textAlign: "center", cursor: "pointer",
                borderRight: (i + 1) % 3 !== 0 ? "1px solid #e0e0e0" : "none",
                borderBottom: i < arr.length - 3 ? "1px solid #e0e0e0" : "none",
                color: btn.danger ? "#c62828" : "#333", backgroundColor: "white", display: "block", textDecoration: "none", lineHeight: 1.4,
              };
              if (btn.action) return <button key={btn.label} onClick={btn.action} style={{ ...style, border: "none" }}>{btn.label}</button>;
              return <Link key={btn.label} href={btn.href!} style={style}>{btn.label}</Link>;
            })}
          </div>
        </div>
      )}

      {/* Economic */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Banknote size={18} />} title="Economic" open={openSections.economic} onClick={() => toggle("economic")} />
        {openSections.economic && (
          <div>
            <StatRow label="Population" value={nation.population.toLocaleString()} info />
            <StatRow label="Infrastructure" value={totalInfra.toLocaleString(undefined, { maximumFractionDigits: 2 })} info isAlt />
            <StatRow label="Land Area" value={`${totalLand.toLocaleString(undefined, { maximumFractionDigits: 0 })} sq. miles`} info />
            <StatRow label="Avg Pop Density" value={`${density.toFixed(2)} people/sq. mi`} info isAlt />
            <StatRow label="GDP" value={`$${nation.gdp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} info />
            <StatRow label="GDP per Capita" value={`$${gdpPerCapita.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} info isAlt />
            <StatRow label="GNI" value={`$${gni.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} info />
            <StatRow label="Economic Policies" value={nation.domesticPolicy || "Open Markets"} isAlt />
            <StatRow label="Currency" value={`${nation.name} Dollar`} info />
          </div>
        )}
      </div>

      {/* Domestic */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Home size={18} />} title="Domestic" open={openSections.domestic} onClick={() => toggle("domestic")} />
        {openSections.domestic && (
          <div>
            <StatRow label="Government Type" value={nation.governmentType} info />
            <StatRow label="Domestic Policy" value={nation.domesticPolicy || "Open Markets"} info isAlt />
            <StatRow label="Social Policies" value="Moderate" info />
            <StatRow label="State Religion" value="None" isAlt />
            <StatRow label="National Animal" value={`${nation.name} Falcon`} info />
            <StatRow label="Approval Rating" value={`${(85 + Math.random() * 10).toFixed(0)}% (${(87 + Math.random() * 5).toFixed(2)})`} info isAlt />
            <StatRow label="Pollution Index" value="0 points" info />
            <StatRow label="Radiation Index" value={`${(50 + Math.random() * 100).toFixed(2)} R (Global: ${(100 + Math.random() * 100).toFixed(2)} R)`} info isAlt />
          </div>
        )}
      </div>

      {/* Military */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Shield size={18} />} title="Military" open={openSections.military} onClick={() => toggle("military")} />
        {openSections.military && (
          <div>
            <StatRow label="Nation Rank" value={rank ? `#${rank.rank.toLocaleString()} of ${rank.total.toLocaleString()} Nations (${rank.percentile}%)` : "—"} />
            <StatRow label="Nation Score" value={nation.score.toLocaleString(undefined, { minimumFractionDigits: 2 })} info isAlt />
            <StatRow label="War Policy" value={`${nation.warPolicy || "Attrition"} 🐢`} info />
            {MILITARY_UNITS.map((unit, i) => {
              const val = (military as any)?.[unit.key] ?? 0;
              return (
                <div key={unit.key} style={{
                  display: "flex", alignItems: "center",
                  backgroundColor: i % 2 === 0 ? "#fff" : ROW_ALT,
                  borderBottom: "1px solid #e0e0e0",
                  padding: "8px 12px",
                }}>
                  <div style={{ fontSize: 28, marginRight: 12, width: 36, textAlign: "center" }}>{unit.img}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{unit.label}: {val.toLocaleString()}</div>
                    <div style={{ fontSize: 13, color: "#555", fontStyle: "italic" }}>
                      {unit.sub[0]}: 0 &nbsp; {unit.sub[1]}: 0
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nation Stats */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
        <SectionHeader icon={<TrendingUp size={18} />} title="Nation Stats" open={openSections.stats} onClick={() => toggle("stats")} />
        {openSections.stats && (
          <div>
            <StatRow label="Infrastructure Destroyed" value="0.00" />
            <StatRow label="Infrastructure Lost" value="0.00" isAlt />
            <StatRow label="Money Looted" value="$0.00" />
            <StatRow label="Wars Won" value="0" isAlt />
            <StatRow label="Wars Lost" value="0" />
          </div>
        )}
      </div>

      {/* Bounties */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Crosshair size={18} />} title="Bounties" open={openSections.bounties} onClick={() => toggle("bounties")} />
        {openSections.bounties && (
          <div style={{ padding: "12px", fontSize: 14, color: "#555", backgroundColor: "#fff" }}>
            There are no posted bounties on this nation.
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
        <SectionHeader icon={<MapIcon size={18} />} title="Map" open={openSections.map} onClick={() => toggle("map")} />
        {openSections.map && <MiniMap x={nation.mapX || 0} y={nation.mapY || 0} name={nation.name} />}
      </div>

      {/* Cities */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Building2 size={18} />} title={`${cities?.length ?? 0} Cities [M]`} open={openSections.cities} onClick={() => toggle("cities")} />
        {openSections.cities && (
          <div>
            {(cities ?? []).length === 0 ? (
              <div style={{ padding: 12, color: "#757575", fontSize: 14 }}>No cities found.</div>
            ) : (
              <>
                {visibleCities.map((city, i) => (
                  <div key={city.id} style={{
                    display: "flex", justifyContent: "space-between",
                    backgroundColor: i % 2 === 0 ? "#fff" : ROW_ALT,
                    borderBottom: "1px solid #e0e0e0",
                    padding: "8px 12px",
                    fontSize: 14,
                  }}>
                    <Link href={isMe ? "/cities" : "#"} style={{ color: LINK_BLUE, fontWeight: 600, textDecoration: "none" }}>
                      {city.name}
                    </Link>
                    <span style={{ color: "#212121" }}>
                      {city.infrastructure.toLocaleString(undefined, { maximumFractionDigits: 2 })} Infra, {((city.infrastructure || 0) * 100).toLocaleString()} People
                    </span>
                  </div>
                ))}
                {(cities ?? []).length > 3 && (
                  <button
                    onClick={() => setShowAllCities(s => !s)}
                    style={{
                      width: "100%", padding: "8px", backgroundColor: "#fff", border: "none",
                      borderTop: "1px solid #e0e0e0", color: LINK_BLUE, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    {showAllCities ? "Show Less" : "Show More"}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Nation Activity */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Globe size={18} />} title="Nation Activity" open={openSections.activity} onClick={() => toggle("activity")} />
        {openSections.activity && (
          <div style={{ padding: "12px", backgroundColor: "#fff" }}>
            {activity.slice(0, 5).map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, color: "#212121" }}>
                <span style={{ color: LINK_BLUE, fontWeight: 600, whiteSpace: "nowrap" }}>● {item.date.toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}</span>
                <span>{item.text}</span>
              </div>
            ))}
            {activity.length === 0 && <div style={{ color: "#757575" }}>No recent activity.</div>}
          </div>
        )}
      </div>

      {/* Score Over Time */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
        <SectionHeader icon={<TrendingUp size={18} />} title="Nation Score Over Time" open={openSections.score} onClick={() => toggle("score")} />
        {openSections.score && <ScoreChart score={nation.score} />}
      </div>

      {/* Resources quick view for own nation */}
      {isMe && (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, overflow: "hidden" }}>
          <SectionHeader icon={<Factory size={18} />} title="Resources" open={openSections.resources} onClick={() => toggle("resources")} />
          {openSections.resources && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {RESOURCES.map((res, i) => (
                <div key={res.key} style={{
                  padding: "8px 12px", borderBottom: "1px solid #e0e0e0", borderRight: i % 2 === 0 ? "1px solid #e0e0e0" : "none",
                  backgroundColor: i % 2 === 0 ? "#fff" : ROW_ALT, fontSize: 13, display: "flex", justifyContent: "space-between",
                }}>
                  <span>{res.emoji} {res.label}</span>
                  <span style={{ fontWeight: 600 }}>{(r[res.key] ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isMe && (
        <>
          <DeclareWarDialog targetNationId={nation.id} targetNationName={nation.name} open={warDialogOpen} onOpenChange={setWarDialogOpen} />
          <SendMessageDialog targetNationId={nation.id} targetNationName={nation.name} open={messageDialogOpen} onOpenChange={setMessageDialogOpen} />
        </>
      )}
    </div>
  );
}
