// API de prueba local que imita a la de la cátedra, para probar la integración mientras la real no exista.
// No es parte del módulo (la consigna pide no tener API propia): solo sirve para probar en la PC.
//
// Uso:
//   npm run api-de-prueba                         (escucha en http://127.0.0.1:4180)
//   VITE_CENTRAL_API_URL=http://127.0.0.1:4180 npm run dev
//
// Devuelve un factor escrito como en la tabla de SNIGEIAR ("kg CO2/kWh") y otro con una unidad inválida,
// para comprobar que el módulo usa el primero y avisa del segundo. Muestra en consola lo que recibe por POST.

import http from "node:http";
import fs from "node:fs";

const seed = JSON.parse(fs.readFileSync(new URL("../data/energia_electrica_grupo1.json", import.meta.url), "utf8"));
const PUERTO = 4180;

const datos = {
  "/factores-emision": [
    { id: "FE-SNIGEIAR", valor: 0.283, unidad: "kg CO2/kWh", anio: 2022, fuente: "SNIGEIAR, Tabla 5 (unidad como en la tabla)", por_defecto: true, oficial: true },
    { id: "FE-INVALIDO", valor: 1, unidad: "lb/kWh", anio: 2025, fuente: "Unidad inválida a propósito" },
  ],
  "/edificios": seed.edificios,
  "/datos-actividad": seed.datos_actividad,
};
const RUTAS_POST = ["/datos-actividad", "/resultados-emisiones"];

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    if (req.method === "GET" && datos[req.url]) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(datos[req.url]));
    }
    if (req.method === "POST" && RUTAS_POST.includes(req.url)) {
      let cuerpo = "";
      req.on("data", (c) => (cuerpo += c));
      req.on("end", () => {
        const registros = JSON.parse(cuerpo);
        console.log(`POST ${req.url}: ${registros.length} registro(s)`);
        console.log(JSON.stringify(registros, null, 2));
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, recibidos: registros.length }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  })
  .listen(PUERTO, "127.0.0.1", () => console.log(`API de prueba en http://127.0.0.1:${PUERTO}`));
