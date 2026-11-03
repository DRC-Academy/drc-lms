-- ===============================================================
-- EL AVISO DE «PARA TI»
--
-- Una fila cada vez que un alumno cierra sin usarlo el pop-up que le
-- avisa de que aún no ha probado «Para ti» (X, Escape o el fondo). Con
-- 3 filas el pop-up no vuelve a salir. Lo escribe
-- `app/acciones-aviso-para-ti.ts` y lo lee `lib/aviso-para-ti-servidor.ts`.
--
-- Mientras la tabla no exista, el pop-up no sale: se puede desplegar el
-- código antes de ejecutar esto.
--
-- Ejecutar en el SQL Editor del proyecto del LMS. Es idempotente.
-- ===============================================================

create table if not exists public.aviso_para_ti_cierres (
  id          bigint      generated always as identity primary key,
  -- El `students.id` de Gestión, como en el resto de tablas.
  alumno_id   text        not null,
  cerrado_en  timestamptz not null default now()
);

comment on table public.aviso_para_ti_cierres is
  'Cierres del pop-up «Aún no has probado la sección Para ti». Con 3 por alumno deja de salir.';

create index if not exists aviso_para_ti_cierres_alumno
  on public.aviso_para_ti_cierres (alumno_id);

-- Como el resto: RLS sin políticas, y sin GRANT para los roles del
-- navegador. Solo entra la service key del servidor.
alter table public.aviso_para_ti_cierres enable row level security;
revoke all on public.aviso_para_ti_cierres from anon, authenticated;
