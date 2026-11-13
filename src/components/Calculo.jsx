import { useState } from "react";
import { aKwh, factorEnKgPorKwh } from "../lib/calculo.js";
import { fmt, periodoLegible } from "../lib/format.js";

function Conversor() {
  const [valor, setValor] = useState("1");
  const [unidad, setUnidad] = useState("MWh");
  const kwh = aKwh(valor || 0, unidad);
  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Conversor de unidades</h3>
      <div className="grid-fields" style={{ maxWidth: 560 }}>
        <div className="field">
          <label htmlFor="cv-valor">Energía</label>
          <input id="cv-valor" type="number" min="0" step="any" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cv-unidad">Unidad</label>
          <select id="cv-unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            <option>kWh</option><option>MWh</option><option>GWh</option>
          </select>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        {fmt(Number(valor || 0), 3)} {unidad} = <b className="tnum">{fmt(kwh, 0)} kWh</b>. Para las emisiones: 1.000 kgCO₂e = 1 tCO₂e.
      </p>
    </div>
  );
}

export default function Calculo({ factores, factorId, onFactor, resultados, edificios }) {
  const factor = factores.find((f) => f.id === factorId);
  const nombre = (id) => edificios.find((e) => e.id === id)?.nombre_corto || id;

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Cálculo de emisiones</h2>
        <p>Emisiones = consumo en kWh × factor de emisión. Cada resultado guarda los pasos que lo producen, para poder auditarlo.</p>
      </div>

      <div className="field" style={{ maxWidth: 560 }}>
        <label htmlFor="factor">Factor de emisión</label>
        <select id="factor" value={factorId} onChange={(e) => onFactor(e.target.value)}>
          {factores.map((f) => (
            <option key={f.id} value={f.id}>
              {fmt(factorEnKgPorKwh(f), 3)} kgCO₂e/kWh · {f.anio} · {f.oficial === false ? "referencia no oficial" : "oficial"}
            </option>
          ))}
        </select>
        {factor && <span className="hint">{factor.fuente}</span>}
      </div>

      <div className="traza-list">
        {resultados.length === 0 && <p className="empty">Todavía no hay datos de actividad. Cargá un mes en la pestaña Carga.</p>}
        {resultados.map((r) => (
          <details className="calc" key={r.actividad_id}>
            <summary>
              <span>{nombre(r.edificio_id)} · {periodoLegible(r.periodo)}</span>
              <span className="tnum">{fmt(r.emisiones_tco2e, 3)} tCO₂e</span>
            </summary>
            <ol>
              {r.traza.map((t, i) => <li key={i} className="tnum">{t}</li>)}
              <li>Alcance {r.alcance} (electricidad comprada a la red).</li>
            </ol>
          </details>
        ))}
      </div>

      <Conversor />
    </div>
  );
}
