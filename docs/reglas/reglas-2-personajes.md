# Daggerheart: referencia de creación y progresión de personajes

Para construir una hoja de personaje digital. Reglas **oficiales** (Darrington Press). No incluye homebrew.

**Fuente base:** Daggerheart SRD 1.0, versión del 9 de septiembre de 2025, que ya integra la errata de junio y septiembre de 2025. La revisé completa en su transcripción comunitaria (seansbox/daggerheart-srd), que viene del PDF oficial `DH-SRD-2025-09-09.pdf`.

**Aviso importante:** el 25 de agosto de 2026, Darrington Press publicó **SRD 2.0** (`DH_SRD_2_2026_08_25.pdf`), y ahora es la única versión que ofrece daggerheart.com/srd. Esa versión agrega lo siguiente:

- El contenido de *Hope & Fear*: 4 clases nuevas, el dominio Dread, 6 ancestrías y 6 comunidades nuevas, y transformaciones.
- Errata nueva.
- Secciones reescritas sobre ventaja/desventaja, resolución de tiradas y *spotlight*.

No pude descargar el PDF 2.0 completo porque el proxy bloquea daggerheart.com. Solo leí fragmentos con un lector web. Lo que viene de 2.0 está marcado con **[SRD 2.0]**; lo que no pude confirmar, con **SIN VERIFICAR**.

Los términos están en español con el término oficial en inglés entre paréntesis. Los números son exactos, tomados del SRD.

---

## 1. Rasgos (Traits)

Hay seis rasgos. Al crear el personaje se reparte el arreglo **+2, +1, +1, +0, +0, −1** en el orden que quieras. Cuando "tiras con un rasgo", su modificador se suma a la tirada.

| Rasgo | Verbos de la hoja | Para qué sirve |
|---|---|---|
| Agilidad (Agility) | Esprintar, Saltar, Maniobrar (Sprint, Leap, Maneuver) | Velocidad, terreno difícil, reaccionar rápido; trepar una cuerda, correr a cubrirse |
| Fuerza (Strength) | Levantar, Destrozar, Forcejear (Lift, Smash, Grapple) | Proezas físicas y aguante; romper puertas, resistir una carga |
| Delicadeza (Finesse) | Controlar, Esconderse, Trastear (Control, Hide, Tinker) | Precisión, sigilo, herramientas finas, golpes precisos |
| Instinto (Instinct) | Percibir, Intuir, Orientarse (Perceive, Sense, Navigate) | Notar detalles, presentir peligro, rastrear |
| Presencia (Presence) | Encantar, Actuar, Engañar (Charm, Perform, Deceive) | Lo social: convencer, intimidar, captar a una multitud |
| Conocimiento (Knowledge) | Recordar, Analizar, Comprender (Recall, Analyze, Comprehend) | Saber cosas, deducir, ver patrones |

Reglas que afectan a la app:

- **Rasgo de lanzamiento (Spellcast trait):** lo define la subclase. Es el rasgo que se usa en las tiradas de lanzamiento (Spellcast Rolls).
- **Rasgos "marcados":** al subir un rasgo con una mejora, el rasgo queda marcado y no se puede volver a subir hasta que una marca de tier lo libere (niveles 5 y 8).
- **Usos iguales a un rasgo:** si un efecto da tantos usos como un rasgo y ese rasgo vale +0 o menos, da 0 usos.

---

## 2. Clases (Classes)

Cada clase define lo siguiente:

- Dos dominios.
- Evasión inicial.
- Puntos de Golpe (HP) iniciales.
- Objetos de clase (eliges uno de dos).
- Rasgo de Esperanza (Hope feature), que siempre cuesta **3 Esperanza**.
- Rasgos de clase.
- Dos subclases.
- Preguntas de trasfondo y de conexión.

Todas las clases empiezan con **6 casillas de Estrés** y **2 de Esperanza**.

### 2.1 Las 9 clases del núcleo (SRD 1.0)

