-- ===============================================================
-- EL PANEL DEL EQUIPO: ENTRAR A CLASE, ACCESOS, NUNCA ACCEDIERON
--
-- ⚠ EJECUTADO EL 21/10/2026. Parte de la PARTE B (panel_cifras,
-- panel_nunca_accedieron, metricas_practica, metricas_accesos) la sustituye
-- y la borra `panel-para-ti.sql`: el panel se quedó en tres cifras. Lo de
-- Gestión (PARTE A) y las exclusiones siguen valiendo.
--
-- UN ARCHIVO, DOS BASES, TRES PARTES. A mano, en el SQL Editor, en este
-- orden y cada parte en SU base:
--
--   PARTE A — base de DRC GESTIÓN. `profesor_id` en vista_perfil_alumno,
--             para avisar de alumnos del profesor de prueba (t1) que no
--             estén excluidos.
--   PARTE B — base del LMS. Las exclusiones nuevas y lo que lee el panel
--             nuevo. No toca nada de lo que usa el panel desplegado: se
--             puede ejecutar antes de desplegar.
--   (desplegar el código)
--   PARTE C — base del LMS. Borra lo que solo usaba el panel anterior
--             (embudo, top de cursos, primer bloque, eventos, la serie
--             vieja). SOLO DESPUÉS del despliegue: antes, el panel
--             desplegado se quedaría sin datos.
--
-- Cada parte acaba con sus comprobaciones y el resultado esperado. Si
-- algo no cuadra, PARA antes de la parte siguiente.
--
-- NO SE TOCAN las tablas `accesos`, `eventos` ni la columna
-- `bloques_generados.pantalla_origen`: siguen registrando.
--
-- LAS REGLAS, UNA VEZ:
--   · Zona horaria Europe/Madrid, en la base. Un rango `desde`–`hasta`
--     son días naturales de Madrid, los dos incluidos: cada fila se pasa
--     a hora de Madrid ANTES de agrupar, y los extremos son la medianoche
--     de Madrid como instante. El cambio de hora (25 oct 2026) no mueve
--     nada: la conversión usa la regla de cada instante.
--   · Semanas de lunes a domingo (`date_trunc('week')` es ISO).
--   · Exclusión: todo pasa por `metricas_excluido()`
--     (`lms-instrumentacion.sql`). Las listas que vienen de Gestión pasan
--     por `metricas_quitar_excluidos`.
--   · Los alumnos ÚNICOS de un rango se cuentan aquí, con
--     `count(distinct)`, nunca sumando semanas ni en el servidor. Lo único
--     que se cuenta en el servidor es el cruce de entradas a clase con los
--     partes de Gestión, que viven en bases distintas (`medirBoton`).
-- ===============================================================


-- ###############################################################
-- PARTE A — BASE DE DRC GESTIÓN
--
-- Añade `profesor_id` (el `teacher_id` de la assignment) al final de
-- `vista_perfil_alumno`. Nada más: ni `teachers.display_name` ni
-- `profesor_visible`, que son de `gestion-nombre-visible-profesor.sql`
-- (sin ejecutar). Ese archivo sigue sirviendo después de este: deja
-- `profesor_id` en la misma columna (26) y añade la 27.
--
-- La vista es la de `gestion-vista-perfil-estado.sql` (07/10/2026), con
-- la columna nueva al final. `create or replace view` solo deja AÑADIR
-- al final; los permisos se conservan.
-- ###############################################################

-- A0 · ANTES: que la vista sea la que espero. Esperado: 25 columnas, la
--      última `estado_asignacion`. Si no, PARA y avísame. Apunta el
--      recuento de perfiles: A2 lo repite.
select count(*) as columnas, max(column_name) filter (where ordinal_position = 25) as columna_25
from information_schema.columns
where table_schema = 'public' and table_name = 'vista_perfil_alumno';

select count(*) as perfiles from public.vista_perfil_alumno;

