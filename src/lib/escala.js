// Escala "redonda" para los ejes de los gráficos: pasos de 1, 2, 2,5 o 5 × 10^n,
// para que las marcas sean 0, 10, 20, 30… y no 0, 13, 25, 38…

function decimalesDe(x) {
  for (let d = 0; d <= 6; d++) {
    const v = x * 10 ** d;
    if (Math.abs(Math.round(v) - v) < 1e-6) return d;
  }
  return 6;
}

/** Devuelve { max, paso, ticks, decimales } para un eje que empieza en 0. Como mucho `divisiones` tramos. */
export function escalaEje(valorMax, divisiones = 4) {
  if (!(valorMax > 0)) return { max: 1, paso: 0.25, ticks: [0, 0.25, 0.5, 0.75, 1], decimales: 2 };
  const bruto = valorMax / divisiones;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / potencia;
  const paso = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * potencia;
  const cantidad = Math.max(1, Math.ceil(valorMax / paso - 1e-9));
  const ticks = Array.from({ length: cantidad + 1 }, (_, i) => Number((i * paso).toPrecision(12)));
  return { max: ticks[ticks.length - 1], paso, ticks, decimales: decimalesDe(paso) };
}
