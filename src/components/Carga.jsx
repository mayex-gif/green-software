import { useState } from "react";
import { aKwh, consumoTotalKwh } from "../lib/calculo.js";
import { avisosActividad, validarActividad } from "../lib/validacion.js";
import { fmt, periodoLegible } from "../lib/format.js";

const VACIO = {
  edificio_id: "", periodo: "", unidad: "kWh", comprobante: "",
  pico: "", resto: "", valle: "",
  demanda_pico_kw: "", demanda_fuera_pico_kw: "", coseno_fi: "", total_facturado_ars: "",
  calidad: "real",
};

function Campo({ id, label, hint, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="error" id={`${id}-err`} role="alert">{error}</span>}
    </div>
  );
}

export default function Carga({ edificios, actividades, locales, onAgregar, onQuitar }) {
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [confirmacion, setConfirmacion] = useState("");

  const set = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    setConfirmacion("");
  };
  const props = (campo) => ({
    id: campo, value: form[campo], onChange: set(campo),
    "aria-invalid": errores[campo] ? "true" : "false",
    "aria-describedby": errores[campo] ? `${campo}-err` : undefined,
  });

  const avisos = avisosActividad(form, aKwh);

  function enviar(e) {
    e.preventDefault();
    const errs = validarActividad(form, actividades);
    setErrores(errs);
    if (Object.keys(errs).length) return;

    const registro = {
      id: `ACT-L${Date.now()}`,
      edificio_id: form.edificio_id,
      periodo: form.periodo,
      comprobante: form.comprobante || null,
      pico_kwh: aKwh(form.pico, form.unidad),
      resto_kwh: aKwh(form.resto, form.unidad),
      valle_kwh: aKwh(form.valle, form.unidad),
      demanda_pico_kw: Number(form.demanda_pico_kw),
      demanda_fuera_pico_kw: Number(form.demanda_fuera_pico_kw),
      coseno_fi: Number(form.coseno_fi),
      total_facturado_ars: form.total_facturado_ars === "" ? null : Number(form.total_facturado_ars),
      unidad: "kWh",
      alcance: 2,
      fuente_dato: "Carga manual desde factura EPEC",
      calidad: form.calidad === "real" ? "real - cargado a mano" : "estimado",
    };
    registro.consumo_kwh = consumoTotalKwh(registro);
    onAgregar(registro);
    setForm({ ...VACIO, edificio_id: form.edificio_id, unidad: form.unidad });
    setConfirmacion(`Se cargó ${periodoLegible(registro.periodo)}: ${fmt(registro.consumo_kwh)} kWh.`);
  }

  const nombreEdificio = (id) => edificios.find((e) => e.id === id)?.nombre_corto || id;
  const ordenadas = [...actividades].sort((a, b) => (a.periodo + a.edificio_id).localeCompare(b.periodo + b.edificio_id));

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Carga de datos de actividad</h2>
        <p>Una carga por edificio y por mes, tomada de la factura de EPEC. El período anual se completa con doce cargas por suministro.</p>
      </div>

      <form className="carga" onSubmit={enviar} noValidate>
        <fieldset className="fieldset">
          <legend>Factura</legend>
          <div className="grid-fields">
            <Campo id="edificio_id" label="Edificio" error={errores.edificio_id}>
              <select {...props("edificio_id")}>
                <option value="">Elegí un edificio</option>
                {edificios.map((e) => <option key={e.id} value={e.id}>{e.nombre_corto || e.nombre}</option>)}
              </select>
            </Campo>
            <Campo id="periodo" label="Mes de consumo" error={errores.periodo}>
              <input type="month" {...props("periodo")} />
            </Campo>
            <Campo id="comprobante" label="Comprobante (opcional)" hint="Número que figura en la factura.">
              <input type="text" {...props("comprobante")} />
            </Campo>
            <Campo id="total_facturado_ars" label="Total facturado, en pesos (opcional)" error={errores.total_facturado_ars}>
              <input type="number" min="0" step="0.01" inputMode="decimal" {...props("total_facturado_ars")} />
            </Campo>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Energía consumida por franja horaria</legend>
          <div className="grid-fields">
            <Campo id="unidad" label="Unidad">
              <select {...props("unidad")}>
                <option value="kWh">kWh</option>
                <option value="MWh">MWh</option>
              </select>
            </Campo>
            <Campo id="pico" label="Pico" hint="Energía pico (EAP) de la factura." error={errores.pico}>
              <input type="number" min="0" step="any" inputMode="decimal" {...props("pico")} />
            </Campo>
            <Campo id="resto" label="Resto" hint="Energía resto (EAR)." error={errores.resto}>
              <input type="number" min="0" step="any" inputMode="decimal" {...props("resto")} />
            </Campo>
            <Campo id="valle" label="Valle" hint="Energía valle (EAV)." error={errores.valle}>
              <input type="number" min="0" step="any" inputMode="decimal" {...props("valle")} />
            </Campo>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Demanda y calidad</legend>
          <div className="grid-fields">
            <Campo id="demanda_pico_kw" label="Demanda en pico (kW)" error={errores.demanda_pico_kw}>
              <input type="number" min="0" step="any" inputMode="decimal" {...props("demanda_pico_kw")} />
            </Campo>
            <Campo id="demanda_fuera_pico_kw" label="Demanda fuera de pico (kW)" error={errores.demanda_fuera_pico_kw}>
              <input type="number" min="0" step="any" inputMode="decimal" {...props("demanda_fuera_pico_kw")} />
            </Campo>
            <Campo id="coseno_fi" label="Coseno φ" hint="Entre 0 y 1." error={errores.coseno_fi}>
              <input type="number" min="0" max="1" step="0.0001" inputMode="decimal" {...props("coseno_fi")} />
            </Campo>
            <Campo id="calidad" label="Origen del dato">
              <select {...props("calidad")}>
                <option value="real">Real (de la factura)</option>
                <option value="estimado">Estimado</option>
              </select>
            </Campo>
          </div>
        </fieldset>

        {avisos.map((a) => <p className="aviso" key={a}>{a}</p>)}
        <div className="actions">
          <button className="btn btn-primary" type="submit">Cargar mes</button>
          <button className="btn btn-quiet" type="button" onClick={() => { setForm(VACIO); setErrores({}); setConfirmacion(""); }}>
            Limpiar formulario
          </button>
          {confirmacion && <span role="status">{confirmacion}</span>}
        </div>
      </form>

      <div>
        <h3 style={{ marginBottom: 10 }}>Datos cargados ({ordenadas.length})</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Edificio</th><th>Mes</th>
                <th className="num">Pico (kWh)</th><th className="num">Resto (kWh)</th><th className="num">Valle (kWh)</th>
                <th className="num">Total (kWh)</th><th>Origen</th><th />
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((a) => (
                <tr key={a.id}>
                  <td>{nombreEdificio(a.edificio_id)}</td>
                  <td>{periodoLegible(a.periodo)}</td>
                  <td className="num">{fmt(a.pico_kwh)}</td>
                  <td className="num">{fmt(a.resto_kwh)}</td>
                  <td className="num">{fmt(a.valle_kwh)}</td>
                  <td className="num">{fmt(consumoTotalKwh(a))}</td>
                  <td>{locales.some((l) => l.id === a.id) ? "Cargado aquí" : "Relevamiento base"}</td>
                  <td>
                    {locales.some((l) => l.id === a.id) && (
                      <button className="btn btn-quiet" type="button" onClick={() => onQuitar(a.id)}>Quitar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
