// Pruebas del lore: el DJ hace todo; los jugadores solo leen lo revelado
// (y una subpágina se esconde si alguna madre está oculta); el intruso no
// ve nada; las imágenes del bucket privado siguen las mismas reglas.
//
// Correr:  npm run probar

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparar, U } from './base.mjs'

const { db, como, camp } = await preparar()

const crear = (uid, cambios) => {
  const cols = Object.keys(cambios)
  return como(uid, `insert into lore (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning *`, Object.values(cambios))
}
const titulos = async (uid) => ((await como(uid, `select titulo from lore order by titulo`)).filas ?? []).map((f) => f.titulo)
const rev = async () => Number((await db.query(`select rev from lore_revision where campania_id = $1`, [camp.id])).rows[0]?.rev ?? 0)

let mundo, abismo, capa1, secreto

test('el DJ crea páginas en árbol; todo entra oculto', async () => {
  const r = await crear(U.dj, { campania_id: camp.id, titulo: 'El mundo', icono: '🌍', contenido: '# Hola', orden: 10 })
  assert.equal(r.error, undefined)
  mundo = r.filas[0]
  assert.equal(mundo.visible, false)
  abismo = (await crear(U.dj, { campania_id: camp.id, padre_id: mundo.id, titulo: 'El Abismo', orden: 10 })).filas[0]
  capa1 = (await crear(U.dj, { campania_id: camp.id, padre_id: abismo.id, titulo: 'Primera capa', orden: 10 })).filas[0]
  secreto = (await crear(U.dj, { campania_id: camp.id, titulo: 'Secretos del DJ', orden: 20 })).filas[0]
  assert.ok(abismo && capa1 && secreto)
  assert.deepEqual(await titulos(U.dj), ['El Abismo', 'El mundo', 'Primera capa', 'Secretos del DJ'])
})

test('el jugador no ve nada mientras todo está oculto', async () => {
  assert.deepEqual(await titulos(U.ana), [])
})

test('el jugador ve solo lo revelado, y una madre oculta esconde a sus hijas', async () => {
  await como(U.dj, `update lore set visible = true where id = any($1)`, [[abismo.id, capa1.id]])
  // El mundo (raíz) sigue oculto: El Abismo y Primera capa tampoco se ven
  assert.deepEqual(await titulos(U.ana), [])
  await como(U.dj, `update lore set visible = true where id = $1`, [mundo.id])
  assert.deepEqual(await titulos(U.ana), ['El Abismo', 'El mundo', 'Primera capa'])
  // Ocultar la página de en medio esconde también a la nieta
  await como(U.dj, `update lore set visible = false where id = $1`, [abismo.id])
  assert.deepEqual(await titulos(U.ana), ['El mundo'])
  await como(U.dj, `update lore set visible = true where id = $1`, [abismo.id])
})

test('el jugador no puede crear, cambiar, revelar ni borrar', async () => {
  const r = await crear(U.ana, { campania_id: camp.id, titulo: 'Mi teoría' })
  assert.match(r.error, /row-level security/)
  await como(U.ana, `update lore set titulo = 'Hackeado', visible = true`)
  await como(U.ana, `delete from lore`)
  const { rows } = await db.query(`select titulo, visible from lore order by titulo`)
  assert.equal(rows.length, 4)
  assert.ok(!rows.some((f) => f.titulo === 'Hackeado'))
  assert.equal(rows.find((f) => f.titulo === 'Secretos del DJ').visible, false)
})

test('el intruso no ve nada, ni siquiera lo revelado', async () => {
  assert.deepEqual(await titulos(U.intruso), [])
  assert.match((await crear(U.intruso, { campania_id: camp.id, titulo: 'x' })).error, /row-level security/)
})

test('la madre debe ser de la misma campaña y no se permiten ciclos', async () => {
  const otra = (await como(U.intruso, `select * from crear_campania('Otra')`)).filas[0]
  const ajena = (await crear(U.intruso, { campania_id: otra.id, titulo: 'Ajena' })).filas[0]
  assert.ok(ajena)
  // El intruso no puede colgar su página de una del DJ
  assert.match((await como(U.intruso, `update lore set padre_id = $1 where id = $2`, [mundo.id, ajena.id])).error, /no es de esta campaña/)
  // Ciclo: El mundo dentro de su propia nieta
  assert.match((await como(U.dj, `update lore set padre_id = $1 where id = $2`, [capa1.id, mundo.id])).error, /dentro de sí misma/)
  // Ni cambiar de campaña
  assert.match((await como(U.intruso, `update lore set campania_id = $1 where id = $2`, [camp.id, ajena.id])).error, /cambiar de campaña|row-level/)
})

