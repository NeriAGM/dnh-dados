# Daggerheart — Reglas de combate, daño, condiciones, muerte y descanso

Referencia para implementar trackers en una app. Fuente principal: **SRD oficial de Darrington Press** (texto de la versión 1.0 de septiembre 2025, que ya incluye las correcciones del 27/jul/2025 y del 9/sep/2025). Todo está parafraseado; los números son exactos.

> **Nota sobre versiones.** En daggerheart.com/srd ya está publicado el **SRD v2.0 (25/ago/2026)**. Su changelog dice que reescribió *para claridad* ventaja/desventaja, la resolución de tiradas de acción y el spotlight, y que agregó contenido de *Hope & Fear* (dominio Dread, adversarios, botín, Transformaciones). **No lista cambios** en daño, umbrales, armadura, Estrés, PG, condiciones, movimientos de muerte, descanso, Miedo, cuentas regresivas ni oro. No pude leer el PDF v2.0 completo (solo cargó la parte de clases), así que la redacción del spotlight en v2.0 queda **SIN VERIFICAR**; las mecánicas de este documento coinciden con el SRD 1.0.

---

## 1. Puntos de Golpe y umbrales de daño (Hit Points & Damage Thresholds)

- Cada PJ tiene **casillas de PG (Hit Point slots)**; el número inicial depende de la clase. Se pueden aumentar al subir de nivel hasta un **máximo de 12**.
- Al recibir daño, el personaje marca **1, 2 o 3 PG** según sus **umbrales de daño (damage thresholds)**, que son dos números: **Mayor (Major)** y **Grave (Severe)**.

| Daño final recibido | Severidad | PG marcados |
|---|---|---|
| ≤ 0 | — | 0 |
| ≥ 1 y < umbral Mayor | Menor (Minor) | 1 |
| ≥ Mayor y < Grave | Mayor (Major) | 2 |
| ≥ Grave | Grave (Severe) | 3 |
| ≥ 2 × Grave (**solo con la regla opcional**) | Masivo (Massive Damage) | 4 |

- **Daño masivo (Massive Damage) — regla OPCIONAL oficial:** si el daño es igual o mayor al **doble del umbral Grave**, se marcan **4 PG** en vez de 3. En la app debería ser un interruptor de mesa.
- **Cómo se calculan los umbrales de un PJ:** umbrales base de la armadura equipada **+ nivel del personaje**. Además, en cada subida de nivel el paso 3 dice "**aumenta todos tus umbrales en 1**" (que es lo mismo que sumar el nivel; no se suma dos veces).
- **Sin armadura (unarmored):** Puntuación de Armadura 0; umbral Mayor = nivel; umbral Grave = 2 × nivel.
- **Adversarios:** sus umbrales (Mayor/Grave) y PG vienen en su bloque de estadísticas y funcionan igual que en los PJ. Cuando un adversario marca su último PG queda **derrotado (defeated)**: incapacitado, atado, huyendo, muerto, lo que la mesa decida.
- Referencia de umbrales de adversarios por nivel de poder (tier): T1 7/12 · T2 10/20 · T3 20/32 · T4 25/45.

### Orden de resolución del daño (para el algoritmo)
1. **Sumar** todo el daño simultáneo de varias fuentes en un solo total (multiple damage sources). "Daño entrante (incoming damage)" = el total de un solo ataque o fuente **antes** de marcar Armadura.
2. Si hay **inmunidad** al tipo de daño → se ignora (0).
3. Si hay **resistencia** → dividir entre 2 (redondeando **hacia arriba**: el juego no usa fracciones y siempre redondea arriba salvo indicación).
4. Reducciones planas de rasgos (p. ej. "reduce el daño físico en X").
5. Comparar con umbrales → severidad (1/2/3, o 4 si está activo el daño masivo).
6. Opcional: el PJ **marca 1 Casilla de Armadura** para bajar la severidad un escalón (salvo daño directo).
7. Marcar los PG. Si con eso se marca el último PG → **movimiento de muerte**.

> El paso 3 antes del 6 es explícito en el SRD: "aplica primero la resistencia, después otros modos de reducir, como marcar Armadura". El lugar exacto del paso 4 respecto a la resistencia no está fijado por la regla (decide quien controla los efectos — regla de efectos simultáneos).

---

