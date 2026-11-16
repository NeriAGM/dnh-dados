// Migración 012: código de invitación largo, cambiar código (solo el DJ) y
// límite de códigos equivocados al unirse.
//
// Correr:  npm run probar

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { preparar, U } from './base.mjs'

const SQL = fs.readFileSync(new URL('../migraciones/012_invitacion.sql', import.meta.url), 'utf8')
const { db, como, camp } = await preparar()
const FORMATO = /^[23456789ABCDEFGHJKMNPQRSTUWXYZ]{8}$/

const comoAnon = async (q, params) => {
  await db.exec(`set role anon; select set_config('test.uid', '', false);`)
  try { return { filas: (await db.query(q, params)).rows } }
  catch (e) { return { error: e.message } }
  finally { await db.exec('reset role') }
}
const unirse = (uid, codigo) => como(uid, `select * from unirse_campania($1)`, [codigo])
const codigoActual = async () => (await db.query(`select codigo_invitacion as c from campanias where id = $1`, [camp.id])).rows[0].c
const esMiembro = async (uid) => (await db.query(`select 1 from miembros where campania_id = $1 and usuario_id = $2`, [camp.id, uid])).rows.length > 0
const sacar = (uid) => db.query(`delete from miembros where campania_id = $1 and usuario_id = $2`, [camp.id, uid])
const olvidarIntentos = () => db.exec(`delete from intentos_union`)

test('el código nuevo tiene 8 caracteres sin los que se confunden', async () => {
  assert.match(camp.codigo_invitacion, FORMATO)
  // Muchos códigos: ninguno trae 0, O, 1, I, L ni V
  const { rows: [r] } = await db.query(`select string_agg(public.nuevo_codigo(), '') as todo from generate_series(1, 300)`)
  assert.doesNotMatch(r.todo, /[01OILV]/)
  assert.equal(r.todo.length, 2400)
})

test('se puede escribir con minúsculas, espacios y guion (como en el link)', async () => {
  await sacar(U.intruso)
  const c = camp.codigo_invitacion
  const r = await unirse(U.intruso, ` ${c.slice(0, 4).toLowerCase()}-${c.slice(4)} `)
  assert.equal(r.filas[0].id, camp.id)
  assert.ok(await esMiembro(U.intruso))
  await sacar(U.intruso)
})

test('código equivocado: regresa vacío (la app dice el mensaje) y no une', async () => {
  await olvidarIntentos()
  const r = await unirse(U.intruso, 'ZZZZ-ZZZZ')
  assert.equal(r.error, undefined)
  assert.equal(r.filas[0].id, null)
  assert.equal(await esMiembro(U.intruso), false)
})

test('solo el DJ cambia el código; el anterior deja de servir', async () => {
  await olvidarIntentos()
  const viejo = await codigoActual()
  assert.match((await como(U.ana, `select cambiar_codigo($1)`, [camp.id])).error ?? '', /Solo el DJ/)
  assert.match((await como(U.intruso, `select cambiar_codigo($1)`, [camp.id])).error ?? '', /Solo el DJ/)
  assert.ok((await comoAnon(`select cambiar_codigo($1)`, [camp.id])).error, 'anon no la ejecuta')
  assert.equal(await codigoActual(), viejo)

  const r = await como(U.dj, `select cambiar_codigo($1) as c`, [camp.id])
  const nuevo = r.filas[0].c
  assert.match(nuevo, FORMATO)
  assert.notEqual(nuevo, viejo)
  assert.equal(await codigoActual(), nuevo)

  // Al que sacaron ya no le sirve el código viejo; el nuevo sí une
  await sacar(U.ana)
  assert.equal((await unirse(U.ana, viejo)).filas[0].id, null)
  assert.equal(await esMiembro(U.ana), false)
  assert.equal((await unirse(U.ana, nuevo)).filas[0].id, camp.id)
  assert.ok(await esMiembro(U.ana))
})

test('a los 10 códigos equivocados en una hora se bloquea (hasta el correcto)', async () => {
  await olvidarIntentos()
  for (let i = 0; i < 10; i++) {
    const r = await unirse(U.intruso, `AAAA${String(2222 + i)}`)
    assert.equal(r.filas?.[0]?.id, null, `intento ${i + 1}`)
  }
  const bloqueado = await unirse(U.intruso, await codigoActual())
  assert.match(bloqueado.error ?? '', /Demasiados/)
  assert.equal(await esMiembro(U.intruso), false)
  // El límite es por usuario: a Ana no le afecta
  assert.equal((await unirse(U.ana, await codigoActual())).filas[0].id, camp.id)
  // Pasada la hora, ya puede
  await db.exec(`update intentos_union set momento = now() - interval '61 minutes'`)
  assert.equal((await unirse(U.intruso, await codigoActual())).filas[0].id, camp.id)
  // Y los intentos viejos se limpian al siguiente error
  await unirse(U.intruso, 'NOEXISTE')
  const { rows: [n] } = await db.query(`select count(*)::int as n from intentos_union where usuario_id = $1`, [U.intruso])
  assert.equal(n.n, 1)
  await sacar(U.intruso)
})

test('nadie lee ni escribe los intentos directo', async () => {
  assert.ok((await como(U.intruso, `select * from intentos_union`)).error)
  assert.ok((await como(U.intruso, `delete from intentos_union`)).error)
  assert.ok((await comoAnon(`select * from intentos_union`)).error)
  assert.ok((await comoAnon(`select unirse_campania('X')`)).error, 'anon no la ejecuta')
  assert.ok((await como(U.dj, `select nuevo_codigo()`)).error, 'nuevo_codigo es interna')
})

test('los códigos viejos (6 hex) se cambian al aplicar la 012; correrla otra vez no truena', async () => {
  const { rows: [vieja] } = await db.query(
    `insert into campanias (nombre, dj_id, codigo_invitacion) values ('Vieja', $1, '2DA8EA') returning id`, [U.dj])
  const antes = await codigoActual()
  await db.exec(SQL)
  const { rows: [c] } = await db.query(`select codigo_invitacion as c from campanias where id = $1`, [vieja.id])
  assert.match(c.c, FORMATO)
  // La campaña que ya tenía código nuevo lo conserva
  assert.equal(await codigoActual(), antes)
  assert.equal((await unirse(U.intruso, '2DA8EA')).filas[0].id, null)
})
