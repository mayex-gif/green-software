import { useRef, useState } from "react";
import { fmt, periodoLegible } from "../lib/format.js";

// Gráficos SVG propios (sin librerías). Reglas: marcas finas, 2px de separación entre
// segmentos, grilla tenue, leyenda siempre que haya 2 o más series, tooltip al pasar el mouse.

function useTip() {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);
  const show = (e, contenido) => {
    const box = ref.current.getBoundingClientRect();
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, contenido });
  };
  const hide = () => setTip(null);
  return { ref, tip, show, hide };
}

const Tip = ({ tip }) =>
  tip ? (
    <div className="tip" style={{ left: tip.x, top: tip.y }} role="status">
      {tip.contenido}
    </div>
  ) : null;

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

// Rectángulo con las esquinas superiores redondeadas (el extremo de datos).
function barraRedondeada(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export const SERIES_FRANJA = [
  { id: "pico", nombre: "Pico", color: "var(--series-1)" },
  { id: "resto", nombre: "Resto", color: "var(--series-2)" },
  { id: "valle", nombre: "Valle", color: "var(--series-3)" },
];

export function Leyenda({ series }) {
  return (
    <div className="legend">
      {series.map((s) => (
        <span key={s.id}>
          <i style={{ background: s.color }} aria-hidden="true" />
          {s.nombre}
        </span>
      ))}
    </div>
  );
}

/** Barras horizontales apiladas: emisiones por edificio, divididas por franja horaria. */
export function BarrasApiladas({ filas }) {
  const { ref, tip, show, hide } = useTip();
  const W = 640, etiquetaW = 150, derecha = 78, alto = 30, sep = 16;
  const H = filas.length * (alto + sep) + 8;
  const max = Math.max(...filas.map((f) => f.pico + f.resto + f.valle), 0.0001);
  const ancho = W - etiquetaW - derecha;
  const esc = (v) => (v / max) * ancho;

  return (
    <div className="chart" ref={ref}>
      <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Emisiones por edificio y franja horaria, en toneladas de CO2 equivalente">
        {filas.map((f, i) => {
          const y = 4 + i * (alto + sep);
          let x = etiquetaW;
          const total = f.pico + f.resto + f.valle;
          return (
            <g key={f.id}>
              <text x={etiquetaW - 10} y={y + alto / 2 + 4} textAnchor="end" className="ink">{f.nombre}</text>
              {SERIES_FRANJA.map((s) => {
                const w = esc(f[s.id]);
                const rect = (
                  <g key={s.id}>
                    <rect
                      x={x} y={y} width={Math.max(w, 0)} height={alto} fill={s.color}
                      stroke="var(--surface)" strokeWidth="2" tabIndex={0}
                      aria-label={`${f.nombre}, ${s.nombre}: ${fmt(f[s.id], 2)} tCO2e`}
                      onMouseMove={(e) => show(e, <><b>{f.nombre}</b>{s.nombre}: {fmt(f[s.id], 2)} tCO₂e ({fmt((f[s.id] / total) * 100, 1)} %)</>)}
                      onMouseLeave={hide} onFocus={hide}
                    />
                    {w > 36 && (
                      <text x={x + w / 2} y={y + alto / 2 + 4} textAnchor="middle" className="inside" pointerEvents="none">
                        {fmt(f[s.id], 1)}
                      </text>
                    )}
                  </g>
                );
                x += w;
                return rect;
              })}
              <text x={x + 8} y={y + alto / 2 + 4} className="ink tnum">{fmt(total, 2)} t</text>
            </g>
          );
        })}
        <line className="axis-line" x1={etiquetaW} x2={etiquetaW} y1="0" y2={H} />
      </svg>
      </div>
      <Tip tip={tip} />
    </div>
  );
}

/** Barras verticales (una serie): comparación de emisiones entre edificios. */
export function BarrasVerticales({ datos, unidad = "tCO₂e", decimales = 2 }) {
  const { ref, tip, show, hide } = useTip();
  const W = 640, H = 260, m = { t: 24, r: 16, b: 44, l: 56 };
  const max = niceMax(Math.max(...datos.map((d) => d.valor), 0));
  const ancho = W - m.l - m.r, alto = H - m.t - m.b;
  const paso = ancho / datos.length;
  const bw = Math.min(72, paso * 0.5);
  const y = (v) => m.t + alto - (v / max) * alto;

  return (
    <div className="chart" ref={ref}>
      <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Comparación entre edificios en ${unidad}`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max / 4) * i;
          return (
            <g key={i}>
              <line className={i === 0 ? "axis-line" : "grid-line"} x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} />
              <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="tnum">{fmt(v, max < 10 ? 1 : 0)}</text>
            </g>
          );
        })}
        {datos.map((d, i) => {
          const x = m.l + paso * i + (paso - bw) / 2;
          const h = alto - (y(d.valor) - m.t);
          return (
            <g key={d.id}>
              <path
                d={barraRedondeada(x, y(d.valor), bw, Math.max(h, 1), 4)} fill="var(--series-1)" tabIndex={0}
                aria-label={`${d.nombre}: ${fmt(d.valor, decimales)} ${unidad}`}
                onMouseMove={(e) => show(e, <><b>{d.nombre}</b>{fmt(d.valor, decimales)} {unidad}</>)}
                onMouseLeave={hide}
              />
              <text x={x + bw / 2} y={y(d.valor) - 6} textAnchor="middle" className="ink tnum">{fmt(d.valor, decimales)}</text>
              <text x={x + bw / 2} y={H - 18} textAnchor="middle">{d.nombre}</text>
            </g>
          );
        })}
      </svg>
      </div>
      <Tip tip={tip} />
    </div>
  );
}

/** Evolución temporal: emisiones por período. */
export function Evolucion({ puntos }) {
  const { ref, tip, show, hide } = useTip();
  const W = 640, H = 240, m = { t: 24, r: 28, b: 40, l: 56 };
  const max = niceMax(Math.max(...puntos.map((p) => p.valor), 0));
  const ancho = W - m.l - m.r, alto = H - m.t - m.b;
  const x = (i) => (puntos.length === 1 ? m.l + ancho / 2 : m.l + (ancho / (puntos.length - 1)) * i);
  const y = (v) => m.t + alto - (v / max) * alto;
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.valor)}`).join(" ");

  return (
    <div className="chart" ref={ref}>
      <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución mensual de las emisiones en toneladas de CO2 equivalente">
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max / 4) * i;
          return (
            <g key={i}>
              <line className={i === 0 ? "axis-line" : "grid-line"} x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} />
              <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="tnum">{fmt(v, max < 10 ? 1 : 0)}</text>
            </g>
          );
        })}
        {puntos.length > 1 && <path d={linea} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" />}
        {puntos.map((p, i) => (
          <g key={p.periodo}>
            <circle cx={x(i)} cy={y(p.valor)} r="5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
            <circle
              cx={x(i)} cy={y(p.valor)} r="16" fill="transparent" tabIndex={0}
              aria-label={`${periodoLegible(p.periodo)}: ${fmt(p.valor, 2)} tCO2e`}
              onMouseMove={(e) => show(e, <><b>{periodoLegible(p.periodo)}</b>{fmt(p.valor, 2)} tCO₂e</>)}
              onMouseLeave={hide}
            />
            {(puntos.length <= 13 || i === puntos.length - 1) && (
              <text x={x(i)} y={y(p.valor) - 12} textAnchor="middle" className="ink tnum">{fmt(p.valor, 1)}</text>
            )}
            <text x={x(i)} y={H - 14} textAnchor="middle">{periodoLegible(p.periodo)}</text>
          </g>
        ))}
      </svg>
      </div>
      <Tip tip={tip} />
    </div>
  );
}
