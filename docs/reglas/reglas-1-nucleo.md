# Daggerheart — Reglas núcleo de resolución (referencia para app de dados)

Fuente principal: SRD oficial de Darrington Press. El texto de reglas que se revisó línea por línea es el **SRD 1.0** (2025, con las correcciones de jul. y sep. 2025). El **SRD 2.0** (25/08/2026) es la versión vigente; su registro de cambios dice que **reescribió** Ventaja/Desventaja, la resolución de la tirada de acción y el foco (spotlight). Las páginas de mecánicas del PDF 2.0 no se pudieron extraer, así que lo que cambia en 2.0 se marca aparte.

Convenciones de este documento:
- **[SRD 1.0]**: verificado en el texto del SRD 1.0.
- **[2.0, secundario]**: lo describen fuentes de terceros que dicen basarse en el SRD 2.0; no se leyó en el PDF oficial 2.0.
- **SIN VERIFICAR**: no se encontró en fuente oficial.

---

## 1. Tirada de acción (Action Roll)

### 1.1 Dados de Dualidad (Duality Dice)
- Son **2d12** que se distinguen a simple vista: uno es el **Dado de Esperanza (Hope Die)** y el otro el **Dado de Miedo (Fear Die)**. [SRD 1.0]
- Solo se tira cuando el resultado es incierto y fallar tendría consecuencias. Si fallar sería aburrido o el éxito es trivial, la acción sale bien sin tirar. [SRD 1.0]

### 1.2 Cálculo del total
```
Total = Dado de Esperanza + Dado de Miedo
      + modificador del Rasgo (Trait)
      + Experiencias usadas (cada una cuesta 1 Esperanza)
      + dado de Ventaja (d6) o − dado de Desventaja (d6)
      + mejor dado de Ayudar a un Aliado (d6), si alguien ayudó
      + otros bonos (Rally dice, rasgos, objetos, etc.)
```
- **Rasgos (Traits)**: Agilidad (Agility), Fuerza (Strength), Destreza/Finura (Finesse), Instinto (Instinct), Presencia (Presence) y Conocimiento (Knowledge). En la creación del personaje se reparten los valores **+2, +1, +1, +0, +0, −1**. [SRD 1.0]
- Las Experiencias, los dados extra y los modificadores **se declaran antes de tirar**, salvo que un rasgo diga otra cosa. [SRD 1.0]
- Así se anuncia el resultado: «**[total] con Esperanza**», «**[total] con Miedo**» o «**¡Crítico!**». Ejemplo oficial: rasgo +1, Esperanza 5 y Miedo 7 dan «13 con Miedo». [SRD 1.0]

### 1.3 Dificultad (Difficulty)
- Puede venir en el texto del efecto, con el formato «Tirada de [Rasgo] (Dificultad)», por ejemplo «Tirada de Agilidad (12)». Si no viene, la pone el DJ (GM), que decide si la dice o no. [SRD 1.0]
- **Éxito** si el total **es igual o mayor** que la Dificultad. **Fallo** si es menor. [SRD 1.0]
- Tabla de ejemplo del SRD (guía del DJ, rasgo Conocimiento): Dificultades **5, 10, 15, 20 y 25**. Ejemplo: 20 = «recordar datos especializados de una comunidad lejana». No es un tope; la Dificultad es cualquier entero. [SRD 1.0]

### 1.4 Resultados (la app tiene que distinguir los 5 casos)
| Condición | Resultado | Efecto mecánico |
|---|---|---|
| Esperanza = Miedo (dados iguales) | **Éxito Crítico (Critical Success)** | Éxito automático con bonificación, **+1 Esperanza**, **despeja 1 Estrés (clear a Stress)**. Si era tirada de ataque: **daño crítico**. Cuenta como tirada «con Esperanza». |
| total ≥ Dif. y Esperanza > Miedo | **Éxito con Esperanza** | Éxito; el jugador gana **+1 Esperanza**. |
| total ≥ Dif. y Miedo > Esperanza | **Éxito con Miedo** | Éxito con costo o complicación; el DJ gana **+1 Miedo**. |
| total < Dif. y Esperanza > Miedo | **Fallo con Esperanza** | Fallo con consecuencia menor; el jugador gana **+1 Esperanza**; el foco pasa al DJ. |
| total < Dif. y Miedo > Esperanza | **Fallo con Miedo** | Fallo con consecuencia mayor; el DJ gana **+1 Miedo**; el foco pasa al DJ. |

