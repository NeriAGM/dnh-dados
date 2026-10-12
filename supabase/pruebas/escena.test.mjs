// La mesa ve el encuentro activo (migración 005): qué ve un jugador,
// qué nunca le llega y quién puede escribir la escena.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparar, U } from './base.mjs'
import { escenaDe } from '../../src/lib/escena.js'

const { db, como, camp } = await preparar()

const inst = (uid, extra = {}) => ({ uid, ref: 'bear', nombre: '', nombre_base: 'Oso', tipo: 'bruto', pg: 0, pg_max: 6, estres: 0, oculto: false, ...extra })

async function encuentro(nombre, adversarios, activo = false) {
  const r = await como(U.dj, `insert into encuentros (campania_id, nombre, adversarios) values ($1, $2, $3::jsonb) returning id`, [camp.id, nombre, JSON.stringify(adversarios)])
  assert.ok(r.filas?.[0]?.id, r.error)
  const id = r.filas[0].id
  if (activo) await como(U.dj, `select activar_encuentro($1)`, [id])
  return id
}
const escenaDeAna = async () => (await como(U.ana, `select * from escenas`)).filas

let puente
test('sin encuentro activo la mesa no ve nada', async () => {
  puente = await encuentro('Emboscada en el puente', [
    inst('a', { nombre: 'Oso viejo' }),
    inst('b', { oculto: true, nombre: 'Arquero escondido', tipo: 'a-distancia' }),
    inst('c', { pg: 2, nombre_base: 'Lobo', tipo: 'estandar' }),
  ])
  assert.deepEqual(await escenaDeAna(), [])
})

test('el jugador ve el encuentro activo con nombre, tipo y estado', async () => {
  await como(U.dj, `select activar_encuentro($1)`, [puente])
  const [e] = await escenaDeAna()
  assert.equal(e.nombre, 'Emboscada en el puente')
  assert.equal(e.encuentro_id, puente)
  assert.deepEqual(e.adversarios, [
    { uid: 'a', nombre: 'Oso viejo', tipo: 'bruto', estado: 'ileso' },
    { uid: 'c', nombre: 'Lobo', tipo: 'estandar', estado: 'herido' },
  ])
})

test('una instancia oculta nunca llega a la mesa', async () => {
  const filas = await escenaDeAna()
  assert.ok(!JSON.stringify(filas).includes('Arquero'), 'el oculto no aparece en ningún campo')
  // El DJ la revela: ahora sí aparece, en su lugar
  const { filas: [{ adversarios }] } = await como(U.dj, `select adversarios from encuentros where id = $1`, [puente])
  adversarios[1].oculto = false
  await como(U.dj, `update encuentros set adversarios = $2::jsonb where id = $1`, [puente, JSON.stringify(adversarios)])
  assert.deepEqual((await escenaDeAna())[0].adversarios.map((a) => a.nombre), ['Oso viejo', 'Arquero escondido', 'Lobo'])
})

test('a la mesa no le llegan números de PG ni nada del catálogo', async () => {
  const [e] = await escenaDeAna()
  const texto = JSON.stringify(e)
  for (const prohibido of ['"pg"', 'pg_max', 'estres', 'ref', 'oculto', 'dificultad', 'umbrales']) {
    assert.ok(!texto.includes(prohibido), `no debe aparecer ${prohibido}`)
  }
  for (const a of e.adversarios) assert.deepEqual(Object.keys(a).sort(), ['estado', 'nombre', 'tipo', 'uid'])
  // Y la tabla de encuentros sigue cerrada para el jugador
  assert.equal((await como(U.ana, `select count(*)::int n from encuentros`)).filas[0].n, 0)
})

