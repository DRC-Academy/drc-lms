-- ===============================================================
-- vista_partes_clase — LO QUE PASÓ CON CADA CLASE DE CADA ALUMNO
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS.
--
-- ---------------------------------------------------------------
-- POR QUÉ EXISTE
--
-- El registro de entradas a clase del panel necesita saber, para un
-- mes, qué clases tuvo cada alumno y qué fue de ellas: dada, cancelada,
-- falta. Ninguna vista lo da:
--
--   · `vista_calendario_alumno` es el grid de hoy. Proyecta bien el
--     horario recurrente, pero una celda puntual (recuperación,
--     destino de reprogramación) guarda UNA semana y se pisa con la
--     siguiente: el pasado no está.
--   · `vista_excepciones_clase` corta en `fecha >= hoy`: lo que se
--     canceló la semana pasada ya no sale. Y no trae los partes
--     'normal', que son las clases que sí se dieron.
--
-- La única fuente del pasado es `class_records`, el parte que sube el
-- profesor. Esta vista lo entrega fila a fila, ya cruzado con el
-- alumno, con lo mínimo: fecha, hora, profesor y tipo. Sin `comment`
-- (salvo la hora que se extrae de él), sin notas, sin capturas.
--
-- COMO `vista_calendario_alumno`, ESTA VISTA NO DECIDE NADA. Qué
-- cuenta como clase programada y qué como dada lo decide el LMS.
--
-- ---------------------------------------------------------------
-- EL CRUCE CON EL ALUMNO ES POR NOMBRE
--
-- El mismo que `vista_excepciones_clase`, copiado tal cual: minúsculas,
-- sin acentos, espacios colapsados, contra `assignments.student_name`;
-- un nombre que apunte a dos `student_id` se descarta. Lo que no casa
-- no sale, y la comprobación 3 lo lista.
--
-- FECHAS Y HORAS: TAL CUAL, EN HORA DE MADRID. La conversión a instante
-- la hace `lib/clases.ts` (`instanteEnMadrid`), como con las otras.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 0 — ANTES DE NADA: LAS COLUMNAS DE class_records
--
-- La vista usa `student_name`, `teacher_name`, `class_type`,
-- `class_date`, `class_time`, `original_date`, `rescheduled_to`,
-- `comment` y `reverted_at`, que son las que ya usa
-- `vista_excepciones_clase`. Si además existe `teacher_id`, dímelo:
-- filtrar por profesor con un id es mejor que con un nombre.
-- ---------------------------------------------------------------

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'class_records'
order by ordinal_position;


-- ---------------------------------------------------------------
-- PASO 1 — CREAR LA VISTA
--
-- Es una vista nueva: la vuelta atrás es un `drop view`, al final.
--
-- PRUÉBALO ANTES EN SECO:
--
--   begin;
--     <el create or replace view>
--     <el revoke del PASO 2>
--     <las consultas del PASO 3>
--   rollback;
-- ---------------------------------------------------------------

create or replace view public.vista_partes_clase
with (security_invoker = on) as
with hoy as (
  select (now() at time zone 'Europe/Madrid')::date as d
),
partes as (
  select
    regexp_replace(
      translate(lower(btrim(cr.student_name)),
                'áàäâéèëêíìïîóòöôúùüûñç',
                'aaaaeeeeiiiioooouuuunc'),
      '\s+', ' ', 'g'
    )                                              as nombre_norm,
    nullif(btrim(cr.teacher_name), '')             as profesor,
    cr.class_type,
    cr.class_date                                  as fecha,
    case when cr.class_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         then cr.class_time end                    as hora,
    cr.original_date,
    cr.rescheduled_to,
    substring(cr.comment from
      'Reprogramada para [0-9]{4}-[0-9]{2}-[0-9]{2} (([01][0-9]|2[0-3]):[0-5][0-9])'
    )                                              as hora_reprogramada
  from public.class_records cr
  cross join hoy
  where cr.reverted_at is null
    -- Las dos fechas corruptas conocidas (`0266-09-04`, `2006-09-02`)
    -- caen fuera de este rango.
    and cr.class_date between date '2025-01-01' and hoy.d + 365
),
alumnos as (
  select
    regexp_replace(
      translate(lower(btrim(a.student_name)),
                'áàäâéèëêíìïîóòöôúùüûñç',
                'aaaaeeeeiiiioooouuuunc'),
      '\s+', ' ', 'g'
    )                         as nombre_norm,
    min(a.student_id)         as alumno_id
  from public.assignments a
  where a.student_id is not null
    and btrim(coalesce(a.student_name, '')) <> ''
  group by 1
  having count(distinct a.student_id) = 1
)
-- `distinct` colapsa los partes duplicados, como en las excepciones.
select distinct
  al.alumno_id,
  p.fecha,
  p.hora,
  p.profesor,
  p.class_type,
  p.original_date,
  p.rescheduled_to,
  p.hora_reprogramada