Notas para la app:
- El crítico **ignora la Dificultad**: dados iguales siempre son éxito, aunque el total no llegue (por ejemplo 1+1 con modificadores negativos). Se evalúa **antes** que la comparación con la Dificultad. [SRD 1.0]
- «Con Esperanza / con Miedo» depende **solo de los dos d12**. Los modificadores y el d6 de ventaja no cuentan para eso. [SRD 1.0]
- Si no hay Dificultad, la app puede mostrar solo «X con Esperanza/Miedo» (así lo hacen las herramientas de terceros).
- Atajo narrativo del SRD: Éxito con Esperanza = «Sí, y…», Éxito con Miedo = «Sí, pero…», Fallo con Esperanza = «No, pero…», Fallo con Miedo = «No, y…». [SRD 1.0]
- **SRD 2.0**: su registro de cambios dice que se reescribió la sección «resolución de la tirada de acción» para que quedara más clara. Ninguna fuente secundaria reporta cambios en los números de esta tabla. **SIN VERIFICAR** en el PDF 2.0.

---

## 2. Esperanza (Hope) y Miedo (Fear)

### 2.1 Esperanza (Hope)
- Cada personaje jugador (PJ) **empieza con 2 Esperanza**. El **máximo es 6** al mismo tiempo. Se conserva entre sesiones. [SRD 1.0]
- **Se gana**: con cualquier tirada de acción «con Esperanza» (incluido el crítico), +1. También en Tag Team, ver §4.3. [SRD 1.0]
- **Se gasta en**:
  - **Usar una Experiencia (Utilize an Experience)**: **1 Esperanza** por Experiencia. Se suma su modificador a una tirada de **acción o de reacción**. Se pueden usar varias pagando 1 por cada una. [SRD 1.0, corregido sep. 2025]
  - **Ayudar a un Aliado (Help an Ally)**: **1 Esperanza**. El que ayuda tira un dado de ventaja (d6) para el que actúa. Detalle en §3.2. [SRD 1.0]
  - **Tirada en Equipo (Tag Team Roll)**: **3 Esperanza**. [SRD 1.0]
  - **Rasgos de Esperanza (Hope Features)**: cuestan lo que diga cada uno. Los **rasgos de Esperanza de clase cuestan 3**. [SRD 1.0]
- La Esperanza que se gana en una tirada **se puede gastar en ese mismo momento** en un rasgo de Esperanza de esa acción. [SRD 1.0]
- Para la app: si una ganancia rebasa el máximo de 6, se queda en 6. (El SRD solo dice «máximo 6 a la vez»; que el excedente se pierda es la lectura directa de la regla.)

### 2.2 Miedo (Fear)
- El DJ **empieza la campaña con 1 Miedo por cada PJ**. [SRD 1.0; también lo mencionan fuentes secundarias de 2.0]
- **Máximo 12** al mismo tiempo. Se conserva entre sesiones. [SRD 1.0]
- **El DJ gana Miedo**:
  - +1 cada vez que un PJ tira «con Miedo» en una tirada de acción.
  - **Descanso corto**: +**1d4** Miedo. **Descanso largo**: +**1d4 + número de PJs**. [SRD 1.0]
  - Tag Team con Miedo: +1 por cada PJ que participó. [SRD 1.0]
  - Cuando un efecto lo indique.
