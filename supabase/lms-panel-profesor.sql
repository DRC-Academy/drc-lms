-- ===============================================================
-- PANEL DE PROFESORES: LO DE LA BASE DEL LMS
--
-- SE EJECUTA EN LA BASE DEL LMS, a mano, el archivo entero. Comprueba
-- antes que el ref del proyecto es el de LMS_SUPABASE_URL.
--
-- Hay que ejecutarlo ANTES de desplegar la Fase 1. El codigo desplegado
-- hoy no se entera: nunca escribe `teacher_id` ni el rol 'profesor', y
-- las filas actuales cumplen las restricciones nuevas.
--
-- profesores_acceso: Gestion dice quien es profesor; esto, quien puede
-- entrar. `email_normalizado` es la COPIA que el admin vio al activar. El
-- login busca el email AQUI, nunca en Gestion, y exige ademas que Gestion
-- siga diciendo lo mismo. Gestion deja editar teachers.email desde el
-- navegador con la clave publica: cambiarlo no da acceso a nadie, solo
-- bloquea al profesor hasta que un admin lo revise. Ese bloqueo no se
-- guarda: se calcula comparando las dos direcciones en cada peticion.
-- ===============================================================

begin;

create table if not exists public.profesores_acceso (
  teacher_id         text        primary key,
  email_normalizado  text        not null,
  activo             boolean     not null default false,
  activado_en        timestamptz,
  activado_por       text,
  desactivado_en     timestamptz,
  desactivado_por    text,
  -- Quien dio por buena una direccion nueva tras un bloqueo.
  email_revisado_en  timestamptz,
  email_revisado_por text,
  invitado_en        timestamptz,
  invitado_por       text,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  constraint profesores_acceso_email_normalizado
    check (length(email_normalizado) > 0 and email_normalizado = lower(btrim(email_normalizado))),
  constraint profesores_acceso_activo_con_autor
    check (not activo or (activado_en is not null and activado_por is not null))
);

comment on table public.profesores_acceso is
  'Quien puede entrar como profesor. email_normalizado es la copia aprobada: si deja de coincidir con Gestion, el acceso queda bloqueado.';

-- Dos profesores activos no pueden compartir la direccion con la que se entra.
create unique index if not exists idx_profesores_acceso_email_activo
  on public.profesores_acceso (email_normalizado)
  where activo;

drop trigger if exists trg_profesores_acceso_actualizado on public.profesores_acceso;
create trigger trg_profesores_acceso_actualizado
  before update on public.profesores_acceso
  for each row execute function lms_tocar_actualizado_en();

alter table public.profesores_acceso enable row level security;
revoke all on public.profesores_acceso from anon, authenticated;


-- Las sesiones del profesor van en la misma tabla, con su propia identidad.
alter table public.sesiones add column if not exists teacher_id text;

alter table public.sesiones drop constraint if exists sesiones_rol_valido;
alter table public.sesiones add constraint sesiones_rol_valido
  check (rol in ('alumno', 'admin', 'profesor'));

alter table public.sesiones drop constraint if exists sesiones_identidad_segun_rol;
alter table public.sesiones add constraint sesiones_identidad_segun_rol
  check (
    (rol = 'alumno'   and alumno_id is not null and email_admin is null     and teacher_id is null)
    or
    (rol = 'admin'    and alumno_id is null     and email_admin is not null and teacher_id is null)
    or
    (rol = 'profesor' and alumno_id is null     and email_admin is null     and teacher_id is not null)
  );

-- Para revocar de golpe las de un profesor al desactivarlo.
create index if not exists idx_sesiones_profesor_vivas
  on public.sesiones (teacher_id)
  where teacher_id is not null and revocada_en is null;


-- Sin esto, cada intento de un profesor fallaria contra la CHECK y solo
-- quedaria en el log.
alter table public.intentos_acceso drop constraint if exists intentos_acceso_rol_valido;
alter table public.intentos_acceso add constraint intentos_acceso_rol_valido
  check (rol in ('alumno', 'admin', 'profesor', 'desconocido'));

commit;


-- ---------------------------------------------------------------
-- COMPROBACION. Una sola consulta: `resultado` tiene que ser igual que
-- `esperado` en todas las filas. Si no, PARA y pasame la salida.
-- ---------------------------------------------------------------

select 'RLS en profesores_acceso' as comprobacion,
       (select c.relrowsecurity::text from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname = 'profesores_acceso') as resultado,
       'true' as esperado
union all
select 'politicas en profesores_acceso',
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profesores_acceso')::text,
       '0'
union all
select 'anon lee profesores_acceso', has_table_privilege('anon', 'public.profesores_acceso', 'select')::text, 'false'
union all
select 'authenticated lee profesores_acceso', has_table_privilege('authenticated', 'public.profesores_acceso', 'select')::text, 'false'
union all
select 'filas en profesores_acceso', (select count(*) from public.profesores_acceso)::text, '0'
union all
select 'sesiones con teacher_id', (select count(*) from public.sesiones where teacher_id is not null)::text, '0'
union all
select 'restricciones de sesiones e intentos',
       (select count(*) from pg_constraint
         where conname in ('sesiones_rol_valido', 'sesiones_identidad_segun_rol', 'intentos_acceso_rol_valido')
           and convalidated)::text,
       '3'
union all
select 'indices nuevos',
       (select count(*) from pg_indexes
         where schemaname = 'public'
           and indexname in ('idx_profesores_acceso_email_activo', 'idx_sesiones_profesor_vivas'))::text,
       '2';


-- ---------------------------------------------------------------
-- VUELTA ATRAS. Primero revierte el codigo de la Fase 1; despues
-- descomenta y ejecuta. CUIDADO: borra los accesos de profesores y sus
-- sesiones, y deja como 'desconocido' sus intentos de acceso. Las
-- restricciones antiguas no admiten esas filas.
--
--   begin;
--   delete from public.sesiones where rol = 'profesor';
--   update public.intentos_acceso set rol = 'desconocido' where rol = 'profesor';
--
--   alter table public.intentos_acceso drop constraint if exists intentos_acceso_rol_valido;
--   alter table public.intentos_acceso add constraint intentos_acceso_rol_valido
--     check (rol in ('alumno', 'admin', 'desconocido'));
--
--   alter table public.sesiones drop constraint if exists sesiones_identidad_segun_rol;
--   alter table public.sesiones drop constraint if exists sesiones_rol_valido;
--   drop index if exists public.idx_sesiones_profesor_vivas;
--   alter table public.sesiones drop column if exists teacher_id;
--   alter table public.sesiones add constraint sesiones_rol_valido
--     check (rol in ('alumno', 'admin'));
--   alter table public.sesiones add constraint sesiones_identidad_segun_rol
--     check (
--       (rol = 'alumno' and alumno_id is not null and email_admin is null)
--       or
--       (rol = 'admin'  and alumno_id is null     and email_admin is not null)
--     );
--
--   drop table if exists public.profesores_acceso;
--   commit;
-- ---------------------------------------------------------------
