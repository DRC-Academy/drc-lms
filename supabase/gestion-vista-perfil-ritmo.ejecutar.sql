-- Extracto ejecutable de supabase/gestion-vista-perfil-ritmo.sql
--
-- Solo las sentencias. El porqué de cada decisión —qué assignment gana,
-- por qué plan_contratado no es la columna plan, por qué las opciones de
-- la vista se vuelven a poner a mano— está en el archivo de origen, que
-- es el que manda. Esto se genera de él; si hay que cambiar algo, se
-- cambia allí.
--
-- ORDEN: el PASO 1 se ejecuta SOLO y se guarda su resultado (es la vuelta
-- atrás). Después, en seco:
--
--   begin;
--     <PASO 2>
--     <PASO 3>
--     <PASO 4>
--   rollback;
--
-- Si el PASO 3 cuadra y el PASO 4 no protesta, se repite con commit.

-- ═════════════════════════════════════════════════════════════════════
-- PASO 1 — GUARDAR LA DEFINICIÓN ACTUAL
-- ═════════════════════════════════════════════════════════════════════
select pg_get_viewdef('public.vista_perfil_alumno'::regclass, true);

-- ═════════════════════════════════════════════════════════════════════
-- PASO 2 — AÑADIR LAS COLUMNAS
-- ═════════════════════════════════════════════════════════════════════
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
      and column_name in ('horas_semanales', 'plan_contratado', 'nivel_profesor', 'nivel_ficha', 'nivel_prueba')
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
      asg.horas                   as horas_semanales,
      asg.plan                    as plan_contratado,
      fic.teacher_confirmed_level as nivel_profesor,
      fic.current_level           as nivel_ficha,
      fic.level_test_cefr         as nivel_prueba
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
      select sp.teacher_confirmed_level, sp.current_level, sp.level_test_cefr
      from public.student_profiles sp
      where sp.student_id = base.alumno_id
      limit 1
    ) as fic on true
  $consulta$, con_with, definicion);

  raise notice 'vista_perfil_alumno ampliada con horas_semanales, plan_contratado, nivel_ficha y nivel_prueba.';
end
$$;

-- ═════════════════════════════════════════════════════════════════════
-- PASO 3 — COMPROBAR
-- ═════════════════════════════════════════════════════════════════════
select
  count(*)                                                as alumnos,
  count(horas_semanales)                                  as con_horas,
  count(nullif(btrim(coalesce(plan_contratado, '')), '')) as con_plan,
  count(nullif(btrim(coalesce(nivel_profesor, '')), ''))  as con_nivel_profesor,
  count(nullif(btrim(coalesce(nivel_ficha, '')), ''))     as con_nivel_ficha,
  count(nullif(btrim(coalesce(nivel_prueba, '')), ''))    as con_nivel_prueba
from public.vista_perfil_alumno;

select horas_semanales, count(*) as alumnos
from public.vista_perfil_alumno
group by horas_semanales
order by horas_semanales;

-- ═════════════════════════════════════════════════════════════════════
-- PASO 4 — COMPROBAR QUE LA VISTA SIGUE CERRADA
-- ═════════════════════════════════════════════════════════════════════
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
