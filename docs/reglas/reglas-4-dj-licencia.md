# Daggerheart: lado del DJ, licencia y herramientas digitales

Investigación para el **panel del DJ** de una app digital. Todo está parafraseado. Las reglas de juego se tomaron del texto del **SRD 1.0 (versión del 9 de septiembre de 2025)**, que se leyó completo en una copia en Markdown. El **SRD 2.0 (25 de agosto de 2026)** es la versión vigente. Su registro de cambios no menciona cambios en Miedo, movimientos del DJ, tipos de adversario, puntos de batalla ni entornos. Sí dice que se **reescribió la redacción del foco (spotlight) para hacerla más clara** y que se agregó el contenido de *Hope & Fear*. Si una cifra exacta es crítica para la app, conviene compararla con el PDF 2.0.

Leyenda: **[SRD]** = leído directo en el texto oficial. **SIN VERIFICAR** = no se pudo confirmar en una fuente primaria.

---

## 1. Mecánicas del DJ

### 1.1 Dados del DJ
- El DJ **no usa Dados de Dualidad**. Tira un solo **d20** (el "Dado del DJ"). [SRD]
- **Ataque de adversario:** d20 + modificador de ataque del adversario contra la **Evasión** del PJ. Si iguala o supera, acierta y se tira el daño. [SRD]
- **20 natural en un ataque:** acierta automáticamente y es crítico. Se tira el daño normal y se le **suma el valor máximo de los dados de daño**, sin duplicar el modificador fijo. Ejemplo: 3d6+2 en crítico = 18 + 3d6 + 2. En una *tirada de reacción* del adversario, el 20 natural solo garantiza el éxito, sin bonus. [SRD]
- **Ventaja o desventaja del adversario:** se tira un d20 extra y se toma el mayor (ventaja) o el menor (desventaja). [SRD]
- **Ataque contra varios objetivos:** una sola tirada que se compara con la Evasión de cada objetivo. [SRD]
- Por defecto, los adversarios **no hacen tiradas de acción**: lo que intentan simplemente ocurre, o se les pide a los PJ una tirada de reacción. Para algo muy dramático, el DJ puede tirar d20 contra una Dificultad. [SRD]

### 1.2 Miedo (Fear)
| Regla | Valor | Fuente |
|---|---|---|
| Máximo de Miedo | **12** | [SRD] |
| Miedo inicial | **1 por cada PJ al iniciar la campaña** (el SRD dice "campaña", no "sesión") | [SRD] |
| ¿Se conserva entre sesiones? | **Sí** | [SRD] |

> Nota para la app: el SRD 1.0 no tiene una regla de "Miedo al empezar cada sesión". El contador se arrastra de una sesión a otra. Si el libro básico o el SRD 2.0 dicen otra cosa, queda **SIN VERIFICAR**.

**Cómo gana Miedo el DJ** [SRD]:
1. Cada vez que un PJ tira **con Miedo**, es decir, cuando el dado de Miedo sale más alto que el de Esperanza. Pasa tanto en éxito como en fallo. En un **crítico** (dados iguales) no gana: el crítico cuenta como "con Esperanza".
2. **Descanso corto:** el DJ gana **1d4** de Miedo.
3. **Descanso largo:** el DJ gana **1d4 + número de PJ** de Miedo y puede avanzar una cuenta regresiva de largo plazo.
4. **Tirada en equipo (Tag Team) con Miedo:** gana 1 de Miedo **por cada PJ involucrado**.
5. Cuando una habilidad o efecto lo indique. Por ejemplo, la reacción *Momentum* de algunos adversarios: "cuando acierta a un PJ, ganas un Miedo".

**En qué se gasta 1 de Miedo** [SRD]:
- **Interrumpir** a los jugadores para tomar el foco y hacer un movimiento.
- Hacer un **movimiento de DJ adicional**, por ejemplo poner el foco en otro adversario más en el mismo turno del DJ.
- Activar una **habilidad de Miedo** de un adversario.
- Activar una **habilidad de Miedo** de un entorno.
- **Sumar una Experiencia** del adversario a una tirada: a su ataque, o a la Dificultad de una tirada contra él.
- El costo de una habilidad de Miedo se paga **aparte** de lo que ya se gastó en interrumpir o en poner el foco.

