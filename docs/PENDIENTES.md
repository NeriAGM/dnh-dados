# Pendientes

## Para publicar la fase 1 y 2

- [x] Dar acceso de escritura a `nearigamez` en este repo (o instalar la app de Claude en NeriAGM).
- [x] En *Settings → Pages* del repo, cambiar *Source* a **GitHub Actions**.
- [x] Correr `supabase/migraciones/001_mesa.sql` en el editor SQL de Supabase.
- [x] Elegir cómo entran los jugadores: Discord o enlace por correo. Si es Discord, crear la app en el portal de desarrolladores de Discord y activarla en *Authentication → Providers* de Supabase.
- [x] En Supabase, *Authentication → URL Configuration*: agregar `https://neriagm.github.io/dnh-dados/` a las URL de regreso.
- [ ] Crear la campaña "Dolor & Hambre", repartir el código y crear los personajes.

## Revisar en tus hojas de Notion (antes de migrarlas)

- [ ] **Mira:** sus rasgos tienen dos −1; el arreglo oficial es +2, +1, +1, 0, 0, −1.
- [ ] **Mira:** Evasión base 13; la del Explorador es 12.
- [ ] **Mira:** el linaje oficial se escribe *Katari*.
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
- [ ] Correr `supabase/migraciones/006_ajustes.sql` en el editor SQL de Supabase (sin ella, las reglas de la mesa no se pueden guardar).
- [ ] Neri: decidir si se agregan las fichas de acción (regla opcional del foco) como regla de la mesa.
- [ ] Glosario: agregar términos de descansos, muerte y subir de nivel (Limpiar Estrés, Llamarada de gloria, cicatriz, mejoras, logros de rango).
- [ ] Personajes importados con nivel no tienen avances registrados: los límites de mejoras solo cuentan desde la app.

## Lore de la campaña (migración 007)

- [ ] Correr `supabase/migraciones/007_lore.sql` en el editor SQL de Supabase (crea la tabla `lore`, el contador `lore_revision` y el bucket privado `lore`).
- [ ] Importar el lore exportado de Notion (entra todo **oculto**; se revela página por página con «Visible para la mesa»).
- [ ] Neri: si se vuelve a importar de Notion, ¿se sobrescriben las páginas que ya editaste en la app? (Hoy el importador puede hacerlo por `origen`; recomendado: no reimportar lo ya editado).
