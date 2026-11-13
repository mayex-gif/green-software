import { useState } from "react";
import { BarrasApiladas, BarrasVerticales, Evolucion, Leyenda, SERIES_FRANJA } from "./Charts.jsx";
import { fmt, MESES, periodoLegible } from "../lib/format.js";

function Kpi({ k, v, n, alerta }) {
  return (
    <div className={`kpi${alerta ? " alerta" : ""}`}>
      <span className="k">{k}</span>
      <span className="v tnum">{v}</span>
      {n && <span className="n">{n}</span>}
    </div>
  );
}

export default function Resultados({ resumen, resultados, edificios, factor, anio, anios, onAnio, cobertura }) {
  const [vista, setVista] = useState("grafico");
  const nombre = (id) => edificios.find((e) => e.id === id)?.nombre_corto || id;

  if (!resultados.length) {
    return (
      <div className="panel">
        <div className="panel-head"><h2>Resultados</h2></div>
        <p className="empty">No hay datos para mostrar. Cargá al menos un mes de consumo.</p>
      </div>
    );
  }

  const filasFranja = [...resumen.porEdificio.entries()].map(([id, e]) => ({
    id, nombre: nombre(id), pico: e.franjas.pico / 1000, resto: e.franjas.resto / 1000, valle: e.franjas.valle / 1000,
  }));
  const comparacion = [...resumen.porEdificio.entries()].map(([id, e]) => ({ id, nombre: nombre(id), valor: e.kg / 1000 }));
  const evolucion = MESES.map((mes, i) => {
    const clave = `${anio}-${String(i + 1).padStart(2, "0")}`;
    const d = resumen.porPeriodo.get(clave);
    return { clave, etiqueta: mes, etiquetaLarga: periodoLegible(clave), valor: d ? d.kg / 1000 : null };
  });
  const mesesConDato = evolucion.filter((p) => p.valor !== null).length;
  const detalleCobertura = cobertura.porEdificio.map((e) => `${nombre(e.edificio_id)}: ${e.meses} de 12 meses`).join(" · ");

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Resultados</h2>
        <p>Emisiones de la dimensión Energía eléctrica en el año del inventario (enero a diciembre).</p>
      </div>

      <div className="field" style={{ maxWidth: 240 }}>
        <label htmlFor="anio">Año del inventario</label>
        <select id="anio" value={anio} onChange={(e) => onAnio(e.target.value)}>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <section className="traza" aria-label="Cálculo del total">
        <div className="traza-eq">
          <div className="traza-term"><span className="v tnum">{fmt(resumen.totalKwh)}</span><span className="u">kWh consumidos</span></div>
          <span className="traza-op" aria-hidden="true">×</span>
          <div className="traza-term"><span className="v tnum">{fmt(factor ? resumen.totalKg / resumen.totalKwh : 0, 3)}</span><span className="u">kgCO₂e por kWh</span></div>
          <span className="traza-op" aria-hidden="true">=</span>
          <div className="traza-term out"><span className="v tnum">{fmt(resumen.totalT, 2)}</span><span className="u">tCO₂e emitidas</span></div>
        </div>
        <p className="traza-note">
          {cobertura.completo
            ? `Año ${anio} completo: los ${cobertura.total} suministros tienen sus 12 meses.`
            : `Año ${anio}: ${cobertura.completos} de ${cobertura.total} suministros tienen los 12 meses. El total todavía no representa el año: no lo uses como cifra anual.`}
        </p>
      </section>

      <section aria-label="Emisiones por alcance">
        <div className="alcances">
          <div className="alcance">
            <span className="t">Alcance 1</span><span className="v">No aplica</span>
            <span className="d">Emisiones directas. No las genera la electricidad; las cargan otros grupos (combustibles, refrigerantes).</span>
          </div>
          <div className="alcance activo">
            <span className="t">Alcance 2</span><span className="v tnum">{fmt(resumen.totalT, 2)} t</span>
            <span className="d">Electricidad comprada a la red. Es el aporte de este módulo.</span>
          </div>
          <div className="alcance">
            <span className="t">Alcance 3</span><span className="v">No incluido</span>
            <span className="d">Otras emisiones indirectas (por ejemplo, pérdidas de la red). No se calculan en este módulo.</span>
          </div>
        </div>
      </section>

      <section className="kpis" aria-label="Indicadores de la dimensión">
        <Kpi k="Energía en horario pico" v={`${fmt(resumen.pctPico, 1)} %`} n="Es la franja más cara de la tarifa." />
        <Kpi k="Costo medio" v={resumen.costoMedioPorKwh ? `$ ${fmt(resumen.costoMedioPorKwh, 0)}/kWh` : "—"} n="Total facturado ÷ kWh, con impuestos." />
        <Kpi k="Demanda máxima en pico" v={`${fmt(resumen.demandaPicoMax)} kW`} n="Mayor valor facturado." />
        <Kpi k="Coseno φ mínimo" v={fmt(resumen.cosenoMin, 4)} n="Un valor bajo puede generar recargos." />
        <Kpi k={`Suministros con ${anio} completo`} v={`${cobertura.completos} de ${cobertura.total}`} n={detalleCobertura} alerta={!cobertura.completo} />
      </section>

      <div className="actions" style={{ justifyContent: "space-between" }}>
        <h3>{vista === "grafico" ? "Gráficos" : "Detalle por mes"}</h3>
        <div className="toggle" role="group" aria-label="Tipo de vista">
          <button type="button" aria-pressed={vista === "grafico"} onClick={() => setVista("grafico")}>Gráficos</button>
          <button type="button" aria-pressed={vista === "tabla"} onClick={() => setVista("tabla")}>Tabla</button>
        </div>
      </div>

      {vista === "grafico" ? (
        <div className="charts">
          <div className="chart-card wide">
            <h3>Distribución por edificio y franja horaria</h3>
            <span className="sub">Toneladas de CO₂e</span>
            <Leyenda series={SERIES_FRANJA} />
            <BarrasApiladas filas={filasFranja} />
          </div>
          <div className="chart-card">
            <h3>Comparación entre edificios</h3>
            <span className="sub">Toneladas de CO₂e, año {anio}</span>
            <BarrasVerticales datos={comparacion} />
          </div>
          <div className="chart-card">
            <h3>Evolución mensual</h3>
            <span className="sub">Toneladas de CO₂e por mes de {anio}, todos los edificios</span>
            <Evolucion puntos={evolucion} />
            {mesesConDato < 2 && <span className="sub">Con un solo mes no hay tendencia. Cargá más meses para ver la evolución.</span>}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Edificio</th><th>Mes</th><th className="num">Pico (tCO₂e)</th><th className="num">Resto (tCO₂e)</th>
                <th className="num">Valle (tCO₂e)</th><th className="num">Consumo (kWh)</th><th className="num">Total (tCO₂e)</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => (
                <tr key={r.actividad_id}>
                  <td>{nombre(r.edificio_id)}</td>
                  <td>{periodoLegible(r.periodo)}</td>
                  {r.por_franja.map((f) => <td className="num" key={f.id}>{fmt(f.kg / 1000, 3)}</td>)}
                  <td className="num">{fmt(r.consumo_kwh)}</td>
                  <td className="num">{fmt(r.emisiones_tco2e, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
