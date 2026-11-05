-- ===============================================================
-- vista_profesores_acceso: + es_prueba
--
-- SE EJECUTA EN LA BASE DE DRC GESTION, a mano, el archivo entero.
-- Parte de `gestion-vistas-profesor.sql`, ya ejecutado. Solo anade una
-- columna al final, desde teachers.is_test, para que la pestana de admin
-- marque los perfiles de prueba. `create or replace view` conserva los
-- permisos; el revoke se repite por seguridad. No cambia ninguna fila ni
-- afecta al LMS desplegado, que todavia no lee esta vista.
-- ===============================================================

begin;

create or replace view public.vista_profesores_acceso
with (security_invoker = on) as
select
  t.id                        as teacher_id,
  t.name                      as profesor,
  lower(btrim(t.email))       as email,
  (t.archived_at is not null) as archivado,
  coalesce(t.is_test, false)  as es_prueba
from public.teachers t
where btrim(coalesce(t.name, '')) <> '';

revoke all on public.vista_profesores_acceso from anon, authenticated;

commit;


-- ---------------------------------------------------------------
-- COMPROBACION. Una sola consulta. En las filas con `esperado` distinto
-- de 'informativo', `resultado` tiene que coincidir. Si no, PARA y
-- pasame la salida. Pasame tambien las informativas: dicen que profesores
-- estan marcados de prueba y cuales reciben los avisos en otra direccion.
-- No devuelve ninguna direccion de correo.
-- ---------------------------------------------------------------

select comprobacion, resultado, esperado
from (
  select 1 as orden, 'columnas de la vista' as comprobacion,
         (select count(*) from information_schema.columns
           where table_schema = 'public' and table_name = 'vista_profesores_acceso')::text as resultado,
         '5' as esperado
  union all
  select 2, 'la columna 5 es es_prueba',
         (select column_name::text from information_schema.columns
           where table_schema = 'public' and table_name = 'vista_profesores_acceso' and ordinal_position = 5),
         'es_prueba'
  union all
  select 3, 'profesores = vista_profesores',
         (select count(*) from public.vista_profesores_acceso)::text,
         (select count(*) from public.vista_profesores)::text
  union all
  select 4, 'anon lee la vista', has_table_privilege('anon', 'public.vista_profesores_acceso', 'select')::text, 'false'
  union all
  select 5, 'authenticated lee la vista', has_table_privilege('authenticated', 'public.vista_profesores_acceso', 'select')::text, 'false'
  union all
  select 6, 't1 marcado de prueba',
         coalesce((select es_prueba::text from public.vista_profesores_acceso where teacher_id = 't1'), 'no existe'),
         'true'
  union all
  select 7, 'marcado de prueba: ' || teacher_id || ' ' || profesor,
         case when archivado then 'archivado' else 'en plantilla' end,
         'informativo'
    from public.vista_profesores_acceso
   where es_prueba
  union all
  select 8, 'avisos en otra direccion: ' || t.id || ' ' || t.name,
         case when exists (select 1 from public.assignments a where a.teacher_id = t.id and a.status = 'active')
              then 'con alumnos activos' else 'sin alumnos activos' end,
         'informativo'
    from public.teachers t
   where t.archived_at is null
     and btrim(coalesce(t.notification_email, '')) <> ''
     and lower(btrim(t.notification_email)) <> lower(btrim(coalesce(t.email, '')))
) x
order by orden, comprobacion;


-- ---------------------------------------------------------------
-- VUELTA ATRAS. `create or replace view` no deja quitar columnas: hay
-- que borrarla y recrearla como estaba. Primero revierte el codigo del
-- LMS que lea `es_prueba`.
--
--   begin;
--   drop view if exists public.vista_profesores_acceso;
--   create view public.vista_profesores_acceso
--   with (security_invoker = on) as
--   select
--     t.id                        as teacher_id,
--     t.name                      as profesor,
--     lower(btrim(t.email))       as email,
--     (t.archived_at is not null) as archivado
--   from public.teachers t
--   where btrim(coalesce(t.name, '')) <> '';
--   revoke all on public.vista_profesores_acceso from anon, authenticated;
--   commit;
-- ---------------------------------------------------------------
