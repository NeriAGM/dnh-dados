---
name: Dolor & Hambre · Mesa
description: Mesa de dados Daggerheart™ Compatible como novela visual al atardecer: vidrio claro sobre el paisaje, tinta índigo, Esperanza cielo y Miedo ocaso.
colors:
  tinta: "#1d2440"
  tinta-suave: "#474f6e"
  tinta-presionada: "#2c3459"
  sobre-color: "#ffffff"
  vidrio: "rgb(247 249 253 / 0.68)"
  vidrio-firme: "rgb(247 249 253 / 0.9)"
  hundido: "rgb(29 36 64 / 0.06)"
  hundido-2: "rgb(29 36 64 / 0.11)"
  filete: "rgb(29 36 64 / 0.13)"
  filete-fuerte: "rgb(29 36 64 / 0.26)"
  brillo: "rgb(255 255 255 / 0.62)"
  velo: "rgb(16 18 42 / 0.3)"
  noche-base: "#2b2c5c"
  esperanza: "#2f9fd8"
  esperanza-hondo: "#11618f"
  esperanza-suave: "rgb(47 159 216 / 0.15)"
  miedo: "#c2416b"
  miedo-hondo: "#8c2147"
  miedo-suave: "rgb(194 65 107 / 0.13)"
  critico: "#f2b53a"
  critico-hondo: "#7d5200"
  critico-suave: "rgb(242 181 58 / 0.22)"
  peligro: "#c4412b"
  peligro-hondo: "#962a1a"
  peligro-suave: "rgb(196 65 43 / 0.12)"
  exito: "#2a8a63"
  exito-hondo: "#1b6648"
  exito-suave: "rgb(42 138 99 / 0.13)"
typography:
  display:
    fontFamily: "Zen Maru Gothic, M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 9vw, 4.6rem)"
    fontWeight: 900
    lineHeight: 1
  numeral:
    fontFamily: "Zen Maru Gothic, M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "2.7rem"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "tnum"
  headline:
    fontFamily: "Zen Maru Gothic, M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1.15
  accion:
    fontFamily: "Zen Maru Gothic, M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 900
    letterSpacing: "0.02em"
  dialogo:
    fontFamily: "Zen Maru Gothic, M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Zen Maru Gothic, M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 900
    lineHeight: 1.2
  body:
    fontFamily: "Zen Maru Gothic, M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.45
  body-chico:
    fontFamily: "Zen Maru Gothic, M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Zen Maru Gothic, M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  panel: "24px"
  tirar: "16px"
  control: "14px"
  campo: "12px"
  chico: "9px"
  pildora: "999px"
spacing:
  hueco: "12px"
  hueco-compacto: "8px"
components:
  vidrio:
    backgroundColor: "{colors.vidrio}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.panel}"
  panel-firme:
    backgroundColor: "{colors.vidrio-firme}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.panel}"
  boton:
    backgroundColor: "{colors.hundido}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.95rem"
    height: "2.5rem"
  boton-hover:
    backgroundColor: "{colors.hundido-2}"
  boton-solido:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.sobre-color}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.95rem"
    height: "2.5rem"
  boton-solido-hover:
    backgroundColor: "{colors.tinta-presionada}"
  boton-peligro:
    backgroundColor: "{colors.peligro-suave}"
    textColor: "{colors.peligro-hondo}"
    rounded: "{rounded.control}"
  boton-fantasma:
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
  tirar:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.sobre-color}"
    typography: "{typography.accion}"
    rounded: "{rounded.tirar}"
    padding: "0.55rem 1.2rem"
    height: "3.5rem"
  tirar-hover:
    backgroundColor: "{colors.tinta-presionada}"
  icono:
    textColor: "{colors.tinta}"
    rounded: "{rounded.pildora}"
    size: "2.5rem"
  campo:
    backgroundColor: "{colors.brillo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.campo}"
    padding: "0.55rem 0.8rem"
    height: "2.5rem"
  rotulo:
    textColor: "{colors.tinta-suave}"
    typography: "{typography.label}"
  placa:
    textColor: "{colors.sobre-color}"
    typography: "{typography.title}"
    padding: "0.25rem 0.8rem 0.3rem"
  interruptor-si:
    backgroundColor: "{colors.hundido-2}"
    rounded: "{rounded.pildora}"
    width: "2.9rem"
    height: "1.7rem"
  interruptor-si-activo:
    backgroundColor: "{colors.esperanza-hondo}"
  resultado:
    backgroundColor: "{colors.vidrio-firme}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.panel}"
    padding: "1.3rem 2.6rem 1rem 1.4rem"
  ficha-dado:
    backgroundColor: "{colors.hundido}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pildora}"
    padding: "0.15rem 0.6rem"
