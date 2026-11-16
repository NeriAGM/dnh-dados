// Pruebas de las reglas puras de los fondos.  Correr:  npm run probar
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  fondoInicial, normalizar, olvidarImagen, validarArchivo, nombreSeguro,
  luminanciaDe, luminanciaEfectiva, variablesLegibilidad, estiloModo, MAX_BYTES,
} from './ajustes.js'

test('por defecto cada momento usa el pueblo animado de ese momento', () => {
  const f = fondoInicial()
  assert.deepEqual(f.tablero, { amanecer: 'pueblo:amanecer', dia: 'pueblo:dia', atardecer: 'pueblo:atardecer', noche: 'pueblo:noche' })
  assert.equal(f.vidrio, 50)
  assert.equal(f.tono, 0)
})

test('normalizar limpia basura y respeta límites de las barras', () => {
  const f = normalizar({ tablero: { dia: 'u/1-x.png', noche: 'pueblo:mediodia', amanecer: 42 }, modos: { 'u/1-x.png': 'mosaico', otro: 'girar' }, tono: 999, oscurecer: -5, contraste: 'abc' })
  assert.equal(f.tablero.dia, 'u/1-x.png')
  assert.equal(f.tablero.noche, 'pueblo:noche', 'pueblo inventado se descarta')
  assert.equal(f.tablero.amanecer, 'pueblo:amanecer')
  assert.deepEqual(f.modos, { 'u/1-x.png': 'mosaico' })
  assert.equal(f.tono, 180)
  assert.equal(f.oscurecer, 0)
  assert.equal(f.contraste, 100)
  assert.deepEqual(normalizar(null), fondoInicial())
  assert.deepEqual(normalizar([1]), fondoInicial())
})

test('olvidar una imagen regresa sus casillas al pueblo', () => {
  const f = olvidarImagen({ tablero: { dia: 'u/a.png', noche: 'u/a.png' }, modos: { 'u/a.png': 'centrar' } }, 'u/a.png')
  assert.equal(f.tablero.dia, 'pueblo:dia')
  assert.equal(f.tablero.noche, 'pueblo:noche')
  assert.deepEqual(f.modos, {})
})

test('validarArchivo: solo imágenes, máximo 5 MB y 10 por jugador', () => {
  assert.equal(validarArchivo({ type: 'image/png', size: 1000 }, 0), '')
  assert.equal(validarArchivo({ type: 'image/gif', size: MAX_BYTES }, 9), '')
  assert.match(validarArchivo({ type: 'video/mp4', size: 10 }), /Solo se aceptan imágenes/)
  assert.match(validarArchivo({ type: 'image/svg+xml', size: 10 }), /Solo se aceptan imágenes/)
  assert.match(validarArchivo({ type: 'image/jpeg', size: MAX_BYTES + 1 }), /máximo es 5 MB/)
  assert.match(validarArchivo({ type: 'image/jpeg', size: 10 }, 10), /Ya tienes 10/)
})

test('nombreSeguro quita acentos, espacios y rutas', () => {
  assert.equal(nombreSeguro('Mi Pueblo Ñoño (1).PNG'), 'mi-pueblo-nono-1-.png')
  assert.equal(nombreSeguro('../../etc/passwd'), 'etc-passwd')
  assert.equal(nombreSeguro('???'), 'fondo')
})

test('luminancia: negro 0, blanco 1, amarillo muy claro', () => {
  const pix = (r, g, b) => new Uint8ClampedArray([r, g, b, 255, r, g, b, 255])
  assert.equal(luminanciaDe(pix(0, 0, 0)), 0)
  assert.ok(Math.abs(luminanciaDe(pix(255, 255, 255)) - 1) < 1e-9)
  assert.ok(luminanciaDe(pix(255, 230, 80)) > 0.8)
})

test('oscurecer y contraste bajan el brillo efectivo', () => {
  assert.equal(luminanciaEfectiva(0.8, { contraste: 100, oscurecer: 0 }), 0.8)
  assert.ok(luminanciaEfectiva(0.8, { contraste: 100, oscurecer: 50 }) < 0.41)
  assert.ok(luminanciaEfectiva(0.8, { contraste: 50, oscurecer: 0 }) < 0.8)
})

test('legibilidad: el vidrio claro se hace más blanco sobre un fondo oscuro', () => {
  const oscuro = variablesLegibilidad(0.12, fondoInicial())
  const claro = variablesLegibilidad(0.95, fondoInicial())
  assert.equal(oscuro.nivel, 'oscuro')
  assert.equal(claro.nivel, 'claro')
  assert.ok(Number(oscuro.vars['--vidrio-alfa']) > Number(claro.vars['--vidrio-alfa']) + 0.15)
  // Con vidrio al 50 % y fondo claro: 0.68 de blanco y 26 px de desenfoque
  assert.equal(claro.vars['--vidrio-alfa'], '0.68')
  assert.equal(claro.vars['--vidrio-desenfoque'], '26px')
  // Nunca transparente del todo ni opaco del todo
  assert.ok(Number(variablesLegibilidad(1, { vidrio: 0 }).vars['--vidrio-alfa']) >= 0.5)
  assert.ok(Number(variablesLegibilidad(0, { vidrio: 100 }).vars['--vidrio-alfa']) <= 0.95)
  // La sombra del texto sobre el paisaje se refuerza en fondos claros
  assert.notEqual(claro.vars['--sombra-texto'], oscuro.vars['--sombra-texto'])
})

test('modos de ajuste', () => {
  assert.equal(estiloModo('cubrir').size, 'cover')
  assert.equal(estiloModo('ajustar').size, 'contain')
  assert.equal(estiloModo('estirar').size, '100% 100%')
  assert.equal(estiloModo('mosaico').repeat, 'repeat')
  assert.equal(estiloModo('raro').size, 'cover')
})
