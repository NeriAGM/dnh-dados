import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AJUSTES, AJUSTES_POR_DEFECTO, ajustesDe, limpiarAjustes } from './ajustes.js'

test('por defecto: daño masivo y monedas apagados, entorno visible', () => {
  assert.deepEqual(AJUSTES_POR_DEFECTO, { danoMasivo: false, monedas: false, mostrarEntorno: true })
  assert.deepEqual(ajustesDe(null), AJUSTES_POR_DEFECTO)
  assert.deepEqual(ajustesDe({}), AJUSTES_POR_DEFECTO)
  assert.deepEqual(ajustesDe({ ajustes: {} }), AJUSTES_POR_DEFECTO)
})

test('lo guardado gana sobre el valor por defecto', () => {
  const a = ajustesDe({ ajustes: { danoMasivo: true, mostrarEntorno: false } })
  assert.equal(a.danoMasivo, true)
  assert.equal(a.mostrarEntorno, false)
  assert.equal(a.monedas, false)
})

test('se ignoran llaves desconocidas y tipos raros', () => {
  assert.deepEqual(limpiarAjustes({ danoMasivo: 'sí', monedas: 1, otra: true, mostrarEntorno: false }), { mostrarEntorno: false })
  assert.deepEqual(limpiarAjustes([true]), {})
  assert.deepEqual(limpiarAjustes('x'), {})
  assert.deepEqual(ajustesDe({ ajustes: null }), AJUSTES_POR_DEFECTO)
})

test('cada ajuste tiene nombre y descripción en español', () => {
  for (const a of AJUSTES) {
    assert.ok(a.nombre && a.descripcion, a.id)
    assert.equal(typeof a.porDefecto, 'boolean')
  }
  const masivo = AJUSTES.find((a) => a.id === 'danoMasivo')
  assert.match(masivo.descripcion, /doble del umbral Grave/)
})