---

# Design System: Dolor & Hambre · Mesa

## Overview

**Creative North Star: "Novela visual al atardecer"**

Cada tirada es una línea de diálogo: una placa con el nombre del PJ montada sobre el borde de una caja de texto, el número grande y el desenlace escribiéndose de izquierda a derecha, y una marca ▼ que respira al final. Todo lo demás de la mesa (banda superior, PJ, escena, cuentas, registro, lanzador) son cajas de vidrio claro esmerilado, translúcidas al estilo One UI, flotando sobre el paisaje del fondo. El centro de la pantalla queda vacío a propósito: ahí caen los dados 3D.

La densidad es de herramienta de mesa, no de página: retícula fija a la altura de la ventana, sin desplazamiento global, con cajas que se compactan por corte en vez de apilarse sin fin. La tinta es índigo, nunca negro; el color se reserva para lo que significa algo en el juego (Esperanza, Miedo, crítico, daño, éxito) y para las placas de cada PJ. Una sola familia redondeada lleva toda la jerarquía por peso (500 / 700 / 900), y las cifras son tabulares.

Rechazado explícitamente por el contrato de dirección: el tablero oscuro de vidrio con paneles flotando sobre el paisaje. Aquí el vidrio es claro y la tinta oscura.

**Key Characteristics:**
- Vidrio claro translúcido cuya opacidad sube sola sobre fondos oscuros.
- Tinta índigo; color solo con significado de juego o de PJ.
- La tirada como línea de diálogo con placa de nombre.
- Un solo plato sólido en la mesa: Tirar.
- Una familia redondeada, peso como jerarquía, cifras tabulares.
- La mesa se aparta y se atenúa cuando se enfoca un panel.

## Colors

Paleta de atardecer sobre vidrio claro: tinta índigo fría, cinco acentos con significado, cada uno en tres grados (base, `-hondo` para texto legible sobre vidrio, `-suave` para rellenos).

### Primary
- **Tinta índigo** (`tinta`): todo el texto, íconos, el subrayado de la pestaña activa y el relleno del único plato sólido. Su variante **tinta presionada** (`tinta-presionada`) es el hover de los sólidos; hoy vive como literal en `.boton.solido:hover` y `.tirar:hover`, no como variable.
- **Tinta tenue** (`tinta-suave`): rótulos, texto secundario, pestañas inactivas, avisos de vacío.

### Secondary
- **Esperanza, azul cielo** (`esperanza`, `esperanza-hondo`, `esperanza-suave`): el dado de Esperanza, sus fichas y desenlaces, el anillo de foco (2.5px en `esperanza-hondo`), el foco de los campos (halo de 3px en `esperanza-suave`), el interruptor encendido, `accent-color` nativo y la selección de texto.
- **Miedo, rosa ocaso** (`miedo`, `miedo-hondo`, `miedo-suave`): el dado de Miedo, la cifra de Miedo de la banda (en `miedo-hondo`), sus fichas y desenlaces, y la «y» del logotipo de la entrada.

### Tertiary
- **Crítico, luz cálida** (`critico`, `critico-hondo`, `critico-suave`): solo para el crítico. El vidrio del resultado se enciende con un anillo de 2px en `critico` que se expande una vez en `critico-suave`; la placa pasa a `critico-hondo`.
- **Peligro** (`peligro`, `peligro-hondo`, `peligro-suave`): botones destructivos, errores (`peligro-hondo`, 700), desventaja, crítico del DJ, el latido de una cuenta regresiva en cero.
- **Éxito** (`exito`, `exito-hondo`, `exito-suave`): la ficha de ventaja y confirmaciones.

