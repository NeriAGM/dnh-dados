# Pendientes

## Para publicar la fase 1 y 2

- [x] Dar acceso de escritura a `nearigamez` en este repo (o instalar la app de Claude en NeriAGM).
- [x] En *Settings → Pages* del repo, cambiar *Source* a **GitHub Actions**.
- [x] Correr `supabase/migraciones/001_mesa.sql` en el editor SQL de Supabase.
- [x] Elegir cómo entran los jugadores: Discord o enlace por correo. Si es Discord, crear la app en el portal de desarrolladores de Discord y activarla en *Authentication → Providers* de Supabase.
- [x] En Supabase, *Authentication → URL Configuration*: agregar `https://neriagm.github.io/dnh-dados/` a las URL de regreso.
- [ ] Crear la campaña "Dolor & Hambre", repartir el código y crear los personajes.

## Revisar en tus hojas de Notion (antes de migrarlas)

- [x] **Mira:** cuadrada con las reglas el 12/10 (Instinto 0, Evasión 14, Gambesón 3, umbrales 7/13, arco Lejano, cartas en mano). La nota para su jugador está en sus Notas.
- [ ] **Mira:** falta saber su segunda mejora de nivel 2 (solo se registró +1 PG). Si fue +1 Evasión, queda en 15.
- [ ] **Mira / Soladius:** el ataque del compañero dice alcance Cercano; el del compañero base es Cuerpo a cuerpo. Tiene 3 Experiencias. Sin verificar contra la hoja del compañero (era una imagen).
- [ ] Vocabulario: la carta física de Mira dice «Maniobras ágiles»; la app dice «Maniobras hábiles». ¿Cuál dejamos?
- [ ] **Valerius:** tiene tres +1 en rasgos.
- [ ] **Valerius:** el Artificiero es homebrew; decidir sus números finales para capturarlo.

## Fases siguientes

- [x] Fase 3: hojas de personaje con reglas, cartas de dominio, homebrew, migración desde Notion, contenido del SRD 2.0.
- [ ] Elegir las cartas de dominio de cada personaje (en Notion eran imágenes y no se pudieron leer).
- [ ] Revisar las armas e inventario de Milo: en Notion son iguales a los de Soren (parece plantilla copiada).
- [ ] Capturar la hoja de Aida (en Notion solo hay trasfondo).
- [ ] Asignar cada personaje importado a su jugador (Ajustes → Personajes).
- [ ] Verificar el contenido del SRD 2.0 contra el PDF oficial (hoy viene de una transcripción comunitaria).
- [x] Fase 4: panel del DJ (adversarios, entornos, cuentas regresivas, puntos de batalla). Migración 003.
- [ ] Neri (sin prisa): revisar nombres traducidos del bestiario (Ent, Destellífero, Sable de abordaje, Lobo terrible, Esqueleto desenterrado…). Ya decidido: Ooze = Limo. Para cambiar uno: decirle a Claude "X cámbialo por Y".
- [x] Escena: los jugadores ven nombre, tipo y estado de los enemigos del encuentro activo; ojo para ocultar. Migración 005.
- [x] Ayudas de reglas en la hoja: recibir daño, descansos, movimientos de muerte, subir de nivel.
- [x] Fase 5: fondos personalizados por jugador. Migración 004.
- [ ] Neri: confirmar regla del estado (Herido < mitad, Grave ≥ mitad, Caído = todos). Si la mesa ve el entorno ya se decide en Ajustes → Reglas de la mesa.
- [ ] Neri: confirmar casillas por mejora al subir de nivel (tomadas de la hoja oficial; los docs las marcan sin verificar).
- [x] Reglas de la mesa (ajustes de campaña que decide el DJ): daño masivo, monedas y si la mesa ve el entorno. Migración 006.
- [x] Migración 006 aplicada en Supabase (12/10).
- [ ] Neri: decidir si se agregan las fichas de acción (regla opcional del foco) como regla de la mesa.
- [ ] Glosario: agregar términos de descansos, muerte y subir de nivel (Limpiar Estrés, Llamarada de gloria, cicatriz, mejoras, logros de rango).
- [ ] Personajes importados con nivel no tienen avances registrados: los límites de mejoras solo cuentan desde la app.

## Lore de la campaña (migración 007)

- [x] Migración 007 aplicada en Supabase (12/10).
- [x] Lore importado de Notion el 12/10: 17 páginas, todas ocultas. Las 5 hojas de personaje de Notion quedaron en «Personajes › Hojas de Notion (archivo)».
- [ ] Lore: 73 imágenes de Notion quedaron como «imagen pendiente» (no se pueden bajar desde el servidor). Se pueden subir desde el editor del lore.
- [ ] Lore: los 6 comentarios de «Historia de su nacimiento» no se trajeron.
- [x] Decidido: el lore se edita en la app; Notion queda de archivo (no se reimporta).

