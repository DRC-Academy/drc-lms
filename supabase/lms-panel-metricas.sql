-- ===============================================================
-- LAS MÉTRICAS DEL PANEL, AGREGADAS EN LA BASE
--
-- Ejecutar en el proyecto del LMS DESPUÉS de `lms-instrumentacion.sql`
-- (usa `accesos`, `metricas_excluido()` y `pantalla_origen`).
--
-- POR QUÉ AQUÍ Y NO EN TYPESCRIPT. Los alumnos únicos de un rango no se
-- pueden sumar semana a semana —quien entra tres semanas contaría tres
-- veces— y traer las filas para contarlas en el servidor choca con el
-- tope de 1.000 filas de PostgREST, que corta sin avisar. Aquí se cuenta
-- con `count(distinct)` sobre el rango que se pida y al servidor solo
-- le llegan los números.
--
-- LAS REGLAS, UNA VEZ:
--   · Zona horaria Europe/Madrid, en la base y no en el servidor. Un
--     rango `desde`–`hasta` son días naturales de Madrid, los dos
--     incluidos. Todas las columnas de fecha son `timestamptz`, y se
--     hace siempre igual:
--       - cada fila se pasa a hora de Madrid ANTES de agrupar:
--         date_trunc('day' | 'week', (en AT TIME ZONE 'Europe/Madrid'));
--       - los extremos del rango son la medianoche de Madrid como
--         instante: (fecha::timestamp AT TIME ZONE 'Europe/Madrid').
--   · EL CAMBIO DE HORA (25 oct 2026, 03:00 → 02:00) no mueve nada: la
--     conversión usa la regla de Madrid de cada instante, así que lo de
--     antes de las 03:00 de ese domingo va con +2 y lo de después con +1,
--     y la medianoche del 26 es la de +1. Ese día tiene 25 horas y la
--     semana del 19 al 25 oct, 169: ninguna fila cae fuera ni en dos
--     periodos. Los periodos se generan sobre `timestamp` sin zona (días
--     de calendario), donde no hay horas que sobren ni falten.
--   · Semanas de lunes a domingo (`date_trunc('week')` es ISO).
--   · Exclusión: todas las vistas de abajo pasan por
--     `metricas_excluido()`, y las funciones solo leen de las vistas. No
--     hay ninguna consulta del panel que lea las tablas directamente.
--   · «Activo» = un acceso, un inicio de sesión o cualquier actividad con
--     fecha (lección, ejercicio, bloque generado o completado, entrada a
--     clase). El inicio de sesión cuenta porque es lo único que hay de
--     antes de `accesos`: sin él, el histórico se quedaría vacío en vez
--     de aproximado.
--   · «Hicieron algo» = lección, ejercicio o bloque. Entrar o pulsar
--     «Ingresar a clase» no es usar la práctica.
--
-- Idempotente. El deshacer está al final.
-- ===============================================================


-- ===============================================================
-- ÍNDICES POR FECHA
--
-- Las tablas de origen tienen índices por alumno, que es como las lee el
-- alumno. El panel las lee por ventana de tiempo y sin alumno.
-- ===============================================================

create index if not exists idx_progreso_lecciones_fecha on public.progreso_lecciones (completada_en);
create index if not exists idx_intentos_ejercicio_fecha on public.intentos_ejercicio (respondido_en);
create index if not exists idx_progreso_bloques_fecha   on public.progreso_bloques (completado_en);
create index if not exists idx_bloques_generados_fecha  on public.bloques_generados (generado_en);
create index if not exists idx_sesiones_creada          on public.sesiones (creada_en) where rol = 'alumno';


-- ===============================================================
-- VISTAS BASE (con la exclusión ya aplicada)
-- ===============================================================

-- Lecciones completadas en la plataforma. `learndash_migrado` es
-- historial importado, no uso.
create or replace view public.metricas_lecciones
with (security_invoker = on) as
select pl.alumno_id, pl.leccion_id, pl.completada_en
from public.progreso_lecciones pl
where pl.origen = 'lms'
  and not public.metricas_excluido(pl.alumno_id);