### Neutral
- **Vidrio** (`vidrio`): el fondo de toda caja de la mesa. Su alfa no es fijo: ver Elevation & Depth.
- **Vidrio firme** (`vidrio-firme`): el mismo vidrio con alfa mínima de 0.9, para la caja de diálogo del resultado, diálogos, ajustes, campañas, entrada y paneles del DJ: lo que se lee con calma.
- **Hundido** (`hundido`, `hundido-2`): rellenos de botón en reposo y en hover, fichas de dado, interruptor apagado.
- **Filetes** (`filete`, `filete-fuerte`): bordes de botón y campo, separadores, el doble filete interior del resultado, la barra de desplazamiento.
- **Brillo** (`brillo`): el borde blanco de 1px del vidrio y el fondo de los campos.
- **Velo** (`velo`): la cortina que atenúa la mesa bajo paneles y diálogos.
- **Noche base** (`noche-base`): color del `html` mientras carga el fondo.

### Colores fuera de los tokens (deliberados)
- **Placas de PJ**: cada PJ elige su color (Ajustes ofrece seis); la placa lo mezcla al 64 % con índigo noche (`#11142e`) en oklab para que el blanco siempre se lea.
- **Dados 3D** (`lib/dados3d/estilos.js`): cuerpos más claros que los tokens de interfaz para que brillen bajo la luz de la escena: Esperanza `#45b2ec`, Miedo `#de6b93`, ventaja `#2f8f7a`, desventaja `#a8323e`, normal marfil `#efe4cf`, dado del DJ casi negro `#1d1a24` con número `#e0475a`. Mismos tonos que la interfaz, distinta luminosidad.

### Named Rules
**The Color Con Significado Rule.** El color solo aparece cuando dice algo del juego (Esperanza, Miedo, crítico, daño, ventaja) o quién es (placa de PJ). Lo demás es tinta sobre vidrio.

**The Hondo Para Leer Rule.** Sobre vidrio, el texto de color usa siempre la variante `-hondo`; la base es para dados, anillos y rellenos, y la `-suave` para fondos de ficha.

**The La Más Nueva a Todo Color Rule.** En el registro solo la tirada más reciente lleva su color de desenlace (fondo al 11 % y total de 1.9rem); las anteriores quedan en tinta.

## Typography

**Display Font:** Zen Maru Gothic (con M PLUS Rounded 1c y system-ui de respaldo)
**Body Font:** la misma familia
**Label/Mono Font:** la misma; las cifras usan `tabular-nums`

**Character:** una sola letra redondeada y amable, de novela visual japonesa, que pone toda la jerarquía en el peso: 500 para leer, 700 para controles y rótulos, 900 para títulos y cifras. La letra es elegible en Personalizar (`lib/letra.js`): Zen Maru Gothic (por defecto), M PLUS Rounded 1c o la del sistema; se aplica con `data-letra` en `<html>` y se guarda en el navegador.

### Hierarchy
- **Display** (900, clamp(2.6rem, 9vw, 4.6rem), 1): solo el nombre de la mesa en la pantalla de entrada.
- **Numeral** (900, 2.7rem; 2.1rem en celular y acostado; 1): el total de la tirada en la caja de diálogo, en el color del desenlace.
- **Headline** (900, 1.5rem, 1.15): títulos de diálogos y de Ajustes.
- **Acción** (900, 1.45rem, +0.02em): la palabra «Tirar».
- **Diálogo** (700, 1.35rem; 1.05rem compacto; 1.2): la línea del resultado.
- **Title** (900, 1.1rem, 1.2): placas de nombre, encabezados del registro.
- **Body** (500, 1rem, 1.45): texto base. **Body chico** (0.85rem) es el tamaño secundario más usado (fichas, ayudas, subtítulos de diálogo).
- **Label** (700, 0.75rem, +0.06em, MAYÚSCULAS, `tinta-suave`): el rótulo de un dato o campo: «Esperanza», «Estrés», «Evasión», «Correo».

### Named Rules
**The Peso Es Jerarquía Rule.** Una sola familia; los niveles se distinguen por peso y tamaño, nunca por otra letra.

**The Cifras en Columna Rule.** Todo número que cambia (totales, contadores, dados, PG) va en cifras tabulares.

**The Rótulo Nombra un Dato Rule.** El rótulo en mayúsculas etiqueta un valor o un campo que está junto a él; no se usa como antetítulo encima de un título.

## Layout

