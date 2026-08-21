-- ===============================================================
-- AVISOS DE CONTENIDO DESBLOQUEADO
--
-- Dos tablas para recuperar el correo que LearnDash mandaba cuando el
-- drip abría contenido nuevo, y que se perdió al migrar.
--
-- QUÉ HACÍA LEARNDASH, para no repetirlo igual. Lo mandaba el add-on
-- «LearnDash Notifications», que dejó su rastro en el meta de usuario
-- del export:
--
--   ld_sent_notification_lesson_available_{plantilla}_{curso}_{modulo}
--
-- De ahí salen los números: 10.446 correos a 519 alumnos entre el
-- 28-10-2025 y el 11-08-2026, media de 20 por alumno y máximo de 185.
-- Y el problema: el 67% salió en RÁFAGAS de dos o más en menos de dos
-- minutos —hasta 14 de golpe—, porque mandaba un correo por módulo y el
-- drip abre dos cada siete días. 119 de los 519 recibieron más de tres
-- en su primera ráfaga.
--
-- Aquí se agrupa POR ALUMNO: un correo por alumno y día, con todo lo
-- que se le haya abierto, en los dos cursos si tiene dos.
--
-- LA CLAVE DE DEDUPLICACIÓN ES LA MISMA que usaba LearnDash —(alumno,
-- módulo)— pero relacional y con estado, en vez de una fila de meta por
-- envío.
-- ===============================================================


-- ===============================================================
-- 1. avisos_modulo
--
-- Un aviso por alumno y módulo, PARA SIEMPRE. El UNIQUE es lo que
-- garantiza que nadie recibe dos veces el mismo módulo aunque el cron
-- corra varias veces al día, se reintente a mano o Vercel lo dispare
-- por duplicado.
--
-- LOS TRES ESTADOS:
--
--   · `sembrado`  — el módulo ya estaba abierto cuando esto se puso en
--                   marcha. Se marca para que nunca genere un correo:
--                   anunciar hoy contenido de hace meses es peor que no
--                   anunciarlo. Lo escribe el modo `sembrar`, que no
--                   envía nada.
--
--   · `reservado` — se ha reclamado para enviarlo. Se escribe ANTES de
--                   hablar con Resend, que es lo que hace imposible el
--                   duplicado: si dos ejecuciones coinciden, la segunda
--                   choca contra el UNIQUE y no envía. Si el envío
--                   falla, la fila se borra y el siguiente día lo
--                   reintenta —sigue dentro de la ventana de 2 días—.
--
--   · `enviado`   — confirmado por Resend, con su id por si hay que
--                   rastrear un correo concreto en su panel.
--
-- Una fila que se quede en `reservado` es un correo que salió pero cuya
-- confirmación no llegó a escribirse (el proceso murió justo ahí). Se
-- trata como enviado a propósito: preferimos un aviso perdido a uno
-- repetido.
-- ===============================================================

create table if not exists public.avisos_modulo (
  id          uuid        primary key default gen_random_uuid(),

  -- El `id` de `students` en Gestión. Sin clave ajena: Gestión es otra
  -- base y además de solo lectura.
  alumno_id   text        not null,
  modulo_id   uuid        not null references public.modulos(id) on delete cascade,

  estado      text        not null default 'reservado',
  creado_en   timestamptz not null default now(),
  enviado_en  timestamptz,

  -- El id que devuelve Resend. Null en `sembrado` y mientras está
  -- `reservado`.
  resend_id   text,

  constraint avisos_modulo_estado_valido
    check (estado in ('sembrado', 'reservado', 'enviado')),

  -- EL CORAZÓN DE TODO ESTO.
  constraint avisos_modulo_uno_por_alumno
    unique (alumno_id, modulo_id)
);

comment on table public.avisos_modulo is
  'Qué módulo se le ha avisado ya a cada alumno. UNIQUE (alumno_id, modulo_id): un módulo se avisa una vez y solo una.';


-- ===============================================================
-- 2. avisos_preferencias
--
-- La baja. Es comunicación de servicio —el alumno está matriculado— y
-- aun así lleva enlace de baja, por una razón práctica: sin él, quien
-- no los quiera marca el correo como spam, y eso daña la reputación de
-- drcacademy.com, que es el dominio desde el que sale el enlace de
-- acceso. Perder avisos de contenido es asumible; perder el magic link
-- en la carpeta de spam, no.
--
-- SOLO SE GUARDA LO EXCEPCIONAL: no hay fila para quien no ha tocado
-- nada. Sin fila = recibe avisos. Así no hace falta sembrar 172 filas
-- ni acordarse de crear una por cada alumno nuevo de Gestión.
-- ===============================================================

create table if not exists public.avisos_preferencias (
  alumno_id     text        primary key,

  -- Se guarda el valor y no solo la baja para que volver a activarlos
  -- sea una fila que cambia, y no una que se borra: así queda la fecha
  -- de cuándo lo hizo.
  avisos_email  boolean     not null default true,

  actualizado_en timestamptz not null default now(),

  -- Quién lo cambió: 'alumno' desde el enlace del correo, o el email de
  -- un administrador si algún día se toca desde el panel.
  origen        text        not null default 'alumno'
);

comment on table public.avisos_preferencias is
  'Bajas de los avisos de contenido nuevo. Sin fila = los recibe.';


-- ===============================================================
-- ÍNDICES
--
-- El UNIQUE de `avisos_modulo` ya crea su índice y cubre la consulta
-- que más se hace: «¿le he avisado ya de este módulo?». Se añade uno
-- por alumno para la lectura en bloque del cron, que se trae de una vez
-- todo lo avisado y cruza en memoria.
-- ===============================================================

create index if not exists idx_avisos_modulo_alumno
  on public.avisos_modulo (alumno_id);

create index if not exists idx_avisos_modulo_estado
  on public.avisos_modulo (estado);


-- ===============================================================
-- RLS
--
-- Activado y SIN POLÍTICAS, como el resto del esquema. El LMS entra
-- siempre desde el servidor con la secret key, que se salta RLS; sin
-- políticas, `anon` y `authenticated` no pueden leer ni escribir nada.
--
-- Aquí importa especialmente: `avisos_modulo` cruza ids de alumno con
-- contenido, y `avisos_preferencias` dice quién se ha dado de baja.
-- ===============================================================

alter table public.avisos_modulo       enable row level security;
alter table public.avisos_preferencias enable row level security;


-- ===============================================================
-- COMPROBACIÓN
--
-- Después de ejecutar, esto tiene que devolver dos filas con `rls` en
-- true y cero políticas.
-- ===============================================================

select c.relname as tabla,
       c.relrowsecurity as rls,
       count(p.policyname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in ('avisos_modulo', 'avisos_preferencias')
group by c.relname, c.relrowsecurity
order by c.relname;


-- ===============================================================
-- ROLLBACK
--
-- Descomentar y ejecutar para deshacerlo.
--
-- OJO CON `avisos_modulo`: borrarla es borrar la memoria de qué se ha
-- avisado. Si se vuelve a crear vacía y el cron corre antes que
-- `sembrar`, los alumnos reciben otra vez avisos de módulos que ya se
-- les anunciaron. Si hay que recrearla, sembrar inmediatamente después.
-- ===============================================================

-- drop table if exists public.avisos_modulo;
-- drop table if exists public.avisos_preferencias;
