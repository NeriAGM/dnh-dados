// Ajustes de campaña (migración 006): solo el DJ cambia las reglas de la
// mesa, todos los miembros las leen y la escena respeta "mostrarEntorno".

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparar, U } from './base.mjs'
import { ajustesDe } from '../../src/lib/ajustes.js'

const { db, como, camp } = await preparar()
const ajustesEnBase = async () => (await db.query(`select ajustes from campanias where id = $1`, [camp.id])).rows[0].ajustes

test('una campaña nueva empieza sin ajustes (todo por defecto)', async () => {
  assert.deepEqual(await ajustesEnBase(), {})
  assert.equal(ajustesDe({ ajustes: await ajustesEnBase() }).danoMasivo, false)
})

test('el DJ guarda ajustes y se mezclan con los que había', async () => {
  let r = await como(U.dj, `select guardar_ajustes($1, $2::jsonb) as a`, [camp.id, JSON.stringify({ danoMasivo: true })])
  assert.ok(!r.error, r.error)
  assert.deepEqual(r.filas[0].a, { danoMasivo: true })
  r = await como(U.dj, `select guardar_ajustes($1, $2::jsonb) as a`, [camp.id, JSON.stringify({ monedas: true })])
  assert.deepEqual(r.filas[0].a, { danoMasivo: true, monedas: true })
  assert.deepEqual(await ajustesEnBase(), { danoMasivo: true, monedas: true })
})

test('un null borra la llave y "reemplazar" los cambia todos', async () => {
  let r = await como(U.dj, `select guardar_ajustes($1, $2::jsonb) as a`, [camp.id, JSON.stringify({ monedas: null })])
  assert.deepEqual(r.filas[0].a, { danoMasivo: true })
  r = await como(U.dj, `select guardar_ajustes($1, $2::jsonb, true) as a`, [camp.id, JSON.stringify({ mostrarEntorno: true })])
  assert.deepEqual(r.filas[0].a, { mostrarEntorno: true })
})

test('los jugadores leen los ajustes de su campaña', async () => {
  const r = await como(U.ana, `select ajustes from campanias where id = $1`, [camp.id])
  assert.deepEqual(r.filas, [{ ajustes: { mostrarEntorno: true } }])
})

test('un jugador no puede cambiar los ajustes', async () => {
  const r = await como(U.ana, `select guardar_ajustes($1, $2::jsonb)`, [camp.id, JSON.stringify({ danoMasivo: false })])
  assert.match(r.error, /Solo el DJ/)
  // Tampoco directo en la tabla: no tiene permiso de editar la campaña
  await como(U.ana, `update campanias set ajustes = '{"danoMasivo":false}' where id = $1`, [camp.id])
  assert.deepEqual(await ajustesEnBase(), { mostrarEntorno: true })
})

test('alguien de fuera ni los ve ni los cambia', async () => {
  const r = await como(U.intruso, `select guardar_ajustes($1, $2::jsonb)`, [camp.id, JSON.stringify({ danoMasivo: true })])
  assert.match(r.error, /Solo el DJ/)
  assert.deepEqual((await como(U.intruso, `select ajustes from campanias where id = $1`, [camp.id])).filas, [])
  assert.deepEqual(await ajustesEnBase(), { mostrarEntorno: true })
})

test('se rechazan ajustes inválidos o demasiado grandes', async () => {
  const guardar = (p) => como(U.dj, `select guardar_ajustes($1, $2::jsonb)`, [camp.id, p])
  assert.match((await guardar('[1, 2]')).error, /objeto/)
  assert.match((await guardar('"hola"')).error, /objeto/)
  assert.match((await guardar(JSON.stringify({ danoMasivo: { anidado: true } }))).error, /sí\/no, número o texto/)
  assert.match((await guardar(JSON.stringify({ nota: 'x'.repeat(300) }))).error, /demasiado largo/)
  const enorme = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`ajuste${i}`, 'x'.repeat(30)]))
  assert.match((await guardar(JSON.stringify(enorme))).error, /demasiado grandes/)
  // Ni siquiera el DJ puede saltarse el límite escribiendo directo en la tabla
  const directo = await como(U.dj, `update campanias set ajustes = $2::jsonb where id = $1`, [camp.id, JSON.stringify(enorme)])
  assert.match(directo.error, /campanias_ajustes_validos/)
  const lista = await como(U.dj, `update campanias set ajustes = '[]' where id = $1`, [camp.id])
  assert.match(lista.error, /campanias_ajustes_validos/)
  assert.deepEqual(await ajustesEnBase(), { mostrarEntorno: true })
})

test('con "mostrarEntorno" apagado la escena no lleva el entorno', async () => {
  const r = await como(U.dj, `insert into encuentros (campania_id, nombre, entorno_nombre, adversarios) values ($1, 'Puente', 'Río crecido', $2::jsonb) returning id`,
    [camp.id, JSON.stringify([{ uid: 'a', ref: 'bear', nombre: 'Oso', tipo: 'bruto', pg: 0, pg_max: 6, oculto: false }])])
  await como(U.dj, `select activar_encuentro($1)`, [r.filas[0].id])
  const entornoDeAna = async () => (await como(U.ana, `select entorno from escenas`)).filas[0]?.entorno
  assert.equal(await entornoDeAna(), 'Río crecido')

  await como(U.dj, `select guardar_ajustes($1, '{"mostrarEntorno": false}'::jsonb)`, [camp.id])
  assert.equal(await entornoDeAna(), null, 'al apagarlo, la escena se vuelve a armar sin entorno')
  await como(U.dj, `update encuentros set nombre = 'Puente roto' where id = $1`, [r.filas[0].id])
  assert.equal(await entornoDeAna(), null, 'y sigue sin entorno cuando el encuentro cambia')

  await como(U.dj, `select guardar_ajustes($1, '{"mostrarEntorno": true}'::jsonb)`, [camp.id])
  assert.equal(await entornoDeAna(), 'Río crecido')
})