- **El DJ gasta Miedo en**: interrumpir y tomar el foco, poner en foco a más adversarios, activar Rasgos de Miedo (Fear Features), sumar la Experiencia de un adversario (1 Miedo), terminar un efecto temporal de hechizo (1 Miedo) y hacer o reforzar una jugada del DJ. [SRD 1.0]
- El DJ **no tira Dados de Dualidad** y **no genera Esperanza ni Miedo** con sus propias tiradas. [SRD 1.0]

---

## 3. Ventaja y Desventaja (Advantage / Disadvantage)

### 3.1 Regla base [SRD 1.0]
- **Ventaja**: se tira **1d6 de ventaja** junto con los dados y **se suma** al total.
- **Desventaja**: se tira **1d6 de desventaja** y **se resta** del total.
- Se aplican a tiradas de **acción y de reacción** de los PJs. **No** se aplican a tiradas de daño (eso lo dicen herramientas de terceros; el SRD solo las nombra para acción/reacción).
- Se **cancelan una a una** dentro de la misma reserva de dados (dice pool). Nunca se tiran las dos a la vez.
- Los efectos de **otras fuentes que no están en tu reserva**, como el dado de Ayudar a un Aliado, **sí se acumulan** con lo que tú tires.
- El SRD recomienda al DJ dar ventaja o desventaja **en vez de** mover la Dificultad.

### 3.2 Cambio en SRD 2.0 [2.0, secundario — SIN VERIFICAR en el PDF oficial]
- Una tirada lleva **como máximo UN dado de ventaja o de desventaja**, sin importar cuántas fuentes haya. Primero se cancelan una a una y luego queda máximo 1 dado neto. Ejemplo que citan: 3 fuentes de ventaja + 1 de desventaja = **1 dado de ventaja**.
- **Excepción, Ayudar a un Aliado**: cada aliado paga 1 Esperanza y tira su propio d6. Si ayudan varios, **solo cuenta el resultado más alto** (no se suman). Esto ya venía en el SRD 1.0.
- Ayudar a un Aliado **no aplica a tiradas de reacción** [SRD 1.0].
- Lógica para la app con ambas versiones: `neto = fuentesVentaja − fuentesDesventaja` → si neto > 0 se tira 1d6 y se suma; si neto < 0 se tira 1d6 y se resta; con 0 no se tira nada. Luego se suma `max(d6 de cada ayudante)`. En 1.0 el SRD no limita explícitamente varias ventajas netas en la misma reserva; esa ambigüedad la quita 2.0 con el tope de 1.

### 3.3 Dados de ventaja de otro tamaño
- Algunos rasgos dan un dado de ventaja más grande. Ejemplos del SRD: compañero del Guardabosques/Druida con **d8** y Poesía Épica (Epic Poetry) del Bardo con **d10**. La app debe permitir **elegir el tamaño del dado de ventaja** (d6 por defecto). [SRD, rasgos de clase]
- **Rally dice** (del Bardo): dados que se suman a una tirada. El SRD los menciona junto a la ventaja como «dados extra de la reserva». [SRD 1.0]

### 3.4 Adversarios
- Ventaja de adversario: el DJ tira **un d20 extra y se queda con el más alto**. Desventaja: tira un d20 extra y se queda con el **más bajo**. (No usa d6.) [SRD 1.0]

---

## 4. Tiradas especiales

### 4.1 Tirada de reacción (Reaction Roll) [SRD 1.0]
- Se hace para esquivar o aguantar un ataque o un peligro. Se calcula igual (2d12 + rasgo + mods, contra una Dificultad).
- **No genera Esperanza ni Miedo** y **no provoca jugadas del DJ**. Nadie puede ayudar con Ayudar a un Aliado.
- **Sí** se pueden usar Experiencias (pagando 1 Esperanza) y aplicar ventaja o desventaja.
- **Crítico en reacción**: **no** despeja Estrés **ni** da Esperanza, pero ignoras los efectos que te hubieran afectado en un éxito (daño, marcar Estrés, etc.).

