-- ===============================================================
-- DIAGNOSTICO DEL PANEL DE PROFESORES
--
-- SE EJECUTA EN LA BASE DE DRC GESTION. Solo lee: no cambia nada.
--
-- Es UNA sola consulta porque el SQL Editor solo muestra el resultado de
-- la ultima sentencia. Devuelve recuentos, ids y dominios; ninguna
-- direccion de correo y ninguna contrasena (de `password` solo mira si
-- la columna existe).
--
-- Si falla porque falta una columna, pasa el error tal cual.
-- ===============================================================

with
plantilla as (
  select id,
         lower(btrim(coalesce(email, '')))              as e,
         lower(btrim(coalesce(notification_email, ''))) as n
    from public.teachers
   where archived_at is null
),
con_activos as (
  select distinct teacher_id from public.assignments where status = 'active'
),
alumnos as (
  select id, lower(btrim(email)) as e
    from public.students
   where btrim(coalesce(email, '')) <> ''
),
repetidos as (
  select lower(btrim(email)) as e, string_agg(id, ', ' order by id) as ids, count(*) as cuantos
    from public.teachers
   where btrim(coalesce(email, '')) <> ''
   group by 1
  having count(*) > 1
),
coinciden as (
  select t.id as teacher_id, s.id as alumno_id, t.archived_at is not null as archivado,
         exists (select 1 from public.assignments a where a.student_id = s.id and a.status = 'active') as alumno_activo
    from public.teachers t
    join alumnos s on s.e = lower(btrim(t.email))
   where btrim(coalesce(t.email, '')) <> ''
),
varias as (
  select student_id, count(distinct teacher_id) as profesores
    from public.assignments
   where status = 'active'
   group by student_id
  having count(*) > 1
)
select seccion, dato, valor
from (
  select 1 as orden, 'columnas' as seccion, table_name || '.' || column_name as dato, 'existe' as valor
    from information_schema.columns
   where table_schema = 'public'
     and ((table_name = 'teachers' and column_name in ('email', 'notification_email', 'archived_at', 'is_test', 'display_name', 'password'))
       or (table_name = 'app_users' and column_name = 'password')
       or (table_name = 'students' and column_name = 'is_test'))

  union all select 2, 'vistas', table_name, 'existe'
    from information_schema.views
   where table_schema = 'public' and table_name in ('vista_ultima_clase', 'vista_proxima_clase')

  union all select 3, 'profesores', 'en_plantilla', count(*)::text from plantilla
  union all select 3, 'profesores', 'con_alumnos_activos', count(*)::text from con_activos
  union all select 3, 'profesores', 'sin_email', count(*)::text from plantilla where e = ''
  union all select 3, 'profesores', 'email_no_valido', count(*)::text
    from plantilla where e <> '' and e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  union all select 3, 'profesores', 'con_alumnos_activos_y_sin_email_valido', count(*)::text
    from plantilla p join con_activos c on c.teacher_id = p.id
   where p.e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  union all select 3, 'profesores', 'con_email_avisos', count(*)::text from plantilla where n <> ''
  union all select 3, 'profesores', 'avisos_distinto_de_email', count(*)::text from plantilla where n <> '' and n <> e

  union all select 4, 'dominio', split_part(e, '@', 2), count(*)::text from plantilla where e <> '' group by 3

  union all select 5, 'email_repetido', ids, cuantos::text from repetidos
  union all select 5, 'email_repetido', 'total_grupos', count(*)::text from repetidos

  union all select 6, 'email_profesor_y_alumno', 'total', count(*)::text from coinciden
  union all select 6, 'email_profesor_y_alumno', teacher_id || ' / ' || alumno_id,
         'archivado=' || archivado::text || ' alumno_activo=' || alumno_activo::text
    from coinciden

  union all select 7, 't1', 'email_valido',
         coalesce((select (e ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')::text from plantilla where id = 't1'), 'no_en_plantilla')
  union all select 7, 't1', 'dominio',
         coalesce((select split_part(e, '@', 2) from plantilla where id = 't1'), '')

  union all select 8, 'asignaciones', 'status_' || coalesce(status, 'null'), count(*)::text
    from public.assignments group by 3
  union all select 8, 'asignaciones', 'copia_teacher_email_desfasada', count(*)::text
    from public.assignments a join public.teachers t on t.id = a.teacher_id
   where a.status = 'active'
     and lower(btrim(coalesce(a.teacher_email, ''))) <> lower(btrim(coalesce(t.email, '')))
  union all select 8, 'asignaciones', 'alumnos_sin_ninguna_asignacion', count(*)::text
    from public.students s
   where not exists (select 1 from public.assignments a where a.student_id = s.id)
  union all select 8, 'asignaciones', 'alumnos_con_varias_activas', count(*)::text from varias
  union all select 8, 'asignaciones', 'alumnos_con_profesores_activos_distintos', count(*)::text from varias where profesores > 1

  -- Alcance de lo que puede hacer la clave publica, tabla por tabla.
  union all select 9, 'permisos_anon', c.relname,
         'rls=' || c.relrowsecurity::text
         || ' select=' || has_table_privilege('anon', c.oid, 'select')::text
         || ' update=' || has_table_privilege('anon', c.oid, 'update')::text
         || ' delete=' || has_table_privilege('anon', c.oid, 'delete')::text
         || ' politicas=' || (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relname in ('teachers', 'assignments', 'students', 'app_users', 'student_profiles',
                       'class_analyses', 'class_records', 'finance_payments', 'teacher_calendars')
) x
order by orden, seccion, dato;