| Clase | Dominios | Evasión | HP | Rasgo de Esperanza (3 Esperanza) | Rasgos de clase (resumen) | Subclases (rasgo de lanzamiento) | Objetos de clase (elige 1) |
|---|---|---|---|---|---|---|---|
| Bardo (Bard) | Gracia y Códice (Grace & Codex) | 10 | 5 | *Make a Scene*: Distraer a un objetivo a rango Cercano; su Dificultad baja −2 | *Rally*: una vez por sesión, tú y tus aliados reciben un Dado de Ánimo (Rally Die) d6, que pasa a d8 en nivel 5. Se suma a una tirada o limpia Estrés | Trovador / Troubadour (Presencia); Orador / Wordsmith (Presencia) | Una novela romántica o una carta nunca abierta |
| Druida (Druid) | Sabio y Arcano (Sage & Arcana) | 10 | 6 | *Evolution*: tomar forma de bestia sin marcar Estrés y +1 a un rasgo mientras dure | *Beastform*: marcar 1 Estrés para transformarse en una bestia de tu tier o menor. Hay 6 formas por tier, 24 en total, con rasgo, ataque, bono de Evasión y ventajas. *Wildtouch*: efectos naturales menores | Guardián de los Elementos / Warden of the Elements (Instinto); Guardián de la Renovación / Warden of Renewal (Instinto) | Una bolsita de piedras y huesos o un colgante extraño hallado en la tierra |
| Guardián (Guardian) | Valor y Hoja (Valor & Blade) | 9 | 7 | *Frontline Tank*: limpiar 2 Casillas de Armadura | *Unstoppable*: una vez por descanso largo, recibes un Dado Imparable d4 (d6 en nivel 5) que crece con cada golpe. Mientras dura: baja un umbral el daño físico, suma el dado al daño y eres inmune a Restringido y Vulnerable | Firme / Stalwart (ninguno); Venganza / Vengeance (ninguno) | Un tótem de tu mentor o una llave secreta |
| Explorador (Ranger) | Hueso y Sabio (Bone & Sage) | 12 | 6 | *Hold Them Off*: al acertar con un arma, aplicar la misma tirada a 2 enemigos más | *Ranger's Focus*: gastar 1 Esperanza y atacar; el objetivo se vuelve tu Foco. Sabes dónde está, marca Estrés cuando le haces daño y puedes repetir la tirada | Vinculado a Bestia / Beastbound (Agilidad, con compañero animal); Rastreador / Wayfinder (Agilidad) | Un trofeo de tu primera presa o una brújula aparentemente rota |
| Pícaro (Rogue) | Medianoche y Gracia (Midnight & Grace) | 12 | 6 | *Rogue's Dodge*: +2 a Evasión hasta que te acierten o hasta tu siguiente descanso | *Cloaked*: una versión mejorada de Oculto (Hidden). *Sneak Attack*: suma tantos d6 de daño como tu tier si estás Encubierto o si un aliado está en Cuerpo a cuerpo del objetivo | Caminante Nocturno / Nightwalker (Delicadeza); Sindicato / Syndicate (Delicadeza) | Herramientas de falsificación o un garfio |
| Serafín (Seraph) | Esplendor y Valor (Splendor & Valor) | 9 | 7 | *Life Support*: limpiar 1 HP a un aliado a rango Cercano | *Prayer Dice*: al inicio de cada sesión tiras tantos d4 como tu rasgo de lanzamiento. Sirven para reducir daño, sumar a una tirada o ganar Esperanza | Portador Divino / Divine Wielder (Fuerza); Centinela Alado / Winged Sentinel (Fuerza) | Un atado de ofrendas o un sigilo de tu dios |
| Hechicero (Sorcerer) | Arcano y Medianoche (Arcana & Midnight) | 10 | 6 | *Volatile Magic*: repetir cualquier número de dados de daño mágico | *Arcane Sense*: percibir magia a rango Cercano. *Minor Illusion*: Spellcast Roll (10). *Channel Raw Power*: una vez por descanso largo, mandar una carta a la bóveda para ganar Esperanza igual a su nivel o +2×nivel al daño de un hechizo | Origen Elemental / Elemental Origin (Instinto); Origen Primigenio / Primal Origin (Instinto) | Un orbe que susurra o una reliquia familiar |
| Guerrero (Warrior) | Hoja y Hueso (Blade & Bone) | 11 | 6 | *No Mercy*: +1 a tiradas de ataque hasta el siguiente descanso | *Attack of Opportunity*: reacción cuando un enemigo sale de Cuerpo a cuerpo. *Combat Training*: ignora la carga de las armas y suma su nivel al daño físico | Llamado del Valiente / Call of the Brave (ninguno); Llamado del Matador / Call of the Slayer (ninguno) | El dibujo de un amante o una piedra de afilar |
| Mago (Wizard) | Códice y Esplendor (Codex & Splendor) | 11 | 5 | *Not This Time*: obligar a un adversario a rango Lejano a repetir una tirada de ataque o de daño | *Prestidigitation*: trucos mágicos inofensivos. *Strange Patterns*: eliges un número del 1 al 12; si sale en un Dado de Dualidad, ganas 1 Esperanza o limpias 1 Estrés. Puedes cambiar el número en un descanso largo | Escuela del Conocimiento / School of Knowledge (Conocimiento, +1 carta de dominio en cada etapa); Escuela de Guerra / School of War (Conocimiento, +1 casilla de HP) | Un libro que intentas traducir o un pequeño elemental mascota inofensivo |

Notas de modelado:

- **Arreglo de rasgos sugerido.** Cada clase trae uno (campo `suggested_traits`) y también arma y armadura sugeridas. Ejemplo, Guerrero: +2, +1, 0, +1, −1, 0 con Espada larga (Longsword) y Cota de malla (Chainmail).
- **Subclases sin rasgo de lanzamiento.** Las de Guardián y Guerrero no tienen. Eso importa porque **las armas mágicas solo las puede usar quien tiene rasgo de lanzamiento**.
- **Etapas de la subclase.** Cada subclase tiene tres cartas:
  - **Base (Foundation):** se recibe en nivel 1.
  - **Especialización (Specialization)** y **Maestría (Mastery):** se obtienen con la mejora "carta de subclase mejorada" (ver §7).
- **Cambios permanentes que vienen de subclases.** La app debe aplicarlos sola:
  - Firme (Stalwart): +1, +2 y +3 a los umbrales de daño, acumulativos según la etapa.
  - Venganza (Vengeance): +1 casilla de Estrés.
  - Escuela de Guerra (School of War): +1 casilla de HP.
  - Centinela Alado (Winged Sentinel), en Maestría: +4 al umbral Grave.
  - Caminante Nocturno (Nightwalker), en Maestría: +1 a Evasión.
  - Escuela del Conocimiento (School of Knowledge): +1 carta de dominio en cada etapa.
  - Escuela de Guerra, en Especialización: suma la Competencia a la Evasión mientras tengas 2 o más de Esperanza.
- **Vinculado a Bestia (Beastbound):** agrega una mini-hoja de compañero animal con su propia Evasión, Experiencias, dado de daño, Estrés y opciones de subida.

### 2.2 Clases agregadas en SRD 2.0 (*Hope & Fear*, 2026) [SRD 2.0]

