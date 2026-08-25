-- ===============================================================
-- AMPLIAR vista_perfil_alumno CON LO QUE PIDE EL BANNER DE RITMO
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS.
-- Segundo archivo de esta carpeta que no es del LMS, por el mismo
-- motivo que `gestion-vista-perfil-token.sql`: el LMS depende de lo que
-- hace, y si vive en el otro lado nadie de este recuerda que existe.
--
-- QUÉ AÑADE: cuatro columnas al final de la vista.
--
--   horas_semanales   horas de clase a la semana del plan que el alumno
--                     está dando de verdad. Hoy salen las 174.
--
--   plan_contratado   `assignments.plan` de esa misma fila. NO es lo
--                     mismo que la columna `plan` que ya tiene la vista.
--
--   nivel_ficha       `student_profiles.current_level`.   Hoy: 1 de 174.
--   nivel_prueba      `student_profiles.level_test_cefr`. Hoy: 12 de 174.
--
-- ---------------------------------------------------------------
-- POR QUÉ HACEN FALTA LAS CUATRO
--
-- HORAS_SEMANALES es el bloqueo de verdad. El banner divide las horas
-- que le faltan al alumno entre las que hace por semana, y sin ese
-- número no hay nada que dividir. No está en ninguna de las dos vistas
-- del contrato, y `assignments` no se le abre al LMS: trae
-- `teacher_email`, `meet_link` y `notes`, que el LMS no necesita ver.
--
-- PLAN_CONTRATADO es una cuestión de que las dos pantallas digan lo
-- mismo. El banner de Gestión decide el nivel meta leyendo
-- `[assignments.plan, assignments.objetivo, personal_objective]`. De
-- esos tres, el LMS ya tiene los dos últimos: `objetivo_setter` es
-- exactamente `assignments.objetivo` (comprobado, 174 de 174) y
-- `objetivo_perfil` es `personal_objective` (129 de 129). Falta el
-- primero.
--
-- Y NO VALE APAÑARLO CON LA COLUMNA `plan` QUE YA HAY. Se probó: la
-- vista trae el texto del producto de WooCommerce, que es más rico, y
-- con él la meta sale distinta en 10 de los 174 alumnos. En seis solo
-- cambia el rótulo (dice "el B2 que preparas" en vez de "el B2"), pero
-- en cuatro cambia si el banner aparece o no. Un alumno que ve una
-- previsión en el LMS y ninguna en su informe de Gestión no tiene forma
-- de saber cuál de las dos nos creemos.
--
-- NIVEL_FICHA Y NIVEL_PRUEBA son el mismo problema, un escalón antes.
-- `vista_perfil_alumno.nivel` es literalmente `assignments.student_level`
-- (comprobado: coincide en los 174), que en la regla de Gestión
-- (`lib/effectiveLevel.ts`) es la fuente de MENOR prioridad: lo que
-- tecleó quien dio de alta al alumno. Con estas dos columnas el LMS
-- aplica la misma prioridad que Gestión y coloca al alumno en el mismo
-- peldaño. Hoy difieren en 9 alumnos, y como el nivel actual es de
-- donde salen las horas que faltan, esos 9 verían dos previsiones
-- distintas de su propio futuro.
--
-- NO SE AÑADE `teacher_confirmed_level`, que es la primera de esa
-- prioridad, PORQUE NO EXISTE: `supabase-teacher-level.sql` nunca se
-- corrió y la columna devuelve 42703. Si algún día se corre, se añade
-- aquí y el LMS la recoge sin desplegar nada, igual que con el token.
--
-- LO QUE NO SE EXPONE, y conviene que siga así: el cálculo. Las horas
-- de Cambridge, el multiplicador de práctica y las semanas por mes
-- viven en `lib/progressEstimate.ts` de Gestión. Por aquí viajan
-- HECHOS, no fórmulas.
--
-- ---------------------------------------------------------------
-- QUÉ ASSIGNMENT GANA, Y POR QUÉ ESA REGLA VIVE AQUÍ
--
-- Un alumno puede tener varias filas en `assignments`: cambios de
-- profesor, altas viejas sin borrar. Gestión se queda con la que más
-- celdas tenga asignadas, que es la que describe el plan que está
-- dando de verdad (`pickAssignment`, en su página de progreso).
--
-- Escrita en la vista se escribe una vez. Escrita en el LMS habría que
-- repetirla cada vez que alguien más necesite las horas, y la primera
-- vez que las dos copias se separen nadie se va a enterar.
--
-- El desempate por `created_at desc` no está en Gestión y se añade aquí
-- a propósito: sin él, dos assignments con las mismas celdas dejarían
-- el resultado al orden que le apetezca a Postgres, y el alumno
-- cambiaría de plan entre recargas.
--
-- LAS CELDAS MANDAN SOBRE EL NÚMERO GUARDADO, que es lo que hace
-- `resolveWeeklyHours` en Gestión: `weekly_hours` es lo que se contrató
-- y las celdas son lo que se da. Sin celdas, se usa el número.
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
-- con los mismos nombres. Por eso el `select base.*` va delante.
--
-- Se puede ejecutar dos veces: la segunda no hace nada y lo dice.
--
-- PRUÉBALO ANTES EN SECO, igual que el otro archivo:
--
--   begin;
--     <el bloque do $$ … $$;>
--     <las consultas del PASO 3>
--   rollback;
--
-- Comprueba que el PASO 3 devuelve 174 / 174 / 173 / 1 / 12 y haz
-- `rollback`. Si cuadra, repite con `commit`.
--
-- ESTE BLOQUE SE APOYA EN EL ANTERIOR. Si `gestion-vista-perfil-token.sql`
-- ya se corrió, sus dos columnas están dentro de `base.*` y siguen
-- saliendo. Si no se corrió, tampoco pasa nada: son independientes.
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
      and column_name in ('horas_semanales', 'plan_contratado', 'nivel_ficha', 'nivel_prueba')
  ) then
    raise notice 'vista_perfil_alumno ya tiene las columnas del ritmo. No se toca nada.';
    return;
  end if;

  select rtrim(btrim(pg_get_viewdef('public.vista_perfil_alumno'::regclass, true)), ';')
    into definicion;

  -- ---------------------------------------------------------------
  -- LAS OPCIONES DE LA VISTA SE VUELVEN A PONER A MANO
  --
  -- `create or replace view` sin cláusula `with (…)` deja la vista con
  -- las opciones por defecto. Si está creada con `security_invoker = on`
  -- —lo normal en Supabase para que respete el RLS de las tablas de
  -- debajo— y se reemplaza sin repetirlo, pasa a ejecutarse con los
  -- permisos de su propietario y nadie se entera. Mismo cuidado que en
  -- `gestion-vista-perfil-token.sql`.
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
      asg.horas           as horas_semanales,
      asg.plan            as plan_contratado,
      fic.current_level   as nivel_ficha,
      fic.level_test_cefr as nivel_prueba
    from (%s) as base

    -- La assignment que describe el plan que está dando de verdad: la
    -- que más celdas tenga. `slots` se castea a jsonb para no depender
    -- de si la columna es json o jsonb, y `jsonb_typeof` protege de una
    -- fila que no traiga un array dentro.
    left join lateral (
      select
        a.plan,
        case
          when jsonb_typeof(a.slots::jsonb) = 'array'
               and jsonb_array_length(a.slots::jsonb) > 0
            then jsonb_array_length(a.slots::jsonb)
          when coalesce(a.weekly_hours, 0) > 0
            then a.weekly_hours
          else null
        end as horas
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
    ) as asg on true

    -- La ficha de IA, solo por sus dos columnas de nivel. Un alumno
    -- puede no tenerla: 137 de los 174 la tienen.
    left join lateral (
      select sp.current_level, sp.level_test_cefr
      from public.student_profiles sp
      where sp.student_id = base.alumno_id
      limit 1
    ) as fic on true
  $consulta$, con_with, definicion);

  raise notice 'vista_perfil_alumno ampliada con horas_semanales, plan_contratado, nivel_ficha y nivel_prueba.';
