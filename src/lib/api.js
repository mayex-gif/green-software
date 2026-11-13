// Integración con la API central (componente 5). No hay API propia: se consulta la de la cátedra.
//
// Cada GET devuelve { source, configured, data, error? }, donde source es:
//   "central"        datos de la API central
//   "local"          la API no está configurada: se usan los datos del relevamiento (/data)
//   "local-fallback" la API está configurada pero falló: se usan los datos locales

import seed from "../../data/energia_electrica_grupo1.json";
import { CONFIG } from "./config.js";

const LOCAL = {
  factores: seed.factores_emision,
  edificios: seed.edificios,
  actividad: seed.datos_actividad,
};

// Todo lo que se envía lleva la universidad y la dimensión: la API central recibe datos de los 16 grupos.
const CONTEXTO = { universidad_id: seed.universidad.id, dimension_id: seed.dimension.id };

const configurada = () => Boolean(CONFIG.baseUrl);

async function llamar(clave, opciones = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (CONFIG.apiKey) headers[CONFIG.apiKeyHeader] = CONFIG.apiKey;
  try {
    const r = await fetch(CONFIG.baseUrl + CONFIG.endpoints[clave], { ...opciones, headers, signal: ctrl.signal });
    const texto = await r.text();
    let cuerpo = null;
    try { cuerpo = texto ? JSON.parse(texto) : null; } catch { cuerpo = texto; }
    if (!r.ok) throw new Error(`La API central respondió ${r.status}`);
    return cuerpo;
  } finally {
    clearTimeout(timer);
  }
}

async function obtener(clave) {
  if (!configurada()) return { source: "local", configured: false, data: LOCAL[clave] };
  try {
    // TODO: si la API devuelve los datos dentro de un objeto (p. ej. { items: [...] }), extraerlos acá.
    const data = await llamar(clave);
    if (!Array.isArray(data)) throw new Error("La API central devolvió un formato inesperado (se esperaba una lista).");
    return { source: "central", configured: true, data };
  } catch (error) {
    return { source: "local-fallback", configured: true, error: error.message, data: LOCAL[clave] };
  }
}

async function enviar(clave, cuerpo) {
  if (!configurada()) {
    throw new Error("La API central no está configurada (falta VITE_CENTRAL_API_URL). Los datos quedan solo en este navegador.");
  }
  // TODO: adaptar el cuerpo al formato exacto que pida la API de la cátedra.
  return llamar(clave, { method: "POST", body: JSON.stringify(cuerpo) });
}

export const getFactoresEmision = () => obtener("factores");
export const getEdificios = () => obtener("edificios");
export const getDatosActividad = () => obtener("actividad");
export const postDatosActividad = (registros) => enviar("actividad", registros.map((r) => ({ ...CONTEXTO, ...r })));
export const postResultados = (resultados) => enviar("resultados", resultados.map((r) => ({ ...CONTEXTO, ...r })));
