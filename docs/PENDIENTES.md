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
- [x] Vocabulario: *Deft Maneuvers* (Hueso, nivel 1, SRD 2.0 p. 209) queda «Maniobras ágiles», como la carta física de Mira (Neri, 16/11).
- [ ] **Valerius:** tiene tres +1 en rasgos.
- [x] **Valerius:** Artificiero rediseñado y capturado en Contenido casero el 16/11 (clase, subclases Artillero y Armero, Pistola rúnica rangos 1–4). El diseño vive en un documento privado, no en el repo.
- [x] **Valerius:** en nivel 2 tomó +1 Evasión (lo confirmó Neri el 16/11): base 10 + 1 en «extra» = Evasión 11.
- [x] **Valerius:** se borraron de su hoja los 5 rasgos caseros de la versión vieja (16/11, con el «sí» de Neri). Siguen en su página de Notion.
- [ ] **Valerius:** la pistola está en su hoja junto al estoque y el látigo; por regla, el estoque va guardado (sacarlo en combate cuesta 1 Estrés). Con «Al inventario» ya se puede marcar: falta hacerlo en su hoja.

## Fases siguientes

- [x] Fase 3: hojas de personaje con reglas, cartas de dominio, homebrew, migración desde Notion, contenido del SRD 2.0.
- [ ] Elegir las cartas de dominio de cada personaje (en Notion eran imágenes y no se pudieron leer).
- [ ] Revisar las armas e inventario de Milo: en Notion son iguales a los de Soren (parece plantilla copiada).
- [ ] Capturar la hoja de Aida (en Notion solo hay trasfondo).
- [ ] Asignar cada personaje importado a su jugador (Ajustes → Personajes).
- [x] Verificar el contenido del SRD 2.0 contra el PDF oficial (16/11, rama `datos/verificar-srd2`): 816 entradas revisadas, 12 datos corregidos y las 16 cuentas regresivas en español. Detalle en `docs/verificacion-srd2-datos.md`.
  - [x] Publicada en `main` (`45ffe62`, 16/11, con el «sí» de Neri), después de una revisión independiente que encontró y arregló la Horda del Enjambre de ratas (10/PG).
  - [x] Neri decidió las 9 dudas del reporte (16/11). Cambios en la rama `datos/decisiones-srd2`:
    - las 9 armas que el 2.0 quitó se quedan, marcadas «Solo SRD 1.0»;
    - la Abominación tira d20 + 2d4;
    - Emboscados y Emboscadores tienen Dificultad «Especial».

    Lo demás se queda como está. Detalle en el reporte.
  - [x] Agregar el contenido nuevo del SRD 2.0 (*Hope & Fear*), 17/11, rama `datos/contenido-srd2` (encima de `datos/decisiones-srd2`, sin publicar): 135 adversarios, 28 entornos, 132 armas (incluye las 12 sillas de ruedas de combate), 35 armaduras, 60 objetos, 60 consumibles y 6 Transformaciones, en `datos/es_2_0` y `datos/fuente_2_0`. Cada entrada cita su página en los datos (`fuente`) y lleva la etiqueta «SRD 2.0» en el catálogo, pero la app todavía no la muestra en el selector de armas y armaduras, en la tarjeta del adversario ni en la lista de entornos, y `srd.js` reemplaza la página citada por «SRD 2.0». Neri lo resuelve con el panel «Acerca de» (17/11), que explica qué viene de cada versión: ya no hace falta mostrar la etiqueta en cada lista. Nombres en español aprobados por Neri (16/11). La ancestría mixta quedó confirmada contra la p. 38 en `docs/reglas/reglas-2-personajes.md`. Revisión independiente: los números coinciden con el PDF y se corrigieron 6 frases del español.
  - [x] Dudas de traducción del contenido nuevo: Neri las aprueba de momento tal como están (17/11). El SRD dice «Storm Giant» en la Megatormenta, pero la criatura de la app es el Titán de la tormenta; «Ignited» y «Ablaze» quedaron los dos como «en llamas»; unos 600 nombres de rasgos, ataques y Experiencias, y condiciones nuevas (Envenenado, Agarrado, Tembloroso…), los tradujeron agentes. Para cambiar uno: «X cámbialo por Y».
  - [x] Cosas del contenido nuevo que Neri decidió (17/11):
    - [x] «Beguiled» (Acechafauces, p. 122) pasa a «Cautivado» («Cautiva al» el verbo, «Cautiverio» la opción; «Embelesado» es el «Enraptured» de las cartas de Gracia); «Enchanted» (Kelpie, p. 103) se queda «Hechizado» (Neri, 17/11);
    - [x] la Experiencia «Hunter» sale «Cazador» y «Cazadora» según la criatura: se queda así (Neri, 17/11);
    - [x] la Silla de ruedas arcana ataca con el rasgo de Lanzamiento de la subclase; si la subclase no tiene (6 lo tienen en `null`), la hoja avisa para cada arma mágica activa, sin bloquear (SRD 2.0 p. 56 y 71). También avisa por la Hoja de sombras (mágica aunque guarda daño físico) y por armas secundarias mágicas (SRD 2.0 p. 55). La subclase casera avisa según su propio rasgo de Lanzamiento («Ninguno» = sin rasgo). No avisa con multiclase ni con una subclase que no está en el catálogo.
  - [ ] Neri: la Hoja fantasma (*Ghostblade*, SRD 1.0) quizá también es mágica, pero el SRD 1.0 no está en el RAG y no se pudo comprobar; no se tocó.
  - [ ] Las Transformaciones solo están en los datos: la hoja todavía no deja elegir una. Tampoco deja elegir dos ancestrías; la mixta se escribe en el texto libre.
  - [x] «Hallows Above» sale «Santuarios Superiores» en las ancestrías y los adversarios del 2.0, y «Santuarios de Arriba» en 4 entornos viejos. Neri lo deja así de momento (17/11).
