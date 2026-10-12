// Pruebas de la base de datos sin tocar Supabase de verdad:
// levanta un Postgres en memoria (PGlite), aplica la migración y revisa
// que las reglas y la seguridad hagan lo que deben.
//
// Correr:  npm run probar

import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const MIGRACIONES = ['001_mesa.sql', '002_hoja.sql', '003_dj.sql'].map((f) => new URL(`../migraciones/${f}`, import.meta.url))

const U = {
  dj: '11111111-1111-1111-1111-111111111111',
  ana: '22222222-2222-2222-2222-222222222222',
  intruso: '33333333-3333-3333-3333-333333333333',
}

async function preparar() {
  const db = new PGlite({ extensions: { pgcrypto } })
  // Imitación mínima de lo que Supabase ya trae
  await db.exec(`
    create schema extensions;
    create schema auth;
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public, extensions to anon, authenticated;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create publication supabase_realtime;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
  `)
  for (const m of MIGRACIONES) await db.exec(fs.readFileSync(m, 'utf8'))
  await db.exec(`
    insert into auth.users values ('${U.dj}', 'neri@x.com', '{"full_name":"Neri"}'),
      ('${U.ana}', 'ana@x.com', '{"custom_claims":{"global_name":"Ana"}}'),
      ('${U.intruso}', 'malo@x.com', '{}');
  `)
  const como = async (uid, q, params) => {
    await db.exec(`set role authenticated; select set_config('test.uid', '${uid}', false);`)
    try { return { filas: (await db.query(q, params)).rows } }
    catch (e) { return { error: e.message } }
    finally { await db.exec('reset role') }
  }
  const camp = (await como(U.dj, `select * from crear_campania('Dolor & Hambre')`)).filas[0]
  await como(U.ana, `select * from unirse_campania($1)`, [camp.codigo_invitacion.toLowerCase()])
  const pj = (await como(U.ana, `insert into personajes (campania_id, usuario_id, nombre) values ($1, $2, 'Mira') returning *`, [camp.id, U.ana])).filas[0]
  return { db, como, camp, pj }
}

const DUAL = JSON.stringify([{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }])
const ctx = await preparar()
const { db, como, camp, pj } = ctx

test('el perfil toma el nombre de Discord o del correo', async () => {
  const { rows } = await db.query('select nombre from perfiles order by nombre')
  assert.deepEqual(rows.map((r) => r.nombre).sort(), ['Ana', 'Neri', 'malo'])
})

test('unirse con un código que no existe da un error claro', async () => {
  const r = await como(U.ana, `select * from unirse_campania('ZZZZZZ')`)
  assert.match(r.error, /no existe/)
})

test('la tirada de acción aplica Esperanza, Miedo y crítico', async () => {
  await db.exec(`update personajes set esperanza = 0, estres = 3 where id = '${pj.id}'; update campanias set miedo = 0 where id = '${camp.id}'`)
  let esp = 0, mie = 0, cri = 0
  for (let i = 0; i < 40; i++) {
    const t = (await como(U.ana, `select * from tirar($1, $2, 'accion', $3::jsonb, 2)`, [camp.id, pj.id, DUAL])).filas[0]
    const [e, m] = t.dados.map((d) => d.valor)
    assert.equal(t.total, e + m + 2, 'total = Esperanza + Miedo + modificador')
    if (e === m) { assert.equal(t.desenlace, 'critico'); assert.equal(t.exito, true); cri++ }
    else if (e > m) { assert.equal(t.desenlace, 'esperanza'); esp++ }
    else { assert.equal(t.desenlace, 'miedo'); mie++ }
  }
  const { rows: [p] } = await db.query(`select esperanza, estres from personajes where id = '${pj.id}'`)
  const { rows: [c] } = await db.query(`select miedo from campanias where id = '${camp.id}'`)
  assert.equal(p.esperanza, Math.min(6, esp + cri), 'Esperanza sube 1 por éxito con Esperanza o crítico, tope 6')
  assert.equal(c.miedo, Math.min(12, mie), 'Miedo sube 1 por tirada con Miedo, tope 12')
  assert.equal(p.estres, Math.max(0, 3 - cri), 'el crítico limpia 1 Estrés')
})