| Clase | Dominios | Evasión | HP | Rasgo de Esperanza | Subclases (rasgo de lanzamiento) |
|---|---|---|---|---|---|
| Asesino (Assassin) | Hoja y Medianoche (Blade & Midnight) | 12 | 5 | *Deadly Determination*: limpiar 2 Estrés | Gremio de Verdugos / Executioners Guild (Agilidad); Gremio de Envenenadores / Poisoners Guild (Conocimiento) |
| Peleador (Brawler) | Valor y Hueso (Valor & Bone) | 10 | 6 | *Square Up*: dejar Vulnerable a un objetivo a rango Cercano | Juggernaut (ninguno); Artista Marcial / Martial Artist (ninguno) |
| Brujo (Warlock) | Pavor y Gracia (Dread & Grace) | 11 | 5 | *Patron's Boon*: si fallas una tirada, repetirla con ventaja | Pacto del Eterno / Pact of the Endless (Presencia); Pacto del Iracundo / Pact of the Wrathful (Presencia) |
| Bruja (Witch) | Pavor y Sabio (Dread & Sage) | 10 (SIN VERIFICAR) | 6 (SIN VERIFICAR) | SIN VERIFICAR | Hedge y Moon (SIN VERIFICAR, incluido su rasgo de lanzamiento) |

Rasgos de clase confirmados de las clases nuevas:

- **Asesino:** *Marked for Death* (suma d4 de daño contra el objetivo marcado, escalando por tier) y *Get In & Get Out*.
- **Peleador:** *I Am the Weapon* (un arma desarmada primaria d8+d6 física y +1 a Evasión) y *Combo Strike* (Dado de Combo d4 que sube un paso por tier como mejora).
- **Brujo:**
  - *Patron's Pact*: Dado de Patrón d6, que pasa a d8 en nivel 5.
  - *Favor*: un recurso nuevo. Empieza en 3 y su máximo es 6. **La app necesita un campo para él.**

Recomendación para la app: modela las clases como datos y no como código. Con eso, agregar las 4 clases de SRD 2.0 es solo importar filas.

---

## 3. Ancestrías (Ancestries) y Comunidades (Communities)

### 3.1 Ancestrías del núcleo (18)

Cada una tiene **dos rasgos** (features): uno "de arriba" (el primero) y uno "de abajo" (el segundo).

| Ancestría | Rasgo 1 (arriba) | Rasgo 2 (abajo) |
|---|---|---|
| Clank | *Purposeful Design*: +1 permanente a una Experiencia | *Efficient*: en un descanso corto puedes elegir un movimiento de descanso largo |
| Drakona | *Scales*: ante daño Grave, marcar 1 Estrés para marcar 1 HP menos | *Elemental Breath*: ataque de aliento con Instinto a rango Muy cercano (d8 mágico) |
| Enano (Dwarf) | *Thick Skin*: el daño Menor se puede pagar con 2 Estrés | *Increased Fortitude*: 3 Esperanza para reducir a la mitad el daño físico |
| Elfo (Elf) | *Quick Reactions*: 1 Estrés para tener ventaja en una tirada de reacción | *Celestial Trance*: un movimiento de descanso extra |
| Hada (Faerie) | *Luckbender*: una vez por sesión, 3 Esperanza para repetir los Dados de Dualidad | *Wings*: vuela; 1 Estrés para +2 a Evasión contra un ataque |
| Fauno (Faun) | *Caprine Leap*: saltar a cualquier punto a rango Cercano | *Kick*: 1 Estrés para +2d6 de daño y empujar |
| Firbolg | *Charge*: 1d12 de daño a todos en Cuerpo a cuerpo al cargar | *Unshakable*: al marcar Estrés tiras 1d6; con 6 no lo marcas |
| Fungril | *Fungril Network*: comunicarse a cualquier distancia (Instinto 12) | *Death Connection*: extraer recuerdos de un cadáver |
| Galapa | *Shell*: +Competencia a los umbrales de daño | *Retract*: resistencia física dentro del caparazón |
| Gigante (Giant) | *Endurance*: +1 casilla de HP al crearlo | *Reach*: lo de Cuerpo a cuerpo cuenta como Muy cercano |
| Goblin | *Surefooted*: ignora la desventaja en Agilidad | *Danger Sense*: una vez por descanso, obligar a repetir un ataque |
| Mediano (Halfling) | *Luckbringer*: al inicio de sesión, todo el grupo gana 1 Esperanza | *Internal Compass*: puede repetir un 1 en el Dado de Esperanza |
| Humano (Human) | *High Stamina*: +1 casilla de Estrés al crearlo | *Adaptability*: 1 Estrés para repetir un fallo que usó una Experiencia |
| Infernis | *Fearless*: 2 Estrés para convertir una tirada con Miedo en una con Esperanza | *Dread Visage*: ventaja al intimidar |
| Katari | *Feline Instincts*: 2 Esperanza para repetir el Dado de Esperanza en Agilidad | *Retracting Claws*: dejar Vulnerable al objetivo |
| Orco (Orc) | *Sturdy*: con 1 HP restante, los ataques contra ti tienen desventaja | *Tusks*: 1 Esperanza para +1d6 de daño |
| Ribbet | *Amphibious*: respira bajo el agua | *Long Tongue*: arma de Delicadeza a rango Cercano, d12 |
| Simiah | *Natural Climber*: ventaja al trepar y mantener el equilibrio | *Nimble*: +1 permanente a Evasión |

**Ancestría mixta (Mixed Ancestry):** se toma el **primer** rasgo de una ancestría y el **segundo** de otra. No se pueden tomar dos "primeros" ni dos "segundos". En Herencia (Heritage) se escribe el nombre que el jugador quiera, por ejemplo "goblin-orco". Aunque el linaje incluya más de dos ancestrías, solo se toman rasgos de dos.

