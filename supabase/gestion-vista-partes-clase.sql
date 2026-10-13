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
--
-- ---------------------------------------------------------------
-- AMPLIACIÓN PARA LA GARANTÍA (13/10/2026)
--
-- Columnas nuevas, todas al final para no mover las que había:
--
--   parte_id       `class_records.id`. El LMS guarda copia del parte que
--                  hizo perder la garantía; con el id se sabe cuál era.
--   teacher_id     quién subió el parte.
--   registrado_en  `class_records.created_at`: cuándo se REGISTRÓ, que
--                  NO es cuándo avisó el alumno. Solo es una cota: si
--                  el parte de una reprogramada se creó 30 h antes de
--                  la clase, el aviso fue de al menos 30 h. Si se creó
--                  después, no dice nada.
--   motivo         quién la movió, sacado del texto fijo que escribe
--                  Gestión en el comentario de una reprogramada:
--                    'alumno_antelacion'  «El alumno avisó con anticipación»
--                                         / «pidió cambiarla con antelación»
--                    'alumno_sobre_hora'  «El alumno avisó sobre la hora»
--                    'profesor'           «Yo (el profesor) necesito…»
--                    'autoservicio'       la movió el alumno desde el LMS;
--                                         `registrado_en` es entonces la
--                                         hora exacta del cambio.
--                  NULL en cualquier otro caso. El comentario en sí no
--                  sale.
--   recovery_for_date  la clase que recupera una 'recuperacion'.
--   avisado_en     cuándo avisó el alumno, y
--   cancelado_por  quién canceló ('alumno', 'profesor', 'academia').
--                  Los dos los añade `supabase-avisado-en.sql` de
--                  Gestión (rama `garantia-avisado-en`): ESE SCRIPT VA
--                  ANTES QUE ESTE, o la vista no se crea.
--
-- Y una vista aparte, `vista_clases_programadas`, sobre
-- `scheduled_class_snapshots`: las clases que había en el calendario
-- cada día, guardadas por el cron nocturno de Gestión DESDE EL
-- 23/09/2026 (antes no hay nada). Es el denominador: sin ella, una
-- clase sin parte no existe para el LMS.
--
-- Con un parte duplicado se queda el PRIMERO que se registró: es el
-- que da la cota de antelación más favorable al alumno.
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
--     <los tres create or replace view>
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
    )                                              as hora_reprogramada,
    cr.id                                          as parte_id,
    cr.teacher_id,
    cr.created_at                                  as registrado_en,
    case
      when cr.class_type <> 'reprogramada' then null
      when cr.comment ~* 'Motivo: el alumno la movi[oó] desde la plataforma'
        then 'autoservicio'
      when cr.comment ~* 'Motivo: El alumno avis[oó] sobre la hora'
        then 'alumno_sobre_hora'
      when cr.comment ~* 'Motivo: El alumno (avis[oó] con anticipaci[oó]n|pidi[oó] cambiarla con antelaci[oó]n)'
        then 'alumno_antelacion'
      when cr.comment ~* 'Motivo: Yo \(el profesor\)'
        then 'profesor'
    end                                            as motivo,
    cr.recovery_for_date,
    cr.avisado_en,
    cr.cancelado_por
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
-- `distinct on` colapsa los partes duplicados, como en las excepciones,
-- y de cada grupo se queda el registrado antes.
select distinct on (al.alumno_id, p.fecha, p.hora, p.profesor, p.class_type,
                    p.original_date, p.rescheduled_to, p.hora_reprogramada)
  al.alumno_id,
  p.fecha,
  p.hora,
  p.profesor,
  p.class_type,
  p.original_date,
  p.rescheduled_to,
  p.hora_reprogramada,
  p.parte_id,
  p.teacher_id,
  p.registrado_en,
  p.motivo,
  p.recovery_for_date,
  p.avisado_en,
  p.cancelado_por
