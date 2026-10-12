import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearCola } from './cola.js'

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

test('cola: las escrituras van en orden aunque la primera tarde más', async () => {
  const cola = crearCola()
  const orden = []
  // Simula el servidor: la primera respuesta tarda más que la segunda
  const a = cola.agregar(async () => { await esperar(30); orden.push('a') })
  const b = cola.agregar(async () => { await esperar(1); orden.push('b') })
  assert.equal(cola.vacia, false)
  await Promise.all([a, b])
  assert.deepEqual(orden, ['a', 'b'])
  assert.equal(cola.vacia, true)
})

test('cola: un error no detiene a las que siguen y sí llega a quien lo pidió', async () => {
  const cola = crearCola()
  const a = cola.agregar(async () => { throw new Error('sin red') })
  const b = cola.agregar(async () => 'ok')
  await assert.rejects(a, /sin red/)
  assert.equal(await b, 'ok')
  assert.equal(cola.vacia, true)
})

test('cola: dos "+1 Estrés" rápidos suman 2 si cada uno parte del valor pendiente', async () => {
  // Así lo usa la tarjeta del personaje: el valor nuevo se calcula del último
  // pedido (no del que aún no contesta el servidor) y se guarda en orden.
  const servidor = { estres: 0 }
  let pendiente = null
  const cola = crearCola()
  const marcar = () => {
    const nuevo = (pendiente ?? servidor.estres) + 1
    pendiente = nuevo
    return cola.agregar(async () => { await esperar(5); servidor.estres = nuevo })
      .finally(() => { if (cola.vacia) pendiente = null })
  }
  await Promise.all([marcar(), marcar()])
  assert.equal(servidor.estres, 2)
})