test('la reacción no genera Esperanza ni Miedo', async () => {
  await db.exec(`update personajes set esperanza = 0 where id = '${pj.id}'; update campanias set miedo = 0 where id = '${camp.id}'`)
  for (let i = 0; i < 15; i++) await como(U.ana, `select * from tirar($1, $2, 'reaccion', $3::jsonb)`, [camp.id, pj.id, DUAL])
  const { rows: [p] } = await db.query(`select esperanza from personajes where id = '${pj.id}'`)
  const { rows: [c] } = await db.query(`select miedo from campanias where id = '${camp.id}'`)
  assert.equal(p.esperanza, 0)
  assert.equal(c.miedo, 0)
})

test('ventaja suma un d6 y desventaja lo resta', async () => {
  const g = JSON.stringify([{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }, { lados: 6, rol: 'desventaja', signo: -1 }])
  const t = (await como(U.ana, `select * from tirar($1, $2, 'reaccion', $3::jsonb, 1)`, [camp.id, pj.id, g])).filas[0]
  const [e, m, d] = t.dados.map((x) => x.valor)
  assert.equal(t.total, e + m - d + 1)
})

test('el DJ con ventaja se queda con el d20 más alto', async () => {
  for (let i = 0; i < 10; i++) {
    const t = (await como(U.dj, `select * from tirar($1, null, 'dj', $2::jsonb, 5)`, [camp.id, JSON.stringify([{ lados: 20, cantidad: 2, conservar: 'alto' }])])).filas[0]
    const vals = t.dados.map((d) => d.valor)
    assert.equal(t.total, Math.max(...vals) + 5)
    assert.equal(t.dados.filter((d) => d.descartado).length, 1)
    assert.equal(t.critico, Math.max(...vals) === 20)
  }
})

test('el daño crítico suma el máximo de los dados', async () => {
  const t = (await como(U.ana, `select * from tirar($1, $2, 'dano', $3::jsonb, 3, null, false, 'Espada', true)`, [camp.id, pj.id, JSON.stringify([{ lados: 8, cantidad: 2 }])])).filas[0]
  assert.equal(t.efectos.dano_critico_extra, 16)
  assert.equal(t.total, t.dados[0].valor + t.dados[1].valor + 3 + 16)
})

test('nadie puede escribir tiradas a mano', async () => {
  const r = await como(U.ana, `insert into lanzamientos (campania_id, usuario_id, tipo, formula, dados, total) values ($1, $2, 'libre', 'x', '[]', 99)`, [camp.id, U.ana])
  assert.match(r.error, /row-level security/)
  const u = await como(U.ana, `update lanzamientos set total = 99 returning id`)
  assert.deepEqual(u.filas, [])
})

test('alguien de fuera no puede tirar ni ver tiradas', async () => {
  assert.match((await como(U.intruso, `select * from tirar($1, null, 'libre', '[{"lados":6}]'::jsonb)`, [camp.id])).error, /No eres parte/)
  assert.equal((await como(U.intruso, `select count(*)::int n from lanzamientos`)).filas[0].n, 0)
})

test('solo el DJ hace tiradas ocultas y solo él las ve', async () => {
  assert.match((await como(U.ana, `select * from tirar($1, null, 'libre', '[{"lados":6}]'::jsonb, 0, null, true)`, [camp.id])).error, /Solo el DJ/)
  await como(U.dj, `select * from tirar($1, null, 'dj', '[{"lados":20}]'::jsonb, 0, null, true, 'secreta')`, [camp.id])
  assert.equal((await como(U.ana, `select count(*)::int n from lanzamientos where oculta`)).filas[0].n, 0)
  assert.equal((await como(U.dj, `select count(*)::int n from lanzamientos where oculta`)).filas[0].n, 1)
})

test('un jugador no toca el Miedo ni el azar', async () => {
  assert.deepEqual((await como(U.ana, `update campanias set miedo = 0 where id = $1 returning miedo`, [camp.id])).filas, [])
  assert.match((await como(U.ana, `select ajustar_miedo($1, 5)`, [camp.id])).error, /Solo el DJ/)
  assert.match((await como(U.ana, `select azar(6)`)).error, /permission denied/)
})

