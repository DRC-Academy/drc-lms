-- ===============================================================
-- vista_proxima_clase — LA PRÓXIMA CLASE AGENDADA DE CADA ALUMNO
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS.
-- Cuarto archivo de esta carpeta que no es del LMS.
--
-- ⚠⚠ LEE ESTO ANTES DE EJECUTARLO: ESTA VISTA NO PUEDE SER LA FUENTE
--    DEL BANNER DE «TU PRÓXIMA CLASE». Hoy devuelve 19 filas para 205
--    alumnos. Es una capa de EXCEPCIONES, no un horario. El porqué,
--    abajo. Si lo que se quiere es el banner, la fuente sigue siendo
--    `vista_perfil_alumno.slots`.
--
-- ---------------------------------------------------------------
-- POR QUÉ 19 DE 205
--
-- `class_records` no es una agenda: es el parte que el profesor sube
-- DESPUÉS de dar la clase, con `screenshot_url` como prueba. Medido
-- sobre las 3199 filas, la antelación con que se crea cada una respecto
-- al día de la clase:
--
--   se crea DESPUÉS de la clase   582   18,2%
--   el mismo día                 2436   76,1%
--   1 día antes                    75    2,3%
--   2-6 días antes                 83    2,6%
--   7+ días antes                  23    0,7%
--
-- Mediana 0 días. P90 0 días. El 94,3% se escribe el mismo día o más
-- tarde. Nadie carga clases por adelantado, así que "la próxima clase"
-- casi nunca está escrita en ningún sitio.
--
-- Lo que SÍ queda registrado con fecha futura son las excepciones:
-- recuperaciones y reprogramaciones, que alguien anota al pactarlas. Y
-- eso es justo lo que esta vista sirve, y es valioso: son los casos en
-- los que el horario recurrente MIENTE. Usada como capa por encima de
-- `slots` —si hay fila aquí, manda esta; si no, el horario— arregla la
-- parte del 27% de clases fuera de sitio que alguien se molestó en
-- anotar.
--
-- ---------------------------------------------------------------
-- LAS CUATRO DECISIONES QUE HAY DENTRO
--
-- 1 · LA FECHA ES `coalesce(rescheduled_to, class_date)`, y no
--     `class_date`. En una fila reprogramada, `class_date` es el día
--     ORIGINAL —que ya pasó— y `rescheduled_to` el nuevo. Ordenar por
--     `class_date` dejaría fuera casi todas las filas útiles: de las 31
--     con fecha efectiva futura, 21 son reprogramaciones cuyo
--     `class_date` está en el pasado.
--
-- 2 · QUÉ CUENTA COMO CLASE. Entran `normal` y `recuperacion` por su
--     fecha, y `reprogramada` y `cancelacion_hora` SOLO si traen
--     `rescheduled_to` —que es lo que dice a dónde se movió—. Quedan
--     fuera `cancelada_con_preaviso`, `cancelada_por_profesor` y las
--     tres de falta: son clases que NO van a ocurrir, y anunciarlas
--     sería mandar al alumno a una sala vacía. Hoy eso descarta una
--     fila real (Samantha Reyes, 25/09). Y `reverted_at` no nulo queda
--     fuera siempre: es un registro que alguien deshizo.
--
-- 3 · EL CRUCE ES POR NOMBRE, porque `class_records` NO TIENE
--     `student_id`. Es la debilidad de esta vista y conviene saberla:
--     se normaliza a minúsculas sin acentos y aun así, de los 241
--     nombres de la tabla, 61 no casan con ningún alumno de la vista de
--     perfil —bajas, nombres escritos distinto— y 4 de las filas
--     futuras de hoy se pierden por eso (tres de Ricardo Polonia y una
--     de Susana Manrique). Comprobado que NO hay ambigüedad en el otro
--     sentido: ningún nombre del roster apunta a dos alumnos, así que
--     el cruce nunca le asigna a nadie la clase de otro.
--
--     El día que `class_records` tenga `student_id`, esta vista mejora
--     borrando el `translate` y cambiando el join. Es la petición que
--     más valor tiene de las tres que quedan abiertas.
--
-- 4 · LA DURACIÓN NO ESTÁ EN LA TABLA. `class_records` guarda una fila
--     por CLASE con una sola `class_time`, no una por hora: comprobado
--     en los alumnos de dos horas seguidas —Jose Vizcaíno tiene slots
--     de viernes 20:00 y 21:00 y una única fila a las 20:00—. Así que
--     `hora_fin` se deduce de `slots`: cuántas celdas tiene ese alumno
--     ese día de la semana a partir de la hora de inicio. Se apoya en
--     que los bloques del mismo día son siempre horas SEGUIDAS, que está
--     verificado en los 21 bloques que existen. Sin slots que casen
--     —una recuperación a una hora rara— cae a una hora, que es lo que
--     dura una clase en los 205 alumnos (`weekly_hours` coincide con el
--     número de slots en todos).
--
-- ---------------------------------------------------------------
-- EL ENLACE DE MEET
--
-- SALE DE `assignments.meet_link`, Y NO HAY RESPALDO DEL PROFESOR
-- PORQUE `teachers` NO TIENE NINGUNA COLUMNA DE ENLACE. Comprobado
-- sobre el esquema en vivo: las 25 columnas de `teachers` son `id`,
-- `name`, `email`, `avatar`, `username`, `password`, `specialties`,
-- `calendar_start_hour`… y ninguna de sala. Referenciar
-- `teachers.meet_link` aquí haría que este archivo fallara con 42703 al
-- ejecutarlo.
--
-- Tampoco se puede deducir del profesor: Sebastian tiene 5 enlaces
-- distintos repartidos entre sus alumnos, Liliana 6 y Sol.G 6. No
-- existe "el enlace de Sebastian" que heredar.
--
-- SI ALGÚN DÍA SE CREA `teachers.meet_link`, el respaldo es una línea:
-- está escrita y comentada en el `select`, y basta con descomentarla y
-- añadir el join que hay justo debajo, también comentado.
--
-- ---------------------------------------------------------------
-- QUÉ ASSIGNMENT GANA
--
-- El mismo que en los otros dos archivos: el que más celdas tenga,
-- desempatando por `created_at desc`. Si aquí se eligiera otro, un
-- alumno con dos assignments podría ver el enlace de uno y la duración
-- calculada con los slots del otro.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 1 — CREAR LA VISTA
--
-- Es una vista NUEVA, así que no hay definición previa que guardar: la
-- vuelta atrás es un `drop view`, al final del archivo.
--
-- PRUÉBALO ANTES EN SECO:
--
--   begin;
--     <el create or replace view>
--     <el revoke del PASO 2>
--     <las consultas del PASO 3>
--   rollback;
--
-- Con los datos del 22-09-2026, el PASO 3 tiene que dar 19 filas.
-- ---------------------------------------------------------------

