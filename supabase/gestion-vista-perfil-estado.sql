-- ===============================================================
-- vista_perfil_alumno: + estado_asignacion, Y LA FILA ACTIVA MANDA
--
-- Se ejecuta en DRC Gestión (SQL Editor), no en la base del LMS.
--
-- ⚠ YA APLICADO EN PRODUCCIÓN el 2026-10-07 (PASO 1), con las
-- comprobaciones del PASO 2 en lo esperado: 25 columnas, 242 filas /
-- 241 alumnos, active 210 / inactive 32, 0 filas mixtas y la vista
-- cerrada a anon y authenticated. Este archivo es el registro de lo que
-- se ejecutó; no hay que volver a correrlo.
--
-- ---------------------------------------------------------------
-- POR QUÉ
--
-- Desde `gestion-vista-perfil-inactivos.sql` la vista da filas también
-- a los alumnos "fuera de calendario" (todas sus assignments
-- `inactive`), para que puedan entrar al LMS. Pero no decía cuáles eran
-- esas filas, así que el LMS les nombraba como profesor actual al último
-- que tuvieron y les calculaba el ritmo con las horas de un horario que
-- ya no dan.
--
-- Y había un segundo agujero: los dos LATERAL que sacan horas, plan,
-- `meet_link` y `slots` no miraban `status`. Elegían la assignment con
-- más horas, así que un alumno con una activa y una inactiva más larga
-- habría heredado las horas, el plan y el enlace de la inactiva. En
-- oct/2026 no le pasaba a nadie (0 alumnos con activa + inactiva).
--
-- QUÉ CAMBIA, Y SOLO ESTO
--   · `estado_asignacion`: `assignments.status` de la fila, al final.
--     El LMS la lee en `lib/gestion.ts` (`asignacionActiva`).
--   · Los LATERAL `asg` y `cla` ordenan primero por `status = 'active'`.
--     Con los datos de oct/2026 no cambia ningún valor.
--
-- Las columnas de siempre no cambian ni de nombre ni de orden:
-- `create or replace view` solo deja AÑADIR al final, y los permisos se
-- conservan.
--
-- OJO CON `gestion-nombre-visible-profesor.sql` (sin ejecutar a fecha
-- de hoy): recrea esta vista, así que tiene que llevar
-- `estado_asignacion` en la columna 25, antes de `profesor_id`. Ya está
-- corregido para eso.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 0 — ANTES DE TOCAR NADA: QUE LA VISTA SEA LA QUE ESPERO
--
-- Esperado: 24 columnas; 242 filas / 241 alumnos. Si pg_get_viewdef no
-- coincide con el PASO 1 de `gestion-vista-perfil-inactivos.sql`, PARA.
-- ---------------------------------------------------------------

select count(*) as columnas from information_schema.columns
 where table_schema = 'public' and table_name = 'vista_perfil_alumno';
select pg_get_viewdef('public.vista_perfil_alumno'::regclass, true);
select count(*) as filas, count(distinct alumno_id) as alumnos from public.vista_perfil_alumno;


-- ---------------------------------------------------------------
-- PASO 1 — EL CAMBIO
-- ---------------------------------------------------------------

