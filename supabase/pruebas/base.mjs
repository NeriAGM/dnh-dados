// Base común de las pruebas de base de datos: levanta un Postgres en memoria
// (PGlite), imita lo mínimo de Supabase y aplica TODAS las migraciones de
// supabase/migraciones en orden. Cada archivo *.test.mjs la importa.

import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'

const CARPETA = new URL('../migraciones/', import.meta.url)
const MIGRACIONES = fs.readdirSync(CARPETA).filter((f) => f.endsWith('.sql')).sort().map((f) => new URL(f, CARPETA))

export const U = {
  dj: '11111111-1111-1111-1111-111111111111',
  ana: '22222222-2222-2222-2222-222222222222',
  intruso: '33333333-3333-3333-3333-333333333333',
}

export async function preparar() {
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
    -- Imitación de Supabase Storage (archivos)
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid default auth.uid(), metadata jsonb default '{}', created_at timestamptz default now());
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    grant usage on schema storage to anon, authenticated;
    grant all on storage.objects to authenticated; grant select on storage.buckets to anon, authenticated;
    alter table storage.objects enable row level security;
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


export const DUAL = JSON.stringify([{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }])
