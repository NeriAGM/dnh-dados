# Tablero compartido del DJ — diseño

Fecha: 15/11/2026 · Rama: `tablero/compartido` (desde `main`) · Migración: `010_tablero.sql`

## Para qué

Neri (DJ) juega en línea por Discord: celular, compu y pantalla compartida. Pidió el tablero así:
«quiero que también sea tablero, para yo poderle mostrar cosas a mis jugadores, mapas y demás cosas al
estilo Roll20». Todo tiene que ser «súper intuitivo». Funciona si, en plena sesión, Neri sube un mapa,
lo muestra, destapa la zona donde están los PJ y cada jugador mueve su ficha, sin explicar nada.

## Lo que decidió Neri (15/11)

- **Qué se muestra:** imágenes (mapas, ilustraciones, handouts) **y texto** (título y nota).
- **Jugadores:** mueven fichas. Cada jugador mueve **solo la ficha de su PJ**; el DJ mueve todas.
  El DJ pone las fichas: las de los PJ salen solas con su color e inicial y agrega las de adversarios y PNJ.
- **Marcar:** **señalar con un toque**: al mantener presionado un punto sale una onda del color de quien
  señala, que todos ven unos segundos. No se guarda.
- **Niebla de guerra desde ya.** **Riesgo aceptado:** el navegador del jugador recibe el mapa
  completo y la niebla se pinta encima. Quien use las herramientas del navegador puede ver lo tapado.
- **Capa:** encima del fondo personal de cada jugador, al centro y detrás de los dados 3D. Cada quien
  puede minimizarlo, acercarlo y moverlo en su pantalla sin afectar a los demás.

## Metas, no metas y antimetas

- Metas: mostrar o quitar una imagen o un texto a toda la mesa en tiempo real; galería de tableros
  por campaña; fichas que se mueven; niebla; señal; acercar y mover la vista; modo demo local.
- No metas (para después): cuadrícula con «snap», reglas de distancia, dibujar trazos, capas, varias
  escenas a la vez, fichas ocultas a propósito, que los jugadores suban imágenes.
- Antimetas (aunque funcione, sería un fracaso): que un jugador vea mapas que el DJ no ha mostrado;
  que dos personas que mueven fichas a la vez se borren el movimiento; que el tablero tape los dados
  o los botones de la mesa sin poder quitarlo; que haga falta leer instrucciones para usarlo.

## Restricciones

CLAUDE.md del repo: español de México, sin dependencias nuevas, sin push ni merge a `main` sin el
«sí» de Neri, sin tocar Supabase en producción (la migración la aplica Neri), repo público. El tiempo
real sigue las trampas conocidas (`fusionarFila`, oyente de DELETE sin filtro, escrituras en cola).
En paralelo, otra rama rediseña todo el estilo (`rediseno/impecable`): la interfaz del tablero va
sencilla con las variables de color que ya existen, y `Mesa.svelte` solo recibe un botón.

## Enfoques considerados

1. **Una fila por tablero con todo en JSON** (imagen, texto, niebla y fichas). Es una sola tabla, pero
   cada movimiento reescribe la fila entera: si dos jugadores mueven a la vez, uno pisa al otro, salvo
   que todo pase por RPC. Además, cada movimiento manda la niebla completa por tiempo real.
2. **Dos tablas: `tableros` y `fichas` (una fila por ficha)** — **elegido.** Cada movimiento toca solo
   su fila; no hay choques y los mensajes del tiempo real son chicos. RLS natural. Cuesta un poco más
   de SQL.
3. **El enfoque 2 más transmisión en vivo mientras se arrastra** (las fichas se deslizan en todas las
   pantallas). Se ve mejor, pero manda decenas de mensajes por segundo y mete más estados raros. Por
   ahora la ficha salta a su lugar al soltarla; se puede agregar después sin cambiar la base.

La señal no se guarda: viaja por *broadcast* del mismo canal de tiempo real de la mesa.

## Cómo funciona (decidido)

### Base de datos (`010_tablero.sql`)
- `tableros`: `id`, `campania_id`, `nombre` (1–80), `imagen` (nombre del archivo en Storage o nulo,
  para un tablero de solo texto), `texto` (≤ 2000), `niebla` (cuadrícula codificada o nula = sin
  niebla, ≤ 20 000 caracteres), `tam_ficha` (tamaño de las fichas relativo al ancho del mapa),
  `actualizado`. Único `(id, campania_id)`.
- `campanias.tablero_id`: el tablero que se está mostrando (nulo = nada). Una llave foránea compuesta
  `(tablero_id, id) → tableros(id, campania_id)` impide apuntar al tablero de otra campaña; al borrar
  el tablero queda en nulo. Los jugadores ya escuchan los UPDATE de `campanias`, así que les llega el
  cambio aunque el tablero anterior ya no les sea visible.
