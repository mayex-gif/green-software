import { useRef, useState } from "react";
import { fmt } from "../lib/format.js";
import { escalaEje } from "../lib/escala.js";

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

/** Líneas de grilla y números del eje vertical. */
function EjeY({ esc, y, x1, x2 }) {
  return esc.ticks.map((v, i) => (
    <g key={v}>
      <line className={i === 0 ? "axis-line" : "grid-line"} x1={x1} x2={x2} y1={y(v)} y2={y(v)} />
      <text x={x1 - 8} y={y(v) + 4} textAnchor="end" className="tnum">{fmt(v, esc.decimales)}</text>
    </g>
  ));
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
  const esc = escalaEje(Math.max(...datos.map((d) => d.valor), 0));
  const ancho = W - m.l - m.r, alto = H - m.t - m.b;
  const paso = ancho / datos.length;
  const bw = Math.min(72, paso * 0.5);
  const y = (v) => m.t + alto - (v / esc.max) * alto;

  return (
    <div className="chart" ref={ref}>
      <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Comparación entre edificios en ${unidad}`}>
        <EjeY esc={esc} y={y} x1={m.l} x2={W - m.r} />
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

/**
 * Evolución mensual dentro de un año. Recibe los 12 meses: { clave, etiqueta, etiquetaLarga, valor }.
 * Un mes sin datos (valor null) no se dibuja y corta la línea: no se unen meses salteados.
 */
export function Evolucion({ puntos }) {
  const { ref, tip, show, hide } = useTip();
  const W = 640, H = 240, m = { t: 24, r: 16, b: 40, l: 56 };
  const conDato = puntos.filter((p) => p.valor !== null);
  const esc = escalaEje(Math.max(...conDato.map((p) => p.valor), 0));
  const ancho = W - m.l - m.r, alto = H - m.t - m.b;
  const paso = ancho / puntos.length;
  const x = (i) => m.l + paso * (i + 0.5);
  const y = (v) => m.t + alto - (v / esc.max) * alto;

  let linea = "";
  puntos.forEach((p, i) => {
    if (p.valor === null) return;
    const sigue = i > 0 && puntos[i - 1].valor !== null;
    linea += `${sigue ? "L" : "M"}${x(i)},${y(p.valor)} `;
  });

  return (
    <div className="chart" ref={ref}>
      <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución mensual de las emisiones en toneladas de CO2 equivalente">
        <EjeY esc={esc} y={y} x1={m.l} x2={W - m.r} />
        {linea.includes("L") && <path d={linea} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" />}
        {puntos.map((p, i) => (
          <g key={p.clave}>
            {p.valor !== null && (
              <>
                <circle cx={x(i)} cy={y(p.valor)} r="5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
                <circle
                  cx={x(i)} cy={y(p.valor)} r="16" fill="transparent" tabIndex={0}
                  aria-label={`${p.etiquetaLarga}: ${fmt(p.valor, 2)} tCO2e`}
                  onMouseMove={(e) => show(e, <><b>{p.etiquetaLarga}</b>{fmt(p.valor, 2)} tCO₂e</>)}
                  onMouseLeave={hide}
                />
                <text x={x(i)} y={y(p.valor) - 12} textAnchor="middle" className="ink tnum">{fmt(p.valor, 1)}</text>
              </>
            )}
            <text x={x(i)} y={H - 14} textAnchor="middle">{p.etiqueta}</text>
          </g>
        ))}
      </svg>
      </div>
      <Tip tip={tip} />
    </div>
  );
}
