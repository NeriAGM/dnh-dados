// Catálogo del juego: SRD 1.0 + SRD 2.0 (traducidos) + homebrew de la campaña.
// Se carga aparte (import dinámico) para que la mesa abra rápido.

let promesa = null

const ARCHIVOS = ['clases', 'subclases', 'ancestrias', 'comunidades', 'dominios', 'cartas', 'armas', 'armaduras', 'objetos', 'consumibles', 'formas_bestia']
const DE_2_0 = ['clases', 'subclases', 'ancestrias', 'comunidades', 'dominios', 'cartas']

export function cargarSRD() {
  if (!promesa) {
    promesa = Promise.all([
      Promise.all(ARCHIVOS.map((f) => import(`../../datos/es/${f}.json`).then((m) => m.default))),
      Promise.all(DE_2_0.map((f) => import(`../../datos/es_2_0/${f}.json`).then((m) => m.default))),
    ]).then(([v1, v2]) => {
      const cat = {}
      ARCHIVOS.forEach((f, i) => { cat[f] = v1[i].map((x) => ({ ...x, fuente: 'SRD 1.0' })) })
      DE_2_0.forEach((f, i) => { cat[f] = [...cat[f], ...v2[i].map((x) => ({ ...x, fuente: 'SRD 2.0' }))] })
      return cat
    })
  }
  return promesa
}

// Une el catálogo oficial con el homebrew de la campaña.
// El homebrew usa ids "casero:<uuid>" para no chocar con los del SRD.
const TIPO_A_LISTA = {
  clase: 'clases', subclase: 'subclases', carta: 'cartas', arma: 'armas', armadura: 'armaduras',
  ancestria: 'ancestrias', comunidad: 'comunidades', dominio: 'dominios', objeto: 'objetos',
}

export function conCasero(cat, casero = []) {
  if (!cat) return null
  const salida = { ...cat }
  for (const lista of Object.values(TIPO_A_LISTA)) salida[lista] = [...(cat[lista] || [])]
  for (const c of casero) {
    const lista = TIPO_A_LISTA[c.tipo]
    if (!lista) continue
    salida[lista].push({ ...c.datos, id: `casero:${c.id}`, nombre: c.nombre, fuente: 'Casero', casero: c })
  }
  salida.porId = {}
  for (const [lista, items] of Object.entries(salida)) {
    if (!Array.isArray(items)) continue
    salida.porId[lista] = Object.fromEntries(items.map((x) => [x.id, x]))
  }
  return salida
}

export const RASGOS = [
  { id: 'agilidad', nombre: 'Agilidad', ayuda: 'Correr, saltar, maniobrar' },
  { id: 'fuerza', nombre: 'Fuerza', ayuda: 'Levantar, aplastar, aguantar' },
  { id: 'sutileza', nombre: 'Sutileza', ayuda: 'Controlar, esconderse, manipular' },
  { id: 'instinto', nombre: 'Instinto', ayuda: 'Percibir, sentir, orientarse' },
  { id: 'presencia', nombre: 'Presencia', ayuda: 'Encantar, actuar, engañar' },
  { id: 'conocimiento', nombre: 'Conocimiento', ayuda: 'Recordar, analizar, comprender' },
]

export const ALCANCES = {
  cuerpo: 'Cuerpo a cuerpo', 'muy-cercano': 'Muy cercano', cercano: 'Cercano', lejano: 'Lejano', 'muy-lejano': 'Muy lejano',
}

export const NOMBRE_RASGO = Object.fromEntries(RASGOS.map((r) => [r.id, r.nombre]))
