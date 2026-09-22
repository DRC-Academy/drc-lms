-- ===============================================================
-- vista_profesores — EL NOMBRE DE CADA PROFESOR, Y NADA MÁS
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS.
--
-- ---------------------------------------------------------------
-- POR QUÉ EXISTE
--
-- El historial de «Clases» enseña quién dio cada clase pasada.
-- `class_analyses` solo guarda el `teacher_id`. El nombre del profesor
-- de sus clases de ahora sí llega (`vista_calendario_alumno`), pero no el
-- de un suplente ni el de un profesor que ya no le da clase: hoy son 87
-- de los 1739 análisis de los alumnos del LMS.
--
-- `teachers` no se abre al LMS: guarda correos, contraseñas, puntuaciones
-- y euros. Esta vista saca dos columnas, el id y el nombre, y ninguna
-- más. Incluye a los archivados, porque una clase pasada pudo darla
-- alguien que ya no está.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 1 — CREAR LA VISTA
-- ---------------------------------------------------------------

create or replace view public.vista_profesores
with (security_invoker = on) as
select
  t.id    as teacher_id,
  t.name  as profesor
from public.teachers t
where btrim(coalesce(t.name, '')) <> '';


-- ---------------------------------------------------------------
-- PASO 2 — CERRARLA
-- ---------------------------------------------------------------

revoke select on public.vista_profesores from anon, authenticated;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
-- ---------------------------------------------------------------

-- 1 · Un profesor por fila. Esperado el 22-09-2026: 35 filas y 35
-- ids distintos (todos los profesores, archivados incluidos).
select count(*) as filas, count(distinct teacher_id) as ids_distintos
from public.vista_profesores;

-- 2 · Que no quede ningún análisis de un alumno sin su profesor.
-- Esperado: 0.
select count(*) as analisis_sin_profesor
from public.class_analyses ca
where ca.teacher_id is not null
  and not exists (select 1 from public.vista_profesores p where p.teacher_id = ca.teacher_id);

-- 3 · Y que siga cerrada.
do $$
declare
  abiertos text;
begin
  select string_agg(rol, ', ' order by rol)
    into abiertos
  from unnest(array['anon', 'authenticated']) as rol
  where has_table_privilege(rol::name, 'public.vista_profesores', 'select');

  if abiertos is not null then
    raise exception 'vista_profesores quedó legible para: %. Revócalo antes de seguir.', abiertos;
  end if;

  raise notice 'vista_profesores creada y cerrada a anon y authenticated.';
end
$$;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   drop view if exists public.vista_profesores;
--
-- Sin ella, el historial de «Clases» se enseña igual, sin el nombre del
-- profesor.
-- ---------------------------------------------------------------
