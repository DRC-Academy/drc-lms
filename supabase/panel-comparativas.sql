-- ===============================================================
-- EL PANEL: SEMANA A SEMANA Y MES A MES
--
-- TODO EN LA BASE DEL LMS. La base de DRC GESTIÓN no se toca: las dos
-- cifras del botón son el cruce de `vista_partes_clase` (que ya trae
-- `fecha` y `hora`) con `entradas_clase`, y ese cruce se hace en el
-- servidor (`medirBoton`), también por meses y por tramos.
--
-- A mano, en el SQL Editor del LMS, en dos partes:
--
--   PARTE 1 — ANTES de desplegar. Añade `panel_ia` y la fila `ia` de
--             `panel_inicio_datos`. No cambia nada de lo que usa el panel
--             desplegado: `panel_para_ti` se queda como está.
--   (desplegar el código)
--   PARTE 2 — DESPUÉS de desplegar. Borra `panel_para_ti`, que el panel
--             nuevo ya no lee. Antes del despliegue, el panel de
--             producción se quedaría sin la tercera cifra.
--
-- POR QUÉ UNA FUNCIÓN NUEVA Y NO OTRA GRANULARIDAD EN `panel_para_ti`:
--   1. Los tramos «mismo tramo» acaban a una HORA («hasta ahora», y la
--      misma hora de la semana o el mes anterior): `panel_para_ti` solo
--      acepta días enteros.
--   2. Da las dos lecturas de la tercera cifra, para elegir sin otro SQL:
--      todos los bloques escritos por la IA, y solo los pedidos desde
--      «Para ti».
--   3. Añade los meses naturales, con los alumnos únicos de cada mes
--      contados aquí (`count(distinct)` por mes), nunca sumando semanas.
--
-- LAS REGLAS, las de `panel-metricas.sql`:
--   · Los extremos llegan como hora de pared de Madrid
--     (`timestamp` sin zona, "2026-10-22T23:00"), `desde` incluido y
--     `hasta` excluido, y se pasan a instante aquí, con la regla de
--     cada instante: el cambio de hora del 25 oct no mueve nada. Así
--     «la misma hora de la semana anterior» es la misma hora en el reloj
--     de Madrid, también en la semana del cambio.
--   · Cada bloque se agrupa por su hora de Madrid. Semanas de lunes a
--     domingo (`date_trunc('week')` es ISO); meses naturales.
--   · Exclusión: `metricas_excluido()` y sin los bloques que genera el
--     equipo revisando una ficha. Bloque de IA = `origen = 'ia'`; los del
--     banco de reserva (`'banco'`) no cuentan.
--
-- NO SE TOCA ninguna tabla.
-- ===============================================================


-- ###############################################################
-- PARTE 1 — ANTES DE DESPLEGAR (base del LMS)
-- ###############################################################

-- ---------------------------------------------------------------
-- 1A · panel_ia — QUIÉN GENERA PRÁCTICA CON IA
--
--   p_desde, p_hasta  hora de pared de Madrid; [desde, hasta)
--   p_granularidad    'total'  una fila con todo el tramo (las cifras y
--                              los «mismo tramo»)
--                     'semana' una fila por semana (lunes), también las vacías
--                     'mes'    una fila por mes (día 1), también los vacíos
--
--   alumnos_ia / bloques_ia             todos los bloques escritos por la IA
--   alumnos_para_ti / bloques_para_ti   los de esos pedidos desde «Para ti»
--
-- `periodo` es el lunes o el día 1 del periodo (en 'total', el día de
-- `p_desde`). La primera y la última fila pueden ir recortadas a los
-- extremos: lo que cuentan es solo lo que cae dentro de [desde, hasta).
--
-- Lo que no se registraba no sale como «sin datos» aquí, sino a cero: la
-- pantalla se apunta desde el 21 oct 2026. El servidor lo sabe por
-- `panel_inicio_datos` y lo pinta como «sin datos», no como cero.
-- ---------------------------------------------------------------

create or replace function public.panel_ia(p_desde timestamp, p_hasta timestamp, p_granularidad text)
returns table (periodo date, alumnos_ia int, bloques_ia int, alumnos_para_ti int, bloques_para_ti int)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ini    timestamptz;
  v_fin    timestamptz;
  v_unidad text;