Para la app conviene guardar `ancestry_feature_top` y `ancestry_feature_bottom` como campos independientes.

**[SRD 2.0]** Ancestrías nuevas: Aetheris, Earthkin, Emberkin, Gnome, Skykin, Tidekin, con lo que el total sube a 24. Sus rasgos están **SIN VERIFICAR**.

### 3.2 Comunidades del núcleo (9)

Cada una da **un rasgo** y una lista de 6 adjetivos de personalidad.

| Comunidad | Rasgo |
|---|---|
| Alta cuna (Highborne) | *Privilege*: ventaja con nobles, al negociar precios o al usar tu reputación |
| Sabia cuna (Loreborne) | *Well-Read*: ventaja en historia, cultura y política |
| Cuna del orden (Orderborne) | *Dedicated*: escribes 3 principios; una vez por descanso, al encarnar uno tiras d20 como Dado de Esperanza |
| Cuna de las cumbres (Ridgeborne) | *Steady*: ventaja en acantilados, entornos duros y supervivencia |
| Cuna del mar (Seaborne) | *Know the Tide*: guardas fichas cuando tiras con Miedo (máximo igual a tu nivel); las gastas para +1 por ficha |
| Cuna astuta (Slyborne) | *Scoundrel*: ventaja con criminales, para detectar mentiras o hallar escondites |
| Cuna subterránea (Underborne) | *Low-Light Living*: ventaja para esconderse o percibir con poca luz |
| Cuna errante (Wanderborne) | *Nomadic Pack*: una vez por sesión, 1 Esperanza para sacar un objeto mundano útil |
| Cuna salvaje (Wildborne) | *Lightfoot*: ventaja para moverse sin ser oído |

**[SRD 2.0]** Comunidades nuevas: Duneborne, Freeborne, Frostborne, Hearthborne, Reborne, Warborne, con lo que el total sube a 15. Sus rasgos están **SIN VERIFICAR**.

---

## 4. Dominios (Domains) y cartas de dominio (Domain cards)

**Dominios del núcleo (9):** Arcano (Arcana), Hoja (Blade), Hueso (Bone), Códice (Codex), Gracia (Grace), Medianoche (Midnight), Sabio (Sage), Esplendor (Splendor), Valor (Valor). **[SRD 2.0]** agrega **Pavor (Dread)**, con lo que son 10.

Cada dominio tiene cartas de nivel 1 a 10:

- Nivel 1: **3 opciones**.
- Niveles 2 a 10: **2 opciones** por nivel.
- Total: 21 cartas por dominio, **189 cartas** en el núcleo.

### Anatomía de una carta (seis elementos)

1. **Nivel (Level):** no puedes adquirir cartas de nivel mayor al de tu personaje.
2. **Dominio (Domain):** solo puedes elegir de los dos dominios de tu clase, o del dominio de tu multiclase.
3. **Coste de recuperación (Recall Cost):** cuánto Estrés marcas para pasar la carta de la bóveda a la carga fuera de un descanso. En el núcleo va de 0 a 4. Conteo medido en el dataset: 31 cartas con coste 0, 86 con 1, 58 con 2, 11 con 3 y 3 con 4.
4. **Título (Title).**
5. **Tipo (Type):**
   - **Habilidad (Ability):** casi siempre no mágica. 89 cartas.
   - **Hechizo (Spell):** mágica. 87 cartas.
   - **Grimorio (Grimoire):** exclusivo de Códice. Agrupa varios hechizos menores en una sola carta. 13 cartas.
6. **Efecto (Feature):** el texto de la carta.

### Carga (Loadout) y bóveda (Vault)

- La **carga** es lo que está activo. Tiene un **máximo de 5 cartas**.
- Desde la sexta carta, el resto va a la **bóveda**. Las cartas en la bóveda están inactivas.
- Las cartas de subclase, ancestría y comunidad **no cuentan** para la carga ni para la bóveda, y siempre están activas.
- **Al inicio de un descanso** (corto o largo) puedes mover cartas libremente, siempre que no pases de 5.
- **Fuera de un descanso**, pasar una carta de la bóveda a la carga cuesta Estrés igual a su coste de recuperación. Mandar una carta de la carga a la bóveda para hacer espacio es gratis.
- Una carta nueva ganada al subir de nivel puede entrar gratis a la carga. Si la carga está llena, primero hay que mandar otra a la bóveda.
- **Límites de uso:** si una carta tiene usos limitados ("una vez por descanso"), la app debe registrarlos.

### Cuántas cartas se reciben

- **Nivel 1:** 2 cartas de nivel 1, ya sea una de cada dominio o dos del mismo.
- **Cada subida de nivel:** +1 carta de tu nivel o menor, de tus dominios. Además puedes **cambiar** una carta que ya tenías por otra de nivel igual o menor.
- **Fuentes extra:**
  - La mejora "carta de dominio adicional".
  - Escuela del Conocimiento, que da +1 carta en cada etapa.
  - Con multiclase, las cartas del dominio de multiclase deben ser de nivel menor o igual a **la mitad de tu nivel, redondeando hacia arriba**.

---

## 5. Campos de la hoja de personaje

