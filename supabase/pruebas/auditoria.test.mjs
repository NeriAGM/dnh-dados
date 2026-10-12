// Auditoría de la base de datos (migración 008): cada prueba demuestra un
// hueco que existía con 001–007 y comprueba que la 008 lo cierra.
//
// Correr:  npm run probar

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preparar, U, DUAL } from './base.mjs'

const { db, como, camp, pj } = await preparar()

// En Supabase el rol anon (sin sesión, con la llave pública de la app)
// también puede leer storage.objects; aquí se imita.
await db.exec(`grant select on storage.objects to anon`)

// Como alguien SIN sesión: rol anon de verdad (no authenticated sin uid)
const comoAnon = async (q, params) => {
  await db.exec(`set role anon; select set_config('test.uid', '', false);`)
  try { return { filas: (await db.query(q, params)).rows } }
  catch (e) { return { error: e.message } }
  finally { await db.exec('reset role') }
}

const tirarComo = (uid, tipo, grupos, extra = {}) => como(uid,
  `select * from tirar($1, $2, $3, $4::jsonb, $5, null, false, $6, $7)`,
  [camp.id, extra.personaje === undefined ? pj.id : extra.personaje, tipo, JSON.stringify(grupos), extra.mod ?? 0, extra.etiqueta ?? null, extra.danoCritico ?? false])

// ---------------------------------------------------------------------
// 1. Hojas: anon y ex-miembros
// ---------------------------------------------------------------------

test('sin sesión nadie edita la hoja de un personaje sin dueño (importado)', async () => {
  await como(U.dj, `select importar_personajes($1, '[{"nombre":"Huérfano","hoja":{"pg":1}}]'::jsonb)`, [camp.id])
  const { rows: [h] } = await db.query(`select id from personajes where nombre = 'Huérfano'`)
  // anon con la llave pública: antes pasaba porque null "no es distinto de" null
  const r = await comoAnon(`select id from ajustar_hoja($1, '{pg}', '99')`, [h.id])
  assert.ok(r.error, 'anon no debe poder llamar ajustar_hoja')
  // authenticated sin uid (sesión rota): tampoco
  const r2 = await como('', `select id from ajustar_hoja($1, '{pg}', '99')`, [h.id])
  assert.ok(r2.error)
  const { rows: [d] } = await db.query(`select hoja from personajes where id = $1`, [h.id])
  assert.equal(d.hoja.pg, 1, 'la hoja no cambió')
})

test('quien ya no es miembro no puede seguir editando la hoja de su personaje', async () => {
  await como(U.dj, `delete from miembros where campania_id = $1 and usuario_id = $2`, [camp.id, U.ana])
  try {
    const r = await como(U.ana, `select id from ajustar_hoja($1, '{pg}', '7')`, [pj.id])
    assert.match(r.error ?? '', /dueño|DJ|campaña/)
    const r2 = await como(U.ana, `update personajes set nombre = 'Vandalizado' where id = $1 returning id`, [pj.id])
    assert.equal(r2.filas?.length ?? 0, 0)
  } finally {
    await db.exec(`insert into miembros (campania_id, usuario_id, rol) values ('${camp.id}', '${U.ana}', 'jugador') on conflict do nothing`)
  }
  // De vuelta en la campaña, sí puede
  assert.equal((await como(U.ana, `select id from ajustar_hoja($1, '{pg}', '2')`, [pj.id])).error, undefined)
})