**Cuánto Miedo gastar por escena** (guía del SRD):
| Tipo de escena | Ejemplos | Miedo sugerido |
|---|---|---|
| Incidental | plática entre PJ, juntar información, comprar, descansar | 0–1 |
| Menor | viaje, escaramuza menor | 1–3 |
| Estándar | batalla con objetivo, viaje peligroso, escena social tensa | 2–4 |
| Mayor | batalla con un Solo o un Líder, escena que define a un personaje | 4–8 |
| Climática | enfrentamiento con el villano del arco, gran batalla final | 6–12 |

Si el DJ acumula mucho Miedo, el SRD recomienda gastarlo **rápido** (antes de que reaccionen), **seguido** (cada vez que le llega el foco) y **en grande** (varios movimientos seguidos). También aconseja no acumularlo: "los jugadores siempre generan más".

### 1.3 Movimientos del DJ (GM moves)
- Un movimiento del DJ es cualquier cosa que el DJ hace para cambiar la historia en respuesta a los jugadores. Ocurre durante el **turno del DJ**, que empieza cuando el foco pasa al DJ y termina cuando regresa a los jugadores. [SRD]
- **Cuándo hacer un movimiento:** cuando un jugador tira con Miedo, falla una tirada, hace algo con consecuencias inevitables, le da al DJ una "oportunidad de oro" o voltea a ver al DJ para saber qué pasa. [SRD]
- **Movimiento suave (soft):** da información nueva y deja que los PJ reaccionen. **Movimiento duro (hard):** más directo, sin oportunidad de impedirlo ni anticiparlo. Regla general: **suaves con Esperanza, duros con Miedo.** [SRD]

**Respuesta según el resultado de la tirada** [SRD]:
| Resultado | Lema | Qué hace el DJ |
|---|---|---|
| Crítico | — | el jugador narra su éxito y el DJ le da una ventaja u oportunidad extra |
| Éxito con Esperanza | "Sí, y…" | el jugador narra y el DJ muestra cómo reacciona el mundo |
| Éxito con Miedo | "Sí, pero…" | el DJ toma 1 Miedo y hace un movimiento menor (ataca un adversario, el PJ marca Estrés, aparece una amenaza nueva o suben las apuestas) |
| Fallo con Esperanza | "No, pero…" | movimiento menor, y el foco pasa al DJ |
| Fallo con Miedo | "No, y…" | movimiento mayor (peligro inmediato, varios adversarios contra él, separarlo del grupo, pierde una oportunidad para siempre) y el DJ gana 1 Miedo |

**Lista de movimientos de ejemplo** (útil como menú en la app) [SRD]: mostrar cómo reacciona el mundo · hacer una pregunta y construir sobre la respuesta · hacer que un PNJ actúe según su motivo · tentar a un PJ con sus metas · anunciar una amenaza que todavía no está en escena · revelar una verdad incómoda o un peligro inesperado · obligar al grupo a separarse · hacer que un PJ marque Estrés · hacer algo que los personajes no ven · mostrar el daño colateral · quitarle una condición a un adversario · cambiar el entorno · poner el foco en un adversario · capturar a alguien o algo importante · usar el trasfondo de un PJ en su contra · quitar una oportunidad para siempre.

### 1.4 Foco (spotlight) y economía de acciones
- **No hay iniciativa** ni número fijo de acciones. El foco pasa a quien la ficción señale, a quien no ha participado en un rato, o a donde lo mande una mecánica. Por ejemplo, un fallo manda el foco al DJ. [SRD]
- **Cuando un adversario tiene el foco, puede** [SRD]:
  - moverse dentro de rango Cercano y hacer su ataque estándar;
  - moverse dentro de rango Cercano y usar una acción;
  - quitarse una condición;
  - correr a rango Lejano o Muy lejano;
  - hacer cualquier otra cosa que pida la ficción.
- Para poner el foco en **más adversarios**, el DJ gasta **1 Miedo por cada uno** adicional. Después el foco regresa a los PJ. [SRD]
- **Rastreador de foco opcional:** cada jugador empieza la escena con fichas (se recomiendan 3) y gasta una por acción. Si al que le tocaría el foco no le quedan fichas, el foco pasa a otro. Cuando todos se quedan sin fichas, se rellenan. [SRD]
- **SIN VERIFICAR:** el SRD 2.0 dice que reescribió esta sección "para mayor claridad". No se pudo leer el texto nuevo.

