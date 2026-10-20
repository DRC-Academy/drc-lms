-- ===============================================================
-- vista_clases_nuevas_semana — CLASE ANALIZADA NUEVA POR ALUMNO Y SEMANA
--
-- ⚠ EL FILTRO DE «CLASE UTILIZABLE» ESTÁ DUPLICADO A PROPÓSITO.
--   `analysis_status = 'ready'` y `validation_status` en
--   ('approved', 'auto_approved', 'ok') replican el del LMS, que vive en
--   lib/gestion.ts: la constante `VALIDACION_ACEPTADA` y el
--   `.eq("analysis_status", "ready")` de `obtenerUltimaClase`,
--   `clasesDelPanel` e `historialDeClases`. Si cambia allí, cambia aquí
--   (y al revés): si no, el panel contaría como «podía generar» a quien
--   el LMS no deja, o al revés.
--
-- Ejecutar a mano en el proyecto de GESTIÓN (el de SUPABASE_URL). El
-- LMS solo la lee, con el cliente de solo lectura.
--
-- Para qué: el denominador de «de los alumnos que podían generar
-- práctica, cuántos lo hicieron». En el LMS se puede generar un bloque
-- cuando entra material nuevo, y el material nuevo es una clase
-- analizada que el alumno todavía no tenía.
--
-- ---------------------------------------------------------------
-- QUÉ ES UNA CLASE NUEVA
--
-- Una fila de `class_analyses` que cumple las tres cosas:
--
--   1. ES UTILIZABLE: `analysis_status = 'ready'` y `validation_status`
--      en ('approved', 'auto_approved', 'ok'). El mismo filtro con el que
--      el LMS elige la última clase (`VALIDACION_ACEPTADA` en
--      lib/gestion.ts): lo que no pasa ese filtro el alumno no lo ve.
--
--   2. SE CUENTA CUANDO PASA A SER UTILIZABLE, no cuando fue la clase:
--      `disponible_en = greatest(analyzed_at, validation_reviewed_at)`.
--      Las aprobadas automáticamente lo son al analizarse (unas 18 h
--      después de la clase, en la mediana). Las que pasan por revisión
--      manual se aprueban una mediana de 94 h después del análisis, y
--      hasta entonces no existen para el alumno: contarlas en la semana
--      de la clase daría por «elegible» a quien no podía generar nada.
--
--   3. ES MÁS RECIENTE QUE LO QUE YA TENÍA: su `class_date` es posterior
--      a la de todas las clases que el alumno ya tenía disponibles en ese
--      momento. El LMS genera siempre con la clase de `class_date` más
--      reciente, así que una clase vieja que se aprueba tarde no le trae
--      nada nuevo y no cuenta.
--
-- Y una por alumno y día de clase: hay 27 casos de dos análisis `ready`
-- del mismo alumno con la misma `class_date` (reanálisis). Cuenta el
-- primero que estuvo disponible.
--
-- Semana: de lunes a domingo, en hora de Madrid, por `disponible_en`.
-- `analyzed_at` y `validation_reviewed_at` son `timestamptz`: se pasan a
-- hora de Madrid ANTES de agrupar, `date_trunc('week', (x AT TIME ZONE
-- 'Europe/Madrid'))`, igual que en las funciones del panel del LMS. El
-- cambio de hora del 25 oct 2026 no mueve nada: cada instante se
-- convierte con la regla vigente en ese momento.
-- ---------------------------------------------------------------
-- ===============================================================

create or replace view public.vista_clases_nuevas_semana
with (security_invoker = on) as
with utilizables as (
  select
    ca.student_id                                                    as alumno_id,
    ca.class_date::date                                              as fecha_clase,
    min(greatest(ca.analyzed_at, coalesce(ca.validation_reviewed_at, ca.analyzed_at))) as disponible_en
  from public.class_analyses ca
  where ca.student_id is not null
    and ca.class_date is not null
    and ca.analyzed_at is not null
    and ca.analysis_status = 'ready'
    and ca.validation_status in ('approved', 'auto_approved', 'ok')
  group by ca.student_id, ca.class_date::date
),
con_previa as (
  select
    u.*,
    -- La clase más reciente que ya tenía disponible antes de esta.
    max(u.fecha_clase) over (
      partition by u.alumno_id
      order by u.disponible_en, u.fecha_clase
      rows between unbounded preceding and 1 preceding
    ) as fecha_previa
  from utilizables u
)
select
  c.alumno_id,
  date_trunc('week', (c.disponible_en at time zone 'Europe/Madrid'))::date as semana,
  count(*)::int                                                         as clases_nuevas,
  min(c.disponible_en)                                                  as primera_disponible_en,
  max(c.disponible_en)                                                  as ultima_disponible_en,
  max(c.fecha_clase)                                                    as ultima_fecha_clase
from con_previa c
where c.fecha_previa is null or c.fecha_clase > c.fecha_previa
group by c.alumno_id, date_trunc('week', (c.disponible_en at time zone 'Europe/Madrid'))::date;

comment on view public.vista_clases_nuevas_semana is
  'Por alumno y semana (lunes, Madrid): clases analizadas que pasaron a ser utilizables y eran más recientes que lo que ya tenía. Para el panel del LMS.';

revoke select on public.vista_clases_nuevas_semana from anon, authenticated;


-- ===============================================================
-- COMPROBACIÓN
-- ===============================================================

-- 1. Cuántos alumnos tuvieron clase nueva cada semana. Simulado con los
--    datos del 20-10-2026: 149 (28 sep), 159 (5 oct), 161 (12 oct). Las
--    semanas recientes pueden subir un poco con las aprobaciones manuales
--    que lleguen tarde.
select semana, count(*) as alumnos, sum(clases_nuevas) as clases
from public.vista_clases_nuevas_semana
where semana >= current_date - 70
group by semana
order by semana desc;

-- 2. Una fila por alumno y semana. Esperado: 0.
select count(*) as duplicadas
from (
  select alumno_id, semana from public.vista_clases_nuevas_semana
  group by alumno_id, semana having count(*) > 1
) d;

-- 3. Que siga cerrada. Esperado: false / false.
select has_table_privilege('anon', 'public.vista_clases_nuevas_semana', 'select')          as anon_lee,
       has_table_privilege('authenticated', 'public.vista_clases_nuevas_semana', 'select') as authenticated_lee;


-- DESHACER:
-- drop view if exists public.vista_clases_nuevas_semana;
