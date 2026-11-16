// Tablero compartido (migración 010): qué tablero ve la mesa, quién mueve
// qué ficha y quién abre las imágenes del bucket privado "tablero".

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparar, U } from './base.mjs'

const { como, camp, pj } = await preparar()

async function tablero(nombre, extra = {}) {
  const r = await como(U.dj, `insert into tableros (campania_id, nombre, imagen) values ($1, $2, $3) returning *`, [camp.id, nombre, extra.imagen ?? null])
  assert.ok(r.filas?.[0]?.id, r.error)
  return r.filas[0]
}
async function ficha(t, extra = {}) {
  const r = await como(U.dj, `insert into fichas (tablero_id, campania_id, personaje_id, nombre, color) values ($1, $2, $3, $4, $5) returning *`,
    [t.id, camp.id, extra.personaje_id ?? null, extra.nombre ?? 'Lobo', extra.color ?? '#a77ce8'])
  assert.ok(r.filas?.[0]?.id, r.error)
  return r.filas[0]
}
const mostrar = (id) => como(U.dj, `update campanias set tablero_id = $1 where id = $2 returning tablero_id`, [id, camp.id])
const ver = async (uid, tabla) => (await como(uid, `select * from ${tabla}`)).filas ?? []

let mapa, otro, fMira, fLobo
test('el jugador no ve un tablero hasta que el DJ lo muestra', async () => {
  mapa = await tablero('Mapa del pueblo', { imagen: '1-pueblo.webp' })
  fMira = await ficha(mapa, { personaje_id: pj.id, nombre: 'Mira', color: '#e8b04a' })
  fLobo = await ficha(mapa)
  assert.equal((await ver(U.ana, 'tableros')).length, 0)
  assert.equal((await ver(U.ana, 'fichas')).length, 0)
  const r = await mostrar(mapa.id)
  assert.equal(r.filas?.[0]?.tablero_id, mapa.id, r.error)
  assert.deepEqual((await ver(U.ana, 'tableros')).map((t) => t.nombre), ['Mapa del pueblo'])
  assert.equal((await ver(U.ana, 'fichas')).length, 2)
  assert.equal((await ver(U.intruso, 'tableros')).length, 0)
  assert.equal((await ver(U.intruso, 'fichas')).length, 0)
})

test('al cambiar de tablero el jugador deja de ver el anterior', async () => {
  otro = await tablero('Carta del duque')
  await mostrar(otro.id)
  assert.deepEqual((await ver(U.ana, 'tableros')).map((t) => t.nombre), ['Carta del duque'])
  assert.equal((await ver(U.ana, 'fichas')).length, 0)
  assert.equal((await ver(U.dj, 'tableros')).length, 2)
  await mostrar(mapa.id)
})

test('el jugador no escribe tableros ni fichas directo', async () => {
  const ins = await como(U.ana, `insert into tableros (campania_id, nombre) values ($1, 'Mío')`, [camp.id])
  assert.match(ins.error ?? '', /row-level security/)
  const insF = await como(U.ana, `insert into fichas (tablero_id, campania_id, nombre) values ($1, $2, 'X')`, [mapa.id, camp.id])
  assert.match(insF.error ?? '', /row-level security/)
  assert.equal((await como(U.ana, `update tableros set texto = 'hola' returning id`)).filas.length, 0)
  assert.equal((await como(U.ana, `update fichas set x = 0 returning id`)).filas.length, 0)
  assert.equal((await como(U.ana, `delete from fichas returning id`)).filas.length, 0)
  assert.equal((await como(U.ana, `delete from tableros returning id`)).filas.length, 0)
  assert.equal((await como(U.ana, `update campanias set tablero_id = null returning id`)).filas.length, 0)
})

test('mover_ficha: Ana mueve la ficha de su PJ y se recorta a 0–1', async () => {
  const r = await como(U.ana, `select * from mover_ficha($1, 1.7, 0.25)`, [fMira.id])
  assert.ok(r.filas, r.error)
  assert.equal(r.filas[0].x, 1)
  assert.equal(r.filas[0].y, 0.25)
  const n = await como(U.ana, `select * from mover_ficha($1, null, -2)`, [fMira.id])
  assert.equal(n.filas[0].x, 0.5)
  assert.equal(n.filas[0].y, 0)
})