-- Un bloque generado por fila, con cuándo se completó por primera vez.
-- Sin los del equipo revisando una ficha.
--
-- COMPLETADO = terminado al menos una vez por el mismo alumno, en
-- cualquier momento hasta hoy. Se cuenta en el periodo en el que se
-- GENERÓ (cohorte), no en el que se completó: así «generados frente a
-- completados» de una semana se lee como «de los que se generaron, cuántos
-- se han terminado», y nunca puede haber más completados que generados.
-- La contrapartida: las semanas recientes suben con los días.
create or replace view public.metricas_bloques
with (security_invoker = on) as
select
  b.bloque_clave,
  b.alumno_id,
  b.generado_en,
  b.origen,
  b.pantalla_origen,
  (select min(pb.completado_en)
     from public.progreso_bloques pb
    where pb.alumno_id = b.alumno_id and pb.bloque_clave = b.bloque_clave) as completado_en
from public.bloques_generados b
where not b.generado_por_equipo
  and not public.metricas_excluido(b.alumno_id);

-- Todo lo que hace un alumno, una fila por cosa, con su fecha.
create or replace view public.metricas_actividad
with (security_invoker = on) as
select a.alumno_id, a.iniciado_en as en, 'acceso'::text as tipo, false as hace_algo
  from public.accesos a
 where not public.metricas_excluido(a.alumno_id)
union all
select s.alumno_id, s.creada_en, 'sesion', false
  from public.sesiones s
 where s.rol = 'alumno' and not public.metricas_excluido(s.alumno_id)
union all
select l.alumno_id, l.completada_en, 'leccion', true
  from public.metricas_lecciones l
union all
select i.alumno_id, i.respondido_en, 'ejercicio', true
  from public.intentos_ejercicio i
 where i.origen = 'lms' and not public.metricas_excluido(i.alumno_id)
union all
select b.alumno_id, b.generado_en, 'bloque_generado', true
  from public.metricas_bloques b
union all
-- Cualquier bloque terminado, también los del catálogo, que no están en
-- `bloques_generados`.
select p.alumno_id, p.completado_en, 'bloque_completado', true
  from public.progreso_bloques p
 where not public.metricas_excluido(p.alumno_id)
union all
select e.alumno_id, e.clicked_at, 'entrada_clase', false
  from public.entradas_clase e
 where not public.metricas_excluido(e.alumno_id);

comment on view public.metricas_actividad is
  'Toda la actividad de los alumnos, sin excluidos. hace_algo = lección, ejercicio o bloque.';

revoke all on public.metricas_lecciones, public.metricas_bloques, public.metricas_actividad
  from anon, authenticated;


-- ===============================================================
-- panel_agregado — EL ÚNICO CÁLCULO
--
-- Las dos funciones públicas de abajo (`panel_serie` y `panel_totales`)
-- son esta misma con otra granularidad. Así la serie y el total no
-- pueden discrepar en qué cuentan: solo en cómo agrupan.
--
--   p_granularidad  'dia' | 'semana' | 'total'
--   p_alumnos       opcional: contar solo a estos. Lo usa el panel para
--                   ceñirse a los alumnos con plan activo (que salen de
--                   Gestión) y para «de los que podían generar, cuántos
--                   generaron».
--
-- Una fila por periodo, también los vacíos (con ceros). En semanas, el
-- primer y el último periodo pueden ser parciales: `periodo` es siempre
-- el lunes y `periodo_desde`/`periodo_hasta` dicen qué días de esa
-- semana entran en el rango.
-- ===============================================================

-- La forma de una fila del panel. Un tipo con nombre y no `returns
-- table` porque la comparten tres funciones, y porque PostgREST no sabe
-- llamar a una que devuelva `setof record`.
--
-- No es idempotente por sí mismo (`create type` no tiene `if not
-- exists`): si un día cambia, hay que borrarlo con sus funciones —ver el
-- deshacer— y volver a ejecutar el archivo.
do $tipo$
begin
  if not exists (select 1 from pg_type where typname = 'panel_fila' and typnamespace = 'public'::regnamespace) then
    create type public.panel_fila as (
  periodo                   date,
  periodo_desde             date,
  periodo_hasta             date,
  activos                   int,   -- alumnos únicos con cualquier actividad
  hicieron_algo             int,   -- alumnos únicos con lección, ejercicio o bloque
  accesos                   int,   -- accesos totales (solo desde que existe la tabla)
  accesos_alumnos           int,   -- alumnos únicos con al menos un acceso registrado (NO el plan activo)
  entradas_alumnos          int,
  entradas                  int,
  generaron                 int,   -- alumnos únicos que generaron un bloque
  bloques                   int,
  bloques_ia                int,
  bloques_banco             int,
  bloques_inicio            int,
  bloques_para_ti           int,
  bloques_sin_pantalla      int,
  completados               int,   -- de los generados en el periodo, terminados alguna vez
  completados_ia            int,
  completados_banco         int,
  completados_inicio        int,
  completados_para_ti       int,
  completados_sin_pantalla  int,
  lecciones_alumnos         int,
  lecciones                 int,
  ejercicios_alumnos        int,
  ejercicios                int
    );
  end if;
