-- =====================================================================
-- Dolor & Hambre · Mesa — migración 003: panel del DJ
-- Encuentros (solo los ve el DJ) y cuentas regresivas (el DJ decide si
-- la mesa las ve). Solo agrega cosas.
-- =====================================================================

create table if not exists public.encuentros (
  id            uuid primary key default gen_random_uuid(),
  campania_id   uuid not null references public.campanias (id) on delete cascade,
  nombre        text not null default 'Encuentro' check (char_length(nombre) between 1 and 80),
  entorno       text,                       -- id del entorno del catálogo (o "casero:<uuid>")
  ajustes       text[] not null default '{}', -- ajustes al presupuesto de puntos de batalla (ver reglas.js)
  pjs           int,                        -- cuántos PJ pelean (null = los de la campaña)
  adversarios   jsonb not null default '[]'::jsonb,
  -- [{ uid, ref, nombre, pg, estres, notas, oculto }]
  activo        boolean not null default false,
  notas         text not null default '',
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);
create index if not exists encuentros_campania on public.encuentros (campania_id, creado desc);

create table if not exists public.cuentas_regresivas (
  id           uuid primary key default gen_random_uuid(),
  campania_id  uuid not null references public.campanias (id) on delete cascade,
  nombre       text not null check (char_length(nombre) between 1 and 80),
  valor        int  not null default 4 check (valor between 0 and 99),
  inicial      int  not null default 4 check (inicial between 0 and 99),
  tipo         text not null default 'estandar' check (tipo in ('estandar', 'dinamica', 'bucle', 'largo-plazo')),
  visible      boolean not null default true,
  creado       timestamptz not null default now()
);
create index if not exists cuentas_campania on public.cuentas_regresivas (campania_id, creado);

-- Homebrew: ahora también adversarios y entornos
alter table public.contenido_casero drop constraint if exists contenido_casero_tipo_check;
alter table public.contenido_casero add constraint contenido_casero_tipo_check
  check (tipo in ('clase', 'subclase', 'carta', 'arma', 'armadura', 'ancestria', 'comunidad', 'dominio', 'objeto', 'adversario', 'entorno'));

-- Un solo encuentro activo por campaña
create or replace function public.activar_encuentro(p_encuentro uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  select campania_id into c from encuentros where id = p_encuentro;
  if c is null then raise exception 'Ese encuentro no existe'; end if;
  if not es_dj(c) then raise exception 'Solo el DJ maneja encuentros'; end if;
  update encuentros set activo = (id = p_encuentro) where campania_id = c;
end;
$$;

create or replace function public.tocar_actualizado()
returns trigger language plpgsql as $$
begin new.actualizado := now(); return new; end;
$$;
drop trigger if exists encuentros_actualizado on public.encuentros;
create trigger encuentros_actualizado before update on public.encuentros
  for each row execute function public.tocar_actualizado();

alter table public.encuentros enable row level security;
alter table public.cuentas_regresivas enable row level security;

drop policy if exists encuentros_dj on public.encuentros;
create policy encuentros_dj on public.encuentros for all to authenticated
  using (es_dj(campania_id)) with check (es_dj(campania_id));

drop policy if exists cuentas_ver on public.cuentas_regresivas;
create policy cuentas_ver on public.cuentas_regresivas for select to authenticated
  using (es_dj(campania_id) or (visible and es_miembro(campania_id)));
drop policy if exists cuentas_dj on public.cuentas_regresivas;
create policy cuentas_dj on public.cuentas_regresivas for all to authenticated
  using (es_dj(campania_id)) with check (es_dj(campania_id));

do $$
begin
  begin alter publication supabase_realtime add table public.encuentros; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.cuentas_regresivas; exception when duplicate_object then null; end;
end $$;
