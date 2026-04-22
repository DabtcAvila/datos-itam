# ENIGH 2024 NS — Inventario de datos crudos

Generado por `api/scripts/explore_enigh.py` (stdlib-only).  
Fuente: `/Users/davicho/datos-itam/data-sources/conjunto_de_datos_enigh2024_ns_csv`

## Resumen agregado

- Datasets encontrados: **17**
- Filas totales (suma): **7 281 164**
- Columnas totales (suma): **957**
- Columnas únicas por nombre: **768**
- Bytes en disco (datos primarios): **838.9 MB**

### Warnings detectados

- `hogares`: columna 100% nula: nr_viv
- `noagro`: columna 100% nula: nvo_prog3
- `noagro`: columna 100% nula: nvo_act3
- `noagro`: columna 100% nula: nvo_cant3
- `poblacion`: columna 100% nula: norecib_10
- `poblacion`: columna 100% nula: razon_2

## Tabla-resumen por dataset

| Dataset | Filas | Cols | Tamaño | Encoding | Sep | Llaves presentes |
|---|---:|---:|---:|---|---|---|
| `agro` | 17 442 | 66 | 2.7 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `agroconsumo` | 43 992 | 11 | 1.6 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `agrogasto` | 61 132 | 7 | 1.7 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `agroproductos` | 69 052 | 25 | 4.4 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `concentradohogar` | 91 414 | 126 | 43.5 MB | utf-8 | `,` | foliohog, folioviv |
| `erogaciones` | 69 162 | 16 | 4.6 MB | utf-8 | `,` | foliohog, folioviv |
| `gastoshogar` | 5 311 497 | 31 | 552.2 MB | utf-8 | `,` | foliohog, folioviv |
| `gastospersona` | 377 073 | 23 | 30.9 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `gastotarjetas` | 19 464 | 6 | 627.6 KB | utf-8 | `,` | foliohog, folioviv |
| `hogares` | 91 414 | 148 | 24.3 MB | utf-8 | `,` | foliohog, folioviv |
| `ingresos` | 391 563 | 21 | 33.6 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `ingresos_jcf` | 327 | 18 | 24.2 KB | utf-8 | `,` | foliohog, folioviv, numren |
| `noagro` | 23 109 | 115 | 6.5 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `noagroimportes` | 151 276 | 17 | 9.3 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `poblacion` | 308 598 | 185 | 88.5 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `trabajos` | 164 325 | 60 | 19.2 MB | utf-8 | `,` | foliohog, folioviv, numren |
| `viviendas` | 90 324 | 82 | 15.4 MB | utf-8 | `,` | folioviv |

## Detalle por dataset

### `agro`

- CSV: `conjunto_de_datos_agro_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_agro_enigh2024_ns.csv`
- Tamaño: 2.7 MB — 17 442 filas × 66 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 0.2s
- Diccionario oficial INEGI: `diccionario_datos_agro_enigh2024_ns.csv` — 66 variables documentadas
- Catálogos INEGI en carpeta (`9`): `fpago.csv`, `id_trabajo.csv`, `mes.csv`, `nofpago.csv`, `nvo_act.csv`, `nvo_prog.csv`, `reg_cont.csv`, `si_no.csv`, `tipoact.csv`
- Modelo ER: `modelo_er_agro_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 3, `folioviv` = 11 815, `numren` = 10

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 17 442 | 0 | 0.0% | '0100061705', '0100068701', '0100073403' |
| 2 | `foliohog` | INT | 17 442 | 0 | 0.0% | '1', '1', '2' |
| 3 | `numren` | INT | 17 442 | 0 | 0.0% | '01', '02', '01' |
| 4 | `id_trabajo` | INT | 17 442 | 0 | 0.0% | '2', '1', '1' |
| 5 | `tipoact` | INT | 17 442 | 0 | 0.0% | '5', '4', '5' |
| 6 | `cose_cria` | INT | 17 442 | 0 | 0.0% | '1', '1', '1' |
| 7 | `prep_deriv` | INT | 17 442 | 10 124 | 58.0% | '2', '2', '2' |
| 8 | `otro_pago` | INT | 17 442 | 0 | 0.0% | '2', '2', '2' |
| 9 | `fpago_1` | INT | 17 442 | 17 438 | 100.0% | '1', '1', '1' |
| 10 | `fpago_2` | INT | 17 442 | 16 987 | 97.4% | '2', '2', '2' |
| 11 | `fpago_3` | INT | 17 442 | 17 437 | 100.0% | '3', '3', '3' |
| 12 | `fpago_4` | INT | 17 442 | 17 426 | 99.9% | '4', '4', '4' |
| 13 | `fpago_5` | INT | 17 442 | 17 283 | 99.1% | '5', '5', '5' |
| 14 | `fpago_6` | INT | 17 442 | 17 433 | 99.9% | '6', '6', '6' |
| 15 | `fpago_7` | INT | 17 442 | 17 439 | 100.0% | '7', '7', '7' |
| 16 | `fpago_8` | INT | 17 442 | 17 403 | 99.8% | '8', '8', '8' |
| 17 | `nofpago` | INT | 17 442 | 646 | 3.7% | '6', '1', '6' |
| 18 | `t_emp` | INT | 17 442 | 0 | 0.0% | '1', '0', '0' |
| 19 | `h_emp` | INT | 17 442 | 9 499 | 54.5% | '1', '1', '5' |
| 20 | `m_emp` | INT | 17 442 | 9 499 | 54.5% | '0', '0', '0' |
| 21 | `t_cpago` | INT | 17 442 | 9 499 | 54.5% | '0', '1', '5' |
| 22 | `h_cpago` | INT | 17 442 | 14 319 | 82.1% | '1', '5', '1' |
| 23 | `m_cpago` | INT | 17 442 | 14 319 | 82.1% | '0', '0', '0' |
| 24 | `t_ispago` | INT | 17 442 | 9 499 | 54.5% | '0', '0', '0' |
| 25 | `h_ispago` | INT | 17 442 | 12 774 | 73.2% | '1', '1', '1' |
| 26 | `m_ispago` | INT | 17 442 | 12 774 | 73.2% | '1', '0', '0' |
| 27 | `t_nispago` | INT | 17 442 | 9 499 | 54.5% | '1', '0', '0' |
| 28 | `h_nispago` | INT | 17 442 | 16 240 | 93.1% | '1', '3', '1' |
| 29 | `m_nispago` | INT | 17 442 | 16 240 | 93.1% | '0', '0', '0' |
| 30 | `valrema` | INT | 17 442 | 8 093 | 46.4% | '90000', '146000', '75000' |
| 31 | `valproc` | INT | 17 442 | 4 303 | 24.7% | '109000', '6000', '30000' |
| 32 | `apoyo` | INT | 17 442 | 0 | 0.0% | '2', '2', '2' |
| 33 | `apoyo_1` | INT | 17 442 | 17 435 | 100.0% | '4000', '3000', '3000' |
| 34 | `apoyo_2` | INT | 17 442 | 17 436 | 100.0% | '5000', '140000', '5000' |
| 35 | `apoyo_3` | INT | 17 442 | 17 438 | 100.0% | '5600', '700', '2400' |
| 36 | `apoyo_4` | INT | 17 442 | 17 376 | 99.6% | '1000', '7200', '7000' |
| 37 | `apoyo_5` | INT | 17 442 | 17 391 | 99.7% | '4000', '3000', '5120' |
| 38 | `apoyo_6` | INT | 17 442 | 17 383 | 99.7% | '160', '1200', '1000' |
| 39 | `apoyo_7` | INT | 17 442 | 17 367 | 99.6% | '90000', '12000', '11200' |
| 40 | `apoyo_8` | INT | 17 442 | 17 263 | 99.0% | '2000', '70', '3000' |
| 41 | `proagro` | INT | 17 442 | 15 062 | 86.4% | '3450', '11000', '11000' |
| 42 | `mesproc` | INT | 17 442 | 15 055 | 86.3% | '02', '03', '03' |
| 43 | `progan` | INT | 17 442 | 17 414 | 99.8% | '7000', '5000', '6700' |
| 44 | `mesprogan` | INT | 17 442 | 17 413 | 99.8% | '02', '05', '12' |
| 45 | `nvo_apoyo` | INT | 17 442 | 0 | 0.0% | '2', '2', '2' |
| 46 | `nvo_prog1` | INT | 17 442 | 14 405 | 82.6% | '2015', '2011', '2005' |
| 47 | `nvo_act1` | INT | 17 442 | 14 405 | 82.6% | '4', '4', '4' |
| 48 | `nvo_cant1` | INT | 17 442 | 14 405 | 82.6% | '1200', '20000', '900' |
| 49 | `nvo_prog2` | INT | 17 442 | 17 219 | 98.7% | '2011', '2011', '2012' |
| 50 | `nvo_act2` | INT | 17 442 | 17 219 | 98.7% | '4', '4', '4' |
| 51 | `nvo_cant2` | INT | 17 442 | 17 219 | 98.7% | '8400', '8500', '8400' |
| 52 | `nvo_prog3` | INT | 17 442 | 17 436 | 100.0% | '2013', '2002', '2013' |
| 53 | `nvo_act3` | INT | 17 442 | 17 436 | 100.0% | '4', '7', '4' |
| 54 | `nvo_cant3` | INT | 17 442 | 17 436 | 100.0% | '3000', '3000', '15000' |
| 55 | `reg_not` | INT | 17 442 | 0 | 0.0% | '2', '2', '2' |
| 56 | `reg_cont` | INT | 17 442 | 0 | 0.0% | '4', '4', '3' |
| 57 | `ventas` | INT | 17 442 | 0 | 0.0% | '0', '0', '175000' |
| 58 | `autocons` | INT | 17 442 | 0 | 0.0% | '0', '0', '0' |
| 59 | `otrosnom` | INT | 17 442 | 0 | 0.0% | '0', '0', '0' |
| 60 | `gasneg` | INT | 17 442 | 0 | 0.0% | '36000', '109000', '108800' |
| 61 | `ventas_tri` | NUMERIC | 17 442 | 0 | 0.0% | '0', '0', '42798.91' |
| 62 | `auto_tri` | NUMERIC | 17 442 | 0 | 0.0% | '0', '0', '0' |
| 63 | `otros_tri` | INT | 17 442 | 0 | 0.0% | '0', '0', '0' |
| 64 | `gasto_tri` | NUMERIC | 17 442 | 0 | 0.0% | '8852.45', '26803.27', '26608.69' |
| 65 | `ing_tri` | NUMERIC | 17 442 | 0 | 0.0% | '0', '0', '16188.26' |
| 66 | `ero_tri` | NUMERIC | 17 442 | 0 | 0.0% | '8852.45', '26802.29', '0' |

### `agroconsumo`

- CSV: `conjunto_de_datos_agroconsumo_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_agroconsumo_enigh2024_ns.csv`
- Tamaño: 1.6 MB — 43 992 filas × 11 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 0.1s
- Diccionario oficial INEGI: `diccionario_datos_agroconsumo_enigh2024_ns.csv` — 11 variables documentadas
- Catálogos INEGI en carpeta (`5`): `destino.csv`, `id_trabajo.csv`, `productoagricola.csv`, `si_no_noaplica.csv`, `tipoact.csv`
- Modelo ER: `modelo_er_agroconsumo_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 3, `folioviv` = 9 581, `numren` = 10

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 43 992 | 0 | 0.0% | '0100162004', '0100162004', '0100162004' |
| 2 | `foliohog` | INT | 43 992 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 43 992 | 0 | 0.0% | '02', '02', '02' |
| 4 | `id_trabajo` | INT | 43 992 | 0 | 0.0% | '1', '1', '1' |
| 5 | `tipoact` | INT | 43 992 | 0 | 0.0% | '4', '4', '4' |
| 6 | `numprod` | INT | 43 992 | 0 | 0.0% | '05', '02', '01' |
| 7 | `codigo` | INT | 43 992 | 0 | 0.0% | '194', '140', '098' |
| 8 | `cosecha` | INT | 43 992 | 0 | 0.0% | '1', '1', '1' |
| 9 | `destino` | INT | 43 992 | 0 | 0.0% | '7', '1', '1' |
| 10 | `cantidad` | INT | 43 992 | 0 | 0.0% | '500', '1000', '500' |
| 11 | `valestim` | INT | 43 992 | 0 | 0.0% | '2500', '8000', '7500' |

### `agrogasto`

- CSV: `conjunto_de_datos_agrogasto_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_agrogasto_enigh2024_ns.csv`
- Tamaño: 1.7 MB — 61 132 filas × 7 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 0.1s
- Diccionario oficial INEGI: `diccionario_datos_agrogasto_enigh2024_ns.csv` — 7 variables documentadas
- Catálogos INEGI en carpeta (`3`): `gastonegocioagro.csv`, `id_trabajo.csv`, `tipoact.csv`
- Modelo ER: `modelo_er_agrogasto_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 3, `folioviv` = 11 319, `numren` = 10

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 61 132 | 0 | 0.0% | '0100061705', '0100061705', '0100061705' |
| 2 | `foliohog` | INT | 61 132 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 61 132 | 0 | 0.0% | '01', '01', '01' |
| 4 | `id_trabajo` | INT | 61 132 | 0 | 0.0% | '2', '2', '2' |
| 5 | `tipoact` | INT | 61 132 | 0 | 0.0% | '5', '5', '5' |
| 6 | `clave` | TEXT | 61 132 | 0 | 0.0% | 'C06', 'C07', 'C08' |
| 7 | `gasto` | INT | 61 132 | 0 | 0.0% | '1400', '15000', '17500' |

### `agroproductos`

- CSV: `conjunto_de_datos_agroproductos_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_agroproductos_enigh2024_ns.csv`
- Tamaño: 4.4 MB — 69 052 filas × 25 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 0.3s
- Diccionario oficial INEGI: `diccionario_datos_agroproductos_enigh2024_ns.csv` — 25 variables documentadas
- Catálogos INEGI en carpeta (`7`): `causa_no_cosecha.csv`, `cicloagr.csv`, `id_trabajo.csv`, `productoagricola.csv`, `si_no.csv`, `si_no_noaplica.csv`, `tipoact.csv`
- Modelo ER: `modelo_er_agroproductos_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 3, `folioviv` = 11 772, `numren` = 10

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 69 052 | 0 | 0.0% | '0100061705', '0100068701', '0100068701' |
| 2 | `foliohog` | INT | 69 052 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 69 052 | 0 | 0.0% | '01', '02', '02' |
| 4 | `id_trabajo` | INT | 69 052 | 0 | 0.0% | '2', '1', '1' |
| 5 | `tipoact` | INT | 69 052 | 0 | 0.0% | '5', '4', '4' |
| 6 | `numprod` | INT | 69 052 | 0 | 0.0% | '01', '01', '02' |
| 7 | `codigo` | INT | 69 052 | 0 | 0.0% | '240', '141', '098' |
| 8 | `cosecha` | INT | 69 052 | 0 | 0.0% | '0', '2', '2' |
| 9 | `aparce` | INT | 69 052 | 750 | 1.1% | '2', '2', '2' |
| 10 | `nocos` | INT | 69 052 | 59 865 | 86.7% | '1', '1', '1' |
| 11 | `vendio` | INT | 69 052 | 9 184 | 13.3% | '2', '1', '1' |
| 12 | `uso_hog` | INT | 69 052 | 9 184 | 13.3% | '2', '2', '2' |
| 13 | `uso_prod` | INT | 69 052 | 9 185 | 13.3% | '2', '2', '2' |
| 14 | `deu_hog` | INT | 69 052 | 9 185 | 13.3% | '2', '2', '2' |
| 15 | `deu_neg` | INT | 69 052 | 9 185 | 13.3% | '2', '2', '2' |
| 16 | `pag_trab` | INT | 69 052 | 9 185 | 13.3% | '2', '2', '2' |
| 17 | `uso_reg` | INT | 69 052 | 9 185 | 13.3% | '2', '2', '2' |
| 18 | `uso_int` | INT | 69 052 | 9 185 | 13.3% | '2', '2', '2' |
| 19 | `cicloagr` | INT | 69 052 | 40 690 | 58.9% | '1', '1', '2' |
| 20 | `cantidad` | INT | 69 052 | 9 187 | 13.3% | '9', '78', '40' |
| 21 | `cant_venta` | INT | 69 052 | 51 228 | 74.2% | '40', '20', '4500' |
| 22 | `vtapie` | INT | 69 052 | 68 905 | 99.8% | '30000', '30000', '60000' |
| 23 | `valor` | INT | 69 052 | 9 187 | 13.3% | '90000', '348000', '30000' |
| 24 | `preciokg` | NUMERIC | 69 052 | 9 185 | 13.3% | '10000', '4000', '750' |
| 25 | `val_venta` | INT | 69 052 | 51 228 | 74.2% | '160000', '15000', '225000' |

