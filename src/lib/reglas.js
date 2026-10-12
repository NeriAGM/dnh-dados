// Cálculos y avisos de reglas de Daggerheart para una hoja de personaje.
// Los avisos nunca bloquean: la mesa puede tener acuerdos propios.

export const ARREGLO_RASGOS = [2, 1, 1, 0, 0, -1]
export const MAX_MANO = 5

export function rangoDeNivel(nivel = 1) {
  if (nivel >= 8) return 4
  if (nivel >= 5) return 3
  if (nivel >= 2) return 2
  return 1
}

export function umbrales(hoja) {
  if (hoja?.umbrales_manuales?.mayor != null) return { ...hoja.umbrales_manuales, manual: true }
  const base = hoja?.armadura?.umbrales
  const nivel = hoja?.nivel ?? 1
  if (!base) return { mayor: nivel, grave: nivel * 2, sinArmadura: true }
  return { mayor: base.mayor + nivel, grave: base.grave + nivel }
}

export function evasion(hoja) {
  return (hoja?.evasion_base ?? 0) + (hoja?.evasion_extra ?? 0)
}

// Cuántos PG marca un golpe según los umbrales (con daño masivo opcional)
export function pgPorDano(dano, u, { masivo = false } = {}) {
  if (dano <= 0) return 0
  if (masivo && dano >= u.grave * 2) return 4
  if (dano >= u.grave) return 3
  if (dano >= u.mayor) return 2
  return 1
}

// Bono a la tirada de ataque que dan los rasgos del arma ("+1 a las tiradas de ataque")
export function bonoAtaque(arma) {
  let b = 0
  for (const r of arma?.rasgos || []) {
    const m = /([+-]\d+)\s+a\s+las?\s+tiradas?\s+de\s+ataque/i.exec(r.texto || '')
    if (m) b += parseInt(m[1], 10)
  }
  return b
}

export function grupoDano(arma, competencia = 1) {
  const d = arma?.dano || {}
  return { lados: d.lados || 6, cantidad: Math.max(1, (d.dados || 1) * Math.max(1, competencia)), mod: d.mod || 0 }
}

export function textoDano(arma, competencia = 1) {
  const g = grupoDano(arma, competencia)
  return `${g.cantidad}d${g.lados}${g.mod ? (g.mod > 0 ? `+${g.mod}` : g.mod) : ''}`
}

// Lista de avisos [{ campo, texto }]
export function avisos(hoja, cat) {
  const out = []
  if (!hoja) return out
  const clase = cat?.porId?.clases?.[hoja.clase]
  const nivel = hoja.nivel ?? 1

  const valores = Object.values(hoja.rasgos || {}).map(Number)
  if (valores.length === 6 && nivel === 1) {
    const ord = [...valores].sort((a, b) => b - a)
    if (ord.join() !== ARREGLO_RASGOS.join()) {
      out.push({ campo: 'rasgos', texto: `Los rasgos no siguen el arreglo inicial +2, +1, +1, 0, 0, −1.` })
    }
  }
  if (clase && hoja.evasion_base != null && hoja.evasion_base !== clase.evasion) {
    out.push({ campo: 'evasion', texto: `La Evasión base del ${clase.nombre} es ${clase.evasion}; aquí dice ${hoja.evasion_base}.` })
  }
  const mano = hoja.cartas?.mano || []
  if (mano.length > MAX_MANO) out.push({ campo: 'cartas', texto: `Tienes ${mano.length} cartas en la mano; el máximo es ${MAX_MANO}.` })
  const dominios = hoja.dominios?.length ? hoja.dominios : clase?.dominios || []
  for (const id of [...mano, ...(hoja.cartas?.boveda || [])]) {
    const c = cat?.porId?.cartas?.[id]
    if (!c || c.fuente === 'Casero') continue
    if (dominios.length && !dominios.includes(c.dominio)) out.push({ campo: 'cartas', texto: `«${c.nombre}» es de un dominio que no es de tu clase.` })
    if (c.nivel > nivel) out.push({ campo: 'cartas', texto: `«${c.nombre}» es de nivel ${c.nivel} y tu personaje es nivel ${nivel}.` })
  }
  if ((hoja.pg_max ?? 0) > 12) out.push({ campo: 'pg', texto: 'Los PG máximos no pueden pasar de 12.' })
  return out
}

