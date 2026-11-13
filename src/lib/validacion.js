// Validaciones del formulario de carga (componente 4).

const num = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

export function validarActividad(form, existentes = []) {
  const e = {};

  if (!form.edificio_id) e.edificio_id = "Elegí un edificio.";

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.periodo || "")) {
    e.periodo = "Elegí un mes válido.";
  } else if (existentes.some((a) => a.edificio_id === form.edificio_id && a.periodo === form.periodo)) {
    e.periodo = "Ya hay una carga para ese edificio y ese mes.";
  }

  let alMenosUna = false;
  for (const f of ["pico", "resto", "valle"]) {
    const v = num(form[f]);
    if (Number.isNaN(v)) e[f] = "Ingresá un número (0 si no hubo consumo).";
    else if (v < 0) e[f] = "No puede ser negativo.";
    else if (v > 0) alMenosUna = true;
  }
  if (!alMenosUna && !e.pico && !e.resto && !e.valle) e.pico = "Al menos una franja debe tener consumo.";

  const cos = num(form.coseno_fi);
  if (Number.isNaN(cos)) e.coseno_fi = "Ingresá el coseno φ de la factura.";
  else if (cos <= 0 || cos > 1) e.coseno_fi = "Debe estar entre 0 y 1.";

  for (const f of ["demanda_pico_kw", "demanda_fuera_pico_kw"]) {
    const v = num(form[f]);
    if (Number.isNaN(v)) e[f] = "Ingresá la demanda en kW.";
    else if (v < 0) e[f] = "No puede ser negativa.";
  }

  if (form.total_facturado_ars !== "" && num(form.total_facturado_ars) < 0) {
    e.total_facturado_ars = "No puede ser negativo.";
  }

  return e;
}

/** Avisos que no bloquean la carga pero conviene mirar. */
export function avisosActividad(form, aKwh) {
  const avisos = [];
  const total = ["pico", "resto", "valle"].reduce((s, f) => s + (Number(form[f]) || 0), 0);
  const kwh = aKwh(total, form.unidad);
  if (kwh > 2_000_000) avisos.push("El consumo mensual supera 2.000.000 kWh. Revisá la unidad (kWh o MWh).");
  const cos = Number(form.coseno_fi);
  if (cos && cos < 0.85) avisos.push("Coseno φ bajo: la distribuidora puede aplicar recargo.");
  return avisos;
}
