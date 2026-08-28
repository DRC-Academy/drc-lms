-- ===============================================================
-- «TU OBJETIVO», ESCRITO PARA EL ALUMNO
--
-- Ejecutar en el SQL Editor del proyecto de LMS_SUPABASE_URL, el NUESTRO.
-- NO en el de DRC Gestión. Comprobación antes de pulsar «Run»: el ref
-- del proyecto abierto tiene que ser el de LMS_SUPABASE_URL.
--
-- Idempotente (`if not exists`): se puede volver a ejecutar. El rollback
-- está al final, comentado.
--
-- ---------------------------------------------------------------
-- POR QUÉ ESTO VIVE AQUÍ Y NO EN GESTIÓN
--
-- El sitio correcto de este texto es `student_profiles` de Gestión,
-- junto al original. No puede estar ahí: `lib/supabase-server.ts` es de
-- solo lectura —lo dice su cabecera y lo comprueba el type-checker— y
-- Gestión escribe por su cuenta sin locks, así que un update desde el
-- LMS es una colisión esperando.
--
-- Así que el LMS guarda su propia versión y la cruza al leer. Es un
-- apaño consciente. EL ARREGLO DE FONDO es que el prompt de Gestión
-- escriba dos versiones del objetivo, la del profesor y la del alumno,
-- y entonces esta tabla sobra: se vacía y el LMS vuelve a leer una sola
-- columna. Queda anotado también en `lib/texto-alumno.ts`.
--
-- ---------------------------------------------------------------
-- POR QUÉ SE GUARDA LA HUELLA DEL ORIGINAL
--
-- El texto de aquí es una reescritura de `objetivo_perfil` de Gestión,
-- y ese original cambia: la IA de Gestión rehace la ficha cuando el
-- alumno completa el formulario o cuando llegan clases nuevas. Sin
-- huella, el día que cambie el objetivo seguiríamos enseñando la
-- reescritura del anterior, que es la única forma de que esta tabla
-- mienta.
--
-- Con la huella, el LMS compara al leer: si no cuadra con el original de
-- hoy, se ignora la reescritura y se cae al texto de Gestión. Peor
-- redactado, pero cierto. Y el script la ve caducada y la rehace.
-- ===============================================================


-- La misma utilidad que crea `lms-esquema.sql`. Se repite para que este
-- archivo se pueda ejecutar solo; `create or replace` con el mismo
-- cuerpo no cambia nada si ya estaba.
create or replace function lms_tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;


-- ===============================================================
-- objetivos_alumno
--
-- Una fila por alumno como mucho: es SU objetivo, no un histórico.
-- Rehacerlo pisa el anterior, que es lo que se quiere —del texto viejo
-- no cuelga nada—.
-- ===============================================================

create table if not exists public.objetivos_alumno (
  -- `students.id` de Gestión, que es `text`. Igual que en el resto de
  -- tablas del LMS: aquí no se guarda ni el nombre ni el nivel.
  alumno_id       text        primary key,

  -- La reescritura en segunda persona. Es lo único que se enseña.
  texto           text        not null,

  -- SHA-256 en hexadecimal del `objetivo_perfil` de Gestión del que
  -- salió esta reescritura, ya normalizado. Ver la cabecera.
  origen_hash     text        not null,

  -- Con qué modelo se escribió. Cuando dentro de seis meses una tanda
  -- se lea peor que otra, esto es lo que dice por qué.
  modelo          text        not null,

  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  -- El original tiene 99 caracteres de mediana. 400 es holgado para dos
  -- frases y corta en seco cualquier respuesta del modelo que se haya
  -- ido por las ramas antes de que llegue a la pantalla.
  constraint objetivos_alumno_texto_acotado
    check (length(texto) between 10 and 400),

  constraint objetivos_alumno_huella_valida
    check (origen_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.objetivos_alumno is
  'Reescritura en segunda persona del objetivo que Gestión escribe en tercera. origen_hash caduca la fila cuando el original cambia.';

drop trigger if exists trg_objetivos_alumno_actualizado on public.objetivos_alumno;
create trigger trg_objetivos_alumno_actualizado
  before update on public.objetivos_alumno
  for each row execute function lms_tocar_actualizado_en();


-- ===============================================================
-- PERMISOS
--
-- Mismo trato que el resto de las tablas del LMS: RLS activado y sin
-- una sola política. El servidor entra con la service key y se salta
-- RLS; `anon` y `authenticated` no pueden hacer nada. A esta base no se
-- llega desde el navegador. Ver la nota larga en `lms-esquema.sql`.
-- ===============================================================

alter table public.objetivos_alumno enable row level security;

revoke all on public.objetivos_alumno from anon, authenticated;


-- ===============================================================
-- COMPROBACIÓN
-- ===============================================================

select
  c.relname            as tabla,
  c.relrowsecurity     as rls_activo,
  (select count(*) from public.objetivos_alumno) as filas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'objetivos_alumno';


-- ===============================================================
-- ROLLBACK
--
-- Borra las reescrituras. No es grave: el script las vuelve a hacer, y
-- mientras tanto la pantalla cae al texto de Gestión, que es lo que
-- enseñaba antes de todo esto.
-- ===============================================================

-- drop trigger if exists trg_objetivos_alumno_actualizado on public.objetivos_alumno;
-- drop table if exists public.objetivos_alumno;