-- A1 · LA VISTA
create or replace view public.vista_perfil_alumno as
 SELECT base.alumno_id,
    base.email,
    base.nombre,
    base.nivel,
    base.plan,
    base.producto,
    base.objetivo_setter,
    base.profesor,
    base.ocupacion,
    base.objetivo_perfil,
    base.puntos_fuertes,
    base.puntos_debiles,
    base.estilo_aprendizaje,
    base.foco_recomendado,
    base.respuestas_formulario,
    base.tiene_perfil,
    base.fecha_inicio,
    base.horas_semanales,
    base.plan_contratado,
    base.nivel_profesor,
    base.nivel_ficha,
    base.nivel_prueba,
    cla.meet_link,
    cla.slots,
    base.estado_asignacion,
    base.profesor_id
   FROM ( SELECT base_1.alumno_id,
            base_1.email,
            base_1.nombre,
            base_1.nivel,
            base_1.plan,
            base_1.producto,
            base_1.objetivo_setter,
            base_1.profesor,
            base_1.ocupacion,
            base_1.objetivo_perfil,
            base_1.puntos_fuertes,
            base_1.puntos_debiles,
            base_1.estilo_aprendizaje,
            base_1.foco_recomendado,
            base_1.respuestas_formulario,
            base_1.tiene_perfil,
            base_1.fecha_inicio,
            base_1.estado_asignacion,
            base_1.profesor_id,
            asg.horas AS horas_semanales,
            asg.plan AS plan_contratado,
            fic.teacher_confirmed_level AS nivel_profesor,
            fic.current_level AS nivel_ficha,
            fic.level_test_cefr AS nivel_prueba
           FROM ( SELECT s.id AS alumno_id,
                    lower(TRIM(BOTH FROM s.email)) AS email,
                    s.name AS nombre,
                    s.level AS nivel,
                    s.plan,
                    s.product_name AS producto,
                    a.objetivo AS objetivo_setter,
                    a.teacher_name AS profesor,
                    a.status AS estado_asignacion,
                    a.teacher_id AS profesor_id,
                    p.occupation AS ocupacion,
                    p.personal_objective AS objetivo_perfil,
                    p.strong_points AS puntos_fuertes,
                    p.weak_points AS puntos_debiles,
                    p.learning_style AS estilo_aprendizaje,
                    p.recommended_focus AS foco_recomendado,
                    p.form_responses AS respuestas_formulario,
                    p.form_completed_at IS NOT NULL AS tiene_perfil,
                    COALESCE(
                      ( SELECT min(a2.start_date) AS min
                           FROM assignments a2
                          WHERE a2.student_id = s.id AND a2.status = 'active'::text AND a2.start_date IS NOT NULL),
                      ( SELECT min(a2.start_date) AS min
                           FROM assignments a2
                          WHERE a2.student_id = s.id AND a2.start_date IS NOT NULL)
                    ) AS fecha_inicio
                   FROM students s
                     JOIN assignments a ON a.student_id = s.id
                       AND ( a.status = 'active'::text
                             OR NOT EXISTS ( SELECT 1
                                   FROM assignments a3
                                  WHERE a3.student_id = s.id AND a3.status = 'active'::text) )
                     LEFT JOIN student_profiles p ON p.student_id = s.id) base_1
             LEFT JOIN LATERAL ( SELECT a.plan,
                        CASE
                            WHEN jsonb_typeof(a.slots) = 'array'::text AND jsonb_array_length(a.slots) > 0 THEN jsonb_array_length(a.slots)
                            WHEN COALESCE(a.weekly_hours, 0) > 0 THEN a.weekly_hours
                            ELSE NULL::integer
                        END AS horas
                   FROM assignments a
                  WHERE a.student_id = base_1.alumno_id
                  ORDER BY (a.status = 'active'::text) DESC, (GREATEST(
                        CASE
                            WHEN jsonb_typeof(a.slots) = 'array'::text THEN jsonb_array_length(a.slots)
                            ELSE 0
                        END, COALESCE(a.weekly_hours, 0))) DESC, a.created_at DESC
                 LIMIT 1) asg ON true
             LEFT JOIN LATERAL ( SELECT sp.teacher_confirmed_level,
                    sp.current_level,
                    sp.level_test_cefr
                   FROM student_profiles sp
                  WHERE sp.student_id = base_1.alumno_id
                 LIMIT 1) fic ON true) base
     LEFT JOIN LATERAL ( SELECT NULLIF(btrim(COALESCE(a.meet_link, ''::text)), ''::text) AS meet_link,
                CASE
                    WHEN jsonb_typeof(a.slots) = 'array'::text THEN a.slots
                    ELSE NULL::jsonb
                END AS slots
           FROM assignments a
          WHERE a.student_id = base.alumno_id
          ORDER BY (a.status = 'active'::text) DESC, (GREATEST(
                CASE
                    WHEN jsonb_typeof(a.slots) = 'array'::text THEN jsonb_array_length(a.slots)
                    ELSE 0
                END, COALESCE(a.weekly_hours, 0))) DESC, a.created_at DESC
         LIMIT 1) cla ON true;

