const cache = new Map();

function formatter(decimales) {
  if (!cache.has(decimales)) {
    cache.set(
      decimales,
      new Intl.NumberFormat("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }),
    );
  }
  return cache.get(decimales);
}

export const fmt = (n, decimales = 0) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : formatter(decimales).format(n);

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2024-08" -> "ago 2024"
export function periodoLegible(p) {
  const [a, m] = String(p).split("-");
  const i = Number(m) - 1;
  return MESES[i] ? `${MESES[i]} ${a}` : p;
}
