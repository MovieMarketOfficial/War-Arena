import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister, RegisterInputContinent, RegisterInputGovernmentType } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const NAV_BG = "#1a237e";
const LINK_BLUE = "#1565c0";

const CONTINENTS = Object.values(RegisterInputContinent);
const GOVS = Object.values(RegisterInputGovernmentType);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: 3,
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "'Outfit', sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#555",
  marginBottom: 4,
  fontWeight: 500,
};

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMut = useRegister();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    username: "",
    password: "",
    nationName: "",
    leaderName: "",
    continent: CONTINENTS[0],
    governmentType: GOVS[0],
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.username.length < 3) return toast({ title: "Username must be at least 3 characters", variant: "destructive" });
    if (form.password.length < 6) return toast({ title: "Password must be at least 6 characters", variant: "destructive" });
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nationName || !form.leaderName) return;
    registerMut.mutate({ data: form as any }, {
      onSuccess: () => setLocation("/dashboard"),
      onError: (err: any) => {
        toast({ title: "Registration Failed", description: err?.error || "An error occurred.", variant: "destructive" });
      }
    });
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", fontFamily: "'Outfit', sans-serif", backgroundColor: "#fff" }}>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "20px 16px 8px" }}>
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(24px, 5vw, 38px)",
          fontWeight: 700,
          color: "#1a237e",
        }}>
          <span>P</span>olitics{" "}
          <span style={{ color: "#c62828", fontStyle: "italic" }}>&amp;</span>{" "}
          <span>W</span>ar
        </div>
        <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>The Ultimate Political Strategy Game</div>
      </div>

      <nav style={{ backgroundColor: NAV_BG, display: "flex" }}>
        {["🔔 Notifications", "🏳️ Nation", "🏰 Resources", "☰ Menu"].map(tab => (
          <div key={tab} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 4px", color: "white", fontSize: 10, gap: 2 }}>
            <span style={{ fontSize: 18 }}>{tab.split(" ")[0]}</span>
            <span>{tab.split(" ").slice(1).join(" ")}</span>
          </div>
        ))}
      </nav>

      <div style={{ flex: 1, padding: "16px" }}>
        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: NAV_BG }}>Step {step} of 2</span>
            <span style={{ fontSize: 13, color: "#757575" }}>{step === 1 ? "Account Details" : "Nation Details"}</span>
          </div>
          <div style={{ height: 4, backgroundColor: "#e0e0e0", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: step === 1 ? "50%" : "100%", backgroundColor: NAV_BG, transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Step 1 — Account */}
        {step === 1 && (
          <form onSubmit={handleStep1}>
            <div style={{
              border: "1px solid #e0e0e0",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 16,
            }}>
              <div style={{ backgroundColor: NAV_BG, color: "white", padding: "10px 16px", fontWeight: 600, fontSize: 15 }}>
                Account Details
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Username</label>
                  <input style={inputStyle} type="text" value={form.username} onChange={e => set("username", e.target.value)} placeholder="e.g. commander_zero" required minLength={3} />
                </div>
                <div style={{ marginBottom: 4 }}>
                  <label style={labelStyle}>Password</label>
                  <input style={inputStyle} type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 characters" required minLength={6} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "11px",
                backgroundColor: NAV_BG,
                color: "white",
                border: "none",
                borderRadius: 3,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Continue →
            </button>
          </form>
        )}

        {/* Step 2 — Nation */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div style={{
              border: "1px solid #e0e0e0",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 16,
            }}>
              <div style={{ backgroundColor: NAV_BG, color: "white", padding: "10px 16px", fontWeight: 600, fontSize: 15 }}>
                Nation Details
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Nation Name</label>
                  <input style={inputStyle} type="text" value={form.nationName} onChange={e => set("nationName", e.target.value)} placeholder="e.g. United Territories" required />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Leader Name</label>
                  <input style={inputStyle} type="text" value={form.leaderName} onChange={e => set("leaderName", e.target.value)} placeholder="e.g. President Smith" required />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Continent</label>
                  <select style={inputStyle} value={form.continent} onChange={e => set("continent", e.target.value)}>
                    {CONTINENTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <label style={labelStyle}>Government Type</label>
                  <select style={inputStyle} value={form.governmentType} onChange={e => set("governmentType", e.target.value)}>
                    {GOVS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: "0 0 auto",
                  padding: "11px 20px",
                  backgroundColor: "#fff",
                  color: NAV_BG,
                  border: `1px solid ${NAV_BG}`,
                  borderRadius: 3,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={registerMut.isPending}
                style={{
                  flex: 1,
                  padding: "11px",
                  backgroundColor: NAV_BG,
                  color: "white",
                  border: "none",
                  borderRadius: 3,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {registerMut.isPending ? "Creating Nation…" : "Establish Nation"}
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <span style={{ fontSize: 14, color: "#555" }}>Already have an account? </span>
          <Link href="/" style={{ color: LINK_BLUE, fontSize: 14, fontWeight: 600 }}>Login here</Link>
        </div>
      </div>
    </div>
  );
}