begin
  if p_desde is null or p_hasta is null or p_desde >= p_hasta then
    raise exception 'Tramo no válido: % – %', p_desde, p_hasta;
  end if;
  -- Seis meses o 12 meses de rango con su comparación, con margen.
  if p_hasta - p_desde > interval '800 days' then
    raise exception 'Tramo demasiado largo: % (máximo 800 días)', p_hasta - p_desde;
  end if;
  if p_granularidad not in ('total', 'semana', 'mes') then
    raise exception 'Granularidad no válida: % (total | semana | mes)', p_granularidad;
  end if;

  v_unidad := case p_granularidad when 'semana' then 'week' when 'mes' then 'month' end;
  v_ini := (p_desde at time zone 'Europe/Madrid');
  v_fin := (p_hasta at time zone 'Europe/Madrid');

  return query
  with
  periodos as (
    select g::date as periodo
      from pg_catalog.generate_series(pg_catalog.date_trunc(v_unidad, p_desde), p_hasta, ('1 ' || v_unidad)::interval) g
     where p_granularidad <> 'total' and g < p_hasta
    union all
    select p_desde::date where p_granularidad = 'total'
  ),
  blq as (
    select case when p_granularidad = 'total' then p_desde::date
                else pg_catalog.date_trunc(v_unidad, (b.generado_en at time zone 'Europe/Madrid'))::date end as periodo,
           count(distinct b.alumno_id)                                              as alumnos_ia,
           count(*)                                                                 as bloques_ia,
           count(distinct b.alumno_id) filter (where b.pantalla_origen = 'para_ti') as alumnos_para_ti,
           count(*)                    filter (where b.pantalla_origen = 'para_ti') as bloques_para_ti
      from public.bloques_generados b
     where b.generado_en >= v_ini and b.generado_en < v_fin
       and b.origen = 'ia'
       and not b.generado_por_equipo
       and not public.metricas_excluido(b.alumno_id)
     group by 1
  )
  select pe.periodo,
         coalesce(blq.alumnos_ia, 0)::int,
         coalesce(blq.bloques_ia, 0)::int,
         coalesce(blq.alumnos_para_ti, 0)::int,
         coalesce(blq.bloques_para_ti, 0)::int
    from periodos pe
    left join blq on blq.periodo = pe.periodo
   order by pe.periodo;
end;
$$;

-- ---------------------------------------------------------------
-- 1B · DESDE CUÁNDO HAY DATOS
--
-- `ia` es nueva: el primer bloque de la tabla. `origen` es obligatorio
-- desde que existe `bloques_generados` (`lms-esquema.sql`), así que se
-- sabe quién escribió cada bloque desde el primero. `para_ti` se queda:
-- el panel desplegado la lee, y el nuevo también (la segunda lectura).
-- ---------------------------------------------------------------

create or replace function public.panel_inicio_datos()
returns table (fuente text, desde timestamptz)
language sql
stable
set search_path = ''
as $$
  select 'entradas_clase'::text, (select min(e.clicked_at) from public.entradas_clase e)
  union all
  select 'para_ti'::text, (select min(b.generado_en) from public.bloques_generados b where b.pantalla_origen is not null)
  union all
  select 'ia'::text, (select min(b.generado_en) from public.bloques_generados b);
$$;

revoke execute on function public.panel_ia(timestamp, timestamp, text) from public, anon, authenticated;
revoke execute on function public.panel_inicio_datos()                 from public, anon, authenticated;
grant  execute on function public.panel_ia(timestamp, timestamp, text) to service_role;
grant  execute on function public.panel_inicio_datos()                 to service_role;

-- ---------------------------------------------------------------
-- PARTE 1 · COMPROBAR
--
-- Resultados esperados calculados el 22/10/2026 a las 23:00 de Madrid
-- con las definiciones actuales. Si alguien genera bloques entre ese
-- momento y la ejecución, los números de la semana y el mes en curso
-- pueden SUBIR (nunca bajar); los de periodos cerrados no se mueven.
-- ---------------------------------------------------------------

-- 1. Tres filas. Esperado: entradas_clase 2026-10-13 09:00 UTC;
--    para_ti 2026-10-21 08:52 UTC; ia 2026-08-15 01:24 UTC (el primer
--    bloque de la tabla, que ya es de IA).
select * from public.panel_inicio_datos();

-- 2. La misma cuenta que `panel_para_ti` para la semana del 19 oct:
--    las dos columnas «para_ti» tienen que salir iguales que la consulta
--    vieja (hoy, 7 alumnos y 8 bloques).
select alumnos_para_ti, bloques_para_ti from public.panel_ia('2026-10-19 00:00', '2026-10-26 00:00', 'total');
select alumnos, bloques                 from public.panel_para_ti('2026-10-19', '2026-10-25', 'total');

-- 3. Semana en curso hasta ahora contra el mismo tramo de la anterior
--    (cambia la hora por la de la ejecución, la misma en las dos).
--    Esperado (22/10, 23:00), en el orden de las columnas
--    alumnos_ia, bloques_ia, alumnos_para_ti, bloques_para_ti:
--      semana en curso   10, 13, 7, 8
--      semana anterior   11, 11, 0, 0   («Para ti» no se apuntaba aún)
select 'semana en curso' as tramo, * from public.panel_ia('2026-10-19 00:00', '2026-10-22 23:00', 'total')
union all
select 'semana anterior',          * from public.panel_ia('2026-10-12 00:00', '2026-10-15 23:00', 'total');