### 4.2 Tirada de acción grupal (Group Action Roll) [SRD 1.0]
- El grupo elige un **líder**, que hace una tirada de acción normal. Los demás hacen **tiradas de reacción** con el rasgo que acuerden con el DJ.
- El líder recibe **+1 por cada reacción que tuvo éxito** y **−1 por cada una que falló**.
- Solo la tirada del líder genera Esperanza o Miedo, porque las de los demás son reacciones.

### 4.3 Tirada en Equipo (Tag Team Roll) [SRD 1.0]
- Cuesta **3 Esperanza**. Cada **jugador** puede iniciar **una por sesión**. Un mismo PJ puede participar en varias.
- Los dos jugadores hacen **tiradas de acción por separado**. Antes de resolver, **eligen una de las dos** y esa se aplica a **ambas** acciones.
- **Con Esperanza**: **todos** los PJs que participan ganan +1 Esperanza. **Con Miedo**: el DJ gana **+1 Miedo por cada PJ** que participa.
- **Ataque Tag Team exitoso**: los dos tiran daño y **se suman los totales**, como si fuera **una sola fuente**. Si los tipos de daño son distintos, los jugadores escogen uno.
- Cuenta como **una sola tirada de acción** para cuentas regresivas (countdowns) y rasgos.
- Que el crítico (dados iguales en la tirada elegida) dé su bonificación a los dos es la lectura natural, pero el SRD no lo explica. **SIN VERIFICAR**.

### 4.4 Tirada de rasgo (Trait Roll) y de Lanzamiento (Spellcast Roll) [SRD 1.0]
- Una **tirada de rasgo** es una tirada de acción que dice qué rasgo usa. Lo que afecta a un rasgo afecta a **todas** las tiradas con ese rasgo: ataque, lanzamiento y acción normal.
- **Tirada de Lanzamiento (Spellcast Roll)**: es una tirada de rasgo con tu rasgo de Lanzamiento, que define tu subclase. Solo se hace cuando un rasgo la pide. Formato: «Spellcast Roll (15)».
- Una tirada de Lanzamiento que **puede hacer daño cuenta también como tirada de ataque**, así que hereda el daño crítico.

### 4.5 Tirada de ataque de PJ (Attack Roll) [SRD 1.0]
- Es una tirada de acción para hacer daño. El rasgo lo dice el arma o el hechizo. Sin armas se usa **Fuerza o Finesse** (lo elige el DJ).
- **Contra adversarios** la Dificultad es la **Dificultad (Difficulty) del adversario**, no su Evasión. Para otras acciones contra un adversario: su Dificultad **+** una Experiencia relevante del adversario, si aplica.
- Genera Esperanza o Miedo como cualquier tirada de acción.
- **Varios objetivos**: **una** tirada de ataque y **una** de daño, que se aplican a cada objetivo por separado.

