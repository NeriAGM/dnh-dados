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