test('estados: 0 ileso, parcial herido, mitad grave, todo caído (y sin máximo, sin estado)', async () => {
  const casos = [
    [0, 6, 'ileso'], [1, 6, 'herido'], [2, 6, 'herido'], [3, 6, 'grave'], [5, 6, 'grave'], [6, 6, 'caido'], [9, 6, 'caido'],
    [1, 3, 'herido'], [2, 3, 'grave'], [1, 1, 'caido'], [0, 1, 'ileso'], [1, 2, 'grave'],
  ]
  const lista = casos.map(([pg, pg_max], i) => inst(`e${i}`, { pg, pg_max }))
  lista.push(inst('sin-max', { pg: 2, pg_max: undefined }))
  lista.push(inst('raro', { pg: 'mucho', pg_max: 4 }))
  await como(U.dj, `update encuentros set adversarios = $2::jsonb where id = $1`, [puente, JSON.stringify(lista)])
  const [e] = await escenaDeAna()
  assert.deepEqual(e.adversarios.slice(0, casos.length).map((a) => a.estado), casos.map((c) => c[2]))
  assert.equal(e.adversarios.find((a) => a.uid === 'sin-max').estado, null)
  assert.equal(e.adversarios.find((a) => a.uid === 'raro').estado, 'ileso', 'un PG que no es número cuenta como 0, sin tronar')
  // El cálculo del navegador (modo prueba y vista previa del DJ) coincide con el de la base
  const local = escenaDe({ id: puente, nombre: 'Emboscada en el puente', adversarios: lista })
  assert.deepEqual(local.adversarios.map((a) => a.estado), e.adversarios.map((a) => a.estado))
})

test('jugador e intruso no pueden escribir la escena; el intruso tampoco la lee', async () => {
  for (const u of [U.ana, U.intruso]) {
    assert.match((await como(u, `insert into escenas (campania_id, nombre) values ($1, 'Falsa')`, [camp.id])).error ?? '', /permission denied|row-level security/)
    const up = await como(u, `update escenas set nombre = 'X' returning nombre`)
    assert.ok(up.error || up.filas.length === 0, 'no actualiza nada')
    const del = await como(u, `delete from escenas returning campania_id`)
    assert.ok(del.error || del.filas.length === 0, 'no borra nada')
  }
  assert.equal((await como(U.intruso, `select count(*)::int n from escenas`)).filas[0].n, 0)
  assert.match((await como(U.ana, `select reconstruir_escena($1)`, [camp.id])).error ?? '', /permission denied/)
  assert.equal((await escenaDeAna())[0].nombre, 'Emboscada en el puente')
})

test('cambiar el encuentro activo cambia la escena', async () => {
  const cueva = await encuentro('La cueva', [inst('z', { nombre_base: 'Limo verde', tipo: 'esbirro', pg_max: 1 })], true)
  const [e] = await escenaDeAna()
  assert.equal(e.nombre, 'La cueva')
  assert.equal(e.encuentro_id, cueva)
  assert.deepEqual(e.adversarios.map((a) => a.nombre), ['Limo verde'])
  await como(U.dj, `select activar_encuentro($1)`, [puente])
  assert.equal((await escenaDeAna())[0].nombre, 'Emboscada en el puente')
})

test('el entorno se muestra solo por su nombre', async () => {
  await como(U.dj, `update encuentros set entorno = 'castle-siege', entorno_nombre = 'Asedio al castillo' where id = $1`, [puente])
  const [e] = await escenaDeAna()
  assert.equal(e.entorno, 'Asedio al castillo')
  assert.ok(!JSON.stringify(e).includes('castle-siege'))
})

test('si todo está oculto, la mesa no ve ni el nombre del encuentro', async () => {
  const sorpresa = await encuentro('Sorpresa', [inst('s', { oculto: true })], true)
  assert.deepEqual(await escenaDeAna(), [])
  await como(U.dj, `update encuentros set adversarios = $2::jsonb where id = $1`, [sorpresa, JSON.stringify([inst('s')])])
  assert.equal((await escenaDeAna())[0].nombre, 'Sorpresa')
})

test('terminar el encuentro (o borrarlo) quita la escena', async () => {
  const r = await como(U.dj, `update encuentros set activo = false where activo returning id`)
  assert.equal(r.filas.length, 1, r.error)
  assert.deepEqual(await escenaDeAna(), [])
  await como(U.dj, `select activar_encuentro($1)`, [puente])
  assert.equal((await escenaDeAna()).length, 1)
  await como(U.dj, `delete from encuentros where id = $1`, [puente])
  assert.deepEqual(await escenaDeAna(), [])
  const { rows } = await db.query(`select count(*)::int n from escenas`)
  assert.equal(rows[0].n, 0)
})

test('la escena está en el tiempo real', async () => {
  const { rows } = await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'escenas'`)
  assert.equal(rows.length, 1)
})