create or replace view public.vista_proxima_clase
with (security_invoker = on) as
with candidatas as (
  select
    -- El nombre normalizado, que es todo lo que hay para cruzar.
    translate(lower(btrim(cr.student_name)), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN') as nombre_norm,
    coalesce(cr.rescheduled_to, cr.class_date) as fecha,
    cr.class_time                              as hora_inicio,
    cr.class_type,
    cr.teacher_id,
    cr.teacher_name
  from public.class_records cr
  where cr.reverted_at is null
    -- Sin hora utilizable no hay nada que anunciar.
    and cr.class_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    and coalesce(cr.rescheduled_to, cr.class_date) >= current_date
    and (
      cr.class_type in ('normal', 'recuperacion')
      or (cr.rescheduled_to is not null
          and cr.class_type in ('reprogramada', 'cancelacion_hora'))
    )
),
alumnos as (
  select
    v.alumno_id,
    v.profesor,
    translate(lower(btrim(v.nombre)), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN') as nombre_norm
  from public.vista_perfil_alumno v
)
select distinct on (a.alumno_id)
  a.alumno_id,
  c.fecha                                      as fecha_clase,
  c.hora_inicio,
  to_char(
    to_timestamp(c.hora_inicio, 'HH24:MI') + (dur.horas || ' hours')::interval,
    'HH24:MI'
  )                                            as hora_fin,
  dur.horas                                    as duracion_horas,
  coalesce(nullif(btrim(c.teacher_name), ''), a.profesor) as profesor,
  asg.meet_link,
  -- coalesce(nullif(btrim(t.meet_link), ''), asg.meet_link) as meet_link,
  c.class_type                                 as tipo
from alumnos a
join candidatas c
  on c.nombre_norm = a.nombre_norm

-- La assignment que manda: la que más celdas tiene. De ella salen el
-- enlace y los slots con los que se calcula la duración.
left join lateral (
  select
    nullif(btrim(coalesce(a2.meet_link, '')), '') as meet_link,
    case when jsonb_typeof(a2.slots::jsonb) = 'array'
         then a2.slots::jsonb else '[]'::jsonb end as slots
  from public.assignments a2
  where a2.student_id = a.alumno_id
  order by
    greatest(
      case when jsonb_typeof(a2.slots::jsonb) = 'array'
           then jsonb_array_length(a2.slots::jsonb) else 0 end,
      coalesce(a2.weekly_hours, 0)
    ) desc,
    a2.created_at desc
  limit 1
) as asg on true

-- Cuántas horas seguidas tiene ese día a partir de la de inicio. El
-- nombre del día se construye con un CASE y no con `to_char(…,'Day')`
-- para no depender de `lc_time`, que en esta base no está puesto a
-- español y devolvería "Friday".
left join lateral (
  select greatest(1, count(*))::int as horas
  from jsonb_array_elements(asg.slots) as s
  where s->>'day' = case extract(dow from c.fecha)::int
                      when 0 then 'Domingo'
                      when 1 then 'Lunes'
                      when 2 then 'Martes'
                      when 3 then 'Miércoles'
                      when 4 then 'Jueves'
                      when 5 then 'Viernes'
                      when 6 then 'Sábado'
                    end
    and (s->>'hour') >= c.hora_inicio
) as dur on true

-- El respaldo del profesor, para el día que exista la columna:
-- left join public.teachers t on t.id = c.teacher_id

-- `distinct on` se queda con la PRIMERA de cada alumno, así que este
-- orden es el que define cuál es "la próxima": la más cercana en fecha
-- y, dentro del día, la más temprana. Hay alumnos con la misma fila
-- duplicada —Samantha Reyes y Alberto Gonzalez la tienen hoy— y esto
-- las colapsa en una.
order by a.alumno_id, c.fecha, c.hora_inicio;


-- ---------------------------------------------------------------
-- PASO 2 — CERRARLA
--
-- Una vista NUEVA no hereda los revokes de las otras. Y por esta salen
-- enlaces de sala, así que tiene que quedar tan cerrada como
-- `vista_perfil_alumno`: el LMS entra con la service role key, que no
-- pasa ni por `anon` ni por `authenticated`.
-- ---------------------------------------------------------------

revoke all on public.vista_proxima_clase from anon, authenticated;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
--
-- Con los datos del 22-09-2026 esto tiene que dar:
--
--   filas                19     (una por alumno con clase agendada)
--   alumnos_distintos    19     (si no coinciden, el distinct on falla)
--   con_meet_link        <= 19
--   sin_hora_fin          0
--
-- DIECINUEVE DE 205 NO ES UN ERROR: es el número de alumnos que hoy
-- tienen una excepción anotada. Si sale mucho más alto, mira que el
-- filtro de `class_type` no se haya quedado abierto.
-- ---------------------------------------------------------------

select
  count(*)                        as filas,
  count(distinct alumno_id)       as alumnos_distintos,
  count(meet_link)                as con_meet_link,
  count(*) filter (where hora_fin is null) as sin_hora_fin
from public.vista_proxima_clase;

-- Las filas, para mirarlas una a una. Hoy salen 19: casi todas
-- reprogramaciones del 23 al 29 de septiembre, más recuperaciones.
select alumno_id, fecha_clase, hora_inicio, hora_fin, duracion_horas, profesor, tipo,
       (meet_link is not null) as tiene_enlace
from public.vista_proxima_clase
order by fecha_clase, hora_inicio;

-- El reparto por tipo, que es la forma rápida de ver si se coló una
-- cancelación. `cancelada_*` y `falta_*` no pueden aparecer aquí.
select tipo, count(*) as filas
from public.vista_proxima_clase
group by tipo
order by filas desc;

-- Y que siga cerrada.
select
  rol,
  has_table_privilege(rol::name, 'public.vista_proxima_clase', 'select') as puede_leer
from unnest(array['anon', 'authenticated']) as rol;

do $$
declare
  abiertos text;
begin
  select string_agg(rol, ', ' order by rol)
    into abiertos
  from unnest(array['anon', 'authenticated']) as rol
  where has_table_privilege(rol::name, 'public.vista_proxima_clase', 'select');

  if abiertos is not null then
    raise exception 'vista_proxima_clase quedó legible para: %. Revócalo antes de seguir.', abiertos;
  end if;

  raise notice 'vista_proxima_clase creada y cerrada a anon y authenticated.';
end
$$;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
-- Es una vista nueva y no la lee nadie todavía, así que se borra sin
-- consecuencias:
--
--   drop view if exists public.vista_proxima_clase;
--
-- El LMS no se entera: `lib/supabase-server.ts` solo deja leer lo que
-- está en su lista blanca, y `vista_proxima_clase` no está. Para que el
-- LMS la use hay que añadirla ahí a propósito, con su motivo escrito.
-- ---------------------------------------------------------------
