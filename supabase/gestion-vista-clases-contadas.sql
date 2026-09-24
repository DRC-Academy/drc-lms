-- ===============================================================
-- vista_clases_contadas — CUÁNTAS CLASES LLEVA CADA ALUMNO, Y NADA MÁS
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS.
--
-- ---------------------------------------------------------------
-- POR QUÉ EXISTE
--
-- El inicio y la barra lateral enseñan «clases realizadas». Es la misma
-- cifra que «Mi progreso» (`clasesContadas` en `obtenerRecorrido`,
-- `lib/gestion.ts`), pero esa la calcula leyendo `class_analyses` a
-- pelo: títulos, temas, errores y notas de cada clase, para quedarse
-- con un número. Esta vista devuelve solo el número.
--
-- LA REGLA ES LA DE `obtenerRecorrido`, sin cambiar nada:
--
--   clases_contadas = max(mayor class_number > 0, número de análisis)
--
-- El mayor `class_number` se mira en TODAS las filas, también en las
-- que no tienen informe: una clase numerada cuenta como dada aunque su
-- análisis fallara. Y el recuento de filas cubre al alumno cuyas clases
-- no llevan número.
--
-- `obtenerRecorrido` lee como mucho 200 filas por alumno; aquí no hay
-- tope. Da lo mismo: medido el 24-09-2026, el alumno con más análisis
-- tiene 40.
--
-- Sin `student_id` no hay a quién contárselo: esas filas (296 hoy) no
-- salen.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 1 — CREAR LA VISTA
-- ---------------------------------------------------------------

create or replace view public.vista_clases_contadas
with (security_invoker = on) as
select
  ca.student_id as alumno_id,
  greatest(
    coalesce(max(ca.class_number) filter (where ca.class_number > 0), 0),
    count(*)
  )::int as clases_contadas
from public.class_analyses ca
where ca.student_id is not null
group by ca.student_id;


-- ---------------------------------------------------------------
-- PASO 2 — CERRARLA
-- ---------------------------------------------------------------

revoke select on public.vista_clases_contadas from anon, authenticated;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
-- ---------------------------------------------------------------

-- 1 · Un alumno por fila. Esperado el 24-09-2026: 187 filas y 187 ids
-- distintos.
select count(*) as filas, count(distinct alumno_id) as ids_distintos
from public.vista_clases_contadas;

-- 2 · Un vistazo a la cifra: ninguna a cero ni disparatada. Esperado:
-- minimo >= 1 y un maximo del orden de las decenas.
select min(clases_contadas) as minimo,
       max(clases_contadas) as maximo,
       round(avg(clases_contadas), 1) as media
from public.vista_clases_contadas;

-- 3 · Y que siga cerrada.
do $$
declare
  abiertos text;
begin
  select string_agg(rol, ', ' order by rol)
    into abiertos
  from unnest(array['anon', 'authenticated']) as rol
  where has_table_privilege(rol::name, 'public.vista_clases_contadas', 'select');

  if abiertos is not null then
    raise exception 'vista_clases_contadas quedó legible para: %. Revócalo antes de seguir.', abiertos;
  end if;

  raise notice 'vista_clases_contadas creada y cerrada a anon y authenticated.';
end
$$;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   drop view if exists public.vista_clases_contadas;
--
-- Sin ella, el inicio y la barra no enseñan la cifra de clases: la
-- lectura devuelve vacío y la estadística sale en su estado de
-- bienvenida, no como error.
-- ---------------------------------------------------------------