-- A2 · COMPROBAR
-- 1. 26 columnas, la 26 `profesor_id`; y el mismo recuento de perfiles que en A0.
select count(*) as columnas, max(column_name) filter (where ordinal_position = 26) as columna_26
from information_schema.columns
where table_schema = 'public' and table_name = 'vista_perfil_alumno';

select count(*) as perfiles from public.vista_perfil_alumno;

-- 2. Cada perfil con profesor tiene su id. Esperado: 0 filas.
select alumno_id, nombre, profesor
from public.vista_perfil_alumno
where btrim(coalesce(profesor, '')) <> '' and profesor_id is null;

-- 3. Los alumnos del profesor de prueba. Esperado (21/10/2026): 13 filas,
--    las 13 de la lista de exclusiones de la PARTE B:
--      4a1ca7e0-55c9-4471-b8ac-f7283e05b547  Facu Meeting
--      e7cc5da1-d446-4c17-9238-79b868d9bb6f  Ruben Perez
--      s_1783709090814  Facu IA             s_1784840663431  Facu Test
--      s_1783723972427  Facundo IA          s_1784924446226  B1 Formulario
--      s_1783978502842  FACU FORM           s_1785241971018  Foto Diego
--      s_1784076440609  Diego Loom          s_1785879819493  Facu Pezzucchi
--      s_1784226968578  Facu Emails         s_1791860060190  Facundo Test
--      s_1784255748665  Prueba prueba
--    Si sale otra, es una cuenta de prueba nueva: dímelo antes de la PARTE B.
select alumno_id, nombre, estado_asignacion
from public.vista_perfil_alumno
where profesor_id = 't1'
order by alumno_id;


-- ###############################################################
-- PARTE B — BASE DEL LMS (antes o después de desplegar)
-- ###############################################################

-- ---------------------------------------------------------------
-- B1 · LAS EXCLUSIONES
--
-- Por `alumno_id`, nunca por nombre. Ya estaba la cuenta de pruebas de
-- Facundo (`s_1785879819493`); estas son las 12 cuentas del equipo que
-- cuelgan del profesor de prueba de Gestión (t1). `motivo` es texto
-- libre y `creado_en` la fecha de alta: la página /exclusiones del panel
-- las enseña las dos.
-- ---------------------------------------------------------------

