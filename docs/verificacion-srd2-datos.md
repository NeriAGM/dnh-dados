# Verificación de los datos de reglas contra el SRD 2.0 oficial

Fecha: 16/11/2026. Rama `datos/verificar-srd2` (sin publicar).
Fuente de verdad: PDF oficial *Daggerheart SRD 2.0* (`DH_SRD_2_2026_08_25.pdf`), leído página por página
desde el RAG local. Las páginas que se citan son las del PDF.

## Resumen

- Se revisaron **los 19 archivos** de `datos/es` y `datos/es_2_0`: **816 entradas** en total.
- El contenido que la app ya tiene **está muy bien**: casi todo coincide con el SRD 2.0 en números y en texto.
- Se corrigieron **12 datos** en 5 archivos (abajo, con página). Además, las 16 etiquetas de cuenta regresiva
  de adversarios y entornos, que estaban en inglés, quedaron en español.
- Quedan **9 dudas** para que decida Neri.
- El SRD 2.0 trae mucho contenido nuevo (del suplemento *Hope & Fear*) que la app **no tiene**:
  135 adversarios, 28 entornos, unas 130 armas, 35 armaduras, 60 objetos, 60 consumibles y 6 Transformaciones.
  No se agregó nada: los nombres en español los decide Neri. La lista completa está en el anexo.
- `npm run probar`: 281 de 281 en verde antes y después.

## Cómo se verificó

1. **Inglés de la app contra el PDF, automático.** Se normalizó el texto del PDF (ligaduras, comillas, saltos
   de página, glifos raros) y se buscó cada texto en inglés de `datos/fuente` y `datos/fuente_2_0`.
   Para los números se armó la línea completa tal como aparece en el PDF y se buscó exacta:
   - adversarios: nombre, rango, tipo, Horda (X/PG), descripción, motivos, Dificultad, umbrales, PG, Estrés,
     ataque (modificador, nombre, alcance, daño) y Experiencias; y cada rasgo con su clase
     (Pasiva/Acción/Reacción) y su cuenta regresiva;
   - entornos: rango, tipo, descripción, impulsos, Dificultad, posibles adversarios y rasgos;
   - armas y armaduras: la fila completa de la tabla (rasgo, alcance, daño, carga, rasgo del arma; umbrales,
     Puntuación de Armadura) y en qué rango y tabla está;
   - cartas: nombre, nivel, dominio, tipo, costo de recuerdo y texto;
   - clases: dominios, Evasión, PG, objetos de clase, rasgo de Esperanza, rasgos de clase y preguntas;
   - subclases: rasgo de Lanzamiento y rasgos; ancestrías y comunidades: rasgos y descripciones;
   - objetos y consumibles: número de la tabla, nombre y texto; Formas de Bestia: el bloque completo.
2. **Español contra inglés, automático.** Todos los campos numéricos y todos los números y dados dentro de
   los textos coinciden entre `datos/es*` y `datos/fuente*`. La única diferencia es de forma
   («gasta 1 de Esperanza» por «spend a Hope»).
3. **Español contra inglés, leído.** 14 revisores (Sonnet) leyeron todas las entradas, campo por campo,
   buscando lo que falta, lo que sobra o lo que cambia de sentido. Además se contaron en cada texto los
   términos de regla (Esperanza/Miedo, alcances, ventaja/desventaja, descanso corto/largo, umbrales, rasgos,
   «una vez por…») y se revisaron a mano los 130 textos donde no cuadraba la cuenta: todos decían lo mismo.
   Cada corrección se revisó a mano contra el inglés y el PDF antes de aplicarla.

## Por archivo

