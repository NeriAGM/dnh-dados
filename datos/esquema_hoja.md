# Hoja de personaje: cómo se guarda

Cada personaje vive en la tabla `personajes`. Las columnas `esperanza`,
`esperanza_max`, `estres` y `estres_max` siguen aparte porque las toca la
función `tirar()`. Todo lo demás va en la columna `hoja` (JSON):

```jsonc
{
  "nivel": 2,
  "pronombres": "Ella",
  "clase": "ranger",            // id del SRD, o "casero:<uuid>" si es homebrew
  "subclase": "beastbound",
  "ancestria": "katari",
  "ancestria_texto": "",        // texto libre si no encaja (p. ej. "Híbrido Infris-Humano")
  "comunidad": "wildborne",
  "dominios": ["bone", "sage"], // normalmente los de la clase; editable

  "rasgos": { "agilidad": 2, "fuerza": 1, "sutileza": 1, "instinto": -1, "presencia": -1, "conocimiento": 0 },
  "rasgos_mejorados": ["agilidad"],   // casillas marcadas al subir de nivel

  "evasion_base": 13,           // la de la clase, o la que acordó la mesa
  "evasion_extra": 4,           // bonos de armadura, cartas, etc.
  "competencia": 1,

  "pg_max": 6,
  "pg": 0,                      // PG marcados (daño)
  "armadura": {
    "id": "gambeson-armor",     // o null si es casera
    "nombre": "Gambesón",
    "puntuacion": 3,
    "umbrales": { "mayor": 5, "grave": 11 },   // base; la app les suma el nivel
    "rasgos": [{ "nombre": "Flexible", "texto": "+1 a la Evasión" }]
  },
  "armadura_marcada": 0,
  "umbrales_manuales": null,    // { "mayor": 6, "grave": 12 } si la mesa los fijó a mano

  "experiencias": [{ "nombre": "Rastreadora", "valor": 2 }],

  "armas": [{
    "id": "shortbow",           // o null si es casera
    "nombre": "Arco corto",
    "tipo": "primaria",
    "rasgo": "agilidad",
    "alcance": "lejano",
    "dano": { "dados": 1, "lados": 6, "mod": 3, "tipo": "fisico" }, // "dados" es por punto de Competencia
    "manos": 2,
    "rasgos": [],
    "activa": true
  }],

  "cartas": { "mano": ["gifted-tracker"], "boveda": [] },   // ids del SRD o "casero:<uuid>"
  "inventario": [{ "nombre": "Cuerda", "cantidad": 1, "nota": "" }],
  "oro": { "punados": 1, "bolsas": 0, "cofres": 0 },   // + "monedas" si la mesa usa monedas (10 = 1 puñado)

  "companero": null,            // Vínculo bestial: { nombre, especie, evasion, estres_max, estres,
                                //   dano_lados, alcance, experiencias: [{nombre, valor}], rasgos: [], notas }
  "rasgos_extra": [],           // rasgos de clase/linaje caseros escritos a mano: [{ nombre, texto }]
  "notas": "",
  "origen": "notion",           // de dónde vino (notion | app)

  // Ayudas de reglas (todas opcionales; si faltan, valen lo de la derecha)
  "estado": null,               // null | "gloria" | "inconsciente" | "muerto" (movimientos de muerte)
  "reparto_pendiente": null,    // Arriesgarlo todo con Esperanza: cuánto falta repartir entre PG y Estrés
  "cicatrices": 0,              // Evitar la muerte: casillas de Esperanza tachadas (ya restadas de esperanza_max)
  "descansos_cortos": 0,        // cortos seguidos; al 3.º el siguiente debe ser largo; el largo lo regresa a 0
  "subclase_etapa": "base",     // base | especializacion | maestria
  "multiclase": null,           // { clase, dominio, subclase } (el dominio también se agrega a "dominios")
  "avances": [                  // mejoras tomadas al subir de nivel, para respetar los límites
    { "nivel": 2, "tipo": "rasgos", "rango": 2, "detalle": { "rasgos": ["fuerza", "presencia"] } }
  ]                             // tipo: rasgos | pg | estres | experiencias | carta | evasion |
                                //       subclase | competencia | multiclase; rango: sección 2, 3 o 4
}
```

Ayudas de la hoja (botones bajo los marcadores; código puro en `src/lib/ayudas.js` y `src/lib/avance.js`):
- **Recibir daño:** resistencia (mitad, hacia arriba) → reducciones → umbrales → una casilla de Armadura
  baja un escalón (no contra daño directo). Daño masivo (2 × Grave = 4 PG) es una regla opcional de la
  mesa: la decide el DJ en Ajustes → Reglas de la mesa (`campanias.ajustes.danoMasivo`), apagada de inicio.
- **Descansar:** 2 movimientos (se puede repetir); los cortos tiran 1d4 + Rango con `tirar()`.
- **Movimiento de muerte:** al marcar el último PG. El d12 de Evitar la muerte y los Dados de Dualidad de
  Arriesgarlo todo pasan por `tirar()` (tipos `libre` y `reaccion`, así no dan Esperanza ni Miedo).
- **Subir de nivel:** logros (2, 5, 8), dos mejoras con sus casillas por sección, umbrales +1
  (automático: la app suma el nivel; los manuales se suben +1) y carta nueva.
  El Estrés máximo vive en la columna `estres_max`; la Esperanza máxima, en `esperanza_max`.

Reglas que la app **avisa pero no bloquea** (la mesa puede tener acuerdos propios):
- Rasgos fuera del arreglo +2, +1, +1, 0, 0, −1 al nivel 1.
- Evasión base distinta a la de la clase.
- Más de 5 cartas en la mano.
- Cartas de un dominio que no es de la clase, o de nivel mayor al del personaje.
- Esperanza máxima 6, Estrés y PG máximo 12.

Cálculos automáticos:
- Umbrales = umbrales base de la armadura + nivel (o `umbrales_manuales`).
- Evasión = `evasion_base` + `evasion_extra`.
- Ataque con arma = Dados de Dualidad + rasgo del arma (+ bonos de sus rasgos, como "Fiable +1").
- Daño con arma = (Competencia × dados del arma) d(lados) + mod.