end
$tipo$;

-- Se llamó `alumnos_con_acceso` hasta el 20-10-2026, y se confundía con
-- «Alumnos con acceso» del panel, que es el plan activo de Gestión. Para
-- las bases donde ya se creó con el nombre viejo.
do $renombre$
begin
  if exists (
    select 1
      from pg_attribute a
      join pg_type t on t.typrelid = a.attrelid
     where t.typname = 'panel_fila' and t.typnamespace = 'public'::regnamespace
       and a.attname = 'alumnos_con_acceso' and not a.attisdropped
  ) then
    alter type public.panel_fila rename attribute alumnos_con_acceso to accesos_alumnos;
  end if;
end
$renombre$;

create or replace function public.panel_agregado(
  p_desde date,
  p_hasta date,
  p_granularidad text,
  p_alumnos text[] default null
)
returns setof public.panel_fila
language plpgsql
stable
set search_path = ''
as $$
declare
  v_ini timestamptz;
  v_fin timestamptz;
  v_unidad text;
begin
  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    raise exception 'Rango no válido: % – %', p_desde, p_hasta;
  end if;
  -- 12 meses de rango y otros tantos de comparación, con margen.
  if p_hasta - p_desde > 400 then
    raise exception 'Rango demasiado largo: % días (máximo 400)', p_hasta - p_desde;
  end if;
  if p_granularidad not in ('dia', 'semana', 'total') then
    raise exception 'Granularidad no válida: % (dia | semana | total)', p_granularidad;
  end if;

  -- Medianoche de Madrid de cada extremo; `hasta` incluido.
  v_ini := (p_desde::timestamp at time zone 'Europe/Madrid');
  v_fin := ((p_hasta + 1)::timestamp at time zone 'Europe/Madrid');
  v_unidad := case p_granularidad when 'dia' then 'day' when 'semana' then 'week' end;

  return query
  with
  periodos as (
    select g::date as periodo
      from pg_catalog.generate_series(
             case when v_unidad = 'week' then date_trunc('week', p_desde::timestamp) else p_desde::timestamp end,
             p_hasta::timestamp,
             case when v_unidad = 'week' then interval '1 week' else interval '1 day' end
           ) g
     where p_granularidad <> 'total'
    union all
    select p_desde where p_granularidad = 'total'
  ),
  act as (
    select a.alumno_id, a.tipo, a.hace_algo,
           case when p_granularidad = 'total' then p_desde
                else date_trunc(v_unidad, (a.en at time zone 'Europe/Madrid'))::date end as periodo
      from public.metricas_actividad a
     where a.en >= v_ini and a.en < v_fin
       and (p_alumnos is null or a.alumno_id = any (p_alumnos))
  ),
  act_agg as (
    select act.periodo,
           count(distinct act.alumno_id)                                                 as activos,
           count(distinct act.alumno_id) filter (where act.hace_algo)                    as hicieron_algo,
           count(*)                      filter (where act.tipo = 'acceso')              as accesos,
           count(distinct act.alumno_id) filter (where act.tipo = 'acceso')              as accesos_alumnos,
           count(distinct act.alumno_id) filter (where act.tipo = 'entrada_clase')       as entradas_alumnos,
           count(*)                      filter (where act.tipo = 'entrada_clase')       as entradas,
           count(distinct act.alumno_id) filter (where act.tipo = 'leccion')             as lecciones_alumnos,
           count(*)                      filter (where act.tipo = 'leccion')             as lecciones,
           count(distinct act.alumno_id) filter (where act.tipo = 'ejercicio')           as ejercicios_alumnos,
           count(*)                      filter (where act.tipo = 'ejercicio')           as ejercicios
      from act
     group by act.periodo
  ),
  blq as (
    select b.*,
           case when p_granularidad = 'total' then p_desde
                else date_trunc(v_unidad, (b.generado_en at time zone 'Europe/Madrid'))::date end as periodo
      from public.metricas_bloques b
     where b.generado_en >= v_ini and b.generado_en < v_fin
       and (p_alumnos is null or b.alumno_id = any (p_alumnos))
  ),
  blq_agg as (
    select blq.periodo,
           count(distinct blq.alumno_id)                                                         as generaron,
           count(*)                                                                              as bloques,
           count(*) filter (where blq.origen = 'ia')                                             as bloques_ia,
           count(*) filter (where blq.origen = 'banco')                                          as bloques_banco,
           count(*) filter (where blq.pantalla_origen = 'inicio')                                as bloques_inicio,
           count(*) filter (where blq.pantalla_origen = 'para_ti')                               as bloques_para_ti,
           count(*) filter (where blq.pantalla_origen is null)                                   as bloques_sin_pantalla,
           count(*) filter (where blq.completado_en is not null)                                 as completados,
           count(*) filter (where blq.completado_en is not null and blq.origen = 'ia')           as completados_ia,
           count(*) filter (where blq.completado_en is not null and blq.origen = 'banco')        as completados_banco,
           count(*) filter (where blq.completado_en is not null and blq.pantalla_origen = 'inicio')  as completados_inicio,
           count(*) filter (where blq.completado_en is not null and blq.pantalla_origen = 'para_ti') as completados_para_ti,
           count(*) filter (where blq.completado_en is not null and blq.pantalla_origen is null)     as completados_sin_pantalla
      from blq
     group by blq.periodo
  )
  select
    p.periodo,
    greatest(p.periodo, p_desde),
    least(case when v_unidad = 'week' then p.periodo + 6 when v_unidad = 'day' then p.periodo else p_hasta end, p_hasta),
    coalesce(a.activos, 0)::int,
    coalesce(a.hicieron_algo, 0)::int,
    coalesce(a.accesos, 0)::int,
    coalesce(a.accesos_alumnos, 0)::int,
    coalesce(a.entradas_alumnos, 0)::int,
    coalesce(a.entradas, 0)::int,
    coalesce(b.generaron, 0)::int,
    coalesce(b.bloques, 0)::int,
    coalesce(b.bloques_ia, 0)::int,
    coalesce(b.bloques_banco, 0)::int,
    coalesce(b.bloques_inicio, 0)::int,
    coalesce(b.bloques_para_ti, 0)::int,
    coalesce(b.bloques_sin_pantalla, 0)::int,
    coalesce(b.completados, 0)::int,
    coalesce(b.completados_ia, 0)::int,
    coalesce(b.completados_banco, 0)::int,
    coalesce(b.completados_inicio, 0)::int,
    coalesce(b.completados_para_ti, 0)::int,
    coalesce(b.completados_sin_pantalla, 0)::int,
    coalesce(a.lecciones_alumnos, 0)::int,
    coalesce(a.lecciones, 0)::int,
    coalesce(a.ejercicios_alumnos, 0)::int,
    coalesce(a.ejercicios, 0)::int
  from periodos p
  left join act_agg a on a.periodo = p.periodo
  left join blq_agg b on b.periodo = p.periodo
  order by p.periodo;
