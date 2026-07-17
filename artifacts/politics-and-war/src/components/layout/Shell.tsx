import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Bell, Flag, Building2, Menu } from "lucide-react";

const MENU_SECTIONS = [
  {
    title: "Account",
    items: [
      { href: "/dashboard", label: "Home" },
      { href: "/diplomacy", label: "Messages" },
      { href: "/diplomacy", label: "Notifications" },
      { href: "#", label: "Changelog" },
      { href: "#", label: "Tutorial" },
    ],
  },
  {
    title: "Nation",
    items: [
      { href: "/dashboard", label: "View" },
      { href: "/cities", label: "Cities" },
      { href: "/military", label: "Military" },
      { href: "/wars", label: "Wars" },
      { href: "/alliances", label: "Alliance" },
      { href: "/market", label: "Trade" },
    ],
  },
  {
    title: "World",
    items: [
      { href: "/nations", label: "Nations" },
      { href: "/alliances", label: "Alliances" },
      { href: "/leaderboard", label: "Leaderboards" },
      { href: "/map", label: "World Map" },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "#", label: "Forum" },
      { href: "#", label: "Discord" },
      { href: "#", label: "Helpful Tools" },
      { href: "#", label: "Wiki" },
      { href: "#", label: "Reddit" },
    ],
  },
];

const RESOURCES_ROW1 = [
  { key: "coal",      emoji: "⚫" },
  { key: "iron",      emoji: "🔩" },
  { key: "bauxite",   emoji: "🪨" },
  { key: "oil",       emoji: "🛢️" },
  { key: "lead",      emoji: "🟤" },
  { key: "uranium",   emoji: "☢️" },
];
const RESOURCES_ROW2 = [
  { key: "gasoline",  emoji: "⛽" },
  { key: "steel",     emoji: "⚙️" },
  { key: "munitions", emoji: "💣" },
  { key: "aluminum",  emoji: "✈️" },
  { key: "food",      emoji: "🍖" },
  { key: "money",     emoji: "💵" },
];

const NAV_BG = "#1a237e";
const LINK_BLUE = "#1565c0";
const ACTIVE_YELLOW = "#fdd835";