end
$$;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
--
-- Con los datos del 24-08-2026 esto tiene que dar:
--
--   alumnos            174
--   con_horas          174
--   con_plan           173
--   con_nivel_ficha      1
--   con_nivel_prueba    12
--
-- `con_plan` es uno menos que `alumnos` y está bien: hay un alumno con
-- assignment cuyo `plan` está vacío. Ese verá el banner igual, con la
-- meta sacada de los otros dos textos.
--
-- Si `con_horas` da 0, el `left join lateral` no está casando: mira que
-- `assignments.student_id` y `vista_perfil_alumno.alumno_id` sean el
-- mismo identificador.
-- ---------------------------------------------------------------

select
  count(*)                                                as alumnos,
  count(horas_semanales)                                  as con_horas,
  count(nullif(btrim(coalesce(plan_contratado, '')), '')) as con_plan,
  count(nullif(btrim(coalesce(nivel_ficha, '')), ''))     as con_nivel_ficha,
  count(nullif(btrim(coalesce(nivel_prueba, '')), ''))    as con_nivel_prueba
from public.vista_perfil_alumno;

-- El reparto de horas, que es lo que decide cuántas filas ve cada
-- alumno en el banner. Con los datos de hoy: 1h→44, 2h→69, 3h→21,
-- 4h→27, 5h→12, 6h→1.
select horas_semanales, count(*) as alumnos
from public.vista_perfil_alumno
group by horas_semanales
order by horas_semanales;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
-- Con la definición del paso 1 guardada:
--
--   create or replace view public.vista_perfil_alumno as <lo guardado>;
--
-- El LMS la aguanta sin desplegar nada: lee la vista con `select("*")`
-- y las columnas que falten llegan como null. Sin horas no hay banner
-- de ritmo, y el resto de la pantalla de progreso sigue igual. Ver
-- `lib/gestion.ts`.
-- ---------------------------------------------------------------
