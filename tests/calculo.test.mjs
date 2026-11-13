// Pruebas de las funciones de cálculo, validación y ejes. Sin dependencias: `npm test`.
import assert from "node:assert/strict";
const R = new URL("../src/lib/", import.meta.url).href;
const c = await import(R + "calculo.js");
const v = await import(R + "validacion.js");
const { escalaEje } = await import(R + "escala.js");
let ok = 0; const t = (n, f) => { f(); ok++; console.log("ok -", n); };

// Factores: unidades aceptadas y rechazadas
t("kgCO2e/kWh", () => assert.equal(c.factorEnKgPorKwh({ valor: 0.283, unidad: "kgCO2e/kWh" }), 0.283));
t("kg CO2/kWh (SNIGEIAR)", () => assert.equal(c.factorEnKgPorKwh({ valor: 0.283, unidad: "kg CO2/kWh" }), 0.283));
t("kgCO₂e/kWh con subíndice", () => assert.equal(c.factorEnKgPorKwh({ valor: 0.283, unidad: "kgCO₂e/kWh" }), 0.283));
t("tCO2eq/MWh", () => assert.equal(c.factorEnKgPorKwh({ valor: 0.283, unidad: "tCO2eq/MWh" }), 0.283));
t("g/kWh", () => assert.equal(c.factorEnKgPorKwh({ valor: 283, unidad: "gCO2e/kWh" }), 0.283));
t("kg/MWh", () => assert.equal(c.factorEnKgPorKwh({ valor: 283, unidad: "kg CO2e/MWh" }), 0.283));
t("unidad desconocida -> null", () => assert.equal(c.factorEnKgPorKwh({ valor: 1, unidad: "lb/kWh" }), null));
t("valor no numérico -> null", () => assert.equal(c.factorEnKgPorKwh({ valor: "abc", unidad: "kgCO2e/kWh" }), null));
t("valor 0 -> null", () => assert.equal(c.factorEnKgPorKwh({ valor: 0, unidad: "kgCO2e/kWh" }), null));
t("factorValido", () => { assert.equal(c.factorValido({ valor: 0.3, unidad: "kgCO2e/kWh" }), true); assert.equal(c.factorValido({ valor: 0.3, unidad: "x" }), false); });

// Cálculo con los datos reales del relevamiento
const fe = { id: "F", valor: 0.283, unidad: "kgCO2e/kWh", fuente: "x", anio: 2022 };
const a1 = { id: "A1", edificio_id: "E1", periodo: "2024-08", pico_kwh: 22950, resto_kwh: 65556, valle_kwh: 16182 };
const a2 = { id: "A2", edificio_id: "E2", periodo: "2024-08", pico_kwh: 3795, resto_kwh: 8408, valle_kwh: 3313 };
t("ACT-001 = 29,6267 t", () => assert.ok(Math.abs(c.calcularActividad(a1, fe).emisiones_tco2e - 29.626704) < 1e-9));
t("total 34,0177 t", () => { const r = c.resumir([a1, a2].map((a) => c.calcularActividad(a, fe)), [a1, a2]); assert.ok(Math.abs(r.totalT - 34.017732) < 1e-6); assert.equal(r.totalKwh, 120204); });
t("calcular con factor inválido lanza error claro", () => assert.throws(() => c.calcularActividad(a1, { valor: 1, unidad: "x" }), /no utilizable/));
t("cosenoMin sin datos -> null", () => assert.equal(c.resumir([], [{ coseno_fi: null }]).cosenoMin, null));
t("envío a la API: redondeado, sin traza, con factor y dato de origen", () => {
  const [r] = c.armarResultadosParaApi([c.calcularActividad({ ...a1, pico_kwh: 20000, resto_kwh: 60000, valle_kwh: 15000 }, fe)]);
  assert.equal(r.emisiones_kgco2e, 26885);
  assert.equal(r.emisiones_tco2e, 26.885);
  assert.equal(r.traza, undefined);
  assert.equal(r.por_franja, undefined);
  assert.equal(r.factor_id, "F");
  assert.equal(r.actividad_id, "A1");
});

