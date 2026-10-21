-- ===============================================================
-- INSTRUMENTACIÓN DEL PANEL: EXCLUSIONES, ACCESOS, EVENTOS Y
-- PANTALLA DE ORIGEN DE LOS BLOQUES
--
-- Ejecutar en el SQL Editor del proyecto del LMS (el de
-- LMS_SUPABASE_URL), NO en el de Gestión. Antes de pulsar «Run»,
-- comprueba que el ref del proyecto abierto es el de LMS_SUPABASE_URL.
--
-- ORDEN: este archivo primero; después `panel-metricas.sql`, que
-- lee las tablas que se crean aquí.
--
-- Idempotente: se puede ejecutar las veces que haga falta. El
-- deshacer está al final, comentado.
-- ===============================================================


-- ===============================================================
-- 1. QUIÉN NO CUENTA EN NINGUNA MÉTRICA
--
-- Un solo sitio para la lista. Lo leen todas las vistas y funciones del
-- panel (`panel-metricas.sql`) a través de `metricas_excluido()`, y
-- el servidor a través de la vista `metricas_excluidos`, que es la que
-- usa para lo que no se puede calcular aquí dentro (el cruce de
-- entradas a clase con los partes de Gestión).
--
-- Tres fuentes, y las tres pasan por la misma función:
--   · las cuentas de demostración: `cuentas_demo` y el prefijo `demo-`;
--   · las que se apuntan a mano en esta tabla: hoy, la cuenta de pruebas
--     de Facundo;
--   · un `alumno_id` nulo, que es una fila del equipo, nunca de un
--     alumno.
--
-- Lo generado por el equipo revisando una ficha no es una cuenta sino
-- una marca por fila (`bloques_generados.generado_por_equipo`), y se
-- filtra en la vista de bloques, que es la única tabla que la tiene: el
-- resto de escrituras del equipo no se apuntan.
-- ===============================================================

create table if not exists public.metricas_exclusiones (
  alumno_id  text        primary key,
  motivo     text        not null,
  creado_en  timestamptz not null default now()
);

comment on table public.metricas_exclusiones is
  'Alumnos que no cuentan en ninguna métrica del panel, además de las cuentas demo. Leer siempre a través de metricas_excluido().';

insert into public.metricas_exclusiones (alumno_id, motivo)
values ('s_1785879819493', 'Cuenta de pruebas de Facundo')
on conflict (alumno_id) do nothing;

alter table public.metricas_exclusiones enable row level security;
revoke all on public.metricas_exclusiones from anon, authenticated;