- `fichas`: `id`, `tablero_id`, `campania_id` (para el filtro del tiempo real), `personaje_id` (nulo =
  adversario/PNJ), `nombre`, `color`, `x`, `y` (0–1 relativos a la imagen), `actualizado`.
- RLS: el DJ hace todo. Un miembro **solo lee el tablero que se está mostrando** y sus fichas. Un
  jugador **no escribe directo**: usa `mover_ficha(id, x, y)` (security definer), que solo deja mover
  la ficha de un PJ suyo en el tablero mostrado y recorta x, y a 0–1.
- Storage: bucket **privado** `tablero`, ruta `<campania_id>/<archivo>`, 5 MB, solo imágenes. El DJ
  sube y borra; un miembro solo abre la imagen del tablero mostrado (enlace firmado, como el lore).
- Tiempo real: `tableros` y `fichas` en la publicación.

### Interfaz
- **Capa en `App.svelte`** entre el fondo y los dados: `Tablero.svelte` muestra el tablero activo en
  un marco al centro. Abajo va el título y la nota (markdown seguro de `md.js`). Hay botones de
  acercar, alejar, centrar y minimizar (local, por jugador). Si el DJ muestra otro tablero, se
  vuelve a abrir solo.
- **Vista:** rueda o pellizco para acercar y arrastrar el fondo para mover. Es solo local.
- **Fichas:** círculos de color con la inicial y el nombre al pasar o tocar. El jugador arrastra la de
  su PJ (las demás no se mueven) y el DJ arrastra cualquiera. Se guarda al soltar. Para los jugadores,
  las fichas bajo niebla no se dibujan.
- **Señal:** mantener presionado ~0.5 s sin mover → onda de color por 3 s en todas las pantallas.
- **Niebla (solo DJ):** modos «Mover», «Destapar» y «Tapar» en la barra del marco. En modo pincel se
  pinta con el dedo o el ratón y se guarda al soltar. Botones «Tapar todo» y «Destapar todo». El DJ
  ve la niebla semitransparente; los jugadores la ven opaca con bordes suaves.
- **Panel del tablero (solo DJ):** botón «Tablero» en la barra de `Mesa.svelte`. Tiene la galería
  (subir imagen o crear tablero de texto), y por tablero: nombre, nota, mostrar u ocultar,
  activar/quitar niebla, «Agregar PJ» (todos los que falten), «Agregar ficha» (nombre y color),
  tamaño de fichas y borrar. Para quitar una ficha, el DJ la toca y aparece «Quitar».
- **Modo demo:** todo vive en memoria y las imágenes son URL de objeto. Al recargar se pierde.

### Lógica pura con pruebas (`src/lib/tablero.js`)
Niebla (crear, pintar un círculo, tapar o destapar todo, saber si un punto está tapado, codificar y
decodificar), recortar coordenadas y decidir quién mueve qué ficha.

### Decisiones tras la revisión (llamadas de Claude, por confirmar)
- **Número:** `010`, porque la `009` es de Ayudar a un Aliado (otra rama). No depende de ella:
  aplicada antes o después funciona igual.
- **Cambio de tablero:** cada vez que cambia `campanias.tablero_id`, el jugador vuelve a leer el
  tablero, sus fichas y el enlace firmado. No se fía de eventos sueltos, porque antes del cambio la
  RLS no le dejaba ver esas filas.
- **Imagen:** el enlace firmado dura una hora y se vuelve a pedir al vencer, como en el lore. La
  imagen de un tablero no se cambia: para otra imagen se crea otro tablero. Al borrar un tablero, el
  DJ borra también su archivo en Storage. Así no quedan archivos huérfanos.
- **Dueño de la ficha:** se toma de `personajes.usuario_id`. Un PJ sin dueño también tiene ficha,
  pero solo el DJ la mueve. Si el DJ reasigna el PJ, la ficha cambia de dueño sola.
- **Señal:** quien señala dibuja su onda en su pantalla (el *broadcast* no regresa a quien lo manda).
  El color es el de su PJ activo; el del DJ es morado.
- **Fichas bajo niebla:** se esconden solo en la pantalla del jugador. Es el mismo riesgo aceptado
  que el de la niebla.
- **Demo:** mismos límites que en línea (5 MB; JPG, PNG, WEBP o GIF).

## Lo que queda a quien construye
Tamaño exacto de la cuadrícula (una fila de ~64 celdas a lo ancho), radio del pincel, posición y
medidas del marco en escritorio y celular, colores y retoques visuales (luego los toma el rediseño),
nombres de funciones y la forma exacta de las colas de escritura.

## Pendientes para Neri (no los hace Claude)
- Aplicar `010_tablero.sql` en el editor SQL de Supabase (después de la 009).
- Riesgo de la señal: el canal de la mesa es público para quien sepa el id de la campaña (un uuid
  que no se adivina). Si alguien lo supiera, podría ver o mandar señales, pero no mapas. Cerrarlo
  requiere activar la autorización de Realtime en Supabase (cambio de configuración).