### `concentradohogar`

- CSV: `conjunto_de_datos_concentradohogar_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_concentradohogar_enigh2024_ns.csv`
- Tamaño: 43.5 MB — 91 414 filas × 126 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 1.8s
- Diccionario oficial INEGI: `diccionario_datos_concentradohogar_enigh2024_ns.csv` — 126 variables documentadas
- Catálogos INEGI en carpeta (`6`): `clase_hog.csv`, `educa_jefe.csv`, `est_socio.csv`, `sexo.csv`, `tam_loc.csv`, `ubica_geo.csv`
- Modelo ER: `modelo_er_concentradohogar_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 4, `folioviv` = 90 324

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 91 414 | 0 | 0.0% | '0100001901', '0100001902', '0100001904' |
| 2 | `foliohog` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 3 | `ubica_geo` | INT | 91 414 | 0 | 0.0% | '01001', '01001', '01001' |
| 4 | `tam_loc` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 5 | `est_socio` | INT | 91 414 | 0 | 0.0% | '3', '3', '3' |
| 6 | `est_dis` | INT | 91 414 | 0 | 0.0% | '001', '001', '001' |
| 7 | `upm` | INT | 91 414 | 0 | 0.0% | '0000001', '0000001', '0000001' |
| 8 | `factor` | INT | 91 414 | 0 | 0.0% | '207', '207', '207' |
| 9 | `clase_hog` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 10 | `sexo_jefe` | INT | 91 414 | 0 | 0.0% | '1', '1', '2' |
| 11 | `edad_jefe` | INT | 91 414 | 0 | 0.0% | '32', '48', '60' |
| 12 | `educa_jefe` | INT | 91 414 | 0 | 0.0% | '06', '09', '06' |
| 13 | `tot_integ` | INT | 91 414 | 0 | 0.0% | '4', '4', '2' |
| 14 | `hombres` | INT | 91 414 | 0 | 0.0% | '2', '2', '1' |
| 15 | `mujeres` | INT | 91 414 | 0 | 0.0% | '2', '2', '1' |
| 16 | `mayores` | INT | 91 414 | 0 | 0.0% | '2', '4', '2' |
| 17 | `menores` | INT | 91 414 | 0 | 0.0% | '2', '0', '0' |
| 18 | `p12_64` | INT | 91 414 | 0 | 0.0% | '2', '4', '2' |
| 19 | `p65mas` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 20 | `ocupados` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 21 | `percep_ing` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 22 | `perc_ocupa` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 23 | `ing_cor` | NUMERIC | 91 414 | 0 | 0.0% | '138232.38', '118014.04', '46866.32' |
| 24 | `ingtrab` | NUMERIC | 91 414 | 0 | 0.0% | '130518.1', '103829.72', '45580.61' |
| 25 | `trabajo` | NUMERIC | 91 414 | 0 | 0.0% | '130518.1', '103829.72', '45580.61' |
| 26 | `sueldos` | NUMERIC | 91 414 | 0 | 0.0% | '78299.99', '76304.34', '41086.94' |
| 27 | `horas_extr` | NUMERIC | 91 414 | 0 | 0.0% | '18195.64', '0', '0' |
| 28 | `comisiones` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 29 | `aguinaldo` | NUMERIC | 91 414 | 0 | 0.0% | '9048.9', '9782.6', '122.28' |
| 30 | `indemtrab` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 31 | `otra_rem` | NUMERIC | 91 414 | 0 | 0.0% | '4402.17', '0', '0' |
| 32 | `remu_espec` | NUMERIC | 91 414 | 0 | 0.0% | '20571.4', '17742.78', '4371.39' |
| 33 | `negocio` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 34 | `noagrop` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 35 | `industria` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 36 | `comercio` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 37 | `servicios` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 38 | `agrope` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 39 | `agricolas` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 40 | `pecuarios` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 41 | `reproducc` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 42 | `pesca` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 43 | `otros_trab` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 44 | `rentas` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 45 | `utilidad` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 46 | `arrenda` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 47 | `transfer` | NUMERIC | 91 414 | 0 | 0.0% | '7714.28', '2571.42', '1285.71' |
| 48 | `jubilacion` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 49 | `becas` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 50 | `donativos` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 51 | `remesas` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 52 | `bene_gob` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 53 | `transf_hog` | NUMERIC | 91 414 | 0 | 0.0% | '7714.28', '2571.42', '1285.71' |
| 54 | `trans_inst` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 55 | `estim_alqu` | NUMERIC | 91 414 | 0 | 0.0% | '0', '11612.9', '0' |
| 56 | `otros_ing` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 57 | `gasto_mon` | NUMERIC | 91 414 | 0 | 0.0% | '47478.66', '38782.74', '28601.26' |
| 58 | `alimentos` | NUMERIC | 91 414 | 0 | 0.0% | '17858.49', '22384.13', '9382.81' |
| 59 | `ali_dentro` | NUMERIC | 91 414 | 0 | 0.0% | '8421.36', '13641.3', '9382.81' |
| 60 | `cereales` | NUMERIC | 91 414 | 0 | 0.0% | '809.99', '1079.96', '2005.7' |
| 61 | `carnes` | NUMERIC | 91 414 | 0 | 0.0% | '835.7', '4114.27', '1928.56' |
| 62 | `pescado` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 63 | `leche` | NUMERIC | 91 414 | 0 | 0.0% | '1954.28', '1182.84', '1131.41' |
| 64 | `huevo` | NUMERIC | 91 414 | 0 | 0.0% | '385.71', '0', '617.14' |
| 65 | `aceites` | NUMERIC | 91 414 | 0 | 0.0% | '0', '2314.28', '0' |
| 66 | `tuberculo` | NUMERIC | 91 414 | 0 | 0.0% | '0', '385.71', '0' |
| 67 | `verduras` | NUMERIC | 91 414 | 0 | 0.0% | '347.13', '964.27', '1115.73' |
| 68 | `frutas` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '128.57' |
| 69 | `azucar` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '642.85' |
| 70 | `cafe` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 71 | `especias` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '527.14' |
| 72 | `otros_alim` | NUMERIC | 91 414 | 0 | 0.0% | '3728.56', '2571.42', '1285.71' |
| 73 | `bebidas` | NUMERIC | 91 414 | 0 | 0.0% | '359.99', '1028.55', '0' |
| 74 | `ali_fuera` | NUMERIC | 91 414 | 0 | 0.0% | '9437.13', '8742.83', '0' |
| 75 | `tabaco` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 76 | `vesti_calz` | NUMERIC | 91 414 | 0 | 0.0% | '635.86', '0', '0' |
| 77 | `vestido` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 78 | `calzado` | NUMERIC | 91 414 | 0 | 0.0% | '635.86', '0', '0' |
| 79 | `vivienda` | NUMERIC | 91 414 | 0 | 0.0% | '6475.63', '1990', '4731.86' |
| 80 | `alquiler` | NUMERIC | 91 414 | 0 | 0.0% | '4354.83', '0', '2903.22' |
| 81 | `pred_cons` | NUMERIC | 91 414 | 0 | 0.0% | '0', '100', '0' |
| 82 | `agua` | INT | 91 414 | 0 | 0.0% | '1200', '990', '585' |
| 83 | `energia` | NUMERIC | 91 414 | 0 | 0.0% | '920.8', '900', '1243.64' |
| 84 | `limpieza` | NUMERIC | 91 414 | 0 | 0.0% | '3811.92', '1637.39', '966.74' |
| 85 | `cuidados` | NUMERIC | 91 414 | 0 | 0.0% | '3811.92', '1637.39', '966.74' |
| 86 | `utensilios` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 87 | `enseres` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 88 | `salud` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '1128.91' |
| 89 | `ambul_serv` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '489.13' |
| 90 | `aten_hosp` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 91 | `medic_prod` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '639.78' |
| 92 | `transporte` | NUMERIC | 91 414 | 0 | 0.0% | '9929.03', '8796.76', '11009.03' |
| 93 | `publico` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 94 | `foraneo` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 95 | `adqui_vehi` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 96 | `mantenim` | NUMERIC | 91 414 | 0 | 0.0% | '6967.74', '4354.83', '6967.74' |
| 97 | `refaccion` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 98 | `combus` | NUMERIC | 91 414 | 0 | 0.0% | '6967.74', '4354.83', '6967.74' |
| 99 | `comunica` | NUMERIC | 91 414 | 0 | 0.0% | '2961.29', '4441.93', '4041.29' |
| 100 | `educa_espa` | NUMERIC | 91 414 | 0 | 0.0% | '8651.61', '839.02', '0' |
| 101 | `educacion` | NUMERIC | 91 414 | 0 | 0.0% | '8651.61', '0', '0' |
| 102 | `esparci` | NUMERIC | 91 414 | 0 | 0.0% | '0', '839.02', '0' |
| 103 | `paq_turist` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 104 | `personales` | NUMERIC | 91 414 | 0 | 0.0% | '116.12', '3135.44', '1381.91' |
| 105 | `cuida_pers` | NUMERIC | 91 414 | 0 | 0.0% | '116.12', '3135.44', '1381.91' |
| 106 | `acces_pers` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 107 | `otros_gas` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 108 | `transf_gas` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 109 | `percep_tot` | NUMERIC | 91 414 | 0 | 0.0% | '13499.97', '0', '5435.96' |
| 110 | `retiro_inv` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 111 | `prestamos` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 112 | `otras_perc` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 113 | `ero_nm_viv` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 114 | `ero_nm_hog` | NUMERIC | 91 414 | 0 | 0.0% | '13499.97', '0', '5435.96' |
| 115 | `erogac_tot` | NUMERIC | 91 414 | 0 | 0.0% | '29582.6', '8709.67', '4695.65' |
| 116 | `cuota_viv` | NUMERIC | 91 414 | 0 | 0.0% | '0', '8709.67', '0' |
| 117 | `mater_serv` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 118 | `material` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 119 | `servicio` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 120 | `deposito` | NUMERIC | 91 414 | 0 | 0.0% | '21365.21', '0', '4695.65' |
| 121 | `prest_terc` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 122 | `pago_tarje` | NUMERIC | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 123 | `deudas` | NUMERIC | 91 414 | 0 | 0.0% | '8217.39', '0', '0' |
| 124 | `balance` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 125 | `otras_erog` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 126 | `smg` | NUMERIC | 91 414 | 0 | 0.0% | '22403.7', '22403.7', '22403.7' |

### `erogaciones`

- CSV: `conjunto_de_datos_erogaciones_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_erogaciones_enigh2024_ns.csv`
- Tamaño: 4.6 MB — 69 162 filas × 16 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 0.2s
- Diccionario oficial INEGI: `diccionario_datos_erogaciones_enigh2024_ns.csv` — 16 variables documentadas
- Catálogos INEGI en carpeta (`2`): `mes.csv`, `producto.csv`
- Modelo ER: `modelo_er_erogaciones_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 4, `folioviv` = 48 876

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 69 162 | 0 | 0.0% | '0100001901', '0100001901', '0100001902' |
| 2 | `foliohog` | INT | 69 162 | 0 | 0.0% | '1', '1', '1' |
| 3 | `clave` | INT | 69 162 | 0 | 0.0% | '173511', '173514', '173527' |
| 4 | `mes_1` | INT | 69 162 | 0 | 0.0% | '10', '10', '10' |
| 5 | `mes_2` | INT | 69 162 | 7 956 | 11.5% | '09', '09', '09' |
| 6 | `mes_3` | INT | 69 162 | 7 956 | 11.5% | '08', '08', '08' |
| 7 | `mes_4` | INT | 69 162 | 7 956 | 11.5% | '07', '07', '07' |
| 8 | `mes_5` | INT | 69 162 | 7 956 | 11.5% | '06', '06', '06' |
| 9 | `mes_6` | INT | 69 162 | 7 956 | 11.5% | '05', '05', '05' |
| 10 | `ero_1` | INT | 69 162 | 0 | 0.0% | '7280', '2800', '3000' |
| 11 | `ero_2` | INT | 69 162 | 7 956 | 11.5% | '7280', '2800', '1600' |
| 12 | `ero_3` | INT | 69 162 | 7 956 | 11.5% | '7280', '2800', '1600' |
| 13 | `ero_4` | INT | 69 162 | 7 956 | 11.5% | '7280', '2800', '1600' |
| 14 | `ero_5` | INT | 69 162 | 7 956 | 11.5% | '7280', '2800', '1600' |
| 15 | `ero_6` | INT | 69 162 | 7 956 | 11.5% | '7280', '2800', '1600' |
| 16 | `ero_tri` | NUMERIC | 69 162 | 565 | 0.8% | '21365.21', '8217.39', '8709.67' |

