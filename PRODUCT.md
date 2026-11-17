# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Neri, el DJ** de la campaña *Dolor & Hambre* (Daggerheart™ Compatible). Lleva Miedo, encuentros, adversarios, cuentas regresivas y el lore; muchas veces desde la compu con el panel del DJ abierto mientras los jugadores están en el celular.
- **Los jugadores de la mesa.** Tiran Dualidad, daño y tiradas libres; llevan su Esperanza, Estrés, Puntos de Golpe y la hoja de su personaje; leen el lore que el DJ deja visible.
- Juegan **en línea, hablando por Discord**. Uso privado de la mesa: no hay público externo.

## Product Purpose

Una mesa de dados en vivo para la campaña: cada tirada la decide el servidor, se ve caer en 3D y le llega a toda la mesa al mismo tiempo con su desenlace (con Esperanza, con Miedo, crítico) y sus consecuencias. Alrededor de la tirada viven la hoja de personaje con reglas, el panel del DJ, la escena del encuentro activo, el lore de la campaña y los fondos de cada jugador.

Éxito: en plena sesión nadie busca nada. La tirada se entiende de un vistazo en celular, en compu y en pantalla compartida, y cada panel tiene su lugar sin taparse con otro.

## Positioning

Es la mesa de *esta* campaña, no una app genérica de dados: azar del servidor con física 3D que muestra ese mismo número, la economía de Esperanza y Miedo en vivo para toda la mesa, reglas del SRD 2.0 en español de México con el glosario de la casa, lore propio con visibilidad por página y fondos personales por jugador.

## Operating Context

- Los cuatro modos de uso pasan de verdad (confirmado por Neri, 15/11/2026):
  - cada jugador en su **celular** con Discord;
  - en **compu o laptop** con Discord al lado (ventana dividida: anchos de escritorio angostos);
  - **pantalla compartida** (tele o compartir pantalla en Discord): se lee de lejos;
  - **el DJ en la compu** y los jugadores en el celular.
- Las tiradas llegan por tiempo real; varias personas pueden tirar seguido. El historial agrupa por día.
- El fondo puede ser el pueblo animado (cambia con la hora: amanecer, día, atardecer, noche) o una imagen que sube cada jugador; la interfaz tiene que leerse sobre cualquiera de los dos.
- Modo demo local sin cuenta para probar.

## Capabilities and Constraints

- Vite + Svelte 5 (runas), three.js + cannon-es para los dados, Supabase (login con Discord o enlace por correo, tiempo real, Storage), GitHub Pages. Publicar = push a `main`.
- Capas fijas: fondo (paisaje o imagen) → lienzo de dados 3D → interfaz. La interfaz le avisa a la mesa 3D qué zona queda libre para que los dados caigan (`mesa3d.ajustarZona`).
- Sin dependencias nuevas sin el "sí" de Neri; eso incluye fuentes y librerías de íconos.
- Todo en español de México, tuteando. El vocabulario del juego lo decide Neri en `datos/glosario.md` (Esperanza, Miedo, Estrés, Evasión, PG, DJ, PJ…).
- El repo es público: nada de lore real ni datos de personajes en el código.
- Licencia DPCGL: no se usan logotipos, marcas ni la imagen comercial de Darrington Press / Daggerheart.
- Movimiento reducido ya se respeta en la física y en las animaciones; toda animación debe terminar siempre.

## Brand Commitments

- Nombre: **Dolor & Hambre · Mesa**.
- Tono de la campaña: **anime melancólico** (paisajes bonitos y tristes; ternura con tragedia). Confirmado por Neri, 15/11/2026.
- La identidad es propia de la mesa, no de Daggerheart.
- El aspecto actual (vidrio morado, botón dorado en degradado, serif Zen Old Mincho + M PLUS Rounded) es evidencia, no compromiso: Neri lo describe como "súper básico" y "genérico".

## Evidence on Hand

- Contenido de demostración en el repo: personaje de prueba (`src/lib/demo.js`), lore de ejemplo (`src/lib/loreDemo.js`), catálogo del SRD traducido (`datos/es_2_0`).
- El paisaje pintado con código (`src/lib/fondo/paisaje.js`) y los estilos de los dados (`src/lib/dados3d/estilos.js`).
- No hay logotipo, ilustraciones propias ni fotos de la campaña. El lore y los personajes reales viven solo en Supabase y no se usan en el repo.

## Product Principles

1. **La tirada es el momento.** Total, desenlace y consecuencias se leen en un segundo, en cualquier pantalla, y quedan en el historial para quien no estaba viendo.
2. **Cada cosa en su lugar.** Nada se encima: la mesa, la hoja, el panel del DJ, el lore y los ajustes tienen un sitio fijo y predecible en celular y en compu.
3. **Se lee sobre cualquier fondo.** El paisaje o la imagen de cada jugador nunca se come el texto.
4. **Sin inventar reglas.** Lo que la interfaz dice de reglas sale del SRD 2.0 y del glosario de la mesa.
5. **Celular y compu valen lo mismo.** Ningún modo de uso es de segunda.

## Accessibility & Inclusion

- Contraste suficiente sobre fondos variables (el ajuste automático de legibilidad ya existe en `lib/fondo/ajustes.js`).
- Toques cómodos en celular; foco visible con teclado; respeto a `prefers-reduced-motion`.
- Legible de lejos en pantalla compartida.