La mesa es una retícula a pantalla completa (`position: absolute; inset: 0`), sin desplazamiento global, con huecos de `hueco` (12px; 8px en celular y en pantallas bajas) y márgenes que respetan las zonas seguras. La celda del centro no tiene caja ni recibe clics: es la zona libre que se mide en el script para que caigan los dados.

**Escritorio, ≥1100px:** tres columnas, izquierda 300px (PJ, escena, cuentas), centro libre, derecha 320px (registro). Filas: banda superior; centro; caja de diálogo (mínimo 8.5rem); lanzador. Con la hoja abierta la columna izquierda crece a 560px (600px con el panel del DJ), el lado se oculta y el registro baja a 55 % de opacidad salvo al pasar o enfocar. Entre 1100 y 1359px, con un panel enfocado, el registro desaparece.

**Mediana, 960–1099px:** columnas de 270px y 280px; los botones de la banda ponen su nombre debajo del ícono (0.7rem) y el botón Hoja de la banda se oculta.

**Ventana partida, 760–959px:** dos columnas (lado de 280px y centro). El registro sale de la retícula: se abre desde «Tiradas» como panel lateral derecho de hasta 340px, deslizándose sobre una cortina.

**Celular, <760px:** una columna con hueco de 8px: banda (nombre y navegación arriba, Miedo en su propio renglón con los puntos repartidos), PJ, escena, centro, cuentas, caja de diálogo (mínimo 8.25rem) y lanzador pegado al borde inferior con esquinas solo arriba. El registro es una hoja inferior de min(78dvh, 640px).

**Pantallas bajas, ≤560px de alto y ≥600px de ancho (celular acostado):** tres columnas (260px, centro, 360px); la caja de diálogo y el lanzador pasan a la columna derecha y el lado izquierdo se compacta: cuentas en columna, medidores en dos renglones sin la cifra «3/6» (la dicen los puntos), botón «ver hoja» solo con ícono, y el resultado oculta las fichas de dados porque los valores ya se leen en los dados 3D.

### Named Rules
**The Centro Libre Rule.** La celda central nunca lleva caja ni contenido: es de los dados.

**The Zona de los Dados Rule.** La mesa 3D (`dados3d/mesa.js`) no deja que la zona de los dados pase de ~45 % de la altura desde arriba ni de 50 % desde abajo. Todo lo que rodea al centro se reparte entre arriba y abajo en vez de amontonarse en un solo lado; por eso en celular la escena va arriba con el PJ y las cuentas abajo con el resultado.

## Elevation & Depth

Profundidad por material, no por capas de sombra: el vidrio desenfoca y satura el paisaje (`blur(var(--vidrio-desenfoque)) saturate(1.5)`), lleva un borde blanco de 1px y un filete interior blanco al 35 %, y una sombra ambiental larga y difusa debajo. Los paneles que se leen con calma usan el vidrio firme y la sombra alta. Lo que flota encima de la mesa trae una cortina (`velo`) que la atenúa.

**El ajuste automático del vidrio** (`variablesLegibilidad` en `lib/fondo/ajustes.js`): según la luminancia efectiva del fondo y el deslizador «vidrio» (0–100, por defecto 50), escribe en `:root`:
- `--vidrio-alfa` = min(0.95, 0.5 + 0.36·v + 0.2·oscuro), donde `oscuro` crece de 0 a 1 conforme el fondo baja de 0.6 a 0.15 de luminancia. Con los valores por defecto da 0.68, el valor de reposo en `app.css`.
- `--vidrio-desenfoque` = 12 + 28·v px (26px por defecto).
- `--sombra-texto`, más fuerte cuanto más claro es el fondo, solo para el texto blanco que va directo sobre el paisaje (`.sobre-fondo`).

`vidrio-firme` nunca baja de 0.9 de alfa, sin importar el ajuste.

### Shadow Vocabulary
- **Sombra** (`0 1px 2px rgb(18 20 50 / 0.08), 0 14px 34px -18px rgb(18 20 50 / 0.5)`): toda caja de vidrio de la mesa.
- **Sombra alta** (`0 2px 6px rgb(18 20 50 / 0.1), 0 30px 70px -30px rgb(18 20 50 / 0.65)`): diálogos, Ajustes, campañas, entrada, paneles del DJ.
- **Sombra de texto** (`0 1px 2px rgb(12 14 36 / 0.45), 0 0 16px rgb(12 14 36 / 0.3)` en reposo; la ajusta el fondo): texto blanco sobre el paisaje.
- **Sombra de Tirar** (`0 12px 24px -14px rgb(18 20 50 / 0.85)`): solo el plato de Tirar.
- **Brillo crítico** (anillo de 2px en `critico` que arranca con un halo de 18px en `critico-suave` y se apaga en 1.2s): solo el resultado crítico.