## 2. Armadura (Armor)

- Cada armadura tiene: **umbrales base**, **Puntuación de Armadura base (base Armor Score)** y, a veces, un **rasgo (feature)** que aplica mientras está equipada.
- **Puntuación de Armadura (Armor Score)** = base de la armadura + bonificadores permanentes. Es el **número de Casillas de Armadura (Armor Slots)**. Máximo **12**.
- **Reducir daño entrante:** al recibir daño puedes **marcar 1 Casilla de Armadura** para bajar la severidad **un escalón**: Grave→Mayor, Mayor→Menor, Menor→nada. Una sola casilla por golpe (la regla dice "una").
  - Con Puntuación de Armadura **0** no se puede marcar.
  - Si un efecto sube temporalmente la Puntuación de Armadura, también sube las casillas disponibles; al terminar el efecto, desaparecen esas casillas.
  - Con daño masivo activo, la armadura bajaría de 4 a 3 PG (Masivo→Grave). **SIN VERIFICAR** como texto explícito; se deduce de "baja un umbral".
- **Daño directo (direct damage):** **no** se puede reducir marcando Casillas de Armadura.
- Rasgo de adversario de ejemplo "Shredding Strike": obliga a marcar una Casilla de Armadura **sin** obtener su beneficio (aunque se puede usar otra para reducir).
- **Reparar:** con los movimientos de descanso *Reparar Armadura* (corto: 1d4 + tier casillas) o *Reparar Toda la Armadura* (largo: todas). Ver §7.
- Ejemplo de rasgo (Buckler, "Deflecting"): marcar una casilla para sumar a la Evasión tantas casillas disponibles tengas contra ese ataque.

---

## 3. Estrés (Stress)

- Todas las clases empiezan con **6 casillas de Estrés**; se pueden aumentar al subir de nivel hasta **12**.
- **Qué hace marcar Estrés:**
  - Costo de habilidades/rasgos que lo piden.
  - El DJ como movimiento (GM move) o como costo/complicación de una tirada (típico en Éxito con Miedo o Fallo con Esperanza).
  - Cambiar un arma del inventario por la activa fuera de un descanso o momento de calma: **1 Estrés**.
  - Recuperar una carta de dominio de la bóveda a mitad de sesión: Estrés igual a su **costo de recuperación (Recall Cost)**.
- **Al marcar la última casilla:** el personaje queda **Vulnerable** hasta que limpie **al menos 1 Estrés**.
- **Desbordamiento:** si debe marcar 1 o más Estrés y **no puede** (todo lleno), **marca 1 PG** en su lugar (1 PG en total, no uno por cada Estrés).
- Con todo el Estrés marcado **no puede usar** movimientos que exijan marcar Estrés.
- **Limpiar Estrés:** movimientos de descanso, rasgos, y el **éxito crítico** en tirada de acción (limpia 1 Estrés; en tirada de reacción no).

---

## 4. Muerte (Death) — movimientos de muerte (Death Moves)

Cuando un PJ marca su **último PG**, cae y elige **uno**:

### Llamarada de gloria (Blaze of Glory)
Realiza **una última acción**, que es **éxito crítico automático** (con aprobación del DJ); después el personaje muere ("cruza el velo").

### Evitar la muerte (Avoid Death)
- Queda **inconsciente** temporalmente; jugador y DJ describen cómo empeora la situación.
- Inconsciente: **no puede moverse ni actuar** y **no puede ser objetivo de ataques**.
- Despierta cuando **un aliado le limpia 1 o más PG** o cuando el grupo **termina un descanso largo**.
- Al caer inconsciente, tira su **Dado de Esperanza (d12)**: si el resultado es **≤ su nivel**, gana una **cicatriz (scar)**: **tacha permanentemente una casilla de Esperanza** (baja su máximo de Esperanza, normalmente 6) y con el DJ define su impacto narrativo y si se puede recuperar y cómo.
- Si alguna vez tacha su **última casilla de Esperanza**, el viaje del personaje termina.

### Arriesgarlo todo (Risk It All)
Tira los **Dados de Dualidad (2d12)**:
- **Esperanza > Miedo:** sigue en pie y limpia PG y/o Estrés por un total igual al **valor del Dado de Esperanza**, repartido como quiera.
- **Miedo > Esperanza:** muere.
- **Iguales (crítico):** sigue en pie y limpia **todos** sus PG y Estrés.

