// Módulo de cálculo (componente 6). Funciones puras, sin dependencias de React.
//
// Fórmula (Alcance 2, electricidad comprada a la red):
//   CO2e [kg] = consumo [kWh] x factor de emisión [kgCO2e/kWh]
//   CO2e [t]  = CO2e [kg] / 1000

import { fmt } from "./format.js";

export const FRANJAS = [
  { id: "pico", clave: "pico_kwh", nombre: "Pico" },
  { id: "resto", clave: "resto_kwh", nombre: "Resto" },
  { id: "valle", clave: "valle_kwh", nombre: "Valle" },
];

const A_KWH = { kWh: 1, MWh: 1_000, GWh: 1_000_000 };

/** Convierte una energía a kWh. */
export function aKwh(valor, unidad = "kWh") {
  const f = A_KWH[unidad];
  if (f === undefined) throw new Error(`Unidad de energía no soportada: ${unidad}`);
  return Number(valor) * f;
}

/**
 * Devuelve el factor en kgCO2e/kWh, sea cual sea la unidad con la que viene.
 * Acepta variantes de escritura ("kg CO2/kWh", "kgCO₂e/kWh", "tCO2eq/MWh").
 * Devuelve null si la unidad no se reconoce o el valor no es un número positivo:
 * así un dato inesperado de la API no deja la página en blanco.
 */
export function factorEnKgPorKwh(factor) {
  const valor = Number(factor?.valor);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const u = String(factor?.unidad || "")
    .replace(/\s/g, "")
    .replace(/₂/g, "2")
    .toLowerCase()
    .replace(/co2(eq|e)?/, "co2e");
  switch (u) {
    case "kgco2e/kwh":
    case "tco2e/mwh": // 1 t/MWh == 1 kg/kWh
      return valor;
    case "gco2e/kwh":
    case "kgco2e/mwh":
      return valor / 1000;
    case "tco2e/kwh":
      return valor * 1000;
    default:
      return null;
  }
}

/** true si el factor tiene una unidad conocida y un valor utilizable. */
export const factorValido = (factor) => factorEnKgPorKwh(factor) !== null;

export const consumoTotalKwh = (a) => FRANJAS.reduce((s, f) => s + Number(a[f.clave] || 0), 0);

/** "2024-08" -> "2024" */
export const anioDe = (periodo) => String(periodo || "").slice(0, 4);

/** Años (calendario) que tienen al menos un dato de actividad, ordenados. */
export function aniosConDatos(actividades) {
  return [...new Set(actividades.map((a) => anioDe(a.periodo)))].filter((a) => /^\d{4}$/.test(a)).sort();
}

/**
 * Cobertura del año del inventario: cuántos meses tiene cada suministro dentro del año.
 * El año está completo solo si TODOS los suministros tienen sus 12 meses.
 */
export function coberturaAnual(actividadesDelAnio, edificios) {
  const meses = new Map(edificios.map((e) => [e.id, new Set()]));
  for (const a of actividadesDelAnio) {
    if (!meses.has(a.edificio_id)) meses.set(a.edificio_id, new Set());
    meses.get(a.edificio_id).add(a.periodo);
  }
  const porEdificio = [...meses.entries()].map(([edificio_id, s]) => ({ edificio_id, meses: s.size }));
  const completos = porEdificio.filter((e) => e.meses >= 12).length;
  return {
    porEdificio,
    completos,
    total: porEdificio.length,
    completo: porEdificio.length > 0 && completos === porEdificio.length,
  };
}