### 1.5 Cuentas regresivas (countdowns)
Sirven para mostrar en el panel cuánto falta para que pase algo. [SRD]
- **Estándar:** baja 1 en cada tirada de acción de un jugador. "Countdown (n)" significa que empieza en n.
- **Dinámicas:** bajan según el resultado de la tirada:

| Resultado | Cuenta de progreso | Cuenta de consecuencia |
|---|---|---|
| Fallo con Miedo | 0 | −3 |
| Fallo con Esperanza | 0 | −2 |
| Éxito con Miedo | −1 | −1 |
| Éxito con Esperanza | −2 | 0 |
| Crítico | −3 | 0 |

- **Variantes avanzadas:** valor inicial aleatorio · **bucle** (vuelve al inicio al dispararse) · **creciente o decreciente** (el inicio sube o baja 1 en cada vuelta) · **ligadas** (una de progreso y una de consecuencia avanzan con la misma tirada) · **de largo plazo** (avanzan con los descansos, no con las tiradas).

### 1.6 Otras mecánicas opcionales [SRD]
- **Tirada de destino:** un jugador tira solo su dado de Esperanza o de Miedo para dejar algo al azar.
- **Caídas:** desde Muy cerca, 1d10+3; desde Cerca, 1d20+5; desde Lejos o Muy lejos, 1d100+15 o la muerte. Una colisión hace 1d20+5 de daño directo.
- **Bajo el agua:** los ataques tienen desventaja. Aguantar la respiración es una cuenta regresiva de 3.

---

## 2. Adversarios

### 2.1 Campos del bloque de estadísticas (en orden) [SRD]
| Campo | Qué es | Ejemplo de formato |
|---|---|---|
| **Nombre** | Único. Las habilidades que afectan a "X" afectan a todo lo que use ese bloque. | Oso |
| **Nivel (Tier)** | 1–4, el nivel de PJ para el que está diseñado | Tier 1 |
| **Tipo** | su papel en el combate (ver 2.2) | Bruiser |
| **Descripción** | aspecto y actitud, en una línea | — |
| **Motivos y tácticas** | impulsos, acciones y metas sugeridas | Trepar, defender territorio… |
| **Dificultad** | número a superar en cualquier tirada contra él | 14 |
| **Umbrales** | **Mayor/Grave** ("None" en los Esbirros) | 9/17 |
| **PV (HP)** | puntos de vida | 7 |
| **Estrés** | se lleva aparte para cada adversario | 2 |
| **ATK** | modificador de ataque | +1 |
| **Ataque estándar** | nombre, **rango**, **daño** y tipo (`phy` físico / `mag` mágico). Usarlo cuenta como movimiento del DJ. | Garras: Cuerpo a cuerpo · 1d8+3 phy |
| **Experiencia** (opcional) | nombre y bono. Cuesta 1 Miedo sumarla. | Emboscador +3, Sentidos agudos +2 |
| **Habilidades** | cada una marcada como **Acción**, **Reacción** o **Pasiva**. Algunas son "de Miedo". | — |

**Tres clases de habilidad** [SRD]:
- **Acción:** solo se usa cuando el adversario tiene el foco.
- **Reacción:** se dispara con su detonante, tenga o no el foco.
- **Pasiva:** siempre está activa y no cuesta nada.
- Si una habilidad pide **marcar Estrés**, el Estrés sale de ese mismo adversario. Si pide **Miedo**, se paga aparte de lo gastado para darle el foco.

**Formato de daño:** "1d8+3 phy". En el texto de las reglas también existe el **daño directo**, que no se puede reducir con armadura. Algunos adversarios tienen **resistencia** a cierto tipo de daño (por ejemplo *Arcane Form*: resistente a daño mágico).

**Valores de referencia por nivel** [SRD]:
| | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|
| Modificador de ataque | +1 | +2 | +3 | +4 |
| Dados de daño | 1d6+2 a 1d12+4 | 2d6+3 a 2d12+4 | 3d8+3 a 3d12+5 | 4d8+10 a 4d12+15 |
| Dificultad | 11 | 14 | 17 | 20 |
| Umbrales | 7/12 | 10/20 | 20/32 | 25/45 |

