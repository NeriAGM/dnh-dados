import { test } from 'node:test'
import assert from 'node:assert/strict'
import { descendencia, ruta, ocultaPor, hijasDe, microsegundos, esMasVieja, ponerFila } from './loreFilas.js'

const arbol = [
  { id: 'a', padre_id: null, titulo: 'A', orden: 20, visible: true },
  { id: 'b', padre_id: 'a', titulo: 'B', orden: 10, visible: false },
  { id: 'c', padre_id: 'b', titulo: 'C', orden: 10, visible: true },
  { id: 'd', padre_id: null, titulo: 'D', orden: 10, visible: true },
]

test('árbol: descendencia, ruta, quién la oculta y orden de hermanas', () => {
  assert.deepEqual([...descendencia(arbol, 'a')].sort(), ['a', 'b', 'c'])
  assert.deepEqual(ruta(arbol, 'c').map((p) => p.id), ['a', 'b'])
  assert.equal(ocultaPor(arbol, 'c').id, 'b')
  assert.equal(ocultaPor(arbol, 'd'), null)
  assert.deepEqual(hijasDe(arbol, null).map((p) => p.id), ['d', 'a'])
  // Un ciclo en los datos no cuelga la ruta
  assert.deepEqual(ruta([{ id: 'x', padre_id: 'y' }, { id: 'y', padre_id: 'x' }], 'x').length, 2)
})

test('marcas de tiempo de Postgres con microsegundos', () => {
  const a = microsegundos('2026-10-12T15:04:05.123456+00:00')
  const b = microsegundos('2026-10-12T15:04:05.123457+00:00')
  assert.equal(b - a, 1)
  assert.equal(microsegundos('2026-10-12 15:04:05.123456+00'), a)
  assert.equal(microsegundos('2026-10-12T10:04:05.123456-05:00'), a)
  assert.equal(microsegundos('2026-10-12T15:04:05.123Z'), a - 456)
  assert.equal(microsegundos('ayer'), null)
  assert.equal(esMasVieja({ actualizado: 'x' }, { actualizado: '2026-10-12T15:04:05Z' }), false)
})

test('un eco atrasado del tiempo real no regresa la página a un texto viejo', () => {
  const t1 = '2026-10-12T15:04:05.100000+00:00'
  const t2 = '2026-10-12T15:04:05.900000+00:00'
  // Ya está lo del segundo guardado; llega tarde el eco del primero
  const ahora = [{ id: 'p', titulo: 'Pozo', contenido: 'AB', actualizado: t2 }]
  assert.equal(ponerFila(ahora, { id: 'p', contenido: 'A', actualizado: t1 }), ahora)
  // Lo más nuevo sí entra
  assert.equal(ponerFila(ahora, { id: 'p', contenido: 'ABC', actualizado: '2026-10-12T15:04:06+00:00' })[0].contenido, 'ABC')
})

test('una página revelada que llega sin contenido conserva el que había', () => {
  const ahora = [{ id: 'p', titulo: 'Pozo', contenido: 'texto', visible: false, actualizado: '2026-10-12T15:00:00+00:00' }]
  const r = ponerFila(ahora, { id: 'p', titulo: 'Pozo', visible: true, actualizado: '2026-10-12T15:01:00+00:00' })
  assert.equal(r[0].contenido, 'texto')
  assert.equal(r[0].visible, true)
  // Si no la tenía, entra tal cual (sin contenido: la app la pide completa)
  const n = ponerFila([], { id: 'q', titulo: 'Nueva', visible: true })
  assert.equal(n.length, 1)
  assert.equal(n[0].contenido, undefined)
})