Si el personaje muere, antes de la siguiente sesión se crea uno nuevo **al nivel actual del grupo**.

**Datos de Esperanza relacionados:** se empieza con 2 Esperanza; máximo **6**; se conserva entre sesiones.

---

## 5. Condiciones (Conditions)

**Tres condiciones estándar:**

| Condición | Efecto | Cómo se quita |
|---|---|---|
| **Oculto (Hidden)** | Se obtiene al estar fuera de la vista de todos los enemigos y que no sepan dónde estás. Toda tirada contra ti tiene **desventaja**. | Se pierde cuando un adversario se mueve a donde te vería, tú entras en su línea de visión, o **atacas**. |
| **Apresado (Restrained)** | No puede moverse, pero sí actuar desde su posición. | Dura **hasta que el objetivo sea liberado** (aclaración del 9/sep/2025). Si viene marcada como temporal, se quita como temporal (abajo). |
| **Vulnerable (Vulnerable)** | Toda tirada contra él tiene **ventaja**. | Según su origen; la causada por Estrés lleno termina al limpiar ≥ 1 Estrés. |

Reglas generales:
- **No se acumulan:** la misma condición no se puede aplicar dos veces al mismo objetivo (salvo que se diga lo contrario). En la app: booleano, no contador.
- Ventaja/desventaja y condiciones son lo único que **no se apila**; los demás efectos sí.
- **Etiqueta temporal (temporary):** la criatura afectada puede quitarla **haciendo un movimiento contra ella**.
  - **PJ:** normalmente requiere una **tirada de acción exitosa** con un rasgo apropiado.
  - **Adversario:** el DJ le da el spotlight y describe cómo se libera; **sin tirada**, pero **gasta el spotlight** de ese adversario. "Limpiar una condición" es una de las acciones de un adversario con spotlight y también un movimiento de DJ.
  - El DJ puede **gastar 1 Miedo para terminar un efecto temporal** (dicho en el contexto de hechizos).
- **Condiciones especiales (special conditions):** solo se quitan cumpliendo el requisito que diga el efecto que las aplicó.
- Rasgos pueden crear condiciones únicas (p. ej. Envenenado/Poisoned, Encubierto/Cloaked, aparecen en el changelog) que funcionan según su texto.
- **Cobertura (cover):** no es condición; ataques a través de cobertura parcial van con desventaja.

---

## 6. Tipos de daño, resistencia, inmunidad, daño directo

- **Dos tipos:** **físico (phy)** y **mágico (mag)**. Por defecto, armas mundanas y ataques sin armas = físico; hechizos = mágico.
- **Resistencia (resistance):** reduce el daño de ese tipo **a la mitad** antes de comparar con umbrales; se aplica **antes** de marcar Armadura. **Varias resistencias al mismo tipo no se suman.**
- **Inmunidad (immunity):** ignora el daño de ese tipo.
- **Daño mixto (físico + mágico):** solo hay resistencia/inmunidad si se tiene **a ambos** tipos.
- **Daño directo (direct damage):** no se puede reducir con Casillas de Armadura (sí le aplican resistencia/inmunidad — **SIN VERIFICAR** como texto explícito; la regla solo excluye la Armadura).

### Tiradas de daño (para el dado de la app)
- Armas: número de dados = **Competencia (Proficiency)**; el modificador no se multiplica (Competencia 2, arma d8+2 → 2d8+2).
- Sin armas: **[Competencia]d4**.
- Daño basado en Lanzamiento (Spellcast): tantos dados como el valor del rasgo; si es +0 o menos, no se tira nada.
- **Crítico de PJ** (dados de dualidad iguales en tirada de ataque): daño normal **+ el máximo posible de los dados** (2d8+1 → 2d8+1+16).
- **Crítico de adversario** (20 natural en d20): igual, suma el máximo de los dados; el modificador fijo no se duplica.
- **Ataque a varios objetivos:** una tirada de ataque y una de daño, aplicadas a cada objetivo por separado.
- **Tirada en equipo (Tag Team):** se suman ambos daños y cuentan como **una sola fuente**.
- **Esbirros (Minion X):** cualquier daño los derrota; por cada X de daño, se derrota otro esbirro al alcance.
- **Horda (Horde X):** con la mitad o más de PG marcados, su ataque estándar pasa a hacer X.

