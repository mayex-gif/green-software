# Modelo de medición · Energía eléctrica (Grupo 1)

Facultad Regional Córdoba, UTN. Cátedra GreenSoftware, trabajo "Campus CO₂".

## 1. Qué se mide

La **electricidad que la facultad compra a la red** (distribuidora EPEC) y las emisiones de gases de efecto invernadero asociadas a generarla.

- Se mide por **suministro** (cada medidor/contrato de EPEC), no por aula. El suministro se asigna a un edificio de la facultad.
- La fuente es la **factura mensual de EPEC**. El medidor registra el consumo en tres franjas horarias.
- Resultado: toneladas de CO₂ equivalente (tCO₂e) por suministro, por mes y por año.

## 2. Variables

| Variable | Símbolo | Unidad | De dónde sale | Para qué se usa |
|---|---|---|---|---|
| Energía en pico | E_pico | kWh | Factura, detalle de lectura (código EAP) | Cálculo |
| Energía en resto | E_resto | kWh | Factura (EAR) | Cálculo |
| Energía en valle | E_valle | kWh | Factura (EAV) | Cálculo |
| Energía total | E | kWh | E_pico + E_resto + E_valle | Cálculo |
| Factor de emisión de la red | FE | kgCO₂e/kWh | API central o fuente oficial | Cálculo |
| Demanda en pico | D_pico | kW | Factura (demanda facturada) | Indicador |
| Demanda fuera de pico | D_fp | kW | Factura | Indicador |
| Coseno φ | cos φ | adimensional (0 a 1) | Factura | Indicador de calidad de la energía |
| Total facturado | C | pesos | Factura | Indicador de costo ($/kWh) |
| Período | p | AAAA-MM | Factura (período leído) | Clave temporal |

Franjas horarias de EPEC: **pico**, **resto** y **valle**. Los horarios exactos están en el cuadro tarifario de EPEC (pendiente de confirmar; ver `02-documentacion-tecnica.md`, sección 9).

## 3. Fórmulas

Para cada suministro *s* y mes *p*:

```
E(s,p)      = E_pico + E_resto + E_valle                [kWh]
CO2e(s,p)   = E(s,p) × FE                               [kgCO2e]
CO2e(s,p)   = CO2e [kg] / 1000                          [tCO2e]
Anual(s)    = suma de CO2e(s,p) sobre los 12 meses
Total       = suma de Anual(s) sobre todos los suministros
```

Conversiones que hace el módulo:

| Entrada | Salida |
|---|---|
| 1 MWh | 1.000 kWh |
| 1 GWh | 1.000.000 kWh |
| 1 tCO₂e/MWh | 1 kgCO₂e/kWh |
| 1 gCO₂e/kWh | 0,001 kgCO₂e/kWh |
| 1.000 kgCO₂e | 1 tCO₂e |

## 4. Periodicidad

- **Dato de entrada: mensual** (una factura por suministro y mes). No se aceptan meses futuros.
- **Resultado del inventario: anual**, como pide la consigna. El año del inventario es el **año calendario** (enero a diciembre) y se elige en la pantalla de Resultados.
- **Cobertura por suministro:** el año está completo solo cuando **cada** suministro tiene sus 12 meses de ese año. Si a alguno le falta un mes, el módulo avisa que el total no representa el año y muestra cuántos meses tiene cada uno.
- Si la cátedra define otra ventana de 12 meses (por ejemplo, sep a ago), hay que cambiar el filtro por año (`anioDe` y `coberturaAnual` en `src/lib/calculo.js`).

## 5. Alcance

| Alcance | ¿Qué incluye? | En este módulo |
|---|---|---|
| **1** | Emisiones directas de fuentes propias (calderas, grupos electrógenos, vehículos propios) | **No aplica.** La electricidad de la red no se genera en la facultad. Si hay un grupo electrógeno, su combustible lo carga el grupo de combustibles. |
| **2** | Emisiones indirectas por electricidad comprada | **Sí. Es todo lo que calcula este módulo.** |
| **3** | Otras emisiones indirectas de la cadena (por ejemplo, pérdidas en transmisión y distribución) | **No se calcula.** Queda documentado como mejora posible. |
| **Evitadas** | Emisiones que se dejan de emitir (paneles solares, LED) | **No aplica** aquí. Las informa el grupo de proyectos de mitigación. |

Método de contabilidad: **basado en ubicación** (*location-based*), con el factor promedio de la red eléctrica argentina. No se usa el método de mercado porque no hay contratos de energía renovable.

## 6. Qué entrega el módulo

1. Datos de actividad (kWh por franja, por suministro y mes) para la API central.
2. Resultados de emisiones (kgCO₂e y tCO₂e), con la fórmula y el factor usado.
3. Indicadores propios de la dimensión: energía en pico (%), costo medio ($/kWh), demanda máxima, coseno φ y cobertura anual por suministro.