// Hoja inicial para un personaje nuevo de una clase del catálogo
export function hojaNueva(clase, extra = {}) {
  return {
    nivel: 1,
    pronombres: '',
    clase: clase?.id ?? null,
    subclase: clase?.subclases?.[0] ?? null,
    ancestria: null,
    ancestria_texto: '',
    comunidad: null,
    dominios: clase?.dominios ?? [],
    rasgos: { agilidad: 0, fuerza: 0, sutileza: 0, instinto: 0, presencia: 0, conocimiento: 0 },
    rasgos_mejorados: [],
    evasion_base: clase?.evasion ?? 10,
    evasion_extra: 0,
    competencia: 1,
    pg_max: clase?.pg ?? 6,
    pg: 0,
    armadura: null,
    armadura_marcada: 0,
    umbrales_manuales: null,
    experiencias: [{ nombre: '', valor: 2 }, { nombre: '', valor: 2 }],
    armas: [],
    cartas: { mano: [], boveda: [] },
    inventario: [],
    oro: { punados: 1, bolsas: 0, cofres: 0 },
    companero: null,
    rasgos_extra: [],
    notas: '',
    origen: 'app',
    ...extra,
  }
}

// ---------------------------------------------------------------------
// Puntos de batalla (construir encuentros, SRD)
// Presupuesto = 3 × PJ + 2, con ajustes. Cada adversario cuesta según su tipo;
// los Esbirros cuestan 1 por grupo del mismo tamaño que el grupo de PJ.
// ---------------------------------------------------------------------
export const COSTO_TIPO = { social: 1, apoyo: 1, horda: 2, 'a-distancia': 2, acechador: 2, estandar: 2, lider: 3, bruto: 4, solo: 5 }
export const NOMBRE_TIPO = {
  solo: 'Solo', bruto: 'Bruto', esbirro: 'Esbirro', lider: 'Líder', acechador: 'Acechador',
  estandar: 'Estándar', 'a-distancia': 'A distancia', social: 'Social', apoyo: 'Apoyo', horda: 'Horda',
}
export const AJUSTES_BATALLA = [
  { id: 'facil', texto: 'Pelea más fácil o corta', puntos: -1 },
  { id: 'dano', texto: '+1d4 de daño a todos los adversarios', puntos: -2 },
  { id: 'rango-menor', texto: 'Un adversario de rango menor', puntos: 1 },
  { id: 'dificil', texto: 'Pelea más difícil o larga', puntos: 2 },
]

export function puntosDeBatalla(instancias, adversariosPorId, pjs, ajustesElegidos = []) {
  const n = Math.max(1, pjs || 1)
  const tipos = instancias.map((i) => adversariosPorId[i.ref]?.tipo ?? 'estandar')
  const esbirrosPorRef = {}
  let gastado = 0
  instancias.forEach((i, k) => {
    if (tipos[k] === 'esbirro') esbirrosPorRef[i.ref] = (esbirrosPorRef[i.ref] ?? 0) + 1
    else gastado += COSTO_TIPO[tipos[k]] ?? 2
  })
  for (const cantidad of Object.values(esbirrosPorRef)) gastado += Math.ceil(cantidad / n)

  const automaticos = []
  if (tipos.filter((t) => t === 'solo').length >= 2) automaticos.push({ texto: '2 o más Solos', puntos: -2 })
  if (instancias.length && !tipos.some((t) => ['bruto', 'horda', 'lider', 'solo'].includes(t))) {
    automaticos.push({ texto: 'Sin Brutos, Hordas, Líderes ni Solos', puntos: 1 })
  }
  const manuales = AJUSTES_BATALLA.filter((a) => ajustesElegidos.includes(a.id))
  const presupuesto = 3 * n + 2 + [...automaticos, ...manuales].reduce((s, a) => s + a.puntos, 0)
  return { presupuesto, gastado, restante: presupuesto - gastado, automaticos, manuales, base: 3 * n + 2 }
}