### `gastoshogar`

- CSV: `conjunto_de_datos_gastoshogar_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_gastoshogar_enigh2024_ns.csv`
- Tamaño: 552.2 MB — 5 311 497 filas × 31 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 25.2s
- Diccionario oficial INEGI: `diccionario_datos_gastoshogar_enigh2024_ns.csv` — 31 variables documentadas
- Catálogos INEGI en carpeta (`11`): `cantidades.csv`, `entidad.csv`, `fecha.csv`, `forma_pag.csv`, `frecuencia.csv`, `gastos.csv`, `inst_salud.csv`, `lugar_comp.csv`, `mes_dia.csv`, `orga_inst.csv`, `tipo_gasto.csv`
- Modelo ER: `modelo_er_gastoshogar_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 4, `folioviv` = 90 324

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 5 311 497 | 0 | 0.0% | '0100001901', '0100001901', '0100001901' |
| 2 | `foliohog` | INT | 5 311 497 | 0 | 0.0% | '1', '1', '1' |
| 3 | `clave` | TEXT | 5 311 497 | 0 | 0.0% | '011131', '011150', '011231' |
| 4 | `tipo_gasto` | TEXT | 5 311 497 | 0 | 0.0% | 'G1', 'G1', 'G1' |
| 5 | `mes_dia` | INT | 5 311 497 | 0 | 0.0% | '1031', '1029', '1031' |
| 6 | `forma_pag1` | INT | 5 311 497 | 0 | 0.0% | '01', '01', '01' |
| 7 | `forma_pag2` | INT | 5 311 497 | 0 | 0.0% | '00', '00', '00' |
| 8 | `forma_pag3` | INT | 5 311 497 | 0 | 0.0% | '00', '00', '00' |
| 9 | `lugar_comp` | INT | 5 311 497 | 0 | 0.0% | '04', '04', '04' |
| 10 | `orga_inst` | INT | 5 311 497 | 0 | 0.0% | '00', '00', '00' |
| 11 | `frecuencia` | INT | 5 311 497 | 0 | 0.0% | '0', '0', '0' |
| 12 | `fecha_adqu` | INT | 5 311 497 | 0 | 0.0% | '0000', '0000', '0000' |
| 13 | `fecha_pago` | INT | 5 311 497 | 0 | 0.0% | '0000', '0000', '0000' |
| 14 | `cantidad` | NUMERIC | 5 311 497 | 2 836 778 | 53.4% | '0.5', '1', '0.1' |
| 15 | `gasto` | INT | 5 311 497 | 421 365 | 7.9% | '13', '50', '15' |
| 16 | `pago_mp` | INT | 5 311 497 | 4 565 490 | 86.0% | '650', '128', '90' |
| 17 | `costo` | INT | 5 311 497 | 4 948 308 | 93.2% | '200', '350', '150' |
| 18 | `inmujer` | INT | 5 311 497 | 4 247 138 | 80.0% | '400', '0', '650' |
| 19 | `inst_1` | INT | 5 311 497 | 5 238 401 | 98.6% | '01', '01', '01' |
| 20 | `inst_2` | INT | 5 311 497 | 5 311 408 | 100.0% | '01', '01', '01' |
| 21 | `num_meses` | INT | 5 311 497 | 5 040 829 | 94.9% | '1', '2', '1' |
| 22 | `num_pagos` | INT | 5 311 497 | 5 040 829 | 94.9% | '12', '6', '12' |
| 23 | `ultim_pago` | INT | 5 311 497 | 5 040 829 | 94.9% | '2410', '2410', '2410' |
| 24 | `gasto_tri` | NUMERIC | 5 311 497 | 425 861 | 8.0% | '167.14', '642.85', '192.85' |
| 25 | `gasto_nm` | INT | 5 311 497 | 4 883 354 | 91.9% | '200', '350', '150' |
| 26 | `gas_nm_tri` | NUMERIC | 5 311 497 | 4 883 354 | 91.9% | '2571.42', '4499.99', '1928.57' |
| 27 | `imujer_tri` | NUMERIC | 5 311 497 | 4 247 138 | 80.0% | '1161.29', '0', '635.86' |
| 28 | `entidad` | INT | 5 311 497 | 0 | 0.0% | '01', '01', '01' |
| 29 | `est_dis` | INT | 5 311 497 | 0 | 0.0% | '001', '001', '001' |
| 30 | `upm` | INT | 5 311 497 | 0 | 0.0% | '0000001', '0000001', '0000001' |
| 31 | `factor` | INT | 5 311 497 | 0 | 0.0% | '207', '207', '207' |

### `gastospersona`

- CSV: `conjunto_de_datos_gastospersona_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_gastospersona_enigh2024_ns.csv`
- Tamaño: 30.9 MB — 377 073 filas × 23 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 1.5s
- Diccionario oficial INEGI: `diccionario_datos_gastospersona_enigh2024_ns.csv` — 23 variables documentadas
- Catálogos INEGI en carpeta (`8`): `cantidades.csv`, `entidad.csv`, `forma_pag.csv`, `frec_rem.csv`, `gastos.csv`, `inst_salud.csv`, `mes_dia.csv`, `tipo_gasto.csv`
- Modelo ER: `modelo_er_gastospersona_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 4, `folioviv` = 52 328, `numren` = 16

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 377 073 | 0 | 0.0% | '0100001901', '0100001901', '0100001901' |
| 2 | `foliohog` | INT | 377 073 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 377 073 | 0 | 0.0% | '01', '01', '01' |
| 4 | `clave` | INT | 377 073 | 0 | 0.0% | '073215', '073215', '073215' |
| 5 | `tipo_gasto` | TEXT | 377 073 | 0 | 0.0% | 'G4', 'G4', 'G4' |
| 6 | `mes_dia` | INT | 377 073 | 0 | 0.0% | '1029', '1030', '1031' |
| 7 | `frec_rem` | INT | 377 073 | 268 556 | 71.2% | '5', '5', '5' |
| 8 | `inst` | INT | 377 073 | 377 047 | 100.0% | '01', '01', '05' |
| 9 | `forma_pag1` | INT | 377 073 | 0 | 0.0% | '00', '00', '00' |
| 10 | `forma_pag2` | INT | 377 073 | 0 | 0.0% | '00', '00', '00' |
| 11 | `forma_pag3` | INT | 377 073 | 0 | 0.0% | '00', '00', '00' |
| 12 | `inscrip` | INT | 377 073 | 355 068 | 94.2% | '0', '0', '0' |
| 13 | `colegia` | INT | 377 073 | 355 068 | 94.2% | '2580', '2400', '2500' |
| 14 | `cantidad` | INT | 377 073 | 282 645 | 75.0% | '2', '2', '2' |
| 15 | `gasto` | INT | 377 073 | 97 474 | 25.9% | '2580', '30', '30' |
| 16 | `costo` | INT | 377 073 | 268 556 | 71.2% | '300', '300', '300' |
| 17 | `gasto_tri` | NUMERIC | 377 073 | 97 474 | 25.9% | '7490.32', '385.71', '385.71' |
| 18 | `gasto_nm` | INT | 377 073 | 268 556 | 71.2% | '300', '300', '300' |
| 19 | `gas_nm_tri` | NUMERIC | 377 073 | 268 556 | 71.2% | '3857.14', '3857.14', '3857.14' |
| 20 | `entidad` | INT | 377 073 | 0 | 0.0% | '01', '01', '01' |
| 21 | `est_dis` | INT | 377 073 | 0 | 0.0% | '001', '001', '001' |
| 22 | `upm` | INT | 377 073 | 0 | 0.0% | '0000001', '0000001', '0000001' |
| 23 | `factor` | INT | 377 073 | 0 | 0.0% | '207', '207', '207' |

### `gastotarjetas`

