// pages/Reports/ClosureChart.jsx
//
// Column chart of Closure % (0-100%) drawn as plain SVG, in the same style as
// the sample: dashed grid, one column per Post / officer, legend underneath.
// "Download PNG" saves the chart as a picture.

import { useRef } from "react";

const COLOR = "#156082";
const FONT = "Arial, Helvetica, sans-serif";

const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function ClosureChart({ data, series, title }) {
  const ref = useRef(null);

  const n = Math.max(data.length, 1);
  const slot = Math.max(38, Math.min(64, 900 / n));
  const left = 58;
  const right = 20;
  const top = title ? 44 : 20;
  const plotH = 300;
  const longest = Math.min(26, data.reduce((m, d) => Math.max(m, d.label.length), 4));
  const labelH = Math.round(30 + longest * 5);
  const legendH = 46;
  const plotW = slot * n;
  const W = left + plotW + right;
  const H = top + plotH + labelH + legendH;

  const y = (pct) => top + plotH - (plotH * pct) / 100;
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  const download = () => {
    const svg = ref.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const c = document.createElement("canvas");
      c.width = W * scale;
      c.height = H * scale;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "Closure_Graph").replace(/[^A-Za-z0-9]+/g, "_")}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  };

  return (
    <div className="rp-chart">
      <div className="rp-chart-bar">
        <button type="button" className="rp-btn rp-btn-alt" onClick={download} disabled={data.length === 0}>
          Download PNG
        </button>
      </div>
      <div className="rp-chart-scroll">
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          fontFamily={FONT}
          role="img"
          aria-label={title}
        >
          <rect x="0" y="0" width={W} height={H} fill="#ffffff" stroke="#d9d9d9" />
          {title && (
            <text x={W / 2} y="26" textAnchor="middle" fontSize="15" fontWeight="700" fill="#10243e">
              {title}
            </text>
          )}

          {/* horizontal grid + % labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke="#bfbfbf" strokeDasharray="4 3" />
              <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#404040">
                {t}%
              </text>
            </g>
          ))}
          {/* vertical dashed lines between columns */}
          {Array.from({ length: n + 1 }).map((_, i) => (
            <line
              key={i}
              x1={left + i * slot}
              x2={left + i * slot}
              y1={top}
              y2={top + plotH}
              stroke="#bfbfbf"
              strokeDasharray="4 3"
            />
          ))}
          <line x1={left} x2={left + plotW} y1={y(0)} y2={y(0)} stroke="#808080" />

          {/* columns + labels */}
          {data.map((d, i) => {
            const cx = left + i * slot + slot / 2;
            const bw = slot * 0.5;
            const h = (plotH * d.pct) / 100;
            return (
              <g key={d.label + i}>
                <title>{`${d.label}: ${d.pct}%  (${d.closures} achieved of ${d.tasks - d.na}${d.na ? `, ${d.na} not applicable` : ""})`}</title>
                {d.pct > 0 && <rect x={cx - bw / 2} y={y(d.pct)} width={bw} height={h} fill={COLOR} />}
                {d.pct > 0 && (
                  <text x={cx} y={y(d.pct) - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#10243e">
                    {d.pct}%
                  </text>
                )}
                <text
                  x={cx + 4}
                  y={top + plotH + 14}
                  textAnchor="end"
                  fontSize="12"
                  fill="#404040"
                  transform={`rotate(-45 ${cx + 4} ${top + plotH + 14})`}
                >
                  {short(d.label, 26)}
                </text>
              </g>
            );
          })}

          {/* legend */}
          <g transform={`translate(${W / 2 - 70} ${H - 26})`}>
            <rect x="0" y="-9" width="10" height="10" fill={COLOR} />
            <text x="16" y="0" fontSize="13" fill="#404040">
              {series}
            </text>
          </g>

          {data.length === 0 && (
            <text x={W / 2} y={top + plotH / 2} textAnchor="middle" fontSize="14" fill="#808080">
              No data for this selection.
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