**Adversario derrotado:** queda así cuando marca su último PV. Puede quedar incapacitado, amarrado, huir o morir, lo que la mesa decida. [SRD]

### 2.2 Tipos de adversario [SRD]
| Tipo (inglés) | Papel |
|---|---|
| **Bruiser** (Rompehuesos) | aguanta mucho y pega muy fuerte |
| **Horde** (Horda) | un grupo de criaturas idénticas que actúan como una sola unidad |
| **Leader** (Líder) | da órdenes a otros adversarios y los invoca |
| **Minion** (Esbirro) | cae fácil, pero es peligroso en grupo |
| **Ranged** (A distancia) | frágil de cerca, hace mucho daño de lejos |
| **Skulk** (Acechador) | se mueve para emboscar y aprovechar aperturas |
| **Social** | el reto es conversar, no pelear |
| **Solo** | un reto para todo el grupo, con o sin apoyo |
| **Standard** (Estándar) | el miembro típico de su grupo |
| **Support** (Apoyo) | mejora a sus aliados y estorba a los rivales |

> Las traducciones al español son sugerencias, no son oficiales. La decisión de vocabulario en la app es tuya.

### 2.3 Reglas de Esbirros (Minion) y Hordas (Horde) [SRD]
- **Minion (X) – Pasiva:** el esbirro cae con **cualquier cantidad de daño**. Además, **por cada X de daño** que un PJ le haga, cae **otro esbirro** que esté dentro del alcance contra el que el ataque también habría acertado. Los esbirros tienen 1 PV, umbrales "None" y Dificultad baja.
  - Casi todos traen **Ataque grupal (Group Attack) – Acción:** se gasta 1 Miedo, se elige un objetivo y todos los esbirros de ese tipo que estén a rango Cercano reciben el foco a la vez. Se acercan, hacen **una sola tirada compartida** y, si aciertan, **se suma el daño de todos**.
- **Horde (X) – Pasiva:** cuando la Horda ya marcó **la mitad o más de sus PV**, su ataque estándar pasa a hacer **X** de daño (menor que el normal). En la línea de tipo aparece algo como "Horde (2/HP)", es decir, cuántas criaturas representa cada PV.
- **Otras pasivas comunes:**
  - **Relentless (X):** puede recibir el foco hasta X veces por turno del DJ, pagando el Miedo de siempre.
  - **Slow:** la primera vez que recibe el foco solo se prepara (se pone una ficha) y la siguiente vez actúa (se quita la ficha).

### 2.4 Construir encuentros: Puntos de Batalla [SRD]
**Presupuesto base = (3 × número de PJ en el combate) + 2**

Ajustes al presupuesto:
| Ajuste | Puntos |
|---|---|
| Pelea más fácil o más corta | −1 |
| Se usan 2 o más adversarios Solo | −2 |
| Se suma +1d4 (o +2 fijo) al daño de todos los adversarios | −2 |
| Se elige un adversario de un nivel más bajo | +1 |
| No hay ningún Bruiser, Horda, Líder ni Solo | +1 |
| Pelea más difícil o más larga | +2 |

Costo de cada adversario:
| Adversario | Costo |
|---|---|
| Grupo de Esbirros **del mismo tamaño que el grupo de PJ** | 1 |
| Social o Apoyo | 1 |
| Horda, A distancia, Acechador o Estándar | 2 |
| Líder | 3 |
| Bruiser | 4 |
| Solo | 5 |

*Ejemplo con 4 PJ:* (3×4)+2 = **14 puntos**. Se puede gastar en 1 Bruiser (4) + 1 Líder (3) + 2 Estándar (4) + 1 Apoyo (1) + 2 grupos de 4 Esbirros (2) = 14.

### 2.5 Dos adversarios de ejemplo (parafraseados del SRD)
**Oso: Nivel 1, Bruiser.** Un oso enorme de pelaje grueso y garras poderosas.
- Motivos: trepar, defender su territorio, aplastar, rastrear.
- Dificultad 14 · Umbrales 9/17 · PV 7 · Estrés 2.
- ATK +1 · Garras, Cuerpo a cuerpo, 1d8+3 físico.
- Experiencia: Emboscador +3, Sentidos agudos +2.
- *Fuerza abrumadora (Pasiva):* si su ataque estándar le quita PV a alguien, lo empuja hasta rango Muy cercano.
- *Mordida (Acción):* marca 1 Estrés y ataca cuerpo a cuerpo. Si acierta hace 3d4+10 físico y deja al objetivo **Inmovilizado** (Restrained) hasta que se libere con una tirada de Fuerza.
- *Impulso (Reacción):* cada vez que acierta a un PJ, el DJ gana 1 Miedo.