end;
$$;

comment on function public.panel_agregado(date, date, text, text[]) is
  'Cálculo único del panel. Usar panel_serie (dia | semana) o panel_totales (todo el rango).';

-- La serie: una fila por día o por semana.
create or replace function public.panel_serie(
  p_desde date,
  p_hasta date,
  p_granularidad text,
  p_alumnos text[] default null
)
returns setof public.panel_fila
language sql
stable
set search_path = ''
as $$
  select * from public.panel_agregado(p_desde, p_hasta, p_granularidad, p_alumnos)
   where p_granularidad in ('dia', 'semana');
$$;

-- Los totales de TODO el rango: alumnos únicos de verdad, no la suma de
-- los de cada periodo.
create or replace function public.panel_totales(
  p_desde date,
  p_hasta date,
  p_alumnos text[] default null
)
returns setof public.panel_fila
language sql
stable
set search_path = ''
as $$
  select * from public.panel_agregado(p_desde, p_hasta, 'total', p_alumnos);
$$;


-- ===============================================================
-- panel_embudo — ENTRARON → HICIERON ALGO → VOLVIERON
--
-- El primer escalón, «tienen acceso», no está en esta base: son los
-- alumnos con plan activo de Gestión. El servidor los pasa en
-- `p_alumnos` y con eso todos los escalones quedan dentro del primero.
--
-- VOLVIERON = hicieron algo en al menos DOS periodos distintos del rango
-- (días si la granularidad es 'dia', semanas si es 'semana'). En un
-- rango de un solo periodo no se puede volver: `periodos` = 1 y el panel
-- lo dice en vez de enseñar un cero.
-- ===============================================================

