-- =====================================================================
-- Dolor & Hambre · Mesa — migración 011: retirar el tirador anterior
--
-- Las tablas viejas public.jugadores y public.tiradas (de antes de la
-- 001) tenían políticas abiertas a public/anon: cualquiera con la llave
-- pública podía leer, insertar y borrar jugadores, y leer, insertar y
-- cambiar tiradas. Solo las usaba public/legado/, que ya se quitó.
--
-- Antes de correrla: respaldo hecho (ver docs/PENDIENTES.md).
-- Sin CASCADE a propósito: si algo más dependiera de estas tablas (una
-- vista, una llave foránea), falla y no borra nada.
-- Se puede correr más de una vez.
-- =====================================================================

begin;

drop table if exists public.jugadores, public.tiradas;

commit;