test('anon no puede ejecutar ninguna función de la app', async () => {
  const llamadas = [
    [`select tirar($1, null, 'libre', '[{"lados":6}]'::jsonb)`, [camp.id]],
    [`select crear_campania('Spam')`],
    [`select unirse_campania('ABCDEF')`],
    [`select ajustar_miedo($1, 1)`, [camp.id]],
    [`select importar_personajes($1, '[]'::jsonb)`, [camp.id]],
    [`select asignar_personaje($1, null)`, [pj.id]],
    [`select activar_encuentro($1)`, [pj.id]],
    [`select guardar_ajustes($1, '{}'::jsonb)`, [camp.id]],
    [`select guardar_fondo('{}'::jsonb)`],
    [`select es_miembro($1)`, [camp.id]],
    [`select es_dj($1)`, [camp.id]],
    [`select comparte_campania($1)`, [U.dj]],
    [`select lore_visible($1)`, [pj.id]],
    [`select fondos_cuantos()`],
  ]
  for (const [q, p] of llamadas) {
    const r = await comoAnon(q, p)
    assert.match(r.error ?? 'sin error', /permission denied/, q)
  }
})

// ---------------------------------------------------------------------
// 2. tirar(): dados de Dualidad trucados y otros abusos
// ---------------------------------------------------------------------

test('acción y reacción solo aceptan un d12 de Esperanza y un d12 de Miedo (más un d6 de ventaja)', async () => {
  const malas = [
    [{ lados: 100, rol: 'esperanza' }, { lados: 2, rol: 'miedo' }],                       // casi siempre Esperanza
    [{ lados: 2, rol: 'esperanza' }, { lados: 2, rol: 'miedo' }],                         // 50 % de crítico
    [{ lados: 12, cantidad: 30, conservar: 'alto', rol: 'esperanza' }, { lados: 12, rol: 'miedo' }],
    [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo', signo: -1 }],            // el Miedo restando
    [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }],
    [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }, { lados: 20, rol: 'ventaja' }],
    [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }, { lados: 6, rol: 'desventaja', signo: 1 }],
    [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }, { lados: 6, rol: 'ventaja', cantidad: 5 }],
    [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }, { lados: 6, rol: 'ventaja' }, { lados: 6, rol: 'ventaja' }],
  ]
  for (const g of malas) {
    for (const tipo of ['accion', 'reaccion']) {
      const r = await tirarComo(U.ana, tipo, g)
      assert.ok(r.error, `${tipo} debió rechazar ${JSON.stringify(g)}`)
    }
  }
  // Lo que manda la app sigue funcionando
  const buenas = [
    JSON.parse(DUAL),
    [...JSON.parse(DUAL), { lados: 6, rol: 'ventaja', signo: 1 }],
    [...JSON.parse(DUAL), { lados: 6, rol: 'desventaja', signo: -1 }],
  ]
  for (const g of buenas) assert.equal((await tirarComo(U.ana, 'accion', g)).error, undefined, JSON.stringify(g))
  // "Evitar la muerte": el d12 de Esperanza solo, en tirada libre
  assert.equal((await tirarComo(U.ana, 'libre', [{ lados: 12, cantidad: 1, rol: 'esperanza' }])).error, undefined)
})

test('un jugador no puede hacer tiradas de adversario (tipo dj)', async () => {
  const r = await tirarComo(U.ana, 'dj', [{ lados: 20 }], { personaje: null })
  assert.match(r.error ?? '', /Solo el DJ/)
  assert.equal((await tirarComo(U.dj, 'dj', [{ lados: 20 }], { personaje: null })).error, undefined)
})

test('el daño crítico solo aplica a tiradas de daño', async () => {
  const r = await tirarComo(U.ana, 'accion', JSON.parse(DUAL), { danoCritico: true })
  assert.ok(r.error, 'una acción no puede sumar el máximo de los dados')
  const d = await tirarComo(U.ana, 'dano', [{ lados: 8, cantidad: 2 }], { danoCritico: true })
  assert.equal(d.error, undefined)
  assert.equal(d.filas[0].efectos.dano_critico_extra, 16)
})

test('la etiqueta de una tirada tiene tope de 200 caracteres', async () => {
  const r = await tirarComo(U.ana, 'libre', [{ lados: 6 }], { personaje: null, etiqueta: 'x'.repeat(50000) })
  assert.equal(r.error, undefined)
  assert.ok(r.filas[0].etiqueta.length <= 200)
})

