import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estadoDe, escenaDe, completarInstancia, leFalta } from './escena.js'

test('estado según los PG marcados', () => {
  assert.equal(estadoDe(0, 6), 'ileso')
  assert.equal(estadoDe(2, 6), 'herido')
  assert.equal(estadoDe(3, 6), 'grave')
  assert.equal(estadoDe(6, 6), 'caido')
  assert.equal(estadoDe(2, undefined), null)
  assert.equal(estadoDe('x', 4), 'ileso')
})

test('la escena quita ocultos y nunca lleva números', () => {
  const e = escenaDe({ id: 'e1', nombre: 'Puente', entorno_nombre: 'Río', adversarios: [
    { uid: 'a', ref: 'bear', nombre: '', nombre_base: 'Oso', tipo: 'bruto', pg: 1, pg_max: 7 },
    { uid: 'b', ref: 'bear', nombre: 'Escondido', nombre_base: 'Oso', tipo: 'bruto', pg: 0, pg_max: 7, oculto: true },
  ] })
  assert.deepEqual(e, { encuentro_id: 'e1', nombre: 'Puente', entorno: 'Río', adversarios: [{ uid: 'a', nombre: 'Oso', tipo: 'bruto', estado: 'herido' }] })
  assert.equal(escenaDe({ nombre: 'Sorpresa', adversarios: [{ uid: 'x', oculto: true }] }), null)
  assert.equal(escenaDe(null), null)
})

test('con mostrarEntorno apagado la escena no lleva el entorno', () => {
  const enc = { id: 'e1', nombre: 'Puente', entorno_nombre: 'Río', adversarios: [{ uid: 'a', nombre: 'Oso', pg: 0, pg_max: 7 }] }
  assert.equal(escenaDe(enc, { mostrarEntorno: false }).entorno, null)
  assert.equal(escenaDe(enc, { mostrarEntorno: true }).entorno, 'Río')
})

test('completar una instancia con el catálogo', () => {
  const adv = { id: 'bear', nombre: 'Oso', tipo: 'bruto', pg: 7 }
  const viejo = { uid: 'a', ref: 'bear', nombre: '', pg: 2, estres: 0 }
  assert.ok(leFalta(viejo, adv))
  const nuevo = completarInstancia(viejo, adv)
  assert.deepEqual(nuevo, { ...viejo, nombre_base: 'Oso', tipo: 'bruto', pg_max: 7, oculto: false })
  assert.ok(!leFalta(nuevo, adv))
  assert.equal(completarInstancia(viejo, null), viejo)
})

test('una Horda a la mitad de sus PG pega con el daño reducido', async () => {
  const { danoActual } = await import('./escena.js')
  const zombis = { tipo: 'horda', pg: 6, ataque: { dano: { dados: 1, lados: 10, mod: 2, tipo: 'fisico' } },
    rasgos: [{ nombre: 'Horda (1d4+2)', clase: 'pasiva' }] }
  assert.deepEqual(danoActual(zombis, { pg: 2 }), zombis.ataque.dano)
  assert.deepEqual(danoActual(zombis, { pg: 3 }), { dados: 1, lados: 4, mod: 2, tipo: 'fisico', horda: true })
  assert.equal(danoActual({ ...zombis, rasgos: [{ nombre: 'Horde (2d6-1)' }] }, { pg: 6 }).mod, -1)
  // Sin instancia (bestiario) o sin el rasgo: el daño normal
  assert.deepEqual(danoActual(zombis, null), zombis.ataque.dano)
  assert.deepEqual(danoActual({ ...zombis, rasgos: [] }, { pg: 6 }), zombis.ataque.dano)
  assert.deepEqual(danoActual({ ...zombis, tipo: 'bruto' }, { pg: 6 }), zombis.ataque.dano)
})