### Caídas y choques (opcional del DJ)
Muy Cerca 1d10+3 físico · Cerca 1d20+5 físico · Lejos/Muy Lejos 1d100+15 físico (o muerte a criterio). Choque a velocidad peligrosa: **1d20+5 daño físico directo**.

---

## 7. Descanso (Downtime / Rest)

- En cada descanso, cada PJ hace **hasta 2 movimientos de descanso (downtime moves)**; **puede repetir el mismo**.
- Antes, puede **mover cartas de dominio entre carga (loadout) y bóveda (vault) gratis**.
- Tras **3 descansos cortos seguidos**, el siguiente **debe ser largo**.
- **Interrupciones:** corto interrumpido → **sin beneficios**; largo interrumpido → solo beneficios de **corto**.
- *Tier* (nivel de poder) para los dados: Tier 1 = nivel 1; Tier 2 = niveles 2–4; Tier 3 = 5–7; Tier 4 = 8–10.

### Descanso corto (Short Rest) — ~1 hora en el juego

| Movimiento | Efecto |
|---|---|
| Atender heridas (Tend to Wounds) | Limpia **1d4 + Tier** PG (tuyos **o de un aliado**) |
| Limpiar Estrés (Clear Stress) | Limpia **1d4 + Tier** Estrés (solo tuyo) |
| Reparar armadura (Repair Armor) | Limpia **1d4 + Tier** Casillas de Armadura (tuyas o de un aliado) |
| Prepararse (Prepare) | **+1 Esperanza**; si lo haces **junto con** uno o más compañeros, **cada uno +2 Esperanza** |

**Al terminar:** se recargan los usos "por descanso" y expiran los efectos que duran "hasta tu siguiente descanso".

### Descanso largo (Long Rest) — varias horas, acampar/dormir

| Movimiento | Efecto |
|---|---|
| Atender todas las heridas (Tend to All Wounds) | Limpia **todos** los PG (tuyos o de un aliado) |
| Limpiar todo el Estrés (Clear All Stress) | Limpia **todo** el Estrés |
| Reparar toda la armadura (Repair All Armor) | Limpia **todas** las Casillas de Armadura (tuyas o de un aliado) |
| Prepararse (Prepare) | **+1 Esperanza**; en grupo, **+2 cada uno** |
| Trabajar en un proyecto (Work on a Project) | Con aprobación del DJ; ver §10 |

**Al terminar:** se recargan usos "por descanso" **y** "por descanso largo"; expiran los efectos "hasta tu siguiente descanso" y "hasta tu siguiente descanso largo". Un PJ inconsciente por *Evitar la muerte* despierta.

### Consecuencias para el DJ (Downtime Consequences)
- **Descanso corto:** el DJ gana **1d4 Miedo**.
- **Descanso largo:** el DJ gana **1d4 + número de PJ** Miedo, y puede avanzar **una cuenta regresiva de largo plazo** a su elección.
- **Descanso extendido (montaje de mucho tiempo):** el DJ gana **1d6 Miedo por PJ** y avanza las cuentas de largo plazo que correspondan.
- Recordar el **tope de 12 Miedo**.

Consumible de ejemplo: Musgo dulce (Sweet Moss) — durante un descanso limpia 1d10 PG o 1d10 Estrés.

---

## 8. Flujo de combate

### Sin iniciativa, con spotlight
- **No hay iniciativa** ni número fijo de acciones. El **spotlight** (foco) es la atención de la mesa; quien lo tiene describe qué hace y luego pasa a quien: (1) la ficción señale, (2) lleve rato sin foco, o (3) indique una mecánica.
- **El spotlight pasa al DJ** cuando un jugador **falla** una tirada de acción (con Esperanza o con Miedo). En **Éxito con Miedo** el DJ gana Miedo y hace un movimiento (consecuencia menor). Ver tabla de resultados abajo.
- Un **turno del DJ (GM turn)** empieza cuando recibe el spotlight y termina cuando lo devuelve a los jugadores.

