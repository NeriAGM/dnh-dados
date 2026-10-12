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
  "oro": { "punados": 1, "bolsas": 0, "cofres": 0 },

  "companero": null,            // Vínculo bestial: { nombre, especie, evasion, estres_max, estres,
                                //   dano_lados, alcance, experiencias: [{nombre, valor}], rasgos: [], notas }
  "rasgos_extra": [],           // rasgos de clase/linaje caseros escritos a mano: [{ nombre, texto }]
  "notas": "",
  "origen": "notion"            // de dónde vino (notion | app)
}
```

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
