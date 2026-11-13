import { useCallback, useEffect, useMemo, useState } from "react";
import Carga from "./components/Carga.jsx";
import Calculo from "./components/Calculo.jsx";
import Resultados from "./components/Resultados.jsx";
import ApiPanel, { EtiquetaFuente } from "./components/ApiPanel.jsx";
import {
  anioDe, aniosConDatos, armarResultadosParaApi, calcularActividad, coberturaAnual, factorValido, resumir,
} from "./lib/calculo.js";
import * as api from "./lib/api.js";

const CLAVE_LOCALES = "co2-energia-locales";
// Qué cargas ya se mandaron a la API central, para no reenviarlas: { actividad: [ids], resultados: [ids] }.
const CLAVE_ENVIADOS = "co2-energia-enviados";
const TABS = [
  { id: "carga", nombre: "Carga" },
  { id: "calculo", nombre: "Cálculo" },
  { id: "resultados", nombre: "Resultados" },
  { id: "api", nombre: "API central" },
];

function leer(clave, porDefecto) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto; } catch { return porDefecto; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}
function leerEnviados() {
  const e = leer(CLAVE_ENVIADOS, {});
  return {
    actividad: Array.isArray(e.actividad) ? e.actividad : [],
    resultados: Array.isArray(e.resultados) ? e.resultados : [],
  };
}

