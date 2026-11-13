# Campus CO₂ · Energía eléctrica (Grupo 1)

Módulo frontend de carga, cálculo y visualización de la huella de carbono por electricidad (Alcance 2) de la UTN Facultad Regional Córdoba. Hecho con React y Vite. No tiene backend: consulta la API central de la cátedra.

## Estructura

| Ruta | Qué hay |
|---|---|
| `src/` | Código de la aplicación: carga, cálculo, resultados y panel de API. Modo claro y oscuro. |
| `src/lib/config.js` | Dirección y rutas de la API central (completar cuando la cátedra la entregue). |
| `src/lib/api.js` | Consultas y envíos a la API; usa datos locales si no está configurada. |
| `data/` | `energia_electrica_grupo1.json` (modelo de datos y relevamiento) y `aumentos_epec_sep2025_sep2026.json`. |
| `docs/` | Modelo de medición, documentación técnica y capturas. |

## Cómo correrlo

Requiere Node 18 o superior.

```bash
npm install
npm run dev        # desarrollo: http://localhost:5173
npm run build      # genera la carpeta dist/
npm run preview    # prueba local de dist/: http://localhost:4173
```

## Conectar la API central

1. Copiá `.env.example` como `.env`.
2. Completá `VITE_CENTRAL_API_URL` (y la clave, si la API la pide).
3. Ajustá las rutas en `src/lib/config.js` y los puntos marcados con `TODO` en `src/lib/api.js`.

Sin `VITE_CENTRAL_API_URL`, la pantalla muestra "Datos locales: API sin configurar" y trabaja con los datos de `data/`.

Las variables `VITE_*` quedan dentro del código que baja el navegador. No pongas claves que deban ser secretas. La API de la cátedra tiene que permitir CORS para que el navegador pueda consultarla.

## Publicar en Render (Static Site)

- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Variables de entorno:** `VITE_CENTRAL_API_URL` y, si hace falta, `VITE_CENTRAL_API_KEY`. Se aplican al compilar, así que después de cambiarlas hay que volver a desplegar.

## Documentación

- `docs/01-modelo-de-medicion.md`
- `docs/02-documentacion-tecnica.md`