from partes p
join alumnos al on al.nombre_norm = p.nombre_norm;


-- ---------------------------------------------------------------
-- PASO 2 — CERRARLA
--
-- Solo la lee `service_role`, como las demás vistas del LMS.
-- ---------------------------------------------------------------

revoke select on public.vista_partes_clase from anon, authenticated;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
--
-- Pásame la salida de las cuatro: de ellas depende cómo se cuenta el
-- denominador del porcentaje en el panel.
-- ---------------------------------------------------------------

-- 1 · Partes por tipo, en septiembre de 2026.
select class_type, count(*) as filas, count(distinct alumno_id) as alumnos
from public.vista_partes_clase
where fecha between date '2026-09-01' and date '2026-09-30'
group by class_type
order by filas desc;

-- 2 · ¿HAY UN PARTE POR CADA CLASE DADA? Por alumno, partes 'normal' +
-- 'recuperacion' de septiembre frente a lo que su horario prometía
-- (`weekly_hours` × semanas). Si los profesores no suben parte de
-- todas las clases, `partes` se queda muy por debajo de `esperadas` y
-- el panel no puede usar los partes como «clases programadas».
with sep as (
  select alumno_id,
         count(*) filter (where class_type in ('normal', 'recuperacion')) as dadas,
         count(*) filter (where class_type not in ('normal', 'recuperacion')) as otras
  from public.vista_partes_clase
  where fecha between date '2026-09-01' and date '2026-09-30'
  group by alumno_id
),
horas as (
  select a.student_id as alumno_id, sum(a.weekly_hours) as horas_semana
  from public.assignments a
  where a.student_id is not null and a.status = 'active'
  group by a.student_id
)
select
  count(*)                                                   as alumnos_activos,
  count(sep.alumno_id)                                       as con_algun_parte,
  sum(round(h.horas_semana * 30 / 7.0))                      as esperadas_aprox,
  sum(coalesce(sep.dadas, 0))                                as partes_dadas,
  sum(coalesce(sep.otras, 0))                                as partes_otras
from horas h
left join sep on sep.alumno_id = h.alumno_id;

-- 3 · Partes desde el 1/09 que NO casan con ningún alumno.
with nombres as (
  select regexp_replace(
           translate(lower(btrim(a.student_name)),
                     'áàäâéèëêíìïîóòöôúùüûñç',
                     'aaaaeeeeiiiioooouuuunc'),
           '\s+', ' ', 'g') as nombre_norm
  from public.assignments a
  where a.student_id is not null
  group by 1
  having count(distinct a.student_id) = 1
)
select cr.student_name, count(*) as partes
from public.class_records cr
where cr.reverted_at is null
  and cr.class_date >= date '2026-09-01'
  and regexp_replace(
        translate(lower(btrim(cr.student_name)),
                  'áàäâéèëêíìïîóòöôúùüûñç',
                  'aaaaeeeeiiiioooouuuunc'),
        '\s+', ' ', 'g') not in (select nombre_norm from nombres)
group by cr.student_name
order by partes desc;

-- 4 · Y que siga cerrada.
do $$
declare
  abiertos text;
begin
  select string_agg(rol, ', ' order by rol)
    into abiertos
  from unnest(array['anon', 'authenticated']) as rol
  where has_table_privilege(rol::name, 'public.vista_partes_clase', 'select');

  if abiertos is not null then
    raise exception 'vista_partes_clase quedó legible para: %. Revócalo antes de seguir.', abiertos;
  end if;

  raise notice 'vista_partes_clase creada y cerrada a anon y authenticated.';
end
$$;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   drop view if exists public.vista_partes_clase;
-- ---------------------------------------------------------------
