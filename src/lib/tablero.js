// Reglas puras del tablero compartido: niebla, quién mueve qué ficha y dónde
// aparecen las fichas nuevas. Sin red ni Svelte, para poder probarlas.
//
// Coordenadas: x, y van de 0 a 1 sobre la imagen (0,0 = esquina de arriba a
// la izquierda). Así una ficha queda en el mismo lugar en cualquier pantalla.

export const NIEBLA_COLUMNAS = 64
const MAX_FILAS = 256
const COLOR_FICHA = '#a77ce8'

// Cuadrícula de niebla: c columnas × f filas, celdas en un Uint8Array (1 = tapada).
// Las filas siguen la forma de la imagen para que las celdas sean cuadradas.
export function crearNiebla(ancho, alto, tapada = true) {
  const c = NIEBLA_COLUMNAS
  const f = Math.min(MAX_FILAS, Math.max(1, Math.round((c * alto) / ancho) || 1))
  return { c, f, celdas: new Uint8Array(c * f).fill(tapada ? 1 : 0) }
}

// Lo guardado en la base es { c, f, d } con d = bits en base64 (fila por fila,
// el bit más alto primero). Si algo no cuadra, se toma como "sin niebla".
export function leerNiebla(guardada) {
  if (!guardada || typeof guardada !== 'object') return null
  const { c, f, d } = guardada
  if (!Number.isInteger(c) || !Number.isInteger(f) || c < 1 || f < 1 || c > MAX_FILAS || f > MAX_FILAS || typeof d !== 'string') return null
  let bin
  try { bin = atob(d) } catch { return null }
  if (bin.length !== Math.ceil((c * f) / 8)) return null
  const celdas = new Uint8Array(c * f)
  for (let i = 0; i < celdas.length; i++) celdas[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1
  return { c, f, celdas }
}

export function escribirNiebla({ c, f, celdas }) {
  const bytes = new Uint8Array(Math.ceil((c * f) / 8))
  for (let i = 0; i < celdas.length; i++) if (celdas[i]) bytes[i >> 3] |= 1 << (7 - (i & 7))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return { c, f, d: btoa(bin) }
}

const celdaDe = (n, x, y) => [Math.min(n.c - 1, Math.floor(recortar(x) * n.c)), Math.min(n.f - 1, Math.floor(recortar(y) * n.f))]

// Pincel: tapa o destapa un círculo (radio en fracción del ancho). Cambia la
// niebla en su lugar y dice si cambió algo (para no guardar de más).
export function pintar(niebla, x, y, radio, tapar) {
  const v = tapar ? 1 : 0
  const cx = recortar(x) * niebla.c
  const cy = recortar(y) * niebla.f
  const r = Math.max(0, radio) * niebla.c
  let cambio = false
  const poner = (i, j) => {
    const k = j * niebla.c + i
    if (niebla.celdas[k] !== v) { niebla.celdas[k] = v; cambio = true }
  }
  for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(niebla.f - 1, Math.ceil(cy + r)); j++) {
    for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(niebla.c - 1, Math.ceil(cx + r)); i++) {
      if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) poner(i, j)
    }
  }
  poner(...celdaDe(niebla, x, y)) // la celda bajo el dedo, aunque el radio sea diminuto
  return cambio
}

export function llenar(niebla, tapar) { niebla.celdas.fill(tapar ? 1 : 0) }

export function tapado(niebla, x, y) {
  if (!niebla) return false
  const [i, j] = celdaDe(niebla, x, y)
  return niebla.celdas[j * niebla.c + i] === 1
}

export function recortar(v) {
  const n = Number(v)
  return Number.isFinite(n) && v !== null && v !== '' ? Math.min(1, Math.max(0, n)) : 0.5
}

// El DJ mueve todas; un jugador solo la ficha de un PJ que es suyo
export function puedeMover(ficha, { uid, esDJ, personajes }) {
  if (esDJ) return true
  if (!uid || !ficha?.personaje_id) return false
  return personajes.find((p) => p.id === ficha.personaje_id)?.usuario_id === uid
}

// Lo que se dibuja: si es de un PJ, su nombre y color de hoy (pudo cambiar)
export function vistaFicha(ficha, personajes) {
  const pj = ficha?.personaje_id ? personajes.find((p) => p.id === ficha.personaje_id) : null
  const nombre = String(pj?.nombre ?? ficha?.nombre ?? '').trim()
  const color = [pj?.color, ficha?.color].find((c) => /^#[0-9a-fA-F]{6}$/.test(c ?? '')) ?? COLOR_FICHA
  return { nombre, color, inicial: ([...nombre][0] ?? '?').toUpperCase() }
}

// Las fichas bajo la niebla no se le dibujan al jugador, salvo la suya:
// si la suelta en lo tapado tiene que poder volver a agarrarla
export function fichasVisibles(fichas, niebla, esDJ, esMia = () => false) {
  if (esDJ || !niebla) return fichas
  return fichas.filter((f) => esMia(f) || !tapado(niebla, f.x, f.y))
}

export function pjsSinFicha(personajes, fichas, tableroId) {
  const puestos = new Set(fichas.filter((f) => f.tablero_id === tableroId).map((f) => f.personaje_id))
  return personajes.filter((p) => !puestos.has(p.id))
}

// Las fichas nuevas salen en filas de 8 sobre la parte baja del mapa
export function posicionInicial(n) {
  const k = Math.max(0, Math.floor(n) || 0)
  return { x: 0.15 + (k % 8) * 0.1, y: Math.max(0.05, 0.85 - Math.floor(k / 8) * 0.1) }
}