- CSV: `conjunto_de_datos_gastotarjetas_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_gastotarjetas_enigh2024_ns.csv`
- Tamaño: 627.6 KB — 19 464 filas × 6 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 0.0s
- Diccionario oficial INEGI: `diccionario_datos_gastotarjetas_enigh2024_ns.csv` — 6 variables documentadas
- Catálogos INEGI en carpeta (`1`): `gastoscontarjeta.csv`
- Modelo ER: `modelo_er_gastotarjetas_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 4, `folioviv` = 6 476

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 19 464 | 0 | 0.0% | '0100001905', '0100001905', '0100001905' |
| 2 | `foliohog` | INT | 19 464 | 0 | 0.0% | '1', '1', '1' |
| 3 | `clave` | TEXT | 19 464 | 0 | 0.0% | 'TB01', 'TB12', 'TB08' |
| 4 | `gasto` | INT | 19 464 | 0 | 0.0% | '1000', '2250', '2750' |
| 5 | `pago_mp` | INT | 19 464 | 9 359 | 48.1% | '2250', '2750', '365' |
| 6 | `gasto_tri` | NUMERIC | 19 464 | 0 | 0.0% | '2903.22', '1100.54', '2690.21' |

### `hogares`

- CSV: `conjunto_de_datos_hogares_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_hogares_enigh2024_ns.csv`
- Tamaño: 24.3 MB — 91 414 filas × 148 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 1.7s
- Diccionario oficial INEGI: `diccionario_datos_hogares_enigh2024_ns.csv` — 148 variables documentadas
- Catálogos INEGI en carpeta (`9`): `acc_alim18.csv`, `entidad.csv`, `fenomeno.csv`, `frec_dicon.csv`, `habito.csv`, `lts_licon.csv`, `pago_dicon.csv`, `si_no.csv`, `si_no_nosabe.csv`
- Modelo ER: `modelo_er_hogares_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 4, `folioviv` = 90 324
- Warnings: columna 100% nula: nr_viv

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 91 414 | 0 | 0.0% | '0100001901', '0100001902', '0100001904' |
| 2 | `foliohog` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 3 | `huespedes` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 4 | `huesp_come` | INT | 91 414 | 91 407 | 100.0% | '0', '0', '0' |
| 5 | `num_trab_d` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 6 | `trab_come` | INT | 91 414 | 91 318 | 99.9% | '1', '1', '1' |
| 7 | `acc_alim1` | INT | 91 414 | 0 | 0.0% | '2', '2', '1' |
| 8 | `acc_alim2` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 9 | `acc_alim3` | INT | 91 414 | 0 | 0.0% | '2', '2', '1' |
| 10 | `acc_alim4` | INT | 91 414 | 0 | 0.0% | '2', '2', '1' |
| 11 | `acc_alim5` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 12 | `acc_alim6` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 13 | `acc_alim7` | INT | 91 414 | 59 870 | 65.5% | '1', '2', '2' |
| 14 | `acc_alim8` | INT | 91 414 | 59 870 | 65.5% | '2', '2', '2' |
| 15 | `acc_alim9` | INT | 91 414 | 59 870 | 65.5% | '2', '2', '2' |
| 16 | `acc_alim10` | INT | 91 414 | 72 662 | 79.5% | '2', '2', '2' |
| 17 | `acc_alim11` | INT | 91 414 | 72 662 | 79.5% | '2', '2', '2' |
| 18 | `acc_alim12` | INT | 91 414 | 72 662 | 79.5% | '2', '2', '2' |
| 19 | `acc_alim13` | INT | 91 414 | 72 662 | 79.5% | '2', '2', '2' |
| 20 | `acc_alim14` | INT | 91 414 | 72 662 | 79.5% | '2', '2', '2' |
| 21 | `acc_alim15` | INT | 91 414 | 72 662 | 79.5% | '2', '2', '2' |
| 22 | `acc_alim16` | INT | 91 414 | 72 662 | 79.5% | '2', '2', '2' |
| 23 | `alim17_1` | INT | 91 414 | 0 | 0.0% | '7', '7', '7' |
| 24 | `alim17_2` | INT | 91 414 | 0 | 0.0% | '0', '3', '3' |
| 25 | `alim17_3` | INT | 91 414 | 0 | 0.0% | '0', '3', '7' |
| 26 | `alim17_4` | INT | 91 414 | 0 | 0.0% | '7', '7', '7' |
| 27 | `alim17_5` | INT | 91 414 | 0 | 0.0% | '3', '4', '7' |
| 28 | `alim17_6` | INT | 91 414 | 0 | 0.0% | '7', '7', '7' |
| 29 | `alim17_7` | INT | 91 414 | 0 | 0.0% | '0', '1', '0' |
| 30 | `alim17_8` | INT | 91 414 | 0 | 0.0% | '0', '7', '4' |
| 31 | `alim17_9` | INT | 91 414 | 0 | 0.0% | '7', '7', '6' |
| 32 | `alim17_10` | INT | 91 414 | 0 | 0.0% | '7', '7', '7' |
| 33 | `alim17_11` | INT | 91 414 | 0 | 0.0% | '3', '7', '7' |
| 34 | `alim17_12` | INT | 91 414 | 0 | 0.0% | '7', '7', '7' |
| 35 | `acc_alim18` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 36 | `telefono` | INT | 91 414 | 0 | 0.0% | '2', '1', '1' |
| 37 | `celular` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 38 | `conex_inte` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 39 | `tv_paga` | INT | 91 414 | 0 | 0.0% | '2', '1', '1' |
| 40 | `peliculas` | INT | 91 414 | 0 | 0.0% | '2', '1', '1' |
| 41 | `num_auto` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 42 | `anio_auto` | INT | 91 414 | 61 459 | 67.2% | '22', '24', '20' |
| 43 | `num_van` | INT | 91 414 | 0 | 0.0% | '0', '0', '1' |
| 44 | `anio_van` | INT | 91 414 | 77 786 | 85.1% | '18', '23', '22' |
| 45 | `num_pick` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 46 | `anio_pick` | INT | 91 414 | 79 901 | 87.4% | '23', '20', '15' |
| 47 | `num_moto` | INT | 91 414 | 0 | 0.0% | '0', '1', '0' |
| 48 | `anio_moto` | INT | 91 414 | 74 596 | 81.6% | '24', '24', '11' |
| 49 | `num_bici` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 50 | `anio_bici` | INT | 91 414 | 79 379 | 86.8% | '23', '20', '21' |
| 51 | `num_trici` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 52 | `anio_trici` | INT | 91 414 | 90 345 | 98.8% | '23', '22', '22' |
| 53 | `num_carre` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 54 | `anio_carre` | INT | 91 414 | 91 227 | 99.8% | '20', '18', '20' |
| 55 | `num_canoa` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 56 | `anio_canoa` | INT | 91 414 | 91 260 | 99.8% | '20', '05', '19' |
| 57 | `num_otro` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 58 | `anio_otro` | INT | 91 414 | 91 188 | 99.8% | '20', '21', '23' |
| 59 | `num_ester` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 60 | `anio_ester` | INT | 91 414 | 73 722 | 80.6% | '09', '16', '17' |
| 61 | `num_radio` | INT | 91 414 | 0 | 0.0% | '0', '1', '0' |
| 62 | `anio_radio` | INT | 91 414 | 58 014 | 63.5% | '22', '22', '19' |
| 63 | `num_tva` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 64 | `anio_tva` | INT | 91 414 | 81 815 | 89.5% | '17', '08', '14' |
| 65 | `num_tvd` | INT | 91 414 | 0 | 0.0% | '1', '1', '2' |
| 66 | `anio_tvd` | INT | 91 414 | 15 694 | 17.2% | '19', '24', '18' |
| 67 | `num_dvd` | INT | 91 414 | 0 | 0.0% | '1', '1', '0' |
| 68 | `anio_dvd` | INT | 91 414 | 84 530 | 92.5% | '19', '14', '20' |
| 69 | `num_licua` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 70 | `anio_licua` | INT | 91 414 | 9 500 | 10.4% | '19', '19', '22' |
| 71 | `num_tosta` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 72 | `anio_tosta` | INT | 91 414 | 79 121 | 86.6% | '24', '22', '19' |
| 73 | `num_micro` | INT | 91 414 | 0 | 0.0% | '1', '0', '1' |
| 74 | `anio_micro` | INT | 91 414 | 50 500 | 55.2% | '22', '24', '16' |
| 75 | `num_refri` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 76 | `anio_refri` | INT | 91 414 | 9 308 | 10.2% | '19', '12', '21' |
| 77 | `num_estuf` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 78 | `anio_estuf` | INT | 91 414 | 9 098 | 10.0% | '19', '13', '21' |
| 79 | `num_lavad` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 80 | `anio_lavad` | INT | 91 414 | 23 767 | 26.0% | '21', '16', '21' |
| 81 | `num_planc` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 82 | `anio_planc` | INT | 91 414 | 29 949 | 32.8% | '21', '10', '16' |
| 83 | `num_maqui` | INT | 91 414 | 0 | 0.0% | '0', '0', '1' |
| 84 | `anio_maqui` | INT | 91 414 | 80 163 | 87.7% | '16', '19', '21' |
| 85 | `num_venti` | INT | 91 414 | 0 | 0.0% | '1', '0', '1' |
| 86 | `anio_venti` | INT | 91 414 | 35 744 | 39.1% | '23', '24', '18' |
| 87 | `num_aspir` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 88 | `anio_aspir` | INT | 91 414 | 84 119 | 92.0% | '10', '19', '19' |
| 89 | `num_compu` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 90 | `anio_compu` | INT | 91 414 | 84 151 | 92.1% | '19', '19', '14' |
| 91 | `num_lap` | INT | 91 414 | 0 | 0.0% | '1', '1', '0' |
| 92 | `anio_lap` | INT | 91 414 | 68 697 | 75.1% | '23', '21', '22' |
| 93 | `num_table` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 94 | `anio_table` | INT | 91 414 | 80 915 | 88.5% | '19', '23', '20' |
| 95 | `num_impre` | INT | 91 414 | 0 | 0.0% | '0', '1', '0' |
| 96 | `anio_impre` | INT | 91 414 | 82 358 | 90.1% | '17', '19', '20' |
| 97 | `num_juego` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 98 | `anio_juego` | INT | 91 414 | 83 320 | 91.1% | '23', '06', '19' |
| 99 | `tsalud1_h` | INT | 91 414 | 0 | 0.0% | '0', '1', '0' |
| 100 | `tsalud1_m` | INT | 91 414 | 0 | 0.0% | '5', '0', '5' |
| 101 | `camb_clim` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 102 | `f_sequia` | INT | 91 414 | 82 655 | 90.4% | '1', '1', '1' |
| 103 | `f_inunda` | INT | 91 414 | 88 023 | 96.3% | '2', '2', '2' |
| 104 | `f_helada` | INT | 91 414 | 90 991 | 99.5% | '3', '3', '3' |
| 105 | `f_incendio` | INT | 91 414 | 91 194 | 99.8% | '4', '4', '4' |
| 106 | `f_huracan` | INT | 91 414 | 88 541 | 96.9% | '5', '5', '5' |
| 107 | `f_desliza` | INT | 91 414 | 91 279 | 99.9% | '6', '6', '6' |
| 108 | `f_otro` | INT | 91 414 | 90 836 | 99.4% | '7', '7', '7' |
| 109 | `af_viv` | INT | 91 414 | 75 889 | 83.0% | '1', '1', '1' |
| 110 | `af_empleo` | INT | 91 414 | 75 889 | 83.0% | '2', '2', '2' |
| 111 | `af_negocio` | INT | 91 414 | 75 889 | 83.0% | '2', '2', '2' |
| 112 | `af_cultivo` | INT | 91 414 | 75 889 | 83.0% | '2', '2', '2' |
| 113 | `af_trabajo` | INT | 91 414 | 75 889 | 83.0% | '2', '2', '2' |
| 114 | `af_salud` | INT | 91 414 | 75 889 | 83.0% | '2', '2', '2' |
| 115 | `af_otro` | INT | 91 414 | 75 889 | 83.0% | '2', '2', '1' |
| 116 | `habito_1` | INT | 91 414 | 80 234 | 87.8% | '1', '1', '1' |
| 117 | `habito_2` | INT | 91 414 | 67 599 | 73.9% | '2', '2', '2' |
| 118 | `habito_3` | INT | 91 414 | 54 068 | 59.1% | '3', '3', '3' |
| 119 | `habito_4` | INT | 91 414 | 86 994 | 95.2% | '4', '4', '4' |
| 120 | `habito_5` | INT | 91 414 | 52 804 | 57.8% | '5', '5', '5' |
| 121 | `habito_6` | INT | 91 414 | 89 573 | 98.0% | '6', '6', '6' |
| 122 | `consumo` | INT | 91 414 | 20 951 | 22.9% | '2', '1', '2' |
| 123 | `nr_viv` | TEXT | 91 414 | 91 414 | 100.0% | — |
| 124 | `tarjeta` | INT | 91 414 | 0 | 0.0% | '2', '1', '2' |
| 125 | `pagotarjet` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 126 | `regalotar` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 127 | `regalodado` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 128 | `autocons` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 129 | `regalos` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 130 | `remunera` | INT | 91 414 | 0 | 0.0% | '1', '1', '1' |
| 131 | `transferen` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 132 | `parto_g` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 133 | `negcua` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 134 | `est_alim` | INT | 91 414 | 0 | 0.0% | '5100', '12000', '4350' |
| 135 | `est_trans` | INT | 91 414 | 0 | 0.0% | '0', '0', '0' |
| 136 | `bene_licon` | INT | 91 414 | 0 | 0.0% | '2', '2', '2' |
| 137 | `cond_licon` | INT | 91 414 | 87 685 | 95.9% | '2', '1', '2' |
| 138 | `lts_licon` | INT | 91 414 | 87 685 | 95.9% | '7', '3', '2' |
| 139 | `otros_lts` | INT | 91 414 | 91 016 | 99.6% | '9', '13', '5' |
| 140 | `diconsa` | INT | 91 414 | 0 | 0.0% | '2', '1', '2' |
| 141 | `frec_dicon` | INT | 91 414 | 67 098 | 73.4% | '3', '3', '3' |
| 142 | `cond_dicon` | INT | 91 414 | 80 125 | 87.7% | '1', '2', '2' |
| 143 | `pago_dicon` | INT | 91 414 | 80 125 | 87.7% | '3', '3', '1' |
| 144 | `otro_pago` | INT | 91 414 | 89 664 | 98.1% | '28', '44', '44' |
| 145 | `entidad` | INT | 91 414 | 0 | 0.0% | '01', '01', '01' |
| 146 | `est_dis` | INT | 91 414 | 0 | 0.0% | '001', '001', '001' |
| 147 | `upm` | INT | 91 414 | 0 | 0.0% | '0000001', '0000001', '0000001' |
| 148 | `factor` | INT | 91 414 | 0 | 0.0% | '207', '207', '207' |

### `ingresos`

- CSV: `conjunto_de_datos_ingresos_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_ingresos_enigh2024_ns.csv`
- Tamaño: 33.6 MB — 391 563 filas × 21 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 1.4s
- Diccionario oficial INEGI: `diccionario_datos_ingresos_enigh2024_ns.csv` — 21 variables documentadas
- Catálogos INEGI en carpeta (`3`): `entidad.csv`, `ingresos_cat.csv`, `mes.csv`
- Modelo ER: `modelo_er_ingresos_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 4, `folioviv` = 90 262, `numren` = 18

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 391 563 | 0 | 0.0% | '0100001901', '0100001901', '0100001901' |
| 2 | `foliohog` | INT | 391 563 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 391 563 | 0 | 0.0% | '01', '01', '01' |
| 4 | `clave` | TEXT | 391 563 | 0 | 0.0% | 'P001', 'P004', 'P006' |
| 5 | `mes_1` | INT | 391 563 | 0 | 0.0% | '10', '10', '10' |
| 6 | `mes_2` | INT | 391 563 | 0 | 0.0% | '09', '09', '09' |
| 7 | `mes_3` | INT | 391 563 | 0 | 0.0% | '08', '08', '08' |
| 8 | `mes_4` | INT | 391 563 | 0 | 0.0% | '07', '07', '07' |
| 9 | `mes_5` | INT | 391 563 | 0 | 0.0% | '06', '06', '06' |
| 10 | `mes_6` | INT | 391 563 | 0 | 0.0% | '05', '05', '05' |
| 11 | `ing_1` | INT | 391 563 | 0 | 0.0% | '16680', '6000', '1500' |
| 12 | `ing_2` | INT | 391 563 | 72 544 | 18.5% | '16680', '6000', '1500' |
| 13 | `ing_3` | INT | 391 563 | 72 544 | 18.5% | '16680', '6000', '1500' |
| 14 | `ing_4` | INT | 391 563 | 72 544 | 18.5% | '16680', '6000', '1500' |
| 15 | `ing_5` | INT | 391 563 | 72 544 | 18.5% | '16680', '6000', '1500' |
| 16 | `ing_6` | INT | 391 563 | 72 544 | 18.5% | '16680', '6000', '1500' |
| 17 | `ing_tri` | NUMERIC | 391 563 | 0 | 0.0% | '48952.17', '17608.69', '4402.17' |
| 18 | `entidad` | INT | 391 563 | 0 | 0.0% | '01', '01', '01' |
| 19 | `est_dis` | INT | 391 563 | 0 | 0.0% | '001', '001', '001' |
| 20 | `upm` | INT | 391 563 | 0 | 0.0% | '0000001', '0000001', '0000001' |
| 21 | `factor` | INT | 391 563 | 0 | 0.0% | '207', '207', '207' |

### `ingresos_jcf`

- CSV: `conjunto_de_datos_ingresos_jcf_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_ingresos_jcf_enigh2024_ns.csv`
- Tamaño: 24.2 KB — 327 filas × 18 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 0.0s
- Diccionario oficial INEGI: `diccionario_datos_ingresos_jcf_enigh2024_ns.csv` — 18 variables documentadas
- Catálogos INEGI en carpeta (`3`): `ct_futuro.csv`, `ingresos_cat.csv`, `mes.csv`
- Modelo ER: `modelo_er_ingresos_jcf_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 2, `folioviv` = 308, `numren` = 10

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 327 | 0 | 0.0% | '0100061705', '0100157003', '0100236205' |
| 2 | `foliohog` | INT | 327 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 327 | 0 | 0.0% | '02', '01', '01' |
| 4 | `clave` | TEXT | 327 | 0 | 0.0% | 'P108', 'P108', 'P108' |
| 5 | `mes_1` | INT | 327 | 0 | 0.0% | '09', '10', '09' |
| 6 | `mes_2` | INT | 327 | 0 | 0.0% | '08', '09', '08' |
| 7 | `mes_3` | INT | 327 | 0 | 0.0% | '07', '08', '07' |
| 8 | `mes_4` | INT | 327 | 0 | 0.0% | '06', '07', '06' |
| 9 | `mes_5` | INT | 327 | 0 | 0.0% | '05', '06', '05' |
| 10 | `mes_6` | INT | 327 | 0 | 0.0% | '04', '05', '04' |
| 11 | `ing_1` | INT | 327 | 0 | 0.0% | '0', '0', '0' |
| 12 | `ing_2` | INT | 327 | 0 | 0.0% | '0', '0', '0' |
| 13 | `ing_3` | INT | 327 | 0 | 0.0% | '0', '0', '0' |
| 14 | `ing_4` | INT | 327 | 0 | 0.0% | '7100', '7500', '7500' |
| 15 | `ing_5` | INT | 327 | 0 | 0.0% | '7100', '7500', '7500' |
| 16 | `ing_6` | INT | 327 | 0 | 0.0% | '7100', '7500', '7500' |
| 17 | `ing_tri` | NUMERIC | 327 | 0 | 0.0% | '10475.4', '11005.43', '11126.37' |
| 18 | `ct_futuro` | INT | 327 | 0 | 0.0% | '9', '1', '9' |

### `noagro`

