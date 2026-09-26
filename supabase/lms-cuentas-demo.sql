-- ===============================================================
-- CUENTAS DE DEMOSTRACIÓN
--
-- Ejecutar en el SQL Editor del proyecto del LMS (el de
-- LMS_SUPABASE_URL). NUNCA en el de DRC Gestión.
--
-- Una fila aquí convierte un `alumno_id` en una cuenta de demostración:
-- `lib/gestion.ts` deja de preguntarle a Gestión por ese alumno y
-- contesta con los datos de ejemplo de `lib/demo/`. En Gestión no se
-- escribe nada, ni aquí ni en ningún otro sitio.
--
-- `ancla` es el día desde el que se cuentan todas las fechas de la
-- demo (la matrícula, las clases, la próxima clase). Lo fija
-- `npm run demo:crear` y lo mueve `npm run demo:rejuvenecer`.
--
-- Idempotente. Para deshacerlo, al final, comentado.
-- ===============================================================

create table if not exists public.cuentas_demo (
  alumno_id          text        primary key,
  email_normalizado  text        not null unique,
  ancla              date        not null,
  creada_en          timestamptz not null default now(),

  -- El prefijo es lo que deja a `lib/demo/cuenta.ts` descartar a un
  -- alumno real sin consultar nada: los ids de Gestión son `s_…` o uuid.
  constraint cuentas_demo_id_con_prefijo
    check (alumno_id like 'demo-%'),
  constraint cuentas_demo_email_normalizado
    check (email_normalizado = lower(trim(email_normalizado)))
);

comment on table public.cuentas_demo is
  'Cuentas de demostración. Sus datos de Gestión salen de lib/demo/, no de Gestión. No cuentan en el panel ni reciben avisos.';

alter table public.cuentas_demo enable row level security;
revoke all on public.cuentas_demo from anon, authenticated;

-- Comprobación: una fila, RLS activo y ninguna política.
select c.relname as tabla, c.relrowsecurity as rls, count(p.policyname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public' and c.relname = 'cuentas_demo'
group by c.relname, c.relrowsecurity;

-- Para deshacerlo (antes, `npm run demo:borrar`):
-- drop table if exists public.cuentas_demo;