**Lacayo del Cuchillo Dentado: Nivel 1, Esbirro.** Un ladronzuelo con ropa sencilla y dagas pequeñas, con ganas de probarse.
- Motivos: escapar, sacar provecho, lanzar humo.
- Dificultad 9 · Umbrales: ninguno · PV 1 · Estrés 1.
- ATK −2 · Dagas, Cuerpo a cuerpo, 2 físico (daño fijo).
- Experiencia: Ladrón +2.
- *Esbirro (3):* cae con cualquier daño, y por cada 3 de daño cae otro lacayo al alcance.
- *Ataque grupal (Acción):* 1 Miedo, y todos los lacayos a rango Cercano del objetivo atacan juntos con una sola tirada. Hacen 2 de daño cada uno y se suma.

---

## 3. Entornos

### 3.1 Campos del bloque [SRD]
| Campo | Qué es |
|---|---|
| **Nombre** | único |
| **Nivel** | 1–4 |
| **Tipo** | **Exploración** (lugar con misterios) · **Social** (retos entre personas) · **Travesía** (moverse por el lugar ya es el reto) · **Evento** (algo que pasa, no un lugar) |
| **Descripción** | una línea evocadora |
| **Impulsos** | cómo empuja o atrae el lugar a quienes están en él |
| **Dificultad** | la Dificultad estándar para vencer, resistir u oponerse al entorno |
| **Adversarios posibles** | sugerencias agrupadas, por ejemplo "Bestias (Oso, Lobo terrible…)" |
| **Habilidades** | Acción, Reacción o Pasiva, a veces de Miedo. Sirven como inspiración para movimientos del DJ. |
| **Preguntas de habilidad** | preguntas en cursiva al final de cada habilidad, para ganchos de trama |

**Valores de referencia por nivel:**
| | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|
| Dados de daño | 1d6+1 a 1d8+3 | 2d6+3 a 2d10+2 | 3d8+3 a 3d10+1 | 4d8+3 a 4d10+10 |
| Dificultad | 11 | 14 | 17 | 20 |

Para cambiar un entorno de nivel basta con reemplazar sus números por los de la tabla. [SRD]

**Ejemplo, parafraseado:** *Arboleda abandonada*, Nivel 1, Exploración. Impulsos: atraer a los curiosos, hacer eco del pasado. Dificultad 11. Adversarios posibles: Bestias y Guardianes de la arboleda. Habilidades:
- *Campo de batalla cubierto de maleza* (Pasiva): con una tirada de Instinto se descubren pistas de una pelea antigua.
- *Enredaderas con púas* (Acción): pide tirada de reacción de Agilidad; si falla, 1d8+3 físico e Inmovilizado.
- *Aquí no eres bienvenido* (Acción): aparecen guardianes.
- *Profanador* (Acción de Miedo): invoca un elemental del caos menor que recibe el foco de inmediato.

---

## 4. Licencia: Darrington Press Community Gaming License (DPCGL)

Versión vigente: **DPCGL 2.0, del 26 de agosto de 2026**. También siguen publicadas las versiones del 30 de julio de 2025, el 26 de junio de 2025 y el 19 de mayo de 2025. El **SRD 2.0** es Contenido de Juego Público (Public Game Content), y el SRD 1.0 sigue disponible para obras existentes.

