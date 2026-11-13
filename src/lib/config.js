// Configuración de la integración con la API central.
// Todo lo marcado con TODO se completa cuando la cátedra entregue la API real.

const env = import.meta.env;

export const CONFIG = {
  // TODO: se define en .env (ver .env.example). Vacío = se usan los datos locales.
  baseUrl: (env.VITE_CENTRAL_API_URL || "").replace(/\/$/, ""),
  apiKey: env.VITE_CENTRAL_API_KEY || "",
  apiKeyHeader: env.VITE_CENTRAL_API_KEY_HEADER || "Authorization",

  // TODO: reemplazar por las rutas reales de la cátedra.
  endpoints: {
    factores: "/factores-emision",
    edificios: "/edificios",
    actividad: "/datos-actividad",
    resultados: "/resultados-emisiones",
  },

  timeoutMs: 8000,
};
