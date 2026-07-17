import { useParams, Link } from "wouter";
import { useGetNation, useGetCities, useGetMilitary, useGetMe } from "@workspace/api-client-react";
import { useState } from "react";
import { DeclareWarDialog } from "@/components/DeclareWarDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";

const NAV_BG = "#1a237e";
const LINK_BLUE = "#1565c0";

export default function NationProfile() {
  const { id } = useParams();
  const nationId = parseInt(id || "0", 10);

  const { data: me } = useGetMe();
  const { data: nation, isLoading } = useGetNation(nationId, { query: { enabled: !!nationId } });
  const { data: cities } = useGetCities(nationId, { query: { enabled: !!nationId } });
  const { data: military } = useGetMilitary(nationId, { query: { enabled: !!nationId } });

  const [warDialogOpen, setWarDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  if (isLoading) return <div style={{ padding: 20, color: "#757575" }}>Loading…</div>;
  if (!nation) return <div style={{ padding: 20, color: "#757575" }}>Nation not found.</div>;

  const isMe = me?.nation.id === nation.id;

  const STAT_ROWS = [
    { label: "Score", value: nation.score.toLocaleString() },
    { label: "Population", value: nation.population.toLocaleString() },
    { label: "Cities", value: nation.cityCount },
    { label: "GDP", value: "$" + nation.gdp.toLocaleString() },
    { label: "Leader", value: nation.leaderName },
    { label: "Government", value: nation.governmentType },
    { label: "Continent", value: nation.continent },
    { label: "War Policy", value: nation.warPolicy || "Standard" },
    { label: "Domestic Policy", value: nation.domesticPolicy || "Standard" },
    { label: "Alliance", value: nation.allianceName ? nation.allianceName : "None" },
  ];

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Blue "View Nation" banner */}
      <div style={{ backgroundColor: NAV_BG, color: "white", padding: "10px 12px", fontWeight: 600, fontSize: 15, borderRadius: 2, marginBottom: 12 }}>
        View Nation
      </div>

      {/* Nation name card */}
      <div style={{
        border: "1px solid #e0e0e0",
        borderRadius: 3,
        marginBottom: 14,
        overflow: "hidden",
        background: "linear-gradient(135deg, #e8eaf6 0%, #fff 60%)",
        padding: "20px 12px",
        position: "relative",
      }}>
        <div style={{
          display: "inline-block",
          backgroundColor: "rgba(0,0,0,0.55)",
          color: "white",
          padding: "6px 14px",
          borderRadius: 3,
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 8,
        }}>
          {nation.name}
        </div>
        {nation.allianceName && (
          <div>
            <Link href={`/alliances/${nation.allianceId}`} style={{ color: LINK_BLUE, fontSize: 13 }}>
              [{nation.allianceName}]
            </Link>
          </div>
        )}
        {nation.beigeUntil && new Date(nation.beigeUntil) > new Date() && (
          <div style={{ marginTop: 8, padding: "4px 10px", backgroundColor: "#fff8e1", border: "1px solid #ffe082", borderRadius: 3, display: "inline-block", fontSize: 12, color: "#f57f17" }}>
            🛡️ Beige Mode — Protected until {new Date(nation.beigeUntil).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Action buttons grid — only shown for other nations */}
      {!isMe && (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {[
              { label: "✉️ Message",       action: () => setMessageDialogOpen(true) },
              { label: "💲 Trade Offer",   href: "/market" },
              { label: "⚔️ Declare War",   action: () => setWarDialogOpen(true), danger: true },
              { label: "🚫 Embargo",       href: "#" },
              { label: "🕵️ Espionage",    href: "#" },
              { label: "📖 Factbook",      href: "#" },
              { label: "📊 Trade Activity",href: "/market" },
              { label: "🏦 Bank Activity", href: "#" },
              { label: "🏆 War Activity",  href: `/nations/${nationId}` },
            ].map((btn, i, arr) => {
              const style: React.CSSProperties = {
                padding: "10px 4px",
                fontSize: 11,
                fontWeight: 500,
                textAlign: "center",
                cursor: "pointer",
                borderRight: (i + 1) % 3 !== 0 ? "1px solid #e0e0e0" : "none",
                borderBottom: i < arr.length - 3 ? "1px solid #e0e0e0" : "none",
                color: btn.danger ? "#c62828" : "#333",
                backgroundColor: "white",
                display: "block",
                textDecoration: "none",
                lineHeight: 1.4,
              };
              if (btn.action) {
                return (
                  <button key={btn.label} onClick={btn.action} style={{ ...style, border: "none", borderRight: (i + 1) % 3 !== 0 ? "1px solid #e0e0e0" : "none", borderBottom: i < arr.length - 3 ? "1px solid #e0e0e0" : "none" }}>
                    {btn.label}
                  </button>
                );
              }
              return (
                <Link key={btn.label} href={btn.href!} style={style}>
                  {btn.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {isMe && (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {[
              { label: "🏙️ Cities",      href: "/cities" },
              { label: "⚔️ Military",    href: "/military" },
              { label: "🌎 Wars",         href: "/wars" },
              { label: "🤝 Alliance",    href: "/alliances" },
              { label: "💰 Market",      href: "/market" },
              { label: "✉️ Messages",    href: "/diplomacy" },
            ].map((btn, i, arr) => (
              <Link key={btn.label} href={btn.href} style={{
                padding: "10px 4px",
                fontSize: 11,
                fontWeight: 500,
                textAlign: "center",
                color: "#333",
                textDecoration: "none",
                display: "block",
                borderRight: (i + 1) % 3 !== 0 ? "1px solid #e0e0e0" : "none",
                borderBottom: i < arr.length - 3 ? "1px solid #e0e0e0" : "none",
                backgroundColor: "white",
              }}>
                {btn.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ backgroundColor: NAV_BG, color: "white", padding: "8px 12px", fontSize: 14, fontWeight: 600 }}>
          National Statistics
        </div>
        {STAT_ROWS.map((row, i) => (
          <div key={row.label} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderBottom: i < STAT_ROWS.length - 1 ? "1px solid #f0f0f0" : "none",
            backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa",
            fontSize: 14,
          }}>
            <span style={{ color: "#555" }}>{row.label}</span>
            <span style={{ fontWeight: 600, color: "#212121" }}>{String(row.value)}</span>
          </div>
        ))}
      </div>

      {/* Military intel */}
      {military && (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ backgroundColor: NAV_BG, color: "white", padding: "8px 12px", fontSize: 14, fontWeight: 600 }}>
            Military
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {[
              { label: "🪖 Soldiers", val: military.soldiers },
              { label: "🛡️ Tanks",    val: military.tanks },
              { label: "✈️ Aircraft", val: military.aircraft },
              { label: "⚓ Ships",    val: military.ships },
              { label: "🚀 Missiles", val: military.missiles },
              { label: "☢️ Nukes",    val: military.nukes },
            ].map((u, i, arr) => (
              <div key={u.label} style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: i < arr.length - 2 ? "1px solid #f0f0f0" : "none",
                borderRight: i % 2 === 0 ? "1px solid #f0f0f0" : "none",
                fontSize: 13,
                backgroundColor: Math.floor(i / 2) % 2 === 0 ? "#fff" : "#fafafa",
              }}>
                <span style={{ color: "#555" }}>{u.label}</span>
                <span style={{ fontWeight: 600 }}>{u.val.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cities */}
      {cities && cities.length > 0 && (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ backgroundColor: NAV_BG, color: "white", padding: "8px 12px", fontSize: 14, fontWeight: 600 }}>
            Cities ({cities.length})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  {["City", "Infra", "Land", "Commerce", "Industry"].map(h => (
                    <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #e0e0e0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cities.map((city, i) => (
                  <tr key={city.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 600 }}>{city.name}</td>
                    <td style={{ padding: "7px 10px" }}>{city.infrastructure.toLocaleString()}</td>
                    <td style={{ padding: "7px 10px" }}>{city.land.toLocaleString()}</td>
                    <td style={{ padding: "7px 10px" }}>{city.commerce.toLocaleString()}</td>
                    <td style={{ padding: "7px 10px" }}>{city.industry.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DeclareWarDialog
        targetNationId={nation.id}
        targetNationName={nation.name}
        open={warDialogOpen}
        onOpenChange={setWarDialogOpen}
      />
      <SendMessageDialog
        targetNationId={nation.id}
        targetNationName={nation.name}
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
      />
    </div>
  );
}