test('límites: título de 1 a 200 y contenido de hasta 200 mil bytes', async () => {
  assert.match((await crear(U.dj, { campania_id: camp.id, titulo: '' })).error, /check/)
  assert.match((await crear(U.dj, { campania_id: camp.id, titulo: 'x'.repeat(201) })).error, /check/)
  assert.match((await crear(U.dj, { campania_id: camp.id, titulo: 'Enorme', contenido: 'a'.repeat(200001) })).error, /check/)
})

test('cambiar visibilidad o mover sube el contador para los jugadores; editar texto no', async () => {
  const antes = await rev()
  await como(U.dj, `update lore set contenido = 'Texto nuevo' where id = $1`, [mundo.id])
  assert.equal(await rev(), antes)
  await como(U.dj, `update lore set visible = true where id = $1`, [secreto.id])
  assert.equal(await rev(), antes + 1)
  await como(U.dj, `update lore set padre_id = $1 where id = $2`, [mundo.id, secreto.id])
  assert.equal(await rev(), antes + 2)
  // El jugador puede leer el contador; el intruso no
  assert.equal((await como(U.ana, `select rev from lore_revision`)).filas.length, 1)
  assert.equal((await como(U.intruso, `select rev from lore_revision`)).filas.length, 0)
  assert.match((await como(U.ana, `update lore_revision set rev = 0`)).error ?? 'sin efecto', /row-level|permission|sin efecto/)
  await como(U.dj, `update lore set visible = false, padre_id = null where id = $1`, [secreto.id])
})

test('actualizado se pone solo', async () => {
  const antes = (await db.query(`select actualizado from lore where id = $1`, [mundo.id])).rows[0].actualizado
  await new Promise((ok) => setTimeout(ok, 15))
  await como(U.dj, `update lore set titulo = 'El mundo' where id = $1`, [mundo.id])
  const despues = (await db.query(`select actualizado from lore where id = $1`, [mundo.id])).rows[0].actualizado
  assert.ok(despues > antes)
})

test('borrar una página borra sus subpáginas', async () => {
  const madre = (await crear(U.dj, { campania_id: camp.id, titulo: 'Borrable' })).filas[0]
  await crear(U.dj, { campania_id: camp.id, padre_id: madre.id, titulo: 'Hija borrable' })
  await como(U.dj, `delete from lore where id = $1`, [madre.id])
  const { rows } = await db.query(`select 1 from lore where titulo like '%orrable'`)
  assert.equal(rows.length, 0)
})

// ---------------------------------------------------------------------
// Imágenes
// ---------------------------------------------------------------------
const subir = (uid, nombre) => como(uid, `insert into storage.objects (bucket_id, name) values ('lore', $1) returning name`, [nombre])
const veo = async (uid, nombre) => ((await como(uid, `select name from storage.objects where bucket_id = 'lore' and name = $1`, [nombre])).filas ?? []).length === 1

test('el bucket de lore es privado y solo acepta imágenes de hasta 5 MB', async () => {
  const { rows: [b] } = await db.query(`select * from storage.buckets where id = 'lore'`)
  assert.equal(b.public, false)
  assert.equal(Number(b.file_size_limit), 5 * 1024 * 1024)
  assert.deepEqual(b.allowed_mime_types.sort(), ['image/gif', 'image/jpeg', 'image/png', 'image/webp'])
})

test('solo el DJ sube a la carpeta de su campaña', async () => {
  assert.equal((await subir(U.dj, `${camp.id}/1-mapa.webp`)).error, undefined)
  assert.equal((await subir(U.dj, `${camp.id}/2-secreto.webp`)).error, undefined)
  assert.match((await subir(U.ana, `${camp.id}/3-mio.webp`)).error, /row-level security/)
  assert.match((await subir(U.intruso, `${camp.id}/4-malo.webp`)).error, /row-level security/)
  assert.match((await subir(U.dj, `${camp.id}/sub/5.webp`)).error, /row-level security/)
  assert.match((await subir(U.dj, `no-es-uuid/6.webp`)).error, /row-level security/)
})