-- 4. Mes en curso hasta ahora contra el mismo tramo del anterior.
--    Esperado (22/10, 23:00):
--      mes en curso      31, 53, 7, 8
--      mes anterior      15, 21, 0, 0
select 'mes en curso' as tramo, * from public.panel_ia('2026-10-01 00:00', '2026-10-22 23:00', 'total')
union all
select 'mes anterior',          * from public.panel_ia('2026-09-01 00:00', '2026-09-22 23:00', 'total');

-- 5. Los meses: 6 filas, de mayo a octubre, también los vacíos (mayo,
--    junio y julio a cero: no hay bloques antes de agosto). Esperado:
--      2026-05-01  0,  0, 0, 0       2026-08-01  4,  6, 0, 0
--      2026-06-01  0,  0, 0, 0       2026-09-01 21, 36, 0, 0
--      2026-07-01  0,  0, 0, 0       2026-10-01 31, 53, 7, 8 (sube con el día)
select * from public.panel_ia('2026-05-01 00:00', '2026-10-23 00:00', 'mes');

-- 6. Las semanas: 12 filas, de la del 3 ago a la del 19 oct; las dos
--    primeras a cero (el primer bloque es del 15 ago) y la última con
--    10 / 13 / 7 / 8.
select * from public.panel_ia('2026-08-03 00:00', '2026-10-23 00:00', 'semana');

-- 7. Los alumnos únicos de un mes NO son la suma de sus semanas.
--    Esperado: del_mes 21, fila_mes 21, suma_semanas 29 (quien generó
--    en varias semanas de septiembre cuenta una vez en el mes).
select (select alumnos_ia from public.panel_ia('2026-09-01 00:00', '2026-10-01 00:00', 'total')) as del_mes,
       (select alumnos_ia from public.panel_ia('2026-09-01 00:00', '2026-10-01 00:00', 'mes'))   as fila_mes,
       (select sum(alumnos_ia) from public.panel_ia('2026-09-01 00:00', '2026-10-01 00:00', 'semana')) as suma_semanas;

-- 8. El cambio de hora no pierde ni duplica bloques: el domingo 25 oct
--    tiene 25 horas. Esperado: las dos cifras iguales.
select (select bloques_ia from public.panel_ia('2026-10-25 00:00', '2026-10-26 00:00', 'total')) as dia_25,
       (select count(*) from public.bloques_generados b
         where (b.generado_en at time zone 'Europe/Madrid')::date = date '2026-10-25'
           and b.origen = 'ia' and not b.generado_por_equipo and not public.metricas_excluido(b.alumno_id)) as dia_25_a_mano;

-- 9. Los errores se dicen. Esperado: tres errores, uno por línea
--    (ejecútalas sueltas).
-- select * from public.panel_ia('2026-10-22 00:00', '2026-10-22 00:00', 'total');  -- Tramo no válido
-- select * from public.panel_ia('2024-01-01 00:00', '2026-10-22 00:00', 'total');  -- Tramo demasiado largo
-- select * from public.panel_ia('2026-10-01 00:00', '2026-10-22 00:00', 'dia');    -- Granularidad no válida

-- 10. Nadie de fuera la ejecuta. Esperado: false y false.
select has_function_privilege('anon', 'public.panel_ia(timestamp, timestamp, text)', 'execute')          as anon_ejecuta,
       has_function_privilege('authenticated', 'public.panel_ia(timestamp, timestamp, text)', 'execute') as authenticated_ejecuta;


-- ###############################################################
-- PARTE 2 — DESPUÉS DE DESPLEGAR (base del LMS)
-- ###############################################################

drop function if exists public.panel_para_ti(date, date, text);

-- ---------------------------------------------------------------
-- PARTE 2 · COMPROBAR
-- ---------------------------------------------------------------

-- 1. Lo que queda del panel. Esperado, exactamente: metricas_excluido,
--    metricas_quitar_excluidos, panel_ia, panel_inicio_datos.
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'panel\_%' or p.proname like 'metricas\_%')
order by 1;

-- 2. Sigue respondiendo. Esperado: una fila.
select * from public.panel_ia('2026-10-19 00:00', '2026-10-26 00:00', 'total');


-- ===============================================================
-- DESHACER (comentado)
--   PARTE 1: drop function if exists public.panel_ia(timestamp, timestamp, text);
--            y `panel_inicio_datos` como en la PARTE 1 de panel-para-ti.sql
--            sin la fila `accesos` (la PARTE 2 de ese archivo).
--   PARTE 2: `panel_para_ti` está en la PARTE 1 de panel-para-ti.sql.
-- ===============================================================