test('no se puede tirar con el personaje de otro', async () => {
  await como(U.intruso, `select * from unirse_campania($1)`, [camp.codigo_invitacion])
  assert.match((await como(U.intruso, `select * from tirar($1, $2, 'accion', $3::jsonb)`, [camp.id, pj.id, DUAL])).error, /tu propio personaje/)
})

test('validaciones: dados raros y dualidad incompleta', async () => {
  assert.match((await como(U.ana, `select * from tirar($1, null, 'libre', '[{"lados":1000}]'::jsonb)`, [camp.id])).error, /Dado inválido/)
  assert.match((await como(U.ana, `select * from tirar($1, $2, 'reaccion', '[{"lados":12}]'::jsonb)`, [camp.id, pj.id])).error, /Esperanza y el d12 de Miedo/)
  assert.match((await como(U.ana, `select * from tirar($1, null, 'libre', '[{"lados":6,"cantidad":41}]'::jsonb)`, [camp.id])).error, /Demasiados/)
})

test('el azar no tiene sesgo (20,000 dualidades)', async () => {
  const { rows: [r] } = await db.query(`with t as (select azar(12) e, azar(12) m from generate_series(1, 20000))
    select count(*) filter (where e > m)::int esp, count(*) filter (where e < m)::int mie, count(*) filter (where e = m)::int cri from t`)
  // Esperado: 9167 / 9167 / 1667. Margen amplio (±4 desviaciones) para que no falle por mala suerte.
  assert.ok(Math.abs(r.esp - 9167) < 280, `Esperanza ganó ${r.esp}`)
  assert.ok(Math.abs(r.mie - 9167) < 280, `Miedo ganó ${r.mie}`)
  assert.ok(Math.abs(r.cri - 1667) < 160, `Críticos ${r.cri}`)
})

// ---------------------------------------------------------------------
// Fase 3: hoja de personaje y homebrew
// ---------------------------------------------------------------------

test('ajustar_hoja cambia una parte sin pisar las demás', async () => {
  await como(U.ana, `select ajustar_hoja($1, '{oro}', '{"punados":1,"bolsas":0}'::jsonb)`, [pj.id])
  await como(U.dj, `select ajustar_hoja($1, '{pg}', '3'::jsonb)`, [pj.id])
  await como(U.ana, `select ajustar_hoja($1, '{oro,bolsas}', '2'::jsonb)`, [pj.id])
  const { rows: [p] } = await db.query(`select hoja from personajes where id = '${pj.id}'`)
  assert.deepEqual(p.hoja, { oro: { punados: 1, bolsas: 2 }, pg: 3 })
})

test('nadie más puede editar la hoja ajena', async () => {
  assert.match((await como(U.intruso, `select ajustar_hoja($1, '{pg}', '0'::jsonb)`, [pj.id])).error, /dueño del personaje o el DJ/)
})

test('un jugador no se puede robar ni regalar un personaje', async () => {
  const r = await como(U.ana, `update personajes set usuario_id = $2 where id = $1`, [pj.id, U.intruso])
  assert.match(r.error, /Solo el DJ/)
  const ok = await como(U.dj, `select (asignar_personaje($1, $2)).usuario_id`, [pj.id, U.ana])
  assert.equal(ok.filas[0].usuario_id, U.ana)
})

test('el DJ importa personajes sin dueño; un jugador no puede', async () => {
  const lista = JSON.stringify([{ nombre: 'Soren', esperanza: 9, esperanza_max: 6, estres: 0, estres_max: 6, hoja: { nivel: 2 } }])
  assert.match((await como(U.ana, `select importar_personajes($1, $2::jsonb)`, [camp.id, lista])).error, /Solo el DJ/)
  const r = await como(U.dj, `select importar_personajes($1, $2::jsonb) n`, [camp.id, lista])
  assert.equal(r.filas[0].n, 1)
  const { rows: [s] } = await db.query(`select usuario_id, esperanza, hoja from personajes where nombre = 'Soren'`)
  assert.equal(s.usuario_id, null)
  assert.equal(s.esperanza, 6, 'la Esperanza se recorta al máximo')
  assert.deepEqual(s.hoja, { nivel: 2 })
})

