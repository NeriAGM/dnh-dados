import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  NIEBLA_COLUMNAS, crearNiebla, leerNiebla, escribirNiebla, pintar, llenar, tapado,
  recortar, puedeMover, vistaFicha, fichasVisibles, pjsSinFicha, posicionInicial, dibujarNiebla,
} from './tablero.js'

test('niebla: el tamaño de la cuadrícula sigue la forma de la imagen (1 a 256 filas)', () => {
  const n = crearNiebla(1600, 900)
  assert.equal(n.c, NIEBLA_COLUMNAS)
  assert.equal(n.f, 36)
  assert.equal(n.celdas.length, 64 * 36)
  assert.ok(n.celdas.every((v) => v === 1))
  assert.equal(crearNiebla(100, 600).f, 256)
  assert.equal(crearNiebla(600, 100).f, 11)
  assert.equal(crearNiebla(6000, 10).f, 1)
  assert.equal(crearNiebla(0, 0).f, 1)
  assert.ok(crearNiebla(10, 10, false).celdas.every((v) => v === 0))
})

test('niebla: se guarda y se lee igual', () => {
  const n = crearNiebla(800, 600)
  pintar(n, 0.3, 0.6, 0.12, false)
  const g = escribirNiebla(n)
  assert.equal(typeof g.d, 'string')
  assert.ok(JSON.stringify(g).length < 20000)
  const l = leerNiebla(JSON.parse(JSON.stringify(g)))
  assert.equal(l.c, n.c)
  assert.equal(l.f, n.f)
  assert.deepEqual([...l.celdas], [...n.celdas])
})

test('niebla: lo guardado dañado o raro no truena, regresa null', () => {
  assert.equal(leerNiebla(null), null)
  assert.equal(leerNiebla('x'), null)
  assert.equal(leerNiebla({ c: 64, f: 2, d: 'AA' }), null)
  assert.equal(leerNiebla({ c: 64, f: 2, d: '%%%' }), null)
  assert.equal(leerNiebla({ c: 0, f: 2, d: '' }), null)
  assert.equal(leerNiebla({ c: 64, f: 9999, d: '' }), null)
})

test('niebla: el pincel destapa y tapa un círculo y avisa si cambió algo', () => {
  const n = crearNiebla(1000, 1000)
  assert.equal(tapado(n, 0.5, 0.5), true)
  assert.equal(pintar(n, 0.5, 0.5, 0.1, false), true)
  assert.equal(tapado(n, 0.5, 0.5), false)
  assert.equal(tapado(n, 0.53, 0.47), false)
  assert.equal(tapado(n, 0.02, 0.02), true)
  assert.equal(pintar(n, 0.5, 0.5, 0.1, false), false)
  assert.equal(pintar(n, 0.5, 0.5, 0.05, true), true)
  assert.equal(tapado(n, 0.5, 0.5), true)
  // Aunque el radio sea diminuto, la celda bajo el dedo sí cambia
  assert.equal(pintar(n, 0.9, 0.9, 0, false), true)
  assert.equal(tapado(n, 0.9, 0.9), false)
})

test('niebla: tapar y destapar todo; sin niebla nada está tapado', () => {
  const n = crearNiebla(500, 500)
  llenar(n, false)
  assert.equal(tapado(n, 0.1, 0.9), false)
  llenar(n, true)
  assert.equal(tapado(n, 0.1, 0.9), true)
  assert.equal(tapado(null, 0.1, 0.9), false)
  assert.equal(tapado(n, 1, 1), true) // la orilla cuenta como la última celda
})

test('recortar: siempre entre 0 y 1; lo que no es número va al centro', () => {
  assert.equal(recortar(-3), 0)
  assert.equal(recortar(1.7), 1)
  assert.equal(recortar(0.25), 0.25)
  assert.equal(recortar('a'), 0.5)
  assert.equal(recortar(NaN), 0.5)
  assert.equal(recortar(undefined), 0.5)
})

const personajes = [
  { id: 'p1', usuario_id: 'ana', nombre: 'Mira', color: '#e8b04a' },
  { id: 'p2', usuario_id: 'beto', nombre: 'Soren', color: '#4a90e8' },
  { id: 'p3', usuario_id: null, nombre: 'Aida', color: '#55aa55' },
]

