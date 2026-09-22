-- ===============================================================
-- vista_excepciones_clase — LO QUE CAMBIA EL HORARIO DE CADA ALUMNO
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS.
--
-- Sustituye a `gestion-vista-proxima-clase.sql`, que nunca se llegó a
-- ejecutar: `vista_proxima_clase` no existe en Gestión y no hay nada
-- que borrar allí.
--
-- ---------------------------------------------------------------
-- QUÉ ES Y QUÉ NO ES
--
-- NO es "la próxima clase". El horario de cada alumno son sus `slots`
-- (`vista_perfil_alumno.slots`), y `class_records` no puede
-- sustituirlo: es el parte que el profesor sube DESPUÉS de la clase.
-- De sus 3251 filas, 3070 se escriben el mismo día o más tarde, y con
-- fecha posterior a hoy solo hay filas para 22 de los 206 alumnos.
--
-- Lo que sí queda anotado por adelantado son las EXCEPCIONES: una
-- recuperación pactada, una clase movida, una falta avisada. Esta
-- vista las entrega limpias, una fila por excepción, y el LMS las
-- aplica sobre los slots en `lib/clases.ts` (`proximaClase`), que es
-- la única implementación. Aquí no se decide cuál es la próxima clase.
--
--   tipo 'añade'  → hay una clase ese día a esa hora aunque no esté en
--                   el horario.
--   tipo 'quita'  → la clase del horario de ese día a esa hora NO va a
--                   ocurrir. Con `hora` nula quita el día entero: es
--                   una falta anotada sin hora (hoy hay dos).
--
-- ---------------------------------------------------------------
-- LA REGLA, TIPO A TIPO
--
--   recuperacion            añade  class_date, a class_time
--   reprogramada            añade  rescheduled_to, a la hora del comentario
--                           quita  original_date, a class_time
--   cancelada_por_profesor  quita  class_date, a class_time
--   cancelada_con_preaviso  quita  "
--   falta_con_aviso         quita  "
--   falta_sin_aviso         quita  "
--   cancelacion_hora        quita  " — y NO añade nada en
--                           rescheduled_to. PENDIENTE de que Gestión
--                           confirme qué significa ese tipo; mientras
--                           tanto se trata como una clase que no ocurre.
--   normal                  nada: es el parte de una clase del horario.
--
-- `reverted_at` no nulo queda fuera siempre: es un registro que alguien
-- deshizo.
--
-- ---------------------------------------------------------------
-- LA HORA DE UNA REPROGRAMADA SALE DEL COMENTARIO
--
-- En una fila reprogramada `class_time` es la hora ORIGINAL. La nueva
-- solo está en el texto que escribe Gestión al reprogramar:
--
--   "Reprogramada para 2026-11-06 23:00 — Motivo: …"
--
-- De las 348 filas con `rescheduled_to`, 347 traen ese texto, y en 156
-- la hora nueva NO coincide con `class_time`. Leer `class_time` habría
-- anunciado la clase a la hora de antes. La fecha del comentario
-- coincide con `rescheduled_to` en las 347, así que la fecha se sigue
-- tomando de la columna. Si el comentario no casa, la hora cae a
-- `class_time` y `hora_del_comentario` lo dice.
--
-- ---------------------------------------------------------------
-- FECHAS Y HORAS: TAL CUAL, EN HORA DE MADRID
--
-- `class_date` es `date` y `class_time` es TEXTO 'HH:MM', las dos en
-- hora de España. Comprobado contra 2922 clics de entrada de
-- `class_join_logs` (que sí llevan zona): leída como Madrid, la hora
-- cae a ±60 min del clic en el 94,5%; leída como UTC, en el 1,2%.
--
-- La vista NO las convierte a `timestamptz`: la conversión la hace
-- `lib/clases.ts`, que ya resuelve el cambio de hora con `Intl` y tiene
-- pruebas a los dos lados del 25 de octubre. Hacerla también aquí
-- serían dos conversiones que pueden no coincidir.
--
-- "Hoy" sí se calcula en Madrid: `now()` va en UTC, y entre las 00:00
-- y las 02:00 de España la fecha UTC todavía es la de ayer.
--
-- ---------------------------------------------------------------
-- EL CRUCE CON EL ALUMNO ES POR NOMBRE
--
-- `class_records` no tiene `student_id`. El nombre se normaliza
-- (minúsculas, sin acentos, espacios colapsados) y se busca en
-- `assignments.student_name`. Un nombre que apuntara a dos
-- `student_id` distintos se descarta en lugar de adivinar; hoy no hay
-- ninguno. Lo que no casa no aparece en la vista, y la segunda
-- comprobación del PASO 3 lo lista.
--
-- ---------------------------------------------------------------
-- FECHAS CORRUPTAS
--
-- Hay dos: `0266-09-04` y `2006-09-02`, las dos faltas. Se descarta
-- cualquier fila cuya `class_date` no esté entre el 1-1-2025 y dentro
-- de un año, y cualquier excepción cuya fecha efectiva no esté entre
-- hoy y dentro de un año.
-- ===============================================================


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

