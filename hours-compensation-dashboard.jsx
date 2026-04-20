import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const WEEKS_PER_YEAR = 52;
const PTO_DAYS = 22;
const PTO_WEEKS = PTO_DAYS / 5;
const WORKING_WEEKS = WEEKS_PER_YEAR - PTO_WEEKS;

function calcStats(weeks) {
  const hrs = weeks.map(w => w.hours);
  const sorted = [...hrs].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const freq = {};
  sorted.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  let maxFreq = 0;
  let mode = sorted[0];
  Object.entries(freq).forEach(([val, count]) => {
    if (count > maxFreq) { maxFreq = count; mode = Number(val); }
  });
  return { mean: Math.round(mean * 10) / 10, median, mode, totalHours: sum };
}

const WEEK_TYPES = ["Normal", "Moderate", "Variable", "Sprint"];
const TYPE_COLORS = { Normal: "#818cf8", Moderate: "#fbbf24", Variable: "#a78bfa", Sprint: "#f87171" };

function buildHistogram(weeks) {
  const allBuckets = [];
  for (let b = 20; b <= 80; b += 5) {
    const label = `${b}-${b + 4}`;
    allBuckets.push({ range: label, Normal: 0, Moderate: 0, Variable: 0, Sprint: 0 });
  }
  weeks.forEach(w => {
    const b = Math.floor(w.hours / 5) * 5;
    const idx = (b - 20) / 5;
    if (idx >= 0 && idx < allBuckets.length) {
      allBuckets[idx][w.type] = (allBuckets[idx][w.type] || 0) + 1;
    }
  });
  return allBuckets;
}

const StatCard = ({ label, value, unit, color }) => (
  <div style={{
    background: "white", borderRadius: 12, padding: "16px 20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderLeft: `4px solid ${color}`,
    minWidth: 130, flex: 1
  }}>
    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: "#111827", marginTop: 4 }}>
      {value}<span style={{ fontSize: 13, fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>{unit}</span>
    </div>
  </div>
);


const SliderInput = ({ label, value, onChange, min, max, step = 1, unit = "", fmt }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</label>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>{fmt ? fmt(value) : `${value}${unit}`}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: "#4f46e5", height: 6 }} />
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af" }}>
      <span>{fmt ? fmt(min) : `${min}${unit}`}</span>
      <span>{fmt ? fmt(max) : `${max}${unit}`}</span>
    </div>
  </div>
);

