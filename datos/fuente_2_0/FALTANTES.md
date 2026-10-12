# Fuente 2.0: faltantes, verificación y erratas

Captura del contenido nuevo para jugadores del **Daggerheart SRD 2.0** (Darrington Press, 25 ago 2026).

- PDF oficial: https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf
- Página oficial con el changelog: https://www.daggerheart.com/srd/
- Transcripción comunitaria de donde se tomó el texto: https://github.com/JHerrin00/daggerheart-srd-2.0 (commit `e30aeb70d6c002af1b3fd783c037a45ec79cb984`, del 4 de octubre de 2026)

## Por qué todo tiene `"verificado": false`

- El shell no puede llegar a daggerheart.com, darringtonpress.com ni daggerheartsrd.com: el proxy de salida responde 403.
- WebFetch sí lee el PDF oficial, pero **no copia el texto literal**: solo lo resume. Además, el texto que obtiene del PDF se corta en unos 103,390 caracteres, más o menos en la página 27, dentro de la clase Warrior. No llega a la Witch, a las ancestrías, a las comunidades ni al apéndice de cartas.
- Por eso el texto de las reglas viene de la transcripción comunitaria de GitHub. Cada objeto apunta en `fuente` a su archivo `.md` en ese commit.

### Lo que sí se contrastó con el PDF oficial (datos, no texto literal)

Coinciden con el resumen que dio WebFetch del PDF oficial:

- **Assassin, Brawler y Warlock:** dominios, Evasión, PG, nombre y costo del rasgo de Esperanza, nombres de los rasgos de clase, subclases, rasgo de lanzamiento y nombres de los rasgos base, de especialización y de maestría.
- **Brawler:** d8+d6, Combo Die d4 y las 16 posturas de Martial Artist por tier.
- **Warlock:** Favor máximo de 6.

Contrastado solo contra otro espejo comunitario (daggerheartsrd.com):

- **Witch:** dominios, Evasión 10, PG 6, objetos, Witch's Charm, Hex y la tabla de Commune.
- **Las 21 cartas de Dread:** nombre, nivel y tipo coinciden. El espejo no muestra el costo de recuerdo.
- **Lista de ancestrías nuevas:** Aetheris, Earthkin, Emberkin, Gnome, Skykin y Tidekin.

**Sin contrastar con ninguna segunda fuente:**

- Los textos completos de los rasgos.
- Los costos de recuerdo de Dread.
- Los rasgos de las 6 comunidades y de las 6 ancestrías.
- Las subclases de la Witch.

## Faltantes y decisiones de forma

1. **`sugerido` = `null` en las 4 clases nuevas.** Las páginas de clase del SRD 2.0 ya no traen rasgos, armas ni armadura sugeridos, en ninguna clase. Lo confirman el README de la transcripción y el resumen del PDF oficial. No se inventaron.
2. **Elemental Kin (no se capturó como ancestría).** Es un texto de introducción común a Earthkin, Emberkin, Skykin y Tidekin. No tiene rasgos propios, así que no es elegible y no entra en `ancestrias.json`. El texto está en https://github.com/JHerrin00/daggerheart-srd-2.0/blob/e30aeb70d6c002af1b3fd783c037a45ec79cb984/ancestries/Elemental%20Kin.md
3. **Warlock, "Note" y "Sphere of Influence Examples".** En la transcripción aparecen como un rasgo aparte llamado "Note". Se juntaron al final del texto del rasgo **Favor**: el máximo de 6 Favor y la tabla de esferas. No se cambió ninguna palabra.
4. **Martial Artist, hoja de "Martial Stances".** Las reglas de Focus y de posturas, con las 16 posturas por tier, vienen después de las preguntas del Brawler y no forman parte de ningún rasgo en el JSON de origen. Se agregaron al final del texto de **Stance Fighter** (`subclases.json` → `martial-artist` → `base[0]`) porque el esquema no tiene un campo para ellas.
5. **Tablas en Markdown.** Commune (Witch), Lunar Phases (Moon Witch) y las esferas del Warlock se quedaron como tablas Markdown dentro de `texto`. Si la app no muestra tablas, hay que convertirlas.
6. **Fuera del alcance de esta captura (existen en el SRD 2.0, pero no se capturaron):**
   - Las 6 Transformaciones: Demigod, Ghost, Reanimated, Shapeshifter, Vampire y Werewolf.
   - Las armas, armaduras, objetos y consumibles nuevos de Hope & Fear.
   - Las reglas de Mixed Ancestry.
   - Las mecánicas de los marcos de campaña.
   - Los adversarios y entornos nuevos.

## Erratas del 2.0 que tocan contenido 1.0 existente

Salen de comparar `datos/fuente/*.json` con la transcripción 2.0, sin contar comillas tipográficas ni formato Markdown. **Ninguna está confirmada contra el PDF oficial**, por el corte de WebFetch descrito arriba. El changelog oficial (https://www.daggerheart.com/srd/) solo dice, en general, "Fixed typos and implemented errata" y "Rewrote for clarity: Advantage & Disadvantage, action roll resolutions, and spotlight mechanics".

- **Sin cambios en ninguna de las 9 clases ni de las 18 subclases:** Evasión, PG, dominios, rasgos de Esperanza, rasgos de clase y rasgos de lanzamiento son iguales. Tampoco se renombró, quitó, cambió de nivel, de costo de recuerdo ni de tipo ninguna de las 189 cartas.
- **Notorious (Grace, nivel 10):** el 2.0 **ya no trae** la frase "This card doesn't count against your loadout's domain card maximum of 5 and can't be placed in your vault." Fuente: https://github.com/JHerrin00/daggerheart-srd-2.0/blob/e30aeb70d6c002af1b3fd783c037a45ec79cb984/abilities/Notorious.md. **Hay que revisarlo en el PDF oficial antes de aplicarlo**: puede ser una errata real o un error de la transcripción.
- **Descripciones de dominios:** ahora nombran a las clases nuevas.
  - Blade: Assassin, Guardian, Warrior.
  - Bone: Brawler, Ranger, Warrior.
  - Grace: Bard, Rogue, Warlock.
  - Midnight: Assassin, Rogue, Sorcerer.
  - Sage: Druid, Ranger, Witch.
  - Valor: Brawler, Guardian, Seraph.

  Fuente: carpeta `domains/` del repo, en el mismo commit.
- **Typos corregidos en el 2.0:**
  - Descripción de la ancestría Simiah: "dicult" → "difficult".
  - Highborne: "affuent" → "affluent".
  - Ridgeborne: "dicult" → "difficult".
  - Slyborne: "ruans" → "ruffians".
  - Carta Earthquake: "dicult" → "difficult".

  Vienen de ligaduras "ff/ffi" que se perdieron en la conversión del PDF 1.0.
- **Guardian, Unstoppable:** en el 2.0 el "Tip" del Unstoppable Die es un recuadro aparte y no forma parte del texto del rasgo. Es solo de formato.
- **Druid, Wildtouch:** solo cambia la puntuación ("campfire" → "campfire—").
- **Problema del 1.0 local, no del SRD:** la descripción de **Valor** en `datos/fuente/dominios.json` trae pegado texto que no le corresponde ("### CLASS DOMAINS Each class grants access to two domains: …"). Conviene limpiarlo.
