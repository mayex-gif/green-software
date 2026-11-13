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

/** Devuelve el factor en kgCO2e/kWh, sea cual sea la unidad con la que viene. */
export function factorEnKgPorKwh(factor) {
  const u = String(factor.unidad || "").replace(/\s/g, "");
  switch (u) {
    case "kgCO2e/kWh":
    case "tCO2e/MWh": // 1 t/MWh == 1 kg/kWh
      return Number(factor.valor);
    case "gCO2e/kWh":
      return Number(factor.valor) / 1000;
    case "tCO2e/kWh":
      return Number(factor.valor) * 1000;
    default:
      throw new Error(`Unidad de factor no soportada: ${factor.unidad}`);
  }
}

export const consumoTotalKwh = (a) => FRANJAS.reduce((s, f) => s + Number(a[f.clave] || 0), 0);

/** Calcula las emisiones de un dato de actividad y deja la traza paso a paso. */
export function calcularActividad(a, factor) {
  const fe = factorEnKgPorKwh(factor);
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

  return {
    totalKwh: total.kwh,
    totalKg: total.kg,
    totalT: total.kg / 1000,
    porEdificio,
    porPeriodo,
    periodos,
    mesesCargados: periodos.length,
    pctPico: total.kwh ? (pico / total.kwh) * 100 : 0,
    costoMedioPorKwh: kwhConCosto ? conCosto.reduce((s, a) => s + Number(a.total_facturado_ars), 0) / kwhConCosto : null,
    cosenoMin: actividades.length ? Math.min(...actividades.map((a) => Number(a.coseno_fi)).filter(Boolean)) : null,
    demandaPicoMax: actividades.length ? Math.max(...actividades.map((a) => Number(a.demanda_pico_kw || 0))) : null,
  };
}

/** Arma el cuerpo que se envía a la API: resultados con su traza y trazabilidad. */
export function armarResultadosParaApi(resultados) {
  return resultados.map(({ traza, por_franja, ...r }) => ({ ...r, calculado_en: new Date().toISOString() }));
}
