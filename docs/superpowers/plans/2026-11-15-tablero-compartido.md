# Tablero compartido — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El DJ muestra a toda la mesa, en tiempo real, un tablero (imagen y/o texto) con fichas que se mueven, niebla y señales.

**Architecture:** Migración `010` con dos tablas (`tableros`, `fichas`), un puntero `campanias.tablero_id`, RPC `mover_ficha` y bucket privado `tablero`. La lógica pura (niebla, permisos, posiciones) vive en `src/lib/tablero.js` con pruebas. El estado y el tiempo real van en `src/lib/tablero.svelte.js`, con su propio canal. La interfaz es una capa en `App.svelte` (`Tablero.svelte`) más un panel del DJ (`PanelTablero.svelte`) que se abre con un botón en `Mesa.svelte`.

**Tech Stack:** Svelte 5 (runas), Supabase (Postgres, RLS, Realtime postgres_changes + broadcast, Storage), PGlite para pruebas, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-15-tablero-compartido-design.md`

## Global Constraints

- Español de México en interfaz, comentarios, nombres y commits. Estilo: 2 espacios, sin punto y coma.
- Sin dependencias nuevas. Sin push ni merge a `main`. No tocar Supabase en producción.
- Migración solo agrega; `drop … if exists` solo de lo propio.
- `structuredClone($state.snapshot(x))` en `.svelte(.js)`; nunca reemplazar filas del tiempo real: `fusionarFila`.
- Todo DELETE del tiempo real con oyente SIN filtro.
- Escrituras a la misma fila en cola (`crearColas` de `src/lib/filas.js`).
- Animaciones: terminan siempre y respetan `prefers-reduced-motion`.
- Imágenes: 5 MB, JPG/PNG/WEBP/GIF (también en demo).

## Review Focus

1. Un jugador que tiene abierta la mesa cuando el DJ cambia de tablero ve el nuevo sin recargar, y deja de ver el viejo → prueba de RLS (Task 1) más verificación manual en la Task 6.
2. Un jugador que mueve su ficha mientras llega un eco viejo del tiempo real: la ficha no regresa. Se resuelve con la cola `ficha:<id>`, que ignora el tiempo real mientras está ocupada (Task 3).
3. Una imagen muy alta o muy ancha (1:6): la cuadrícula de niebla queda con filas ≥ 1 y ≤ 256 → prueba en Task 2.
4. Niebla guardada dañada o con otro tamaño (texto raro, `d` corto): `leerNiebla` regresa `null` y no truena → prueba en Task 2.
5. Reconexión del tiempo real (el celular se durmió): se vuelve a leer todo el tablero (Task 3, `subscribe` con contador de uniones como en `mesa.svelte.js`).

---

### Task 1: Migración 010 y sus pruebas

**Files:**
- Create: `supabase/migraciones/010_tablero.sql`
- Test: `supabase/pruebas/tablero.test.mjs` (patrón de `escena.test.mjs`: `preparar()`, `como(uid, sql, params)`)

**Interfaces — Produces:**
- `tableros(id uuid pk, campania_id uuid → campanias on delete cascade, nombre text 1–80, imagen text null (sin «/», ≤ 200), texto text not null default '' (≤ 2000), niebla jsonb null (objeto, ≤ 20000 bytes), tam_ficha real not null default 0.05 (0.01–0.3), creado, actualizado)`, `unique (id, campania_id)`, trigger `tocar_actualizado()`.
- `campanias.tablero_id uuid` con FK `(tablero_id, id) → tableros(id, campania_id) on delete set null (tablero_id)`.
- `fichas(id uuid pk, tablero_id, campania_id, FK (tablero_id, campania_id) → tableros on delete cascade, personaje_id uuid null → personajes on delete cascade, nombre text 1–40, color text '^#[0-9a-fA-F]{6}$' default '#a77ce8', x real 0–1 default 0.5, y real 0–1 default 0.5, creado, actualizado)`, trigger `tocar_actualizado()`.
- `tablero_mostrado(p_tablero uuid) returns boolean` (security definer).
- `mover_ficha(p_ficha uuid, p_x real, p_y real) returns fichas` (security definer; DJ cualquiera; jugador solo la de un PJ con `usuario_id = auth.uid()`, en el tablero mostrado y siendo miembro; x, y recortados a 0–1, nulos → 0.5). Errores: `'No existe esa ficha'`, `'Solo puedes mover la ficha de tu personaje'`.
- RLS: `tableros_dj`/`fichas_dj` (todo, `es_dj`); `tableros_ver`/`fichas_ver` (select, `es_miembro and tablero_mostrado`).
- Bucket privado `tablero` (5242880, 4 tipos), ruta `<campania_id>/<archivo>`; `tablero_imagen_visible(name)`; políticas ver (DJ o miembro con imagen visible), subir, cambiar y borrar (solo DJ, una carpeta). Usa `lore_campania(name)` para leer el uuid.
- `tableros` y `fichas` en `supabase_realtime`.

- [ ] **Step 1: Escribir las pruebas** (`tablero.test.mjs`):
  - `el jugador no ve un tablero hasta que el DJ lo muestra` (DJ inserta → Ana `select` = 0 filas; DJ `update campanias set tablero_id` → Ana ve 1 tablero y sus fichas; intruso 0).
  - `al cambiar de tablero el jugador deja de ver el anterior`.
  - `el jugador no escribe tableros ni fichas directo` (insert da error de RLS; update/delete afectan 0 filas).
  - `mover_ficha: Ana mueve la ficha de su PJ y se recorta a 0–1` (`p_x = 1.7` → `x = 1`).
  - `mover_ficha: Ana no mueve la de un adversario, ni la suya en un tablero no mostrado; el intruso no mueve nada`.
  - `no se puede mostrar el tablero de otra campaña` (FK da error).
  - `borrar el tablero mostrado deja tablero_id en nulo y borra sus fichas`.
  - `límites: texto de 2001, color "rojo" y niebla enorme se rechazan`.
  - `storage: Ana solo ve la imagen del tablero mostrado; no sube; el DJ sube solo en la carpeta de su campaña` (insertar en `storage.objects` como DJ; `select` como Ana).
- [ ] **Step 2:** `node --test supabase/pruebas/tablero.test.mjs` → FALLA (no existe la tabla).
- [ ] **Step 3:** Escribir `010_tablero.sql` con el encabezado de riesgos (niebla en pantalla, señal por canal público).
- [ ] **Step 4:** `node --test supabase/pruebas/tablero.test.mjs` → PASA; `npm run probar` → todo en verde.
- [ ] **Step 5:** Commit «Tablero: migración 010 (tableros, fichas, mover_ficha, bucket privado) con pruebas».

### Task 2: Lógica pura del tablero

**Files:** Create `src/lib/tablero.js`; Test `src/lib/tablero.test.mjs`

**Interfaces — Produces:**
- `NIEBLA_COLUMNAS = 64`
- `crearNiebla(ancho: number, alto: number, tapada = true) → { c, f, celdas: Uint8Array }` (f = round(64·alto/ancho) dentro de 1–256; 1 = tapada)
- `leerNiebla(guardada) → { c, f, celdas } | null` (acepta `{ c, f, d }` con `d` en base64 de bits; cualquier cosa rara → `null`)
- `escribirNiebla({ c, f, celdas }) → { c, f, d }`
- `pintar(niebla, x, y, radio, tapar: boolean) → boolean` (muta; `radio` en fracción del ancho; regresa si cambió algo)
- `llenar(niebla, tapar: boolean) → void`
- `tapado(niebla | null, x, y) → boolean` (sin niebla → false)
- `recortar(v) → number` (0–1; no numérico → 0.5)
- `puedeMover(ficha, { uid, esDJ, personajes }) → boolean`
- `vistaFicha(ficha, personajes) → { nombre, color, inicial }` (si tiene PJ, nombre y color actuales del PJ)
- `fichasVisibles(fichas, niebla, esDJ) → fichas[]`
- `pjsSinFicha(personajes, fichas, tableroId) → personajes[]`
- `posicionInicial(n: number) → { x, y }` (en fila sobre la parte baja; nunca fuera de 0–1)

- [ ] **Step 1: Pruebas:** ida y vuelta `escribirNiebla`/`leerNiebla` iguales; `crearNiebla(100, 600)` → `f = 256`, `crearNiebla(600, 100)` → `f = 11`, `crearNiebla(6000, 10)` → `f = 1`; `leerNiebla('x')`, `leerNiebla({ c: 64, f: 2, d: 'AA' })` → `null`; `pintar(n, 0.5, 0.5, 0.1, false)` destapa el centro (`tapado(n, 0.5, 0.5) === false`) y no la esquina; regresa `false` si nada cambió; `llenar`; `recortar(-3) = 0`, `recortar('a') = 0.5`; `puedeMover`: DJ sí, dueño sí, otro no, adversario no; `fichasVisibles` esconde la ficha bajo niebla solo al jugador; `pjsSinFicha`; `posicionInicial(0..30)` siempre dentro de 0–1.
- [ ] **Step 2:** `node --test src/lib/tablero.test.mjs` → FALLA.
- [ ] **Step 3:** Implementar (base64 con `btoa`/`atob`; bits en orden fila por fila, el bit más alto primero).
- [ ] **Step 4:** → PASA.
- [ ] **Step 5:** Commit «Tablero: niebla, permisos y posiciones (lógica pura con pruebas)».

### Task 3: Estado, escrituras y tiempo real (`tablero.svelte.js`)

**Files:** Create `src/lib/tablero.svelte.js`; Modify `src/lib/lore.svelte.js` (exportar `reducir`).

**Interfaces — Consumes:** Task 2; `app`, `supabase`, `crearColas`, `fusionarFila`, `esMasVieja`; `reducir` de lore.
**Produces:**
- `tablero = $state({ lista: [], fichas: [], abierto: null, mostradoDemo: null, senales: [], urls: {}, subiendo: false, error: '' })`. `lista`: para el DJ, todos; para el jugador, solo el mostrado.
- `idMostrado() → uuid|null` (`app.demo ? tablero.mostradoDemo : app.campania?.tablero_id ?? null`)
- `esDJTablero() → boolean` (`app.demo || app.rol === 'dj'`)
- `tableroVisible() → fila|null` (DJ: `abierto` o el mostrado; jugador: el mostrado)
- `sincronizarTablero()`: la llama un `$effect` en `Tablero.svelte` con `app.demo`, `app.campania?.id`, `app.rol` y `idMostrado()`. Si cambia la campaña o el modo, abre o cierra el canal `tablero-<id>` y carga. Si solo cambia `idMostrado()`, recarga el tablero mostrado y sus fichas. Descarta las respuestas tardías con un contador.
- `crearTablero({ archivo?: File, nombre?: string }) → fila|undefined` (reduce, valida y sube a `<campania>/<Date.now()>-<nombre>.<ext>`; guarda `niebla: null`; la deja en `abierto`)
- `guardarTablero(id, cambios)` (cola `tablero:<id>`; optimista con deshacer si falla)
- `mostrarTablero(id|null)` (`update campanias set tablero_id`; cola `mostrar:<campania>`)
- `borrarTablero(id)` (borra la fila y luego el archivo; si era el mostrado, queda en nulo)
- `crearFicha({ tablero_id, personaje_id?, nombre, color, x?, y? })`, `agregarPJs(tableroId)`, `moverFicha(id, x, y)` (RPC `mover_ficha`, cola `ficha:<id>`, optimista), `borrarFicha(id)`
- `senalar(x, y)` (la agrega local y la manda por broadcast `senal` `{ x, y, color, tablero_id }`; cada señal se quita a los 3 s)
- `urlTablero(fila) → Promise<string|null>` (demo: URL de objeto; en línea: firmada 3600 s, caché 50 min)
- Tiempo real: `tableros` y `fichas` (`*` filtrado por `campania_id` + `DELETE` sin filtro), broadcast `senal` (solo si `tablero_id` coincide con el visible), reconexión → recargar. Mientras la cola `ficha:<id>`/`tablero:<id>` esté ocupada, se ignora el eco.

- [ ] **Step 1:** Implementar el módulo (sin prueba unitaria: tiene runas y red; se verifica en la Task 6).
- [ ] **Step 2:** `npm run build` → sin errores.
- [ ] **Step 3:** Commit «Tablero: estado, escrituras y tiempo real».

### Task 4: Capa `Tablero.svelte` en `App.svelte`

**Files:** Create `src/componentes/tablero/Tablero.svelte`; Modify `src/App.svelte` (montar entre `.velo` y `canvas.dados` cuando `app.demo || app.campania`; `.tablero { z-index: 1 }` antes de los dados en el DOM).

**Interfaces — Consumes:** Tasks 2 y 3.

Comportamiento (de la spec): marco centrado, imagen con capa de niebla (`<canvas>` de `c×f` estirado con `filter: blur`; opaca para el jugador y al 55 % para el DJ), fichas (círculo de color con inicial; tamaño = `tam_ficha` × ancho de la imagen), señales (anillo que crece 3 s; con movimiento reducido solo aparece y se desvanece), título y nota (`md()`). Barra: −, +, centrar y minimizar (local). Para el DJ: «Mover / Destapar / Tapar», y en modo pincel «Tapar todo / Destapar todo». Si el DJ ve otro tablero que el mostrado, aparece «Vista previa: la mesa no lo ve» con el botón «Mostrar a la mesa». Gestos: rueda y pellizco para acercar; arrastrar el fondo para mover; arrastrar una ficha propia para moverla (se guarda al soltar); mantener presionado 500 ms sin moverse (> 6 px cancela) para señalar; en modo pincel, pintar con radio 0.04 y guardar la niebla al soltar. El DJ toca una ficha y aparece «Quitar». Un tablero nuevo mostrado se vuelve a abrir aunque el jugador lo haya minimizado. Tablero de solo texto: tarjeta con título y nota.

- [ ] **Step 1:** Implementar el componente y montarlo en `App.svelte`.
- [ ] **Step 2:** `npm run build` → sin errores.
- [ ] **Step 3:** Commit «Tablero: capa compartida al centro de la mesa».

### Task 5: Panel del DJ y botón en `Mesa.svelte`

**Files:** Create `src/componentes/tablero/PanelTablero.svelte`; Modify `src/componentes/Mesa.svelte` (estado `verTablero`, botón «Tablero» junto a «Lore» para `puedeDJ`, cerrar los otros paneles al abrirlo y viceversa, montar el panel).

Contenido: «Subir imagen» (input de archivo) y «Tablero de texto»; lista de tableros (el mostrado lleva «En la mesa») que al tocarla pone `abierto`; editor del abierto: nombre, nota (guarda al salir del campo), «Mostrar a la mesa»/«Quitar de la mesa», «Agregar niebla»/«Quitar niebla», «Agregar PJ (n)», «Agregar ficha» (nombre y color), «Tamaño de fichas» (rango 0.02–0.15) y «Borrar tablero» (con `confirm`). Errores en `tablero.error`.

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** `npm run build` → sin errores.
- [ ] **Step 3:** Commit «Tablero: panel del DJ».

### Task 6: Verificación, pendientes y cierre

- [ ] **Step 1:** `npm run probar` → todo en verde; `npm run build` → sin errores.
- [ ] **Step 2:** En modo demo (vista previa `dnh-dados`): subir una imagen de prueba, mostrar, agregar PJ y una ficha, moverla, activar niebla, pintar, señalar, minimizar, tablero de texto y borrar. Capturas en escritorio (1440×900) y celular (375×812), sin errores de consola.
- [ ] **Step 3:** `docs/PENDIENTES.md`: aplicar la `010` (Neri, después de revisar con grep que no borre datos), riesgo de la señal y la autorización de Realtime, lo que quede de la spec (trazos, cuadrícula, fichas ocultas) y la verificación con dos cuentas reales.
- [ ] **Step 4:** Commit «Tablero: pendientes».
