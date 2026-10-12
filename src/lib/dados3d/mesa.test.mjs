import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cuadroEn, indiceCuadro } from './mesa.js'

test('dados: el cuadro nunca es negativo aunque el navegador dé una hora anterior al inicio', () => {
  // El error real: requestAnimationFrame entregó un tiempo 3 ms antes del inicio
  assert.equal(cuadroEn(1000 - 3, 1000), 0)
  assert.equal(cuadroEn(1000, 1000), 0)
  assert.equal(cuadroEn(1000 + 1000, 1000), 60, 'un segundo = 60 cuadros')
})

test('dados: el índice de la grabación siempre cae dentro de ella', () => {
  assert.equal(indiceCuadro(-1, 100), 0)
  assert.equal(indiceCuadro(250, 100), 99)
  assert.equal(indiceCuadro(NaN, 100), 0)
  assert.equal(indiceCuadro(42, 100), 42)
})
