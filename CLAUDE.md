# Dolor & Hambre · Mesa — guía para Claude

App web de mesa para la campaña de Daggerheart de Neri (él es el DJ). Publicada en
https://neriagm.github.io/dnh-dados/ · repo NeriAGM/dnh-dados · rama `main`.

## Cómo trabajar con Neri (obligatorio)
- Todo en **español mexicano**: interfaz, comentarios, nombres en código y commits.
- **Vocabulario y reglas de la casa los decide Neri**; la implementación la decides tú.
  Si eliges algo de reglas, toma la opción oficial del SRD y márcala como "por confirmar".
- Da números con su método. Recomienda con razón y luego alternativas.
- Explica qué hace el código y cómo se comprueba; anímalo a correr las pruebas
  (no le enseñes código entre semana de 8:00 a 18:00 si no lo pide).
- **Verifica visualmente antes de decir "listo"** (capturas en escritorio y celular, sin errores de consola).
- Pendientes viven en `docs/PENDIENTES.md`: actualízalo al cerrar cada tarea.
- No instales nada ni cambies configuración de servicios sin su "sí". Nunca escribas
  contraseñas ni secretos. Borrar cosas requiere su permiso.
- Seguridad: di el riesgo concreto, qué pasa si sale mal y tu recomendación.
- **El repo es público:** nunca subas lore, datos de personajes ni SQL de importación.

## Stack
Vite + Svelte 5 (runas `$state`, `$derived`, `$effect`, `$props`, snippets) · three.js + cannon-es
(dados 3D) · Supabase (Postgres + RLS + RPC + realtime + Storage + login Discord) · GitHub Pages.
Estilo: 2 espacios, sin punto y coma. Sin dependencias nuevas sin permiso.

## Comandos
- `npm ci` · `npm run dev` · `npm run build` · `npx vite preview`
- `npm run probar` → todas las pruebas (`src/**/*.test.mjs` y `supabase/pruebas/*.test.mjs`).
  Las de base de datos usan PGlite (`supabase/pruebas/base.mjs`): aplica TODAS las migraciones
  en orden e imita lo mínimo de Supabase (auth.uid, roles, realtime, Storage).
  Patrón: `como(uid, sql, params)` con `U.dj`, `U.ana`, `U.intruso`.
- Publicar = push a `main`; el workflow `.github/workflows/publicar.yml` prueba, compila y publica.
  Si una prueba falla, no se publica.

## Supabase
Proyecto `dktpjdljsmofqmmvcpkr`. Migraciones en `supabase/migraciones/` (001…007, todas aplicadas
en producción al 12/10/2026). Para una nueva: crea `00N_nombre.sql` (solo agregar; `drop … if exists`
únicamente de lo propio), su prueba en `supabase/pruebas/`, y aplícala en el editor SQL del panel
de Supabase (el editor avisa "destructive operations" por los `drop policy if exists`: revisa con
grep que no borre datos y confirma). Verifica con una consulta de solo lectura.

## Mapa del código
- `src/App.svelte`: capas (fondo animado o imagen, dados 3D, interfaz).
- `src/lib/mesa.svelte.js`: estado global `app`, carga de campaña, tiempo real, escrituras. Modo demo = local.
- `src/lib/tirador.js`: `tirar()` llama al RPC del servidor (el azar SIEMPRE lo decide el servidor;
  nunca uses Math.random para dados del juego). Tiene corte a los 15 s.
- `src/lib/dados3d/mesa.js`: física simulada y "reetiquetado" de caras para mostrar el valor del servidor.
- `src/lib/reglas.js`, `ayudas.js`, `avance.js`, `escena.js`, `ajustes.js`: reglas puras con pruebas.
- `src/lib/filas.js`: `fusionarFila` para el tiempo real (ver trampas).
- `src/componentes/`: Mesa, Lanzador, Resultado, Historial, Ajustes, Fondos, Escena, Casero,
  `hoja/` (Hoja, Dano, Descanso, Muerte, SubirNivel…), `dj/` (PanelDJ, Adversario), `lore/` (Lore).
- `datos/es/*`: SRD traducido; `datos/glosario.md`: términos decididos; `datos/esquema_hoja.md`: forma de la hoja.
- `docs/reglas/*.md`: resumen en español de las reglas de Daggerheart.

## Trampas ya conocidas (no las repitas)
- **`structuredClone` no copia objetos reactivos de Svelte (Proxy).** Usa `structuredClone($state.snapshot(x))`
  en `.svelte`/`.svelte.js`, o `JSON.parse(JSON.stringify(x))` en `.js` puro.
- **El tiempo real de Supabase no manda columnas grandes sin cambios en un UPDATE** (p. ej. `hoja`).
  Nunca reemplaces la fila entera: mézclala con `fusionarFila(vieja, nueva)`.
- **`requestAnimationFrame` puede dar una hora anterior al inicio**: el cuadro de animación nunca debe
  ser negativo, y toda animación debe terminar siempre (errores, pestaña oculta, tiempo máximo).
- En Svelte, un espacio al inicio de un `<span>` se pierde: usa `&nbsp;`.
- En Playwright no uses `pkill -f` con un patrón que coincida con tu propio comando (mata el shell).
- Chromium para capturas: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` con
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` (en el contenedor de la nube).
- Commits: autor `Claude <noreply@anthropic.com>` con las líneas de coautoría de la sesión.
