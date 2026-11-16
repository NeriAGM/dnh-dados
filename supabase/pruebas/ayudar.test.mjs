// Ayudar a un Aliado (SRD 2.0, p. 48–49): cada ayudante gasta 1 Esperanza y
// tira su d6; quien tira suma solo el d6 de ventaja más alto de todos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { preparar, U, DUAL } from './base.mjs'
const ctx = await preparar()
const { db, como, camp, pj } = ctx

const nuevoPJ = async (nombre) =>
  (await como(U.ana, `insert into personajes (campania_id, usuario_id, nombre) values ($1, $2, $3) returning *`, [camp.id, U.ana, nombre])).filas[0]
const soren = await nuevoPJ('Soren')
const valerius = await nuevoPJ('Valerius')
const ponerEsperanza = (id, n) => db.query('update personajes set esperanza = $2 where id = $1', [id, n])
const esperanzaDe = async (id) => (await db.query('select esperanza from personajes where id = $1', [id])).rows[0].esperanza
const CON_VENTAJA = JSON.stringify([...JSON.parse(DUAL), { lados: 6, rol: 'ventaja', signo: 1 }])

function revisarVentaja(t, cuantos) {
  const d6 = t.dados.filter((d) => d.rol === 'ventaja')
  assert.equal(d6.length, cuantos)
  const cuentan = d6.filter((d) => !d.descartado)
  assert.equal(cuentan.length, 1, 'solo cuenta un d6 de ventaja')
  assert.equal(cuentan[0].valor, Math.max(...d6.map((d) => d.valor)), 'el que cuenta es el más alto')
  const d12 = t.dados.filter((d) => d.rol === 'esperanza' || d.rol === 'miedo').reduce((s, d) => s + d.valor, 0)
  assert.equal(t.total, d12 + cuentan[0].valor + t.modificador)
}

test('con ventaja propia y un ayudante: cuenta el d6 más alto y el ayudante gasta 1 Esperanza', async () => {
  for (let i = 0; i < 8; i++) {
    await ponerEsperanza(soren.id, 3)
    const r = await como(U.ana, `select * from tirar($1, $2, 'accion', $3::jsonb, 1, null, false, null, false, $4::uuid[])`, [camp.id, pj.id, CON_VENTAJA, [soren.id]])
    assert.equal(r.error, undefined, r.error)
    const t = r.filas[0]
    revisarVentaja(t, 2)
    assert.equal(t.dados.filter((d) => d.ayudante === soren.id).length, 1)
    assert.match(t.formula, /máx\(2d6\)/)
    assert.equal(await esperanzaDe(soren.id), 2)
    assert.deepEqual(t.efectos.ayudantes, [{ id: soren.id, esperanza: 2 }])
  }
})

test('sin ventaja propia y dos ayudantes: cuenta el más alto de los ayudantes', async () => {
  for (let i = 0; i < 8; i++) {
    await ponerEsperanza(soren.id, 1)
    await ponerEsperanza(valerius.id, 4)
    const t = (await como(U.ana, `select * from tirar($1, $2, 'accion', $3::jsonb, 0, null, false, null, false, $4::uuid[])`, [camp.id, pj.id, DUAL, [soren.id, valerius.id]])).filas[0]
    revisarVentaja(t, 2)
    assert.equal(await esperanzaDe(soren.id), 0)
    assert.equal(await esperanzaDe(valerius.id), 3)
  }
})

test('si un ayudante no tiene Esperanza no se tira y nadie gasta nada', async () => {
  await ponerEsperanza(soren.id, 2)
  await ponerEsperanza(valerius.id, 0)
  const antes = (await db.query('select count(*)::int n from lanzamientos')).rows[0].n
  const r = await como(U.ana, `select * from tirar($1, $2, 'accion', $3::jsonb, 0, null, false, null, false, $4::uuid[])`, [camp.id, pj.id, DUAL, [soren.id, valerius.id]])
  assert.match(r.error, /no tiene Esperanza/)
  assert.equal(await esperanzaDe(soren.id), 2)
  assert.equal((await db.query('select count(*)::int n from lanzamientos')).rows[0].n, antes)
})

test('no se ayuda en reacciones, con desventaja, a uno mismo ni con alguien de fuera', async () => {
  await ponerEsperanza(soren.id, 6)
  const tirar = (tipo, grupos, ayudantes) =>
    como(U.ana, `select * from tirar($1, $2, $3, $4::jsonb, 0, null, false, null, false, $5::uuid[])`, [camp.id, pj.id, tipo, grupos, ayudantes])
  assert.match((await tirar('reaccion', DUAL, [soren.id])).error, /solo va en tiradas de acción/)
  const conDesventaja = JSON.stringify([...JSON.parse(DUAL), { lados: 6, rol: 'desventaja', signo: -1 }])
  assert.match((await tirar('accion', conDesventaja, [soren.id])).error, /desventaja/)
  assert.match((await tirar('accion', DUAL, [pj.id])).error, /a sí mismo/)
  assert.match((await tirar('accion', DUAL, [randomUUID()])).error, /no está en esta campaña/)
  assert.equal(await esperanzaDe(soren.id), 6, 'ningún rechazo gasta Esperanza')
})

test('sin ayudantes la tirada funciona igual que antes', async () => {
  const t = (await como(U.ana, `select * from tirar($1, $2, 'accion', $3::jsonb)`, [camp.id, pj.id, CON_VENTAJA])).filas[0]
  revisarVentaja(t, 1)
  assert.doesNotMatch(t.formula, /máx/)
  assert.equal(t.efectos.ayudantes, undefined)
})