create or replace function public.panel_embudo(
  p_desde date,
  p_hasta date,
  p_granularidad text,
  p_alumnos text[] default null
)
returns table (entraron int, hicieron_algo int, volvieron int, periodos int)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ini timestamptz;
  v_fin timestamptz;
  v_unidad text;
begin
  if p_desde is null or p_hasta is null or p_desde > p_hasta or p_hasta - p_desde > 400 then
    raise exception 'Rango no válido: % – %', p_desde, p_hasta;
  end if;
  if p_granularidad not in ('dia', 'semana') then
    raise exception 'Granularidad no válida: % (dia | semana)', p_granularidad;
  end if;

  v_ini := (p_desde::timestamp at time zone 'Europe/Madrid');
  v_fin := ((p_hasta + 1)::timestamp at time zone 'Europe/Madrid');
  v_unidad := case p_granularidad when 'dia' then 'day' else 'week' end;

  return query
  with por_alumno as (
    select a.alumno_id,
           bool_or(a.hace_algo) as hizo,
           count(distinct date_trunc(v_unidad, (a.en at time zone 'Europe/Madrid'))) filter (where a.hace_algo) as periodos_haciendo
      from public.metricas_actividad a
     where a.en >= v_ini and a.en < v_fin
       and (p_alumnos is null or a.alumno_id = any (p_alumnos))
     group by a.alumno_id
  )
  select count(*)::int,
         (count(*) filter (where pa.hizo))::int,
         (count(*) filter (where pa.periodos_haciendo >= 2))::int,
         (select count(*)::int
            from pg_catalog.generate_series(
                   date_trunc(v_unidad, p_desde::timestamp),
                   p_hasta::timestamp,
                   case when v_unidad = 'week' then interval '1 week' else interval '1 day' end))
    from por_alumno pa;
end;
$$;


-- ===============================================================
-- panel_top — CURSOS O MÓDULOS CON MÁS LECCIONES COMPLETADAS
-- ===============================================================

create or replace function public.panel_top(
  p_desde date,
  p_hasta date,
  p_agrupar text,
  p_limite int default 5,
  p_alumnos text[] default null
)
returns table (id uuid, titulo text, curso text, lecciones_completadas int, alumnos_unicos int)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
begin
  if p_desde is null or p_hasta is null or p_desde > p_hasta or p_hasta - p_desde > 400 then
    raise exception 'Rango no válido: % – %', p_desde, p_hasta;
  end if;
  if p_agrupar not in ('curso', 'modulo') then
    raise exception 'Agrupación no válida: % (curso | modulo)', p_agrupar;
  end if;

  return query
  select case when p_agrupar = 'curso' then c.id else m.id end,
         case when p_agrupar = 'curso' then c.titulo else m.titulo end,
         c.titulo,
         count(*)::int,
         count(distinct l.alumno_id)::int
    from public.metricas_lecciones l
    join public.lecciones le on le.id = l.leccion_id
    join public.modulos m    on m.id = le.modulo_id
    join public.cursos c     on c.id = m.curso_id
   where l.completada_en >= (p_desde::timestamp at time zone 'Europe/Madrid')
     and l.completada_en <  ((p_hasta + 1)::timestamp at time zone 'Europe/Madrid')
     and (p_alumnos is null or l.alumno_id = any (p_alumnos))
   group by 1, 2, 3
   order by 4 desc, 2
   limit greatest(1, least(coalesce(p_limite, 5), 50));