- CSV: `conjunto_de_datos_noagro_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_noagro_enigh2024_ns.csv`
- Tamaño: 6.5 MB — 23 109 filas × 115 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 0.4s
- Diccionario oficial INEGI: `diccionario_datos_noagro_enigh2024_ns.csv` — 115 variables documentadas
- Catálogos INEGI en carpeta (`12`): `fpago.csv`, `id_trabajo.csv`, `lugact.csv`, `mes.csv`, `nofpago.csv`, `numesta.csv`, `nvo_act.csv`, `nvo_prog.csv`, `peract.csv`, `reg_cont.csv`, `si_no.csv`, `tipoact.csv`
- Modelo ER: `modelo_er_noagro_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 3, `folioviv` = 20 064, `numren` = 10
- Warnings: columna 100% nula: nvo_prog3; columna 100% nula: nvo_act3; columna 100% nula: nvo_cant3

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 23 109 | 0 | 0.0% | '0100003703', '0100009603', '0100009604' |
| 2 | `foliohog` | INT | 23 109 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 23 109 | 0 | 0.0% | '01', '01', '02' |
| 4 | `id_trabajo` | INT | 23 109 | 0 | 0.0% | '2', '1', '1' |
| 5 | `tipoact` | INT | 23 109 | 0 | 0.0% | '3', '1', '3' |
| 6 | `numesta` | INT | 23 109 | 0 | 0.0% | '2', '1', '1' |
| 7 | `totesta` | INT | 23 109 | 23 031 | 99.7% | '2', '2', '2' |
| 8 | `lugact` | INT | 23 109 | 9 614 | 41.6% | '1', '9', '4' |
| 9 | `socios` | INT | 23 109 | 0 | 0.0% | '1', '2', '2' |
| 10 | `numsocio` | INT | 23 109 | 22 789 | 98.6% | '1', '1', '1' |
| 11 | `phogar1` | INT | 23 109 | 22 789 | 98.6% | '50', '50', '50' |
| 12 | `mismop` | INT | 23 109 | 22 789 | 98.6% | '1', '1', '1' |
| 13 | `mes_2` | INT | 23 109 | 23 082 | 99.9% | '09', '06', '09' |
| 14 | `mes_3` | INT | 23 109 | 23 082 | 99.9% | '08', '05', '08' |
| 15 | `mes_4` | INT | 23 109 | 23 082 | 99.9% | '07', '04', '07' |
| 16 | `mes_5` | INT | 23 109 | 23 082 | 99.9% | '06', '03', '06' |
| 17 | `mes_6` | INT | 23 109 | 23 082 | 99.9% | '05', '02', '05' |
| 18 | `phogar2` | INT | 23 109 | 23 082 | 99.9% | '50', '50', '30' |
| 19 | `phogar3` | INT | 23 109 | 23 082 | 99.9% | '50', '50', '25' |
| 20 | `phogar4` | INT | 23 109 | 23 082 | 99.9% | '50', '50', '35' |
| 21 | `phogar5` | INT | 23 109 | 23 082 | 99.9% | '50', '50', '20' |
| 22 | `phogar6` | INT | 23 109 | 23 082 | 99.9% | '50', '70', '30' |
| 23 | `otro_pago` | INT | 23 109 | 0 | 0.0% | '1', '1', '2' |
| 24 | `fpago_1` | INT | 23 109 | 23 088 | 99.9% | '1', '1', '1' |
| 25 | `fpago_2` | INT | 23 109 | 17 624 | 76.3% | '2', '2', '2' |
| 26 | `fpago_3` | INT | 23 109 | 22 600 | 97.8% | '3', '3', '3' |
| 27 | `fpago_4` | INT | 23 109 | 22 385 | 96.9% | '4', '4', '4' |
| 28 | `fpago_5` | INT | 23 109 | 23 039 | 99.7% | '5', '5', '5' |
| 29 | `fpago_6` | INT | 23 109 | 23 063 | 99.8% | '6', '6', '6' |
| 30 | `fpago_7` | INT | 23 109 | 23 005 | 99.5% | '7', '7', '7' |
| 31 | `fpago_8` | INT | 23 109 | 23 036 | 99.7% | '8', '8', '8' |
| 32 | `nofpago` | INT | 23 109 | 5 887 | 25.5% | '4', '2', '1' |
| 33 | `t_emp` | INT | 23 109 | 0 | 0.0% | '3', '0', '0' |
| 34 | `h_emp` | INT | 23 109 | 15 507 | 67.1% | '2', '1', '1' |
| 35 | `m_emp` | INT | 23 109 | 15 507 | 67.1% | '1', '1', '0' |
| 36 | `t_cpago` | INT | 23 109 | 15 507 | 67.1% | '3', '1', '0' |
| 37 | `h_cpago` | INT | 23 109 | 19 224 | 83.2% | '2', '0', '2' |
| 38 | `m_cpago` | INT | 23 109 | 19 224 | 83.2% | '1', '1', '1' |
| 39 | `t_ispago` | INT | 23 109 | 15 507 | 67.1% | '0', '1', '1' |
| 40 | `h_ispago` | INT | 23 109 | 19 155 | 82.9% | '1', '1', '0' |
| 41 | `m_ispago` | INT | 23 109 | 19 155 | 82.9% | '0', '0', '1' |
| 42 | `t_nispago` | INT | 23 109 | 15 507 | 67.1% | '0', '0', '0' |
| 43 | `h_nispago` | INT | 23 109 | 22 487 | 97.3% | '0', '0', '0' |
| 44 | `m_nispago` | INT | 23 109 | 22 487 | 97.3% | '1', '1', '2' |
| 45 | `autocons` | INT | 23 109 | 0 | 0.0% | '2', '2', '2' |
| 46 | `enproduc` | INT | 23 109 | 21 197 | 91.7% | '2000', '-1', '3000' |
| 47 | `novend` | INT | 23 109 | 21 205 | 91.8% | '-1', '5000', '60000' |
| 48 | `consinter` | INT | 23 109 | 21 658 | 93.7% | '-1', '1200', '3000' |
| 49 | `peract` | INT | 23 109 | 0 | 0.0% | '1', '3', '3' |
| 50 | `mesact_1` | INT | 23 109 | 22 862 | 98.9% | '01', '01', '01' |
| 51 | `mesact_2` | INT | 23 109 | 22 791 | 98.6% | '02', '02', '02' |
| 52 | `mesact_3` | INT | 23 109 | 22 714 | 98.3% | '03', '03', '03' |
| 53 | `mesact_4` | INT | 23 109 | 22 650 | 98.0% | '04', '04', '04' |
| 54 | `mesact_5` | INT | 23 109 | 22 568 | 97.7% | '05', '05', '05' |
| 55 | `mesact_6` | INT | 23 109 | 22 540 | 97.5% | '06', '06', '06' |
| 56 | `mesact_7` | INT | 23 109 | 22 417 | 97.0% | '07', '07', '07' |
| 57 | `mesact_8` | INT | 23 109 | 22 295 | 96.5% | '08', '08', '08' |
| 58 | `mesact_9` | INT | 23 109 | 22 469 | 97.2% | '09', '09', '09' |
| 59 | `mesact_10` | INT | 23 109 | 22 680 | 98.1% | '10', '10', '10' |
| 60 | `mesact_11` | INT | 23 109 | 22 892 | 99.1% | '11', '11', '11' |
| 61 | `mesact_12` | INT | 23 109 | 22 935 | 99.2% | '12', '12', '12' |
| 62 | `nvo_apoyo` | INT | 23 109 | 0 | 0.0% | '2', '2', '2' |
| 63 | `nvo_prog1` | INT | 23 109 | 23 030 | 99.7% | '2003', '2003', '2003' |
| 64 | `nvo_act1` | INT | 23 109 | 23 030 | 99.7% | '2', '2', '1' |
| 65 | `nvo_cant1` | INT | 23 109 | 23 030 | 99.7% | '15000', '2000', '5000' |
| 66 | `nvo_prog2` | INT | 23 109 | 23 105 | 100.0% | '2013', '2011', '2011' |
| 67 | `nvo_act2` | INT | 23 109 | 23 105 | 100.0% | '4', '4', '4' |
| 68 | `nvo_cant2` | INT | 23 109 | 23 105 | 100.0% | '6000', '2100', '4000' |
| 69 | `nvo_prog3` | TEXT | 23 109 | 23 109 | 100.0% | — |
| 70 | `nvo_act3` | TEXT | 23 109 | 23 109 | 100.0% | — |
| 71 | `nvo_cant3` | TEXT | 23 109 | 23 109 | 100.0% | — |
| 72 | `reg_not` | INT | 23 109 | 0 | 0.0% | '2', '2', '2' |
| 73 | `reg_cont` | INT | 23 109 | 0 | 0.0% | '4', '4', '3' |
| 74 | `ventas1` | INT | 23 109 | 0 | 0.0% | '32500', '25000', '29000' |
| 75 | `ventas2` | INT | 23 109 | 0 | 0.0% | '32500', '25000', '29000' |
| 76 | `ventas3` | INT | 23 109 | 0 | 0.0% | '0', '25000', '29000' |
| 77 | `ventas4` | INT | 23 109 | 0 | 0.0% | '0', '25000', '29000' |
| 78 | `ventas5` | INT | 23 109 | 0 | 0.0% | '0', '25000', '29000' |
| 79 | `ventas6` | INT | 23 109 | 0 | 0.0% | '0', '25000', '29000' |
| 80 | `autocons1` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 81 | `autocons2` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 82 | `autocons3` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 83 | `autocons4` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 84 | `autocons5` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 85 | `autocons6` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 86 | `otrosnom1` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 87 | `otrosnom2` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 88 | `otrosnom3` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 89 | `otrosnom4` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 90 | `otrosnom5` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 91 | `otrosnom6` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 92 | `gasneg1` | INT | 23 109 | 0 | 0.0% | '16675', '14340', '15950' |
| 93 | `gasneg2` | INT | 23 109 | 0 | 0.0% | '16440', '14340', '14450' |
| 94 | `gasneg3` | INT | 23 109 | 0 | 0.0% | '0', '14340', '14450' |
| 95 | `gasneg4` | INT | 23 109 | 0 | 0.0% | '0', '14340', '15950' |
| 96 | `gasneg5` | INT | 23 109 | 0 | 0.0% | '0', '14340', '17450' |
| 97 | `gasneg6` | INT | 23 109 | 0 | 0.0% | '0', '14340', '14450' |
| 98 | `ing1` | INT | 23 109 | 0 | 0.0% | '15825', '10660', '13050' |
| 99 | `ing2` | INT | 23 109 | 0 | 0.0% | '16060', '10660', '14550' |
| 100 | `ing3` | INT | 23 109 | 0 | 0.0% | '0', '10660', '14550' |
| 101 | `ing4` | INT | 23 109 | 0 | 0.0% | '0', '10660', '13050' |
| 102 | `ing5` | INT | 23 109 | 0 | 0.0% | '0', '10660', '11550' |
| 103 | `ing6` | INT | 23 109 | 0 | 0.0% | '0', '10660', '14550' |
| 104 | `ero1` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 105 | `ero2` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 106 | `ero3` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 107 | `ero4` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 108 | `ero5` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 109 | `ero6` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 110 | `ing_tri` | NUMERIC | 23 109 | 0 | 0.0% | '15681.14', '31455.73', '39983.6' |
| 111 | `ero_tri` | NUMERIC | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 112 | `ventas_tri` | NUMERIC | 23 109 | 0 | 0.0% | '31967.21', '73770.49', '85573.77' |
| 113 | `auto_tri` | NUMERIC | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 114 | `otros_tri` | INT | 23 109 | 0 | 0.0% | '0', '0', '0' |
| 115 | `gasto_tri` | NUMERIC | 23 109 | 0 | 0.0% | '16286.06', '42314.75', '45590.16' |

### `noagroimportes`

- CSV: `conjunto_de_datos_noagroimportes_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_noagroimportes_enigh2024_ns.csv`
- Tamaño: 9.3 MB — 151 276 filas × 17 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 0.5s
- Diccionario oficial INEGI: `diccionario_datos_noagroimportes_enigh2024_ns.csv` — 17 variables documentadas
- Catálogos INEGI en carpeta (`3`): `id_trabajo.csv`, `mes.csv`, `noagro_y_gastos.csv`
- Modelo ER: `modelo_er_noagroimportes_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 3, `folioviv` = 20 061, `numren` = 10

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 151 276 | 0 | 0.0% | '0100003703', '0100003703', '0100003703' |
| 2 | `foliohog` | INT | 151 276 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 151 276 | 0 | 0.0% | '01', '01', '01' |
| 4 | `id_trabajo` | INT | 151 276 | 0 | 0.0% | '2', '2', '2' |
| 5 | `clave` | INT | 151 276 | 0 | 0.0% | '512', '514', '516' |
| 6 | `mes_1` | INT | 151 276 | 0 | 0.0% | '09', '09', '09' |
| 7 | `mes_2` | INT | 151 276 | 0 | 0.0% | '08', '08', '08' |
| 8 | `mes_3` | INT | 151 276 | 0 | 0.0% | '07', '07', '07' |
| 9 | `mes_4` | INT | 151 276 | 0 | 0.0% | '06', '06', '06' |
| 10 | `mes_5` | INT | 151 276 | 0 | 0.0% | '05', '05', '05' |
| 11 | `mes_6` | INT | 151 276 | 0 | 0.0% | '04', '04', '04' |
| 12 | `importe_1` | INT | 151 276 | 0 | 0.0% | '20000', '800', '4800' |
| 13 | `importe_2` | INT | 151 276 | 0 | 0.0% | '20000', '800', '4800' |
| 14 | `importe_3` | INT | 151 276 | 0 | 0.0% | '0', '0', '0' |
| 15 | `importe_4` | INT | 151 276 | 0 | 0.0% | '0', '0', '0' |
| 16 | `importe_5` | INT | 151 276 | 0 | 0.0% | '0', '0', '0' |
| 17 | `importe_6` | INT | 151 276 | 0 | 0.0% | '0', '0', '0' |

### `poblacion`

