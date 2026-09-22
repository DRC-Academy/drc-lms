-- ===============================================================
-- AMPLIAR vista_perfil_alumno CON EL ENLACE DE CLASE Y EL HORARIO
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS.
-- Tercer archivo de esta carpeta que no es del LMS, por el mismo motivo
-- que los otros dos: el LMS depende de lo que hace, y si vive en el
-- otro lado nadie de este recuerda que existe.
--
-- QUÉ AÑADE: dos columnas al final de la vista.
--
--   meet_link   `assignments.meet_link`, tal cual. Es la sala donde el
--               alumno entra a clase.
--
--   slots       `assignments.slots`, el horario recurrente acordado.
--               Array JSON: [{"day":"Miércoles","hour":"11:00"}, …]
--
-- ---------------------------------------------------------------
-- LO QUE DICEN LOS DATOS (22-09-2026, 206 filas en la vista)
--
-- MEET_LINK está relleno en 193 de 206, y de esos 188 son un enlace que
-- de verdad abre algo. El resto: 13 vacíos y 5 con texto que no es un
-- enlace ("aaa", "hola", "meet.com", una invitación de Zoom pegada
-- entera). De esos 5, cuatro son cuentas de prueba. La cobertura real,
-- entonces, es del 91%, no del 80% del informe viejo.
--
-- HAY 9 ENLACES SIN `https://` —"meet.google.com/abc-defg-hij"—. Se
-- exponen tal cual y los arregla quien pinta: un `href` sin esquema lo
-- resuelve el navegador como ruta relativa y manda al alumno a una
-- página del LMS que no existe. Normalizar aquí sería empezar a limpiar
-- datos de Gestión desde una vista, que es justo lo que estas vistas no
-- hacen: por aquí viajan HECHOS, y el hecho es que ese campo lo rellena
-- una persona a mano y a veces se deja el esquema.
--
-- EL ENLACE ES DEL PROFESOR, NO DEL ALUMNO, y esto hay que saberlo
-- antes de pintar un botón: hay 157 enlaces distintos para 210
-- assignments. Una sala de Zoom sirve a 10 alumnos y una de Meet a 14.
-- No es un enlace por clase que caduque: es la sala fija del profesor.
-- Bien para el LMS —no hace falta nada por clase— y a tener en cuenta
-- para el producto: el alumno que entre a deshora cae en la clase de
-- otro.
--
-- SLOTS está relleno en los 206, sin una sola fila con la forma rota.
-- Días en español con tilde (Lunes…Sábado, ningún Domingo) y horas en
-- punto de 06:00 a 23:00. El reparto: 1 slot→56 alumnos, 2→87, 3→25,
-- 4→26, 5→11, 6→1.
--
-- LA HORA ES DE ESPAÑA. Medido, no supuesto: cruzando 968 entradas
-- puntuales de `class_join_logs` desde el 1/09, la hora guardada va
-- exactamente 2 h por delante del `clicked_at` en UTC en 814 de ellas.
-- Eso es CEST, o sea Europe/Madrid. NO es la hora de Argentina, aunque
-- el equipo esté allí. La columna no lleva zona y sale como texto
-- "HH:MM": quien la pinte tiene que tratarla como hora local de Madrid,
-- con su cambio de hora —el 25 de octubre de 2026 España pasa a CET y
-- el desfase con UTC se queda en 1 h—.
--
-- ---------------------------------------------------------------
-- LO QUE NO SE EXPONE, Y POR QUÉ
--
-- LA PRÓXIMA CLASE NO SE CALCULA AQUÍ, y no es por comodidad: es que no
-- se puede calcular bien con lo que hay. `slots` es el horario
-- acordado, no la agenda. Contrastado con las clases que de verdad
-- ocurrieron desde el 1/08, el día y la hora caen en un slot solo el
-- 73% de las veces, y por alumno solo 87 de 158 aciertan el 80% o más.
-- La explicación está en `class_records.class_type`: de 3177 clases,
-- 1664 son "normal" y 780 son "recuperacion", más 301 reprogramadas y
-- las canceladas. Una cuarta parte de las clases NO cae en su slot.
--
-- Y la corrección tampoco se puede hacer desde aquí: las tablas que
-- saben de recuperaciones y reprogramaciones —`class_records`,
-- `class_join_logs`— identifican al alumno por `student_name`, un
-- texto, y no por `student_id`. De los 221 nombres que aparecen en
-- `class_join_logs` desde el 1/08, 46 no casan con ningún assignment
-- activo. Exponer una "próxima clase" calculada sobre eso sería
-- prometer una fecha que falla una de cada cuatro veces.
--
-- Así que por aquí viaja el horario acordado y el LMS decide qué contar
-- con él. Si algún día Gestión guarda la agenda de verdad —una fila por
-- clase futura, con `student_id`— esa es la columna que pedir, y esta
-- vista se amplía otra vez.
--
-- ---------------------------------------------------------------
-- QUÉ ASSIGNMENT GANA
--
-- EXACTAMENTE EL MISMO QUE EN `gestion-vista-perfil-ritmo.sql`: el que
-- más celdas tenga, desempatando por `created_at desc`. No es una
-- preferencia, es una obligación: si este bloque eligiera otro, un
-- alumno con dos assignments podría acabar con las horas de uno y el
-- enlace del otro. Si algún día se cambia la regla, se cambia en los
-- dos sitios.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 1 — GUARDAR LA DEFINICIÓN ACTUAL
--
-- Ejecuta esto SOLO y guarda el resultado antes de seguir. Es la vuelta
-- atrás.
-- ---------------------------------------------------------------