### 4.1 Lo que sí permite
- **Contenido Licenciado (§1.3):** reglas y mecánicas (no el texto copiado de los libros), sistemas, herramientas, tarjetas de referencia, **bloques de estadísticas**, y los nombres y atributos de personajes, lugares, monstruos, clases, subclases y ascendencias. El SRD trae además los **íconos de dominio**.
- Licencia mundial, **sin regalías**, no exclusiva e intransferible para producir, compartir **y vender** obras derivadas, **pero solo en los Formatos Permitidos** (§2.1).
- **Formatos Permitidos (§1.9):** impresos y digitales tipo libro (suplementos, manuales, libros, cartas); transmisiones y video (Twitch, YouTube, TikTok); podcasts; y **mesas virtuales (VTT) aprobadas**. **Quedan excluidos** expresamente el cine, la TV y los **videojuegos**.
- **VTT aprobadas** (lista publicada en la página de la licencia, vigente desde julio de 2025): **Roll20, Demiplane, Foundry, Alchemy, Fantasy Grounds**. En ellas el contenido solo se comparte **sin fines comerciales**: no se puede cobrar acceso, suscripción ni donativos ligados al acceso. Cualquier otra VTT necesita **aprobación por escrito** de Darrington Press.
- Según las preguntas frecuentes (actualización de julio de 2025), **el juego privado o personal no cuenta como compartir en público.**

### 4.2 Qué significa para una app propia de dados y panel del DJ
- La licencia **no menciona** apps, software ni sitios web. Una app web pública **no encaja con claridad** en ningún Formato Permitido, y lo más parecido (VTT) exige estar en la lista blanca o tener permiso por escrito.
- **Riesgo concreto:** si se publica abierta y con el texto del SRD (adversarios, entornos), queda fuera de lo que la licencia autoriza de forma explícita. En el peor caso, Darrington Press puede pedir que se retire, y la licencia termina automáticamente si no se cumple (§9.1).
- **Recomendación:**
  1. Para uso **privado del grupo** (con acceso cerrado y sin cobrar), el riesgo es bajo, porque el juego privado no se considera compartir en público.
  2. Para publicarla, **escribir a Darrington Press** pidiendo aprobación.
  3. Mecánicas genéricas como "2d12 con colores, sumar y comparar" no son texto protegido. Lo delicado es copiar el **texto de los bloques de estadísticas** y usar la **marca**.
  - Esta es una interpretación, no una asesoría legal.

### 4.3 Restricciones
- **Contenido Prohibido (§1.5):** marcas, **logos**, **imagen comercial (trade dress)**, ilustraciones, arte, mapas, video y música, **el texto exacto** de manuales y libros, los **Campaign Frames** (salvo en transmisiones de partidas reales) y el contenido publicado por DRP que no esté designado como público.
- **Nombre "Daggerheart" (§2.5):** **no puede ir en el título** de la obra ni en el título de un capítulo, **no puede ir en la portada**, y en textos descriptivos o de mercadotecnia debe ir junto a la palabra **"Compatible"** ("Daggerheart™ Compatible"). No se puede presentar como oficial ni respaldado por Darrington Press o Critical Role.
- **Material de prueba (playtest, "The Void"):** no se puede usar en nada comercial (§1.9.2).
- No se le deben pagos ni regalías a Darrington Press si se cumple la licencia.

### 4.4 Atribución obligatoria (texto exacto, §4.1, bloque de Daggerheart)
> Copyright/Attribution:
> Daggerheart
> This product includes materials from the Daggerheart System Reference Document 2.0, © Critical Role, LLC. under the terms of the Darrington Press Community Gaming (DPCGL) License. More information can be found at https://www.daggerheart.com. There are no previous modifications by others.

- Si la obra se basa en el **SRD 1.0**, el texto equivalente dice "Daggerheart System Reference Document 1.0". Es lo que usa Foundryborne en Foundry.
- **Aviso general de copyright (§4.3):** "This product includes materials from the [nombre del Contenido de Juego Público] © Critical Role, LLC. All rights reserved."
- **Solo si es comercial (§4.2):**
  - En la portada va el **logo de Contenido Comunitario de Darrington Press**. Para Daggerheart es el de la **botella de alquimia**, y se descarga en darringtonpress.com/license (ZIP de logos).
  - En la página de título: "Darrington Press™ and the Darrington Press authorized work logo are trademarks of Critical Role, LLC and used with permission."
  - Las cartas y los adversarios hechos con el creador de daggerheart.com llevan: "Daggerheart™ Compatible. Terms at Daggerheart.com".
- **Audio o video (§4.2 g):** la atribución tiene que verse el tiempo suficiente para leerla completa.
- La licencia **no tiene cláusulas sobre IA.**

---

## 5. Herramientas digitales existentes (como inspiración)