// Años y cobertura
const eds = [{ id: "E1" }, { id: "E2" }];
const mes = (e, p) => ({ edificio_id: e, periodo: p });
t("aniosConDatos", () => assert.deepEqual(c.aniosConDatos([mes("E1", "2025-01"), mes("E1", "2024-08"), mes("E2", "2024-09")]), ["2024", "2025"]));
t("cobertura: 1 mes cada uno -> incompleto", () => { const k = c.coberturaAnual([mes("E1", "2024-08"), mes("E2", "2024-08")], eds); assert.equal(k.completo, false); assert.equal(k.completos, 0); assert.deepEqual(k.porEdificio.map((e) => e.meses), [1, 1]); });
const doce = (e, y) => Array.from({ length: 12 }, (_, i) => mes(e, `${y}-${String(i + 1).padStart(2, "0")}`));
t("cobertura: E2 con 12 y E1 con 1 -> incompleto (el caso que antes decía completo)", () => { const k = c.coberturaAnual([mes("E1", "2024-08"), ...doce("E2", "2024")], eds); assert.equal(k.completo, false); assert.equal(k.completos, 1); });
t("cobertura: ambos con 12 -> completo", () => assert.equal(c.coberturaAnual([...doce("E1", "2024"), ...doce("E2", "2024")], eds).completo, true));
t("cobertura: suministro sin datos cuenta como 0", () => assert.deepEqual(c.coberturaAnual(doce("E1", "2024"), eds).porEdificio.map((e) => e.meses), [12, 0]));

// Validación de meses
const hoy = new Date(2026, 10, 13); // 13/11/2026
const base = { edificio_id: "E1", pico: "1", resto: "0", valle: "0", coseno_fi: "0.95", demanda_pico_kw: "1", demanda_fuera_pico_kw: "1", total_facturado_ars: "" };
t("mesActual", () => assert.equal(v.mesActual(hoy), "2026-11"));
t("mes futuro rechazado", () => assert.match(v.validarActividad({ ...base, periodo: "2030-01" }, [], hoy).periodo, /todavía no llegó/));
t("mes siguiente rechazado", () => assert.ok(v.validarActividad({ ...base, periodo: "2026-12" }, [], hoy).periodo));
t("mes actual aceptado", () => assert.equal(v.validarActividad({ ...base, periodo: "2026-11" }, [], hoy).periodo, undefined));
t("mes pasado aceptado", () => assert.deepEqual(v.validarActividad({ ...base, periodo: "2024-08" }, [], hoy), {}));
t("duplicado sigue rechazado", () => assert.match(v.validarActividad({ ...base, periodo: "2024-08" }, [mes("E1", "2024-08")], hoy).periodo, /Ya hay/));

// Escala de ejes
const ticks = (x) => escalaEje(x).ticks;
t("34,02 -> 0,10,20,30,40", () => assert.deepEqual(ticks(34.02), [0, 10, 20, 30, 40]));
t("29,63 -> 0,10,20,30", () => assert.deepEqual(ticks(29.63), [0, 10, 20, 30]));
t("4,39 -> 0,2,4,6", () => assert.deepEqual(ticks(4.39), [0, 2, 4, 6]));
t("0,08 -> pasos de 0,02", () => { const e = escalaEje(0.08); assert.deepEqual(e.ticks, [0, 0.02, 0.04, 0.06, 0.08]); assert.equal(e.decimales, 2); });
t("9 -> pasos de 2,5", () => { const e = escalaEje(9); assert.deepEqual(e.ticks, [0, 2.5, 5, 7.5, 10]); assert.equal(e.decimales, 1); });
t("1234 -> 0..1500", () => assert.deepEqual(ticks(1234), [0, 500, 1000, 1500]));
t("40 exacto -> tope 40", () => assert.equal(escalaEje(40).max, 40));
t("0 -> escala por defecto", () => assert.equal(escalaEje(0).max, 1));
t("nunca más de 4 tramos y el máximo cubre el valor", () => { for (let x = 0.013; x < 5000; x *= 1.37) { const e = escalaEje(x); assert.ok(e.ticks.length <= 5, x); assert.ok(e.max >= x - 1e-9, x); } });
console.log(`\n${ok} pruebas OK`);