insert into public.metricas_exclusiones (alumno_id, motivo) values
  ('4a1ca7e0-55c9-4471-b8ac-f7283e05b547', 'Cuenta de prueba del equipo, profesor t1'),
  ('s_1783709090814',                      'Cuenta de prueba del equipo, profesor t1'),
  ('s_1783723972427',                      'Cuenta de prueba del equipo, profesor t1'),
  ('s_1784255748665',                      'Cuenta de prueba del equipo, profesor t1'),
  ('s_1784840663431',                      'Cuenta de prueba del equipo, profesor t1'),
  ('s_1791860060190',                      'Cuenta de prueba del equipo, profesor t1'),
  ('s_1783978502842',                      'Cuenta de prueba del equipo, profesor t1 (sin plan activo)'),
  ('s_1784226968578',                      'Cuenta de prueba del equipo, profesor t1 (sin plan activo)'),
  ('s_1784076440609',                      'Cuenta de prueba del equipo, profesor t1 (sin producto, Meet «aaa»)'),
  ('s_1785241971018',                      'Cuenta de prueba del equipo, profesor t1'),
  ('e7cc5da1-d446-4c17-9238-79b868d9bb6f', 'Cuenta de prueba del equipo, profesor t1'),
  ('s_1784924446226',                      'Cuenta de prueba del equipo, profesor t1')
on conflict (alumno_id) do nothing;

-- La lista entera, con la fecha de alta, para la página /exclusiones.
-- `creado_en` va AL FINAL: `create or replace view` solo deja añadir.
create or replace view public.metricas_excluidos
with (security_invoker = on) as
select e.alumno_id, e.motivo, e.creado_en from public.metricas_exclusiones e
union
select d.alumno_id, 'Cuenta de demostración', d.creada_en from public.cuentas_demo d;

revoke all on public.metricas_excluidos from anon, authenticated;


-- ---------------------------------------------------------------
-- B2 · LAS VISTAS (con la exclusión ya aplicada)
-- ---------------------------------------------------------------

-- PRACTICAR = lección completada, intento de ejercicio de lección o
-- bloque generado. Solo lo hecho en la plataforma (`origen = 'lms'`: el
-- historial importado de LearnDash no es uso) y sin los bloques que
-- genera el equipo revisando una ficha. Terminar un bloque NO está: no
-- es parte de la definición, y en las 4 semanas revisadas nadie practicó solo
-- así. Entrar a clase tampoco.
--
-- `origen` solo lo tienen los bloques: 'ia' o 'banco' (servido del banco
-- de reserva porque la IA no respondió a tiempo).
create or replace view public.metricas_practica
with (security_invoker = on) as
select l.alumno_id, l.completada_en as en, 'leccion'::text as tipo, null::text as origen
  from public.progreso_lecciones l
 where l.origen = 'lms' and not public.metricas_excluido(l.alumno_id)
union all
select i.alumno_id, i.respondido_en, 'ejercicio', null
  from public.intentos_ejercicio i
 where i.origen = 'lms' and not public.metricas_excluido(i.alumno_id)
union all
select b.alumno_id, b.generado_en, 'bloque', b.origen
  from public.bloques_generados b
 where not b.generado_por_equipo and not public.metricas_excluido(b.alumno_id);

comment on view public.metricas_practica is
  'Práctica de los alumnos, sin excluidos: lección (lms), intento de ejercicio de lección (lms) o bloque generado (no por el equipo).';

-- Una fila por visita (`accesos`, desde el 20 oct 2026).
create or replace view public.metricas_accesos
with (security_invoker = on) as
select a.alumno_id, a.iniciado_en as en
  from public.accesos a
 where not public.metricas_excluido(a.alumno_id);

revoke all on public.metricas_practica, public.metricas_accesos from anon, authenticated;


-- ---------------------------------------------------------------
-- B3 · panel_cifras — ACCESOS, PRACTICARON Y BLOQUES
--
--   p_granularidad  'semana' una fila por semana (el gráfico)
--                   'total'  una fila con todo el rango (las cifras)
--
-- Una fila por semana, también las vacías (con ceros). `periodo` es el
-- lunes; `periodo_desde`/`periodo_hasta` dicen qué días de esa semana
-- entran en el rango (la primera y la última pueden ir recortadas).
-- Lo que no se registraba aún (accesos antes del 20 oct) sale a cero
-- aquí: el servidor sabe desde cuándo hay datos (`panel_inicio_datos`)
-- y lo pinta como «sin datos», no como cero.
-- ---------------------------------------------------------------