### Named Rules
**The Vidrio Que Se Ajusta Rule.** Nadie fija la opacidad del vidrio a mano: la decide el fondo. Si una caja necesita leerse siempre, usa vidrio firme.

**The Sombra Difusa Rule.** Las sombras son largas, suaves y de tinta índigo con desplazamiento negativo; no hay sombras duras ni desplazadas.

## Shapes

Esquinas grandes y redondas al estilo One UI: cajas de 24px (`panel`), el plato de Tirar de 16px, controles de 14px, campos de 12px, fichas y efectos de 9px, y píldoras completas para fichas de dado, interruptores y botones de solo ícono (círculo). La banda superior usa 20px. La silueta propia del sistema es la **placa**: esquinas de 11px salvo la inferior izquierda, de 3px, como etiqueta de nombre de novela visual. Las pestañas tienen esquinas solo arriba (10px) y se marcan con un subrayado interior de 3px. La marca «sigue» ▼ del resultado es un triángulo hecho con bordes CSS, no un glifo.

## Components

### Buttons
Táctiles y discretos: casi todos hundidos en el vidrio; uno solo sólido.
- **Shape:** esquinas suaves (`control`, 14px), alto mínimo de 2.5rem, peso 700, ícono y texto con 0.45rem de separación.
- **Base:** relleno `hundido`, filete de 1px; hover a `hundido-2`; al presionar se encoge a 0.97; deshabilitado al 45 %.
- **Presionado (`aria-pressed`):** fondo blanco, `filete-fuerte` y una sombra corta: así se marcan los segmentos elegidos.
- **Sólido:** relleno de tinta con texto blanco; hover a `tinta-presionada`.
- **Peligro:** texto `peligro-hondo` sobre `peligro-suave`, filete de peligro al 40 %.
- **Fantasma:** sin fondo ni borde hasta el hover.
- **Ícono (`.icono`):** círculo de 2.5rem sin fondo; hover a `hundido-2`.

### Tirar (componente firma)
El plato sólido de la mesa: ancho completo del lanzador, alto de 3.5rem (3.25rem en celular, 3rem acostado), esquinas de 16px, tinta con texto blanco, la palabra «Tirar» en Acción (1.45rem, 900) a la izquierda y la fórmula en cifras tabulares a la derecha, sombra propia. Mientras ruedan los dados dice «Rodando…» y se apaga a `#555b78`.

### Caja de diálogo del resultado (componente firma)
La tirada como línea de novela visual. Botón de ancho completo (se cierra al tocarlo), vidrio firme, esquinas de 24px y un doble filete interior (5px de vidrio firme y 1px de `filete-fuerte`) que la enmarca como caja de texto.
- **Placa** montada sobre el borde superior izquierdo (−0.95rem), con el nombre del PJ o del autor y «· oculta» si aplica.
- **Línea**: qué se tiró (en tinta), el total en Numeral y el desenlace en 900, ambos en el color de acento (`-hondo` de Esperanza, Miedo, crítico o peligro para el crítico del DJ). Se escribe de izquierda a derecha en 0.5s por pasos.
- **Fichas de dado** en píldora con el color de su rol (Esperanza, Miedo, ventaja, desventaja; tachadas al 50 % si se descartan) y **efectos** en fichas de 9px teñidas del acento al 12 %. En compacto, las fichas no se envuelven y los efectos se vuelven una sola frase separada por « · ».
- **Marca ▼** abajo a la derecha que respira (1.6s, infinita).
- **Crítico:** anillo cálido que se enciende una vez; placa en `critico-hondo`.

### Placa
Etiqueta del nombre de un PJ: texto blanco 900 sobre el color del PJ mezclado con índigo noche, esquinas 11/11/11/3, sombra corta, una línea con puntos suspensivos. Se usa en la mesa (1.1rem), la hoja y el resultado.