| Archivo | Entradas | Resultado | Corregido |
|---|---|---|---|
| `adversarios.json` | 129 | 126 bloques de estadísticas exactos; 417 de 417 rasgos | Hordas, cuentas regresivas |
| `entornos.json` | 19 | 17 encabezados exactos; 78 de 78 rasgos | Cuentas regresivas |
| `armas.json` | 192 | 182 filas exactas; 9 armas ya no están en el 2.0 | Legendary Dagger |
| `armaduras.json` | 34 | 34 exactas | — |
| `objetos.json` | 60 | 60 exactos (Core Set Items, p. 75–77) | — |
| `consumibles.json` | 60 | 58 exactos | Dragonbloom Tea, Bridge Seed |
| `formas_bestia.json` | 24 | 24 coinciden (p. 15–18) | — |
| `cartas.json` + `es_2_0/cartas.json` | 189 + 21 | 210 de 210 encabezados exactos (el PDF trae 210) | Notorious |
| `dominios.json` + `es_2_0/dominios.json` | 9 + 1 | Coinciden, salvo las clases que pueden usarlos | Descripciones de 6 dominios |
| `clases.json` + `es_2_0/clases.json` | 9 + 4 | Coinciden | — |
| `subclases.json` + `es_2_0/subclases.json` | 18 + 8 | Coinciden | — (ver duda 2) |
| `ancestrias.json` + `es_2_0/ancestrias.json` | 18 + 6 | Coinciden (el PDF trae 24) | — |
| `comunidades.json` + `es_2_0/comunidades.json` | 9 + 6 | Coinciden (el PDF trae 15) | — |

Los datos 2.0 (`es_2_0`, `fuente_2_0`) ahora tienen `"verificado": true`, menos las dos subclases de la Bruja
(duda 2). Ver la nota en `datos/fuente_2_0/FALTANTES.md`.

## Correcciones (antes → después)

Cada una se aplicó al español (`datos/es`) y al inglés de referencia (`datos/fuente`), un commit por archivo.

| Archivo | Entrada | Antes | Después | Página |
|---|---|---|---|---|
| consumibles | Té de flor de dragón (Dragonbloom Tea) | reciben **2d20** de daño físico usando tu Competencia | reciben **d20** de daño físico usando tu Competencia | p. 81 |
| consumibles | Semilla puente (Bridge Seed) | se disipan en tu siguiente descanso | se disipan en tu siguiente **descanso corto** | p. 81 |
| armas | Legendary Dagger (Daga legendaria) | d8+9 | **d8+10** | p. 63 |
| cartas | Notorio (Notorious, Gracia, nivel 10) | «Esta carta no cuenta para el máximo de 5 cartas de dominio de tu mano y no puede ponerse en tu bóveda.» | Frase quitada: el 2.0 ya no la trae, así que cuenta como cualquier carta | p. 216 |
| adversarios | Swarm of Rats (Enjambre de ratas) | Horda sin número | **Horda (10/PG)** | p. 110 |
| adversarios | Electric Eels (Anguilas eléctricas) | Horda sin número | **Horda (2/PG)** | p. 118 |
| adversarios | 12 cuentas regresivas | «Countdown (Loop 1d6)», «Long-Term Countdown (8)»… | «Cuenta regresiva (bucle 1d6)», «Cuenta regresiva de largo plazo (8)», «(decreciente 8)» | p. 91 |
| entornos | 4 cuentas regresivas | «Countdown (Loop 4)»… | «Cuenta regresiva (bucle 4)»… | p. 91 |
| dominios | Hoja | Guardián y Guerrero | **Asesino**, Guardián y Guerrero | p. 7 |
| dominios | Hueso | Explorador y Guerrero | **Peleador**, Explorador y Guerrero | p. 7 |
| dominios | Gracia | Bardo y Pícaro | Bardo, Pícaro y **Brujo** | p. 7 |
| dominios | Medianoche | Pícaro y Hechicero | **Asesino**, Pícaro y Hechicero | p. 7 |
| dominios | Sabiduría | Druida y Explorador | Druida, Explorador y **Bruja** | p. 7 |
| dominios | Valor | Guardián y Serafín | **Peleador**, Guardián y Serafín | p. 7 |

Para las cuentas regresivas se usaron las palabras que ya usa la app en `docs/reglas/reglas-3-combate.md`
(«en bucle», «decreciente», «de largo plazo»). Si Neri prefiere otras, se cambian en un solo lugar.

## Dudas para Neri (decididas el 16/11/2026)