/** Calcula las emisiones de un dato de actividad y deja la traza paso a paso. */
export function calcularActividad(a, factor) {
  const fe = factorEnKgPorKwh(factor);
  if (fe === null) throw new Error(`Factor de emisión no utilizable: ${factor?.valor} ${factor?.unidad}`);
  const consumo = consumoTotalKwh(a);
  const kg = consumo * fe;

  const porFranja = FRANJAS.map((f) => {
    const kwh = Number(a[f.clave] || 0);
    return { id: f.id, nombre: f.nombre, kwh, kg: kwh * fe };
  });

  const traza = [
    `Consumo = ${porFranja.map((f) => `${fmt(f.kwh)} (${f.nombre.toLowerCase()})`).join(" + ")} = ${fmt(consumo)} kWh`,
    `Factor de emisión = ${fmt(fe, 3)} kgCO₂e/kWh (${factor.fuente}, año ${factor.anio})`,
    `Emisiones = ${fmt(consumo)} kWh × ${fmt(fe, 3)} kgCO₂e/kWh = ${fmt(kg, 2)} kgCO₂e`,
    `Conversión = ${fmt(kg, 2)} kg ÷ 1.000 = ${fmt(kg / 1000, 3)} tCO₂e`,
  ];

  return {
    actividad_id: a.id,
    edificio_id: a.edificio_id,
    periodo: a.periodo,
    consumo_kwh: consumo,
    factor_id: factor.id,
    factor_kgco2e_kwh: fe,
    emisiones_kgco2e: kg,
    emisiones_tco2e: kg / 1000,
    alcance: 2,
    por_franja: porFranja,
    formula: "CO2e [kg] = consumo [kWh] x FE [kgCO2e/kWh]",
    traza,
  };
}

/** Agrega una lista de resultados: totales, por edificio, por período y por franja. */
export function resumir(resultados, actividades) {
  const total = { kwh: 0, kg: 0 };
  const porEdificio = new Map();
  const porPeriodo = new Map();

  for (const r of resultados) {
    total.kwh += r.consumo_kwh;
    total.kg += r.emisiones_kgco2e;

    const e = porEdificio.get(r.edificio_id) || { kwh: 0, kg: 0, franjas: { pico: 0, resto: 0, valle: 0 } };
    e.kwh += r.consumo_kwh;
    e.kg += r.emisiones_kgco2e;
    for (const f of r.por_franja) {
      e.franjas[f.id] += f.kg;
    }
    porEdificio.set(r.edificio_id, e);

    const p = porPeriodo.get(r.periodo) || { kwh: 0, kg: 0 };
    p.kwh += r.consumo_kwh;
    p.kg += r.emisiones_kgco2e;
    porPeriodo.set(r.periodo, p);
  }

  const periodos = [...porPeriodo.keys()].sort();
  const pico = actividades.reduce((s, a) => s + Number(a.pico_kwh || 0), 0);
  const conCosto = actividades.filter((a) => a.total_facturado_ars);
  const kwhConCosto = conCosto.reduce((s, a) => s + consumoTotalKwh(a), 0);
  const cosenos = actividades.map((a) => Number(a.coseno_fi)).filter((c) => c > 0);

  return {
    totalKwh: total.kwh,
    totalKg: total.kg,
    totalT: total.kg / 1000,
    porEdificio,
    porPeriodo,
    periodos,
    pctPico: total.kwh ? (pico / total.kwh) * 100 : 0,
    costoMedioPorKwh: kwhConCosto ? conCosto.reduce((s, a) => s + Number(a.total_facturado_ars), 0) / kwhConCosto : null,
    cosenoMin: cosenos.length ? Math.min(...cosenos) : null,
    demandaPicoMax: actividades.length ? Math.max(...actividades.map((a) => Number(a.demanda_pico_kw || 0))) : null,
  };
}

const redondear = (n, decimales) => Math.round(n * 10 ** decimales) / 10 ** decimales;

/**
 * Arma el cuerpo que se envía a la API: cada resultado con el dato de actividad y el factor que lo
 * originaron (trazabilidad). Se redondea a gramos para no mandar ruido de coma flotante (26884.999999…).
 */
export function armarResultadosParaApi(resultados) {
  return resultados.map(({ traza, por_franja, ...r }) => ({
    ...r,
    emisiones_kgco2e: redondear(r.emisiones_kgco2e, 3),
    emisiones_tco2e: redondear(r.emisiones_tco2e, 6),
    calculado_en: new Date().toISOString(),
  }));
}