export default function Dashboard() {
  const [normalHours, setNormalHours] = useState(30);
  const [sprintWeeks, setSprintWeeks] = useState(4);
  const [sprintHours, setSprintHours] = useState(60);
  const [moderateWeeks, setModerateWeeks] = useState(5);
  const [moderateHours, setModerateHours] = useState(45);
  const [variableWeeks, setVariableWeeks] = useState(4);
  const [variableMin, setVariableMin] = useState(35);
  const [variableMax, setVariableMax] = useState(55);
  const [seed, setSeed] = useState(1);
  const [perfFixed, setPerfFixed] = useState(false);

  const [ftSalary, setFtSalary] = useState(170000);
  const [ftBonus, setFtBonus] = useState(20000);
  const [baseEquity, setBaseEquity] = useState(0.50);
  const [perfEquity, setPerfEquity] = useState(1.40);
  const [vestingYears, setVestingYears] = useState(2);
  const [ftMidpoint, setFtMidpoint] = useState(50);

  const longWeeks = sprintWeeks + moderateWeeks + variableWeeks;
  const normalWeekCount = Math.max(0, WORKING_WEEKS - longWeeks);

  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < Math.round(normalWeekCount); i++) w.push({ type: "Normal", hours: normalHours });
    for (let i = 0; i < sprintWeeks; i++) w.push({ type: "Sprint", hours: sprintHours });
    for (let i = 0; i < moderateWeeks; i++) w.push({ type: "Moderate", hours: moderateHours });
    for (let i = 0; i < variableWeeks; i++) {
      const r = Math.sin(seed * (i + 1) * 9301 + 49297) * 0.5 + 0.5;
      w.push({ type: "Variable", hours: Math.round(variableMin + r * (variableMax - variableMin)) });
    }
    return w.sort((a, b) => a.hours - b.hours);
  }, [normalHours, normalWeekCount, sprintWeeks, sprintHours, moderateWeeks, moderateHours, variableWeeks, variableMin, variableMax, seed]);

  const stats = calcStats(weeks);
  const histogram = buildHistogram(weeks);

  const ftTotalAnnualHours = ftMidpoint * WORKING_WEEKS;
  const actualTotalHours = stats.totalHours;
  const hoursRatio = actualTotalHours / ftTotalAnnualHours;

  const proposedSalary = Math.round(ftSalary * hoursRatio);
  const proposedBonus = perfFixed ? ftBonus : Math.round(ftBonus * hoursRatio);
  const proposedBaseEquity = Math.round(baseEquity * hoursRatio * 1000) / 1000;
  const proposedPerfEquity = perfFixed ? perfEquity : Math.round(perfEquity * hoursRatio * 1000) / 1000;
  const totalProposedEquity = Math.round((proposedBaseEquity + proposedPerfEquity) * 1000) / 1000;
  const totalFtEquity = baseEquity + perfEquity;


  const fmtMoney = (v) => "$" + v.toLocaleString();
  const fmtPct = (v) => v.toFixed(3) + "%";
  const longWeeksPctOfYear = ((longWeeks / WORKING_WEEKS) * 100).toFixed(1);

  const reshuffle = useCallback(() => setSeed(s => s + 1), []);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#f8f9fc", minHeight: "100vh", padding: 20 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
            Head of Strategic Initiatives — Hours & Compensation Model
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Anadyr Horizon · Seed Stage · Negotiation Dashboard</p>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <StatCard label="Mean" value={stats.mean} unit="hrs/wk" color="#4f46e5" />
          <StatCard label="Median" value={stats.median} unit="hrs/wk" color="#059669" />
          <StatCard label="Mode" value={stats.mode} unit="hrs/wk" color="#d97706" />
          <StatCard label="Total Annual" value={stats.totalHours.toLocaleString()} unit="hrs" color="#dc2626" />
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Controls */}
          <div style={{ width: 280, flexShrink: 0 }}>
            <div style={{ background: "white", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 14px", borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                Hours Distribution
              </h3>
              <SliderInput label="Normal week" value={normalHours} onChange={setNormalHours} min={20} max={40} unit=" hrs" />
              <SliderInput label="Sprint weeks" value={sprintWeeks} onChange={setSprintWeeks} min={0} max={20} unit=" wks" />
              <SliderInput label="Sprint hours" value={sprintHours} onChange={setSprintHours} min={50} max={80} unit=" hrs" />
              <SliderInput label="Moderate weeks" value={moderateWeeks} onChange={setModerateWeeks} min={0} max={20} unit=" wks" />
              <SliderInput label="Moderate hours" value={moderateHours} onChange={setModerateHours} min={35} max={55} unit=" hrs" />
              <SliderInput label="Variable weeks" value={variableWeeks} onChange={setVariableWeeks} min={0} max={15} unit=" wks" />
              <SliderInput label="Variable min hrs" value={variableMin} onChange={setVariableMin} min={30} max={50} unit=" hrs" />
              <SliderInput label="Variable max hrs" value={variableMax} onChange={setVariableMax} min={40} max={80} unit=" hrs" />

              <div style={{ background: "#fef3c7", borderRadius: 6, padding: 10, marginBottom: 12, fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
                <strong>Breakdown:</strong> {Math.round(normalWeekCount)} normal + {sprintWeeks} sprint + {moderateWeeks} moderate + {variableWeeks} variable = {Math.round(normalWeekCount) + longWeeks} weeks
                <br /><strong>PTO:</strong> {PTO_DAYS} days ({PTO_WEEKS} wks) · <strong>Long weeks:</strong> {longWeeksPctOfYear}% of working year
              </div>

              <button onClick={reshuffle} style={{
                width: "100%", padding: "7px 0", background: "#f3f4f6", border: "1px solid #d1d5db",
                borderRadius: 6, fontSize: 11, cursor: "pointer", color: "#374151", fontWeight: 600
              }}>↻ Reshuffle Variable Weeks</button>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 14px", borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                Full-Time Baseline
              </h3>
              <SliderInput label="FT Salary" value={ftSalary} onChange={setFtSalary} min={100000} max={250000} step={5000} fmt={v => "$" + (v/1000) + "K"} />
              <SliderInput label="FT Cash Bonus" value={ftBonus} onChange={setFtBonus} min={0} max={50000} step={1000} fmt={v => "$" + (v/1000) + "K"} />
              <SliderInput label="Base Equity" value={baseEquity} onChange={setBaseEquity} min={0.1} max={2.0} step={0.05} unit="%" />
              <SliderInput label="Perf Equity" value={perfEquity} onChange={setPerfEquity} min={0} max={3.0} step={0.05} unit="%" />
              <SliderInput label="Vesting" value={vestingYears} onChange={setVestingYears} min={1} max={4} unit=" yrs" />
              <SliderInput label="FT Midpoint Hrs/Wk" value={ftMidpoint} onChange={setFtMidpoint} min={40} max={60} unit=" hrs" />
            </div>

          </div>

          {/* Charts & Comp */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>
                Weekly Hours Distribution ({Math.round(normalWeekCount) + longWeeks} working weeks)
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={histogram} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} label={{ value: "Weeks", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  {WEEK_TYPES.map(type => (
                    <Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[type]} radius={0} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#6b7280", justifyContent: "center" }}>
                {WEEK_TYPES.map(type => (
                  <span key={type}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: TYPE_COLORS[type], marginRight: 4, verticalAlign: -1 }} />{type}</span>
                ))}
              </div>
            </div>

            {/* Compensation Table — V2 format with 4 columns */}
            <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>Compensation Calculator</h3>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 14px" }}>
                Pro-rated by hours ratio: {actualTotalHours.toLocaleString()} actual hrs ÷ {ftTotalAnnualHours.toLocaleString()} FT hrs = <strong style={{ color: "#4f46e5" }}>{(hoursRatio * 100).toFixed(1)}%</strong>
                {" "}(FT midpoint: {ftMidpoint} hrs/wk)
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "#374151", fontWeight: 700 }}>Component</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#6b7280", fontWeight: 700 }}>Full-Time</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#4f46e5", fontWeight: 700, background: "#eef2ff" }}>Proposed ({(hoursRatio * 100).toFixed(1)}%)</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#dc2626", fontWeight: 700 }}>Difference (Absolute)</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#dc2626", fontWeight: 700 }}>Difference (Relative)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Base Salary", ft: fmtMoney(ftSalary), proposed: fmtMoney(proposedSalary), diff: fmtMoney(proposedSalary - ftSalary), diffPct: ((proposedSalary - ftSalary) / ftSalary * 100).toFixed(1) + "%", bold: false },
                      { label: "Performance Bonus", ft: fmtMoney(ftBonus), proposed: fmtMoney(proposedBonus), diff: fmtMoney(proposedBonus - ftBonus), diffPct: ftBonus === 0 ? "—" : ((proposedBonus - ftBonus) / ftBonus * 100).toFixed(1) + "%", bold: false },
                      { label: "Total Cash", ft: fmtMoney(ftSalary + ftBonus), proposed: fmtMoney(proposedSalary + proposedBonus), diff: fmtMoney(proposedSalary + proposedBonus - ftSalary - ftBonus), diffPct: (((proposedSalary + proposedBonus) - (ftSalary + ftBonus)) / (ftSalary + ftBonus) * 100).toFixed(1) + "%", bold: true },
                      { label: "Base Equity", ft: baseEquity.toFixed(2) + "%", proposed: fmtPct(proposedBaseEquity), diff: (proposedBaseEquity - baseEquity).toFixed(3) + "%", diffPct: ((proposedBaseEquity - baseEquity) / baseEquity * 100).toFixed(1) + "%", bold: false },
                      { label: `Perf Equity (over ${vestingYears}yr)`, ft: perfEquity.toFixed(2) + "%", proposed: fmtPct(proposedPerfEquity), diff: (proposedPerfEquity - perfEquity).toFixed(3) + "%", diffPct: perfEquity === 0 ? "—" : ((proposedPerfEquity - perfEquity) / perfEquity * 100).toFixed(1) + "%", bold: false },
                      { label: "Total Equity", ft: totalFtEquity.toFixed(2) + "%", proposed: fmtPct(totalProposedEquity), diff: (totalProposedEquity - totalFtEquity).toFixed(3) + "%", diffPct: totalFtEquity === 0 ? "—" : ((totalProposedEquity - totalFtEquity) / totalFtEquity * 100).toFixed(1) + "%", bold: true },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: row.bold ? "2px solid #e5e7eb" : "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 12px", fontWeight: row.bold ? 700 : 400, color: row.bold ? "#111827" : "#374151" }}>{row.label}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#6b7280", fontWeight: row.bold ? 700 : 400, fontFamily: "monospace" }}>{row.ft}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#4338ca", fontWeight: row.bold ? 700 : 400, background: row.bold ? "#eef2ff" : "#fafaff", fontFamily: "monospace" }}>{row.proposed}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#dc2626", fontWeight: row.bold ? 700 : 400, fontFamily: "monospace" }}>{row.diff}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#dc2626", fontWeight: row.bold ? 700 : 400, fontFamily: "monospace" }}>{row.diffPct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* KPI-Based Performance Toggle */}
              <div style={{ marginTop: 16, padding: "14px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>KPI-Based Performance</div>
                  <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>
                    Keep bonus & perf equity at full-time levels — earned by meeting ambitious KPIs, not by hours logged
                  </p>
                </div>
                <button onClick={() => setPerfFixed(p => !p)} style={{
                  position: "relative", display: "inline-flex", height: 28, width: 48,
                  alignItems: "center", borderRadius: 14, border: "none", cursor: "pointer", flexShrink: 0,
                  background: perfFixed ? "#059669" : "#d1d5db", transition: "background 0.2s"
                }}>
                  <span style={{
                    display: "inline-block", height: 20, width: 20, borderRadius: 10, background: "white",
                    transition: "transform 0.2s", transform: perfFixed ? "translateX(22px)" : "translateX(4px)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                  }} />
                </button>
              </div>
              {perfFixed && (
                <div style={{ marginTop: 8, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "#6b7280" }}>Performance Bonus</span>
                    <span style={{ color: "#059669", fontWeight: 700 }}>{fmtMoney(ftBonus)} (fixed)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "#6b7280" }}>Perf Equity</span>
                    <span style={{ color: "#059669", fontWeight: 700 }}>{perfEquity.toFixed(2)}% (fixed)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