test('el jugador solo abre imágenes que salen en páginas que puede ver', async () => {
  const mapa = `${camp.id}/1-mapa.webp`, oculto = `${camp.id}/2-secreto.webp`
  assert.equal(await veo(U.ana, mapa), false)
  await como(U.dj, `update lore set contenido = '![Mapa](lore:1-mapa.webp)' where id = $1`, [capa1.id])
  await como(U.dj, `update lore set contenido = '![x](lore:2-secreto.webp)' where id = $1`, [secreto.id])
  assert.equal(await veo(U.ana, mapa), true, 'Primera capa es visible con todas sus madres')
  assert.equal(await veo(U.ana, oculto), false, 'Secretos del DJ sigue oculta')
  // Si se oculta una madre, la imagen deja de abrirse
  await como(U.dj, `update lore set visible = false where id = $1`, [mundo.id])
  assert.equal(await veo(U.ana, mapa), false)
  await como(U.dj, `update lore set visible = true where id = $1`, [mundo.id])
  // El DJ ve todo; el intruso nada
  assert.equal(await veo(U.dj, oculto), true)
  assert.equal(await veo(U.intruso, mapa), false)
})

test('solo el DJ borra o renombra imágenes del lore', async () => {
  const mapa = `${camp.id}/1-mapa.webp`
  await como(U.ana, `delete from storage.objects where name = $1`, [mapa])
  await como(U.ana, `update storage.objects set name = $2 where name = $1`, [mapa, `${camp.id}/robado.webp`])
  assert.equal((await db.query(`select 1 from storage.objects where name = $1`, [mapa])).rows.length, 1)
  await como(U.dj, `delete from storage.objects where name = $1`, [mapa])
  assert.equal((await db.query(`select 1 from storage.objects where name = $1`, [mapa])).rows.length, 0)
})

test('borrar la campaña borra su lore sin tropezar con el contador', async () => {
  const otra = (await como(U.dj, `select * from crear_campania('Para borrar')`)).filas[0]
  const p = (await crear(U.dj, { campania_id: otra.id, titulo: 'Raíz' })).filas[0]
  await crear(U.dj, { campania_id: otra.id, padre_id: p.id, titulo: 'Hija', visible: true })
  await como(U.dj, `update lore set visible = true where id = $1`, [p.id])
  const r = await db.query(`delete from campanias where id = $1`, [otra.id])
  assert.equal(r.affectedRows, 1)
  assert.equal((await db.query(`select 1 from lore where campania_id = $1`, [otra.id])).rows.length, 0)
  assert.equal((await db.query(`select 1 from lore_revision where campania_id = $1`, [otra.id])).rows.length, 0)
})

test('importar: insertar sin madre y luego enlazar por origen', async () => {
  // Así lo hará el importador (como postgres, sin RLS)
  await db.query(`insert into lore (campania_id, titulo, contenido, orden, origen) values
    ($1, 'Hija importada', 'b', 10, 'notion-b'), ($1, 'Madre importada', 'a', 30, 'notion-a')`, [camp.id])
  await db.query(`update lore h set padre_id = m.id from lore m
    where h.campania_id = $1 and m.campania_id = $1 and h.origen = 'notion-b' and m.origen = 'notion-a'`, [camp.id])
  const { rows } = await db.query(`select h.titulo, m.titulo as madre, h.visible from lore h join lore m on m.id = h.padre_id where h.origen = 'notion-b'`)
  assert.deepEqual(rows, [{ titulo: 'Hija importada', madre: 'Madre importada', visible: false }])
  // Reimportar la misma página no la duplica
  await db.query(`insert into lore (campania_id, titulo, origen) values ($1, 'Madre v2', 'notion-a')
    on conflict (campania_id, origen) where origen is not null do update set titulo = excluded.titulo`, [camp.id])
  assert.equal((await db.query(`select titulo from lore where origen = 'notion-a'`)).rows[0].titulo, 'Madre v2')
})