1. **Nueve armas de rango 3 ya no existen en el SRD 2.0** (tabla de armas mágicas, p. 62–63):
   Axe of Fortunis, Blessed Anlace, Ghostblade, Runes of Ruination, Widogast Pendant, Gilded Bow, Firestaff,
   Mage Orb e Ilmari's Rifle. En su lugar el 2.0 trae otras (Rocket Maul, Crystal Spear, Arc Wand, Rime Scepter,
   Gunblade, Staff of Augma). No se borraron: si alguna hoja las usa, se rompería. ¿Las quitamos, las dejamos
   marcadas como «SRD 1.0» o las dejamos igual?
   **Neri: «Déjalas y márcalas».** Se quedan, con `"solo_srd_1": true`. El catálogo de «Agregar arma» les pone
   «Solo SRD 1.0».
2. **Subclases de la Bruja.** En el SRD 2.0 se llaman **Hedge** y **Moon**, no «Hedge Witch» y «Moon Witch»
   (p. 29–30). En la app son «Bruja de Seto» y «Bruja de la Luna». ¿Se quedan así o se cambian?
   **Neri: se quedan en español como están.**
3. **Espadachín arcano (Spellblade).** Su ataque hace daño «phy/mag», físico y mágico a la vez (p. 110). La app
   solo puede guardar un tipo, así que muestra «fís.». El rasgo «Acero arcano» ya lo explica en el texto.
   ¿Basta así o quieres que la app acepte los dos tipos?
   **Neri: se queda así.**
4. **Abominación de los Reinos Exteriores.** Su modificador de ataque es **+2d4** (p. 153). La app guarda
   un número y tira con +2. Su rasgo «Forma caótica» ya dice que se tiran 2d4. ¿Basta así o se cambia la app
   para que tire el 2d4?
   **Neri: se cambia la app.** El ataque guarda `"mod": 0` y `"mod_dados": { "dados": 2, "lados": 4 }`; el botón
   dice «Atacar +2d4» y tira d20 + 2d4, también en el servidor (sin cambiar Supabase).
5. **Emboscados y Emboscadores (Ambushed, Ambushers).** Su Dificultad es «Especial (ver "Fuerza relativa")»
   (p. 161). La app muestra «—». ¿Lo dejamos o ponemos el texto?
   **Neri: se pone el texto.** Ahora dice «Dificultad Especial (ver «Fuerza relativa»)».
6. **Sugerencias de creación en las 9 clases del 1.0.** La app trae rasgos, armas y armadura sugeridos
   (`sugerido`). El SRD 2.0 ya no los trae en ninguna clase. No se quitaron. ¿Se quedan?
   **Neri: se quedan.**
7. **Contenido nuevo del SRD 2.0** (anexo). ¿Quieres que se agregue? Hace falta que decidas los nombres
   en español, o que apruebes una propuesta de nombres. Es un trabajo grande, mejor en su propio chat.
   **Neri: se agrega todo, en otro chat.** Ese chat propone primero los nombres en español.
8. **Etiqueta «SRD 1.0» en la app.** `src/lib/srd.js` marca todo `datos/es` como «SRD 1.0». Con estas
   correcciones ya coincide con el 2.0. Es solo una etiqueta (no se muestra en casi ningún lado); no se tocó.
   **Neri: si no es importante que se vea, se queda.** Se queda: la app la oculta a propósito y solo muestra
   las otras fuentes. Si dijera «SRD 2.0», todas las clases y cartas mostrarían «· SRD 2.0».
9. **Outer Realms Corruptor o Corrupter.** El PDF usa las dos formas: la ficha y su rasgo dicen «Corrupter»
   (p. 153), y la lista de adversarios y otros textos dicen «Corruptor». Como es ambiguo, no se cambió.
   El nombre en español («Corruptor de los Reinos Exteriores») sirve para los dos.
   **Neri: se queda «Corruptor».**

### Notas menores de la traducción (no se cambiaron)

No cambian la regla; las anoto por si quieres afinarlas:

