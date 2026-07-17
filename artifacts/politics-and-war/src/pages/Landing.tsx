import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const NAV_BG = "#1a237e";
const LINK_BLUE = "#1565c0";

export default function Landing() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMut = useLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMut.mutate({ data: { username, password } }, {
      onSuccess: () => setLocation("/dashboard"),
      onError: (err: any) => {
        toast({
          title: "Login Failed",
          description: err?.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", fontFamily: "'Outfit', sans-serif", backgroundColor: "#fff" }}>

      {/* Header / Logo */}
      <div style={{ textAlign: "center", padding: "24px 16px 8px" }}>
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(28px, 6vw, 46px)",
          fontWeight: 700,
          color: "#1a237e",
          letterSpacing: "0.01em",
          lineHeight: 1.1,
        }}>
          <span style={{ color: "#1a237e" }}>P</span>olitics{" "}
          <span style={{ color: "#c62828", fontStyle: "italic" }}>&amp;</span>{" "}
          <span style={{ color: "#1a237e" }}>W</span>ar
        </div>
        <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>The Ultimate Political Strategy Game</div>
      </div>

      {/* Fake nav bar (mirrors logged-in look) */}
      <nav style={{ backgroundColor: NAV_BG, display: "flex", margin: "12px 0 0" }}>
        {[
          { emoji: "🔔", label: "Notifications" },
          { emoji: "🏳️", label: "Nation" },
          { emoji: "🏰", label: "Resources" },
          { emoji: "☰", label: "Menu" },
        ].map(tab => (
          <div key={tab.label} style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 4px 6px",
            color: "white",
            fontSize: 11,
            gap: 3,
          }}>
            <span style={{ fontSize: 20 }}>{tab.emoji}</span>
            <span>{tab.label}</span>
          </div>
        ))}
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, padding: "0 0 24px" }}>

        {/* Blue banner */}
        <div style={{
          backgroundColor: "#1a237e",
          color: "white",
          textAlign: "center",
          padding: "10px 16px",
          fontWeight: 600,
          fontSize: 15,
        }}>
          The Ultimate Political Strategy Game
        </div>

        {/* Intro text */}
        <div style={{ padding: "16px 16px 0" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#212121", marginBottom: 12, lineHeight: 1.3 }}>
            Create Your Own Country<br />The Way You Want
          </h1>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, marginBottom: 12 }}>
            Jump into the exciting world of Politics and War, the greatest online browser game where you get to create your very own country!
            Imagine naming your country's leader, designing your own flag, and picking your currency.
            You can even choose your national animal and set your country's policies for peace or war.
            Want to build a peaceful paradise or a mighty military empire? It's all up to you!
          </p>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, marginBottom: 20 }}>
            Manage your economy, control your army, and make all the big decisions. You can mine and
            trade resources with real players from around the world — there are no fake or bot players,
            just real people like you. And the best part? It's 100% free to play.
          </p>
        </div>

        {/* Login form */}
        <div style={{
          margin: "0 16px",
          border: "1px solid #e0e0e0",
          borderRadius: 4,
          overflow: "hidden",
        }}>
          <div style={{
            backgroundColor: "#1a237e",
            color: "white",
            padding: "10px 16px",
            fontWeight: 600,
            fontSize: 15,
          }}>
            Login
          </div>
          <form onSubmit={handleLogin} style={{ padding: "16px" }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, color: "#555", marginBottom: 4 }}>Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 3,
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "#555", marginBottom: 4 }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 3,
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loginMut.isPending}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#1a237e",
                color: "white",
                border: "none",
                borderRadius: 3,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {loginMut.isPending ? "Logging in…" : "Login"}
            </button>
          </form>
        </div>

        {/* Register link */}
        <div style={{ margin: "16px 16px 0", textAlign: "center" }}>
          <span style={{ fontSize: 14, color: "#555" }}>Don't have an account? </span>
          <Link href="/register" style={{ color: LINK_BLUE, fontSize: 14, fontWeight: 600 }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