create or replace view public.vista_perfil_alumno as
 SELECT base.alumno_id, base.email, base.nombre, base.nivel, base.plan, base.producto,
    base.objetivo_setter, base.profesor, base.ocupacion, base.objetivo_perfil,
    base.puntos_fuertes, base.puntos_debiles, base.estilo_aprendizaje, base.foco_recomendado,
    base.respuestas_formulario, base.tiene_perfil, base.fecha_inicio, base.horas_semanales,
    base.plan_contratado, base.nivel_profesor, base.nivel_ficha, base.nivel_prueba,
    cla.meet_link, cla.slots,
    base.estado_asignacion
   FROM ( SELECT base_1.alumno_id, base_1.email, base_1.nombre, base_1.nivel, base_1.plan,
            base_1.producto, base_1.objetivo_setter, base_1.profesor, base_1.ocupacion,
            base_1.objetivo_perfil, base_1.puntos_fuertes, base_1.puntos_debiles,
            base_1.estilo_aprendizaje, base_1.foco_recomendado, base_1.respuestas_formulario,
            base_1.tiene_perfil, base_1.fecha_inicio, base_1.estado_asignacion,
            asg.horas AS horas_semanales, asg.plan AS plan_contratado,
            fic.teacher_confirmed_level AS nivel_profesor,
            fic.current_level AS nivel_ficha, fic.level_test_cefr AS nivel_prueba
           FROM ( SELECT s.id AS alumno_id, lower(TRIM(BOTH FROM s.email)) AS email,
                    s.name AS nombre, s.level AS nivel, s.plan, s.product_name AS producto,
                    a.objetivo AS objetivo_setter, a.teacher_name AS profesor,
                    a.status AS estado_asignacion,
                    p.occupation AS ocupacion, p.personal_objective AS objetivo_perfil,
                    p.strong_points AS puntos_fuertes, p.weak_points AS puntos_debiles,
                    p.learning_style AS estilo_aprendizaje, p.recommended_focus AS foco_recomendado,
                    p.form_responses AS respuestas_formulario,
                    p.form_completed_at IS NOT NULL AS tiene_perfil,
                    COALESCE(
                      ( SELECT min(a2.start_date) FROM assignments a2
                         WHERE a2.student_id = s.id AND a2.status = 'active'::text AND a2.start_date IS NOT NULL),
                      ( SELECT min(a2.start_date) FROM assignments a2
                         WHERE a2.student_id = s.id AND a2.start_date IS NOT NULL)
                    ) AS fecha_inicio
                   FROM students s
                     JOIN assignments a ON a.student_id = s.id
                       AND ( a.status = 'active'::text
                             OR NOT EXISTS ( SELECT 1 FROM assignments a3
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
                  ORDER BY (a.status = 'active'::text) DESC,
                        (GREATEST(CASE WHEN jsonb_typeof(a.slots) = 'array'::text THEN jsonb_array_length(a.slots) ELSE 0 END,
                                  COALESCE(a.weekly_hours, 0))) DESC, a.created_at DESC
                 LIMIT 1) asg ON true
             LEFT JOIN LATERAL ( SELECT sp.teacher_confirmed_level, sp.current_level, sp.level_test_cefr
                   FROM student_profiles sp
                  WHERE sp.student_id = base_1.alumno_id
                 LIMIT 1) fic ON true) base
     LEFT JOIN LATERAL ( SELECT NULLIF(btrim(COALESCE(a.meet_link, ''::text)), ''::text) AS meet_link,
                CASE WHEN jsonb_typeof(a.slots) = 'array'::text THEN a.slots ELSE NULL::jsonb END AS slots
           FROM assignments a
          WHERE a.student_id = base.alumno_id
          ORDER BY (a.status = 'active'::text) DESC,
                (GREATEST(CASE WHEN jsonb_typeof(a.slots) = 'array'::text THEN jsonb_array_length(a.slots) ELSE 0 END,
                          COALESCE(a.weekly_hours, 0))) DESC, a.created_at DESC
         LIMIT 1) cla ON true;


-- ---------------------------------------------------------------
-- PASO 2 — COMPROBAR
--
-- Esperado (07/10/2026): 25 columnas; 242/241 como en el PASO 0;
-- active 210, inactive 32; y 0 filas en la cuarta consulta.
-- ---------------------------------------------------------------

select count(*) as columnas from information_schema.columns
 where table_schema = 'public' and table_name = 'vista_perfil_alumno';
select count(*) as filas, count(distinct alumno_id) as alumnos from public.vista_perfil_alumno;
select estado_asignacion, count(*) from public.vista_perfil_alumno group by 1 order by 1;
select v.alumno_id from public.vista_perfil_alumno v
 where v.estado_asignacion <> 'active'
   and exists (select 1 from public.assignments a where a.student_id = v.alumno_id and a.status = 'active');

-- Que siga cerrada (create or replace conserva los permisos). Esperado: false / false.
select has_table_privilege('anon', 'public.vista_perfil_alumno', 'select') as anon,
       has_table_privilege('authenticated', 'public.vista_perfil_alumno', 'select') as authenticated;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS — solo si algo sale mal
--
-- `create or replace view` no deja QUITAR columnas: hay que borrar la
-- vista, recrearla con la de antes y volver a cerrarla.
--
--   drop view public.vista_perfil_alumno;
--   -- + PASO 1 de gestion-vista-perfil-inactivos.sql
--   revoke select on public.vista_perfil_alumno from anon, authenticated;
--
-- El LMS aguanta las dos: sin la columna, `asignacionActiva` sale true
-- y todo vuelve a ser como antes de este cambio.
-- ---------------------------------------------------------------