- [x] Fase 4: panel del DJ (adversarios, entornos, cuentas regresivas, puntos de batalla). Migración 003.
- [x] Nombres traducidos del bestiario: Neri los aprueba de momento (16/11). Para cambiar uno: decirle a Claude "X cámbialo por Y".
- [x] Escena: los jugadores ven nombre, tipo y estado de los enemigos del encuentro activo; ojo para ocultar. Migración 005.
- [x] Ayudas de reglas en la hoja: recibir daño, descansos, movimientos de muerte, subir de nivel.
- [x] Fase 5: fondos personalizados por jugador. Migración 004.
- [ ] Neri: confirmar regla del estado (Herido < mitad, Grave ≥ mitad, Caído = todos). Si la mesa ve el entorno ya se decide en Ajustes → Reglas de la mesa.
- [ ] Neri: confirmar casillas por mejora al subir de nivel con tu hoja impresa. El texto del SRD 2.0 (p. 54) confirma qué hace cada mejora y que Competencia y Multiclase cuestan las dos, pero el número de casillas solo viene en la hoja de personaje (imagen, sin texto).
- [x] Reglas de la mesa (ajustes de campaña que decide el DJ): daño masivo, monedas y si la mesa ve el entorno. Migración 006.
- [x] Migración 006 aplicada en Supabase (12/10).
- [ ] Neri: decidir si se agregan las fichas de acción (regla opcional del foco) como regla de la mesa.
- [x] Glosario: términos de descansos, muerte y subir de nivel agregados tal como los usa la app (16/11).
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
- [ ] Probar con dos cuentas lo fino del tablero (Neri ya probó DJ + jugador el 15/11 sin errores; falta confirmar): mostrar y cambiar de tablero, mover la ficha propia, que la ajena no se mueva, niebla opaca para el jugador, fichas bajo niebla ocultas y señal. En demo solo se ve la vista del DJ. Neri lo probará en partida con sus jugadores.
- [ ] Riesgo aceptado por Neri (15/11): la niebla se pinta en la pantalla del jugador; con las herramientas del navegador se puede ver el mapa completo y las fichas tapadas.
- [ ] Riesgo menor: las señales viajan por un canal de tiempo real público para quien sepa el id de la campaña (un uuid). Para cerrarlo: activar la autorización de Realtime (canales privados) en Supabase.
- [x] Vocabulario aprobado por Neri (16/11): «tablero», «ficha», «niebla» (Destapar / Tapar) y «señal».
- [x] Arreglados (15/11, rama `arreglos/mesa-menores`): la niebla ya no vuelve a crear el lienzo en cada movimiento del dedo; «Agregar PJ» con dos toques rápidos ya no duplica fichas; el jugador ya ve los errores del tablero (p. ej. una ficha rechazada).
- [ ] Detalles menores que quedan: si falla la primera lectura, un cambio que llegue por tiempo real puede traer el tablero sin niebla hasta la siguiente; el DJ podría ligar una ficha a un PJ de otra campaña (no le da nada a nadie).
- [ ] Para después: dibujar trazos, cuadrícula con «snap», fichas ocultas a propósito, que las fichas se deslicen en vivo al arrastrarlas, mover fichas con teclado y un mapa de ejemplo en demo.
- [x] Rediseño: `Tablero.svelte`, `PanelTablero.svelte` y el botón «Tablero» ya usan el estilo nuevo (rama `rediseno/impecable`).
- [x] En Windows, `tirador.test.mjs` ya pasa (PR #1, `pathToFileURL`); 234/234 al 15/11.

## Reglas del tirador contra el SRD 2.0

- [x] Ayudar a un Aliado (SRD 2.0 p. 48–49): cada ayudante gasta 1 Esperanza y tira su d6; cuenta solo el d6 de ventaja más alto (el propio incluido); no va en reacciones. Migración 009, pruebas en `supabase/pruebas/ayudar.test.mjs`.
- [x] Migración 009 aplicada en Supabase (15/11), después de la 008. Verificado con solo lectura: una sola `tirar(…, uuid[])` con `p_ayudantes`; la ejecuta `authenticated`, no `anon`.
- [x] Migración 014 aplicada en Supabase (16/11), antes de publicar la app. Verificado con solo lectura: tabla `ayudas` con RLS, su política y en tiempo real; una sola `tirar`, la nueva; `anon` no ejecuta `ofrecer_ayuda`, `retirar_ayuda` ni `tirar`; nadie inserta directo.
- [x] Ayudar con desventaja (Neri, 16/11): se puede; ventaja y desventaja se cancelan una por una (SRD 2.0 p. 49): la ayuda del primero cancela la desventaja y, si ayudan más, cuenta el d6 más alto de los demás. Migración 014.
- [x] Cada ayudante confirma (Neri, 16/11): toca «Ayudar a» con el nombre de su aliado en su pantalla; quien tira solo ve y usa a quienes lo marcaron. La marca dura 10 minutos y se borra con la siguiente tirada de acción del aliado. Migración 014.
- [ ] Revisar los demás puntos «SIN VERIFICAR» de `docs/reglas/` con el reporte de verificación contra el SRD 2.0 (27 confirmados, 11 no aparecen, 5 dudas).

## Seguridad

- [x] Rama `importar-temporal` borrada de GitHub (15/11).
- [x] Su commit (con `importar.sql`) se puede abrir en GitHub si alguien tiene su SHA. Decidido por Neri (16/11): se deja así, no se pide la purga.
- [x] Aplicada el 15/11 (verificada: `fondos_ver` solo para `authenticated`, `tirar` nueva, 3 disparadores vigilantes, `anon` sin `tirar` ni `ajustar_hoja`, 0 usuarios sin perfil): `supabase/migraciones/008_auditoria.sql` (auditoría de la base: hojas sin dueño editables sin sesión, dados de Dualidad trucables, fondos listables por cualquiera, DJ que se quita a sí mismo, topes de tamaño y permisos de funciones). Va en una transacción; pruebas en `supabase/pruebas/auditoria.test.mjs`.
- [x] Código de invitación (rama `seguridad/invitacion`, 15/11): 8 caracteres sin los que se confunden (0 O 1 I L V), unos 656 mil millones de combinaciones; a lo más 10 códigos equivocados por usuario por hora; botón «Cambiar código» solo para el DJ (el link y el QR anteriores dejan de servir, así quien fue sacado ya no vuelve); link `…/dnh-dados/?unirme=CODIGO` que une directo (si no hay sesión, espera a que entres) y QR del link en Ajustes → Invitar jugadores. Migración `012_invitacion.sql`, pruebas en `supabase/pruebas/invitacion.test.mjs`. Dependencia nueva autorizada: `qrcode-generator` (MIT).
- [x] Tablas viejas `jugadores` (5 filas) y `tiradas` (98 filas): estaban abiertas a `anon` (leer, insertar, borrar o cambiar). Respaldo el 15/11 en `Proyectos\respaldos\tablas-viejas-2026-11-15.json` en la compu de Neri (fuera del repo). Se quitó el tirador anterior (`public/legado/`) y su enlace en Ajustes. Migración `011_retirar_legado.sql` (sin CASCADE: si algo dependiera de ellas, no borra nada), pruebas en `supabase/pruebas/legado.test.mjs`.
- [x] Publicado en `main` y migraciones 011 y 012 aplicadas el 15/11 (Claude en el editor SQL, con el «sí» de Neri). Antes: 5 y 98 filas, igual que el respaldo. Verificado con solo lectura: tablas viejas borradas; la campaña con código de 8; `cambiar_codigo` y `nuevo_codigo` creadas; `anon` sin `cambiar_codigo` ni `unirse_campania`; `authenticated` sin `nuevo_codigo` ni lectura de `intentos_union` (con RLS); default `nuevo_codigo()`. En la app, con la cuenta del DJ: «Cambiar código» y el link `?unirme=` funcionan, sin errores de consola.
- [ ] Neri: mandar el link nuevo (Ajustes → Invitar jugadores) a quien falte por unirse. Los que ya están no tienen que hacer nada.
- [ ] Neri: probar el QR con la cámara del celular y el link en Discord ya publicado (en local se verificó que el QR codifica el link exacto, pero no se escaneó con un teléfono). Neri lo probará en partida.
- [ ] Para después (no se hizo): botón para que el DJ saque a un jugador. Hoy solo se puede desde la base; después de sacarlo, «Cambiar código».

## Auditoría del 12/10/2026 (5 agentes, 71 pruebas nuevas, 200 en total)

Corregidos y publicados: d4 con números al revés, tiradas de 2d12 que duraban 7 s, muchos dados congelaban la página, fuga de memoria de video, la app ya no se cae si no hay WebGL, Dificultad borrada contaba como 0, fórmulas ambiguas («2d6 3»), Lanzador en modo Adversario para jugadores, historial desordenado a medianoche, historial tapando el lanzador a 1100 px, toques rápidos que se perdían (Estrés, Esperanza, Miedo, casillas de la hoja, daño de adversarios, cuentas), datos de otra campaña que se colaban al cambiar o salir, borrados que no llegaban a los demás, cambios perdidos tras reconectar, demo que no empezaba limpio, código de invitación pegado con espacios, números guardados como texto en hojas importadas (Evasión 121), cartas repetidas que tronaban la hoja, oro que no pasaba a bolsa, Despertar / daño estando inconsciente, Casero que tronaba, Horda que no bajaba su daño, lore que perdía teclas o mostraba borradores en otra página, markdown que tronaba, fondos que aceptaban cualquier texto, y los hoyos de seguridad de la 008.

Quedan (para decidir o revisar):
- [x] Cuando el DJ oculta una cuenta regresiva, a los jugadores no les llegaba el cambio hasta recargar. Arreglado (rama `arreglos/mesa-menores`, 15/11): contador `cuentas_revision` (migración 013); al subir, la app del jugador vuelve a leer las cuentas.
- [x] Gastar Esperanza en una Experiencia se calculaba en el navegador y pisaba una ganancia simultánea. Arreglado (15/11): RPC `gastar_esperanza` (migración 013) que resta sobre lo que haya en el servidor.
- [x] Las cuentas «en bucle» se disparan y vuelven solas a su valor inicial (SRD 2.0 p. 91), con aviso «¡Se disparó!» al DJ (16/11).
- [ ] «Esbirro (X)» no se automatiza: el DJ derriba a mano a los esbirros extra.
- [x] Esperanza, Estrés y Miedo de la mesa cambian hasta que se detienen los dados (decisión de Neri, 16/11).
- [x] Cerrar sesión cierra solo el dispositivo actual (decisión de Neri, 16/11).
- [x] Celular horizontal (844×390): la tarjeta del PJ, el resultado y el lanzador se enciman. Resuelto en el rediseño (lanzador a la derecha).
- [x] Rasgos de armadura en Recibir daño (15/11): se aplican Física, Mágica, Fortificada (baja dos escalones) y Resguardada (resta la Puntuación al daño mágico, después de la resistencia); Dolorosa, Reforzada, Resiliente e Impenetrable solo se recuerdan en el diálogo. Al cambiar de armadura o su Puntuación se quitan las casillas marcadas que sobran.
- [x] Al cambiar de armadura, las casillas marcadas se conservan hasta el nuevo máximo (decisión de Neri, 16/11; el SRD no lo dice).
- [x] El daño del compañero tira tantos dados como tu Competencia (SRD 2.0 p. 22).
- [x] La lista de cartas al agregar ya no muestra las que tienes en la mano o la bóveda (15/11).
- [x] Hoja a 1440 con compañero: «Notas» cabía con 0 px de sobra y con la letra M PLUS se cortaba. Ahora sobran 32–61 px según la letra (15/11). En celular las pestañas se siguen deslizando de lado, como antes.
- [x] Armas activas y guardadas (16/11): botón «Al inventario» / «Sacar» por arma; las guardadas no tiran y dicen «Guardada · sacarla en combate cuesta 1 Estrés». Avisa sin bloquear si hay más de 1 primaria o 1 secundaria activa, o más de 2 guardadas (SRD p. 55); el Estrés no se marca solo. También avisa si un arma a dos manos va junto con una secundaria activa (carga máxima 2 manos), salvo al Guerrero, que ignora la carga (también en multiclase, por si tomó «Entrenamiento de combate»).

## Arreglos menores de la mesa (rama `arreglos/mesa-menores`, 15/11/2026)

Cuentas ocultas, Esperanza en el servidor, rasgos de armadura, cartas repetidas, pestaña «Notas» y tres detalles del tablero (ver arriba). 273 pruebas en verde.

- [x] Migración 013 aplicada en Supabase el 15/11 (Claude en el editor SQL, con el «sí» de Neri; texto idéntico al archivo, huella SHA-256 comprobada). Verificado con solo lectura: `gastar_esperanza` creada (`anon` no la ejecuta, `authenticated` sí); `cuentas_avisar` sin permiso para `authenticated`; `cuentas_revision` con RLS y una sola política (SELECT), en `supabase_realtime`, con su disparador; 5 personajes, igual que antes.
- [x] Publicado en `main` el 15/11 (Neri: «Sí, publica»; avance rápido `c94dff3..6ff60dd`, despliegue en verde). Revisado con la cuenta del DJ en la app publicada: trae el código nuevo y arranca sin mensajes en la consola.
- [ ] Probar con cuenta de jugador: que una cuenta oculta desaparezca sin recargar y que el error del tablero se vea (en demo solo se ve la vista del DJ). Neri lo probará en partida.
- [x] El fondo animado ya no truena si la página carga con la ventana en tamaño 0 (16/11).

## Rediseño «novela visual al atardecer» (rama `rediseno/impecable`, 15/11/2026)

Hecho: identidad nueva (vidrio claro translúcido tipo One UI, Zen Maru Gothic, Esperanza azul cielo, Miedo rosa ocaso, también en los dados), la mesa como retícula sin nada encimado (escritorio, ventana partida, celular y celular acostado), la tirada como línea de diálogo con la placa del PJ, íconos propios en vez de emojis, y todas las pantallas restilizadas (hoja y sus diálogos, panel del DJ, lore, ajustes, personalización con selector de letra, entrada y campañas). Detalle del sistema en `DESIGN.md`.

- [x] Publicado el 15/11 (rediseño + tablero + Ayudar a un Aliado, `main` a765917). Revisado con la cuenta del DJ: Campañas, mesa, registro, «Te ayudan» y Ajustes.
- [x] Probado por Neri con cuenta de jugador (15/11): sin errores.
- [x] Publicado también «Cerrar sesión» en blanco en Campañas.
- [x] Juntado con el PR NeriAGM/dnh-dados#1 (Ayudar a un Aliado) en la rama del rediseño; la fila «Te ayudan» y los d6 de ayuda ya usan el estilo nuevo.
- [x] Campañas revisada con sesión real (15/11).
- [x] `src/lib/tirador.test.mjs` en Windows: arreglado con el PR NeriAGM/dnh-dados#1 (`pathToFileURL`).
- [x] Tablero compartido del DJ: hecho y publicado (15/11).