create or replace view public.vista_excepciones_clase
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
    cr.class_date,
    coalesce(cr.original_date, cr.class_date)      as fecha_original,
    cr.rescheduled_to,
    -- Sin formato HH:MM la hora del parte no vale para nada.
    case when cr.class_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         then cr.class_time end                    as hora_parte,
    -- `substring … from` con paréntesis devuelve el primer grupo: la hora.
    substring(cr.comment from
      'Reprogramada para [0-9]{4}-[0-9]{2}-[0-9]{2} (([01][0-9]|2[0-3]):[0-5][0-9])'
    )                                              as hora_comentario
  from public.class_records cr
  cross join hoy
  where cr.reverted_at is null
    and cr.class_date between date '2025-01-01' and hoy.d + 365
),
excepciones as (
  -- Recuperación: una clase de más, el día y a la hora del parte.
  select nombre_norm, profesor, class_type,
         'añade'::text   as tipo,
         class_date      as fecha,
         hora_parte      as hora,
         false           as hora_del_comentario,
         null::date      as original_date
  from partes
  where class_type = 'recuperacion'
    and hora_parte is not null

  union all

  -- Reprogramada, a dónde va: `rescheduled_to` y la hora del comentario.
  select nombre_norm, profesor, class_type,
         'añade',
         rescheduled_to,
         coalesce(hora_comentario, hora_parte),
         hora_comentario is not null,
         fecha_original
  from partes
  where class_type = 'reprogramada'
    and rescheduled_to is not null
    and coalesce(hora_comentario, hora_parte) is not null

  union all

  -- Reprogramada, de dónde sale: ese hueco del horario queda vacío.
  select nombre_norm, profesor, class_type,
         'quita',
         fecha_original,
         hora_parte,
         false,
         fecha_original
  from partes
  where class_type = 'reprogramada'

  union all

  -- Cancelaciones y faltas: la clase del horario no ocurre.
  select nombre_norm, profesor, class_type,
         'quita',
         class_date,
         hora_parte,
         false,
         null::date
  from partes
  where class_type in ('cancelada_por_profesor', 'cancelada_con_preaviso',
                       'falta_con_aviso', 'falta_sin_aviso',
                       'cancelacion_hora')
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
  -- Un nombre, un alumno. Si hubiera dos, mejor ninguna excepción que
  -- la de otro.
  having count(distinct a.student_id) = 1
)
-- `distinct` colapsa los partes duplicados: hay profesores que suben
-- la misma reprogramación dos veces.
select distinct
  al.alumno_id,
  e.tipo,
  e.class_type,
  e.fecha,
  e.hora,
  e.hora_del_comentario,
  e.original_date,
  e.profesor
from excepciones e
join alumnos al on al.nombre_norm = e.nombre_norm
cross join hoy
where e.fecha between hoy.d and hoy.d + 365;


