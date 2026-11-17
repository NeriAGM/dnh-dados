// Ayudar a un Aliado (SRD 2.0, p. 48–49): cada ayudante gasta 1 Esperanza y
// tira su d6; quien tira suma solo el d6 de ventaja más alto de todos.
// Desde la 014 cada ayudante lo confirma en su pantalla y la ayuda cancela
// la desventaja (ventaja y desventaja se cancelan una por una, p. 49).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { preparar, U, DUAL } from './base.mjs'
const ctx = await preparar()
const { db, como, camp, pj } = ctx

const nuevoPJ = async (nombre, usuario = U.ana) =>
  (await como(usuario, `insert into personajes (campania_id, usuario_id, nombre) values ($1, $2, $3) returning *`, [camp.id, usuario, nombre])).filas[0]
const soren = await nuevoPJ('Soren')
const valerius = await nuevoPJ('Valerius')
const ponerEsperanza = (id, n) => db.query('update personajes set esperanza = $2 where id = $1', [id, n])
const esperanzaDe = async (id) => (await db.query('select esperanza from personajes where id = $1', [id])).rows[0].esperanza
const marcas = async () => (await db.query('select ayudante_id from ayudas order by ayudante_id')).rows.map((r) => r.ayudante_id)
const CON_VENTAJA = JSON.stringify([...JSON.parse(DUAL), { lados: 6, rol: 'ventaja', signo: 1 }])
const CON_DESVENTAJA = JSON.stringify([...JSON.parse(DUAL), { lados: 6, rol: 'desventaja', signo: -1 }])
// «Te ayudo»: lo marca quien ayuda (aquí Ana, dueña de los tres personajes)
const ofrecer = (ayudante, objetivo = pj.id, usuario = U.ana) => como(usuario, `select * from ofrecer_ayuda($1, $2)`, [ayudante, objetivo])
const tirarCon = (grupos, ayudantes, tipo = 'accion') =>
  como(U.ana, `select * from tirar($1, $2, $3, $4::jsonb, 0, null, false, null, false, $5::uuid[])`, [camp.id, pj.id, tipo, grupos, ayudantes])

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
    assert.equal((await ofrecer(soren.id)).error, undefined)
    const r = await como(U.ana, `select * from tirar($1, $2, 'accion', $3::jsonb, 1, null, false, null, false, $4::uuid[])`, [camp.id, pj.id, CON_VENTAJA, [soren.id]])
    assert.equal(r.error, undefined, r.error)
    const t = r.filas[0]
    revisarVentaja(t, 2)
    assert.equal(t.dados.filter((d) => d.ayudante === soren.id).length, 1)
    assert.match(t.formula, /máx\(2d6\)/)
    assert.equal(await esperanzaDe(soren.id), 2)
    assert.deepEqual(t.efectos.ayudantes, [{ id: soren.id, esperanza: 2 }])
    assert.deepEqual(await marcas(), [], 'la marca se usa en la tirada')
  }
})

test('sin ventaja propia y dos ayudantes: cuenta el más alto de los ayudantes', async () => {
  for (let i = 0; i < 8; i++) {
    await ponerEsperanza(soren.id, 1)
    await ponerEsperanza(valerius.id, 4)
    await ofrecer(soren.id); await ofrecer(valerius.id)
    const t = (await tirarCon(DUAL, [soren.id, valerius.id])).filas[0]
    revisarVentaja(t, 2)
    assert.equal(await esperanzaDe(soren.id), 0)
    assert.equal(await esperanzaDe(valerius.id), 3)
  }
})

test('sin la marca de «te ayudo» (o si ya pasaron 10 minutos) no se tira y nadie gasta', async () => {
  await ponerEsperanza(soren.id, 3)
  assert.match((await tirarCon(DUAL, [soren.id])).error, /no ha confirmado/)
  await ofrecer(soren.id)
  await db.query(`update ayudas set creado = now() - interval '11 minutes'`)
  assert.match((await tirarCon(DUAL, [soren.id])).error, /no ha confirmado/)
  assert.equal(await esperanzaDe(soren.id), 3)
  await db.query('delete from ayudas')
})

test('con desventaja y un ayudante: la ayuda la cancela y no se tira ningún d6', async () => {
  for (let i = 0; i < 6; i++) {
    await ponerEsperanza(soren.id, 2)
    await ofrecer(soren.id)
    const r = await tirarCon(CON_DESVENTAJA, [soren.id])
    assert.equal(r.error, undefined, r.error)
    const t = r.filas[0]
    assert.equal(t.dados.filter((d) => d.lados === 6).length, 0, 'ni desventaja ni ayuda')
    const d12 = t.dados.reduce((s, d) => s + d.valor, 0)
    assert.equal(t.total, d12)
    assert.doesNotMatch(t.formula, /d6/)
    assert.equal(t.efectos.cancela_desventaja, soren.id)
    assert.equal(await esperanzaDe(soren.id), 1)
  }
})

