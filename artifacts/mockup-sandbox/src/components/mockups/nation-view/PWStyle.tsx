import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from "recharts";
import { Banknote, TrendingUp, Home, Shield, Globe, Building2, Factory, Crosshair, Map as MapIcon } from "lucide-react";

const NAV_BG = "#1a237e";
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{icon}{title}</div>
      {onClick && (open ? <span>▲</span> : <span>▼</span>)}
    </div>
  );
}

function StatRow({ label, value, isAlt }: { label: string; value: React.ReactNode; isAlt?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 12px", backgroundColor: isAlt ? ROW_ALT : "#fff",
      borderBottom: "1px solid #e0e0e0", fontSize: 14,
    }}>
      <span style={{ color: "#212121" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#212121", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function MiniMap() {
  return (
    <div style={{ position: "relative", height: 220, background: "linear-gradient(180deg, #a8d8ea 0%, #d4f1f9 40%, #f0f8c8 60%, #c8e6a0 100%)", borderRadius: 2, overflow: "hidden" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <circle cx="50%" cy="45%" r="6" fill="#c62828" stroke="white" strokeWidth="2" />
      </svg>
      <div style={{ position: "absolute", left: "calc(50% - 40px)", top: "calc(45% - 30px)", backgroundColor: "rgba(0,0,0,0.7)", color: "white", padding: "3px 8px", borderRadius: 3, fontSize: 12, fontWeight: 600, pointerEvents: "none" }}>Mahabharata</div>
    </div>
  );
}

function ScoreChart() {
  const data = useMemo(() => {
    const days = ["Jul 12", "Jul 13", "Jul 14", "Jul 15", "Jul 16", "Jul 17", "Jul 18"];
    return days.map((date, i) => ({ date, score: 240 + i * 40 + Math.random() * 20 }));
  }, []);

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
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid #e0e0e0" }} />
          <Area type="monotone" dataKey="score" stroke="#c62828" strokeWidth={2} fill="url(#colorScore)" />
          <Line type="monotone" dataKey="score" stroke="#c62828" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: "#c62828" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PWStyleNation() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    economic: true, domestic: true, military: true, stats: true, bounties: true, map: true, cities: true, activity: true, score: true, resources: false,
  });
  const toggle = (key: string) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  const cities = [
    { id: 1, name: "Indrprasat", infrastructure: 1010.00 },
    { id: 2, name: "Nirman", infrastructure: 1000.00 },
    { id: 3, name: "Utpad", infrastructure: 1000.00 },
    { id: 4, name: "Decca", infrastructure: 950.00 },
    { id: 5, name: "Rajmani", infrastructure: 920.00 },
    { id: 6, name: "Hastina", infrastructure: 900.00 },
  ];

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", maxWidth: 430, margin: "0 auto", backgroundColor: "#fff", minHeight: "100vh" }}>
      {/* Fake top nav */}
      <nav style={{ backgroundColor: NAV_BG, display: "flex", color: "white", fontSize: 11, padding: "8px 0" }}>
        {["Notifications", "Nation", "Resources", "Menu"].map(l => (
          <div key={l} style={{ flex: 1, textAlign: "center" }}>{l}</div>
        ))}
      </nav>

      {/* Title card */}
      <div style={{ background: "linear-gradient(135deg, #e8eaf6 0%, #fff 60%)", padding: "16px 12px", borderBottom: "1px solid #e0e0e0" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: NAV_BG }}>Mahabharata</div>
        <div style={{ fontSize: 13, color: "#555" }}>Leader: Topu · Asia</div>
      </div>

      {/* Economic */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Banknote size={18} />} title="Economic" open={openSections.economic} onClick={() => toggle("economic")} />
        {openSections.economic && (
          <div>
            <StatRow label="Population" value="638,935" />
            <StatRow label="Infrastructure" value="6,040.00" isAlt />
            <StatRow label="Land Area" value="6,000 sq. miles" />
            <StatRow label="Avg Pop Density" value="106.49 people/sq. mi" isAlt />
            <StatRow label="GDP" value="$1,091,909,201.00" />
            <StatRow label="GDP per Capita" value="$1,708.95" isAlt />
            <StatRow label="GNI" value="$911,596,625.00" />
            <StatRow label="Economic Policies" value="Far Left" isAlt />
            <StatRow label="Currency" value="Mudra" />
          </div>
        )}
      </div>

      {/* Domestic */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Home size={18} />} title="Domestic" open={openSections.domestic} onClick={() => toggle("domestic")} />
        {openSections.domestic && (
          <div>
            <StatRow label="Government Type" value="Democracy" />
            <StatRow label="Domestic Policy" value="Urbanization" isAlt />
            <StatRow label="Social Policies" value="Moderate" />
            <StatRow label="State Religion" value="None" isAlt />
            <StatRow label="National Animal" value="Topu" />
            <StatRow label="Approval Rating" value="88% (87.84)" isAlt />
            <StatRow label="Pollution Index" value="0 points" />
            <StatRow label="Radiation Index" value="86.83 R (Global: 142.90 R)" isAlt />
          </div>
        )}
      </div>

      {/* Military */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Shield size={18} />} title="Military" open={openSections.military} onClick={() => toggle("military")} />
        {openSections.military && (
          <div>
            <StatRow label="Nation Rank" value="#4,679 of 10,881 Nations (43.00%)" />
            <StatRow label="Nation Score" value="681.00" isAlt />
            <StatRow label="War Policy" value="Turtle 🐢" />
            {MILITARY_UNITS.map((unit, i) => (
              <div key={unit.key} style={{ display: "flex", alignItems: "center", backgroundColor: i % 2 === 0 ? "#fff" : ROW_ALT, borderBottom: "1px solid #e0e0e0", padding: "8px 12px" }}>
                <div style={{ fontSize: 28, marginRight: 12, width: 36, textAlign: "center" }}>{unit.img}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{unit.label}: 0</div>
                  <div style={{ fontSize: 13, color: "#555", fontStyle: "italic" }}>{unit.sub[0]}: 0 &nbsp; {unit.sub[1]}: 0</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nation Stats */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
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
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Crosshair size={18} />} title="Bounties" open={openSections.bounties} onClick={() => toggle("bounties")} />
        {openSections.bounties && <div style={{ padding: 12, fontSize: 14, color: "#555", backgroundColor: "#fff" }}>There are no posted bounties on this nation.</div>}
      </div>

      {/* Map */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
        <SectionHeader icon={<MapIcon size={18} />} title="Map" open={openSections.map} onClick={() => toggle("map")} />
        {openSections.map && <MiniMap />}
      </div>

      {/* Cities */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Building2 size={18} />} title="6 Cities [M]" open={openSections.cities} onClick={() => toggle("cities")} />
        {openSections.cities && (
          <div>
            {cities.map((city, i) => (
              <div key={city.id} style={{ display: "flex", justifyContent: "space-between", backgroundColor: i % 2 === 0 ? "#fff" : ROW_ALT, borderBottom: "1px solid #e0e0e0", padding: "8px 12px", fontSize: 14 }}>
                <span style={{ color: "#1565c0", fontWeight: 600 }}>{city.name}</span>
                <span>{city.infrastructure.toLocaleString()} Infra, {(city.infrastructure * 100).toLocaleString()} People</span>
              </div>
            ))}
            <button style={{ width: "100%", padding: "8px", backgroundColor: "#fff", border: "none", borderTop: "1px solid #e0e0e0", color: "#1565c0", fontSize: 13, cursor: "pointer" }}>Show More/Less</button>
          </div>
        )}
      </div>

      {/* Activity */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Globe size={18} />} title="Nation Activity" open={openSections.activity} onClick={() => toggle("activity")} />
        {openSections.activity && (
          <div style={{ padding: 12, backgroundColor: "#fff" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: "#1565c0", fontWeight: 600, whiteSpace: "nowrap" }}>● 07/18 01:10 am</span>
              <span>Mahabharata founded a new city, Decca.</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: "#1565c0", fontWeight: 600, whiteSpace: "nowrap" }}>● 07/17 08:34 pm</span>
              <span>CARRRRRRRRRRRRRRRL changed the alliance position of Mahabharata from applicant to Initiate.</span>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 14 }}>
              <span style={{ color: "#1565c0", fontWeight: 600, whiteSpace: "nowrap" }}>● 07/17 12:12 am</span>
              <span>Mahabharata founded a new city, rajmani.</span>
            </div>
          </div>
        )}
      </div>

      {/* Score */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
        <SectionHeader icon={<TrendingUp size={18} />} title="Nation Score Over Time" open={openSections.score} onClick={() => toggle("score")} />
        {openSections.score && <ScoreChart />}
      </div>

      {/* Resources */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, margin: 12, overflow: "hidden" }}>
        <SectionHeader icon={<Factory size={18} />} title="Resources" open={openSections.resources} onClick={() => toggle("resources")} />
        {openSections.resources && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {RESOURCES.map((res, i) => (
              <div key={res.key} style={{ padding: "8px 12px", borderBottom: "1px solid #e0e0e0", borderRight: i % 2 === 0 ? "1px solid #e0e0e0" : "none", backgroundColor: i % 2 === 0 ? "#fff" : ROW_ALT, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                <span>{res.emoji} {res.label}</span>
                <span style={{ fontWeight: 600 }}>0</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
