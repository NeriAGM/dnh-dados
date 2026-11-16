import { test } from 'node:test'
import assert from 'node:assert/strict'
import { caminoQR } from './qr.js'

test('QR del link de invitación: cuadrado con margen y esquina de búsqueda', () => {
  const { lado, d } = caminoQR('https://neriagm.github.io/dnh-dados/?unirme=HK7P-M4XR')
  // Versión 3 o 4 (29 o 33 módulos) más 4 de margen por lado
  assert.ok([37, 41].includes(lado), `lado ${lado}`)
  // El patrón de búsqueda de arriba a la izquierda empieza oscuro en (4, 4)
  assert.ok(d.startsWith('M4 4h1v1h-1z'))
  // Textos distintos, QR distintos
  assert.notEqual(d, caminoQR('https://neriagm.github.io/dnh-dados/?unirme=ABCD-EFGH').d)
})
