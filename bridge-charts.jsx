// SVG charts for Bridge Probability Simulator
const { SUITS, RANKS } = window.BridgeCards;

function fmtPct(v) {
  if (!isFinite(v)) return "—";
  return (v * 100).toFixed(2) + "%";
}

// ===== Bar chart: actual vs theoretical frequency by rank or suit =====
function BarChart({ data, mode }) {
  // data: [{label, actual, theoretical, color}]
  const W = 720, H = 320, P = { t: 18, r: 16, b: 36, l: 40 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const max = Math.max(0.001, ...data.flatMap((d) => [d.actual, d.theoretical])) * 1.15;
  const xScale = (i) => P.l + (iw / data.length) * (i + 0.5);
  const yScale = (v) => P.t + ih - (v / max) * ih;
  const bw = Math.min(28, (iw / data.length) / 2.4);

  return (
    <div className="chart-wrap">
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = P.t + ih * (1 - t);
          return (
            <g key={t}>
              <line className="gridline" x1={P.l} x2={P.l + iw} y1={y} y2={y} />
              <text x={P.l - 8} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
                {(max * t * 100).toFixed(1)}%
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const cx = xScale(i);
          const yA = yScale(d.actual);
          const yT = yScale(d.theoretical);
          return (
            <g key={d.label}>
              <rect className="bar"
                x={cx - bw} y={yA}
                width={bw} height={P.t + ih - yA}
                fill={d.color || "var(--accent)"}
                rx="3"
              />
              <rect className="bar"
                x={cx + 2} y={yT}
                width={bw} height={P.t + ih - yT}
                fill="var(--border-strong)"
                rx="3"
                opacity="0.7"
              />
              <text x={cx} y={H - P.b + 18} textAnchor="middle" fill="var(--muted)" fontSize="11.5" fontFamily="JetBrains Mono, monospace">
                {d.label}
              </text>
            </g>
          );
        })}
        {/* X axis */}
        <line x1={P.l} x2={P.l + iw} y1={P.t + ih} y2={P.t + ih} stroke="var(--border-strong)" />
      </svg>
      <div className="legend-row">
        <span><span className="legend-dot" style={{ background: "var(--accent)" }}></span>Actual frequency</span>
        <span><span className="legend-dot" style={{ background: "var(--border-strong)" }}></span>Theoretical (1/{mode === "rank" ? "13" : "4"})</span>
      </div>
    </div>
  );
}

// ===== Probability curve (convergence): tracks P(target) over trials =====
function ConvergenceChart({ series, target, theoretical }) {
  // series: array of running P(target) values per trial
  const W = 720, H = 320, P = { t: 18, r: 16, b: 36, l: 44 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const N = series.length;
  if (N < 1) {
    return <div style={{ color: "var(--muted)", padding: "60px 0", textAlign: "center" }}>Run a simulation to see convergence.</div>;
  }
  // Y scale: clamp to [0, max(theoretical*3, max(series), 0.05)]
  const yMax = Math.max(theoretical * 2.2, ...series, 0.05);
  const xScale = (i) => P.l + (iw * i) / Math.max(1, N - 1);
  const yScale = (v) => P.t + ih - (v / yMax) * ih;
  const path = series.map((v, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(2)},${yScale(v).toFixed(2)}`).join(" ");
  const theoryY = yScale(theoretical);

  // Sample x-axis ticks
  const ticks = [];
  const tickN = 5;
  for (let i = 0; i <= tickN; i++) {
    ticks.push(Math.round((i * (N - 1)) / tickN));
  }

  return (
    <div className="chart-wrap">
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = P.t + ih * (1 - t);
          return (
            <g key={t}>
              <line className="gridline" x1={P.l} x2={P.l + iw} y1={y} y2={y} />
              <text x={P.l - 8} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
                {(yMax * t * 100).toFixed(1)}%
              </text>
            </g>
          );
        })}
        {/* Theoretical line */}
        <line x1={P.l} x2={P.l + iw} y1={theoryY} y2={theoryY}
              stroke="var(--amber)" strokeDasharray="6 4" strokeWidth="1.5" />
        <text x={P.l + iw - 6} y={theoryY - 6} textAnchor="end" fill="var(--amber)" fontSize="11" fontFamily="JetBrains Mono, monospace">
          theoretical {(theoretical * 100).toFixed(2)}%
        </text>
        {/* Area under curve */}
        <path d={`${path} L${xScale(N-1)},${P.t + ih} L${xScale(0)},${P.t + ih} Z`}
              fill="var(--accent-soft)" opacity="0.5" />
        {/* Curve */}
        <path d={path} stroke="var(--accent)" strokeWidth="2" fill="none" strokeLinejoin="round" />
        {/* End point */}
        <circle cx={xScale(N-1)} cy={yScale(series[N-1])} r="4" fill="var(--accent)" stroke="white" strokeWidth="2" />
        {/* X axis */}
        <line x1={P.l} x2={P.l + iw} y1={P.t + ih} y2={P.t + ih} stroke="var(--border-strong)" />
        {ticks.map((t, i) => (
          <text key={i} x={xScale(t)} y={H - P.b + 18} textAnchor="middle" fill="var(--muted)" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
            {t + 1}
          </text>
        ))}
      </svg>
      <div className="legend-row">
        <span><span className="legend-dot" style={{ background: "var(--accent)" }}></span>Running P({target})</span>
        <span><span className="legend-dot" style={{ background: "var(--amber)" }}></span>Theoretical</span>
        <span style={{ marginLeft: "auto" }}>n = {N}</span>
      </div>
    </div>
  );
}

// ===== Heatmap (13 ranks x 4 suits) =====
function Heatmap({ counts, total }) {
  // counts: { "AS": 4, ... } including all keys present in deck
  const max = Math.max(1, ...Object.values(counts));
  function heat(v) {
    const t = v / max;
    // blend from --accent-soft to --accent
    const a = `rgba(37,99,235,${0.08 + t * 0.85})`;
    return a;
  }
  return (
    <div>
      <div className="heatmap">
        <div></div>
        {RANKS.map((r) => <div key={r} className="heat-label">{r}</div>)}
        {SUITS.map((s) => (
          <React.Fragment key={s.key}>
            <div className={"heat-label suit" + (s.color === "red" ? " red" : "")}>{s.glyph}</div>
            {RANKS.map((r) => {
              const k = r + s.key;
              const v = counts[k] || 0;
              return (
                <div
                  key={k}
                  className="heat-cell"
                  style={{ background: heat(v) }}
                  title={`${r}${s.glyph} — ${v} hits (${total ? ((v/total)*100).toFixed(2) : "0"}%)`}
                >
                  {v > 0 ? v : ""}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="heat-legend">
        <span>0</span>
        <div className="heat-gradient"></div>
        <span>{max}</span>
      </div>
    </div>
  );
}

window.BridgeCharts = { BarChart, ConvergenceChart, Heatmap, fmtPct };
