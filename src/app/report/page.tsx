"use client";
import { useState, useEffect, useCallback } from "react";

const PIN = "10031303";
const GOLD = "#D4AF37";

const ALL_BRANCHES = [
  "สาขาชิดลม",
  "สาขาเซ็นทรัลเวิลด์หมู",
  "สาขานครปฐม",
  "สาขาเกตเวย์",
  "สาขาลาดพร้าวหมู",
  "สาขาลาดพร้าวไก่",
  "สาขาแจ้งวัฒนะ",
];

type Period = "daily" | "weekly" | "monthly";
type BranchData = { name: string; revenue: number };
type ReportData = { total: number; branches: BranchData[]; rangeStart: string; rangeEnd: string } | null;

function getTodayISO() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatThaiDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
}

function shiftDate(iso: string, period: Period, dir: 1 | -1): string {
  const d = new Date(iso);
  if (period === "daily") d.setDate(d.getDate() + dir);
  else if (period === "weekly") d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d.toISOString().split("T")[0];
}

function periodLabel(period: Period, rangeStart: string, rangeEnd: string) {
  if (period === "daily") return formatThaiDate(rangeStart);
  if (period === "weekly") return `${formatThaiDate(rangeStart)} – ${formatThaiDate(rangeEnd)}`;
  const d = new Date(rangeStart);
  return d.toLocaleDateString("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
}

export default function ReportPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [period, setPeriod] = useState<Period>("daily");
  const [date, setDate] = useState(getTodayISO());
  const [data, setData] = useState<ReportData>(null);
  const [loading, setLoading] = useState(false);

  const doLogin = (code: string) => {
    if (code === PIN) setAuthed(true);
    else { alert("PIN ไม่ถูกต้อง"); setPin(""); }
  };

  useEffect(() => { if (pin.length === 8) doLogin(pin); }, [pin]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?period=${period}&date=${date}`, {
        headers: { "X-Report-Pin": PIN },
      });
      const json = await res.json();
      setData(json);
    } finally { setLoading(false); }
  }, [period, date]);

  useEffect(() => { if (authed) fetchReport(); }, [authed, fetchReport]);

  // ─── Login ───────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 360, padding: "0 24px" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: GOLD, fontSize: 42, fontWeight: 900, letterSpacing: 8, fontStyle: "italic" }}>BBC</div>
            <div style={{ color: "#555", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginTop: 6 }}>Executive Report</div>
          </div>

          {/* PIN dots — 2 rows of 4 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", marginBottom: 40 }}>
            {[0, 1].map(row => (
              <div key={row} style={{ display: "flex", gap: 16 }}>
                {[0, 1, 2, 3].map(col => {
                  const idx = row * 4 + col;
                  const filled = pin.length > idx;
                  return (
                    <div key={col} style={{
                      width: 14, height: 14, borderRadius: "50%",
                      background: filled ? GOLD : "transparent",
                      border: `2px solid ${filled ? GOLD : "#333"}`,
                      transition: "all 0.15s",
                      boxShadow: filled ? `0 0 8px ${GOLD}66` : "none",
                    }} />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Numpad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n}
                onClick={() => setPin(p => p.length < 8 ? p + n : p)}
                style={{ height: 64, background: "#1a1a1a", border: "1px solid #222", borderRadius: 16, color: "#fff", fontSize: 22, fontWeight: 800, cursor: "pointer" }}
              >{n}</button>
            ))}
            <button onClick={() => setPin("")}
              style={{ height: 64, background: "transparent", border: "none", color: "#444", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>
              Clear
            </button>
            <button onClick={() => setPin(p => p.length < 8 ? p + "0" : p)}
              style={{ height: 64, background: "#1a1a1a", border: "1px solid #222", borderRadius: 16, color: "#fff", fontSize: 22, fontWeight: 800, cursor: "pointer" }}>
              0
            </button>
            <button onClick={() => doLogin(pin)}
              style={{ height: 64, background: GOLD, border: "none", borderRadius: 16, color: "#000", fontSize: 22, fontWeight: 900, cursor: "pointer" }}>
              →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Report ──────────────────────────────────────────────────────────
  const max = data?.branches[0]?.revenue || 1;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "sans-serif", color: "#fff", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: "32px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: GOLD, fontSize: 20, fontWeight: 900, letterSpacing: 4, fontStyle: "italic" }}>BBC</div>
          <div style={{ color: "#444", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>Executive Report</div>
        </div>
        <button onClick={() => setAuthed(false)}
          style={{ background: "transparent", border: "1px solid #222", borderRadius: 8, color: "#444", fontSize: 11, padding: "6px 12px", cursor: "pointer" }}>
          ออก
        </button>
      </div>

      {/* Period tabs */}
      <div style={{ display: "flex", gap: 8, padding: "24px 24px 0" }}>
        {(["daily","weekly","monthly"] as Period[]).map(p => (
          <button key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "8px 20px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: period === p ? GOLD : "#1a1a1a",
              color: period === p ? "#000" : "#555",
              border: period === p ? `1px solid ${GOLD}` : "1px solid #222",
              transition: "all 0.2s",
            }}>
            {p === "daily" ? "รายวัน" : p === "weekly" ? "รายสัปดาห์" : "รายเดือน"}
          </button>
        ))}
      </div>

      {/* Date navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "20px 24px 0" }}>
        <button onClick={() => setDate(d => shiftDate(d, period, -1))}
          style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 10, color: "#bbb", width: 40, height: 40, fontSize: 20, cursor: "pointer" }}>
          ‹
        </button>
        <div style={{ color: "#f0f0f0", fontSize: 15, fontWeight: 700, textAlign: "center", minWidth: 200 }}>
          {data ? periodLabel(period, data.rangeStart, data.rangeEnd) : "—"}
        </div>
        <button onClick={() => setDate(d => shiftDate(d, period, 1))}
          style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 10, color: "#bbb", width: 40, height: 40, fontSize: 20, cursor: "pointer" }}>
          ›
        </button>
      </div>

      {/* Total */}
      <div style={{ textAlign: "center", padding: "32px 24px 24px" }}>
        <div style={{ color: "#888", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>ยอดรวม</div>
        {loading ? (
          <div style={{ color: "#555", fontSize: 40, fontWeight: 900 }}>—</div>
        ) : (
          <div style={{ color: GOLD, fontSize: 44, fontWeight: 900, letterSpacing: -1, textShadow: `0 0 30px ${GOLD}66` }}>
            ฿{(data?.total || 0).toLocaleString()}
          </div>
        )}
      </div>

      {/* Branch breakdown */}
      <div style={{ padding: "0 24px" }}>
        <div style={{ color: "#666", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>แยกสาขา</div>
        {loading ? (
          <div style={{ color: "#666", textAlign: "center", padding: 32 }}>กำลังโหลด...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ALL_BRANCHES.map((name) => {
              const b = data?.branches.find(x => x.name === name);
              const revenue = b?.revenue || 0;
              const missing = !b || revenue === 0;
              return (
                <div key={name} style={{ background: "#161616", borderRadius: 14, padding: "16px 18px", border: `1px solid ${missing ? "#3a1f1f" : "#2a2a2a"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ color: missing ? "#666" : "#ddd", fontSize: 13, fontWeight: 600 }}>{name}</div>
                    <div style={{ color: missing ? "#c0392b" : "#fff", fontSize: 15, fontWeight: 800 }}>
                      {missing ? "ยังไม่ส่ง" : `฿${revenue.toLocaleString()}`}
                    </div>
                  </div>
                  <div style={{ background: "#222", borderRadius: 99, height: 5, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      width: missing ? "0%" : `${(revenue / max) * 100}%`,
                      background: `linear-gradient(90deg, ${GOLD}88, ${GOLD})`,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                  {!missing && (
                    <div style={{ color: "#666", fontSize: 10, marginTop: 6, textAlign: "right" }}>
                      {((revenue / (data?.total || 1)) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