test('puedeMover: el DJ todas; el jugador solo la de su PJ', () => {
  const mira = { personaje_id: 'p1' }
  const lobo = { personaje_id: null }
  const aida = { personaje_id: 'p3' }
  assert.equal(puedeMover(lobo, { uid: 'neri', esDJ: true, personajes }), true)
  assert.equal(puedeMover(mira, { uid: 'ana', esDJ: false, personajes }), true)
  assert.equal(puedeMover(mira, { uid: 'beto', esDJ: false, personajes }), false)
  assert.equal(puedeMover(lobo, { uid: 'ana', esDJ: false, personajes }), false)
  assert.equal(puedeMover(aida, { uid: null, esDJ: false, personajes }), false)
  assert.equal(puedeMover({ personaje_id: 'borrado' }, { uid: 'ana', esDJ: false, personajes }), false)
})

test('vistaFicha: la de un PJ toma su nombre y color actuales', () => {
  assert.deepEqual(vistaFicha({ personaje_id: 'p1', nombre: 'Viejo', color: '#000000' }, personajes), { nombre: 'Mira', color: '#e8b04a', inicial: 'M' })
  assert.deepEqual(vistaFicha({ personaje_id: null, nombre: 'ogro gris', color: '#a77ce8' }, personajes), { nombre: 'ogro gris', color: '#a77ce8', inicial: 'O' })
  assert.equal(vistaFicha({ nombre: '', color: 'raro' }, personajes).inicial, '?')
  assert.equal(vistaFicha({ nombre: 'X', color: 'raro' }, personajes).color, '#a77ce8')
})

test('fichasVisibles: bajo la niebla solo el DJ las ve', () => {
  const n = crearNiebla(100, 100)
  pintar(n, 0.2, 0.2, 0.1, false)
  const fichas = [{ id: 'a', x: 0.2, y: 0.2 }, { id: 'b', x: 0.8, y: 0.8 }]
  assert.deepEqual(fichasVisibles(fichas, n, false).map((f) => f.id), ['a'])
  assert.deepEqual(fichasVisibles(fichas, n, true).map((f) => f.id), ['a', 'b'])
  assert.deepEqual(fichasVisibles(fichas, null, false).map((f) => f.id), ['a', 'b'])
})

test('fichasVisibles: la ficha que el jugador puede mover no se le esconde bajo la niebla', () => {
  const n = crearNiebla(100, 100)
  const fichas = [{ id: 'mia', x: 0.8, y: 0.8 }, { id: 'lobo', x: 0.8, y: 0.8 }]
  const esMia = (f) => f.id === 'mia'
  assert.deepEqual(fichasVisibles(fichas, n, false, esMia).map((f) => f.id), ['mia'])
})

test('pjsSinFicha: los PJ que aún no están en ese tablero', () => {
  const fichas = [{ tablero_id: 't1', personaje_id: 'p1' }, { tablero_id: 't2', personaje_id: 'p2' }]
  assert.deepEqual(pjsSinFicha(personajes, fichas, 't1').map((p) => p.id), ['p2', 'p3'])
})

test('posicionInicial: siempre dentro del tablero y sin encimarse las primeras', () => {
  const vistas = new Set()
  for (let n = 0; n < 30; n++) {
    const { x, y } = posicionInicial(n)
    assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1, `${n}: ${x}, ${y}`)
    vistas.add(`${x.toFixed(3)},${y.toFixed(3)}`)
  }
  assert.ok(vistas.size >= 16)
})

test('dibujarNiebla: el lienzo solo cambia de tamaño si cambia la niebla (no en cada trazo)', () => {
  // Lienzo falso que cuenta cuántas veces se le cambia el tamaño (eso lo vuelve a crear)
  const lienzo = () => {
    const l = { cambios: 0, dibujos: 0, _w: 0, _h: 0 }
    Object.defineProperty(l, 'width', { get: () => l._w, set: (v) => { l._w = v; l.cambios++ } })
    Object.defineProperty(l, 'height', { get: () => l._h, set: (v) => { l._h = v; l.cambios++ } })
    l.getContext = () => ({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData() {}, clearRect() {}, drawImage() { l.dibujos++ },
    })
    return l
  }
  const destino = lienzo()
  const chico = lienzo()
  const n = crearNiebla(640, 480)
  for (let i = 0; i < 20; i++) { pintar(n, i / 20, 0.5, 0.05, false); dibujarNiebla(destino, chico, n) }
  assert.equal(destino.cambios, 2, 'ancho y alto una sola vez')
  assert.equal(chico.cambios, 2)
  assert.equal(destino.dibujos, 20, 'pero sí se vuelve a pintar cada vez')
  assert.deepEqual([destino.width, destino.height], [n.c * 8, n.f * 8])
})