### 4.6 Ataques y tiradas del DJ / adversarios [SRD 1.0]
- El DJ usa **un solo d20**, el **Dado del DJ (GM's Die)**.
- **Ataque de adversario**: `d20 + Modificador de Ataque (Attack Modifier)` contra la **Evasión (Evasion)** del PJ. **Igual o mayor = acierta.**
  - Antes de tirar, el DJ puede dar ventaja o desventaja (d20 extra: el mayor o el menor) o **gastar 1 Miedo** para sumar una Experiencia del adversario.
  - **Varios objetivos**: una tirada que se compara con la Evasión de cada PJ.
- **20 natural** en un ataque: **acierta automáticamente** y hace daño crítico (se suma el **máximo de los dados de daño**). Ejemplo oficial: 3d6+2 se convierte en **18 + 3d6 + 2**. El modificador fijo **no** se duplica.
- **20 natural en una tirada de reacción del adversario**: éxito automático, **sin otro beneficio**.
- El SRD no dice nada de un **1 natural** (fallo automático) para el DJ. Las reglas no lo incluyen; **SIN VERIFICAR** que exista.
- **Acción o reacción de adversario** (poco común): d20 contra la Dificultad. Con 1 Miedo puede sumar una Experiencia.
- Las tiradas del DJ **no generan Esperanza ni Miedo**.

### 4.7 Evasión (Evasion) [SRD 1.0]
- Toda tirada **contra un PJ** tiene como Dificultad la **Evasión** del PJ. La base depende de la clase y la modifican cartas, equipo, condiciones, etc.

---

## 5. Experiencias (Experiences) [SRD 1.0 + corrección sep. 2025]
- Son palabras o frases que describen la formación o la personalidad del personaje, por ejemplo «Marinero», «Hija del gremio de ladrones». No pueden ser demasiado amplias («Suertudo») ni dar poderes («Invulnerable»).
- **Creación**: **2 Experiencias a +2**.
- **Niveles 2, 5 y 8**: ganas **una Experiencia nueva a +2**.
- **Mejora de nivel** «subir Experiencias»: eliges **dos** y cada una gana **+1 permanente**.
- **Uso**: **1 Esperanza** por Experiencia; se suma su modificador a **acción o reacción**. Se pueden apilar varias, pagando cada una. Se declaran **antes** de tirar.
- Algunos objetos dan +1 a una Experiencia (por ejemplo Honing Relic).
- **Adversarios**: su Experiencia cuesta **1 Miedo** y sube su tirada o la Dificultad de lo que se tire contra ellos.
- Para la app: cada Experiencia es `{nombre, valor}`; usarla pide confirmar el gasto de Esperanza y revisar que haya saldo.

---

## 6. Daño (Damage)

### 6.1 Notación [SRD 1.0]
- Formato **`xdy+[mod]`**, por ejemplo `1d8+2`, `3d6+2`, `4d10+3`. El modificador puede faltar o ser negativo.
- **Armas de PJ**: el arma da el dado y el modificador, por ejemplo `d8+2`. El **número de dados = Competencia (Proficiency)**. La Competencia **multiplica los dados, no el modificador**: Competencia 2 con `d8+2` da `2d8+2`.
- **Sin armas**: `[Competencia]d4`.
- **Daño con el rasgo de Lanzamiento**: se tiran tantos dados como el valor del rasgo. Con **+0 o menos no se tira nada**.
- La Competencia empieza en 1 y sube en los niveles 2, 5 y 8 (+1 cada vez), además de otras mejoras. [SRD 1.0]
- Algunos rasgos añaden **dados extra de daño** (por ejemplo Splintering Strike suma un dado y luego se reparte el daño).
- **Tipos**: físico (**phy**) o mágico (**mag**). Por defecto las armas mundanas hacen físico y los hechizos mágico. Para la app es solo una etiqueta, salvo con resistencia o inmunidad.

### 6.2 Daño crítico (Critical Damage)
- **PJ** (dados iguales en una tirada de ataque o de lanzamiento con daño): se tira normal y se **suma el máximo posible de los dados**. Ejemplo oficial: `2d8+1` crítico = `2d8 + 1 + 16`. [SRD 1.0]
- **Adversario** (20 natural): igual. `3d6+2` = `18 + 3d6 + 2`. [SRD 1.0]
- Fórmula: `crit = tirada(NdX) + N·X + mod`.
- Si el daño incluye dados de varios tamaños (por ejemplo arma + dado extra de un rasgo), lo natural es sumar el máximo de **todos** los dados de daño. El SRD solo pone ejemplos con un tamaño: **SIN VERIFICAR** para casos mixtos.

### 6.3 Después de la tirada (útil si la app aplica el daño) [SRD 1.0]
- **Umbrales**: daño ≥ Grave (Severe) = **3 PV**; ≥ Mayor (Major) = **2 PV**; menor que Mayor = **1 PV**; 0 o menos = no se marca nada. Opcional: daño ≥ 2× Grave = **4 PV** (Daño Masivo, Massive Damage).
- Los umbrales del PJ son los de su armadura **+ su nivel**. Marcar una Ranura de Armadura (Armor Slot) **baja el daño un umbral**.
- **Resistencia**: daño ÷ 2 antes de comparar con los umbrales (se aplica antes que la armadura y no se acumula). **Inmunidad**: se ignora. **Daño directo (direct damage)**: no se puede reducir con armadura.
- **Varias fuentes al mismo tiempo**: se suman antes de comparar con los umbrales.
- El SRD no dice cómo redondear la mitad de la resistencia. **SIN VERIFICAR**.

---

## 7. Otros dados que la app debe soportar
- **Cuentas regresivas (Countdowns)**: un valor que baja de 1 en 1 y dispara su efecto al llegar a 0. Las **estándar** bajan con cada tirada de acción. Las **dinámicas** bajan según el resultado. «Countdown [n]» = estándar que empieza en n. [SRD 1.0]

  | Resultado | Progreso (Progress) | Consecuencia (Consequence) |
  |---|---|---|
  | Fallo con Miedo | 0 | −3 |
  | Fallo con Esperanza | 0 | −2 |
  | Éxito con Miedo | −1 | −1 |
  | Éxito con Esperanza | −2 | 0 |
  | Éxito Crítico | −3 | 0 |
- **Ganancia de Miedo al descansar**: `1d4` (corto) y `1d4 + nºPJs` (largo).
- **Dado de Esperanza modificado**: algunos rasgos cambian su tamaño. Por ejemplo «Rise to the Challenge» del Guerrero permite usar el Dado de Esperanza **como d20** si tienes 2 PV o menos sin marcar. La app debe permitir cambiar el tamaño de los Dados de Esperanza y Miedo (d12 por defecto). [SRD, rasgos de clase]
- **Slayer Dice** (Guerrero): en una tirada con Esperanza puedes guardar un d6 en una reserva en vez de ganar Esperanza. [SRD, rasgo de subclase]

### Resumen de notaciones
| Notación | Uso |
|---|---|
| `2d12` (H + F) | Dados de Dualidad, con el color de cada uno identificado |
| `+/−1d6` (o d8, d10) | Ventaja / Desventaja / Ayudar a un Aliado (se queda el más alto de los ayudantes) |
| `1d20 + mod` | Dado del DJ, ataques y acciones de adversarios |
| `2d20kh1` / `2d20kl1` | Ventaja / Desventaja de adversario |
| `NdX+M` | Daño; N = Competencia para armas de PJ |
| `NdX+M` crítico | `NdX + N·X + M` |
| `1d4`, `1d4+n` | Miedo al descansar |

---

## 8. Puntos marcados SIN VERIFICAR (resumen)
1. El texto exacto del SRD 2.0 en Ventaja/Desventaja (tope de 1 dado) y en la resolución de la tirada de acción: lo confirman dos fuentes secundarias, no el PDF oficial.
2. Si el crítico de una Tag Team da su bonificación a los dos participantes.
3. El daño crítico con dados de tamaños distintos.
4. El redondeo de la resistencia (½).
5. Que no hay «1 natural = fallo» para el DJ (el SRD no lo menciona).

---

## Fuentes
- SRD oficial, página e historial de cambios: https://www.daggerheart.com/srd/
- PDF oficial del SRD 2.0 (25/08/2026): https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf
- FAQ oficial (sin reglas detalladas): https://www.daggerheart.com/faq/
- Licencia (Darrington Press Community Gaming License): https://darringtonpress.com/license/
- Transcripción del texto del SRD 1.0 (seansbox; reproduce el texto oficial bajo la licencia DPCGL): https://seansbox.github.io/daggerheart-srd/ — fuente: https://raw.githubusercontent.com/seansbox/daggerheart-srd/main/README.md
- Secundaria sobre SRD 2.0: https://daggerheartsrd.com/rules/
- Secundaria sobre SRD 2.0 (notas de versión de una VTT): https://github.com/CristoSolar/dual-vtt/releases/tag/srd-2.0
- Referencia de notación en otra herramienta (Alchemy RPG): https://help.alchemyrpg.com/en/articles/15235343-daggerheartroll-command
