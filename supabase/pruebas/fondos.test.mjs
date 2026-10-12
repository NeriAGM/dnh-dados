// Pruebas de los fondos personalizados: carpeta propia en Storage, límite
// de 10 imágenes, nadie borra lo ajeno y guardar_fondo solo toca tu perfil.
//
// Correr:  npm run probar

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparar, U } from './base.mjs'

const { db, como } = await preparar()
const subir = (uid, nombre) => como(uid, `insert into storage.objects (bucket_id, name) values ('fondos', $1) returning name`, [nombre])

test('el bucket de fondos existe, es público y solo acepta imágenes de hasta 5 MB', async () => {
  const { rows: [b] } = await db.query(`select * from storage.buckets where id = 'fondos'`)
  assert.equal(b.public, true)
  assert.equal(Number(b.file_size_limit), 5 * 1024 * 1024)
  assert.deepEqual(b.allowed_mime_types.sort(), ['image/gif', 'image/jpeg', 'image/png', 'image/webp'])
})

test('puedes subir a tu propia carpeta', async () => {
  const r = await subir(U.ana, `${U.ana}/1-bosque.png`)
  assert.equal(r.error, undefined)
  assert.equal(r.filas[0].name, `${U.ana}/1-bosque.png`)
})

test('no puedes subir a la carpeta de otro, ni fuera de una carpeta, ni a otro bucket', async () => {
  assert.match((await subir(U.intruso, `${U.ana}/malo.png`)).error, /row-level security/)
  assert.match((await subir(U.intruso, `malo.png`)).error, /row-level security/)
  assert.match((await subir(U.intruso, `${U.intruso}/sub/malo.png`)).error, /row-level security/)
  await db.exec(`insert into storage.buckets (id, name) values ('otro', 'otro') on conflict do nothing`)
  const r = await como(U.intruso, `insert into storage.objects (bucket_id, name) values ('otro', $1)`, [`${U.intruso}/x.png`])
  assert.match(r.error, /row-level security/)
})

test('la imagen número 11 se rechaza', async () => {
  for (let i = 1; i <= 10; i++) {
    const r = await subir(U.dj, `${U.dj}/${i}-fondo.jpg`)
    assert.equal(r.error, undefined, `la imagen ${i} sí debe entrar`)
  }
  assert.match((await subir(U.dj, `${U.dj}/11-fondo.jpg`)).error, /row-level security/)
  // Al borrar una, vuelve a haber lugar
  await como(U.dj, `delete from storage.objects where name = $1`, [`${U.dj}/1-fondo.jpg`])
  assert.equal((await subir(U.dj, `${U.dj}/12-fondo.jpg`)).error, undefined)
})

test('nadie puede borrar ni renombrar las imágenes de otro; las tuyas sí', async () => {
  const nombre = `${U.ana}/1-bosque.png`
  await como(U.intruso, `delete from storage.objects where name = $1`, [nombre])
  await como(U.intruso, `update storage.objects set name = $2 where name = $1`, [nombre, `${U.intruso}/robado.png`])
  let { rows } = await db.query(`select name from storage.objects where name = $1`, [nombre])
  assert.equal(rows.length, 1, 'sigue ahí')
  // Tampoco puede mover algo suyo a la carpeta ajena
  await subir(U.intruso, `${U.intruso}/propio.png`)
  const r = await como(U.intruso, `update storage.objects set name = $2 where name = $1`, [`${U.intruso}/propio.png`, `${U.ana}/regalo.png`])
  assert.match(r.error, /row-level security/)
  await como(U.ana, `delete from storage.objects where name = $1`, [nombre]);
  ({ rows } = await db.query(`select name from storage.objects where name = $1`, [nombre]))
  assert.equal(rows.length, 0)
})

test('todos pueden ver los fondos (bucket público)', async () => {
  const r = await como(U.ana, `select name from storage.objects where bucket_id = 'fondos' and name like $1`, [`${U.dj}/%`])
  assert.ok(r.filas.length >= 10)
})

test('guardar_fondo solo cambia el perfil de quien llama', async () => {
  const fondo = { tablero: { noche: 'pueblo:noche' }, modo: 'cubrir', tono: 20 }
  const r = await como(U.ana, `select guardar_fondo($1::jsonb)`, [JSON.stringify(fondo)])
  assert.equal(r.error, undefined)
  const { rows } = await db.query(`select id, fondo from perfiles`)
  const porId = Object.fromEntries(rows.map((f) => [f.id, f.fondo]))
  assert.deepEqual(porId[U.ana], fondo)
  assert.deepEqual(porId[U.dj], {})
  assert.deepEqual(porId[U.intruso], {})
})

test('guardar_fondo rechaza lo que no es objeto o es enorme', async () => {
  assert.match((await como(U.ana, `select guardar_fondo('[1,2]'::jsonb)`)).error, /no es válido/)
  const enorme = JSON.stringify({ x: 'a'.repeat(9000) })
  assert.match((await como(U.ana, `select guardar_fondo($1::jsonb)`, [enorme])).error, /demasiado grande/)
  // Tampoco por el camino directo (update a perfiles)
  const r = await como(U.ana, `update perfiles set fondo = $1::jsonb where id = $2`, [enorme, U.ana])
  assert.match(r.error, /perfiles_fondo_valido/)
})

test('sin sesión no se guarda fondo', async () => {
  const r = await como('', `select guardar_fondo('{}'::jsonb)`)
  assert.ok(r.error)
})