### 5.1 Oficiales o con licencia
- **Demiplane, "Daggerheart Nexus"** (socio oficial, funciona en el navegador de escritorio, tableta y celular):
  - Gratis: **constructor de personajes**, hoja digital con exportación a PDF y compendio de reglas enlazado con tooltips.
  - De pago: libros digitales y una suscripción para compartir contenido con hasta 24 personas.
  - Herramientas de **Adversarios y Entornos** en beta, con hojas editables y tiradas.
  - Se conecta con **Roll20**: hojas enlazadas, folletos y PNJ.
  - Trae los Campaign Frames y los materiales de "The Void".
  - Las notas revisadas no mencionan un rastreador de Miedo propio de Demiplane. En Roll20 la comunidad lo resuelve con macros (**SIN VERIFICAR** si ya lo agregaron).
- **Pantalla del DJ oficial con rastreador de Miedo físico:** se anunció en PAX Unplugged 2025 para 2026. Tiene piezas en forma de d12 que se deslizan como ábaco para marcar el Miedo. Es una buena idea visual para el panel.
- **Creador de daggerheart.com** para cartas y adversarios: la licencia lo menciona (§4.2 f iii). **SIN VERIFICAR** qué hace exactamente.

### 5.2 Foundry VTT: sistema "Daggerheart" de Foundryborne
- Se presenta como el **sistema oficial** para Foundry. El código está bajo **MIT** y el contenido bajo DPCGL (SRD 1.0).
- Funciones:
  - tiradas de Dualidad con **Dice So Nice** personalizable;
  - **modo encuentro** que lleva el foco y las **solicitudes de foco**;
  - cuentas regresivas narrativas y de encuentro, manuales o automáticas;
  - automatización de daño, curación y efectos;
  - subida de nivel y Beastform;
  - opciones caseras configurables, como **el máximo de Miedo**, tipos de adversario y monedas.
- Versión 2.10.x, para Foundry 14.
- **Módulos de la comunidad:**
  - "Daggerheart: Fear Tracker": barra de Miedo con temas (piedra, piedra roja o imagen propia), fichas que brillan y "respiran", la barra **tiembla** cuando sube el Miedo, posición arrastrable y visibilidad configurable para los jugadores.
  - También hay "Daggerheart Stats" y macros de recursos.

### 5.3 Apps de fans
- **Heartforge** (iOS, gratis con Premium de USD 2.99 al mes / 22.99 al año / 38.99 de por vida; no es oficial):
  - dados de Esperanza y Miedo con aviso de crítico;
  - **rastreador de Miedo**;
  - hojas de personaje con subida de nivel guiada;
  - para el DJ: organizar aventuras y **seguir PV, Estrés y Miedo en los encuentros**, más un compendio del SRD 2.0;
  - música y sonidos;
  - **los jugadores se unen con un código** y su hoja se sincroniza;
  - funciona sin conexión.

**Lo que más valoran los grupos** (síntesis de las herramientas anteriores):
1. un **contador de Miedo grande y visible para todos**, con animación cuando sube;
2. una tirada de Dualidad que **anuncie el resultado** ("15 con Miedo", "¡Crítico!") y **sume el Miedo sola**;
3. PV y Estrés de cada adversario en un **tracker de encuentro**;
4. cuentas regresivas visibles;
5. control del foco o de las solicitudes de foco;
6. sincronización entre jugadores y DJ;
7. un compendio con búsqueda.

### 5.4 Librerías de dados 3D para web

