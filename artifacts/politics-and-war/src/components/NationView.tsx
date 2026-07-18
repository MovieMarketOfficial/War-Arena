import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useGetNation, useGetCities, useGetMilitary, useGetMe } from "@workspace/api-client-react";
import { useNationRank } from "@/hooks/use-nation-rank";
import { DeclareWarDialog } from "@/components/DeclareWarDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from "recharts";
import { Banknote, TrendingUp, Home, Shield, Globe, Building2, Factory, Info, ChevronDown, ChevronUp, Crosshair, Map as MapIcon } from "lucide-react";
import "./NationView.css";

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
    <div onClick={onClick} className={`section-header ${onClick ? "" : "section-header-static"}`}>
      <div className="section-header-title">
        {icon}
        {title}
      </div>
      {onClick && <div className="section-header-chevron">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>}
    </div>
  );
}

function StatRow({ label, value, info, isAlt, icon }: { label: string; value: React.ReactNode; info?: boolean; isAlt?: boolean; icon?: string }) {
  return (
    <div className={`stat-row ${isAlt ? "stat-row-alt" : ""}`}>
      <div className="stat-label">
        {icon && <span className="stat-label-icon">{icon}</span>}
        {label}
        {info && <Info size={14} className="stat-info" />}
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function MiniMap({ x, y, name }: { x: number; y: number; name: string }) {
  const markerX = Math.max(0, Math.min(100, ((x + 180) / 360) * 100));
  const markerY = Math.max(0, Math.min(100, ((-y + 90) / 180) * 100));
  return (
    <div className="map-container">
      <svg className="map-grid">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <circle cx={`${markerX}%`} cy={`${markerY}%`} r="6" fill="#c62828" stroke="white" strokeWidth="2" />
      </svg>
      <div className="map-marker" style={{ left: `${markerX}%`, top: `${markerY}%` }}>
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
      points.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), score: Math.round(value * 100) / 100 });
    }
    return points;
  }, [score]);

  return (
    <div className="score-chart">
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
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid #e0e0e0" }} formatter={(value: number) => [value.toLocaleString(), "Score"]} />
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

  if (isLoading) return <div className="loading-state">Loading nation…</div>;
  if (!nation) return <div className="not-found">Nation not found.</div>;

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
  const actionButtons = [
    { label: "✉️ Message", action: () => setMessageDialogOpen(true) },
    { label: "💲 Trade", href: "/market" },
    { label: "⚔️ War", action: () => setWarDialogOpen(true), danger: true },
    { label: "🚫 Embargo", href: "#" },
    { label: "🕵️ Spy", href: "#" },
    { label: "📖 Factbook", href: "#" },
  ];

  return (
    <div className="nation-view">
      <div className="nation-title-card">
        <div className="nation-name">{nation.name}</div>
        {nation.allianceName && (
          <div className="nation-alliance">
            <Link href={`/alliances/${nation.allianceId}`}>[{nation.allianceName}]</Link>
          </div>
        )}
        <div className="nation-meta">Leader: {nation.leaderName} · {nation.continent}</div>
        {nation.beigeUntil && new Date(nation.beigeUntil) > new Date() && (
          <div className="nation-beige">
            🛡️ Beige Mode — Protected until {new Date(nation.beigeUntil).toLocaleDateString()}
          </div>
        )}
      </div>

      {!isMe && (
        <div className="nation-section">
          <div className="action-grid">
            {actionButtons.map((btn) => {
              const className = `action-btn ${btn.danger ? "action-btn-danger" : ""}`;
              if (btn.action) return <button key={btn.label} onClick={btn.action} className={className}>{btn.label}</button>;
              return <Link key={btn.label} href={btn.href!} className={className}>{btn.label}</Link>;
            })}
          </div>
        </div>
      )}

      <div className="nation-section">
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

      <div className="nation-section">
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

      <div className="nation-section">
        <SectionHeader icon={<Shield size={18} />} title="Military" open={openSections.military} onClick={() => toggle("military")} />
        {openSections.military && (
          <div>
            <StatRow label="Nation Rank" value={rank ? `#${rank.rank.toLocaleString()} of ${rank.total.toLocaleString()} Nations (${rank.percentile}%)` : "—"} />
            <StatRow label="Nation Score" value={nation.score.toLocaleString(undefined, { minimumFractionDigits: 2 })} info isAlt />
            <StatRow label="War Policy" value={`${nation.warPolicy || "Attrition"} 🐢`} info />
            {MILITARY_UNITS.map((unit, i) => {
              const val = (military as any)?.[unit.key] ?? 0;
              return (
                <div key={unit.key} className={`military-unit ${i % 2 === 1 ? "military-unit-alt" : ""}`}>
                  <div className="military-unit-icon">{unit.img}</div>
                  <div className="military-unit-info">
                    <div className="military-unit-name">{unit.label}: {val.toLocaleString()}</div>
                    <div className="military-unit-sub">{unit.sub[0]}: 0 &nbsp; {unit.sub[1]}: 0</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="nation-section">
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

      <div className="nation-section">
        <SectionHeader icon={<Crosshair size={18} />} title="Bounties" open={openSections.bounties} onClick={() => toggle("bounties")} />
        {openSections.bounties && <div className="empty-text">There are no posted bounties on this nation.</div>}
      </div>

      <div className="nation-section">
        <SectionHeader icon={<MapIcon size={18} />} title="Map" open={openSections.map} onClick={() => toggle("map")} />
        {openSections.map && <MiniMap x={nation.mapX || 0} y={nation.mapY || 0} name={nation.name} />}
      </div>

      <div className="nation-section">
        <SectionHeader icon={<Building2 size={18} />} title={`${cities?.length ?? 0} Cities [M]`} open={openSections.cities} onClick={() => toggle("cities")} />
        {openSections.cities && (
          <div>
            {(cities ?? []).length === 0 ? (
              <div className="cities-empty">No cities found.</div>
            ) : (
              <>
                {visibleCities.map((city, i) => (
                  <div key={city.id} className={`city-row ${i % 2 === 1 ? "city-row-alt" : ""}`}>
                    <Link href={isMe ? "/cities" : "#"} className="city-name">{city.name}</Link>
                    <span className="city-stats">
                      {city.infrastructure.toLocaleString(undefined, { maximumFractionDigits: 2 })} Infra, {((city.infrastructure || 0) * 100).toLocaleString()} People
                    </span>
                  </div>
                ))}
                {(cities ?? []).length > 3 && (
                  <button onClick={() => setShowAllCities(s => !s)} className="show-more-btn">
                    {showAllCities ? "Show Less" : "Show More"}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="nation-section">
        <SectionHeader icon={<Globe size={18} />} title="Nation Activity" open={openSections.activity} onClick={() => toggle("activity")} />
        {openSections.activity && (
          <div className="activity-list">
            {activity.slice(0, 5).map((item, i) => (
              <div key={i} className="activity-row">
                <span className="activity-date">
                  ● {item.date.toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}
                </span>
                <span>{item.text}</span>
              </div>
            ))}
            {activity.length === 0 && <div className="cities-empty">No recent activity.</div>}
          </div>
        )}
      </div>

      <div className="nation-section">
        <SectionHeader icon={<TrendingUp size={18} />} title="Nation Score Over Time" open={openSections.score} onClick={() => toggle("score")} />
        {openSections.score && <ScoreChart score={nation.score} />}
      </div>

      {isMe && (
        <div className="nation-section">
          <SectionHeader icon={<Factory size={18} />} title="Resources" open={openSections.resources} onClick={() => toggle("resources")} />
          {openSections.resources && (
            <div className="resources-grid">
              {RESOURCES.map((res, i) => (
                <div key={res.key} className={`resource-cell ${i % 2 === 1 ? "resource-cell-alt" : ""}`}>
                  <span>{res.emoji} {res.label}</span>
                  <span className="resource-value">{(r[res.key] ?? 0).toLocaleString()}</span>
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
