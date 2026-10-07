-- ===============================================================
-- EL NOMBRE VISIBLE DE CADA PROFESOR
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS. A mano,
-- en el SQL Editor, paso a paso.
--
-- ---------------------------------------------------------------
-- POR QUÉ
--
-- `teachers.name` es un nombre de USUARIO («DanielaN», «Daiana.M»,
-- «Sol.G», «Sebastian (test)»): sirve para distinguir a dos Danielas en
-- el panel de Gestión, no para que un alumno lea «10 clases con
-- DanielaN». Esto añade una columna aparte, `display_name`, con el
-- nombre como se presenta cada uno, y la saca por las dos vistas que
-- ya exponen al profesor y lee el LMS.
--
-- Mientras un profesor no la tenga (null), el LMS limpia el usuario con
-- reglas fijas (`lib/profesor.ts`): nada se rompe por ejecutar esto a
-- medias ni por dejar nombres sin rellenar.
--
-- QUÉ CAMBIA, Y SOLO ESTO
--   · `teachers.display_name`: columna nueva, nullable, sin valor.
--   · `vista_profesores`: + `nombre_visible` al final.
--   · `vista_perfil_alumno`: + `profesor_id` (el `teacher_id` de la
--     assignment) y `profesor_visible` al final. Con el id, el LMS cuenta
--     «7 con Liliana» sin casar nombres.
--
-- PARTE DE LA VISTA DE `gestion-vista-perfil-estado.sql` (aplicada el
-- 07/10/2026), no de la de antes: lleva `estado_asignacion` en la columna
-- 25 y los LATERAL que ponen primero la assignment activa. Sin eso, este
-- `create or replace` fallaría —no deja poner `profesor_id` donde ya está
-- `estado_asignacion`— o, peor, desharía aquel arreglo.
--
-- `vista_calendario_alumno` NO SE TOCA. La de Gestión tiene una columna
-- (`meet_link`) que no está en ningún SQL del repositorio, así que
-- recrearla desde aquí podría deshacer lo que se hizo allí. Y no hace
-- falta: el LMS nombra siempre al profesor de la FICHA, también en el
-- calendario, y el nombre visible de cualquier `teacher_id` le llega por
-- `vista_profesores`.
--
-- Las columnas de siempre no cambian ni de nombre ni de orden:
-- `create or replace view` solo deja AÑADIR al final, y los permisos de
-- cada vista se conservan.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 0 — ANTES DE TOCAR NADA: QUE LAS VISTAS SEAN LAS QUE ESPERO
--
-- Las definiciones de abajo salen de los últimos SQL del LMS
-- (`gestion-vista-perfil-estado.sql`, `gestion-vista-profesores.sql`).
-- Si alguien las ha cambiado en Gestión desde entonces, este `create or
-- replace` desharía ese cambio. Esperado (desde el 07/10/2026):
-- vista_perfil_alumno 25 y vista_profesores 2. Si no cuadra,
-- PARA y avísame. La segunda consulta enseña la definición de verdad de
-- la vista de perfiles, para compararla con la del PASO 2 si hay dudas.
-- ---------------------------------------------------------------

select table_name, count(*) as columnas
from information_schema.columns
where table_schema = 'public'
  and table_name in ('vista_perfil_alumno', 'vista_profesores')
group by table_name
order by table_name;

select pg_get_viewdef('public.vista_perfil_alumno'::regclass, true);

-- Y apunta estos recuentos: el PASO 3 los repite y tienen que salir iguales.
select
  (select count(*) from public.vista_perfil_alumno) as perfiles,
  (select count(*) from public.vista_profesores)    as profesores;


-- ---------------------------------------------------------------
-- PASO 1 — LA COLUMNA
-- ---------------------------------------------------------------

alter table public.teachers add column if not exists display_name text;

comment on column public.teachers.display_name is
  'Nombre del profesor tal como lo ve el alumno en el LMS («Daniela»). Null: el LMS limpia `name`.';


-- ---------------------------------------------------------------
-- PASO 2 — LAS DOS VISTAS
-- ---------------------------------------------------------------

create or replace view public.vista_profesores
with (security_invoker = on) as
select
  t.id    as teacher_id,
  t.name  as profesor,
  nullif(btrim(t.display_name), '') as nombre_visible
from public.teachers t
where btrim(coalesce(t.name, '')) <> '';


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
    nullif(btrim(tv.display_name), '') AS profesor_visible
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
         LIMIT 1) cla ON true
     LEFT JOIN public.teachers tv ON tv.id = base.profesor_id;


-- `vista_profesores` estaba cerrada a anon y authenticated: que siga así.
revoke select on public.vista_profesores from anon, authenticated;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
-- ---------------------------------------------------------------

-- 1 · Las columnas nuevas están. Esperado: vista_perfil_alumno 27,
-- vista_profesores 3.
select table_name, count(*) as columnas
from information_schema.columns
where table_schema = 'public'
  and table_name in ('vista_perfil_alumno', 'vista_profesores')
group by table_name
order by table_name;

-- 2 · Los mismos recuentos que en el PASO 0.
select
  (select count(*) from public.vista_perfil_alumno) as perfiles,
  (select count(*) from public.vista_profesores)    as profesores;

-- 3 · Cada perfil con profesor tiene su id. Esperado: 0 filas.
select alumno_id, nombre, profesor
from public.vista_perfil_alumno
where btrim(coalesce(profesor, '')) <> '' and profesor_id is null;


-- ---------------------------------------------------------------
-- PASO 4 — RELLENAR LOS NOMBRES
--
-- Los profesores activos, con su usuario y una sugerencia: la misma
-- limpieza que hace el LMS cuando falta el nombre. Revísala —la regla no
-- sabe si «DanielaN» se presenta como «Daniela» o como «Dani»— y rellena
-- con un `update` por profesor.
-- ---------------------------------------------------------------

select
  t.id           as teacher_id,
  t.name         as usuario,
  t.display_name as nombre_visible_actual,
  regexp_replace(
    regexp_replace(
      regexp_replace(btrim(t.name), '\s*\([^)]*\)\s*$', ''),
      '\.[A-Za-zÁÉÍÓÚÑÜáéíóúñü]{1,3}$', ''),
    '([a-záéíóúñü])[A-ZÁÉÍÓÚÑÜ]$', '\1') as sugerencia
from public.teachers t
where t.archived_at is null
order by t.name;

-- Uno por profesor, con el nombre que quiera ver el alumno:
--
--   update public.teachers set display_name = 'Daniela' where id = 't15';


-- ---------------------------------------------------------------
-- VUELTA ATRÁS — solo si algo sale mal
--
-- `create or replace view` no deja QUITAR columnas, así que volver a
-- ejecutar los SQL anteriores no basta: hay que borrar cada vista,
-- recrearla con su SQL de antes y volver a cerrar `vista_profesores`.
--
--   drop view public.vista_perfil_alumno;      -- + PASO 1 de gestion-vista-perfil-estado.sql
--   revoke select on public.vista_perfil_alumno from anon, authenticated;
--   drop view public.vista_profesores;         -- + gestion-vista-profesores.sql entero
--   alter table public.teachers drop column display_name;
--
-- El LMS aguanta las dos situaciones: lee con `select *` y trata las
-- columnas nuevas como opcionales.
-- ---------------------------------------------------------------