- Premonición: «rescind the move» quedó «anular la acción». «Move» aquí es la jugada, no una tirada de acción.
- Carga arcana (Origen Primigenio): «clear your Charge» quedó «gastar tu Carga». El efecto es el mismo.
- Arquero espectral (descripción): «while their charge is vulnerable» quedó «en peligro». Es solo ambientación.
- La Experiencia «Intrusion» es «Irrupción» en el Gigante pendenciero y «Intrusión» en los demás.

### Erratas solo del inglés de referencia (no afectan a la app)

En `datos/fuente` siguen las letras perdidas del PDF 1.0: «dicult» (Simiah, Ridgeborne, Earthquake),
«affuent» (Highborne), «ruans» (Slyborne). El español ya dice bien «difícil», «acomodado», «rufianes».
Están anotadas en `datos/fuente_2_0/FALTANTES.md`.

## Límites de esta verificación

- La revisión del español la leyeron modelos y la comprobé con conteos y muestras. No es una lectura humana
  línea por línea de las 816 entradas.
- El PDF tiene páginas con texto en imagen (por ejemplo, las hojas de personaje); eso no entra a la búsqueda.
- Las listas del anexo salen de leer las tablas del PDF automáticamente; los nombres pueden traer algún error
  menor de lectura (las armas secundarias de rango 4 y la silla de ruedas de combate, p. 69–71, salieron
  incompletas).
- El PDF trae algunos dígitos como glifos raros. Uno de ellos, el «0», se me pasó al principio: el Enjambre
  de ratas había quedado en Horda (1/PG). Lo encontró la revisión independiente y ya dice 10/PG. Ese glifo solo
  aparece en tres lugares del PDF; los otros dos son de Ghastly Legion, un adversario que la app no tiene.
- `herramientas/normalizar_srd.py` regenera `datos/fuente` desde la transcripción del 1.0. Si se vuelve a correr,
  borra estas correcciones del inglés de referencia (el español de `datos/es` no se toca).

## Anexo: lo que trae el SRD 2.0 y la app no

- **Transformaciones** (p. 42–45): Demigod, Ghost, Reanimated, Shapeshifter, Vampire, Werewolf.
- **Ancestría mixta** (Mixed Ancestry, p. 38): la regla de tomar un rasgo de cada ancestría.
- **Objetos adicionales** (Additional Items, *Hope & Fear*, p. 77–79): 60.
- **Consumibles adicionales** (Additional Consumables, *Hope & Fear*, p. 82–84): 60.
- **Armaduras** (p. 72–74), 35: Mage Robes, Brigandine Armor, Scale Mail Armor, Banded Armor y sus versiones
  Improved, Advanced y Legendary; Enchanter's Robes, Hawkguard's Mantle, Spidersilk Tunic, Stormthread Habit,
  Wyrdwood Splint Armor, Trollhide Cuirass, Gilded Sunplate, Granminster's Finery, Astral Raiment,
  Cloverweave Cloak, Skywarden's Lamellar, Bloodstone Plate Armor, Forged Coral Armor, Darkweave Shroud,
  Godbound Laminar, Forged Dreadplate, Forged Exosuit, Hallowed Heroplate, Resonant Harness.