| Campo | Valor inicial | Cómo se calcula o cambia | Máximo |
|---|---|---|---|
| Nivel (Level) | 1 | +1 en cada hito narrativo, que suele llegar cada ~3 sesiones; todo el grupo sube a la vez | 10 |
| Evasión (Evasion) | La de la clase | Base de clase + armadura (Flexible +1, Heavy −1, Very Heavy −2) + arma (Massive/Heavy −1, Tower Shield −1) + mejoras + rasgos (Simiah, Nightwalker…). Es la Dificultad que deben superar los ataques contra ti | — |
| Puntuación de armadura (Armor Score) | Base de la armadura | Base de la armadura + bonos permanentes (Round Shield +1, Tower Shield +2…). Es igual al número de **Casillas de armadura (Armor Slots)** | **12** |
| Casillas de armadura marcadas | 0 | Marcas 1 para bajar un umbral la severidad de un daño. Con puntuación 0 no puedes marcar ninguna | = Armor Score |
| Umbrales de daño (Damage Thresholds) | Base de la armadura + nivel | **Mayor (Major) = umbral base Mayor + nivel**; **Grave (Severe) = umbral base Grave + nivel**; más bonos (Stalwart, Galapa, Winged Sentinel). Al subir de nivel, ambos suben +1. **Sin armadura:** Mayor = nivel y Grave = 2 × nivel | — |
| Puntos de Golpe (Hit Points, HP) | Los de la clase (+1 Gigante, +1 Escuela de Guerra) | Daño menor al umbral Mayor: marcas 1. Igual o mayor al Mayor: marcas 2. Igual o mayor al Grave: marcas 3. Regla opcional: daño ≥ 2 × Grave marca 4. Al marcar el último caes y haces un movimiento de muerte (death move) | **12** |
| Estrés (Stress) | **6** (+1 Humano, +1 Venganza) | Al marcar el último quedas Vulnerable. Si debes marcar Estrés y no puedes, marcas 1 HP | **12** |
| Esperanza (Hope) | **2** | Se gana al tirar con Esperanza o con Prepare, entre otros. Se conserva entre sesiones | **6** |
| Competencia (Proficiency) | **1** | Es el número de dados de daño del arma; no multiplica los modificadores planos. +1 en niveles 2, 5 y 8, y con la mejora de Competencia | 6 en la hoja (SIN VERIFICAR, ver nota) |
| Experiencias (Experiences) | **2, cada una a +2** | +1 Experiencia a +2 en niveles 2, 5 y 8; la mejora "Experiencias" da +1 a dos de ellas. Se usan gastando 1 Esperanza por Experiencia en una tirada de acción o de reacción | Sin tope escrito |
| Oro (Gold) | 1 puñado | 10 puñados (handfuls) = 1 bolsa (bag); 10 bolsas = 1 cofre (chest). Al llenar una categoría, se marca 1 de la siguiente y se borra la actual. Opcional: 10 monedas (coins) = 1 puñado | **1 cofre** |
| Armas activas (Active Weapons) | Primaria (y secundaria) | Ver §8 | Carga total de 2 manos |
| Armas de inventario (Inventory Weapons) | — | Puedes llevar 2 más. Cambiarlas en calma es gratis; bajo presión cuesta 1 Estrés | 2 |
| Armadura activa (Active Armor) | 1 | No se lleva armadura en el inventario. No se puede poner ni quitar en peligro. Cada armadura conserva sus casillas marcadas | 1 |
| Inventario (Inventory) | Antorcha, 15 m (50 ft) de cuerda, suministros básicos, **Poción menor de salud** (1d4 HP) **o Poción menor de aguante** (1d4 Estrés), objeto de clase y objeto para hechizos si aplica | Lista libre. Consumibles: máximo **5 de cada uno** | — |
| Identidad | — | Nombre, pronombres, Herencia (ancestría + comunidad), clase y subclase. Descripción con listas por clase: ropa, ojos, cuerpo, piel, actitud | — |
| Trasfondo (Background) | — | Responder las 3 preguntas de trasfondo de la clase (se pueden cambiar). Sin efecto mecánico | — |
| Conexiones (Connections) | — | Las 3 preguntas de conexión de la clase. Cada jugador propone al menos una conexión con cada otro PJ, y cada quien acepta o rechaza | — |
| Rasgos fijos | — | Rasgo de clase, rasgo de Esperanza, cartas de subclase, ancestría y comunidad | — |
| Recursos de clase | — | Dado de Ánimo (Rally Die), Dado Imparable (Unstoppable Die), Dados de Oración (Prayer Dice), Foco (Focus), número de Strange Patterns, forma de bestia activa. [SRD 2.0]: Favor y Dado de Patrón (Brujo), Dado de Combo (Peleador) | — |

Nota sobre la Competencia: empieza en 1 y gana +1 en niveles 2, 5 y 8, así que llega a 4 solo con los hitos. La mejora de Competencia aparece en los tiers 3 y 4. Eso da un máximo práctico de 6, que cuadra con los círculos de la hoja. Este tope es **SIN VERIFICAR**.

Ejemplo de cálculo en nivel 1 con Armadura de cuero (Leather Armor), que tiene umbrales base 6/13 y puntuación base 3: umbrales 7/14 y Armor Score 3. En nivel 4 con la misma armadura: 10/17.

---

## 6. Creación del personaje: los 9 pasos

1. **Clase y subclase.** Se toma la carta Base (Foundation) de la subclase.
2. **Herencia:** ancestría (o mixta) + comunidad.
3. **Rasgos:** se reparte +2, +1, +1, 0, 0, −1.
4. **Datos:** nivel 1, Evasión y HP de la clase, 6 de Estrés, 2 de Esperanza.
5. **Equipo:**
   - Armas de tier 1: una primaria a dos manos, **o** una primaria a una mano + una secundaria a una mano.
   - Competencia 1.
   - Armadura de tier 1. Umbrales = base + nivel; Armor Score = base + bonos.
   - Inventario inicial (ver §5).
