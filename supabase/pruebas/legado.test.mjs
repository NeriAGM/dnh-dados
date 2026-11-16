// Migración 011: borra las tablas viejas del tirador anterior (jugadores,
// tiradas) y nada más. La base de prueba no las tiene (son de antes de la
// 001): aquí se crean como en producción y se vuelve a correr la 011.
//
// Correr:  npm run probar

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { preparar } from './base.mjs'

const SQL = fs.readFileSync(new URL('../migraciones/011_retirar_legado.sql', import.meta.url), 'utf8')
const { db, camp } = await preparar()
const existe = async (t) => (await db.query(`select to_regclass($1) as r`, [t])).rows[0].r !== null

test('la 011 solo borra jugadores y tiradas', () => {
  const sinComentarios = SQL.replace(/--.*$/gm, '')
  const borrados = [...sinComentarios.matchAll(/\bdrop\s+(\w+)[^;]*;/gi)].map((m) => m[0].replace(/\s+/g, ' ').trim())
  assert.deepEqual(borrados, ['drop table if exists public.jugadores, public.tiradas;'])
  assert.doesNotMatch(sinComentarios, /\b(cascade|delete|truncate)\b/i)
})

test('la 011 borra las tablas viejas y deja intacto lo demás', async () => {
  await db.exec(`
    create table public.jugadores (id bigint generated always as identity primary key, nombre text, created_at timestamptz default now());
    create table public.tiradas (id bigint generated always as identity primary key, jugador text, total int, anotado boolean default false);
    alter table public.jugadores enable row level security;
    create policy abierta on public.jugadores for all to public using (true) with check (true);
    insert into public.jugadores (nombre) values ('Uno'), ('Dos');
    insert into public.tiradas (jugador, total) values ('Uno', 14);
    alter publication supabase_realtime add table public.jugadores, public.tiradas;
  `)
  const antes = (await db.query(`select count(*)::int as n from campanias`)).rows[0].n
  await db.exec(SQL)
  assert.equal(await existe('public.jugadores'), false)
  assert.equal(await existe('public.tiradas'), false)
  assert.equal((await db.query(`select count(*)::int as n from campanias`)).rows[0].n, antes)
  assert.equal((await db.query(`select nombre from campanias where id = $1`, [camp.id])).rows[0].nombre, 'Dolor & Hambre')
  for (const t of ['perfiles', 'campanias', 'miembros', 'personajes', 'lanzamientos']) assert.ok(await existe(`public.${t}`), t)
  // Correrla otra vez no truena
  await db.exec(SQL)
})

test('sin CASCADE: si algo depende de las tablas viejas, no borra nada', async () => {
  await db.exec(`
    create table public.jugadores (id int primary key);
    create table public.tiradas (id int);
    create view public.vista_vieja as select id from public.jugadores;
  `)
  await assert.rejects(db.exec(SQL), /depend/)
  await db.exec('rollback')
  assert.ok(await existe('public.jugadores'))
  assert.ok(await existe('public.tiradas'))
  await db.exec(`drop view public.vista_vieja; drop table public.jugadores, public.tiradas;`)
})