-- ---------------------------------------------------------------
-- PASO 2 — CERRARLA
--
-- Una vista nueva no hereda los revokes de las otras. Tiene que quedar
-- como `vista_perfil_alumno` y `vista_ultima_clase`: solo la lee
-- `service_role`, que es con lo que entra el LMS.
-- ---------------------------------------------------------------

revoke select on public.vista_excepciones_clase from anon, authenticated;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
--
-- Las cifras esperadas son las del 22-09-2026 a las 21:45 de Madrid,
-- calculadas replicando la vista contra los datos en vivo. Cambian con
-- el día: las excepciones de hoy desaparecen mañana.
-- ---------------------------------------------------------------

-- 1 · Filas por tipo. Esperado el 22-09:
--
--   añade  reprogramada             25
--   añade  recuperacion             13
--   quita  reprogramada              4
--   quita  falta_sin_aviso           3
--   quita  cancelacion_hora          3
--   quita  falta_con_aviso           2
--   quita  cancelada_con_preaviso    1
--                            total  51  (33 alumnos)
--
-- `normal` no puede aparecer aquí.
select tipo, class_type, count(*) as filas
from public.vista_excepciones_clase
group by tipo, class_type
order by tipo, filas desc;

select count(*) as filas, count(distinct alumno_id) as alumnos
from public.vista_excepciones_clase;

-- 2 · Excepciones futuras que NO casan con ningún alumno, con el
-- nombre tal como lo escribió el profesor. Esperado el 22-09: una sola
-- persona, Ricardo Polonia, con 3 reprogramadas (30-10, 06-11 y 03-12)
-- que no aparece en `assignments`.
with hoy as (
  select (now() at time zone 'Europe/Madrid')::date as d
),
nombres as (
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
select cr.student_name, cr.class_type, count(*) as filas,
       min(coalesce(cr.rescheduled_to, cr.class_date)) as primera,
       max(coalesce(cr.rescheduled_to, cr.class_date)) as ultima
from public.class_records cr
cross join hoy
where cr.reverted_at is null
  and cr.class_type in ('recuperacion', 'reprogramada',
                        'cancelada_por_profesor', 'cancelada_con_preaviso',
                        'falta_con_aviso', 'falta_sin_aviso', 'cancelacion_hora')
  and greatest(cr.class_date, coalesce(cr.rescheduled_to, cr.class_date))
      between hoy.d and hoy.d + 365
  and regexp_replace(
        translate(lower(btrim(cr.student_name)),
                  'áàäâéèëêíìïîóòöôúùüûñç',
                  'aaaaeeeeiiiioooouuuunc'),
        '\s+', ' ', 'g') not in (select nombre_norm from nombres)
group by cr.student_name, cr.class_type
order by cr.student_name, cr.class_type;

-- 3 · De dónde salió la hora de las reprogramadas. Esperado el 22-09:
-- 25 del comentario, 0 del respaldo.
select
  case when hora_del_comentario then 'comentario' else 'respaldo (class_time)' end as origen_hora,
  count(*) as filas
from public.vista_excepciones_clase
where tipo = 'añade' and class_type = 'reprogramada'
group by 1;

-- 4 · Y que siga cerrada.
do $$
declare
  abiertos text;
begin
  select string_agg(rol, ', ' order by rol)
    into abiertos
  from unnest(array['anon', 'authenticated']) as rol
  where has_table_privilege(rol::name, 'public.vista_excepciones_clase', 'select');

  if abiertos is not null then
    raise exception 'vista_excepciones_clase quedó legible para: %. Revócalo antes de seguir.', abiertos;
  end if;

  raise notice 'vista_excepciones_clase creada y cerrada a anon y authenticated.';
end
$$;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   drop view if exists public.vista_excepciones_clase;
--
-- El LMS la tiene en la lista blanca de `lib/supabase-server.ts`. Sin
-- la vista, la lectura devuelve error y el LMS sigue con los slots
-- solos: las excepciones son una capa encima, no la base.
-- ---------------------------------------------------------------
