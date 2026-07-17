import { useState } from "react";
import { Link } from "wouter";
import { useListNations } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";

const NAV_BG = "#1a237e";
const LINK_BLUE = "#1565c0";

export default function Nations() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useListNations({ page, limit, search: debouncedSearch || undefined });

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Blue header */}
      <div style={{ backgroundColor: NAV_BG, color: "white", padding: "10px 12px", fontWeight: 600, fontSize: 15, borderRadius: 2, marginBottom: 12 }}>
        Nations
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="🔍 Search nations..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
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

      {/* Table */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #e0e0e0" }}>Nation</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #e0e0e0" }}>Leader</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #e0e0e0" }}>Alliance</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#555", borderBottom: "1px solid #e0e0e0" }}>Score</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#555", borderBottom: "1px solid #e0e0e0" }}>Cities</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} style={{ padding: "8px 12px" }}>
                        <div style={{ height: 16, backgroundColor: "#f0f0f0", borderRadius: 2 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.nations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px 12px", textAlign: "center", color: "#757575", fontSize: 14 }}>
                    No nations found.
                  </td>
                </tr>
              ) : (
                data?.nations.map((nation, i) => (
                  <tr key={nation.id} style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "8px 12px" }}>
                      <Link href={`/nations/${nation.id}`} style={{ color: LINK_BLUE, fontWeight: 600, textDecoration: "none" }}>
                        🌐 {nation.name}
                      </Link>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#555" }}>{nation.leaderName}</td>
                    <td style={{ padding: "8px 12px" }}>
                      {nation.allianceName ? (
                        <Link href={`/alliances/${nation.allianceId}`} style={{ color: LINK_BLUE, fontSize: 13, textDecoration: "none" }}>
                          {nation.allianceName}
                        </Link>
                      ) : (
                        <span style={{ color: "#bbb", fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: NAV_BG }}>
                      {nation.score.toLocaleString()}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#555" }}>
                      {nation.cityCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > limit && (
          <div style={{ padding: "10px 12px", borderTop: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fafafa" }}>
            <span style={{ fontSize: 13, color: "#757575" }}>
              {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} of {data.total}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: "5px 12px", border: "1px solid #ccc", borderRadius: 3, backgroundColor: page === 1 ? "#f5f5f5" : "#fff", cursor: page === 1 ? "default" : "pointer", fontSize: 13, color: page === 1 ? "#bbb" : NAV_BG }}
              >
                ← Prev
              </button>
              <button
                disabled={page * limit >= data.total}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: "5px 12px", border: "1px solid #ccc", borderRadius: 3, backgroundColor: page * limit >= data.total ? "#f5f5f5" : "#fff", cursor: page * limit >= data.total ? "default" : "pointer", fontSize: 13, color: page * limit >= data.total ? "#bbb" : NAV_BG }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