create or replace function public.metricas_excluido(p_alumno_id text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_alumno_id is null
      or p_alumno_id like 'demo-%'
      or exists (select 1 from public.cuentas_demo d where d.alumno_id = p_alumno_id)
      or exists (select 1 from public.metricas_exclusiones e where e.alumno_id = p_alumno_id);
$$;

comment on function public.metricas_excluido(text) is
  'true = no cuenta en el panel (demo, pruebas o fila sin alumno). La única regla de exclusión: todo lo del panel pasa por aquí.';

-- La lista entera, para el servidor.
create or replace view public.metricas_excluidos
with (security_invoker = on) as
select e.alumno_id, e.motivo from public.metricas_exclusiones e
union
select d.alumno_id, 'Cuenta de demostración' from public.cuentas_demo d;

revoke all on public.metricas_excluidos from anon, authenticated;


-- ===============================================================
-- 2. accesos — UNA FILA POR VISITA
--
-- `sesiones` solo guarda cuándo se INICIA una sesión, y la sesión dura
-- 30 días: quien vuelve con ella abierta no deja rastro (`ultimo_uso_en`
-- se sobrescribe). Esta tabla sí lo deja.
--
-- Una visita nueva es usar la plataforma cuando la última actividad
-- registrada tiene más de 30 minutos o no existe. Lo decide el servidor
-- (`lib/sesiones-lms.ts`), no la base. Los inicios de sesión —enlace
-- mágico y WooCommerce— también son una visita.
--
-- Sin días activos aparte: salen de aquí con `date_trunc`.
-- ===============================================================

create table if not exists public.accesos (
  id           bigint generated always as identity primary key,
  alumno_id    text        not null,
  iniciado_en  timestamptz not null default now()
);

comment on table public.accesos is
  'Una fila por visita a la plataforma (más de 30 min sin actividad = visita nueva). Los días activos se deducen de aquí.';

create index if not exists idx_accesos_alumno
  on public.accesos (alumno_id, iniciado_en);

-- El panel siempre pregunta por una ventana de tiempo, sin alumno.
create index if not exists idx_accesos_fecha
  on public.accesos (iniciado_en);

alter table public.accesos enable row level security;
revoke all on public.accesos from anon, authenticated;


-- ===============================================================
-- 3. eventos — LO QUE NO TIENE TABLA PROPIA
--
-- Clics en el banner de ampliar plan y uso del chat de ayuda. Una tabla
-- genérica en vez de una por cosa: son eventos sueltos, de un clic, y
-- lo que se pregunta de ellos es siempre «cuántos y de quién en este
-- rango».
--
-- `tipo` es un CHECK y no texto libre: un tipo mal escrito en el código
-- tiene que fallar al insertar, no aparecer como métrica nueva. Añadir
-- uno es rehacer la constraint (ver cómo se hizo con `modo` en
-- `lms-esquema.sql`).
--
-- `datos` lleva el detalle del evento: el `id` de la pregunta vista, la
-- pantalla desde la que se pulsó… Nunca texto escrito por el alumno.
-- ===============================================================

create table if not exists public.eventos (
  id         bigint generated always as identity primary key,
  alumno_id  text        not null,
  tipo       text        not null,
  creado_en  timestamptz not null default now(),
  datos      jsonb       not null default '{}'::jsonb,

  constraint eventos_datos_es_objeto
    check (jsonb_typeof(datos) = 'object')
);

alter table public.eventos drop constraint if exists eventos_tipo_valido;
alter table public.eventos
  add constraint eventos_tipo_valido
  check (tipo in (
    'banner_ampliar_clic',   -- pulsó «Amplía tu plan» / «Quiero ir más rápido»
    'chat_abierto',          -- abrió la ayuda
    'chat_pregunta_vista',   -- leyó una respuesta; datos.pregunta = id de lib/faq.ts
    'chat_a_whatsapp'        -- pasó a WhatsApp desde la ayuda
  ));

comment on table public.eventos is
  'Eventos sueltos de uso (banner de ampliar plan, chat de ayuda). Sin texto del alumno en datos.';

create index if not exists idx_eventos_tipo_fecha
  on public.eventos (tipo, creado_en);

create index if not exists idx_eventos_alumno
  on public.eventos (alumno_id, creado_en);

alter table public.eventos enable row level security;
revoke all on public.eventos from anon, authenticated;


-- ===============================================================
-- 4. bloques_generados.pantalla_origen
--
-- Desde qué pantalla se pidió el bloque. NULL = sin dato: todos los
-- anteriores al despliegue, y los del equipo y del script de demo, que
-- no pulsan ningún botón.
--
-- No confundir con `origen`, que dice QUIÉN lo escribió (la IA o el
-- banco de reserva), no desde dónde se pidió.
-- ===============================================================

alter table public.bloques_generados
  add column if not exists pantalla_origen text;

alter table public.bloques_generados
  drop constraint if exists bloques_generados_pantalla_origen_valida;

alter table public.bloques_generados
  add constraint bloques_generados_pantalla_origen_valida
  check (pantalla_origen is null or pantalla_origen in ('inicio', 'para_ti'));

comment on column public.bloques_generados.pantalla_origen is
  'Pantalla desde la que se pidió: inicio | para_ti. NULL = sin dato (anteriores al 2026-10 y los del equipo).';


-- ===============================================================
-- COMPROBACIÓN
--
-- Esperado: accesos, eventos y metricas_exclusiones con rls = true y
-- politicas = 0; anon_lee = false en las tres y en la vista; la columna
-- pantalla_origen existe; y la cuenta de pruebas sale como excluida.
-- ===============================================================

select c.relname as tabla, c.relrowsecurity as rls, count(p.policyname) as politicas,
       has_table_privilege('anon', c.oid, 'select') as anon_lee
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in ('accesos', 'eventos', 'metricas_exclusiones', 'metricas_excluidos')
group by c.relname, c.relrowsecurity, c.oid
order by c.relname;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'bloques_generados' and column_name = 'pantalla_origen';

select public.metricas_excluido('s_1785879819493') as pruebas_excluida,      -- true
       public.metricas_excluido('demo-diego-ruiz')  as demo_excluida,        -- true
       public.metricas_excluido(null)               as nulo_excluido,        -- true
       public.metricas_excluido('s_cualquiera')     as alumno_cuenta;        -- false


-- ===============================================================
-- DESHACER (comentado). Borra los datos de accesos y eventos.
-- ===============================================================

-- alter table public.bloques_generados drop constraint if exists bloques_generados_pantalla_origen_valida;
-- alter table public.bloques_generados drop column if exists pantalla_origen;
-- drop table if exists public.eventos;
-- drop table if exists public.accesos;
-- drop view if exists public.metricas_excluidos;
-- drop function if exists public.metricas_excluido(text);
-- drop table if exists public.metricas_exclusiones;