- **Armas** (p. 56–71): el PDF trae 315 filas; 183 están en la app. Las nuevas que se leyeron:

  - Primaria rango 1 (12): Katana, Brass Knuckles, Scimitar, Twisted Dagger, Whipsword, Rope Dart, Brightsword, Shadowblade, Enchanted Chakram, Casting Dagger, Runelock Pistol, Arcane Rifle
  - Primaria rango 2 (24): Improved Katana, Improved Brass Knuckles, Improved Scimitar, Improved Twisted Dagger, Improved Whipsword, Improved Rope Dart, War Pick, Cane Sword, Bladed Fan, Cyrurgien’s Scalpel, Javelins, Lance, Improved Brightsword, Improved Shadowblade, Improved Enchanted Chakram, Improved Casting Dagger, Improved Runelock Pistol, Improved Arcane Rifle, Enchanted Shillelagh, Displacement Razor, Spellbound Bangles, Fury Gem, Enchanted Lute, Splintershaft Bow
  - Primaria rango 3 (24): Advanced Katana, Advanced Brass Knuckles, Advanced Scimitar, Advanced Twisted Dagger, Advanced Whipsword, Advanced Rope Dart, Blitz Hammer, Platinum Estoc, Soldier’s Pike, Chained Scythe, Singing Sword, Bladed Star, Advanced Brightsword, Advanced Shadowblade, Advanced Enchanted Chakram, Advanced Casting Dagger, Advanced Runelock Pistol, Advanced Arcane Rifle, Rocket Maul, Crystal Spear, Arc Wand, Rime Scepter, Gunblade, Staff of Augma
  - Primaria rango 4 (23): Legendary Katana, Legendary Brass Knuckles, Legendary Scimitar, Legendary Twisted Dagger, Legendary Whipsword, Legendary Rope Dart, Severed Dragon Claw, Infinite Staff, Bec de Corbin, Black Powder Serpentine, Clockwork Crossbow, Arquebus, Legendary Brightsword, Legendary Shadowblade, Legendary Enchanted Chakram, Legendary Casting Dagger, Legendary Runelock Pistol, Legendary Arcane Rifle, Starmetal Blade, Adder’s Fang, Demon’s Edge, Storm God’s Greataxe, Gravity Arbalest
  - Secundaria rango 1 (6): Hatchet, Offhand Brass Knuckles, Throwing Knives, Fighting Cloak, Rune Shield, Focus Runes
  - Secundaria rango 2 (10): Improved Hatchet, Improved Offhand Brass Knuckles, Improved Throwing Knives, Improved Fighting Cloak, Improved Rune Shield, Improved Focus Runes, Collapsible Baton, Eldritch Vambrace, Segmented Staff, Razor Wire
  - Secundaria rango 3 (10): Advanced Hatchet, Advanced Offhand Brass Knuckles, Advanced Throwing Knives, Advanced Fighting Cloak, Advanced Rune Shield, Advanced Focus Runes, Tinker’s Hammer, Vorpal Shard, Soul Chain, War Dart
  - Secundaria rango 4 (10): Legendary Hatchet, Legendary Offhand Brass Knuckles, Legendary Throwing Knives, Legendary Fighting Cloak, Legendary Rune Shield, Legendary Focus Runes, Void Needle, Echo Blade, Möbius Orb, Blackblood Tendril
- **Adversarios y entornos** (p. 93–182):

**Adversarios (135):**