end;
$$;


-- ===============================================================
-- PERMISOS
--
-- Como las tablas: solo el servidor (secret key = service_role). Supabase
-- da EXECUTE a anon y authenticated en cada función nueva de `public`, y
-- PostgREST las publica como /rpc: hay que quitarlo a mano.
-- ===============================================================

revoke execute on function public.metricas_excluido(text)                          from public, anon, authenticated;
revoke execute on function public.panel_agregado(date, date, text, text[])         from public, anon, authenticated;
revoke execute on function public.panel_serie(date, date, text, text[])            from public, anon, authenticated;
revoke execute on function public.panel_totales(date, date, text[])                from public, anon, authenticated;
revoke execute on function public.panel_embudo(date, date, text, text[])           from public, anon, authenticated;
revoke execute on function public.panel_top(date, date, text, int, text[])         from public, anon, authenticated;

grant execute on function public.metricas_excluido(text)                           to service_role;
grant execute on function public.panel_agregado(date, date, text, text[])          to service_role;
grant execute on function public.panel_serie(date, date, text, text[])             to service_role;
grant execute on function public.panel_totales(date, date, text[])                 to service_role;
grant execute on function public.panel_embudo(date, date, text, text[])            to service_role;
grant execute on function public.panel_top(date, date, text, int, text[])          to service_role;


-- ===============================================================
-- COMPROBACIÓN
--
-- 1. Nadie fuera del servidor puede ejecutar ni leer. Esperado: false en
--    todas las columnas.
-- ===============================================================

select p.proname as funcion,
       has_function_privilege('anon', p.oid, 'execute')          as anon_ejecuta,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_ejecuta
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'panel\_%' or p.proname = 'metricas_excluido')
order by 1;

select v as vista, has_table_privilege('anon', ('public.' || v)::regclass, 'select') as anon_lee
from unnest(array['metricas_lecciones', 'metricas_bloques', 'metricas_actividad']) as v;

-- 2. Semana del 12 al 18 oct 2026, en hora de Madrid. Esperado:
--      entradas_alumnos = 34, entradas = 78,
--      generaron = 20, bloques = 37 (bloques_ia = 16, bloques_banco = 21).
--    OJO: la investigación decía 34 bloques de 18 alumnos porque contó la
--    semana en UTC. En hora de Madrid la semana empieza dos horas antes
--    (domingo 11 a las 22:00 UTC) y entran tres bloques de dos alumnos
--    generados entre las 00:03 y las 00:19 del lunes 12. Las entradas a
--    clase no cambian: ninguna cae en esas horas.
select activos, hicieron_algo, entradas_alumnos, entradas, generaron, bloques, bloques_ia, bloques_banco,
       completados, lecciones_alumnos, lecciones, ejercicios_alumnos, ejercicios
from public.panel_totales('2026-10-12', '2026-10-18');

-- 3. Doce semanas: los alumnos únicos del total tienen que ser MENOS que
--    la suma de los de cada semana (quien vuelve cuenta una vez).
select
  (select sum(activos) from public.panel_agregado('2026-07-27', '2026-10-18', 'semana')) as suma_semanal,
  (select activos      from public.panel_agregado('2026-07-27', '2026-10-18', 'total'))  as unicos_del_rango;


-- ===============================================================
-- DESHACER (comentado). No toca ningún dato: solo vistas y funciones.
-- ===============================================================

-- drop function if exists public.panel_top(date, date, text, int, text[]);
-- drop function if exists public.panel_embudo(date, date, text, text[]);
-- drop function if exists public.panel_totales(date, date, text[]);
-- drop function if exists public.panel_serie(date, date, text, text[]);
-- drop function if exists public.panel_agregado(date, date, text, text[]);
-- drop type if exists public.panel_fila;
-- drop view if exists public.metricas_actividad;
-- drop view if exists public.metricas_bloques;
-- drop view if exists public.metricas_lecciones;
-- drop index if exists public.idx_progreso_lecciones_fecha, public.idx_intentos_ejercicio_fecha,
--   public.idx_progreso_bloques_fecha, public.idx_bloques_generados_fecha, public.idx_sesiones_creada;
