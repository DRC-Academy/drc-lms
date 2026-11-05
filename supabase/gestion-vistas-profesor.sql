-- ===============================================================
-- PANEL DE PROFESORES: LAS DOS VISTAS
--
-- SE EJECUTA EN LA BASE DE DRC GESTION, a mano, el archivo entero.
-- Solo CREA dos vistas: no toca ninguna tabla ni ninguna vista existente,
-- y el LMS desplegado no las lee hasta que se despliegue la Fase 1.
--
-- Sin tildes a proposito: el SQL Editor ya rompio una vez con caracteres
-- no ASCII. Por lo mismo, la regla del examen escribe ex.menes: el punto
-- cubre examenes con tilde o sin ella.
--
-- vista_profesores_acceso: quien puede ser profesor en el LMS. Es aparte
-- porque `vista_profesores` se lee con select * desde pantallas del alumno
-- y un email anadido alli viajaria en cada una.
--
-- vista_alumnos_profesor: un alumno por fila y profesor, SOLO con
-- asignacion activa. No saca `status`: si la fila existe, esta activa. Un
-- cambio de profesor sobrescribe `assignments.teacher_id`, asi que la fila
-- cambia de profesor en el mismo instante. Sin columnas de plan, producto,
-- suscripcion, garantia ni valoraciones.
--
-- `examen` traduce `detectarExamen` (lib/perfil.ts), en el mismo orden, y
-- devuelve una palabra que esa funcion reconoce. Asi `cursosDelInicio`
-- funciona sin recibir el plan. La Fase 2 incluye un script que compara
-- las dos reglas en todos los alumnos.
-- ===============================================================

begin;

create or replace view public.vista_profesores_acceso
with (security_invoker = on) as
select
  t.id                        as teacher_id,
  t.name                      as profesor,
  lower(btrim(t.email))       as email,
  (t.archived_at is not null) as archivado
from public.teachers t
where btrim(coalesce(t.name, '')) <> '';

create or replace view public.vista_alumnos_profesor
with (security_invoker = on) as
select
  a.teacher_id,
  s.id    as alumno_id,
  s.name  as nombre,
  s.level as nivel,
  fic.teacher_confirmed_level as nivel_profesor,
  fic.current_level           as nivel_ficha,
  fic.level_test_cefr         as nivel_prueba,
  fic.recommended_focus       as foco_recomendado,
  (select min(a2.start_date)
     from public.assignments a2
    where a2.student_id = s.id
      and a2.status = 'active'
      and a2.start_date is not null) as fecha_inicio,
  case
    when s.plan ~* '\y(first|fce)\y|\yb2\s+ex.menes\y'       then 'first'
    when s.plan ~* '\y(preliminary|pet)\y|\yb1\s+ex.menes\y' then 'preliminary'
    when s.plan ~* '\y(advanced|cae)\y|\yc1\s+ex.menes\y'    then 'advanced'
    when s.plan ~* '\yielts\y'                                             then 'ielts'
    else null
  end as examen
from public.assignments a
join public.students s on s.id = a.student_id
left join lateral (
  select sp.teacher_confirmed_level, sp.current_level, sp.level_test_cefr, sp.recommended_focus
    from public.student_profiles sp
   where sp.student_id = s.id
   limit 1
) fic on true
where a.status = 'active';

-- Dentro de la transaccion: las vistas no llegan a existir abiertas.
revoke all on public.vista_profesores_acceso from anon, authenticated;
revoke all on public.vista_alumnos_profesor  from anon, authenticated;

commit;


-- ---------------------------------------------------------------
-- COMPROBACION. Una sola consulta: `resultado` tiene que ser igual que
-- `esperado` en todas las filas. Si no, PARA y pasame la salida.
-- ---------------------------------------------------------------

select 'filas = asignaciones activas' as comprobacion,
       (select count(*) from public.vista_alumnos_profesor)::text as resultado,
       (select count(*) from public.vista_perfil_alumno where estado_asignacion = 'active')::text as esperado
union all
select 'profesores = vista_profesores',
       (select count(*) from public.vista_profesores_acceso)::text,
       (select count(*) from public.vista_profesores)::text
union all
select 'columnas comerciales o sensibles',
       (select count(*)
          from information_schema.columns
         where table_schema = 'public'
           and table_name in ('vista_profesores_acceso', 'vista_alumnos_profesor')
           and column_name ~* 'plan|producto|suscrip|pago|importe|precio|garant|valora|estrella|comentario|password|score|status')::text,
       '0'
union all
select 'anon lee vista_profesores_acceso', has_table_privilege('anon', 'public.vista_profesores_acceso', 'select')::text, 'false'
union all
select 'authenticated lee vista_profesores_acceso', has_table_privilege('authenticated', 'public.vista_profesores_acceso', 'select')::text, 'false'
union all
select 'anon lee vista_alumnos_profesor', has_table_privilege('anon', 'public.vista_alumnos_profesor', 'select')::text, 'false'
union all
select 'authenticated lee vista_alumnos_profesor', has_table_privilege('authenticated', 'public.vista_alumnos_profesor', 'select')::text, 'false';


-- ---------------------------------------------------------------
-- VUELTA ATRAS. Primero revierte el codigo del LMS que las lea; despues:
--
--   begin;
--   drop view if exists public.vista_alumnos_profesor;
--   drop view if exists public.vista_profesores_acceso;
--   commit;
--
-- No borra ningun dato: son solo vistas.
-- ---------------------------------------------------------------
