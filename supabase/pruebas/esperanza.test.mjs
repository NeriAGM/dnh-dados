// Gastar Esperanza en una Experiencia (migración 013): la resta el servidor.
// Antes la app mandaba «esperanza = lo que yo veía − costo» y una ganancia
// que llegara al mismo tiempo (una tirada con Esperanza) se perdía.
//
// Correr:  npm run probar

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparar, U } from './base.mjs'

const { db, como, pj } = await preparar()

const ponerEsperanza = (n) => db.query('update personajes set esperanza = $2 where id = $1', [pj.id, n])
const esperanza = async () => (await db.query('select esperanza from personajes where id = $1', [pj.id])).rows[0].esperanza
const gastar = (uid, cantidad, id = pj.id) => como(uid, 'select * from gastar_esperanza($1, $2)', [id, cantidad])

test('el dueño gasta su Esperanza y recibe la fila al día', async () => {
  await ponerEsperanza(3)
  const r = await gastar(U.ana, 2)
  assert.equal(r.error, undefined, r.error)
  assert.equal(r.filas[0].esperanza, 1)
  assert.equal(await esperanza(), 1)
})

test('resta sobre lo que hay en el servidor: una ganancia de mientras no se pierde', async () => {
  // La app de Ana veía 2, pero una tirada con Esperanza ya la subió a 3
  await ponerEsperanza(3)
  await gastar(U.ana, 1)
  assert.equal(await esperanza(), 2)
})

test('sin Esperanza suficiente no gasta nada', async () => {
  await ponerEsperanza(1)
  const r = await gastar(U.ana, 2)
  assert.match(r.error, /Te falta Esperanza/)
  assert.equal(await esperanza(), 1)
})

test('cantidades raras (cero, negativas o nulas) se rechazan', async () => {
  await ponerEsperanza(2)
  for (const n of [0, -3, null]) {
    const r = await gastar(U.ana, n)
    assert.match(r.error ?? '', /cantidad/i, `cantidad ${n}`)
  }
  assert.equal(await esperanza(), 2)
})

test('el DJ también puede; alguien de fuera no', async () => {
  await ponerEsperanza(2)
  assert.equal((await gastar(U.dj, 1)).error, undefined)
  assert.match((await gastar(U.intruso, 1)).error, /Solo el dueño del personaje o el DJ/)
  assert.equal(await esperanza(), 1)
})

test('un personaje que no existe avisa', async () => {
  const r = await gastar(U.ana, 1, '00000000-0000-0000-0000-000000000000')
  assert.match(r.error, /no existe/)
})

test('sin sesión no se puede llamar', async () => {
  const { rows } = await db.query(`select has_function_privilege('anon', 'public.gastar_esperanza(uuid, int)', 'execute') as anon,
    has_function_privilege('authenticated', 'public.gastar_esperanza(uuid, int)', 'execute') as auth`)
  assert.deepEqual(rows[0], { anon: false, auth: true })
})