// ---------------------------------------------------------------------
// 3. Storage
// ---------------------------------------------------------------------

test('nadie puede listar los fondos ajenos (ni sin sesión); los tuyos sí', async () => {
  await como(U.ana, `insert into storage.objects (bucket_id, name) values ('fondos', $1)`, [`${U.ana}/1-mi-cuarto.png`])
  const anon = await comoAnon(`select name from storage.objects where bucket_id = 'fondos'`)
  assert.deepEqual(anon.filas ?? [], [], 'anon enumeraba todas las imágenes y carpetas (= ids de usuario)')
  const intruso = await como(U.intruso, `select name from storage.objects where bucket_id = 'fondos' and name like $1`, [`${U.ana}/%`])
  assert.deepEqual(intruso.filas, [])
  const propia = await como(U.ana, `select name from storage.objects where bucket_id = 'fondos' and name like $1`, [`${U.ana}/%`])
  assert.equal(propia.filas.length, 1)
  // y la puede borrar (Storage necesita leerla para borrarla)
  await como(U.ana, `delete from storage.objects where name = $1`, [`${U.ana}/1-mi-cuarto.png`])
  assert.equal((await db.query(`select 1 from storage.objects where name = $1`, [`${U.ana}/1-mi-cuarto.png`])).rows.length, 0)
})

test('una imagen oculta del lore no se abre porque otra visible empiece igual', async () => {
  const oculta = `${camp.id}/jefe`
  const publica = `${camp.id}/jefe-final.png`
  await como(U.dj, `insert into storage.objects (bucket_id, name) values ('lore', $1), ('lore', $2)`, [oculta, publica])
  await como(U.dj, `insert into lore (campania_id, titulo, contenido, visible) values ($1, 'Secreto', '![j](lore:jefe)', false), ($1, 'Revelado', '![j](lore:jefe-final.png)', true)`, [camp.id])
  const veo = async (n) => ((await como(U.ana, `select name from storage.objects where bucket_id = 'lore' and name = $1`, [n])).filas ?? []).length === 1
  assert.equal(await veo(publica), true)
  assert.equal(await veo(oculta), false, 'la imagen oculta se filtraba por coincidencia de prefijo')
})

// ---------------------------------------------------------------------
// 4. Miembros y perfiles
// ---------------------------------------------------------------------

test('el DJ no puede quitarse a sí mismo y dejar la campaña sin DJ', async () => {
  const otra = (await como(U.intruso, `select * from crear_campania('Otra')`)).filas[0]
  await como(U.intruso, `delete from miembros where campania_id = $1 and usuario_id = $2`, [otra.id, U.intruso])
  const { rows } = await db.query(`select rol from miembros where campania_id = $1`, [otra.id])
  assert.deepEqual(rows.map((r) => r.rol), ['dj'], 'la campaña se quedaba huérfana para siempre')
  // Un jugador sí puede salirse
  await como(U.ana, `select unirse_campania($1)`, [otra.codigo_invitacion])
  await como(U.ana, `delete from miembros where campania_id = $1 and usuario_id = $2`, [otra.id, U.ana])
  assert.equal((await db.query(`select 1 from miembros where campania_id = $1 and usuario_id = $2`, [otra.id, U.ana])).rows.length, 0)
})

test('el perfil no acepta nombres vacíos o enormes ni fotos que no sean https', async () => {
  assert.ok((await como(U.ana, `update perfiles set nombre = $1 where id = $2`, ['x'.repeat(100000), U.ana])).error, 'nombre enorme')
  assert.ok((await como(U.ana, `update perfiles set nombre = '   ' where id = $1`, [U.ana])).error, 'nombre en blanco')
  assert.ok((await como(U.ana, `update perfiles set avatar_url = 'javascript:alert(1)' where id = $1`, [U.ana])).error, 'foto javascript:')
  assert.equal((await como(U.ana, `update perfiles set nombre = 'Ana B.', avatar_url = 'https://cdn.discordapp.com/x.png' where id = $1`, [U.ana])).error, undefined)
  await db.exec(`update perfiles set nombre = 'Ana', avatar_url = null where id = '${U.ana}'`)
})