6. **Trasfondo:** preguntas de la clase.
7. **Experiencias:** 2 a +2. No pueden ser demasiado amplias, como "Suertudo", ni dar poderes mecánicos, como "Invulnerable".
8. **Cartas de dominio:** 2 de nivel 1 de tus dominios.
9. **Conexiones** con los otros PJ.

---

## 7. Subir de nivel (Leveling up)

### Tiers

| Tier | Niveles | Usos en la app |
|---|---|---|
| 1 | 1 | Equipo de tier 1; Sneak Attack 1d6 |
| 2 | 2–4 | Equipo de tier ≤2; mejoras del tier 2 |
| 3 | 5–7 | Equipo de tier ≤3; multiclase disponible |
| 4 | 8–10 | Equipo de tier ≤4 |

No se puede equipar armas ni armaduras de un tier mayor al tuyo. El tier también cuenta en los movimientos de descanso, que limpian 1d4+tier, en Sneak Attack y en otros efectos.

### Procedimiento al subir de nivel (4 pasos)

1. **Logros de tier (Tier achievements):**
   - **Nivel 2:** +1 Experiencia a +2 y +1 Competencia.
   - **Nivel 5:** +1 Experiencia a +2, +1 Competencia y **se borran las marcas de los rasgos**.
   - **Nivel 8:** igual que el nivel 5.
2. **Mejoras (Advancements):** eliges **2** opciones que tengan al menos una casilla libre, de tu tier o de uno inferior. Al tomar una, marcas una de sus casillas.
3. **Umbrales de daño:** +1 a ambos umbrales.
4. **Carta de dominio:** +1 carta de tu nivel o menor. Opcionalmente cambias una carta anterior por otra de nivel igual o menor.

### Opciones de mejora

El texto de las opciones es del SRD. Los números de casillas vienen de la hoja oficial, que no pude leer como imagen: **SIN VERIFICAR**. La lista que sigue es la que normalmente se cita de la hoja.

| Opción | Efecto | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|
| Rasgos | +1 a dos rasgos sin marcar, y quedan marcados | ×3 | ×3 | ×3 |
| HP | +1 casilla de HP permanente | ×2 | ×2 | ×2 |
| Estrés | +1 casilla de Estrés permanente | ×2 | ×2 | ×2 |
| Experiencias | +1 a dos Experiencias | ×1 | ×1 | ×1 |
| Carta de dominio | +1 carta de nivel ≤ el tuyo; si eres multiclase, de nivel ≤ la mitad del tuyo del dominio de multiclase | ×1 | ×1 | ×1 |
| Evasión | +1 permanente | ×1 | ×1 | ×1 |
| Carta de subclase mejorada | La siguiente: Especialización y luego Maestría. **Tacha la multiclase de ese tier** | — | ×1 | ×1 |
| Competencia | +1 Competencia (+1 dado de daño). **Cuesta las 2 mejoras del nivel** | — | ×1 (doble) | ×1 (doble) |
| Multiclase | Ver abajo. **Cuesta las 2 mejoras del nivel** | — | ×1 (doble) | ×1 (doble) |

Reglas confirmadas en el SRD:

- Las opciones de tiers inferiores siguen disponibles mientras les queden casillas.
- La multiclase se desbloquea **desde el nivel 5**.
- Un fragmento de la guía oficial de mayo de 2025 parece listar el tier 4 sin subclase, Competencia ni multiclase. Lo atribuyo a un error de extracción, porque el SRD habla de multiclase "a partir del nivel 5" en general. **Revisar contra la hoja.**

### Multiclase (Multiclassing)

Disponible desde el nivel 5, como una mejora doble. Al tomarla:

- Eliges una clase adicional y **uno** de sus dominios.
- Ganas su **rasgo de clase**. No ganas su rasgo de Esperanza; esto lo dice la redacción del SRD, que solo menciona el rasgo de clase.
- Agregas el **módulo de multiclase** a la hoja.
- Tomas la carta Base de una de sus subclases.
- Tachas la opción "carta de subclase mejorada" de ese tier y **todas las demás opciones de multiclase**. Es decir, solo se puede multiclasear una vez.
- Si tus dos cartas Base tienen rasgos de lanzamiento distintos, eliges cuál usar en cada tirada.
- Las cartas del dominio nuevo deben ser de nivel ≤ ⌈nivel ÷ 2⌉.

---

## 8. Equipo (Equipment)

### 8.1 Armas (Weapons): estructura de datos

| Campo | Valores |
|---|---|
| `name` | Texto |
| `tier` | 1–4. Tier 1 = nivel 1; tier 2 = 2–4; tier 3 = 5–7; tier 4 = 8–10 |
| `category` | Primaria / Secundaria (Primary / Secondary). Solo puedes equipar una de cada |
| `trait` | El rasgo con que atacas |
| `range` | Cuerpo a cuerpo, Muy cercano, Cercano, Lejano, Muy lejano (Melee / Very Close / Close / Far / Very Far) |
| `damage` | Dado + modificador plano, por ejemplo `d10+3`. Se tiran tantos dados como la Competencia; el modificador se suma una sola vez |
| `damage_type` | Físico o Mágico (`phy` / `mag`). **El daño mágico requiere rasgo de lanzamiento.** Hay casos `phy or mag` |
| `burden` | Una mano o Dos manos (One-Handed / Two-Handed). Carga máxima: 2 manos. El Guerrero ignora la carga |
| `feature` | 0 o más rasgos con `{name, text}` |

Cantidades en el núcleo: **192 armas**. Las primarias de tier 1 son 15 físicas y 10 mágicas.

**Lanzar un arma:** cualquier arma equipada se puede lanzar a rango Muy cercano usando Delicadeza. Después deja de estar equipada hasta que la recuperes.

