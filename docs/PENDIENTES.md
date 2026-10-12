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

## Seguridad

- [ ] Borrar la rama `importar-temporal` en GitHub (Branches → papelera): contiene el SQL con los datos de los personajes y el repositorio es público.
- [ ] Aplicar `supabase/migraciones/008_auditoria.sql` (auditoría de la base: hojas sin dueño editables sin sesión, dados de Dualidad trucables, fondos listables por cualquiera, DJ que se quita a sí mismo, topes de tamaño y permisos de funciones). Va en una transacción; pruebas en `supabase/pruebas/auditoria.test.mjs`.
- [ ] Código de invitación: 6 hex (16.7 millones) sin límite de intentos; cualquiera con cuenta de Discord lo puede adivinar por fuerza bruta. Requiere cambio en la app (código más largo y botón «cambiar código» para el DJ). Quien fue sacado de la campaña puede volver a entrar con el mismo código.
- [ ] Revisar en producción las tablas viejas (`tiradas`, `jugadores`, de antes de la 001): que tengan RLS activado o borrarlas con permiso de Neri.

## Auditoría del 12/10/2026 (5 agentes, 71 pruebas nuevas, 200 en total)

Corregidos y publicados: d4 con números al revés, tiradas de 2d12 que duraban 7 s, muchos dados congelaban la página, fuga de memoria de video, la app ya no se cae si no hay WebGL, Dificultad borrada contaba como 0, fórmulas ambiguas («2d6 3»), Lanzador en modo Adversario para jugadores, historial desordenado a medianoche, historial tapando el lanzador a 1100 px, toques rápidos que se perdían (Estrés, Esperanza, Miedo, casillas de la hoja, daño de adversarios, cuentas), datos de otra campaña que se colaban al cambiar o salir, borrados que no llegaban a los demás, cambios perdidos tras reconectar, demo que no empezaba limpio, código de invitación pegado con espacios, números guardados como texto en hojas importadas (Evasión 121), cartas repetidas que tronaban la hoja, oro que no pasaba a bolsa, Despertar / daño estando inconsciente, Casero que tronaba, Horda que no bajaba su daño, lore que perdía teclas o mostraba borradores en otra página, markdown que tronaba, fondos que aceptaban cualquier texto, y los hoyos de seguridad de la 008.

Quedan (para decidir o revisar):
- [ ] Cuando el DJ oculta una cuenta regresiva, a los jugadores no les llega el cambio hasta recargar (no se filtra nada oculto; solo se queda la vieja en pantalla). Arreglo: contador como `lore_revision`.
- [ ] Gastar Esperanza en una Experiencia se calcula en el navegador; si llega al mismo tiempo una ganancia de Esperanza, una pisa a la otra. Arreglo: RPC que reste en el servidor.
- [ ] Neri: ¿las cuentas «en bucle» se reinician solas al llegar a 0? Hoy el DJ usa ↺. Tampoco se automatiza «Esbirro (X)».
- [ ] Neri: Esperanza y Miedo cambian al empezar la animación (se ve el resultado antes de que caigan los dados). ¿Esperar a que caigan?
- [ ] Neri: cerrar sesión en un dispositivo cierra todas (scope global). ¿Solo el dispositivo actual?
- [ ] Celular horizontal (844×390): la tarjeta del PJ, el resultado y el lanzador se enciman.
- [ ] Rasgos de armadura (Fortificada, Física/Mágica) no se aplican en Recibir daño. Cambiar de armadura conserva las casillas marcadas aunque sobren.
- [ ] Daño del compañero siempre tira 1 dado (¿escala con Competencia?).
- [ ] La lista de cartas al agregar muestra las que ya tienes (elegirlas no hace nada).
- [ ] Hoja a 1440 con compañero: la pestaña «Notas» queda cortada.