| | **@3d-dice/dice-box** | **@3d-dice/dice-box-threejs** | **Dice So Nice** |
|---|---|---|---|
| Licencia | **MIT** | **MIT** | **AGPL-3.0** (obliga a liberar el código si se usa en un servicio en red) |
| Motor | BabylonJS + **AmmoJS** (física), en web worker con OffscreenCanvas | three.js + cannon (derivado de Teall Dice) | three.js + física, **módulo de Foundry** |
| Versión | 1.1.4 en npm (último commit en GitHub: oct 2024) | 0.0.12 (2022, poco mantenido) | activo en GitLab |
| d12 | **Sí**: el tema por defecto trae d4, d6, d8, d10, d12, d20 y d100 (revisado en `theme.config.json`) | Sí | Sí |
| Color por dado | **Sí**: `themeColor` se puede pasar por tirada o **dentro de cada objeto de la tirada** (revisado en el código, `notation.themeColor`). Así se puede tirar `[{qty:1,sides:12,themeColor:'#e8b923'},{qty:1,sides:12,themeColor:'#5b2a86'}]` y tener el d12 de Esperanza dorado y el de Miedo morado en la misma tirada. | Sí, con colorsets | Sí, con colorsets por usuario. El sistema de Foundryborne trae colores de Dualidad configurables. |
| Cómo sale el resultado | **Por la física:** el número es la cara que queda arriba al detenerse. El punto de lanzamiento es aleatorio. Con `suspendSimulation:true` o sin WebGL usa un **RNG con `crypto.getRandomValues`**. **No permite fijar el resultado de antemano.** | **Permite resultados predeterminados**: `"2d12@7,3"` hace que caigan en 7 y 3. Así el servidor calcula y la animación solo lo muestra. | Anima un resultado **que Foundry ya calculó** (las caras se ajustan para que coincidan). **SIN VERIFICAR** en la fuente primaria. Solo funciona dentro de Foundry. |
| CDN | **Sí**: módulo ES desde **unpkg** (también se sirve en jsDelivr), fijando `assetPath:"assets/"` y `origin` a la URL `dist` de unpkg. Por CDN solo trae el set de dados por defecto. Los temas extra se cargan con `externalThemes`. | npm o unpkg | No (se instala dentro de Foundry) |

**Recomendación para la app:**
- **dice-box** si cada quien tira en su propio dispositivo y vale lo que muestra la física. Es MIT y tiene colores por dado.
- Si la tirada debe ser **la misma para todos los jugadores en tiempo real** (multijugador), conviene **calcular el resultado en un lugar** (servidor o el cliente del que tira, con `crypto.getRandomValues`) y **animarlo** en los demás. dice-box no puede forzar caras, así que hay dos opciones:
  - dice-box-threejs con `@`, que permite predeterminar pero está poco mantenido;
  - mostrar el número calculado y usar dice-box solo como animación decorativa.
- **No se recomienda Dice So Nice** fuera de Foundry, por la licencia AGPL y porque depende de Foundry.

---

## Fuentes
- SRD oficial de Daggerheart (página, versión 2.0 y registro de cambios): https://www.daggerheart.com/srd/
- PDF del SRD 2.0 (25 de agosto de 2026): https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf
- Texto completo del SRD 1.0 (9 de septiembre de 2025) en Markdown, la copia que se leyó (contiene el aviso oficial de Contenido de Juego Público): https://github.com/seansbox/daggerheart-srd (sitio: https://seansbox.github.io/daggerheart-srd/)
- Página de la licencia y sus preguntas frecuentes: https://darringtonpress.com/license
- DPCGL 2.0 (PDF): https://darringtonpress.com/wp-content/uploads/2026/08/DPCGL_2.0_AUG_26_2026.pdf
- DPCGL del 30 de julio de 2025: https://darringtonpress.com/wp-content/uploads/2025/07/DPCGL-July-30th-2025.pdf
- Logos de Contenido Comunitario: https://darringtonpress.com/wp-content/uploads/2025/05/Darrington-Press-Community-Content-Logos.zip
- Preguntas frecuentes de Demiplane Nexus: https://support.demiplane.com/hc/en-us/articles/25810842657687-Daggerheart-NEXUS-Frequently-Asked-Questions
- Demiplane, actualizaciones de VTT: https://www.demiplane.com/blog/the-magic-of-daggerheart-vtt-updates
- Pantalla oficial con rastreador de Miedo (Popverse): https://www.thepopverse.com/gaming-critical-role-daggerheart-gm-fear-tracker-pax-unplugged-2025/
- Sistema para Foundry: https://foundryvtt.com/packages/daggerheart · https://github.com/Foundryborne/daggerheart
- Módulo Fear Tracker para Foundry: https://foundryvtt.com/packages/daggerheart-fear-tracker
- Heartforge (App Store): https://apps.apple.com/app/id6749210068
- dice-box: https://github.com/3d-dice/dice-box · documentación: https://fantasticdice.games/docs/usage/config · https://fantasticdice.games/docs/usage/methods
- dice-box-threejs (resultados predeterminados): https://github.com/3d-dice/dice-box-threejs
- Dice So Nice: https://gitlab.com/riccisi/foundryvtt-dice-so-nice
