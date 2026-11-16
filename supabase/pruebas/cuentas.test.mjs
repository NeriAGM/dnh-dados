// Cuentas regresivas ocultas (migración 013). Cuando el DJ oculta una cuenta,
// el tiempo real no le manda nada al jugador (ya no la puede ver) y se le
// quedaba en pantalla. Ahora la base sube un contador (cuentas_revision)
// que el jugador sí ve, y su app vuelve a leer las cuentas.
//
// Correr:  npm run probar

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparar, U } from './base.mjs'

const { db, como, camp } = await preparar()

const rev = async () => Number((await db.query('select rev from cuentas_revision where campania_id = $1', [camp.id])).rows[0]?.rev ?? 0)
const cuenta = (await como(U.dj, `insert into cuentas_regresivas (campania_id, nombre) values ($1, 'Llega la marea') returning *`, [camp.id])).filas[0]
const nombresQueVe = async (uid) => ((await como(uid, 'select nombre from cuentas_regresivas')).filas ?? []).map((f) => f.nombre)

test('ocultar o mostrar una cuenta sube el contador', async () => {
  assert.deepEqual(await nombresQueVe(U.ana), ['Llega la marea'])
  const antes = await rev()
  await como(U.dj, 'update cuentas_regresivas set visible = false where id = $1', [cuenta.id])
  assert.equal(await rev(), antes + 1)
  assert.deepEqual(await nombresQueVe(U.ana), [])
  await como(U.dj, 'update cuentas_regresivas set visible = true where id = $1', [cuenta.id])
  assert.equal(await rev(), antes + 2)
})

test('bajar la cuenta no sube el contador (ese cambio ya le llega al jugador)', async () => {
  const antes = await rev()
  await como(U.dj, 'update cuentas_regresivas set valor = valor - 1 where id = $1', [cuenta.id])
  assert.equal(await rev(), antes)
})

test('el jugador lee el contador pero no lo cambia; alguien de fuera no lo ve', async () => {
  assert.equal((await como(U.ana, 'select rev from cuentas_revision')).filas.length, 1)
  assert.equal((await como(U.intruso, 'select rev from cuentas_revision')).filas.length, 0)
  const antes = await rev()
  await como(U.ana, 'update cuentas_revision set rev = 0')
  await como(U.ana, 'delete from cuentas_revision')
  assert.equal(await rev(), antes)
})

test('el contador viaja por el tiempo real', async () => {
  const { rows } = await db.query(`select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cuentas_revision'`)
  assert.equal(rows.length, 1)
})

test('nadie llama directo la función del disparador', async () => {
  const { rows } = await db.query(`select has_function_privilege('authenticated', 'public.cuentas_avisar()', 'execute') as puede`)
  assert.equal(rows[0].puede, false)
})
