-- ===============================================================
-- LAS ENTRADAS A CLASE POR LA PLATAFORMA
--
-- Un clic en «Unirse a la clase» por fila, en crudo. Lo escribe
-- `/clase/entrar` (`app/clase/entrar/route.ts`) antes de mandar al
-- alumno a su sala, y lo lee la sección «Entradas a clase» del panel.
--
-- MIDE EL CLIC, NO LA ASISTENCIA. Quien entra por el enlace de WhatsApp
-- o del calendario de Google no deja fila.
--
-- SIN DEDUPLICAR: tres clics a la misma clase son tres filas, y el panel
-- los cuenta como una (`resumirEntradas` en `lib/entradas-clase.ts`).
-- Sin IP ni user agent.
--
-- `clase_id` no es un id de Gestión, que no lo tiene —las clases son
-- celdas de un calendario—: es "fecha T hora | teacher_id", por ejemplo
-- "2026-10-12T17:00|t-123". Null, junto con `clase_inicio`, `profesor`
-- y `minutos_desde_inicio`, cuando el clic no cae entre los 30 minutos
-- antes del inicio y el final programado de ninguna clase.
--
-- Mientras la tabla no exista, el botón funciona igual: el registro
-- falla, se apunta en el log y el alumno entra a su clase. Se puede
-- desplegar el código antes de ejecutar esto.
--
-- Ejecutar en el SQL Editor del proyecto del LMS. Es idempotente.
-- ===============================================================

create table if not exists public.entradas_clase (
  id                    bigint generated always as identity primary key,
  -- El `students.id` de Gestión, como en el resto de tablas.
  alumno_id             text        not null,
  clase_id              text,
  -- El inicio programado de la clase, como instante.
  clase_inicio          timestamptz,
  profesor              text,
  profesor_id           text,
  clicked_at            timestamptz not null default now(),
  origen                text        not null default 'desconocido'
    check (origen in ('dashboard', 'mis_clases', 'calendario', 'email', 'desconocido')),
  -- Negativo: antes de empezar.
  minutos_desde_inicio  integer,

  -- Con clase, todo; sin clase, nada.
  constraint entradas_clase_asociada check (
    (clase_id is null and clase_inicio is null and minutos_desde_inicio is null)
    or
    (clase_id is not null and clase_inicio is not null and minutos_desde_inicio is not null)
  )
);

comment on table public.entradas_clase is
  'Clics en «Unirse a la clase» (/clase/entrar), uno por fila y sin deduplicar. No es asistencia: quien entra por otro enlace no aparece.';

-- El panel lee por mes; la ficha de un alumno, por alumno.
create index if not exists entradas_clase_clicked_at
  on public.entradas_clase (clicked_at);
create index if not exists entradas_clase_alumno
  on public.entradas_clase (alumno_id, clicked_at desc);

-- Como el resto: RLS sin políticas, y sin GRANT para los roles del
-- navegador. Solo entra la service key del servidor.
alter table public.entradas_clase enable row level security;
revoke all on public.entradas_clase from anon, authenticated;


-- ---------------------------------------------------------------
-- COMPROBAR
-- ---------------------------------------------------------------

select
  relrowsecurity                                                      as rls_activo,
  has_table_privilege('anon', 'public.entradas_clase', 'select')          as anon_lee,
  has_table_privilege('authenticated', 'public.entradas_clase', 'select') as authenticated_lee
from pg_class
where oid = 'public.entradas_clase'::regclass;
-- Esperado: true, false, false.


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   drop table if exists public.entradas_clase;
-- ---------------------------------------------------------------
