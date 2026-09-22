-- ===============================================================
-- vista_calendario_alumno — LAS CELDAS DEL CALENDARIO DE CADA ALUMNO
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS.
--
-- ---------------------------------------------------------------
-- POR QUÉ EXISTE
--
-- El alumno tiene que ver sus clases igual que las ve su profesor en
-- Gestión: en el Calendario y en «Mis clases». Gestión NO las saca de
-- `assignments.slots` ni de `class_records`. Las saca del GRID de
-- `teacher_calendars` (academy-scheduler, `lib/teacherClasses.ts`):
--
--   · el horario recurrente son las celdas cuyo alumno de FONDO es él
--     ("el calendario manda": los slots de la ficha son un espejo que
--     se sincroniza al guardar, y puede estar viejo);
--   · las recuperaciones, y el destino de una reprogramación, son
--     celdas 'bloqueado' marcadas para UNA semana (`weekDate`);
--   · el origen de una reprogramación es una celda 'reprogramada'.
--
-- ESTA VISTA NO DECIDE NADA. Entrega las celdas casi en crudo, una fila
-- por celda y alumno, y la lógica de Gestión se aplica en el LMS
-- (`lib/calendario-gestion.ts`), copiada de academy-scheduler. Reescribir
-- esa lógica aquí en SQL sería una segunda implementación que se separa
-- de la de Gestión la primera vez que alguien la toque allí.
--
-- ---------------------------------------------------------------
-- UNA FILA POR CELDA Y ALUMNO
--
-- Una celda puede nombrar a DOS alumnos: la recuperación de Nayara
-- encima de la hora fija de otra alumna lleva `student` = Nayara y
-- `baseStudent` = la otra. Esa celda sale dos veces, una con el
-- `alumno_id` de cada una, y cada fila lleva la celda entera. Quién es
-- el alumno recurrente y quién el que recupera lo decide el LMS con
-- `baseStudentOf`, igual que Gestión.
--
-- ---------------------------------------------------------------
-- EL CRUCE CON EL ALUMNO
--
-- Por nombre, como en `vista_excepciones_clase`: minúsculas, sin
-- acentos, espacios colapsados, contra `assignments.student_name`, y un
-- nombre que apunte a dos `student_id` se descarta. SIN el segundo
-- intento por nombre de pila que tiene Gestión
-- (`findAssignmentForName`): "Marina" casaría con cualquier Marina.
--
-- Hoy hay 17 nombres en los calendarios que no son de ningún alumno
-- ("Marina", "Sino Ruiz", "CARLOS MARQUEZ"…). No salen en la vista, y
-- no pueden ser alumnos del LMS: el LMS los conoce por su assignment.
-- La comprobación 3 los lista.
--
-- ---------------------------------------------------------------
-- LO QUE HACE FALTA PARA EL PERIODO (academy-scheduler, lib/studentPeriod.ts)
--
-- Gestión no proyecta clases antes de que el alumno empiece ni después
-- de su baja. Lo calcula POR PROFESOR, con:
--
--   asignacion_inicio  `assignments.start_date` de ESE profesor (texto,
--                      tal cual)
--   asignacion_alta    `assignments.created_at`, el piso si no hay inicio
--   alumno_alta        `students.created_at`, lo que usa Gestión cuando
--                      el alumno está en el grid sin assignment
--   baja               la `student_dropouts.dropped_at` más reciente con
--                      ese profesor
--
-- Aquí el cruce sí es el de Gestión —`trim` + minúsculas, sin quitar
-- acentos— porque es su regla la que se replica. Hoy ningún nombre casa
-- solo quitando acentos, así que las dos normalizaciones dan lo mismo.
-- Con dos assignments del mismo alumno y profesor gana la más reciente,
-- como en `getStudentsForTeacher`.
--
-- ---------------------------------------------------------------
-- PROFESORES ARCHIVADOS
--
-- Fuera. Gestión no los carga (`dbGetTeachers` los filtra) y su
-- calendario no lo ve nadie. Hoy son 2 con calendario.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 1 — CREAR LA VISTA
--
-- PRUÉBALO ANTES EN SECO:
--
--   begin;
--     <el create or replace view>
--     <el revoke del PASO 2>
--     <las consultas del PASO 3>
--   rollback;
-- ---------------------------------------------------------------