do $tipo$
begin
  if not exists (select 1 from pg_type where typname = 'panel_cifras' and typnamespace = 'public'::regnamespace) then
    create type public.panel_cifras as (
      periodo          date,
      periodo_desde    date,
      periodo_hasta    date,
      accesos          int,   -- visitas totales
      accesos_alumnos  int,   -- alumnos únicos con al menos una visita
      practicaron      int,   -- alumnos únicos con lección, ejercicio o bloque
      bloques          int,
      bloques_ia       int,
      bloques_banco    int
    );
  end if;
end
$tipo$;

create or replace function public.panel_cifras(p_desde date, p_hasta date, p_granularidad text)
returns setof public.panel_cifras
language plpgsql
stable
set search_path = ''
as $$
declare
  v_ini timestamptz;
  v_fin timestamptz;
begin
  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    raise exception 'Rango no válido: % – %', p_desde, p_hasta;
  end if;
  -- 12 meses de rango, su comparación y las 12 semanas del gráfico, con margen.
  if p_hasta - p_desde > 800 then
    raise exception 'Rango demasiado largo: % días (máximo 800)', p_hasta - p_desde;
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
  acc as (
    select case when p_granularidad = 'total' then p_desde
                else date_trunc('week', (a.en at time zone 'Europe/Madrid'))::date end as periodo,
           count(*)                    as accesos,
           count(distinct a.alumno_id) as accesos_alumnos
      from public.metricas_accesos a
     where a.en >= v_ini and a.en < v_fin
     group by 1
  ),
  pra as (
    select case when p_granularidad = 'total' then p_desde
                else date_trunc('week', (p.en at time zone 'Europe/Madrid'))::date end as periodo,
           count(distinct p.alumno_id)                                  as practicaron,
           count(*) filter (where p.tipo = 'bloque')                    as bloques,
           count(*) filter (where p.tipo = 'bloque' and p.origen = 'ia')    as bloques_ia,
           count(*) filter (where p.tipo = 'bloque' and p.origen = 'banco') as bloques_banco
      from public.metricas_practica p
     where p.en >= v_ini and p.en < v_fin
     group by 1
  )
  select
    pe.periodo,
    greatest(pe.periodo, p_desde),
    least(case when p_granularidad = 'semana' then pe.periodo + 6 else p_hasta end, p_hasta),
    coalesce(acc.accesos, 0)::int,
    coalesce(acc.accesos_alumnos, 0)::int,
    coalesce(pra.practicaron, 0)::int,
    coalesce(pra.bloques, 0)::int,
    coalesce(pra.bloques_ia, 0)::int,
    coalesce(pra.bloques_banco, 0)::int
  from periodos pe
  left join acc on acc.periodo = pe.periodo
  left join pra on pra.periodo = pe.periodo
  order by pe.periodo;
end;
$$;


-- ---------------------------------------------------------------
-- B4 · panel_nunca_accedieron
--
-- De los alumnos que se pasan (los que tienen plan activo HOY en
-- Gestión), los que no cuentan como excluidos y no tienen NINGÚN inicio
-- de sesión ni NINGÚN acceso, nunca. No depende de fechas. Las sesiones
-- no se borran (se revocan), y existen desde el primer día de la
-- plataforma (3 jul 2026, el mismo que la primera lección).
-- ---------------------------------------------------------------

-- Devuelve un array, como `metricas_quitar_excluidos`: un solo valor, al
-- que no le afecta el tope de 1.000 filas de PostgREST.
create or replace function public.panel_nunca_accedieron(p_alumnos text[])
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(distinct a order by a), '{}')
    from unnest(p_alumnos) as a
   where a is not null
     and not public.metricas_excluido(a)
     and not exists (select 1 from public.sesiones s where s.alumno_id = a and s.rol = 'alumno')
     and not exists (select 1 from public.accesos x where x.alumno_id = a);
$$;