test('mover_ficha: Ana no mueve la de un adversario ni la suya en un tablero no mostrado; el intruso nada', async () => {
  assert.match((await como(U.ana, `select mover_ficha($1, 0.1, 0.1)`, [fLobo.id])).error ?? '', /tu personaje/)
  const escondida = await ficha(otro, { personaje_id: pj.id, nombre: 'Mira' })
  assert.match((await como(U.ana, `select mover_ficha($1, 0.1, 0.1)`, [escondida.id])).error ?? '', /tu personaje/)
  assert.match((await como(U.intruso, `select mover_ficha($1, 0.1, 0.1)`, [fMira.id])).error ?? '', /No existe esa ficha/)
  // El DJ mueve cualquiera
  const dj = await como(U.dj, `select * from mover_ficha($1, 0.3, 0.4)`, [fLobo.id])
  assert.equal(dj.filas?.[0]?.x, 0.3, dj.error)
})

test('no se puede mostrar el tablero de otra campaña', async () => {
  const ajena = (await como(U.intruso, `select * from crear_campania('Otra')`)).filas[0]
  const suyo = (await como(U.intruso, `insert into tableros (campania_id, nombre) values ($1, 'Ajeno') returning id`, [ajena.id])).filas[0]
  const r = await mostrar(suyo.id)
  assert.match(r.error ?? '', /foreign key|llave/i)
})

test('borrar el tablero mostrado deja tablero_id en nulo y borra sus fichas', async () => {
  const temporal = await tablero('Temporal')
  await ficha(temporal)
  await mostrar(temporal.id)
  const r = await como(U.dj, `delete from tableros where id = $1 returning id`, [temporal.id])
  assert.equal(r.filas?.length, 1, r.error)
  const c = (await como(U.dj, `select tablero_id from campanias where id = $1`, [camp.id])).filas[0]
  assert.equal(c.tablero_id, null)
  assert.equal((await como(U.dj, `select * from fichas where tablero_id = $1`, [temporal.id])).filas.length, 0)
  await mostrar(mapa.id)
})

test('límites: texto de 2001, color "rojo" y niebla enorme se rechazan', async () => {
  assert.ok((await como(U.dj, `update tableros set texto = repeat('a', 2001) where id = $1`, [mapa.id])).error)
  assert.ok((await como(U.dj, `update fichas set color = 'rojo' where id = $1`, [fLobo.id])).error)
  assert.ok((await como(U.dj, `update tableros set niebla = jsonb_build_object('d', repeat('A', 20001)) where id = $1`, [mapa.id])).error)
  assert.ok((await como(U.dj, `update tableros set imagen = 'otra/carpeta.png' where id = $1`, [mapa.id])).error)
  const ok = await como(U.dj, `update tableros set niebla = '{"c":64,"f":1,"d":"AAAAAAAAAAA="}', texto = 'Llegan al pueblo' where id = $1 returning id`, [mapa.id])
  assert.equal(ok.filas?.length, 1, ok.error)
})

test('storage: Ana solo ve la imagen del tablero mostrado; no sube; el DJ sube solo en su campaña', async () => {
  const subir = (uid, nombre) => como(uid, `insert into storage.objects (bucket_id, name) values ('tablero', $1) returning name`, [nombre])
  assert.equal((await subir(U.dj, `${camp.id}/1-pueblo.webp`)).filas?.length, 1)
  assert.equal((await subir(U.dj, `${camp.id}/2-guarida.webp`)).filas?.length, 1)
  assert.match((await subir(U.dj, `${camp.id}/sub/3.webp`)).error ?? '', /row-level security/)
  assert.match((await subir(U.ana, `${camp.id}/4-mio.webp`)).error ?? '', /row-level security/)
  const deAna = async () => (await como(U.ana, `select name from storage.objects where bucket_id = 'tablero' order by name`)).filas.map((o) => o.name)
  assert.deepEqual(await deAna(), [`${camp.id}/1-pueblo.webp`])
  await mostrar(otro.id)
  assert.deepEqual(await deAna(), [])
  await mostrar(mapa.id)
  assert.equal((await como(U.intruso, `select name from storage.objects where bucket_id = 'tablero'`)).filas.length, 0)
  assert.equal((await como(U.dj, `select name from storage.objects where bucket_id = 'tablero'`)).filas.length, 2)
  assert.equal((await como(U.ana, `delete from storage.objects where bucket_id = 'tablero' returning name`)).filas.length, 0)
})
