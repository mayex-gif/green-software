import { useCallback, useEffect, useMemo, useState } from "react";
import Carga from "./components/Carga.jsx";
import Calculo from "./components/Calculo.jsx";
import Resultados from "./components/Resultados.jsx";
import ApiPanel, { EtiquetaFuente } from "./components/ApiPanel.jsx";
import { calcularActividad, armarResultadosParaApi, resumir } from "./lib/calculo.js";
import * as api from "./lib/api.js";

const CLAVE_LOCALES = "co2-energia-locales";
const TABS = [
  { id: "carga", nombre: "Carga" },
  { id: "calculo", nombre: "Cálculo" },
  { id: "resultados", nombre: "Resultados" },
  { id: "api", nombre: "API central" },
];

function leerLocales() {
  try { return JSON.parse(localStorage.getItem(CLAVE_LOCALES) || "[]"); } catch { return []; }
}
function guardarLocales(l) {
  try { localStorage.setItem(CLAVE_LOCALES, JSON.stringify(l)); } catch { /* sin almacenamiento */ }
}

export default function App() {
  const [tema, setTema] = useState(() => document.documentElement.getAttribute("data-theme") || "light");
  const [tab, setTab] = useState("resultados");
  const [meta, setMeta] = useState({});
  const [factores, setFactores] = useState([]);
  const [edificios, setEdificios] = useState([]);
  const [base, setBase] = useState([]);
  const [locales, setLocales] = useState(leerLocales);
  const [factorId, setFactorId] = useState("");

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
    if (f.status === "fulfilled") {
      setFactores(f.value.data);
      setFactorId((actual) => actual || (f.value.data.find((x) => x.por_defecto) || f.value.data[0])?.id || "");
    }
    if (e.status === "fulfilled") setEdificios(e.value.data);
    if (a.status === "fulfilled") setBase(a.value.data);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const actividades = useMemo(() => {
    const ids = new Set(base.map((a) => a.id));
    return [...base, ...locales.filter((l) => !ids.has(l.id))];
  }, [base, locales]);

  const factor = factores.find((f) => f.id === factorId);
  const resultados = useMemo(
    () => (factor ? actividades.map((a) => calcularActividad(a, factor)) : []),
    [actividades, factor],
  );
  const resumen = useMemo(() => resumir(resultados, actividades), [resultados, actividades]);

  const agregar = (registro) => {
    const nuevos = [...locales, registro];
    setLocales(nuevos);
    guardarLocales(nuevos);
  };
  const quitar = (id) => {
    const nuevos = locales.filter((l) => l.id !== id);
    setLocales(nuevos);
    guardarLocales(nuevos);
  };

  const enviar = async () => {
    const salida = {};
    try { salida.datosActividad = await api.postDatosActividad(locales); }
    catch (e) { salida.datosActividad = { error: e.message }; }
    try { salida.resultados = await api.postResultados(armarResultadosParaApi(resultados)); }
    catch (e) { salida.resultados = { error: e.message }; }
    return salida;
  };

  const sinDatos = !factores.length || !edificios.length;

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
        {sinDatos ? (
          <p className="empty">Cargando factores y edificios…</p>
        ) : tab === "carga" ? (
          <Carga edificios={edificios} actividades={actividades} locales={locales} onAgregar={agregar} onQuitar={quitar} />
        ) : tab === "calculo" ? (
          <Calculo factores={factores} factorId={factorId} onFactor={setFactorId} resultados={resultados} edificios={edificios} />
        ) : tab === "resultados" ? (
          <Resultados resumen={resumen} resultados={resultados} edificios={edificios} factor={factor} />
        ) : (
          <ApiPanel meta={meta} onReintentar={cargar} onEnviar={enviar} locales={locales} resultados={resultados} />
        )}
      </main>
    </div>
  );
}