- CSV: `conjunto_de_datos_poblacion_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_poblacion_enigh2024_ns.csv`
- Tamaño: 88.5 MB — 308 598 filas × 185 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 7.1s
- Diccionario oficial INEGI: `diccionario_datos_poblacion_enigh2024_ns.csv` — 185 variables documentadas
- Catálogos INEGI en carpeta (`38`): `act_pnea.csv`, `antec_esc.csv`, `ct_futuro.csv`, `disc.csv`, `edo_conyug.csv`, `edu_ini.csv`, `entidad.csv`, `forma_b.csv`, `forma_c.csv`, `grado.csv`, `gradoaprob.csv`, `inscr.csv`, `inst.csv`, `lenguaind.csv`, `mes.csv`, `motivo_aus.csv`, `nivel.csv`, `nivelaprob.csv`, `no_asis.csv`, `no_asisb.csv`, `noatenc.csv`, `norecib.csv`, `num_trabaj.csv`, `otorg_b.csv`, `otorg_c.csv`, `pagoaten.csv`, `pais_nac.csv`, `parentesco.csv`, `razon.csv`, `redsoc.csv`, `residencia.csv`, `segvol.csv`, `servmed.csv`, `sexo.csv`, `si_no.csv`, `tipoesc.csv`, `trabajo_mp.csv`, `usotiempo.csv`
- Modelo ER: `modelo_er_poblacion_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 4, `folioviv` = 90 324, `numren` = 20
- Warnings: columna 100% nula: norecib_10; columna 100% nula: razon_2

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 308 598 | 0 | 0.0% | '0100001901', '0100001901', '0100001901' |
| 2 | `foliohog` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 308 598 | 0 | 0.0% | '01', '02', '03' |
| 4 | `parentesco` | INT | 308 598 | 0 | 0.0% | '101', '201', '301' |
| 5 | `sexo` | INT | 308 598 | 0 | 0.0% | '1', '2', '2' |
| 6 | `edad` | INT | 308 598 | 0 | 0.0% | '32', '24', '5' |
| 7 | `madre_hog` | INT | 308 598 | 0 | 0.0% | '2', '2', '1' |
| 8 | `madre_id` | INT | 308 598 | 173 927 | 56.4% | '02', '02', '02' |
| 9 | `padre_hog` | INT | 308 598 | 0 | 0.0% | '2', '2', '1' |
| 10 | `padre_id` | INT | 308 598 | 212 755 | 68.9% | '01', '01', '01' |
| 11 | `pais_nac` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 12 | `afrod` | INT | 308 598 | 0 | 0.0% | '2', '2', '2' |
| 13 | `disc_ver` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 14 | `disc_oir` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 15 | `disc_brazo` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 16 | `disc_camin` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 17 | `disc_apren` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 18 | `disc_vest` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 19 | `disc_habla` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 20 | `disc_acti` | INT | 308 598 | 0 | 0.0% | '1', '1', '1' |
| 21 | `edu_ini` | INT | 308 598 | 297 955 | 96.6% | '6', '6', '6' |
| 22 | `no_asis` | INT | 308 598 | 299 401 | 97.0% | '8', '1', '2' |
| 23 | `hablaind` | INT | 308 598 | 10 643 | 3.4% | '2', '2', '2' |
| 24 | `lenguaind` | INT | 308 598 | 286 740 | 92.9% | '1041', '0332', '0911' |
| 25 | `hablaesp` | INT | 308 598 | 286 740 | 92.9% | '1', '1', '1' |
| 26 | `comprenind` | INT | 308 598 | 32 501 | 10.5% | '2', '2', '2' |
| 27 | `etnia` | INT | 308 598 | 10 643 | 3.4% | '2', '2', '2' |
| 28 | `alfabetism` | INT | 308 598 | 10 643 | 3.4% | '1', '1', '1' |
| 29 | `asis_esc` | INT | 308 598 | 10 643 | 3.4% | '2', '2', '1' |
| 30 | `no_asisb` | INT | 308 598 | 275 800 | 89.4% | '06', '08', '04' |
| 31 | `nivel` | INT | 308 598 | 225 121 | 72.9% | '05', '09', '09' |
| 32 | `grado` | INT | 308 598 | 225 123 | 73.0% | '3', '3', '2' |
| 33 | `tipoesc` | INT | 308 598 | 225 121 | 72.9% | '2', '1', '1' |
| 34 | `tiene_b` | INT | 308 598 | 225 121 | 72.9% | '2', '2', '2' |
| 35 | `otorg_b` | INT | 308 598 | 287 691 | 93.2% | '1', '3', '1' |
| 36 | `forma_b` | INT | 308 598 | 287 691 | 93.2% | '1', '5', '1' |
| 37 | `tiene_c` | INT | 308 598 | 283 073 | 91.7% | '2', '2', '2' |
| 38 | `otorg_c` | INT | 308 598 | 308 330 | 99.9% | '1', '2', '2' |
| 39 | `forma_c` | INT | 308 598 | 308 330 | 99.9% | '1', '3', '3' |
| 40 | `nivelaprob` | INT | 308 598 | 10 645 | 3.4% | '03', '04', '01' |
| 41 | `gradoaprob` | INT | 308 598 | 10 646 | 3.4% | '3', '3', '2' |
| 42 | `antec_esc` | INT | 308 598 | 259 388 | 84.1% | '3', '3', '3' |
| 43 | `residencia` | INT | 308 598 | 19 180 | 6.2% | '01', '01', '01' |
| 44 | `edo_conyug` | INT | 308 598 | 56 071 | 18.2% | '3', '3', '1' |
| 45 | `pareja_hog` | INT | 308 598 | 176 709 | 57.3% | '1', '1', '1' |
| 46 | `conyuge_id` | INT | 308 598 | 181 529 | 58.8% | '02', '01', '02' |
| 47 | `segsoc` | INT | 308 598 | 56 194 | 18.2% | '1', '2', '1' |
| 48 | `ss_aa` | INT | 308 598 | 200 835 | 65.1% | '12', '20', '19' |
| 49 | `ss_mm` | INT | 308 598 | 200 835 | 65.1% | '0', '0', '0' |
| 50 | `redsoc_1` | INT | 308 598 | 95 308 | 30.9% | '3', '3', '3' |
| 51 | `redsoc_2` | INT | 308 598 | 95 308 | 30.9% | '3', '3', '3' |
| 52 | `redsoc_3` | INT | 308 598 | 95 308 | 30.9% | '3', '2', '3' |
| 53 | `redsoc_4` | INT | 308 598 | 95 308 | 30.9% | '3', '3', '3' |
| 54 | `redsoc_5` | INT | 308 598 | 95 308 | 30.9% | '2', '1', '1' |
| 55 | `redsoc_6` | INT | 308 598 | 216 164 | 70.0% | '3', '3', '3' |
| 56 | `hor_1` | INT | 308 598 | 162 409 | 52.6% | '48', '45', '48' |
| 57 | `min_1` | INT | 308 598 | 162 409 | 52.6% | '0', '0', '0' |
| 58 | `usotiempo1` | INT | 308 598 | 202 383 | 65.6% | '9', '9', '9' |
| 59 | `hor_2` | INT | 308 598 | 262 611 | 85.1% | '40', '35', '51' |
| 60 | `min_2` | INT | 308 598 | 262 611 | 85.1% | '0', '0', '0' |
| 61 | `usotiempo2` | INT | 308 598 | 102 181 | 33.1% | '9', '9', '9' |
| 62 | `hor_3` | INT | 308 598 | 291 650 | 94.5% | '16', '20', '1' |
| 63 | `min_3` | INT | 308 598 | 291 650 | 94.5% | '0', '0', '0' |
| 64 | `usotiempo3` | INT | 308 598 | 73 142 | 23.7% | '9', '9', '9' |
| 65 | `hor_4` | INT | 308 598 | 245 791 | 79.6% | '14', '7', '42' |
| 66 | `min_4` | INT | 308 598 | 245 791 | 79.6% | '0', '0', '0' |
| 67 | `usotiempo4` | INT | 308 598 | 119 001 | 38.6% | '9', '9', '9' |
| 68 | `hor_5` | INT | 308 598 | 261 056 | 84.6% | '3', '4', '1' |
| 69 | `min_5` | INT | 308 598 | 261 056 | 84.6% | '0', '0', '0' |
| 70 | `usotiempo5` | INT | 308 598 | 103 736 | 33.6% | '9', '9', '9' |
| 71 | `hor_6` | INT | 308 598 | 111 589 | 36.2% | '5', '21', '3' |
| 72 | `min_6` | INT | 308 598 | 111 589 | 36.2% | '0', '0', '0' |
| 73 | `usotiempo6` | INT | 308 598 | 253 203 | 82.0% | '9', '9', '9' |
| 74 | `hor_7` | INT | 308 598 | 280 132 | 90.8% | '7', '3', '2' |
| 75 | `min_7` | INT | 308 598 | 280 132 | 90.8% | '1', '0', '0' |
| 76 | `usotiempo7` | INT | 308 598 | 84 660 | 27.4% | '9', '9', '9' |
| 77 | `hor_8` | INT | 308 598 | 64 922 | 21.0% | '14', '2', '14' |
| 78 | `min_8` | INT | 308 598 | 64 922 | 21.0% | '0', '0', '0' |
| 79 | `usotiempo8` | INT | 308 598 | 299 870 | 97.2% | '9', '9', '9' |
| 80 | `inst_1` | INT | 308 598 | 188 521 | 61.1% | '1', '1', '1' |
| 81 | `inst_2` | INT | 308 598 | 292 560 | 94.8% | '2', '2', '2' |
| 82 | `inst_3` | INT | 308 598 | 304 804 | 98.8% | '3', '3', '3' |
| 83 | `inst_4` | INT | 308 598 | 306 243 | 99.2% | '4', '4', '4' |
| 84 | `inst_5` | INT | 308 598 | 293 513 | 95.1% | '5', '5', '5' |
| 85 | `inst_6` | INT | 308 598 | 267 932 | 86.8% | '6', '6', '6' |
| 86 | `inst_7` | INT | 308 598 | 305 753 | 99.1% | '7', '7', '7' |
| 87 | `inst_8` | INT | 308 598 | 307 789 | 99.7% | '8', '8', '8' |
| 88 | `inst_9` | INT | 308 598 | 198 378 | 64.3% | '9', '9', '9' |
| 89 | `atemed` | INT | 308 598 | 198 378 | 64.3% | '2', '2', '2' |
| 90 | `inscr_1` | INT | 308 598 | 253 317 | 82.1% | '1', '1', '1' |
| 91 | `inscr_2` | INT | 308 598 | 296 615 | 96.1% | '2', '2', '2' |
| 92 | `inscr_3` | INT | 308 598 | 255 026 | 82.6% | '3', '3', '3' |
| 93 | `inscr_4` | INT | 308 598 | 305 903 | 99.1% | '4', '4', '4' |
| 94 | `inscr_5` | INT | 308 598 | 298 044 | 96.6% | '5', '5', '5' |
| 95 | `inscr_6` | INT | 308 598 | 306 818 | 99.4% | '6', '6', '6' |
| 96 | `inscr_7` | INT | 308 598 | 299 092 | 96.9% | '7', '7', '7' |
| 97 | `inscr_8` | INT | 308 598 | 308 348 | 99.9% | '8', '8', '8' |
| 98 | `prob_anio` | INT | 308 598 | 28 893 | 9.4% | '2024', '2024', '2023' |
| 99 | `prob_mes` | INT | 308 598 | 28 865 | 9.4% | '10', '10', '12' |
| 100 | `prob_sal` | INT | 308 598 | 28 847 | 9.3% | '2', '2', '1' |
| 101 | `aten_sal` | INT | 308 598 | 99 755 | 32.3% | '1', '1', '1' |
| 102 | `servmed_1` | INT | 308 598 | 279 799 | 90.7% | '01', '01', '01' |
| 103 | `servmed_2` | INT | 308 598 | 295 186 | 95.7% | '02', '02', '02' |
| 104 | `servmed_3` | INT | 308 598 | 264 116 | 85.6% | '03', '03', '03' |
| 105 | `servmed_4` | INT | 308 598 | 302 028 | 97.9% | '04', '04', '04' |
| 106 | `servmed_5` | INT | 308 598 | 302 378 | 98.0% | '05', '05', '05' |
| 107 | `servmed_6` | INT | 308 598 | 306 745 | 99.4% | '06', '06', '06' |
| 108 | `servmed_7` | INT | 308 598 | 307 140 | 99.5% | '07', '07', '07' |
| 109 | `servmed_8` | INT | 308 598 | 243 555 | 78.9% | '08', '08', '08' |
| 110 | `servmed_9` | INT | 308 598 | 268 926 | 87.1% | '09', '09', '09' |
| 111 | `servmed_10` | INT | 308 598 | 307 432 | 99.6% | '10', '10', '10' |
| 112 | `servmed_11` | INT | 308 598 | 306 272 | 99.2% | '11', '11', '11' |
| 113 | `hh_lug` | INT | 308 598 | 100 349 | 32.5% | '0', '0', '2' |
| 114 | `mm_lug` | INT | 308 598 | 100 349 | 32.5% | '30', '30', '0' |
| 115 | `hh_esp` | INT | 308 598 | 100 349 | 32.5% | '0', '0', '0' |
| 116 | `mm_esp` | INT | 308 598 | 100 349 | 32.5% | '1', '1', '5' |
| 117 | `pagoaten_1` | INT | 308 598 | 203 430 | 65.9% | '1', '1', '1' |
| 118 | `pagoaten_2` | INT | 308 598 | 198 734 | 64.4% | '2', '2', '2' |
| 119 | `pagoaten_3` | INT | 308 598 | 284 987 | 92.3% | '3', '3', '3' |
| 120 | `pagoaten_4` | INT | 308 598 | 301 096 | 97.6% | '4', '4', '4' |
| 121 | `pagoaten_5` | INT | 308 598 | 305 327 | 98.9% | '5', '5', '5' |
| 122 | `pagoaten_6` | INT | 308 598 | 306 986 | 99.5% | '6', '6', '6' |
| 123 | `pagoaten_7` | INT | 308 598 | 217 869 | 70.6% | '7', '7', '7' |
| 124 | `noatenc_1` | INT | 308 598 | 308 220 | 99.9% | '01', '01', '01' |
| 125 | `noatenc_2` | INT | 308 598 | 306 835 | 99.4% | '02', '02', '02' |
| 126 | `noatenc_3` | INT | 308 598 | 307 778 | 99.7% | '03', '03', '03' |
| 127 | `noatenc_4` | INT | 308 598 | 308 446 | 100.0% | '04', '04', '04' |
| 128 | `noatenc_5` | INT | 308 598 | 308 326 | 99.9% | '05', '05', '05' |
| 129 | `noatenc_6` | INT | 308 598 | 308 534 | 100.0% | '06', '06', '06' |
| 130 | `noatenc_7` | INT | 308 598 | 308 586 | 100.0% | '07', '07', '07' |
| 131 | `noatenc_8` | INT | 308 598 | 308 104 | 99.8% | '08', '08', '08' |
| 132 | `noatenc_9` | INT | 308 598 | 308 377 | 99.9% | '09', '09', '09' |
| 133 | `noatenc_10` | INT | 308 598 | 308 333 | 99.9% | '10', '10', '10' |
| 134 | `noatenc_11` | INT | 308 598 | 308 291 | 99.9% | '11', '11', '11' |
| 135 | `noatenc_12` | INT | 308 598 | 308 544 | 100.0% | '12', '12', '12' |
| 136 | `noatenc_13` | INT | 308 598 | 307 631 | 99.7% | '13', '13', '13' |
| 137 | `noatenc_14` | INT | 308 598 | 308 141 | 99.9% | '14', '14', '14' |
| 138 | `noatenc_15` | INT | 308 598 | 282 518 | 91.5% | '15', '15', '15' |
| 139 | `noatenc_16` | INT | 308 598 | 259 606 | 84.1% | '16', '16', '16' |
| 140 | `norecib_1` | INT | 308 598 | 308 400 | 99.9% | '01', '01', '01' |
| 141 | `norecib_2` | INT | 308 598 | 308 521 | 100.0% | '02', '02', '02' |
| 142 | `norecib_3` | INT | 308 598 | 308 400 | 99.9% | '03', '03', '03' |
| 143 | `norecib_4` | INT | 308 598 | 308 556 | 100.0% | '04', '04', '04' |
| 144 | `norecib_5` | INT | 308 598 | 308 570 | 100.0% | '05', '05', '05' |
| 145 | `norecib_6` | INT | 308 598 | 308 595 | 100.0% | '06', '06', '06' |
| 146 | `norecib_7` | INT | 308 598 | 308 594 | 100.0% | '07', '07', '07' |
| 147 | `norecib_8` | INT | 308 598 | 308 571 | 100.0% | '08', '08', '08' |
| 148 | `norecib_9` | INT | 308 598 | 308 571 | 100.0% | '09', '09', '09' |
| 149 | `norecib_10` | TEXT | 308 598 | 308 598 | 100.0% | — |
| 150 | `norecib_11` | INT | 308 598 | 308 588 | 100.0% | '11', '11', '11' |
| 151 | `razon_1` | INT | 308 598 | 308 588 | 100.0% | '01', '01', '01' |
| 152 | `razon_2` | TEXT | 308 598 | 308 598 | 100.0% | — |
| 153 | `razon_3` | INT | 308 598 | 308 523 | 100.0% | '03', '03', '03' |
| 154 | `razon_4` | INT | 308 598 | 308 539 | 100.0% | '04', '04', '04' |
| 155 | `razon_5` | INT | 308 598 | 308 558 | 100.0% | '05', '05', '05' |
| 156 | `razon_6` | INT | 308 598 | 308 550 | 100.0% | '06', '06', '06' |
| 157 | `razon_7` | INT | 308 598 | 308 527 | 100.0% | '07', '07', '07' |
| 158 | `razon_8` | INT | 308 598 | 308 453 | 100.0% | '08', '08', '08' |
| 159 | `razon_9` | INT | 308 598 | 308 566 | 100.0% | '09', '09', '09' |
| 160 | `razon_10` | INT | 308 598 | 308 557 | 100.0% | '10', '10', '10' |
| 161 | `razon_11` | INT | 308 598 | 308 473 | 100.0% | '11', '11', '11' |
| 162 | `diabetes` | INT | 308 598 | 56 194 | 18.2% | '1', '2', '1' |
| 163 | `pres_alta` | INT | 308 598 | 56 194 | 18.2% | '1', '2', '1' |
| 164 | `peso` | INT | 308 598 | 127 | 0.0% | '1', '2', '1' |
| 165 | `segvol_1` | INT | 308 598 | 304 569 | 98.7% | '1', '1', '1' |
| 166 | `segvol_2` | INT | 308 598 | 306 330 | 99.3% | '2', '2', '2' |
| 167 | `segvol_3` | INT | 308 598 | 303 755 | 98.4% | '3', '3', '3' |
| 168 | `segvol_4` | INT | 308 598 | 308 395 | 99.9% | '4', '4', '4' |
| 169 | `segvol_5` | INT | 308 598 | 307 463 | 99.6% | '5', '5', '5' |
| 170 | `segvol_6` | INT | 308 598 | 71 710 | 23.2% | '6', '6', '6' |
| 171 | `segvol_7` | INT | 308 598 | 304 151 | 98.6% | '7', '7', '7' |
| 172 | `hijos_viv` | INT | 308 598 | 176 133 | 57.1% | '2', '2', '0' |
| 173 | `hijos_mue` | INT | 308 598 | 217 468 | 70.5% | '0', '0', '0' |
| 174 | `hijos_sob` | INT | 308 598 | 217 468 | 70.5% | '2', '2', '5' |
| 175 | `trabajo_mp` | INT | 308 598 | 56 194 | 18.2% | '1', '1', '1' |
| 176 | `motivo_aus` | INT | 308 598 | 307 770 | 99.7% | '12', '06', '06' |
| 177 | `act_pnea1` | INT | 308 598 | 206 576 | 66.9% | '3', '4', '4' |
| 178 | `act_pnea2` | INT | 308 598 | 304 453 | 98.7% | '4', '3', '4' |
| 179 | `num_trabaj` | INT | 308 598 | 158 216 | 51.3% | '1', '1', '1' |
| 180 | `c_futuro` | INT | 308 598 | 308 231 | 99.9% | '2', '1', '2' |
| 181 | `ct_futuro` | INT | 308 598 | 308 231 | 99.9% | '9', '1', '9' |
| 182 | `entidad` | INT | 308 598 | 0 | 0.0% | '01', '01', '01' |
| 183 | `est_dis` | INT | 308 598 | 0 | 0.0% | '001', '001', '001' |
| 184 | `upm` | INT | 308 598 | 0 | 0.0% | '0000001', '0000001', '0000001' |
| 185 | `factor` | INT | 308 598 | 0 | 0.0% | '207', '207', '207' |

### `trabajos`

- CSV: `conjunto_de_datos_trabajos_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_trabajos_enigh2024_ns.csv`
- Tamaño: 19.2 MB — 164 325 filas × 60 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 1.3s
- Diccionario oficial INEGI: `diccionario_datos_trabajos_enigh2024_ns.csv` — 60 variables documentadas
- Catálogos INEGI en carpeta (`13`): `clas_emp.csv`, `entidad.csv`, `id_trabajo.csv`, `medtrab.csv`, `no_ing.csv`, `pago.csv`, `prestacion.csv`, `scian.csv`, `si_no.csv`, `sinco.csv`, `tam_emp.csv`, `tipoact.csv`, `tipocontr.csv`
- Modelo ER: `modelo_er_trabajos_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `foliohog` = 4, `folioviv` = 80 007, `numren` = 17

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 164 325 | 0 | 0.0% | '0100001901', '0100001901', '0100001902' |
| 2 | `foliohog` | INT | 164 325 | 0 | 0.0% | '1', '1', '1' |
| 3 | `numren` | INT | 164 325 | 0 | 0.0% | '01', '02', '01' |
| 4 | `id_trabajo` | INT | 164 325 | 0 | 0.0% | '1', '1', '1' |
| 5 | `trapais` | INT | 164 325 | 0 | 0.0% | '1', '1', '1' |
| 6 | `subor` | INT | 164 325 | 0 | 0.0% | '1', '1', '1' |
| 7 | `indep` | INT | 164 325 | 122 407 | 74.5% | '1', '1', '1' |
| 8 | `personal` | INT | 164 325 | 123 157 | 74.9% | '1', '1', '2' |
| 9 | `pago` | INT | 164 325 | 41 168 | 25.1% | '1', '1', '1' |
| 10 | `contrato` | INT | 164 325 | 50 300 | 30.6% | '1', '2', '1' |
| 11 | `tipocontr` | INT | 164 325 | 111 673 | 68.0% | '2', '2', '1' |
| 12 | `pres_1` | INT | 164 325 | 113 905 | 69.3% | '01', '01', '01' |
| 13 | `pres_2` | INT | 164 325 | 105 886 | 64.4% | '02', '02', '02' |
| 14 | `pres_3` | INT | 164 325 | 113 153 | 68.9% | '03', '03', '03' |
| 15 | `pres_4` | INT | 164 325 | 133 388 | 81.2% | '04', '04', '04' |
| 16 | `pres_5` | INT | 164 325 | 124 277 | 75.6% | '05', '05', '05' |
| 17 | `pres_6` | INT | 164 325 | 144 403 | 87.9% | '06', '06', '06' |
| 18 | `pres_7` | INT | 164 325 | 141 116 | 85.9% | '07', '07', '07' |
| 19 | `pres_8` | INT | 164 325 | 123 667 | 75.3% | '08', '08', '08' |
| 20 | `pres_9` | INT | 164 325 | 136 278 | 82.9% | '09', '09', '09' |
| 21 | `pres_10` | INT | 164 325 | 134 568 | 81.9% | '10', '10', '10' |
| 22 | `pres_11` | INT | 164 325 | 126 253 | 76.8% | '11', '11', '11' |
| 23 | `pres_12` | INT | 164 325 | 152 539 | 92.8% | '12', '12', '12' |
| 24 | `pres_13` | INT | 164 325 | 150 165 | 91.4% | '13', '13', '13' |
| 25 | `pres_14` | INT | 164 325 | 146 258 | 89.0% | '14', '14', '14' |
| 26 | `pres_15` | INT | 164 325 | 149 813 | 91.2% | '15', '15', '15' |
| 27 | `pres_16` | INT | 164 325 | 162 390 | 98.8% | '16', '16', '16' |
| 28 | `pres_17` | INT | 164 325 | 139 311 | 84.8% | '17', '17', '17' |
| 29 | `pres_18` | INT | 164 325 | 140 636 | 85.6% | '18', '18', '18' |
| 30 | `pres_19` | INT | 164 325 | 163 224 | 99.3% | '19', '19', '19' |
| 31 | `pres_20` | INT | 164 325 | 111 640 | 67.9% | '20', '20', '20' |
| 32 | `htrab` | INT | 164 325 | 0 | 0.0% | '48', '45', '48' |
| 33 | `sinco` | INT | 164 325 | 0 | 0.0% | '8352', '5211', '9233' |
| 34 | `scian` | INT | 164 325 | 0 | 0.0% | '3360', '8121', '3360' |
| 35 | `clas_emp` | INT | 164 325 | 52 114 | 31.7% | '2', '1', '2' |
| 36 | `tam_emp` | INT | 164 325 | 0 | 0.0% | '12', '02', '11' |
| 37 | `no_ing` | INT | 164 325 | 164 155 | 99.9% | '02', '03', '02' |
| 38 | `tiene_suel` | INT | 164 325 | 123 157 | 74.9% | '2', '2', '2' |
| 39 | `tipoact` | INT | 164 325 | 123 157 | 74.9% | '3', '3', '1' |
| 40 | `socios` | INT | 164 325 | 127 005 | 77.3% | '2', '2', '2' |
| 41 | `soc_nr1` | INT | 164 325 | 162 527 | 98.9% | '02', '02', '01' |
| 42 | `soc_nr2` | INT | 164 325 | 164 278 | 100.0% | '04', '03', '03' |
| 43 | `soc_resp` | INT | 164 325 | 162 527 | 98.9% | '01', '02', '02' |
| 44 | `otra_act` | INT | 164 325 | 127 793 | 77.8% | '2', '2', '2' |
| 45 | `tipoact2` | INT | 164 325 | 159 840 | 97.3% | '3', '2', '2' |
| 46 | `tipoact3` | INT | 164 325 | 164 208 | 99.9% | '1', '4', '2' |
| 47 | `tipoact4` | INT | 164 325 | 164 322 | 100.0% | '1', '1', '1' |
| 48 | `lugar` | INT | 164 325 | 159 831 | 97.3% | '1', '1', '2' |
| 49 | `conf_pers` | INT | 164 325 | 159 831 | 97.3% | '1', '1', '1' |
| 50 | `medtrab_1` | INT | 164 325 | 117 919 | 71.8% | '1', '1', '1' |
| 51 | `medtrab_2` | INT | 164 325 | 158 552 | 96.5% | '2', '2', '2' |
| 52 | `medtrab_3` | INT | 164 325 | 162 796 | 99.1% | '3', '3', '3' |
| 53 | `medtrab_4` | INT | 164 325 | 163 830 | 99.7% | '4', '4', '4' |
| 54 | `medtrab_5` | INT | 164 325 | 164 259 | 100.0% | '5', '5', '5' |
| 55 | `medtrab_6` | INT | 164 325 | 162 898 | 99.1% | '6', '6', '6' |
| 56 | `medtrab_7` | INT | 164 325 | 104 291 | 63.5% | '7', '7', '7' |
| 57 | `entidad` | INT | 164 325 | 0 | 0.0% | '01', '01', '01' |
| 58 | `est_dis` | INT | 164 325 | 0 | 0.0% | '001', '001', '001' |
| 59 | `upm` | INT | 164 325 | 0 | 0.0% | '0000001', '0000001', '0000001' |
| 60 | `factor` | INT | 164 325 | 0 | 0.0% | '207', '207', '207' |