test('con desventaja y dos ayudantes: uno cancela y cuenta el d6 del otro', async () => {
  for (let i = 0; i < 6; i++) {
    await ponerEsperanza(soren.id, 2)
    await ponerEsperanza(valerius.id, 2)
    await ofrecer(soren.id); await ofrecer(valerius.id)
    const t = (await tirarCon(CON_DESVENTAJA, [soren.id, valerius.id])).filas[0]
    assert.equal(t.dados.filter((d) => d.rol === 'desventaja').length, 0)
    revisarVentaja(t, 1)
    assert.match(t.formula, /máx\(1d6\)/)
    const cancela = t.efectos.cancela_desventaja
    assert.ok([soren.id, valerius.id].includes(cancela))
    assert.notEqual(t.dados.find((d) => d.rol === 'ventaja').ayudante, cancela, 'quien cancela no tira')
    assert.equal(await esperanzaDe(soren.id), 1)
    assert.equal(await esperanzaDe(valerius.id), 1)
  }
})

test('si un ayudante no tiene Esperanza al tirar no se tira y nadie gasta nada', async () => {
  await ponerEsperanza(soren.id, 2)
  await ponerEsperanza(valerius.id, 1)
  await ofrecer(soren.id); await ofrecer(valerius.id)
  await ponerEsperanza(valerius.id, 0)
  const antes = (await db.query('select count(*)::int n from lanzamientos')).rows[0].n
  const r = await tirarCon(DUAL, [soren.id, valerius.id])
  assert.match(r.error, /no tiene Esperanza/)
  assert.equal(await esperanzaDe(soren.id), 2)
  assert.equal((await db.query('select count(*)::int n from lanzamientos')).rows[0].n, antes)
  await db.query('delete from ayudas')
})

test('no se ayuda en reacciones, a uno mismo ni con alguien de fuera', async () => {
  await ponerEsperanza(soren.id, 6)
  await ofrecer(soren.id)
  assert.match((await tirarCon(DUAL, [soren.id], 'reaccion')).error, /solo va en tiradas de acción/)
  assert.match((await tirarCon(DUAL, [pj.id])).error, /a sí mismo/)
  assert.match((await tirarCon(DUAL, [randomUUID()])).error, /no está en esta campaña/)
  assert.equal(await esperanzaDe(soren.id), 6, 'ningún rechazo gasta Esperanza')
  await db.query('delete from ayudas')
})

test('ofrecer ayuda: solo el dueño o el DJ, con Esperanza y a alguien de la campaña', async () => {
  const deNeri = await nuevoPJ('Aida', U.dj)
  await ponerEsperanza(deNeri.id, 2)
  await ponerEsperanza(soren.id, 0)
  assert.match((await ofrecer(deNeri.id)).error, /Solo el dueño/, 'Ana no ofrece la ayuda del personaje de otro')
  assert.match((await ofrecer(deNeri.id, pj.id, U.intruso)).error, /Solo el dueño/)
  assert.match((await ofrecer(soren.id)).error, /necesitas 1 Esperanza/)
  assert.match((await ofrecer(valerius.id, valerius.id)).error, /sí mismo|no está/)
  assert.match((await ofrecer(valerius.id, randomUUID())).error, /no está en esta campaña/)
  assert.equal((await ofrecer(deNeri.id, pj.id, U.dj)).error, undefined, 'el DJ sí puede')
  assert.match((await como(U.ana, `insert into ayudas (ayudante_id, objetivo_id, campania_id, usuario_id) values ($1, $2, $3, $4)`, [valerius.id, pj.id, camp.id, U.ana])).error ?? '', /permission|denied|policy/i, 'nadie escribe directo')
  assert.equal((await como(U.ana, `select * from ayudas`)).filas.length, 1, 'la mesa ve las marcas')
  assert.equal((await como(U.intruso, `select * from ayudas`)).filas.length, 0, 'alguien de fuera no')
  assert.match((await como(U.ana, `select retirar_ayuda($1)`, [deNeri.id])).error, /Solo el dueño/)
  assert.equal((await como(U.dj, `select retirar_ayuda($1)`, [deNeri.id])).error, undefined)
  assert.deepEqual(await marcas(), [])
})

test('una tirada de acción borra las marcas para quien tira aunque no las use', async () => {
  await ponerEsperanza(soren.id, 2)
  await ofrecer(soren.id)
  const t = (await como(U.ana, `select * from tirar($1, $2, 'accion', $3::jsonb)`, [camp.id, pj.id, DUAL])).filas[0]
  assert.equal(t.efectos.ayudantes, undefined)
  assert.equal(await esperanzaDe(soren.id), 2)
  assert.deepEqual(await marcas(), [])
})

test('sin ayudantes la tirada funciona igual que antes', async () => {
  const t = (await como(U.ana, `select * from tirar($1, $2, 'accion', $3::jsonb)`, [camp.id, pj.id, CON_VENTAJA])).filas[0]
  revisarVentaja(t, 1)
  assert.doesNotMatch(t.formula, /máx/)
  assert.equal(t.efectos.ayudantes, undefined)
  const d = (await como(U.ana, `select * from tirar($1, $2, 'accion', $3::jsonb)`, [camp.id, pj.id, CON_DESVENTAJA])).filas[0]
  assert.equal(d.dados.filter((x) => x.rol === 'desventaja').length, 1, 'sin ayuda la desventaja sigue')
})
