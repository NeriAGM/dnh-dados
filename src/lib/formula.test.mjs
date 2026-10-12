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

test('fórmulas: casos de orilla', () => {
  // Mayúsculas, espacios y "d20" sin cantidad
  assert.deepEqual(leerFormula(' 2D6 + 1d4 - 1 ').grupos.map((g) => [g.cantidad, g.lados, g.signo]), [[2, 6, 1], [1, 4, 1]])
  assert.equal(leerFormula('2d6+1d4-1').modificador, -1)
  assert.deepEqual(leerFormula('D20').grupos, [{ lados: 20, cantidad: 1, rol: 'normal', signo: 1 }])
  // Un grupo restado y un modificador negativo
  const f = leerFormula('-1d6-2')
  assert.equal(f.grupos[0].signo, -1)
  assert.equal(f.modificador, -2)
  // Antes "2d6 3" se leía como 2d63 sin avisar
  assert.ok(leerFormula('2d6 3').error)
  assert.ok(leerFormula('1d20 1d6').error)
  assert.ok(!leerFormula('2 d6').error, 'el espacio entre número y d sí se acepta')
  // Topes iguales a los del servidor: 30 por grupo, 40 por tirada, modificador ±999
  assert.ok(!leerFormula('30d6').error)
  assert.ok(leerFormula('31d6').error)
  assert.ok(leerFormula('0d6').error)
  assert.ok(!leerFormula('30d6+10d6').error)
  assert.ok(leerFormula('30d6+11d6').error, 'el servidor rechaza más de 40 dados; el modo de prueba se congelaba')
  assert.ok(!leerFormula('1d6+999').error)
  assert.ok(leerFormula('1d6+1000').error)
  assert.ok(leerFormula('1d6+99999999999999999999').error)
  // Signos sueltos o dobles
  assert.ok(leerFormula('2d6+').error)
  assert.ok(leerFormula('2d6+-3').error)
  assert.ok(leerFormula('2d').error)
  assert.ok(leerFormula('d1').error)
})

test('dificultad: vacía, borrada, decimal o enorme', async () => {
  const { leerDificultad } = await import('./formula.js')
  assert.equal(leerDificultad(''), null)
  assert.equal(leerDificultad(null), null, 'un número borrado en el campo da null: antes quedaba en 0')
  assert.equal(leerDificultad(undefined), null)
  assert.equal(leerDificultad(12), 12)
  assert.equal(leerDificultad('15'), 15)
  assert.equal(leerDificultad(12.6), 13, 'el servidor solo acepta enteros')
  assert.equal(leerDificultad(1e12), 999)
  assert.equal(leerDificultad(NaN), null)
})