Ejemplos de la misma arma por tier, con la escala "base / Improved / Advanced / Legendary":

| Arma | T1 | T2 (Improved) | T3 (Advanced) | T4 (Legendary) |
|---|---|---|---|---|
| Espada larga (Longsword), Agilidad, Cuerpo a cuerpo, 2 manos | d10+3 | d10+6 | d10+9 | d10+12 |
| Espada corta (Shortsword), secundaria. *Paired*: daño extra a la primaria | d8 (+2) | d8+2 (+3) | d8+4 (+4) | SIN VERIFICAR |
| Escudo redondo (Round Shield), secundaria. *Protective*: + Armor Score | d4 (+1) | d4+2 (+2) | d4+4 (+3) | SIN VERIFICAR |

Más ejemplos:

- **Tier 1:**
  - Bastón mayor (Greatstaff): Conocimiento, Muy lejano, d6 mágico, *Powerful*.
  - Estoque (Rapier): Presencia, Cuerpo a cuerpo, d8. *Quick*: 1 Estrés para atacar a otro objetivo.
- **Tier 3:**
  - Hacha de Fortunis (Axe of Fortunis): d10+8 mágico, *Lucky*.
  - Orbe de mago (Mage Orb): d6+7 mágico.

La errata de 2025 corrigió el daño de **Lanza (Spear)**, **Espada larga (Longsword)** y **Anillos brillantes (Glowing Rings)**. Las hojas de mayo de 2025 traen la Espada larga con d8+3; el valor vigente es **d10+3**.

### 8.2 Armaduras (Armor): estructura de datos

| Campo | Valores |
|---|---|
| `name`, `tier` | — |
| `base_thresholds` | "Mayor / Grave", por ejemplo `6 / 13`. A la hoja se le suma el nivel |
| `base_score` | Las casillas de armadura que da |
| `feature` | Opcional, por ejemplo Flexible +1 Evasión, Heavy −1 Evasión, Very Heavy −2 Evasión y −1 Agilidad |

El núcleo tiene **34 armaduras**.

| Tier | Ejemplo | Umbrales base | Puntuación |
|---|---|---|---|
| 1 | Gambesón (Gambeson Armor), Flexible | 5 / 11 | 3 |
| 1 | Cuero (Leather Armor) | 6 / 13 | 3 |
| 1 | Cota de malla (Chainmail Armor), Heavy | 7 / 15 | 4 |
| 1 | Placas completas (Full Plate Armor), Very Heavy | 8 / 17 | 4 |
| 2 | Cuero mejorado (Improved Leather) | 9 / 20 | 4 |
| 2 | Rosewild Armor, *Hopeful* | 11 / 23 | 5 |
| 3 | Gambesón avanzado (Advanced Gambeson) | 9 / 23 | 5 |
| 4 | Placas legendarias (Legendary Full Plate) | 17 / 44 | 7 |
| 4 | Savior Chainmail, *Difficult*: −1 a todos los rasgos y a la Evasión | 18 / 48 | 8 |

**Reducir daño:** marcas 1 Casilla de armadura para bajar el daño un umbral: Grave → Mayor → Menor → nada. Full Fortified Armor baja dos umbrales.

### 8.3 Botín (Loot) y consumibles (Consumables)

**Objetos (Items):** son reutilizables. Hay **60**, numerados del 01 al 60. Ejemplos: Premium Bedroll y Gem of Might (atacar con Fuerza usando cualquier arma).

**Consumibles (Consumables):** se usan una sola vez. Hay **60**, del 01 al 60. Puedes llevar **máximo 5 de cada uno**. Ejemplos: Stride Potion, Minor Health Potion (1d4 HP) y Minor Stamina Potion (1d4 Estrés).

Para generar botín al azar se tira según la rareza y se busca el resultado en la tabla:

| Rareza | Dados |
|---|---|
| Común (Common) | 1d12 o 2d12 |
| Poco común (Uncommon) | 2d12 o 3d12 |
| Raro (Rare) | 3d12 o 4d12 |
| Legendario (Legendary) | 4d12 o 5d12 |

Estructura en los datos: `{roll, name, description}`.

**Silla de ruedas de combate (Combat Wheelchair):** el SRD incluye este equipo con modelos Light, Heavy y Arcane Frame, que funcionan como armas primarias.

---

## 9. Rangos (Ranges)

