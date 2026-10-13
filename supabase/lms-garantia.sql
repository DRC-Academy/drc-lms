-- ===============================================================
-- LA GARANTÍA DEL PLAN, EN LA BASE DEL LMS
--
-- Dos tablas:
--
--   garantia_estado     una fila por alumno: el veredicto vigente.
--   garantia_historial  una fila por cada cambio de estado, sea del
--                       cálculo diario o de una corrección a mano.
--
-- Las escribe el cron diario (`app/api/garantia/route.ts`) y la
-- corrección del panel (`app/acciones-garantia.ts`); las lee `/garantia`.
-- El cálculo es `lib/garantia.ts` y lo que guarda, cómo, en
-- `lib/garantia-servidor.ts`.
--
-- TRES REGLAS QUE VIVEN AQUÍ Y NO EN EL CÁLCULO:
--
--   1. LA PÉRDIDA ES DEFINITIVA. Una fila en 'perdida' no la cambia el
--      cálculo, aunque mañana los datos de Gestión digan otra cosa. Solo
--      la saca una corrección a mano.
--   2. LA PRUEBA SE COPIA. Al pasar a 'perdida' se guarda en `evidencia`
--      el parte o la semana que la justificó tal como estaban ese día:
--      los partes de Gestión se pueden editar o revertir después.
--   3. LA CORRECCIÓN MANDA. Con `corregido = true` el cálculo sigue
--      anotando lo que él diría (`estado_calculado`), pero no toca el
--      estado. Quién, cuándo y por qué quedan en la fila y en el
--      historial.
--
-- EL AVISO AL EQUIPO es por fila del historial (`aviso_enviado_en`):
-- un correo por cada paso a 'perdida' del cálculo, nunca dos.
--
-- Ejecutar en el SQL Editor del proyecto del LMS. Es idempotente.
-- Mientras no exista, `/garantia` lo dice y el cron no hace nada.
-- ===============================================================

create table if not exists public.garantia_estado (
  -- El `students.id` de Gestión, como en el resto de tablas.
  alumno_id         text        primary key,
  estado            text        not null
    check (estado in ('en_curso', 'perdida', 'cumplida', 'sin_datos')),
  motivo            text        not null,
  fecha_perdida     date,
  -- La copia de lo que la hizo perder. Solo con 'perdida'.
  evidencia         jsonb,
  calculado_en      timestamptz not null default now(),

  -- Lo que diría el cálculo hoy, aunque el estado esté corregido o
  -- fijado como perdida. Para ver de un vistazo si discrepan.
  estado_calculado  text
    check (estado_calculado in ('en_curso', 'perdida', 'cumplida', 'sin_datos')),
  motivo_calculado  text,

  corregido         boolean     not null default false,
  corregido_por     text,
  corregido_en      timestamptz,
  nota_correccion   text,

  constraint garantia_estado_correccion_completa check (
    not corregido
    or (corregido_por is not null and corregido_en is not null and btrim(coalesce(nota_correccion, '')) <> '')
  ),
  constraint garantia_estado_perdida_con_fecha check (
    estado <> 'perdida' or fecha_perdida is not null or corregido
  )
);

comment on table public.garantia_estado is
  'Veredicto vigente de la garantía por alumno. Una perdida no la deshace el cálculo; una corrección a mano manda sobre el cálculo.';


create table if not exists public.garantia_historial (
  id                bigint      generated always as identity primary key,
  alumno_id         text        not null,
  estado_anterior   text,
  estado            text        not null
    check (estado in ('en_curso', 'perdida', 'cumplida', 'sin_datos')),
  motivo            text        not null,
  fecha_perdida     date,
  evidencia         jsonb,
  -- 'calculo': el cron. 'correccion': el equipo a mano.
  -- 'fin_correccion': el equipo devuelve el alumno al cálculo.
  origen            text        not null
    check (origen in ('calculo', 'correccion', 'fin_correccion')),
  -- Email del administrador en las correcciones; null en el cálculo.
  autor             text,
  nota              text,
  creado_en         timestamptz not null default now(),
  -- El correo al equipo de un paso a 'perdida'. Se reserva poniendo la
  -- fecha ANTES de enviar y se suelta si el envío falla.
  aviso_enviado_en  timestamptz,

  constraint garantia_historial_correccion_con_nota check (
    origen = 'calculo' or (autor is not null and btrim(coalesce(nota, '')) <> '')
  )
);

comment on table public.garantia_historial is
  'Cada cambio de estado de la garantía, del cálculo o a mano. aviso_enviado_en: el correo al equipo de un paso a perdida.';

create index if not exists garantia_historial_alumno
  on public.garantia_historial (alumno_id, creado_en desc);

-- Los avisos que faltan por mandar: pocos y siempre los mismos.
create index if not exists garantia_historial_avisos_pendientes
  on public.garantia_historial (creado_en)
  where estado = 'perdida' and origen = 'calculo' and aviso_enviado_en is null;

-- Como el resto: RLS sin políticas, y sin GRANT para los roles del
-- navegador. Solo entra la service key del servidor.
alter table public.garantia_estado enable row level security;
alter table public.garantia_historial enable row level security;
revoke all on public.garantia_estado from anon, authenticated;
revoke all on public.garantia_historial from anon, authenticated;


-- ---------------------------------------------------------------
-- COMPROBAR
-- ---------------------------------------------------------------

select
  c.relname                                                    as tabla,
  c.relrowsecurity                                             as rls_activo,
  has_table_privilege('anon', c.oid, 'select')                 as anon_lee,
  has_table_privilege('authenticated', c.oid, 'select')        as authenticated_lee,
  (select count(*) from pg_policies p where p.tablename = c.relname) as politicas
from pg_class c
where c.oid in ('public.garantia_estado'::regclass, 'public.garantia_historial'::regclass);
-- Esperado, en las dos: true, false, false, 0.


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   drop table if exists public.garantia_historial;
--   drop table if exists public.garantia_estado;
-- ---------------------------------------------------------------
