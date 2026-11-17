import { test } from 'node:test'
import assert from 'node:assert/strict'
import { medirLienzo } from './medir.js'

// Lienzo de muestra falso: sin navegador, lo justo para medir
function simular() {
  let dibujos = 0
  globalThis.innerWidth = 100
  globalThis.innerHeight = 50
  globalThis.document = {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({
        drawImage: () => { dibujos++ },
        getImageData: () => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) }),
      }),
    }),
  }
  return () => dibujos
}

test('un lienzo de tamaño 0 no truena y no se mide (devuelve null)', () => {
  const dibujos = simular()
  assert.equal(medirLienzo({ width: 0, height: 0 }), null)
  assert.equal(medirLienzo({ width: 300, height: 0 }), null)
  assert.equal(medirLienzo({ width: 0, height: 200 }), null)
  assert.equal(dibujos(), 0)
})

test('un lienzo con tamaño sí se mide', () => {
  const dibujos = simular()
  const b = medirLienzo({ width: 300, height: 200 })
  assert.equal(dibujos(), 1)
  assert.ok(b > 0.9)
})