-- ---------------------------------------------------------------
-- B5 · DESDE CUÁNDO HAY DATOS
--
-- `accesos` es nueva. `instrumentacion` se queda hasta la PARTE C porque
-- la lee el panel desplegado; con una fila más no se rompe nada.
-- ---------------------------------------------------------------

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
  select 'instrumentacion'::text, least(
    (select min(a.iniciado_en) from public.accesos a),
    (select min(e.creado_en)   from public.eventos e),
    (select min(b.generado_en) from public.bloques_generados b where b.pantalla_origen is not null)
  );
$$;


-- ---------------------------------------------------------------
-- B6 · PERMISOS: solo el servidor (service_role). Supabase da EXECUTE a
-- anon y authenticated en cada función nueva de `public`.
-- ---------------------------------------------------------------

revoke execute on function public.panel_cifras(date, date, text)        from public, anon, authenticated;
revoke execute on function public.panel_nunca_accedieron(text[])        from public, anon, authenticated;
revoke execute on function public.panel_inicio_datos()                  from public, anon, authenticated;
grant  execute on function public.panel_cifras(date, date, text)        to service_role;
grant  execute on function public.panel_nunca_accedieron(text[])        to service_role;
grant  execute on function public.panel_inicio_datos()                  to service_role;


-- ---------------------------------------------------------------
-- B7 · COMPROBAR (resultados esperados del 21/10/2026)
-- ---------------------------------------------------------------

-- 1. 13 exclusiones a mano (las 12 + la de Facundo) y 14 en la lista
--    entera (+ la demo).
select (select count(*) from public.metricas_exclusiones) as a_mano,
       (select count(*) from public.metricas_excluidos)   as en_la_lista;

-- 2. Ninguna de las 13 cuenta. Esperado: {} (vacío).
select public.metricas_quitar_excluidos(array[
  '4a1ca7e0-55c9-4471-b8ac-f7283e05b547', 's_1783709090814', 's_1783723972427', 's_1784255748665',
  's_1784840663431', 's_1791860060190', 's_1783978502842', 's_1784226968578', 's_1784076440609',
  's_1785241971018', 'e7cc5da1-d446-4c17-9238-79b868d9bb6f', 's_1784924446226', 's_1785879819493'
]) as quedan;

--    Y tampoco salen en «nunca accedieron» (casi todas no han entrado
--    nunca). Esperado: {} (vacío).
select public.panel_nunca_accedieron(array[
  '4a1ca7e0-55c9-4471-b8ac-f7283e05b547', 's_1783709090814', 's_1783723972427', 's_1784255748665',
  's_1784840663431', 's_1784076440609', 's_1785241971018', 'e7cc5da1-d446-4c17-9238-79b868d9bb6f'
]) as nunca_entre_las_de_prueba;

-- 3. Semana del 12 al 18 oct. Esperado:
--      accesos 0, accesos_alumnos 0 (no se registraban),
--      practicaron 40, bloques 37, bloques_ia 16, bloques_banco 21.
--    Semana del 5 al 11 oct: practicaron 35, bloques 29, ia 17, banco 12.
select * from public.panel_cifras('2026-10-12', '2026-10-18', 'total');
select * from public.panel_cifras('2026-10-05', '2026-10-11', 'total');

-- 4. La serie: 12 semanas, de la del 3 ago a la del 19 oct, con accesos
--    solo en la última (y creciendo mientras dure la semana).
select periodo, periodo_desde, periodo_hasta, accesos, accesos_alumnos, practicaron, bloques
from public.panel_cifras('2026-07-27', '2026-10-21', 'semana');

-- 5. Desde cuándo. Esperado: entradas_clase el 13 oct 2026; accesos e
--    instrumentacion el 20 oct 2026 a las 21:37 UTC.
select * from public.panel_inicio_datos();

-- 6. Nadie de fuera ejecuta ni lee. Esperado: false en todas las columnas.
select p.proname as funcion,
       has_function_privilege('anon', p.oid, 'execute')          as anon_ejecuta,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_ejecuta
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'panel\_%' or p.proname like 'metricas\_%')
order by 1;