test('el perfil nuevo salta nombres vacíos, recorta los largos y descarta fotos raras', async () => {
  const a = '44444444-4444-4444-4444-444444444444'
  const b = '55555555-5555-5555-5555-555555555555'
  await db.query(`insert into auth.users values ($1, 'pepe@x.com', $2::jsonb), ($3, null, $4::jsonb)`, [
    a, JSON.stringify({ custom_claims: { global_name: '  ' }, full_name: 'Pepe', avatar_url: 'javascript:alert(1)' }),
    b, JSON.stringify({ name: 'N'.repeat(300) }),
  ])
  const { rows } = await db.query(`select id, nombre, avatar_url from perfiles where id in ($1, $2)`, [a, b])
  const p = Object.fromEntries(rows.map((r) => [r.id, r]))
  assert.equal(p[a].nombre, 'Pepe')
  assert.equal(p[a].avatar_url, null)
  assert.equal(p[b].nombre.length, 80)
})

test('quien se registró antes de la 001 (sin perfil) igual puede crear o unirse a campañas', async () => {
  const viejo = '66666666-6666-6666-6666-666666666666'
  await db.exec(`alter table auth.users disable trigger al_registrarse;
    insert into auth.users values ('${viejo}', 'viejo@x.com', '{"full_name":"Veterano"}');
    alter table auth.users enable trigger al_registrarse;`)
  const r = await como(viejo, `select * from unirse_campania($1)`, [camp.codigo_invitacion])
  assert.equal(r.error, undefined, 'antes tronaba con violación de llave foránea')
  const { rows: [p] } = await db.query(`select nombre from perfiles where id = $1`, [viejo])
  assert.equal(p.nombre, 'Veterano')
})

// ---------------------------------------------------------------------
// 5. Entradas sin tope
// ---------------------------------------------------------------------

test('el contenido casero tiene tope de tamaño', async () => {
  const enorme = JSON.stringify({ texto: 'x'.repeat(400000) })
  const r = await como(U.ana, `insert into contenido_casero (campania_id, tipo, nombre, datos, creado_por) values ($1, 'objeto', 'Ladrillo', $2::jsonb, $3)`, [camp.id, enorme, U.ana])
  assert.match(r.error ?? '', /demasiado grande/)
  const ok = await como(U.ana, `insert into contenido_casero (campania_id, tipo, nombre, datos, creado_por) values ($1, 'objeto', 'Cuerda', '{"texto":"10 m"}', $2) returning id`, [camp.id, U.ana])
  assert.equal(ok.error, undefined)
  const r2 = await como(U.ana, `update contenido_casero set datos = $1::jsonb where id = $2`, [enorme, ok.filas[0].id])
  assert.match(r2.error ?? '', /demasiado grande/)
})

test('el color del personaje solo acepta colores (no url() de rastreo en el CSS)', async () => {
  const r = await como(U.ana, `update personajes set color = 'url(https://malo.example/rastreo.png)' where id = $1`, [pj.id])
  assert.match(r.error ?? '', /color/i)
  assert.equal((await como(U.ana, `update personajes set color = '#4a90e2' where id = $1`, [pj.id])).error, undefined)
  // Al importar un color raro se usa el de siempre en vez de tronar la importación
  await como(U.dj, `select importar_personajes($1, '[{"nombre":"Raro","color":"var(--x) url(a)"}]'::jsonb)`, [camp.id])
  const { rows: [x] } = await db.query(`select color from personajes where nombre = 'Raro'`)
  assert.equal(x.color, '#e8b04a')
})
