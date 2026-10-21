-- ===============================================================
-- EL PANEL CON TRES CIFRAS: CLASES Y ALUMNOS CON EL BOTÓN, Y «PARA TI»
--
-- TODO EN LA BASE DEL LMS. A mano, en el SQL Editor, en dos partes:
--
--   PARTE 1 — ANTES de desplegar. Añade `panel_para_ti` y la fila
--             `para_ti` de `panel_inicio_datos`. No toca nada de lo que
--             usa el panel desplegado.
--   (desplegar el código)
--   PARTE 2 — DESPUÉS de desplegar. Borra lo que solo usaba el panel
--             anterior: accesos, practicaron, bloques IA/banco y «nunca
--             accedieron». Antes del despliegue, el panel de producción se
--             quedaría sin esos datos.
--
-- Las dos cifras del botón no necesitan SQL: son el cruce de
-- `entradas_clase` con los partes de Gestión, que se hace en el servidor
-- (`medirBoton`). Las reglas de zona horaria y exclusión son las de
-- `panel-metricas.sql`.
--
-- NO SE TOCAN las tablas `accesos`, `eventos` ni la columna
-- `bloques_generados.pantalla_origen`: siguen registrando.
-- ===============================================================


-- ###############################################################
-- PARTE 1 — ANTES DE DESPLEGAR
-- ###############################################################

-- ---------------------------------------------------------------
-- panel_para_ti — QUIÉN GENERA CON IA EN «PARA TI»
--
-- Bloques escritos por la IA (`origen = 'ia'`, no el banco de reserva)
-- y pedidos desde la pantalla «Para ti» (`pantalla_origen = 'para_ti'`).
-- Sin los que genera el equipo revisando una ficha ni los excluidos.
--
-- La pantalla se registra desde la noche del 20 oct 2026: los bloques
-- de antes no tienen pantalla y no cuentan aquí. El servidor lo sabe por
-- `panel_inicio_datos` y lo pinta como «sin datos», no como cero.
--
--   p_granularidad  'semana' una fila por semana (lunes), también las vacías
--                   'total'  una fila con todo el rango
-- ---------------------------------------------------------------

create or replace function public.panel_para_ti(p_desde date, p_hasta date, p_granularidad text)
returns table (periodo date, alumnos int, bloques int)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ini timestamptz;
  v_fin timestamptz;
begin
  if p_desde is null or p_hasta is null or p_desde > p_hasta or p_hasta - p_desde > 800 then
    raise exception 'Rango no válido: % – %', p_desde, p_hasta;
  end if;
  if p_granularidad not in ('semana', 'total') then
    raise exception 'Granularidad no válida: % (semana | total)', p_granularidad;
  end if;

  v_ini := (p_desde::timestamp at time zone 'Europe/Madrid');
  v_fin := ((p_hasta + 1)::timestamp at time zone 'Europe/Madrid');

  return query
  with
  periodos as (
    select g::date as periodo
      from pg_catalog.generate_series(date_trunc('week', p_desde::timestamp), p_hasta::timestamp, interval '1 week') g
     where p_granularidad = 'semana'
    union all
    select p_desde where p_granularidad = 'total'
  ),
  blq as (
    select case when p_granularidad = 'total' then p_desde
                else date_trunc('week', (b.generado_en at time zone 'Europe/Madrid'))::date end as periodo,
           count(distinct b.alumno_id) as alumnos,
           count(*)                    as bloques
      from public.bloques_generados b
     where b.generado_en >= v_ini and b.generado_en < v_fin
       and b.origen = 'ia'
       and b.pantalla_origen = 'para_ti'
       and not b.generado_por_equipo
       and not public.metricas_excluido(b.alumno_id)
     group by 1
  )
  select pe.periodo, coalesce(blq.alumnos, 0)::int, coalesce(blq.bloques, 0)::int
    from periodos pe
    left join blq on blq.periodo = pe.periodo
   order by pe.periodo;
end;
$$;

