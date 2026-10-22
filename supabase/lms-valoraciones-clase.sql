-- ===============================================================
-- LA VALORACIÓN DE CLASES
--
-- Una fila por alumno y clase: las estrellas y el comentario que deja
-- desde «Mis clases» o desde el pop-up de después de la clase, o solo
-- `descartada_en` si cerró el pop-up sin valorar. La escriben las
-- acciones de `app/acciones-valoraciones.ts` y la lee la sección
-- «Valoraciones de clase» del panel (`/valoraciones`).
--
-- `clase_id` es el `parte_id` de `vista_partes_clase` en Gestión
-- (`class_records.id`, "cr_…"). El profesor y la fecha se COPIAN al
-- valorar: la valoración sigue siendo de quien dio la clase aunque el
-- alumno cambie de profesor o el parte cambie después.
--
-- Qué clase se puede valorar lo decide `lib/valoraciones.ts`, y el
-- servidor lo vuelve a comprobar antes de escribir.
--
-- Mientras la tabla no exista, el LMS no enseña ni el botón ni el
-- pop-up: se puede desplegar el código antes de ejecutar esto.
--
-- Ejecutar en el SQL Editor del proyecto del LMS. Es idempotente.
-- ===============================================================

create table if not exists public.valoraciones_clase (
  id               uuid        primary key default gen_random_uuid(),
  -- El `students.id` de Gestión, como en el resto de tablas.
  alumno_id        text        not null,
  clase_id         text        not null,
  profesor_id      text,
  profesor_nombre  text,
  -- El inicio de la clase; sin hora en el parte, las 00:00 de Madrid de ese día.
  fecha_clase      timestamptz not null,
  -- Null: solo se descartó.
  estrellas        smallint    check (estrellas between 1 and 5),
  comentario       text        check (char_length(comentario) <= 1000),
  descartada_en    timestamptz,
  -- Por dónde se escribió la fila la primera vez. No cambia al editar.
  origen           text        not null check (origen in ('popup', 'mis_clases')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint valoraciones_clase_unica unique (alumno_id, clase_id),
  -- O tiene estrellas, o se descartó.
  constraint valoraciones_clase_con_algo check (estrellas is not null or descartada_en is not null)
);

comment on table public.valoraciones_clase is
  'Valoraciones de clase del alumno (1–5 estrellas y comentario), o pop-ups descartados. clase_id = parte_id de vista_partes_clase en Gestión.';

-- El panel lee por fecha; la pantalla del alumno, por alumno (el único ya lo cubre).
create index if not exists valoraciones_clase_fecha
  on public.valoraciones_clase (fecha_clase desc);

-- Como el resto: RLS sin políticas, y sin GRANT para los roles del
-- navegador. Solo entra la service key del servidor.
alter table public.valoraciones_clase enable row level security;
revoke all on public.valoraciones_clase from anon, authenticated;


-- ---------------------------------------------------------------
-- COMPROBAR
-- ---------------------------------------------------------------

select
  relrowsecurity                                                              as rls_activo,
  has_table_privilege('anon', 'public.valoraciones_clase', 'select')          as anon_lee,
  has_table_privilege('authenticated', 'public.valoraciones_clase', 'select') as authenticated_lee
from pg_class
where oid = 'public.valoraciones_clase'::regclass;
-- Esperado: true, false, false.


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   drop table if exists public.valoraciones_clase;
-- ---------------------------------------------------------------