### `viviendas`

- CSV: `conjunto_de_datos_viviendas_enigh2024_ns/conjunto_de_datos/conjunto_de_datos_viviendas_enigh2024_ns.csv`
- Tamaño: 15.4 MB — 90 324 filas × 82 columnas
- Encoding: `utf-8` — Separador: `,`
- Scan: 1.0s
- Diccionario oficial INEGI: `diccionario_datos_viviendas_enigh2024_ns.csv` — 82 variables documentadas
- Catálogos INEGI en carpeta (`26`): `ab_agua.csv`, `agua_ent.csv`, `agua_noe.csv`, `combus.csv`, `disp_elect.csv`, `dotac_agua.csv`, `drenaje.csv`, `eli_basura.csv`, `escrituras.csv`, `est_socio.csv`, `excusado.csv`, `fogon_chi.csv`, `lugar_coc.csv`, `mat_pared.csv`, `mat_pisos.csv`, `mat_techos.csv`, `procaptar.csv`, `sanit_agua.csv`, `si_no.csv`, `si_no_nosabe.csv`, `tam_loc.csv`, `tenencia.csv`, `tipo_adqui.csv`, `tipo_finan.csv`, `tipo_viv.csv`, `ubica_geo.csv`
- Modelo ER: `modelo_er_viviendas_enigh2024_ns.png`
- Metadatos: `metadatos_enigh_2024_ns.txt`
- Cardinalidad de llaves: `folioviv` = 90 324

| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |
|---:|---|---|---:|---:|---:|---|
| 1 | `folioviv` | INT | 90 324 | 0 | 0.0% | '0100001901', '0100001902', '0100001904' |
| 2 | `tipo_viv` | INT | 90 324 | 0 | 0.0% | '7', '1', '1' |
| 3 | `mat_pared` | INT | 90 324 | 0 | 0.0% | '8', '8', '8' |
| 4 | `mat_techos` | INT | 90 324 | 0 | 0.0% | '10', '10', '10' |
| 5 | `mat_pisos` | INT | 90 324 | 0 | 0.0% | '3', '3', '3' |
| 6 | `antiguedad` | INT | 90 324 | 12 278 | 13.6% | '30', '30', '25' |
| 7 | `antigua_ne` | INT | 90 324 | 78 046 | 86.4% | '1', '1', '1' |
| 8 | `cocina` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 9 | `cocina_dor` | INT | 90 324 | 5 686 | 6.3% | '2', '2', '2' |
| 10 | `cuart_dorm` | INT | 90 324 | 0 | 0.0% | '1', '3', '2' |
| 11 | `num_cuarto` | INT | 90 324 | 0 | 0.0% | '4', '4', '3' |
| 12 | `lugar_coc` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 13 | `agua_ent` | INT | 90 324 | 0 | 0.0% | '2', '1', '1' |
| 14 | `ab_agua` | INT | 90 324 | 4 175 | 4.6% | '1', '1', '1' |
| 15 | `agua_noe` | INT | 90 324 | 86 149 | 95.4% | '3', '5', '5' |
| 16 | `dotac_agua` | INT | 90 324 | 4 175 | 4.6% | '1', '1', '1' |
| 17 | `excusado` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 18 | `uso_compar` | INT | 90 324 | 1 498 | 1.7% | '2', '2', '2' |
| 19 | `sanit_agua` | INT | 90 324 | 1 498 | 1.7% | '1', '1', '1' |
| 20 | `biodigest` | INT | 90 324 | 1 498 | 1.7% | '2', '2', '2' |
| 21 | `bano_comp` | INT | 90 324 | 1 499 | 1.7% | '2', '2', '2' |
| 22 | `bano_excus` | INT | 90 324 | 1 498 | 1.7% | '0', '0', '0' |
| 23 | `bano_regad` | INT | 90 324 | 1 498 | 1.7% | '0', '0', '0' |
| 24 | `drenaje` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 25 | `disp_elect` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 26 | `focos` | INT | 90 324 | 475 | 0.5% | '9', '10', '11' |
| 27 | `focos_ahor` | INT | 90 324 | 486 | 0.5% | '9', '10', '11' |
| 28 | `combus` | INT | 90 324 | 0 | 0.0% | '3', '3', '3' |
| 29 | `fogon_chi` | INT | 90 324 | 77 060 | 85.3% | '1', '2', '2' |
| 30 | `eli_basura` | INT | 90 324 | 0 | 0.0% | '3', '3', '3' |
| 31 | `tenencia` | INT | 90 324 | 0 | 0.0% | '1', '3', '1' |
| 32 | `renta` | INT | 90 324 | 78 758 | 87.2% | '1500', '1000', '2500' |
| 33 | `estim_pago` | INT | 90 324 | 11 566 | 12.8% | '4000', '4500', '2000' |
| 34 | `pago_viv` | INT | 90 324 | 82 368 | 91.2% | '3000', '2100', '2000' |
| 35 | `pago_mesp` | INT | 90 324 | 70 802 | 78.4% | '1', '1', '1' |
| 36 | `tipo_adqui` | INT | 90 324 | 24 360 | 27.0% | '1', '1', '1' |
| 37 | `viv_usada` | INT | 90 324 | 72 467 | 80.2% | '1', '2', '2' |
| 38 | `finan_1` | INT | 90 324 | 80 285 | 88.9% | '1', '1', '1' |
| 39 | `finan_2` | INT | 90 324 | 88 845 | 98.4% | '2', '2', '2' |
| 40 | `finan_3` | INT | 90 324 | 90 246 | 99.9% | '3', '3', '3' |
| 41 | `finan_4` | INT | 90 324 | 90 232 | 99.9% | '4', '4', '4' |
| 42 | `finan_5` | INT | 90 324 | 87 786 | 97.2% | '5', '5', '5' |
| 43 | `finan_6` | INT | 90 324 | 88 811 | 98.3% | '6', '6', '6' |
| 44 | `finan_7` | INT | 90 324 | 88 317 | 97.8% | '7', '7', '7' |
| 45 | `finan_8` | INT | 90 324 | 47 971 | 53.1% | '8', '8', '8' |
| 46 | `num_dueno1` | INT | 90 324 | 24 360 | 27.0% | '01', '01', '01' |
| 47 | `hog_dueno1` | INT | 90 324 | 24 360 | 27.0% | '1', '1', '1' |
| 48 | `num_dueno2` | INT | 90 324 | 87 191 | 96.5% | '02', '02', '02' |
| 49 | `hog_dueno2` | INT | 90 324 | 87 191 | 96.5% | '1', '1', '1' |
| 50 | `escrituras` | INT | 90 324 | 24 360 | 27.0% | '1', '1', '1' |
| 51 | `lavadero` | INT | 90 324 | 0 | 0.0% | '1', '2', '1' |
| 52 | `fregadero` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 53 | `regadera` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 54 | `tinaco_azo` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 55 | `cisterna` | INT | 90 324 | 0 | 0.0% | '2', '1', '1' |
| 56 | `pileta` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 57 | `calent_sol` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 58 | `calent_gas` | INT | 90 324 | 0 | 0.0% | '2', '2', '1' |
| 59 | `calen_lena` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 60 | `medid_luz` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 61 | `bomba_agua` | INT | 90 324 | 0 | 0.0% | '2', '1', '1' |
| 62 | `tanque_gas` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 63 | `aire_acond` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 64 | `calefacc` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 65 | `p_grietas` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 66 | `p_pandeos` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 67 | `p_levanta` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 68 | `p_humedad` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 69 | `p_fractura` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 70 | `p_electric` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 71 | `p_tuberias` | INT | 90 324 | 0 | 0.0% | '2', '2', '2' |
| 72 | `tot_resid` | INT | 90 324 | 0 | 0.0% | '4', '4', '2' |
| 73 | `tot_hom` | INT | 90 324 | 0 | 0.0% | '2', '2', '1' |
| 74 | `tot_muj` | INT | 90 324 | 0 | 0.0% | '2', '2', '1' |
| 75 | `tot_hog` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 76 | `ubica_geo` | INT | 90 324 | 0 | 0.0% | '01001', '01001', '01001' |
| 77 | `tam_loc` | INT | 90 324 | 0 | 0.0% | '1', '1', '1' |
| 78 | `est_socio` | INT | 90 324 | 0 | 0.0% | '3', '3', '3' |
| 79 | `est_dis` | INT | 90 324 | 0 | 0.0% | '001', '001', '001' |
| 80 | `upm` | INT | 90 324 | 0 | 0.0% | '0000001', '0000001', '0000001' |
| 81 | `factor` | INT | 90 324 | 0 | 0.0% | '207', '207', '207' |
| 82 | `procaptar` | INT | 90 324 | 0 | 0.0% | '0', '0', '0' |

## Activos reutilizables de INEGI

INEGI empaqueta cada dataset con recursos adicionales listos para integrar. Esta tabla los centraliza para la sesión de ingesta.

| Dataset | Diccionario CSV | Catálogos | ER | Metadatos |
|---|---|---:|---|---|
| `agro` | `diccionario_datos_agro_enigh2024_ns.csv` (66) | 9 | `modelo_er_agro_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `agroconsumo` | `diccionario_datos_agroconsumo_enigh2024_ns.csv` (11) | 5 | `modelo_er_agroconsumo_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `agrogasto` | `diccionario_datos_agrogasto_enigh2024_ns.csv` (7) | 3 | `modelo_er_agrogasto_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `agroproductos` | `diccionario_datos_agroproductos_enigh2024_ns.csv` (25) | 7 | `modelo_er_agroproductos_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `concentradohogar` | `diccionario_datos_concentradohogar_enigh2024_ns.csv` (126) | 6 | `modelo_er_concentradohogar_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `erogaciones` | `diccionario_datos_erogaciones_enigh2024_ns.csv` (16) | 2 | `modelo_er_erogaciones_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `gastoshogar` | `diccionario_datos_gastoshogar_enigh2024_ns.csv` (31) | 11 | `modelo_er_gastoshogar_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `gastospersona` | `diccionario_datos_gastospersona_enigh2024_ns.csv` (23) | 8 | `modelo_er_gastospersona_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `gastotarjetas` | `diccionario_datos_gastotarjetas_enigh2024_ns.csv` (6) | 1 | `modelo_er_gastotarjetas_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `hogares` | `diccionario_datos_hogares_enigh2024_ns.csv` (148) | 9 | `modelo_er_hogares_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `ingresos` | `diccionario_datos_ingresos_enigh2024_ns.csv` (21) | 3 | `modelo_er_ingresos_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `ingresos_jcf` | `diccionario_datos_ingresos_jcf_enigh2024_ns.csv` (18) | 3 | `modelo_er_ingresos_jcf_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `noagro` | `diccionario_datos_noagro_enigh2024_ns.csv` (115) | 12 | `modelo_er_noagro_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `noagroimportes` | `diccionario_datos_noagroimportes_enigh2024_ns.csv` (17) | 3 | `modelo_er_noagroimportes_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `poblacion` | `diccionario_datos_poblacion_enigh2024_ns.csv` (185) | 38 | `modelo_er_poblacion_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `trabajos` | `diccionario_datos_trabajos_enigh2024_ns.csv` (60) | 13 | `modelo_er_trabajos_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |
| `viviendas` | `diccionario_datos_viviendas_enigh2024_ns.csv` (82) | 26 | `modelo_er_viviendas_enigh2024_ns.png` | `metadatos_enigh_2024_ns.txt` |

- Variables documentadas totales (suma de diccionarios): **957**
- Archivos de catálogo en disco (suma por dataset, con duplicados): **159**
- Catálogos únicos (nombre de archivo): **111**

### Catálogos únicos y en qué datasets aparecen

| Catálogo | Datasets |
|---|---|
| `ab_agua.csv` | `viviendas` |
| `acc_alim18.csv` | `hogares` |
| `act_pnea.csv` | `poblacion` |
| `agua_ent.csv` | `viviendas` |
| `agua_noe.csv` | `viviendas` |
| `antec_esc.csv` | `poblacion` |
| `cantidades.csv` | `gastoshogar`, `gastospersona` |
| `causa_no_cosecha.csv` | `agroproductos` |
| `cicloagr.csv` | `agroproductos` |
| `clas_emp.csv` | `trabajos` |
| `clase_hog.csv` | `concentradohogar` |
| `combus.csv` | `viviendas` |
| `ct_futuro.csv` | `ingresos_jcf`, `poblacion` |
| `destino.csv` | `agroconsumo` |
| `disc.csv` | `poblacion` |
| `disp_elect.csv` | `viviendas` |
| `dotac_agua.csv` | `viviendas` |
| `drenaje.csv` | `viviendas` |
| `edo_conyug.csv` | `poblacion` |
| `edu_ini.csv` | `poblacion` |
| `educa_jefe.csv` | `concentradohogar` |
| `eli_basura.csv` | `viviendas` |
| `entidad.csv` | `gastoshogar`, `gastospersona`, `hogares`, `ingresos`, `poblacion`, `trabajos` |
| `escrituras.csv` | `viviendas` |
| `est_socio.csv` | `concentradohogar`, `viviendas` |
| `excusado.csv` | `viviendas` |
| `fecha.csv` | `gastoshogar` |
| `fenomeno.csv` | `hogares` |
| `fogon_chi.csv` | `viviendas` |
| `forma_b.csv` | `poblacion` |
| `forma_c.csv` | `poblacion` |
| `forma_pag.csv` | `gastoshogar`, `gastospersona` |
| `fpago.csv` | `agro`, `noagro` |
| `frec_dicon.csv` | `hogares` |
| `frec_rem.csv` | `gastospersona` |
| `frecuencia.csv` | `gastoshogar` |
| `gastonegocioagro.csv` | `agrogasto` |
| `gastos.csv` | `gastoshogar`, `gastospersona` |
| `gastoscontarjeta.csv` | `gastotarjetas` |
| `grado.csv` | `poblacion` |
| `gradoaprob.csv` | `poblacion` |
| `habito.csv` | `hogares` |
| `id_trabajo.csv` | `agro`, `agroconsumo`, `agrogasto`, `agroproductos`, `noagro`, `noagroimportes`, `trabajos` |
| `ingresos_cat.csv` | `ingresos`, `ingresos_jcf` |
| `inscr.csv` | `poblacion` |
| `inst.csv` | `poblacion` |
| `inst_salud.csv` | `gastoshogar`, `gastospersona` |
| `lenguaind.csv` | `poblacion` |
| `lts_licon.csv` | `hogares` |
| `lugact.csv` | `noagro` |
| `lugar_coc.csv` | `viviendas` |
| `lugar_comp.csv` | `gastoshogar` |
| `mat_pared.csv` | `viviendas` |
| `mat_pisos.csv` | `viviendas` |
| `mat_techos.csv` | `viviendas` |
| `medtrab.csv` | `trabajos` |
| `mes.csv` | `agro`, `erogaciones`, `ingresos`, `ingresos_jcf`, `noagro`, `noagroimportes`, `poblacion` |
| `mes_dia.csv` | `gastoshogar`, `gastospersona` |
| `motivo_aus.csv` | `poblacion` |
| `nivel.csv` | `poblacion` |
| `nivelaprob.csv` | `poblacion` |
| `no_asis.csv` | `poblacion` |
| `no_asisb.csv` | `poblacion` |
| `no_ing.csv` | `trabajos` |
| `noagro_y_gastos.csv` | `noagroimportes` |
| `noatenc.csv` | `poblacion` |
| `nofpago.csv` | `agro`, `noagro` |
| `norecib.csv` | `poblacion` |
| `num_trabaj.csv` | `poblacion` |
| `numesta.csv` | `noagro` |
| `nvo_act.csv` | `agro`, `noagro` |
| `nvo_prog.csv` | `agro`, `noagro` |
| `orga_inst.csv` | `gastoshogar` |
| `otorg_b.csv` | `poblacion` |
| `otorg_c.csv` | `poblacion` |
| `pago.csv` | `trabajos` |
| `pago_dicon.csv` | `hogares` |
| `pagoaten.csv` | `poblacion` |
| `pais_nac.csv` | `poblacion` |
| `parentesco.csv` | `poblacion` |
| `peract.csv` | `noagro` |
| `prestacion.csv` | `trabajos` |
| `procaptar.csv` | `viviendas` |
| `producto.csv` | `erogaciones` |
| `productoagricola.csv` | `agroconsumo`, `agroproductos` |
| `razon.csv` | `poblacion` |
| `redsoc.csv` | `poblacion` |
| `reg_cont.csv` | `agro`, `noagro` |
| `residencia.csv` | `poblacion` |
| `sanit_agua.csv` | `viviendas` |
| `scian.csv` | `trabajos` |
| `segvol.csv` | `poblacion` |
| `servmed.csv` | `poblacion` |
| `sexo.csv` | `concentradohogar`, `poblacion` |
| `si_no.csv` | `agro`, `agroproductos`, `hogares`, `noagro`, `poblacion`, `trabajos`, `viviendas` |
| `si_no_noaplica.csv` | `agroconsumo`, `agroproductos` |
| `si_no_nosabe.csv` | `hogares`, `viviendas` |
| `sinco.csv` | `trabajos` |
| `tam_emp.csv` | `trabajos` |
| `tam_loc.csv` | `concentradohogar`, `viviendas` |
| `tenencia.csv` | `viviendas` |
| `tipo_adqui.csv` | `viviendas` |
| `tipo_finan.csv` | `viviendas` |
| `tipo_gasto.csv` | `gastoshogar`, `gastospersona` |
| `tipo_viv.csv` | `viviendas` |
| `tipoact.csv` | `agro`, `agroconsumo`, `agrogasto`, `agroproductos`, `noagro`, `trabajos` |
| `tipocontr.csv` | `trabajos` |
| `tipoesc.csv` | `poblacion` |
| `trabajo_mp.csv` | `poblacion` |
| `ubica_geo.csv` | `concentradohogar`, `viviendas` |
| `usotiempo.csv` | `poblacion` |

### Nota sobre el modelo ER

El modelo ER oficial viene como PNG (una imagen por dataset) — **no es SQL ni DDL**, así que no podemos auto-extraer las FKs de INEGI. Las relaciones siguen siendo las conocidas:
- Nivel vivienda: `folioviv`
- Nivel hogar: `folioviv + foliohog`
- Nivel persona: `folioviv + foliohog + numren`