create or replace view public.vista_calendario_alumno
with (security_invoker = on) as
with celdas as (
  select
    tc.teacher_id,
    t.name                                            as profesor,
    c.key                                             as celda,
    substring(c.key from '^(.*)_[^_]*$')              as dia,
    substring(c.key from '_([^_]*)$')                 as hora,
    c.value->>'state'                                 as estado,
    nullif(c.value->>'student', '')                   as alumno_celda,
    nullif(c.value->>'baseStudent', '')               as alumno_base,
    nullif(c.value->>'baseState', '')                 as estado_base,
    nullif(c.value->>'weekDate', '')                  as week_date,
    nullif(c.value->>'recoveryFor', '')               as recovery_for,
    nullif(c.value->>'rescheduledTo', '')             as rescheduled_to
  from public.teacher_calendars tc
  join public.teachers t on t.id = tc.teacher_id and t.archived_at is null
  cross join lateral jsonb_each(
    case when jsonb_typeof(tc.grid::jsonb) = 'object' then tc.grid::jsonb else '{}'::jsonb end
  ) as c(key, value)
  where jsonb_typeof(c.value) = 'object'
),
nombres as (
  -- Cada nombre que aparece en una celda, con la celda.
  select celdas.*, n.nombre
  from celdas
  -- El alumno de fondo solo añade fila si es OTRO: la misma persona
  -- escrita con otras mayúsculas no puede tener la celda dos veces.
  cross join lateral (
    select alumno_celda as nombre
    union all
    select alumno_base
    where lower(btrim(alumno_base)) is distinct from lower(btrim(alumno_celda))
  ) as n
  where n.nombre is not null
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
select
  al.alumno_id,
  n.nombre                                            as nombre_en_celda,
  n.teacher_id,
  n.profesor,
  n.celda,
  n.dia,
  n.hora,
  n.estado,
  n.alumno_celda,
  n.alumno_base,
  n.estado_base,
  n.week_date,
  n.recovery_for,
  n.rescheduled_to,
  asg.start_date                                      as asignacion_inicio,
  asg.created_at                                      as asignacion_alta,
  st.created_at                                       as alumno_alta,
  baja.dropped_at                                     as baja
from nombres n
join alumnos al
  on al.nombre_norm = regexp_replace(
       translate(lower(btrim(n.nombre)),
                 'áàäâéèëêíìïîóòöôúùüûñç',
                 'aaaaeeeeiiiioooouuuunc'),
       '\s+', ' ', 'g')
left join lateral (
  select a.start_date, a.created_at
  from public.assignments a
  where a.teacher_id = n.teacher_id
    and lower(btrim(a.student_name)) = lower(btrim(n.nombre))
  order by a.created_at desc
  limit 1
) as asg on true
left join lateral (
  select s.created_at
  from public.students s
  where lower(btrim(s.name)) = lower(btrim(n.nombre))
  order by s.created_at desc
  limit 1
) as st on true
left join lateral (
  select max(d.dropped_at) as dropped_at
  from public.student_dropouts d
  where d.teacher_id = n.teacher_id
    and lower(btrim(d.student_name)) = lower(btrim(n.nombre))
) as baja on true;


-- ---------------------------------------------------------------
-- PASO 2 — CERRARLA
--
-- Como las otras: solo la lee `service_role`, que es con lo que entra
-- el LMS.
-- ---------------------------------------------------------------

revoke select on public.vista_calendario_alumno from anon, authenticated;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
--
-- Cifras esperadas del 22-09-2026, calculadas replicando la vista
-- contra los datos en vivo.
-- ---------------------------------------------------------------

-- 1 · Tamaño. Esperado: 636 filas, 207 alumnos, 28 profesores.
-- (207 y no 206: cuenta alumnos con assignment inactiva que siguen en
-- algún calendario.)
select count(*)                   as filas,
       count(distinct alumno_id)  as alumnos,
       count(distinct teacher_id) as profesores
from public.vista_calendario_alumno;

-- 2 · Por estado de la celda. Esperado: ocupado 316, bloqueado 198,
-- reprogramada 122 (una celda que nombra a dos alumnos cuenta dos veces).
select estado, count(*) as filas
from public.vista_calendario_alumno
group by estado
order by filas desc;

-- 3 · Nombres de los calendarios que no casan con ningún alumno.
-- Esperado: los 17 de la cabecera.
with alumnos as (
  select regexp_replace(
           translate(lower(btrim(a.student_name)),
                     'áàäâéèëêíìïîóòöôúùüûñç',
                     'aaaaeeeeiiiioooouuuunc'),
           '\s+', ' ', 'g') as nombre_norm
  from public.assignments a
  where a.student_id is not null
  group by 1
  having count(distinct a.student_id) = 1
),
nombres as (
  select distinct n.nombre
  from public.teacher_calendars tc
  join public.teachers t on t.id = tc.teacher_id and t.archived_at is null
  cross join lateral jsonb_each(tc.grid::jsonb) as c(key, value)
  cross join lateral (
    select nullif(c.value->>'student', '') as nombre
    union
    select nullif(c.value->>'baseStudent', '')
  ) as n
  where n.nombre is not null
)
select nombre
from nombres
where regexp_replace(
        translate(lower(btrim(nombre)),
                  'áàäâéèëêíìïîóòöôúùüûñç',
                  'aaaaeeeeiiiioooouuuunc'),
        '\s+', ' ', 'g') not in (select nombre_norm from alumnos)
order by nombre;

-- 4 · Alumnos del LMS sin ninguna celda. Gestión no les enseña clases,
-- y el LMS tampoco lo hará. Esperado: María do Mar Campos Souto y tres
-- cuentas de prueba (Facu IA, Facu Meeting, Facundo IA).
select v.alumno_id, v.nombre
from public.vista_perfil_alumno v
where not exists (
  select 1 from public.vista_calendario_alumno c where c.alumno_id = v.alumno_id
)
order by v.nombre;

-- 5 · Los tres casos que el LMS tiene que reproducir. Esperado, 7 filas:
--   HANA Gualda Elfmark   Miércoles_19:00                    recupera 21-09
--   Samantha Reyes        Jueves_19:00, Jueves_20:00         recupera 18-09
--                         Lunes_20:00, Lunes_21:00           recupera 18-09
--   Victor Capela         Jueves_20:00, Jueves_21:00         recupera 22-09
select nombre_en_celda, estado, celda, week_date, recovery_for
from public.vista_calendario_alumno
where estado = 'bloqueado'
  and week_date = '2026-09-21'
  and lower(nombre_en_celda) in ('hana gualda elfmark', 'victor capela', 'samantha reyes')
  and lower(alumno_celda) = lower(nombre_en_celda)
order by nombre_en_celda, celda;

-- 6 · Y que siga cerrada.
do $$
declare
  abiertos text;
begin
  select string_agg(rol, ', ' order by rol)
    into abiertos
  from unnest(array['anon', 'authenticated']) as rol
  where has_table_privilege(rol::name, 'public.vista_calendario_alumno', 'select');

  if abiertos is not null then
    raise exception 'vista_calendario_alumno quedó legible para: %. Revócalo antes de seguir.', abiertos;
  end if;

  raise notice 'vista_calendario_alumno creada y cerrada a anon y authenticated.';
end
$$;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   drop view if exists public.vista_calendario_alumno;
--
-- Nadie la lee hasta que el LMS la añada a su lista blanca
-- (`lib/supabase-server.ts`).
-- ---------------------------------------------------------------
