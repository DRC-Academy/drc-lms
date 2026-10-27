-- ===============================================================
-- vista_perfil_alumno: + estado_suscripcion (PAGO PENDIENTE)
--
-- ⚠ SE EJECUTA EN LA BASE DE DRC GESTIÓN (SQL Editor), NO EN LA DEL LMS.
-- A mano y paso a paso. SIN EJECUTAR a 27/10/2026.
--
-- ---------------------------------------------------------------
-- POR QUÉ
--
-- El LMS bloquea a los alumnos con la suscripción "En espera" (on-hold
-- de WooCommerce = pago fallido). Gestión NO guarda el estado de la
-- suscripción en ninguna columna: lo resuelve en vivo contra Woo en
-- /api/check-subscription. Lo único que persiste es el EPISODIO de pago
-- pendiente, en `student_payment_holds` (desde el 26/10/2026, commit
-- d1fc4fd de academy-scheduler): una fila por episodio, `ended_at` null
-- mientras sigue abierto, y como mucho una abierta por alumno (índice
-- único parcial).
--
-- Ese episodio ya aplica la regla única de Gestión: varias suscripciones
-- (si alguna da acceso, no hay episodio), la Pausa, la activación manual
-- y Oritalk. El LMS no tiene que repetir nada de eso.
--
-- QUÉ CAMBIA, Y SOLO ESTO
--   · `estado_suscripcion` al final (columna 27): 'on-hold' si el alumno
--     tiene un episodio abierto; null si no. Null NO quiere decir
--     "activa": quiere decir que Gestión no le tiene en pago pendiente.
--     Es lo único que el LMS necesita saber.
--
-- La vista es la de la PARTE A de `panel-metricas.sql` (21/10/2026), con
-- la columna nueva al final. `create or replace view` solo deja AÑADIR
-- al final, y los permisos se conservan. `student_payment_holds` NO
-- entra en la lista blanca del LMS: se lee dentro de la vista.
--
-- OJO CON `gestion-nombre-visible-profesor.sql` (sin ejecutar): recrea
-- esta vista con `profesor_visible` en la 27. Si algún día se ejecuta,
-- tiene que llevar `estado_suscripcion` en la 27 y `profesor_visible`
-- en la 28.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 0 — ANTES DE TOCAR NADA: QUE LA VISTA SEA LA QUE ESPERO
--
-- Esperado (27/10/2026): 26 columnas, la 26 `profesor_id`; 229 perfiles;
-- y las dos marcas de la definición en true. Si algo no cuadra, PARA y
-- pásame la salida de pg_get_viewdef.
-- ---------------------------------------------------------------

select count(*) as columnas,
       max(column_name) filter (where ordinal_position = 26) as columna_26
  from information_schema.columns
 where table_schema = 'public' and table_name = 'vista_perfil_alumno';

select count(*) as perfiles from public.vista_perfil_alumno;

select pg_get_viewdef('public.vista_perfil_alumno'::regclass, true) like '%a.teacher_id AS profesor_id%' as tiene_profesor_id,
       pg_get_viewdef('public.vista_perfil_alumno'::regclass, true) like '%(a.status = ''active''::text) DESC%' as activa_primero;


-- ---------------------------------------------------------------
-- PASO 1 — EL CAMBIO
-- ---------------------------------------------------------------

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
    base.profesor_id,
    CASE
        WHEN EXISTS ( SELECT 1
               FROM student_payment_holds h
              WHERE h.student_id = base.alumno_id AND h.ended_at IS NULL) THEN 'on-hold'::text
        ELSE NULL::text
    END AS estado_suscripcion
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


-- ---------------------------------------------------------------
-- PASO 2 — COMPROBAR
-- ---------------------------------------------------------------

-- 1. 27 columnas, la 27 `estado_suscripcion`; y los mismos perfiles que en el PASO 0.
select count(*) as columnas,
       max(column_name) filter (where ordinal_position = 27) as columna_27
  from information_schema.columns
 where table_schema = 'public' and table_name = 'vista_perfil_alumno';

select count(*) as perfiles from public.vista_perfil_alumno;

-- 2. Quién sale en pago pendiente. Esperado (27/10/2026): estas 3 filas,
--    las mismas que `student_payment_holds` con ended_at null:
--      s_1784023281156   s_1792085660448   s_1793044631420
select alumno_id, nombre, estado_asignacion, estado_suscripcion
  from public.vista_perfil_alumno
 where estado_suscripcion is not null
 order by alumno_id;

select student_id from public.student_payment_holds where ended_at is null order by 1;

-- 3. Que siga cerrada (create or replace conserva los permisos). Esperado: false / false.
select has_table_privilege('anon', 'public.vista_perfil_alumno', 'select') as anon,
       has_table_privilege('authenticated', 'public.vista_perfil_alumno', 'select') as authenticated;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS — solo si algo sale mal
--
-- `create or replace view` no deja QUITAR columnas: hay que borrar la
-- vista, recrearla con la A1 de `panel-metricas.sql` y volver a cerrarla.
--
--   drop view public.vista_perfil_alumno;
--   -- + A1 de panel-metricas.sql
--   revoke select on public.vista_perfil_alumno from anon, authenticated;
--
-- El LMS aguanta las dos: sin la columna, la lectura del estado falla y
-- se deja pasar (fail-open), que es como funciona hoy.
-- ---------------------------------------------------------------