export default function App() {
  const [tema, setTema] = useState(() => document.documentElement.getAttribute("data-theme") || "light");
  const [tab, setTab] = useState("resultados");
  const [meta, setMeta] = useState({});
  const [factores, setFactores] = useState([]);
  const [edificios, setEdificios] = useState([]);
  const [base, setBase] = useState([]);
  const [locales, setLocales] = useState(() => leer(CLAVE_LOCALES, []));
  const [enviados, setEnviados] = useState(leerEnviados);
  const [factorId, setFactorId] = useState("");
  const [anio, setAnio] = useState("");

  const cambiarTema = () => {
    const nuevo = tema === "dark" ? "light" : "dark";
    setTema(nuevo);
    document.documentElement.setAttribute("data-theme", nuevo);
    try { localStorage.setItem("co2-tema", nuevo); } catch { /* sin almacenamiento */ }
  };

  const cargar = useCallback(async () => {
    const [f, e, a] = await Promise.allSettled([api.getFactoresEmision(), api.getEdificios(), api.getDatosActividad()]);
    const info = (r) => (r.status === "fulfilled" ? r.value : { source: "local-fallback", error: r.reason?.message });
    setMeta({ factores: info(f), edificios: info(e), actividad: info(a) });
    if (f.status === "fulfilled") setFactores(f.value.data);
    if (e.status === "fulfilled") setEdificios(e.value.data);
    if (a.status === "fulfilled") setBase(a.value.data);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const actividades = useMemo(() => {
    const ids = new Set(base.map((a) => a.id));
    return [...base, ...locales.filter((l) => !ids.has(l.id))];
  }, [base, locales]);

  // Solo se usan los factores con una unidad reconocida; los demás se informan en pantalla.
  const factoresValidos = useMemo(() => factores.filter(factorValido), [factores]);
  const factoresDescartados = factores.length - factoresValidos.length;
  const factor =
    factoresValidos.find((f) => f.id === factorId) ||
    factoresValidos.find((f) => f.por_defecto) ||
    factoresValidos[0];

  const resultados = useMemo(
    () => (factor ? actividades.map((a) => calcularActividad(a, factor)) : []),
    [actividades, factor],
  );

  // Año del inventario (calendario). Por defecto, el último año con datos.
  const anios = useMemo(() => aniosConDatos(actividades), [actividades]);
  const anioSel = anios.includes(anio) ? anio : anios[anios.length - 1] || "";
  const actividadesAnio = useMemo(() => actividades.filter((a) => anioDe(a.periodo) === anioSel), [actividades, anioSel]);
  const resultadosAnio = useMemo(() => resultados.filter((r) => anioDe(r.periodo) === anioSel), [resultados, anioSel]);
  const resumen = useMemo(() => resumir(resultadosAnio, actividadesAnio), [resultadosAnio, actividadesAnio]);
  const cobertura = useMemo(() => coberturaAnual(actividadesAnio, edificios), [actividadesAnio, edificios]);

  const agregar = (registro) => {
    const nuevos = [...locales, registro];
    setLocales(nuevos);
    guardar(CLAVE_LOCALES, nuevos);
  };
  const quitar = (id) => {
    const nuevos = locales.filter((l) => l.id !== id);
    setLocales(nuevos);
    guardar(CLAVE_LOCALES, nuevos);
  };

  // Se envía solo lo que falta: primero los datos de actividad nuevos y, cuando la API los aceptó,
  // los resultados de esos mismos datos. Así no hay duplicados ni resultados sin su dato de actividad.
  const pendientes = locales.filter((l) => !enviados.resultados.includes(l.id)).length;
  const enviar = async () => {
    const salida = {};
    let marcados = enviados;
    const marcar = (tipo, ids) => {
      marcados = { ...marcados, [tipo]: [...marcados[tipo], ...ids] };
      setEnviados(marcados);
      guardar(CLAVE_ENVIADOS, marcados);
    };

    const actividadPendiente = locales.filter((l) => !marcados.actividad.includes(l.id));
    if (actividadPendiente.length) {
      try {
        salida.datosActividad = await api.postDatosActividad(actividadPendiente);
        marcar("actividad", actividadPendiente.map((a) => a.id));
      } catch (e) {
        salida.datosActividad = { error: e.message };
        return salida;
      }
    }

    const resultadosPendientes = resultados.filter(
      (r) => marcados.actividad.includes(r.actividad_id) && !marcados.resultados.includes(r.actividad_id),
    );
    if (resultadosPendientes.length) {
      try {
        salida.resultados = await api.postResultados(armarResultadosParaApi(resultadosPendientes));
        marcar("resultados", resultadosPendientes.map((r) => r.actividad_id));
      } catch (e) {
        salida.resultados = { error: e.message };
      }
    }
    return salida;
  };

  const cargando = !meta.factores || !meta.edificios;

  let contenido;
  if (tab === "api") {
    // La pestaña de la API se muestra siempre, aunque falten datos: es donde se reintenta la consulta.
    contenido = (
      <ApiPanel
        meta={meta} onReintentar={cargar} onEnviar={enviar} pendientes={pendientes}
        resultados={resultados} factoresDescartados={factoresDescartados}
      />
    );
  } else if (cargando) {
    contenido = <p className="empty">Cargando factores y edificios…</p>;
  } else if (!factor) {
    contenido = <p className="empty">No hay un factor de emisión utilizable. Revisá la pestaña API central.</p>;
  } else if (!edificios.length) {
    contenido = <p className="empty">No hay edificios cargados. Revisá la pestaña API central.</p>;
  } else if (tab === "carga") {
    contenido = (
      <Carga
        edificios={edificios} actividades={actividades} locales={locales} enviados={enviados.actividad}
        onAgregar={agregar} onQuitar={quitar}
      />
    );
  } else if (tab === "calculo") {
    contenido = (
      <Calculo
        factores={factoresValidos} factorId={factor.id} onFactor={setFactorId} resultados={resultados}
        edificios={edificios} factoresDescartados={factoresDescartados}
      />
    );
  } else {
    contenido = (
      <Resultados
        resumen={resumen} resultados={resultadosAnio} edificios={edificios} factor={factor}
        anio={anioSel} anios={anios} onAnio={setAnio} cobertura={cobertura}
      />
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Energía eléctrica</h1>
          <p>Campus CO₂ · UTN Facultad Regional Córdoba · Grupo 1</p>
        </div>
        <div className="topbar-actions">
          <EtiquetaFuente meta={meta.actividad} />
          <button className="btn" type="button" onClick={cambiarTema} aria-pressed={tema === "dark"}>
            {tema === "dark" ? "Modo claro" : "Modo oscuro"}
          </button>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Secciones">
        {TABS.map((t) => (
          <button
            key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`} className="tab" onClick={() => setTab(t.id)}
          >
            {t.nombre}
          </button>
        ))}
      </nav>

      <main id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {contenido}
      </main>
    </div>
  );
}