test('homebrew: todos lo ven, edita quien lo creó o el DJ', async () => {
  const c = await como(U.ana, `insert into contenido_casero (campania_id, tipo, nombre, datos, creado_por) values ($1, 'clase', 'Artificiero', '{"evasion":10}', $2) returning id`, [camp.id, U.ana])
  const id = c.filas[0].id
  assert.equal((await como(U.dj, `select count(*)::int n from contenido_casero`)).filas[0].n, 1)
  assert.equal((await como(U.intruso, `select count(*)::int n from contenido_casero`)).filas[0].n, 1, 'el intruso ya se unió a la campaña en otra prueba')
  assert.deepEqual((await como(U.intruso, `update contenido_casero set nombre = 'X' where id = $1 returning id`, [id])).filas, [])
  assert.equal((await como(U.dj, `update contenido_casero set nombre = 'Artífice' where id = $1 returning nombre`, [id])).filas[0].nombre, 'Artífice')
  assert.match((await como(U.ana, `insert into contenido_casero (campania_id, tipo, nombre, creado_por) values ($1, 'clase', 'X', $2)`, [camp.id, U.dj])).error, /row-level security/, 'no puede firmar como otro')
})

// ---------------------------------------------------------------------
// Fase 4: panel del DJ
// ---------------------------------------------------------------------

test('los encuentros solo los ve y edita el DJ', async () => {
  const e = await como(U.dj, `insert into encuentros (campania_id, nombre, adversarios) values ($1, 'Emboscada', '[{"uid":"a","ref":"bear","pg":0}]') returning id`, [camp.id])
  assert.ok(e.filas?.[0]?.id, e.error)
  assert.equal((await como(U.ana, `select count(*)::int n from encuentros`)).filas[0].n, 0)
  assert.match((await como(U.ana, `insert into encuentros (campania_id, nombre) values ($1, 'X')`, [camp.id])).error, /row-level security/)
  assert.deepEqual((await como(U.ana, `update encuentros set nombre = 'X' returning id`)).filas, [])
})

test('solo puede haber un encuentro activo', async () => {
  const a = (await como(U.dj, `insert into encuentros (campania_id, nombre) values ($1, 'A') returning id`, [camp.id])).filas[0].id
  const b = (await como(U.dj, `insert into encuentros (campania_id, nombre) values ($1, 'B') returning id`, [camp.id])).filas[0].id
  await como(U.dj, `select activar_encuentro($1)`, [a])
  await como(U.dj, `select activar_encuentro($1)`, [b])
  const r = (await como(U.dj, `select nombre from encuentros where activo`)).filas
  assert.deepEqual(r.map((x) => x.nombre), ['B'])
  assert.match((await como(U.ana, `select activar_encuentro($1)`, [a])).error, /Solo el DJ/)
})

test('cuentas regresivas: la mesa ve solo las visibles', async () => {
  await como(U.dj, `insert into cuentas_regresivas (campania_id, nombre, valor, inicial, visible) values ($1, 'El puente cae', 3, 3, true), ($1, 'Secreto', 5, 5, false)`, [camp.id])
  assert.deepEqual((await como(U.ana, `select nombre from cuentas_regresivas order by nombre`)).filas.map((x) => x.nombre), ['El puente cae'])
  assert.equal((await como(U.dj, `select count(*)::int n from cuentas_regresivas`)).filas[0].n, 2)
  assert.deepEqual((await como(U.ana, `update cuentas_regresivas set valor = 0 returning id`)).filas, [])
})

test('homebrew acepta adversarios y entornos', async () => {
  const r = await como(U.dj, `insert into contenido_casero (campania_id, tipo, nombre, creado_por) values ($1, 'adversario', 'Gusano de ceniza', $2) returning tipo`, [camp.id, U.dj])
  assert.equal(r.filas?.[0]?.tipo, 'adversario', r.error)
})