select pg_get_viewdef('public.vista_perfil_alumno'::regclass, true);


-- ---------------------------------------------------------------
-- PASO 2 — AÑADIR LAS COLUMNAS
--
-- No hay que pegar aquí la definición de la vista: el bloque la lee de
-- la propia base y la envuelve, así que lo que hoy devuelve
-- `vista_perfil_alumno` sigue devolviéndolo igual, en el mismo orden y
-- con los mismos nombres.
--
-- Se puede ejecutar dos veces: la segunda no hace nada y lo dice.
--
-- PRUÉBALO ANTES EN SECO:
--
--   begin;
--     <el bloque do $$ … $$;>
--     <las consultas del PASO 3>
--     <las consultas del PASO 4>
--   rollback;
--
-- Comprueba que el PASO 3 devuelve 206 / 193 / 188 / 206 / 0 y que el
-- PASO 4 no protesta, y haz `rollback`. Si cuadra, repite con `commit`.
--
-- ESTE BLOQUE SE APOYA EN LOS ANTERIORES. Si los otros dos archivos ya
-- se corrieron, sus columnas están dentro de `base.*` y siguen
-- saliendo. Si no, tampoco pasa nada: son independientes.
-- ---------------------------------------------------------------

do $$
declare
  definicion text;
  opciones   text[];
  con_with   text := '';
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'vista_perfil_alumno'
      and column_name in ('meet_link', 'slots')
  ) then
    raise notice 'vista_perfil_alumno ya tiene meet_link y slots. No se toca nada.';
    return;
  end if;

  select rtrim(btrim(pg_get_viewdef('public.vista_perfil_alumno'::regclass, true)), ';')
    into definicion;

  -- ---------------------------------------------------------------
  -- LAS OPCIONES DE LA VISTA SE VUELVEN A PONER A MANO
  --
  -- `create or replace view` sin cláusula `with (…)` deja la vista con
  -- las opciones por defecto. Si está creada con `security_invoker = on`
  -- y se reemplaza sin repetirlo, pasa a ejecutarse con los permisos de
  -- su propietario y nadie se entera. Mismo cuidado que en los otros
  -- dos archivos.
  -- ---------------------------------------------------------------
  select c.reloptions into opciones
  from pg_class c
  where c.oid = 'public.vista_perfil_alumno'::regclass;

  if opciones is not null and array_length(opciones, 1) > 0 then
    con_with := ' with (' || array_to_string(opciones, ', ') || ')';
    raise notice 'opciones conservadas: %', array_to_string(opciones, ', ');
  end if;

  execute format($consulta$
    create or replace view public.vista_perfil_alumno%s as
    select
      base.*,
      cla.meet_link,
      cla.slots
    from (%s) as base

    -- La MISMA assignment que elige `gestion-vista-perfil-ritmo.sql`.
    -- `slots` se castea a jsonb para no depender de si la columna es
    -- json o jsonb, y `jsonb_typeof` protege de una fila que no traiga
    -- un array dentro.
    left join lateral (
      select
        nullif(btrim(coalesce(a.meet_link, '')), '') as meet_link,
        case
          when jsonb_typeof(a.slots::jsonb) = 'array' then a.slots::jsonb
          else null
        end as slots
      from public.assignments a
      where a.student_id = base.alumno_id
      order by
        greatest(
          case when jsonb_typeof(a.slots::jsonb) = 'array'
               then jsonb_array_length(a.slots::jsonb) else 0 end,
          coalesce(a.weekly_hours, 0)
        ) desc,
        a.created_at desc
      limit 1
    ) as cla on true
  $consulta$, con_with, definicion);

  raise notice 'vista_perfil_alumno ampliada con meet_link y slots.';