### Resultados de tirada de acción (2d12 + modificadores vs Dificultad)
| Resultado | Efecto en recursos | Spotlight |
|---|---|---|
| Éxito con Esperanza | PJ +1 Esperanza | sigue con jugadores |
| Éxito con Miedo | DJ +1 Miedo; consecuencia menor | DJ hace movimiento |
| Fallo con Esperanza | PJ +1 Esperanza; consecuencia menor | pasa al DJ |
| Fallo con Miedo | DJ +1 Miedo; consecuencia mayor | pasa al DJ |
| Crítico (dados iguales) | PJ +1 Esperanza y limpia 1 Estrés; cuenta como "con Esperanza" | — |

Las **tiradas de reacción** no generan Esperanza ni Miedo y no disparan movimientos del DJ.

### Fichas de acción — regla opcional (Spotlight Tracker)
- En la v1.5 del playtest existía un "rastreador de acciones" (action tracker); en la versión final se **eliminó** y se cambió por esta regla opcional.
- Al inicio de sesión o escena, cada jugador pone **N fichas** (se recomiendan **3**). Gasta **1 por acción**.
- Si el spotlight iría a alguien **sin fichas**, pasa a otro.
- Cuando **todos** gastaron sus fichas, todos recargan la misma cantidad y se sigue.
- El texto oficial no le da ningún efecto sobre el Miedo ni sobre los turnos del DJ; solo reparte el spotlight entre jugadores. (Que el viejo action tracker del playtest sí generaba Miedo: SIN VERIFICAR.)

### Turno del DJ y adversarios
- Al recibir el spotlight, el DJ puede hacer un movimiento para **poner el foco en un adversario**. Un adversario con foco puede:
  - Moverse dentro de Cerca y hacer un **ataque estándar**;
  - Moverse dentro de Cerca y usar una **acción de adversario**;
  - **Limpiar una condición**;
  - **Correr** dentro de Lejos o Muy Lejos;
  - Cualquier otra cosa que pida la ficción.
- **Cada adversario adicional** con foco en el mismo turno cuesta **1 Miedo**.
- **Implacable X (Relentless X):** ese adversario puede tener el foco hasta X veces por turno del DJ (pagando Miedo como siempre).
- **Lento (Slow):** la primera vez que recibe foco solo pone una ficha y "se prepara"; la siguiente vez que recibe foco, quita la ficha y actúa.
- **Ataque de adversario:** d20 + modificador de ataque vs **Evasión** del PJ; 20 natural = éxito automático + crítico. Ventaja/desventaja de adversario = tirar 2d20 y quedarse con el mayor/menor.
- Al terminar, el spotlight vuelve a los PJ.

### Miedo del DJ (Fear)
- Empieza la campaña con **1 Miedo por PJ**. Máximo **12**. Se conserva entre sesiones.
- **Gana Miedo:** cada tirada de PJ "con Miedo"; al descansar (§7); Tag Team con Miedo = **1 Miedo por PJ involucrado**; cuando un efecto lo indique (p. ej. reacción "Momentum").
- **Gasta 1 Miedo para:**
  - **Interrumpir** a los jugadores, **robar el spotlight** y hacer un movimiento;
  - Hacer un **movimiento adicional** (p. ej. poner foco en otro adversario);
  - Usar un **rasgo de Miedo (Fear Feature)** de adversario o entorno;
  - Sumar una **Experiencia** de un adversario a una tirada;
  - Terminar un efecto temporal de hechizo.
- Guía de gasto por escena: Incidental 0–1 · Menor 1–3 · Estándar 2–4 · Mayor 4–8 · Climática 6–12.

### Esperanza del PJ (Hope) — gastos
Ayudar a un aliado (1, dado de ventaja d6) · Usar una Experiencia (1 por Experiencia) · Tag Team (3, una vez por sesión por jugador) · Rasgos de Esperanza (los de clase cuestan 3).

---

## 9. Cuentas regresivas (Countdowns)

- Empiezan en un **valor inicial**; **avanzar** = **restar 1**; al llegar a **0** se dispara su efecto. Se pueden llevar con un dado girado o casillas.
- **Estándar (standard):** avanza **1 cada vez que un jugador hace una tirada de acción**. "Countdown (n)" = estándar con inicio n. Un Tag Team cuenta como **una** tirada.
- **Dinámica (dynamic):** avanza **0–3** según el resultado. Hay de **Progreso (Progress)** (algo bueno) y de **Consecuencia (Consequence)** (algo malo):