### Cards / Containers
- **Corner Style:** 24px (`panel`).
- **Background:** `vidrio` en la mesa (clase `.vidrio`); `vidrio-firme` en lo que flota encima.
- **Shadow Strategy:** sombra en la mesa, sombra alta en lo flotante (ver Elevation & Depth).
- **Border:** 1px de `brillo` más filete interior blanco.
- **Diálogos** (`hoja/Dialogo.svelte`): centrados, ancho variable hasta 100vw − 1.2rem, cabecera con título Headline y botón de cerrar, cuerpo desplazable, pie con separador y acciones alineadas a la derecha.

### Inputs / Fields
- **Style:** fondo blanco al 62 %, filete de 1px, esquinas de 12px, alto mínimo de 2.5rem.
- **Focus:** borde a `esperanza-hondo` con halo de 3px en `esperanza-suave`. Fuera de los campos, el foco visible es un contorno de 2.5px en `esperanza-hondo` separado 2px.
- **Error:** mensaje aparte en `peligro-hondo`, 0.9rem, 700.

### Navigation
- **Banda superior:** vidrio de esquinas de 20px y alto mínimo de 3.5rem con el nombre de la mesa, los puntos de Miedo y los botones Hoja / DJ / Lore / Ajustes con ícono; en anchos menores a 1100px el nombre va debajo del ícono.
- **Pestañas (`.pestanas`):** fila desplazable sin barra, filete inferior; pestaña en `tinta-suave` 700 a 0.95rem; la activa en tinta con subrayado interior de 3px.
- **Interruptor (`.interruptor-si`):** píldora de 2.9 × 1.7rem, `hundido-2` apagado y `esperanza-hondo` encendido; perilla blanca que se desliza con la curva suave.

### Íconos
`Icono.svelte` es el único juego de íconos: SVG en línea, trazo redondo de 1.8 sobre una cuadrícula de 24, `currentColor`, 20px por defecto. Decorativos por omisión; con `titulo` cuando van solos. No se usan emojis ni glifos tipográficos como íconos.

### Movimiento
Una sola curva, `suave` (`cubic-bezier(0.22, 1, 0.36, 1)`), para entradas y deslizamientos (0.18–0.3s). Hovers de 0.15s; el botón presionado se encoge al 0.97 (Tirar al 0.98). Gestos con nombre: el resultado aparece subiendo 10px; la línea se escribe por pasos; las fichas asoman con 0.4s de retraso; la marca ▼ respira; el crítico se enciende una vez; la cortina se desvanece en 0.25s; el registro y los paneles se deslizan desde su borde. **Movimiento reducido:** una regla global lleva toda animación y transición a 0.01ms, y el resultado y la cuenta en cero quitan además sus animaciones explícitamente.

## Do's and Don'ts

### Do:
- **Do** poner toda caja nueva de la mesa en vidrio (`.vidrio`, 24px) y lo que flota encima en vidrio firme con sombra alta y cortina.
- **Do** dejar que el fondo decida la opacidad del vidrio mediante `variablesLegibilidad`.
- **Do** usar la variante `-hondo` para texto de color sobre vidrio y la `-suave` para rellenos.
- **Do** escribir toda cifra que cambie en cifras tabulares.
- **Do** dar a cada diálogo o panel a lo sumo una acción sólida, la que confirma; en la mesa, esa acción es Tirar.
- **Do** repartir lo que rodea a los dados entre arriba (≤ ~45 %) y abajo (≤ 50 %) de la altura.
- **Do** dibujar íconos nuevos en `Icono.svelte` con trazo redondo de 1.8 sobre 24.

### Don't:
- **Don't** volver al tablero oscuro de vidrio con paneles flotando sobre el paisaje.
- **Don't** poner un segundo plato sólido en la mesa junto a Tirar.
- **Don't** fijar a mano la opacidad del vidrio ni bajar el vidrio firme de 0.9.
- **Don't** usar el color sin significado de juego o de PJ.
- **Don't** añadir otra familia de letra; la jerarquía va por peso.
- **Don't** usar el rótulo en mayúsculas como antetítulo encima de un título.
- **Don't** usar sombras duras o desplazadas, ni emojis o glifos como íconos.
- **Don't** poner caja ni contenido en la celda central de la mesa.