export function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: auth, isLoading, isError } = useGetMe({ query: { retry: false } });
  const logoutMut = useLogout();
  const [panel, setPanel] = useState<null | "menu" | "resources">(null);

  useEffect(() => {
    if (isError) setLocation("/");
  }, [isError, setLocation]);

  // Close panel on location change
  useEffect(() => {
    setPanel(null);
  }, [location]);

  if (isLoading) {
    return (
      <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <div style={{ textAlign: "center", color: NAV_BG }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏛️</div>
          <div style={{ fontWeight: 600 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!auth) return null;

  const handleLogout = () => {
    logoutMut.mutate(undefined, {
      onSuccess: () => { setPanel(null); setLocation("/"); }
    });
  };

  const r = auth.nation.resources as any;

  const NavTab = ({
    icon,
    label,
    isActive,
    onClick,
    href,
  }: {
    icon: ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    href?: string;
  }) => {
    const style: React.CSSProperties = {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px 4px 6px",
      cursor: "pointer",
      background: "none",
      border: "none",
      color: isActive ? ACTIVE_YELLOW : "white",
      fontSize: 11,
      fontWeight: 500,
      gap: 3,
      textDecoration: "none",
      minHeight: 56,
    };
    const content = (
      <>
        <span style={{ color: isActive ? ACTIVE_YELLOW : "white", display: "flex" }}>{icon}</span>
        <span style={{ color: isActive ? ACTIVE_YELLOW : "white" }}>{label}</span>
      </>
    );
    if (href) {
      return <Link href={href} style={style} onClick={onClick}>{content}</Link>;
    }
    return <button style={style} onClick={onClick}>{content}</button>;
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", fontFamily: "'Outfit', sans-serif" }}>
      {/* ── TOP NAV ── */}
      <nav style={{ backgroundColor: NAV_BG, display: "flex", flexShrink: 0, userSelect: "none" }}>
        <NavTab
          icon={<Bell size={22} />}
          label="Notifications"
          href="/diplomacy"
          onClick={() => setPanel(null)}
        />
        <NavTab
          icon={<Flag size={22} />}
          label="Nation"
          href="/dashboard"
          onClick={() => setPanel(null)}
        />
        <NavTab
          icon={<Building2 size={22} />}
          label="Resources"
          isActive={panel === "resources"}
          onClick={() => setPanel(p => p === "resources" ? null : "resources")}
        />
        <NavTab
          icon={<Menu size={22} />}
          label="Menu"
          isActive={panel === "menu"}
          onClick={() => setPanel(p => p === "menu" ? null : "menu")}
        />
      </nav>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", backgroundColor: "#fff" }}>

        {/* Page content */}
        <div
          style={{
            height: "100%",
            overflowY: "auto",
            display: panel ? "none" : "block",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 12px 24px" }}>
            {children}
          </div>
        </div>

        {/* Resources panel */}
        {panel === "resources" && (
          <div style={{ height: "100%", overflowY: "auto", backgroundColor: "#fff" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #e0e0e0" }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{auth.nation.name}</div>
              <div style={{ color: "#757575", fontSize: 13 }}>Leader: {auth.nation.leaderName} · {auth.nation.governmentType}</div>
            </div>

            <div style={{ padding: "16px" }}>
              <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Resources</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                {[...RESOURCES_ROW1, ...RESOURCES_ROW2].map(res => (
                  <div key={res.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0f0f0", paddingBottom: 6 }}>
                    <span style={{ color: "#555", fontSize: 14 }}>{res.emoji} {res.key.charAt(0).toUpperCase() + res.key.slice(1)}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{(r[res.key] ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "16px", borderTop: "1px solid #e0e0e0" }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Nation Summary</div>
              {[
                { label: "Score", value: auth.nation.score.toLocaleString() },
                { label: "Cities", value: auth.nation.cityCount },
                { label: "Population", value: auth.nation.population.toLocaleString() },
                { label: "GDP", value: "$" + auth.nation.gdp.toLocaleString() },
                { label: "Continent", value: auth.nation.continent },
                { label: "Alliance", value: auth.nation.allianceName || "None" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0f0f0", fontSize: 14 }}>
                  <span style={{ color: "#757575" }}>{item.label}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu panel */}
        {panel === "menu" && (
          <div style={{ height: "100%", overflowY: "auto", backgroundColor: "#fff" }}>
            {/* Server info */}
            <div style={{ padding: "12px 16px", backgroundColor: "#f9f9f9", borderBottom: "1px solid #e0e0e0" }}>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                <div><strong>Server Time</strong></div>
                <div>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                <div style={{ marginTop: 4 }}><strong>Players Online Now</strong></div>
                <div>—</div>
              </div>
            </div>

            {MENU_SECTIONS.map(section => (
              <div key={section.title}>
                <div style={{
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "14px 16px 8px",
                  color: "#212121",
                }}>
                  {section.title}
                </div>
                {section.items.map(item => (
                  <div key={item.label} style={{ borderBottom: "1px solid #e8e8e8" }}>
                    <Link
                      href={item.href}
                      onClick={() => setPanel(null)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "10px 16px",
                        color: LINK_BLUE,
                        fontSize: 15,
                        textDecoration: "none",
                        width: "100%",
                      }}
                    >
                      <span style={{ fontSize: 10, marginRight: 8, color: LINK_BLUE }}>▶</span>
                      {item.label}
                    </Link>
                  </div>
                ))}
              </div>
            ))}

            {/* Logout */}
            <div style={{ borderBottom: "1px solid #e8e8e8" }}>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  color: LINK_BLUE,
                  fontSize: 15,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: 10, marginRight: 8 }}>▶</span>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM RESOURCE BAR ── */}
      <div style={{
        backgroundColor: NAV_BG,
        padding: "4px 8px 5px",
        flexShrink: 0,
        fontSize: 11,
        color: "white",
        lineHeight: 1.6,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1px 10px" }}>
          {RESOURCES_ROW1.map(res => (
            <span key={res.key}>{res.emoji}&nbsp;{(r[res.key] ?? 0).toLocaleString()}</span>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1px 10px" }}>
          {RESOURCES_ROW2.map(res => (
            <span key={res.key}>{res.emoji}&nbsp;{(r[res.key] ?? 0).toLocaleString()}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