| Resultado | Progreso | Consecuencia |
|---|---|---|
| Fallo con Miedo | 0 | −3 |
| Fallo con Esperanza | 0 | −2 |
| Éxito con Miedo | −1 | −1 |
| Éxito con Esperanza | −2 | 0 |
| Crítico | −3 | 0 |

- **Variantes avanzadas:**
  - **Inicio aleatorio** (p. ej. tirar un dado para el valor inicial; las "fate rolls" sugieren usar un Dado de Esperanza o de Miedo);
  - **En bucle (Loop):** al dispararse, vuelve a su valor inicial;
  - **Creciente (Increasing):** en cada bucle, su valor inicial **sube 1**;
  - **Decreciente (Decreasing):** en cada bucle, su valor inicial **baja 1**;
  - **Enlazadas (Linked):** una de progreso y una de consecuencia avanzan a la vez con el mismo resultado;
  - **De largo plazo (Long-term):** avanzan con los **descansos**, no con tiradas.
- Rasgos pueden definir disparadores propios (p. ej. "Loop 3, avanza cuando un PJ falla un ataque"; bajo el agua: estándar (3) que avanza con cada acción y extra con fallos/Miedo).

---

## 10. Oro y proyectos de descanso

### Oro (Gold)
- Abstracto: **puñados (handfuls)**, **bolsas (bags)**, **cofres (chests)**. **10 puñados = 1 bolsa; 10 bolsas = 1 cofre.**
- Si una categoría está llena y ganas otra unidad de esa categoría: marca 1 de la siguiente y **borra** las de la actual (9 puñados + 1 → 1 bolsa, 0 puñados).
- **Máximo 1 cofre**; con todo lleno hay que gastar o guardar antes de recibir más.
- Personaje inicial: **1 puñado** (SIN VERIFICAR la cantidad exacta; el SRD v2.0 dice que se anota en "Gold > Handfuls").
- **Opcional — monedas (coins):** 10 monedas = 1 puñado.
- Precios de referencia (ajustables): comida del grupo por noche 1 puñado · posada normal 1 puñado · posada de lujo 1 bolsa · carruaje 2 puñados · montura 3 bolsas · herramientas 3 puñados · ropa fina 3 puñados · ropa de lujo 1 bolsa · equipo T1 1–5 puñados · T2 1–2 bolsas · T3 5–10 bolsas · T4 1–2 cofres.

### Trabajar en un proyecto (Work on a Project) — solo en descanso largo
- Con aprobación del DJ (descifrar un texto, forjar un arma…). Al empezar se le asigna una **cuenta regresiva**, normalmente **de Progreso**.
- Cada vez que se usa el movimiento: avanza **automáticamente** (proyecto simple) o con **tirada de acción** (complejo) — decide el DJ. El valor inicial depende de complejidad, herramientas e impacto en la historia.

---

## Resumen de números para la app

| Dato | Valor |
|---|---|
| Máx. PG | 12 |
| Máx. Estrés (inicial 6) | 12 |
| Máx. Puntuación de Armadura | 12 |
| Máx. Esperanza (inicial 2) | 6 (menos cicatrices) |
| Máx. Miedo del DJ (inicial = nº de PJ) | 12 |
| Casillas de Armadura por golpe | 1 |
| Movimientos por descanso | 2 (repetibles) |
| Descansos cortos seguidos | 3 máx. |
| Miedo por descanso corto / largo | 1d4 / 1d4 + nº PJ |
| Miedo por descanso extendido | 1d6 por PJ |
| Curación en corto | 1d4 + Tier |
| Fichas de acción opcionales | 3 recomendadas |
| Daño masivo (opcional) | ≥ 2 × Grave → 4 PG |

---

## Fuentes

- SRD oficial (página, changelogs y PDF v2.0): https://www.daggerheart.com/srd/ — PDF: https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf
- FAQ oficial (cambios desde el playtest 1.5: umbrales, armadura, eliminación del action tracker): https://www.daggerheart.com/faq/
- Licencia comunitaria de Darrington Press: https://darringtonpress.com/license/
- Texto completo del SRD 1.0 transcrito a Markdown (mirror de la comunidad del texto oficial, usado para leer las reglas): https://github.com/seansbox/daggerheart-srd (README.md) y https://seansbox.github.io/daggerheart-srd/