from partes p
join alumnos al on al.nombre_norm = p.nombre_norm
order by al.alumno_id, p.fecha, p.hora, p.profesor, p.class_type,
         p.original_date, p.rescheduled_to, p.hora_reprogramada,
         p.registrado_en;


-- ---------------------------------------------------------------
-- PASO 1 BIS — LAS CLASES QUE HABÍA EN EL CALENDARIO
--
-- Una fila por clase programada y día, desde el 23/09/2026. Mismo
-- cruce por nombre. `hora` sale como 'HH:00', igual que en los partes.
-- ---------------------------------------------------------------

create or replace view public.vista_clases_programadas
with (security_invoker = on) as
with alumnos as (
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
select
  al.alumno_id,
  s.class_date                                   as fecha,
  lpad(s.start_hour::text, 2, '0') || ':00'      as hora,
  s.duration_hours                               as horas,
  s.is_recovery                                  as es_recuperacion,
  s.teacher_id
from public.scheduled_class_snapshots s
join alumnos al
  on al.nombre_norm = regexp_replace(
       translate(lower(btrim(s.student_name)),
                 'áàäâéèëêíìïîóòöôúùüûñç',
                 'aaaaeeeeiiiioooouuuunc'),
       '\s+', ' ', 'g');


-- ---------------------------------------------------------------
-- PASO 1 TER — EL FIN DEL PLAN
--
-- `students.manual_active_until`, que según `lib/endingPlans.ts` de
-- Gestión es el único fin de plan que existe hoy (WooCommerce no
-- devuelve fechas). Solo el id y la fecha: de `students` no sale nada
-- más. NULL = sin fin conocido, y la garantía sigue «En curso».
-- ---------------------------------------------------------------

create or replace view public.vista_fin_plan
with (security_invoker = on) as
select
  s.id                     as alumno_id,
  s.manual_active_until    as fin_plan
from public.students s;


-- ---------------------------------------------------------------
-- PASO 2 — CERRARLA
--
-- Solo la lee `service_role`, como las demás vistas del LMS.
-- ---------------------------------------------------------------

revoke select on public.vista_partes_clase from anon, authenticated;
revoke select on public.vista_clases_programadas from anon, authenticated;
revoke select on public.vista_fin_plan from anon, authenticated;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
--
-- Pásame la salida de las seis: de ellas depende cómo se cuenta el
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
  select string_agg(vista || ' → ' || rol, ', ' order by vista, rol)
    into abiertos
  from unnest(array['anon', 'authenticated']) as rol
  cross join unnest(array['public.vista_partes_clase',
                          'public.vista_clases_programadas',
                          'public.vista_fin_plan']) as vista
  where has_table_privilege(rol::name, vista, 'select');

  if abiertos is not null then
    raise exception 'Vistas legibles: %. Revócalo antes de seguir.', abiertos;
  end if;

  raise notice 'Las tres vistas de la garantía, creadas y cerradas a anon y authenticated.';
end
$$;

-- 5 · El motivo de las reprogramadas. Hoy deberían salir unas 369
-- 'alumno_antelacion', 82 'profesor' y casi ninguna NULL.
select class_type, motivo, count(*) as filas
from public.vista_partes_clase
where class_type = 'reprogramada'
group by 1, 2
order by filas desc;

-- 6 · Clases programadas sin ningún parte ese día (hasta anteayer).
-- Son las que el LMS no podrá dar ni por asistidas ni por perdidas.
select count(*) as programadas,
       count(*) filter (where not exists (
         select 1 from public.vista_partes_clase p
         where p.alumno_id = c.alumno_id and p.fecha = c.fecha
       )) as sin_parte
from public.vista_clases_programadas c
where c.fecha <= (now() at time zone 'Europe/Madrid')::date - 2;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   drop view if exists public.vista_partes_clase;
--   drop view if exists public.vista_clases_programadas;
--   drop view if exists public.vista_fin_plan;
-- ---------------------------------------------------------------