- Rango 1 (34): Ahuizotl (p. 97), Atototl (p. 97), Bugboar (p. 98), Common Ruffian (p. 98), Darkweave Crawler (p. 99), Darkweave Queen (p. 99), Darkweave Spinner (p. 99), Darkweave Swarmlings (p. 99), Elk (p. 100), Falcon (p. 100), Grimmling Warband (p. 101), Harpy (p. 102), Kelpie (p. 103), Masque Muerte (p. 103), Mechanorb (p. 104), Mountain Troll (p. 105), Octopus (p. 105), Panther (p. 106), Phantom (p. 106), Poltergeist (p. 107), Rabble Mawb (p. 107), Redcap Biters (p. 107), Redcap Breaker (p. 108), Redcap Butcher (p. 108), Redcap Candlemaker (p. 108), Redcap Skinner (p. 108), Rugaru (p. 108), Sawtoothed Gillbeast (p. 109), Soul-Shattered Mage (p. 110), Spellbound Armor (p. 110), Viper (p. 111), Waxwork Creation (p. 111), Will-O’-The-Wisps (p. 112), Yufo (p. 112)
- Rango 2 (42): Banshee (p. 114), Basilisk (p. 115), Berserker Alpha (p. 115), Berserker Initiate (p. 115), Centaur Warden (p. 115), Chicken-Foot Hut (p. 116), Dire Pangolati (p. 117), Doppelhound (p. 117), Dragon Knight (p. 117), Elephant (p. 118), Entombed Cat Beast (p. 118), Entombed Elite Guard (p. 118), Entombed Empress (p. 119), Entombed Necropriest (p. 119), Entombed Skin Beetles (p. 119), Entombed Stonemason (p. 119), Flock of Feather Fiends (p. 120), Fowlbear (p. 120), Fungispunj Sporeling (p. 120), Fungispunj Sporophore (p. 120), Gargoyle (p. 121), Giant Octopus (p. 122), Gobstalker (p. 122), Guahalan Alebrujo (p. 123), Guahalan Fang Lord (p. 123), Guahalan Shifter (p. 123), Guahalan Spirit Beast (p. 124), Guahalan Spirit Singer (p. 124), Hill Titan (p. 124), Hive Walker (p. 124), Jack-O’-Lantern (p. 124), Landshark (p. 125), Landshark Behemoth (p. 125), Ravenous Mockery (p. 126), Rust Eater (p. 127), Scarecrow (p. 127), Sprite (p. 128), Stone Titan (p. 129), Triceratops (p. 129), Tyrannosaurus (p. 129), Urco (p. 130), Valdenhax (p. 130)
- Rango 3 (32): Archmage (p. 131), Catrin (p. 131), Chimera (p. 132), Crimson Lepus (p. 132), Cryptimoth (p. 132), Cursed Merfolk (p. 132), Deep Dweller (p. 133), Drake (p. 134), Dullahan (p. 135), Fellmounted Shadow King (p. 135), Fire Titan (p. 135), Frost Titan (p. 136), Gargantuan Sea Turtle (p. 136), Lamia (p. 137), Lamplight Beguiler (p. 137), Manticore (p. 138), Night Children (p. 138), Pain Priest (p. 138), Phoenix (p. 139), Plesiosaurus (p. 139), Roc (p. 139), Sandwyrm (p. 139), Shapeshifting Fiend (p. 140), Shapeshifting Fiend Revealed (p. 140), Storm Titan (p. 140), Unicorn (p. 141), Vampire Bat Swarm (p. 142), Vampire Lord (p. 142), Viscera Sucker (p. 143), Whisper Wraith (p. 143), Wyvern (p. 144), Young Fire Dragon (p. 144)
- Rango 4 (27): Cephilith Abomination (p. 145), Cephilith Hatchling (p. 145), Cephilith Novitiate (p. 146), Cephilith Priest (p. 146), Cephilith Titan (p. 146), Cipactli (p. 146), Cloud Titan (p. 147), Demon Lord Berzug (p. 147), Dragon Mother Mitera (p. 148), Fire Titan Warlord (p. 150), Gargantuan War Machine (p. 150), Ghastly Legion (p. 150), Griffin (p. 150), Hallowed Choir (p. 151), Harbinger of Death (p. 151), Harbinger of Famine (p. 151), Harbinger of Pestilence (p. 152), Harbinger of War (p. 152), Owl Witch (p. 154), Ruby Dragon (p. 154), Severed Shadow (p. 154), Supreme Demiurge Adonix (p. 155), Temporal Enforcer (p. 155), Water Mother (p. 157), Wyrmfiend (p. 157), Wyrmlings (p. 157), Xero the Castle Killer (p. 157)

**Entornos (28):**

- Rango 1 (8): Abandoned Mine (p. 160), Workshop (p. 161), Corrupted Swamp (p. 162), Cursed Graveyard (p. 163), Grand Feast (p. 163), Hold the Line (p. 164), Local Festival (p. 164), Raiding Party (p. 166)
- Rango 2 (8): Beach Day (p. 167), Deadly Dungeon (p. 168), Duel (p. 168), Masquerade Ball (p. 170), Heist (p. 170), Ocean Voyage (p. 171), Witch’s Hut (p. 172), Vast Desert (p. 172)
- Rango 3 (8): Archmage’s Tower (p. 173), Astral Realm (p. 173), Crystal Wasteland (p. 175), Dragon’s Lair (p. 175), Megastorm (p. 176), Sunken Citadel (p. 177), Upscale Casino (p. 177), Volcanic Eruption (p. 178)
- Rango 4 (4): City of Portals (p. 179), Moon Kingdom (p. 180), Realm of the Dead (p. 181), Time Court (p. 182)