select v as vista, has_table_privilege('anon', ('public.' || v)::regclass, 'select') as anon_lee
from unnest(array['metricas_practica', 'metricas_accesos', 'metricas_excluidos']) as v;


-- ###############################################################
-- PARTE C — BASE DEL LMS, DESPUÉS DE DESPLEGAR
--
-- Lo que solo usaba el panel anterior. Antes del despliegue, el panel
-- que hay en producción se quedaría sin datos.
-- ###############################################################

drop function if exists public.panel_eventos(date, date, text[]);
drop function if exists public.panel_alumnos(date, date);
drop function if exists public.panel_primer_bloque(date, date, text[]);
drop function if exists public.panel_top(date, date, text, int, text[]);
drop function if exists public.panel_embudo(date, date, text, text[]);
drop function if exists public.panel_totales(date, date, text[]);
drop function if exists public.panel_serie(date, date, text, text[]);
drop function if exists public.panel_agregado(date, date, text, text[]);
drop type if exists public.panel_fila;
drop view if exists public.metricas_eventos;
drop view if exists public.metricas_actividad;
drop view if exists public.metricas_bloques;
drop view if exists public.metricas_lecciones;

-- Índices que solo servían a esas consultas. Los de lecciones, ejercicios
-- y bloques por fecha se quedan: los usa `panel_cifras`.
drop index if exists public.idx_progreso_bloques_fecha;
drop index if exists public.idx_sesiones_creada;

-- Sin la fila `instrumentacion`, que ya no lee nadie.
create or replace function public.panel_inicio_datos()
returns table (fuente text, desde timestamptz)
language sql
stable
set search_path = ''
as $$
  select 'entradas_clase'::text, (select min(e.clicked_at) from public.entradas_clase e)
  union all
  select 'accesos'::text, (select min(a.iniciado_en) from public.accesos a);
$$;

-- C1 · COMPROBAR
-- 1. Lo que queda del panel. Esperado, exactamente: metricas_excluido,
--    metricas_quitar_excluidos, panel_cifras, panel_inicio_datos,
--    panel_nunca_accedieron.
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'panel\_%' or p.proname like 'metricas\_%')
order by 1;

-- 2. Las vistas. Esperado: metricas_accesos, metricas_excluidos, metricas_practica.
select table_name from information_schema.views
where table_schema = 'public' and table_name like 'metricas\_%'
order by 1;

-- 3. Las tablas de la instrumentación siguen ahí y registrando. Esperado:
--    accesos con filas y la última de hoy; eventos con filas;
--    pantalla_origen en los bloques de los últimos días.
select (select count(*) from public.accesos) as accesos, (select max(iniciado_en) from public.accesos) as ultimo_acceso,
       (select count(*) from public.eventos) as eventos,
       (select count(*) from public.bloques_generados where pantalla_origen is not null) as bloques_con_pantalla;

-- 4. Dos filas: entradas_clase y accesos.
select * from public.panel_inicio_datos();


-- ===============================================================
-- DESHACER (comentado). Ninguna parte toca datos de alumnos.
--
-- PARTE B:
--   drop function if exists public.panel_nunca_accedieron(text[]);
--   drop function if exists public.panel_cifras(date, date, text);
--   drop type if exists public.panel_cifras;
--   drop view if exists public.metricas_practica;
--   drop view if exists public.metricas_accesos;
--   delete from public.metricas_exclusiones where alumno_id <> 's_1785879819493';
--   (`metricas_excluidos` con `creado_en` no molesta a nadie.)
--
-- PARTE C: lo borrado está en el historial de git
--   (`supabase/lms-panel-metricas.sql` antes del recorte).
--
-- PARTE A: `create or replace view` no deja QUITAR columnas. Hay que
--   borrar la vista y recrearla con el PASO 1 de
--   gestion-vista-perfil-estado.sql, y volver a cerrarla:
--   revoke select on public.vista_perfil_alumno from anon, authenticated;
-- ===============================================================