| Rango | Distancia en ficción | Mapa (1" = 1.5 m / 5 ft) | Rejilla opcional |
|---|---|---|---|
| Cuerpo a cuerpo (Melee) | Al alcance de la mano | — | 1 casilla |
| Muy cercano (Very Close) | ~1.5–3 m (5–10 ft) | Lado corto de una carta (2–3") | 3 casillas |
| Cercano (Close) | ~3–9 m (10–30 ft) | Un lápiz (5–6") | 6 casillas |
| Lejano (Far) | ~9–30 m (30–100 ft) | Lado largo de una hoja carta (11–12") | 12 casillas |
| Muy lejano (Very Far) | ~30–90 m (100–300 ft) | Más allá de Lejano, dentro de la escena | 13+ casillas |
| Fuera de rango (Out of Range) | Más allá de Muy lejano | Fuera del mapa | — |

Reglas que acompañan a los rangos:

- El rango indicado es un **máximo**; se puede usar a menor distancia.
- Se mide desde la fuente del efecto.
- **Moverse en peligro:**
  - Desde Muy cercano o Cercano puedes llegar a Cuerpo a cuerpo como parte de tu acción.
  - Desde Lejano o Muy lejano necesitas una tirada de Agilidad.

---

## 10. Descanso: lo que mueve recursos en la hoja

- Cada PJ hace **2 movimientos** por descanso, y puede repetir el mismo.
- **Tres descansos cortos seguidos obligan a que el siguiente sea largo.**

**Descanso corto:**

- Tend to Wounds: 1d4+tier HP.
- Clear Stress: 1d4+tier Estrés.
- Repair Armor: 1d4+tier casillas de armadura.
- Prepare: +1 Esperanza, o +2 si se hace en grupo.

**Descanso largo:**

- Limpiar todos los HP.
- Limpiar todo el Estrés.
- Reparar toda la armadura.
- Prepare.
- Work on a Project: avanza una cuenta regresiva (countdown).

Al terminar un descanso se renuevan los usos "por descanso". Los usos "por descanso largo" solo se renuevan con un descanso largo.

---

## 11. Datos legibles por máquina (para importar en la app)

### seansbox/daggerheart-srd

Es la mejor opción encontrada: https://github.com/seansbox/daggerheart-srd

- **Contenido:** el SRD 1.0 del 9 de septiembre de 2025, en Markdown (un archivo por entidad) y en **JSON**, en `.build/03_json/`.
- **Archivos JSON:** `classes`, `subclasses`, `ancestries`, `communities`, `domains`, `abilities` (las cartas), `weapons`, `armor`, `items`, `consumables`, `beastforms`, `adversaries`, `environments`. También hay CSV en `.build/02_csv/`.
- **Cantidades verificadas:**

| Archivo | Registros |
|---|---|
| classes | 9 |
| subclasses | 18 |
| ancestries | 18 |
| domains | 9 |
| abilities | 189 |
| weapons | 192 |
| armor | 34 |
| items | 60 |
| consumables | 60 |

- **Esquema (verificado):**
  - Cartas: `{domain, level, name, recall, text, type}`.
  - Armas: `{name, tier, primary_or_secondary, physical_or_magical, trait, range, damage, burden, feature[{name,text}]}`.
  - Armaduras: `{name, tier, base_thresholds:"5 / 11", base_score, feature[]}`.
  - Clases: `{name, domain_1, domain_2, evasion, hp, items, hope_feature_name, hope_feature_text, feature, subclass_1, subclass_2, suggested_traits, suggested_primary, suggested_secondary, suggested_armor, background[], connection[]}`.
  - Dominios: `card` es una matriz por nivel.
- **Detalles técnicos para el importador:**
  - Los JSON traen **BOM UTF-8**: hay que leerlos con `utf-8-sig`.
  - Los números vienen como *strings* (`"level": "1"`).
  - Los textos traen Markdown (`**negritas**`, `_cursiva_`).
- **Licencia:** no tiene una licencia de código como MIT. El archivo LICENSE dice que el material se publica bajo la **Darrington Press Community Gaming License (DPCGL)**, con "modificaciones menores de formato".
- **Limitación:** **no incluye SRD 2.0** (*Hope & Fear*).
- Sitio de consulta: https://seansbox.github.io/daggerheart-srd/

### Licencia del contenido (DPCGL)

El SRD completo, incluido el marco de campaña Witherwild, es "Public Game Content" bajo la DPCGL. Esa licencia permite crear y compartir contenido "Daggerheart Compatible", también comercial.

Lo que hay que hacer para usarlo:

- Poner el aviso de copyright de Critical Role, LLC.
- Aclarar que el proyecto no está afiliado a Critical Role ni a Darrington Press.
- No usar las marcas fuera de lo que permite el logo "Daggerheart Compatible".

Los términos exactos están en https://darringtonpress.com/license y **conviene leerlos antes de publicar la app**. Los detalles finos de la licencia están **SIN VERIFICAR**.

### Otros recursos

Todos **SIN VERIFICAR**; no los revisé a fondo:

- **katari.fyi** (tangled.org/lesbian.skin/katari): "utilidades para el SRD".
- Fantasy Grounds y LegendKeeper publican el SRD navegable, pero no como dataset abierto.
- El sistema comunitario de Foundry VTT para Daggerheart incluye compendios en JSON; desconozco su licencia exacta.

### Recomendación

Importar desde `seansbox/.build/03_json` para el núcleo (SRD 1.0 con la errata de 2025). Después agregar a mano lo de SRD 2.0, cotejándolo con el PDF oficial `DH_SRD_2_2026_08_25.pdf`:

- 4 clases.
- El dominio Dread y sus cartas.
- 6 ancestrías y 6 comunidades.
- La errata nueva.

Antes de eso, revisar si el repo publica una actualización a 2.0. Su último commit es de enero de 2026.

---

## Fuentes

- SRD oficial (página de descarga y changelogs): https://www.daggerheart.com/srd/
- SRD 2.0 en PDF (25 de agosto de 2026): https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf
- Hojas y guías de personaje oficiales (20 de mayo de 2025): https://www.daggerheart.com/wp-content/uploads/2025/05/DH-Character-Sheets_and_Guides-05-20-2025.pdf
- Hojas de *Hope & Fear* (julio de 2026): https://www.daggerheart.com/wp-content/uploads/2026/08/CharacterGuidesAndSheetsTile_HF_2026-07-23.pdf
- Licencia DPCGL: https://darringtonpress.com/license
- Transcripción del SRD 1.0 (Markdown y JSON): https://github.com/seansbox/daggerheart-srd y https://seansbox.github.io/daggerheart-srd/
- Reglas de subida de nivel (espejo comunitario): https://daggerheart.org/core-mechanics/leveling-up
- Lista de clases y subclases, incluidas las de *Hope & Fear*: https://dungeonmister.com/daggerheart/all-classes-subclasses-in-daggerheart/
- Reseña de *Hope & Fear*: https://www.wargamer.com/daggerheart/hope-and-fear-review