## Tablero compartido (migración 010, rama `tablero/compartido`)

Hecho el 15/11: el DJ sube mapas, imágenes o notas y muestra uno a la mesa; fichas (cada jugador mueve la de su PJ), niebla con pincel y señal manteniendo presionado. Funciona en modo demo. Diseño en `docs/superpowers/specs/2026-11-15-tablero-compartido-design.md`.

- [x] Migración 010 aplicada en Supabase (15/11, Postgres 17.11). Verificado con solo lectura: tablas `tableros` y `fichas` vacías con RLS, bucket `tablero` privado, columna `campanias.tablero_id`, 8 políticas, 2 tablas en tiempo real y `mover_ficha` cerrada para `anon`.
- [x] Publicado en `main` el 15/11 (Neri: «primero publicamos esto»).
- [ ] Probar con dos cuentas lo fino del tablero (Neri ya probó DJ + jugador el 15/11 sin errores; falta confirmar): mostrar y cambiar de tablero, mover la ficha propia, que la ajena no se mueva, niebla opaca para el jugador, fichas bajo niebla ocultas y señal. En demo solo se ve la vista del DJ.
- [ ] Riesgo aceptado por Neri (15/11): la niebla se pinta en la pantalla del jugador; con las herramientas del navegador se puede ver el mapa completo y las fichas tapadas.
- [ ] Riesgo menor: las señales viajan por un canal de tiempo real público para quien sepa el id de la campaña (un uuid). Para cerrarlo: activar la autorización de Realtime (canales privados) en Supabase.
- [ ] Neri: confirmar vocabulario (por confirmar): «tablero», «ficha», «niebla» (Destapar / Tapar) y «señal». El panel de fondos ya dice «Tablero del día»: ¿se queda así?
- [x] Arreglados (15/11, rama `arreglos/mesa-menores`): la niebla ya no vuelve a crear el lienzo en cada movimiento del dedo; «Agregar PJ» con dos toques rápidos ya no duplica fichas; el jugador ya ve los errores del tablero (p. ej. una ficha rechazada).
- [ ] Detalles menores que quedan: si falla la primera lectura, un cambio que llegue por tiempo real puede traer el tablero sin niebla hasta la siguiente; el DJ podría ligar una ficha a un PJ de otra campaña (no le da nada a nadie).
- [ ] Para después: dibujar trazos, cuadrícula con «snap», fichas ocultas a propósito, que las fichas se deslicen en vivo al arrastrarlas, mover fichas con teclado y un mapa de ejemplo en demo.
- [x] Rediseño: `Tablero.svelte`, `PanelTablero.svelte` y el botón «Tablero» ya usan el estilo nuevo (rama `rediseno/impecable`).
- [x] En Windows, `tirador.test.mjs` ya pasa (PR #1, `pathToFileURL`); 234/234 al 15/11.

## Reglas del tirador contra el SRD 2.0

- [x] Ayudar a un Aliado (SRD 2.0 p. 48–49): cada ayudante gasta 1 Esperanza y tira su d6; cuenta solo el d6 de ventaja más alto (el propio incluido); no va en reacciones. Migración 009, pruebas en `supabase/pruebas/ayudar.test.mjs`.
- [x] Migración 009 aplicada en Supabase (15/11), después de la 008. Verificado con solo lectura: una sola `tirar(…, uuid[])` con `p_ayudantes`; la ejecuta `authenticated`, no `anon`.
- [ ] Neri: ¿se puede ayudar a quien tira con desventaja? El SRD 2.0 no lo dice; hoy la app no lo permite.
- [ ] Neri: quien tira elige a sus ayudantes y el servidor les resta la Esperanza sin pedirles confirmación (en la mesa cada quien dice «te ayudo»). ¿Así está bien?
- [ ] Revisar los demás puntos «SIN VERIFICAR» de `docs/reglas/` con el reporte de verificación contra el SRD 2.0 (27 confirmados, 11 no aparecen, 5 dudas).

## Seguridad

- [x] Rama `importar-temporal` borrada de GitHub (15/11).
- [ ] Su commit (con `importar.sql`) todavía se puede abrir en GitHub si alguien tiene su SHA. Para borrarlo del todo: pedir a GitHub Support que lo purgue (formulario «Remove sensitive data», con el repo y el SHA). El SHA no se escribe aquí porque el repo es público: está en las notas locales de la sesión.
- [x] Aplicada el 15/11 (verificada: `fondos_ver` solo para `authenticated`, `tirar` nueva, 3 disparadores vigilantes, `anon` sin `tirar` ni `ajustar_hoja`, 0 usuarios sin perfil): `supabase/migraciones/008_auditoria.sql` (auditoría de la base: hojas sin dueño editables sin sesión, dados de Dualidad trucables, fondos listables por cualquiera, DJ que se quita a sí mismo, topes de tamaño y permisos de funciones). Va en una transacción; pruebas en `supabase/pruebas/auditoria.test.mjs`.
- [x] Código de invitación (rama `seguridad/invitacion`, 15/11): 8 caracteres sin los que se confunden (0 O 1 I L V), unos 656 mil millones de combinaciones; a lo más 10 códigos equivocados por usuario por hora; botón «Cambiar código» solo para el DJ (el link y el QR anteriores dejan de servir, así quien fue sacado ya no vuelve); link `…/dnh-dados/?unirme=CODIGO` que une directo (si no hay sesión, espera a que entres) y QR del link en Ajustes → Invitar jugadores. Migración `012_invitacion.sql`, pruebas en `supabase/pruebas/invitacion.test.mjs`. Dependencia nueva autorizada: `qrcode-generator` (MIT).
- [x] Tablas viejas `jugadores` (5 filas) y `tiradas` (98 filas): estaban abiertas a `anon` (leer, insertar, borrar o cambiar). Respaldo el 15/11 en `Proyectos\respaldos\tablas-viejas-2026-11-15.json` en la compu de Neri (fuera del repo). Se quitó el tirador anterior (`public/legado/`) y su enlace en Ajustes. Migración `011_retirar_legado.sql` (sin CASCADE: si algo dependiera de ellas, no borra nada), pruebas en `supabase/pruebas/legado.test.mjs`.
- [x] Publicado en `main` y migraciones 011 y 012 aplicadas el 15/11 (Claude en el editor SQL, con el «sí» de Neri). Antes: 5 y 98 filas, igual que el respaldo. Verificado con solo lectura: tablas viejas borradas; la campaña con código de 8; `cambiar_codigo` y `nuevo_codigo` creadas; `anon` sin `cambiar_codigo` ni `unirse_campania`; `authenticated` sin `nuevo_codigo` ni lectura de `intentos_union` (con RLS); default `nuevo_codigo()`. En la app, con la cuenta del DJ: «Cambiar código» y el link `?unirme=` funcionan, sin errores de consola.
- [ ] Neri: mandar el link nuevo (Ajustes → Invitar jugadores) a quien falte por unirse. Los que ya están no tienen que hacer nada.
- [ ] Neri: probar el QR con la cámara del celular y el link en Discord ya publicado (en local se verificó que el QR codifica el link exacto, pero no se escaneó con un teléfono).
- [ ] Para después (no se hizo): botón para que el DJ saque a un jugador. Hoy solo se puede desde la base; después de sacarlo, «Cambiar código».

## Auditoría del 12/10/2026 (5 agentes, 71 pruebas nuevas, 200 en total)

Corregidos y publicados: d4 con números al revés, tiradas de 2d12 que duraban 7 s, muchos dados congelaban la página, fuga de memoria de video, la app ya no se cae si no hay WebGL, Dificultad borrada contaba como 0, fórmulas ambiguas («2d6 3»), Lanzador en modo Adversario para jugadores, historial desordenado a medianoche, historial tapando el lanzador a 1100 px, toques rápidos que se perdían (Estrés, Esperanza, Miedo, casillas de la hoja, daño de adversarios, cuentas), datos de otra campaña que se colaban al cambiar o salir, borrados que no llegaban a los demás, cambios perdidos tras reconectar, demo que no empezaba limpio, código de invitación pegado con espacios, números guardados como texto en hojas importadas (Evasión 121), cartas repetidas que tronaban la hoja, oro que no pasaba a bolsa, Despertar / daño estando inconsciente, Casero que tronaba, Horda que no bajaba su daño, lore que perdía teclas o mostraba borradores en otra página, markdown que tronaba, fondos que aceptaban cualquier texto, y los hoyos de seguridad de la 008.

Quedan (para decidir o revisar):
- [x] Cuando el DJ oculta una cuenta regresiva, a los jugadores no les llegaba el cambio hasta recargar. Arreglado (rama `arreglos/mesa-menores`, 15/11): contador `cuentas_revision` (migración 013); al subir, la app del jugador vuelve a leer las cuentas.
- [x] Gastar Esperanza en una Experiencia se calculaba en el navegador y pisaba una ganancia simultánea. Arreglado (15/11): RPC `gastar_esperanza` (migración 013) que resta sobre lo que haya en el servidor.
- [ ] Neri: ¿las cuentas «en bucle» se reinician solas al llegar a 0? Hoy el DJ usa ↺. Tampoco se automatiza «Esbirro (X)».
- [ ] Neri: Esperanza y Miedo cambian al empezar la animación (se ve el resultado antes de que caigan los dados). ¿Esperar a que caigan?
- [ ] Neri: cerrar sesión en un dispositivo cierra todas (scope global). ¿Solo el dispositivo actual?
- [x] Celular horizontal (844×390): la tarjeta del PJ, el resultado y el lanzador se enciman. Resuelto en el rediseño (lanzador a la derecha).
- [x] Rasgos de armadura en Recibir daño (15/11): se aplican Física, Mágica, Fortificada (baja dos escalones) y Resguardada (resta la Puntuación al daño mágico, después de la resistencia); Dolorosa, Reforzada, Resiliente e Impenetrable solo se recuerdan en el diálogo. Al cambiar de armadura o su Puntuación se quitan las casillas marcadas que sobran.
- [ ] Neri (por confirmar): el SRD no dice si las casillas marcadas pasan de una armadura a otra; hoy se conservan hasta el nuevo máximo. ¿Así, o al cambiar de armadura empiezan limpias?
- [ ] Daño del compañero siempre tira 1 dado (¿escala con Competencia?).
- [x] La lista de cartas al agregar ya no muestra las que tienes en la mano o la bóveda (15/11).
- [x] Hoja a 1440 con compañero: «Notas» cabía con 0 px de sobra y con la letra M PLUS se cortaba. Ahora sobran 32–61 px según la letra (15/11). En celular las pestañas se siguen deslizando de lado, como antes.
- [x] Armas activas y guardadas (16/11, rama `claude/xenodochial-gagarin-376571`, sin publicar): botón «Al inventario» / «Sacar» por arma; las guardadas no tiran y dicen «Guardada · sacarla en combate cuesta 1 Estrés». Avisa sin bloquear si hay más de 1 primaria o 1 secundaria activa, o más de 2 guardadas (SRD p. 55); el Estrés no se marca solo. También avisa si un arma a dos manos va junto con una secundaria activa (carga máxima 2 manos), salvo al Guerrero, que ignora la carga (también en multiclase, por si tomó «Entrenamiento de combate»).

## Arreglos menores de la mesa (rama `arreglos/mesa-menores`, 15/11/2026)

Cuentas ocultas, Esperanza en el servidor, rasgos de armadura, cartas repetidas, pestaña «Notas» y tres detalles del tablero (ver arriba). 273 pruebas en verde.

- [x] Migración 013 aplicada en Supabase el 15/11 (Claude en el editor SQL, con el «sí» de Neri; texto idéntico al archivo, huella SHA-256 comprobada). Verificado con solo lectura: `gastar_esperanza` creada (`anon` no la ejecuta, `authenticated` sí); `cuentas_avisar` sin permiso para `authenticated`; `cuentas_revision` con RLS y una sola política (SELECT), en `supabase_realtime`, con su disparador; 5 personajes, igual que antes.
- [x] Publicado en `main` el 15/11 (Neri: «Sí, publica»; avance rápido `c94dff3..6ff60dd`, despliegue en verde). Revisado con la cuenta del DJ en la app publicada: trae el código nuevo y arranca sin mensajes en la consola.
- [ ] Probar con cuenta de jugador: que una cuenta oculta desaparezca sin recargar y que el error del tablero se vea (en demo solo se ve la vista del DJ).
- [ ] Para después: el fondo animado truena (`paisaje.js`, «canvas … width or height of 0») si la página carga con la ventana en tamaño 0 (pasó en el navegador integrado). No es de estos cambios.

## Rediseño «novela visual al atardecer» (rama `rediseno/impecable`, 15/11/2026)

Hecho: identidad nueva (vidrio claro translúcido tipo One UI, Zen Maru Gothic, Esperanza azul cielo, Miedo rosa ocaso, también en los dados), la mesa como retícula sin nada encimado (escritorio, ventana partida, celular y celular acostado), la tirada como línea de diálogo con la placa del PJ, íconos propios en vez de emojis, y todas las pantallas restilizadas (hoja y sus diálogos, panel del DJ, lore, ajustes, personalización con selector de letra, entrada y campañas). Detalle del sistema en `DESIGN.md`.

- [x] Publicado el 15/11 (rediseño + tablero + Ayudar a un Aliado, `main` a765917). Revisado con la cuenta del DJ: Campañas, mesa, registro, «Te ayudan» y Ajustes.
- [x] Probado por Neri con cuenta de jugador (15/11): sin errores.
- [x] Publicado también «Cerrar sesión» en blanco en Campañas.
- [x] Juntado con el PR NeriAGM/dnh-dados#1 (Ayudar a un Aliado) en la rama del rediseño; la fila «Te ayudan» y los d6 de ayuda ya usan el estilo nuevo.
- [x] Campañas revisada con sesión real (15/11).
- [x] `src/lib/tirador.test.mjs` en Windows: arreglado con el PR NeriAGM/dnh-dados#1 (`pathToFileURL`).
- [x] Tablero compartido del DJ: hecho y publicado (15/11).
