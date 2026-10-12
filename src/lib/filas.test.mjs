import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fusionarFila } from './filas.js'

test('tiempo real: si no llega la hoja, se conserva la que ya estaba', () => {
  const vieja = { id: 'v', nombre: 'Valerius', esperanza: 3, hoja: { nivel: 2, armas: [{ nombre: 'Estoque' }] } }
  // Lo que manda Supabase tras una tirada: solo lo que cambió, sin la hoja (columna grande)
  const nueva = { id: 'v', nombre: 'Valerius', esperanza: 4 }
  const r = fusionarFila(vieja, nueva)
  assert.equal(r.esperanza, 4)
  assert.deepEqual(r.hoja, vieja.hoja)
})

test('tiempo real: si la hoja sí cambió, gana la nueva; si no había fila, se usa la nueva', () => {
  assert.equal(fusionarFila({ id: 1, hoja: { nivel: 1 } }, { id: 1, hoja: { nivel: 2 } }).hoja.nivel, 2)
  assert.deepEqual(fusionarFila(null, { id: 2 }), { id: 2 })
})

test('esMasVieja: solo descarta si las dos traen "actualizado" y la nueva es anterior', async () => {
  const { esMasVieja } = await import('./filas.js')
  const t1 = '2026-10-12T10:00:01.123456+00:00', t2 = '2026-10-12T10:00:02+00:00'
  assert.equal(esMasVieja({ actualizado: t1 }, { actualizado: t2 }), true)
  assert.equal(esMasVieja({ actualizado: t2 }, { actualizado: t1 }), false)
  assert.equal(esMasVieja({ actualizado: t1 }, { actualizado: t1 }), false)
  assert.equal(esMasVieja({ esperanza: 3 }, { actualizado: t2 }), false)
  assert.equal(esMasVieja({ actualizado: 'basura' }, { actualizado: t2 }), false)
})

test('crearColas: misma clave en orden, "ultima" y se libera al terminar (aunque falle)', async () => {
  const { crearColas } = await import('./filas.js')
  const colas = crearColas()
  const orden = []
  const a = colas.poner('k', async () => { await new Promise((r) => setTimeout(r, 10)); orden.push(['a', colas.ultima('k')]); throw new Error('falla a') })
  const b = colas.poner('k', async () => { orden.push(['b', colas.ultima('k')]) })
  assert.equal(colas.ocupada('k'), true)
  await assert.rejects(a, /falla a/)
  await b
  assert.deepEqual(orden, [['a', false], ['b', true]])
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(colas.ocupada('k'), false)
})

test('ponerEnRuta: crea lo que falta, no toca el original y con undefined quita', async () => {
  const { ponerEnRuta } = await import('./filas.js')
  const hoja = { armas: [{ nombre: 'Arco' }], rasgos: { fuerza: 1 } }
  const r = ponerEnRuta(hoja, ['inventario', '0', 'nombre'], 'Cuerda')
  assert.deepEqual(r.inventario, [{ nombre: 'Cuerda' }])
  assert.equal(hoja.inventario, undefined)
  assert.deepEqual(ponerEnRuta(hoja, ['armas', '0'], undefined).armas, [])
  assert.deepEqual(ponerEnRuta(hoja, ['rasgos', 'fuerza'], undefined).rasgos, {})
  assert.deepEqual(ponerEnRuta(hoja, ['no', 'existe'], undefined), hoja)
})