-- Desde cuándo hay datos. `para_ti` es nueva: el primer bloque con
-- pantalla registrada. `accesos` e `instrumentacion` se quedan hasta la
-- PARTE 2 porque el panel desplegado las lee; una fila más no rompe nada.
create or replace function public.panel_inicio_datos()
returns table (fuente text, desde timestamptz)
language sql
stable
set search_path = ''
as $$
  select 'entradas_clase'::text, (select min(e.clicked_at) from public.entradas_clase e)
  union all
  select 'accesos'::text, (select min(a.iniciado_en) from public.accesos a)
  union all
  select 'para_ti'::text, (select min(b.generado_en) from public.bloques_generados b where b.pantalla_origen is not null);
$$;

revoke execute on function public.panel_para_ti(date, date, text) from public, anon, authenticated;
revoke execute on function public.panel_inicio_datos()            from public, anon, authenticated;
grant  execute on function public.panel_para_ti(date, date, text) to service_role;
grant  execute on function public.panel_inicio_datos()            to service_role;

-- ---------------------------------------------------------------
-- PARTE 1 · COMPROBAR (resultados esperados del 21/10/2026)
-- ---------------------------------------------------------------

-- 1. Del 19 al 25 oct: 2 alumnos, 2 bloques (puede subir si alguien
--    genera más hoy). Del 12 al 18 oct: 0 y 0 (aún no se registraba).
select * from public.panel_para_ti('2026-10-19', '2026-10-25', 'total');
select * from public.panel_para_ti('2026-10-12', '2026-10-18', 'total');

-- 2. Las semanas: 12 filas, de la del 3 ago a la del 19 oct; solo la
--    última con algo.
select * from public.panel_para_ti('2026-08-03', '2026-10-21', 'semana');

-- 3. Tres filas. Esperado: entradas_clase el 13 oct; accesos el 20 oct a
--    las 21:37 UTC; para_ti el 21 oct a las 08:52 UTC.
select * from public.panel_inicio_datos();

-- 4. Nadie de fuera la ejecuta. Esperado: false y false.
select has_function_privilege('anon', 'public.panel_para_ti(date, date, text)', 'execute')          as anon_ejecuta,
       has_function_privilege('authenticated', 'public.panel_para_ti(date, date, text)', 'execute') as authenticated_ejecuta;


-- ###############################################################
-- PARTE 2 — DESPUÉS DE DESPLEGAR
--
-- Lo que solo usaban accesos, practicaron, bloques IA/banco y «nunca
-- accedieron». Las TABLAS no se tocan.
-- ###############################################################

drop function if exists public.panel_cifras(date, date, text);
drop type if exists public.panel_cifras;
drop function if exists public.panel_nunca_accedieron(text[]);
drop view if exists public.metricas_practica;
drop view if exists public.metricas_accesos;

-- Solo las dos fuentes que se pintan.
create or replace function public.panel_inicio_datos()
returns table (fuente text, desde timestamptz)
language sql
stable
set search_path = ''
as $$
  select 'entradas_clase'::text, (select min(e.clicked_at) from public.entradas_clase e)
  union all
  select 'para_ti'::text, (select min(b.generado_en) from public.bloques_generados b where b.pantalla_origen is not null);
$$;

-- ---------------------------------------------------------------
-- PARTE 2 · COMPROBAR
-- ---------------------------------------------------------------

-- 1. Lo que queda del panel. Esperado, exactamente: metricas_excluido,
--    metricas_quitar_excluidos, panel_inicio_datos, panel_para_ti.
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'panel\_%' or p.proname like 'metricas\_%')
order by 1;

-- 2. Las vistas. Esperado: solo metricas_excluidos.
select table_name from information_schema.views
where table_schema = 'public' and table_name like 'metricas\_%'
order by 1;

-- 3. Dos filas: entradas_clase y para_ti.
select * from public.panel_inicio_datos();

-- 4. Las tablas de la instrumentación siguen registrando.
select (select count(*) from public.accesos) as accesos, (select max(iniciado_en) from public.accesos) as ultimo_acceso,
       (select count(*) from public.bloques_generados where pantalla_origen is not null) as bloques_con_pantalla;


-- ===============================================================
-- DESHACER (comentado)
--   PARTE 1: drop function if exists public.panel_para_ti(date, date, text);
--            y `panel_inicio_datos` como en la PARTE C de panel-metricas.sql.
--   PARTE 2: lo borrado está en `panel-metricas.sql` (PARTE B).
-- ===============================================================
