import { useState } from "react";
import { CONFIG } from "../lib/config.js";

const ENDPOINTS = [
  { clave: "factores", metodo: "GET", uso: "Consulta de factores de emisión" },
  { clave: "edificios", metodo: "GET", uso: "Edificios de la universidad" },
  { clave: "actividad", metodo: "GET", uso: "Datos de actividad ya cargados" },
  { clave: "actividad", metodo: "POST", uso: "Envío de datos relevados" },
  { clave: "resultados", metodo: "POST", uso: "Envío de cálculos" },
];

export function EtiquetaFuente({ meta }) {
  if (!meta) return <span className="badge">Consultando…</span>;
  if (meta.source === "central") return <span className="badge"><b aria-hidden="true">✓</b> API central</span>;
  if (meta.source === "local-fallback") return <span className="badge"><b aria-hidden="true">⚠</b> Respaldo local: la API falló</span>;
  return <span className="badge"><b aria-hidden="true">●</b> Datos locales: API sin configurar</span>;
}

export default function ApiPanel({ meta, onReintentar, onEnviar, locales, resultados }) {
  const [envio, setEnvio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setEnviando(true);
    setEnvio(null);
    try {
      setEnvio(await onEnviar());
    } finally {
      setEnviando(false);
    }
  }

  const configurada = Object.values(meta).some((m) => m?.configured);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>API central</h2>
        <p>
          Este módulo no tiene API propia: consulta la de la cátedra directamente desde el navegador. Mientras no se
          configure <code>VITE_CENTRAL_API_URL</code>, trabaja con los datos locales del relevamiento.
        </p>
        <p className="muted">Base: <code>{CONFIG.baseUrl || "sin configurar"}</code></p>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Método</th><th>Ruta</th><th>Para qué</th><th>Fuente actual</th></tr></thead>
          <tbody>
            {ENDPOINTS.map((e, i) => (
              <tr key={i}>
                <td><code>{e.metodo}</code></td>
                <td><code>{CONFIG.endpoints[e.clave]}</code></td>
                <td>{e.uso}</td>
                <td>{e.metodo === "GET" ? <EtiquetaFuente meta={meta[e.clave]} /> : <span className="muted">Solo con API configurada</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Object.values(meta).filter((m) => m?.error).map((m, i) => <p className="aviso" key={i}>La API central respondió con error: {m.error}</p>)}

      <div className="actions">
        <button className="btn" type="button" onClick={onReintentar}>Volver a consultar</button>
        <button className="btn btn-primary" type="button" onClick={enviar} disabled={enviando || !resultados.length}>
          {enviando ? "Enviando…" : "Enviar datos relevados y cálculos"}
        </button>
        <span className="muted">{locales.length} cargas nuevas · {resultados.length} resultados calculados</span>
      </div>
      {!configurada && <p className="muted">Sin API configurada, el envío devuelve un aviso y los datos quedan solo en este navegador.</p>}

      {envio && (
        <div>
          <h3 style={{ marginBottom: 8 }}>Respuesta del último envío</h3>
          <pre className="json">{JSON.stringify(envio, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