end
$$;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
--
-- Con los datos del 22-09-2026 esto tiene que dar:
--
--   alumnos            206
--   con_meet_link      193
--   meet_link_usable   188
--   con_slots          206
--   sin_assignment       0
--
-- `con_meet_link` cuenta lo que no está vacío; `meet_link_usable`
-- descuenta además los cinco que llevan texto que no es un enlace. La
-- diferencia entre los dos es el caso que el LMS tiene que saber
-- distinguir: un campo relleno no es un botón que funcione.
--
-- Si `con_slots` da 0, el `left join lateral` no está casando: mira que
-- `assignments.student_id` y `vista_perfil_alumno.alumno_id` sean el
-- mismo identificador.
-- ---------------------------------------------------------------

select
  count(*)         as alumnos,
  count(meet_link) as con_meet_link,
  count(*) filter (
    where meet_link ~* '^https?://.*(meet\.google\.com|zoom\.us|teams\.live\.com|teams\.microsoft\.com)'
       or (meet_link !~ '\s' and meet_link ~* '(meet\.google\.com|zoom\.us|teams\.live\.com|teams\.microsoft\.com)')
  )                as meet_link_usable,
  count(*) filter (
    where jsonb_typeof(slots) = 'array' and jsonb_array_length(slots) > 0
  )                as con_slots,
  count(*) filter (where slots is null and meet_link is null) as sin_assignment
from public.vista_perfil_alumno;

-- El reparto de clases por semana, que es cuántas filas de horario ve
-- cada alumno. Con los datos de hoy: 1→56, 2→87, 3→25, 4→26, 5→11, 6→1.
select
  jsonb_array_length(slots) as clases_por_semana,
  count(*)                  as alumnos
from public.vista_perfil_alumno
where jsonb_typeof(slots) = 'array'
group by 1
order by 1;

-- Los días y horas que hay, para confirmar que no aparece una forma
-- nueva. Hoy: seis días con tilde (ningún Domingo) y horas en punto.
select
  s->>'day'  as dia,
  s->>'hour' as hora,
  count(*)   as veces
from public.vista_perfil_alumno v,
     lateral jsonb_array_elements(v.slots) as s
where jsonb_typeof(v.slots) = 'array'
group by 1, 2
order by 1, 2;


-- ---------------------------------------------------------------
-- PASO 4 — COMPROBAR QUE LA VISTA SIGUE CERRADA
--
-- `create or replace view` NO borra los permisos, pero sí se lleva por
-- delante y en silencio las OPCIONES de la vista, entre ellas
-- `security_invoker`. El bloque del PASO 2 las vuelve a poner, y esto
-- es la clase de cosa que hay que ver comprobada y no prometida: por
-- debajo de esta vista está `assignments`, que trae el email y el
-- teléfono del profesor además del enlace.
--
-- LO QUE TIENE QUE SALIR:
--
--   · las dos filas de roles con `puede_leer` y `puede_escribir` en false;
--   · `security_invoker=on` entre las opciones, si estaba antes;
--   · el mismo propietario de siempre.
-- ---------------------------------------------------------------

select
  rol,
  has_table_privilege(rol::name, 'public.vista_perfil_alumno', 'select') as puede_leer,
  has_table_privilege(rol::name, 'public.vista_perfil_alumno', 'insert') as puede_escribir
from unnest(array['anon', 'authenticated']) as rol;

select
  pg_get_userbyid(c.relowner)                                    as propietario,
  coalesce(array_to_string(c.reloptions, ', '), '(sin opciones)') as opciones
from pg_class c
where c.oid = 'public.vista_perfil_alumno'::regclass;

do $$
declare
  abiertos text;
begin
  select string_agg(rol, ', ' order by rol)
    into abiertos
  from unnest(array['anon', 'authenticated']) as rol
  where has_table_privilege(rol::name, 'public.vista_perfil_alumno', 'select');

  if abiertos is not null then
    raise exception 'vista_perfil_alumno quedó legible para: %. Revócalo antes de seguir.', abiertos;
  end if;

  raise notice 'vista_perfil_alumno sigue cerrada a anon y authenticated.';
end
$$;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
-- Con la definición del paso 1 guardada:
--
--   create or replace view public.vista_perfil_alumno as <lo guardado>;
--
-- El LMS la aguanta sin desplegar nada: lee la vista con `select("*")`
-- y las columnas que falten llegan como null. Sin enlace y sin horario
-- no hay banner de clases, y el resto de la aplicación sigue igual. Ver
-- `lib/gestion.ts`.
-- ---------------------------------------------------------------
