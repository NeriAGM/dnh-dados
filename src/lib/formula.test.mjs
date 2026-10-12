import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leerFormula } from './formula.js'
import { poliedro } from './dados3d/poliedros.js'

test('lee fórmulas comunes', () => {
  assert.deepEqual(leerFormula('2d8+3'), { grupos: [{ lados: 8, cantidad: 2, rol: 'normal', signo: 1 }], modificador: 3 })
  assert.deepEqual(leerFormula('d20 - 1'), { grupos: [{ lados: 20, cantidad: 1, rol: 'normal', signo: 1 }], modificador: -1 })
  const f = leerFormula('1d12 + 1d12 - 1d6 + 2')
  assert.equal(f.grupos.length, 3)
  assert.equal(f.grupos[2].signo, -1)
  assert.equal(f.modificador, 2)
})

test('rechaza lo que no entiende', () => {
  assert.ok(leerFormula('').error)
  assert.ok(leerFormula('hola').error)
  assert.ok(leerFormula('5').error, 'sin dados no hay tirada')
  assert.ok(leerFormula('2d1000').error)
})

test('cada dado tiene las caras y números correctos', () => {
  for (const n of [6, 8, 10, 12, 20]) {
    const p = poliedro(n)
    assert.equal(p.caras.length, n)
    assert.deepEqual([...p.valores].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i + 1))
  }
  assert.equal(poliedro(4).caras.length, 4)
})
