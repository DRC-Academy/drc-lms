-- ===============================================================
-- PASES DE CURSO (BLACK PASS)
--
-- ⚠ SE EJECUTA EN LA BASE DEL LMS (LMS_SUPABASE_URL), NO EN GESTIÓN.
-- Antes de pulsar «Run», comprueba el ref del proyecto abierto.
--
-- Va entero en una transacción: si algo falla, no queda nada a medias.
-- Es idempotente: se puede volver a ejecutar. El deshacer está al final.
--
-- QUÉ ES UN PASE. Acceso de pago único a todos los cursos, sin drip y
-- con fecha de fin. SE SUMA a lo que el alumno tenga por su plan: no lo
-- sustituye ni lo toca.
--
-- QUIÉN ES EL COMPRADOR. Si tiene ficha en Gestión, `alumno_id` es el de
-- la ficha y su progreso sigue donde está. Si no, un id propio
-- `pase-<uuid>`, del que `lib/gestion.ts` no pregunta nada a Gestión. Si
-- luego le crean ficha, `fundir_pase_en_ficha` lo mueve todo a ella.
--
-- SOLO EL SERVIDOR. RLS activado y sin políticas, como el resto del
-- esquema, y las funciones solo para `service_role`.
-- ===============================================================

begin;


-- ===============================================================
-- ANTES DE NADA: QUE `metricas_excluido()` SEA LA QUE ESPERO
--
-- Más abajo se recrea con una condición más. Si la de producción se
-- hubiera cambiado a mano, recrearla perdería ese cambio, así que se
-- compara y, si no coincide, aquí se para todo sin haber tocado nada.
-- ===============================================================

do $$
declare
  actual text;
  sin_pase constant text :=
    'select p_alumno_id is null or p_alumno_id like ''demo-%'' or exists (select 1 from public.cuentas_demo d where d.alumno_id = p_alumno_id) or exists (select 1 from public.metricas_exclusiones e where e.alumno_id = p_alumno_id);';
  con_pase constant text :=
    'select p_alumno_id is null or p_alumno_id like ''demo-%'' or p_alumno_id like ''pase-%'' or exists (select 1 from public.cuentas_demo d where d.alumno_id = p_alumno_id) or exists (select 1 from public.metricas_exclusiones e where e.alumno_id = p_alumno_id);';
begin
  select btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g')) into actual
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'metricas_excluido';

  if actual is null then
    raise exception 'No existe public.metricas_excluido(): ¿es la base del LMS?';
  end if;

  if actual not in (sin_pase, con_pase) then
    raise exception 'metricas_excluido() no es la esperada. No se ha cambiado nada. Definición actual: %', actual;
  end if;
end $$;


-- ===============================================================
-- 1. pases_curso — UNA FILA POR PASE
--
-- La idempotencia del pedido es el UNIQUE de `wc_order_id`: un pedido
-- nunca crea dos pases. Los manuales no tienen pedido, y Postgres deja
-- pasar varios NULL.
--
-- Nada se borra: quitar un pase es marcarlo `revocado`, y `acceso_hasta`
-- no cambia, de modo que reactivarlo devuelve la misma fecha.
--
-- `bloqueado_manual`: lo quitó una persona. La conciliación ve el pedido
-- pagado y, sin esta marca, se lo devolvería a los cinco minutos.
-- ===============================================================

create table if not exists public.pases_curso (
  id                uuid        primary key default gen_random_uuid(),
  alumno_id         text        not null,
  email_normalizado text        not null,
  woo_user_id       bigint,
  -- El comprador sin ficha no tiene otro sitio del que sacar el nombre.
  nombre            text,

  tipo              text        not null default 'black_pass',
  origen            text        not null,
  wc_order_id       bigint      unique,
  wc_producto_id    bigint,

  inicio            timestamptz not null,
  acceso_hasta      timestamptz not null,

  estado            text        not null default 'activo',
  bloqueado_manual  boolean     not null default false,
  -- Pedido del producto de prueba: mismo flujo, fuera de las cuentas.
  es_prueba         boolean     not null default false,

  -- 'woocommerce' o el email del administrador, de su cookie.
  concedido_por     text        not null,
  motivo            text,

  revocado_en       timestamptz,
  revocado_por      text,
  motivo_revocacion text,

  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),

  constraint pases_curso_tipo_valido
    check (tipo in ('black_pass')),
  constraint pases_curso_origen_valido
    check (origen in ('pedido', 'manual')),
  constraint pases_curso_estado_valido
    check (estado in ('activo', 'revocado')),
  constraint pases_curso_pedido_segun_origen
    check ((origen = 'pedido') = (wc_order_id is not null)),
  constraint pases_curso_fechas
    check (acceso_hasta > inicio),
  constraint pases_curso_email_normalizado
    check (length(email_normalizado) > 0 and email_normalizado = lower(btrim(email_normalizado))),
  constraint pases_curso_revocacion_completa
    check ((estado = 'revocado') = (revocado_en is not null)
       and (revocado_en is null) = (revocado_por is null))
);

comment on table public.pases_curso is
  'Pases de pago único. Se suman al plan. Nada se borra: revocar es cambiar el estado.';

-- `accesoDelAlumno` lo pregunta en cada petición de cada alumno.
create index if not exists idx_pases_curso_alumno_activo
  on public.pases_curso (alumno_id, acceso_hasta)
  where estado = 'activo';
create index if not exists idx_pases_curso_email
  on public.pases_curso (email_normalizado);
create index if not exists idx_pases_curso_woo_user
  on public.pases_curso (woo_user_id)
  where woo_user_id is not null;

drop trigger if exists trg_pases_curso_actualizado on public.pases_curso;
create trigger trg_pases_curso_actualizado
  before update on public.pases_curso
  for each row execute function public.lms_tocar_actualizado_en();


-- ===============================================================
-- 2. pases_eventos — LO QUE LLEGA POR EL WEBHOOK
--
-- Solo de pedidos de estos productos: el resto de la tienda trae datos de
-- clientes que aquí no hacen falta. Se borra a los 90 días
-- (`purgar_pases_eventos`), porque el cuerpo lleva datos personales.
-- ===============================================================

create table if not exists public.pases_eventos (
  id            bigint generated always as identity primary key,
  recibido_en   timestamptz not null default now(),
  wc_order_id   bigint      not null,
  topic         text,
  cuerpo        jsonb       not null,
  procesado_en  timestamptz,
  intentos      integer     not null default 0,
  error         text
);

create index if not exists idx_pases_eventos_pendientes
  on public.pases_eventos (recibido_en)
  where procesado_en is null;
create index if not exists idx_pases_eventos_pedido
  on public.pases_eventos (wc_order_id);


-- ===============================================================
-- 3. pases_log — QUÉ SE HIZO CON CADA PEDIDO, Y LAS ALERTAS DEL PANEL
--
-- Una alerta es una fila con `alerta` puesta y sin resolver. Solo puede
-- haber una abierta por pedido y tipo: sin esto, una disputa daría una
-- alerta nueva cada cinco minutos.
-- ===============================================================

create table if not exists public.pases_log (
  id            bigint generated always as identity primary key,
  en            timestamptz not null default now(),
  wc_order_id   bigint,
  pase_id       uuid        references public.pases_curso(id) on delete set null,
  email         text,
  estado_wc     text,
  accion        text        not null,
  email_enviado boolean,
  error         text,
  origen        text        not null,
  detalle       jsonb       not null default '{}'::jsonb,
  alerta        text,
  resuelta_en   timestamptz,
  resuelta_por  text,

  constraint pases_log_accion_valida
    check (accion in (
      'concedido', 'reactivado', 'ya_activo', 'bloqueado_manual', 'revocado',
      'sin_accion', 'reembolso_parcial', 'no_es_pase', 'error',
      'correo_enviado', 'correo_fallido', 'correo_reenviado',
      'manual_concedido', 'manual_revocado', 'manual_reactivado',
      'fusionado', 'alerta'
    )),
  constraint pases_log_origen_valido
    check (origen in ('webhook', 'conciliacion', 'panel', 'cola', 'entrada', 'base')),
  constraint pases_log_alerta_valida
    check (alerta is null or alerta in (
      'espera_tras_conceder',  -- concedido y ahora on-hold: posible disputa
      'pedido_en_papelera',
      'correo_fallido',
      'compra_duplicada',
      'pedido_sin_fecha_pago',
      'webhook_no_activo'
    )),
  constraint pases_log_resolucion_completa
    check ((resuelta_en is null) = (resuelta_por is null))
);

comment on table public.pases_log is
  'Registro de cada pedido procesado y alertas del panel /black-pass. Se escribe con registrar_pase_log().';

create unique index if not exists idx_pases_log_una_alerta_abierta
  on public.pases_log (wc_order_id, alerta)
  where alerta is not null and resuelta_en is null;
create index if not exists idx_pases_log_pedido
  on public.pases_log (wc_order_id, en desc);
create index if not exists idx_pases_log_alertas
  on public.pases_log (en desc)
  where alerta is not null and resuelta_en is null;


-- ===============================================================
-- 4. correos_cola — EL ENVÍO, FUERA DEL WEBHOOK
--
-- `clave` es lo que impide mandar dos veces el correo de un pedido, y
-- también la clave de idempotencia que se le pasa a Resend: si un proceso
-- muere entre enviar y confirmar, el reintento no llega duplicado.
--
-- `enviando` con `reservado_hasta` vencido es un envío huérfano: vuelve
-- a la cola.
-- ===============================================================

create table if not exists public.correos_cola (
  id                 uuid        primary key default gen_random_uuid(),
  clave              text        not null unique,
  tipo               text        not null,
  pase_id            uuid        references public.pases_curso(id) on delete set null,
  destinatario       text        not null,
  estado             text        not null default 'pendiente',
  intentos           integer     not null default 0,
  proximo_intento_en timestamptz not null default now(),
  reservado_hasta    timestamptz,
  resend_id          text,
  ultimo_error       text,
  creado_en          timestamptz not null default now(),
  enviado_en         timestamptz,

  constraint correos_cola_tipo_valido
    check (tipo in ('acceso_black_pass')),
  constraint correos_cola_estado_valido
    check (estado in ('pendiente', 'enviando', 'enviado', 'fallido', 'cancelado'))
);

create index if not exists idx_correos_cola_por_enviar
  on public.correos_cola (proximo_intento_en)
  where estado in ('pendiente', 'enviando');
create index if not exists idx_correos_cola_pase
  on public.correos_cola (pase_id);


-- ===============================================================
-- 5. curso_elegido — POR QUÉ CURSO VA
--
-- Con siete cursos abiertos, el inicio y «Mi curso» tienen que saber cuál
-- es el suyo. Lo fija la pantalla de elegir curso y el selector del curso.
-- ===============================================================

create table if not exists public.curso_elegido (
  alumno_id   text        primary key,
  curso_id    uuid        not null references public.cursos(id) on delete cascade,
  elegido_en  timestamptz not null default now()
);


-- ===============================================================
-- 6. LOS DOS PUNTOS ÚNICOS: CONCILIACIÓN Y RITMO DE RESEND
-- ===============================================================

create table if not exists public.pases_conciliacion (
  id               boolean     primary key default true,
  -- Hasta qué `date_modified` de Woo se ha mirado. Solo avanza si la
  -- pasada termina bien. Arranca en la creación del producto.
  cursor_en        timestamptz not null default '2026-11-04 00:00:00+00',
  bloqueado_hasta  timestamptz,
  ultima_ok_en     timestamptz,
  ultimo_error     text,
  webhook_estado   text,
  webhook_visto_en timestamptz,
  constraint pases_conciliacion_una_fila check (id)
);
insert into public.pases_conciliacion (id) values (true) on conflict (id) do nothing;

-- El ritmo se comparte entre instancias: es la misma clave de Resend para
-- la cola y para el magic link.
create table if not exists public.resend_ritmo (
  id         boolean     primary key default true,
  proximo_en timestamptz not null default now(),
  constraint resend_ritmo_una_fila check (id)
);
insert into public.resend_ritmo (id) values (true) on conflict (id) do nothing;


-- ===============================================================
-- 7. FUNCIONES
-- ===============================================================

/** Fin del día en Madrid, N meses después del pago. */
create or replace function public.pase_hasta(p_pagado_en timestamptz, p_meses integer)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (((p_pagado_en at time zone 'Europe/Madrid')::date
            + make_interval(months => p_meses))::date
          + time '23:59:59') at time zone 'Europe/Madrid';
$$;


/**
 * Apunta en el registro. Sin ruido: si el webhook o la conciliación repiten
 * lo último de ese pedido (mismo estado y acción, sin error ni alerta), no
 * escribe otra fila, porque la conciliación relee los mismos pedidos con
 * solape. Lo que hace una persona o la cola siempre se apunta. Una alerta
 * ya abierta tampoco se repite. Devuelve si escribió.
 */
create or replace function public.registrar_pase_log(
  p_origen        text,
  p_accion        text,
  p_wc_order_id   bigint  default null,
  p_pase_id       uuid    default null,
  p_email         text    default null,
  p_estado_wc     text    default null,
  p_email_enviado boolean default null,
  p_error         text    default null,
  p_detalle       jsonb   default '{}'::jsonb,
  p_alerta        text    default null
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  escritas integer;
begin
  if p_origen in ('webhook', 'conciliacion')
     and p_wc_order_id is not null and p_alerta is null and p_error is null and exists (
    select 1
      from (select l.estado_wc, l.accion
              from public.pases_log l
             where l.wc_order_id = p_wc_order_id and l.alerta is null
             order by l.en desc, l.id desc
             limit 1) ultimo
     where ultimo.accion = p_accion
       and ultimo.estado_wc is not distinct from p_estado_wc
  ) then
    return false;
  end if;

  insert into public.pases_log
    (wc_order_id, pase_id, email, estado_wc, accion, email_enviado, error, origen, detalle, alerta)
  values
    (p_wc_order_id, p_pase_id, p_email, p_estado_wc, p_accion, p_email_enviado, p_error, p_origen, p_detalle, p_alerta)
  on conflict (wc_order_id, alerta) where alerta is not null and resuelta_en is null
  do nothing;

  get diagnostics escritas = row_count;
  return escritas > 0;
end;
$$;


/**
 * Mueve a la ficha todo lo de un comprador sin ficha. Idempotente.
 *
 * Solo las tablas a las que puede llegar alguien sin ficha: curso y
 * entradas. Práctica, clases, valoraciones, garantía y avisos le están
 * cerrados, y no tiene fila en `alumno_vinculos`.
 *
 * Sus sesiones se revocan y no se mueven: la cookie lleva el id viejo
 * firmado dentro. Quien llama a esto está abriendo una sesión nueva.
 */
create or replace function public.fundir_pase_en_ficha(p_pase_alumno_id text, p_ficha_id text)
returns table (lecciones integer, intentos integer, pases integer)
language plpgsql
set search_path = ''
as $$
declare
  n_lecciones integer;
  n_intentos  integer;
  n_pases     integer;
begin
  if p_pase_alumno_id is null or p_pase_alumno_id not like 'pase-%' then
    raise exception 'fundir_pase_en_ficha: % no es un id de pase', p_pase_alumno_id;
  end if;
  if p_ficha_id is null or btrim(p_ficha_id) = '' or p_ficha_id like 'pase-%' then
    raise exception 'fundir_pase_en_ficha: % no es una ficha', p_ficha_id;
  end if;

  -- Una lección que ya tiene hecha se queda con la fecha más antigua.
  update public.progreso_lecciones f
     set completada_en = least(f.completada_en, p.completada_en)
    from public.progreso_lecciones p
   where f.alumno_id = p_ficha_id
     and p.alumno_id = p_pase_alumno_id
     and p.leccion_id = f.leccion_id;

  delete from public.progreso_lecciones p
   where p.alumno_id = p_pase_alumno_id
     and exists (select 1 from public.progreso_lecciones f
                  where f.alumno_id = p_ficha_id and f.leccion_id = p.leccion_id);

  update public.progreso_lecciones set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
  get diagnostics n_lecciones = row_count;

  update public.intentos_ejercicio set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
  get diagnostics n_intentos = row_count;

  update public.accesos         set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
  update public.eventos         set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
  update public.intentos_acceso set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;

  -- Si en la ficha ya había elección, manda esa.
  insert into public.curso_elegido (alumno_id, curso_id, elegido_en)
  select p_ficha_id, c.curso_id, c.elegido_en
    from public.curso_elegido c
   where c.alumno_id = p_pase_alumno_id
  on conflict (alumno_id) do nothing;
  delete from public.curso_elegido where alumno_id = p_pase_alumno_id;

  update public.pases_curso set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
  get diagnostics n_pases = row_count;

  update public.sesiones
     set revocada_en = now()
   where alumno_id = p_pase_alumno_id and revocada_en is null;

  if n_pases > 0 then
    perform public.registrar_pase_log(
      'base', 'fusionado',
      p_detalle => jsonb_build_object('de', p_pase_alumno_id, 'a', p_ficha_id, 'lecciones', n_lecciones, 'intentos', n_intentos)
    );
  end if;

  return query select n_lecciones, n_intentos, n_pases;
end;
$$;


/**
 * Qué `alumno_id` le toca a un comprador. Interna.
 *
 *   · Con ficha: la ficha. Si ya tenía pases con un id `pase-`, se funden.
 *   · Sin ficha: el id de un pase anterior suyo, por email o por usuario
 *     de WordPress, o uno nuevo.
 */
create or replace function public.pase_resolver_alumno(p_email text, p_woo_user_id bigint, p_ficha_id text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  previo text;
begin
  if p_ficha_id is not null then
    for previo in
      select distinct p.alumno_id
        from public.pases_curso p
       where p.alumno_id like 'pase-%'
         and (p.email_normalizado = p_email
              or (p_woo_user_id is not null and p.woo_user_id = p_woo_user_id))
    loop
      perform public.fundir_pase_en_ficha(previo, p_ficha_id);
    end loop;
    return p_ficha_id;
  end if;

  select p.alumno_id into previo
    from public.pases_curso p
   where p.email_normalizado = p_email
      or (p_woo_user_id is not null and p.woo_user_id = p_woo_user_id)
   -- Si hay una ficha entre ellos, gana: ahí está su progreso.
   order by (p.alumno_id like 'pase-%'), p.creado_en
   limit 1;

  return coalesce(previo, 'pase-' || gen_random_uuid()::text);
end;
$$;


/**
 * Pone en la cola el correo de acceso de un pase. Interna.
 * `on conflict`: el mismo pedido nunca encola dos veces.
 */
create or replace function public.pase_encolar_acceso(p_pase_id uuid, p_email text)
returns void
language sql
set search_path = ''
as $$
  insert into public.correos_cola (clave, tipo, pase_id, destinatario)
  values ('pase:' || p_pase_id::text || ':acceso', 'acceso_black_pass', p_pase_id, p_email)
  on conflict (clave) do nothing;
$$;


/**
 * Un pase que vuelve a estar activo. Interna. El correo que se canceló sin
 * llegar a salir vuelve a la cola: el comprador aún no lo ha recibido.
 */
create or replace function public.pase_recuperar_correo(p_pase_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.correos_cola c
     set estado = 'pendiente', proximo_intento_en = now()
   where c.pase_id = p_pase_id and c.estado = 'cancelado';
$$;


/**
 * Concede el pase de un pedido pagado. ATÓMICA E IDEMPOTENTE: el webhook y
 * la conciliación pueden llamarla a la vez y las veces que sea.
 *
 * El bloqueo por email es lo que impide que dos pedidos simultáneos de una
 * misma persona sin ficha le creen dos identidades.
 *
 * `accion`: concedido | reactivado | ya_activo | bloqueado_manual.
 */
create or replace function public.conceder_pase_pedido(
  p_wc_order_id bigint,
  p_email       text,
  p_nombre      text,
  p_woo_user_id bigint,
  p_ficha_id    text,
  p_producto_id bigint,
  p_pagado_en   timestamptz,
  p_meses       integer,
  p_es_prueba   boolean default false
)
returns table (accion text, pase_id uuid, alumno_id text, acceso_hasta timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  email_limpio text := lower(btrim(p_email));
  woo_limpio   bigint := nullif(p_woo_user_id, 0);
  ficha_limpia text := nullif(btrim(p_ficha_id), '');
  fila         public.pases_curso;
  id_alumno    text;
begin
  if p_wc_order_id is null or email_limpio is null or email_limpio = '' then
    raise exception 'conceder_pase_pedido: faltan el pedido o el email';
  end if;
  if p_pagado_en is null or p_meses is null or p_meses <= 0 then
    raise exception 'conceder_pase_pedido: faltan la fecha de pago o la duración del pedido %', p_wc_order_id;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('pase:' || email_limpio, 0));

  select * into fila from public.pases_curso c where c.wc_order_id = p_wc_order_id for update;

  if found then
    if fila.bloqueado_manual then
      return query select 'bloqueado_manual'::text, fila.id, fila.alumno_id, fila.acceso_hasta;
      return;
    end if;

    if fila.estado = 'activo' then
      return query select 'ya_activo'::text, fila.id, fila.alumno_id, fila.acceso_hasta;
      return;
    end if;

    -- Reembolsado o cancelado y vuelto a pagar. La fecha no se recalcula.
    update public.pases_curso c
       set estado = 'activo', revocado_en = null, revocado_por = null, motivo_revocacion = null
     where c.id = fila.id;

    perform public.pase_recuperar_correo(fila.id);

    return query select 'reactivado'::text, fila.id, fila.alumno_id, fila.acceso_hasta;
    return;
  end if;

  id_alumno := public.pase_resolver_alumno(email_limpio, woo_limpio, ficha_limpia);

  insert into public.pases_curso (
    alumno_id, email_normalizado, woo_user_id, nombre, origen, wc_order_id,
    wc_producto_id, inicio, acceso_hasta, es_prueba, concedido_por
  ) values (
    id_alumno, email_limpio, woo_limpio, nullif(btrim(p_nombre), ''), 'pedido', p_wc_order_id,
    p_producto_id, p_pagado_en, public.pase_hasta(p_pagado_en, p_meses), coalesce(p_es_prueba, false), 'woocommerce'
  )
  returning * into fila;

  perform public.pase_encolar_acceso(fila.id, email_limpio);

  -- Dos pases vivos: valen en paralelo, y quizá haya que devolver uno.
  if exists (
    select 1 from public.pases_curso o
     where o.alumno_id = id_alumno and o.id <> fila.id
       and o.estado = 'activo' and o.acceso_hasta > now()
  ) then
    perform public.registrar_pase_log(
      'base', 'alerta',
      p_wc_order_id => p_wc_order_id, p_pase_id => fila.id, p_email => email_limpio,
      p_alerta => 'compra_duplicada'
    );
  end if;

  return query select 'concedido'::text, fila.id, fila.alumno_id, fila.acceso_hasta;
end;
$$;


/**
 * Da un pase a mano, desde el panel. Si ya tiene uno vivo no crea otro.
 * `accion`: manual_concedido | ya_activo.
 */
create or replace function public.conceder_pase_manual(
  p_email         text,
  p_nombre        text,
  p_ficha_id      text,
  p_meses         integer,
  p_por           text,
  p_motivo        text default null,
  p_enviar_correo boolean default true
)
returns table (accion text, pase_id uuid, alumno_id text, acceso_hasta timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  email_limpio text := lower(btrim(p_email));
  fila         public.pases_curso;
  id_alumno    text;
begin
  if email_limpio is null or email_limpio = '' or p_por is null or btrim(p_por) = '' then
    raise exception 'conceder_pase_manual: faltan el email o quién lo concede';
  end if;
  if p_meses is null or p_meses <= 0 then
    raise exception 'conceder_pase_manual: la duración no es válida';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('pase:' || email_limpio, 0));

  id_alumno := public.pase_resolver_alumno(email_limpio, null, nullif(btrim(p_ficha_id), ''));

  select * into fila
    from public.pases_curso c
   where c.alumno_id = id_alumno and c.estado = 'activo' and c.acceso_hasta > now()
   order by c.acceso_hasta desc
   limit 1;

  if found then
    return query select 'ya_activo'::text, fila.id, fila.alumno_id, fila.acceso_hasta;
    return;
  end if;

  insert into public.pases_curso (
    alumno_id, email_normalizado, nombre, origen, inicio, acceso_hasta, concedido_por, motivo
  ) values (
    id_alumno, email_limpio, nullif(btrim(p_nombre), ''), 'manual', now(),
    public.pase_hasta(now(), p_meses), p_por, nullif(btrim(p_motivo), '')
  )
  returning * into fila;

  if p_enviar_correo then
    perform public.pase_encolar_acceso(fila.id, email_limpio);
  end if;

  return query select 'manual_concedido'::text, fila.id, fila.alumno_id, fila.acceso_hasta;
end;
$$;


/**
 * Quita un pase.
 *
 * LAS SESIONES SOLO SE CIERRAN SI NO LE QUEDA NADA: un comprador sin ficha
 * y sin otro pase vivo. A quien tiene ficha no se le echa, porque conserva
 * lo de su plan: `accesoDelAlumno` deja de darle el pase en la petición
 * siguiente.
 *
 * `p_bloquear`: lo quita una persona, y la conciliación no lo devuelve.
 * Se cancela el correo si todavía no había salido.
 */
create or replace function public.revocar_pase(
  p_pase_id  uuid,
  p_por      text,
  p_motivo   text    default null,
  p_bloquear boolean default false
)
returns table (accion text, sesiones_revocadas integer)
language plpgsql
set search_path = ''
as $$
declare
  fila     public.pases_curso;
  sesiones integer := 0;
begin
  if p_por is null or btrim(p_por) = '' then
    raise exception 'revocar_pase: falta quién lo quita';
  end if;

  select * into fila from public.pases_curso c where c.id = p_pase_id for update;
  if not found then
    return query select 'no_existe'::text, 0;
    return;
  end if;

  if fila.estado = 'activo' then
    update public.pases_curso c
       set estado = 'revocado', revocado_en = now(), revocado_por = p_por,
           motivo_revocacion = nullif(btrim(p_motivo), ''),
           bloqueado_manual = c.bloqueado_manual or coalesce(p_bloquear, false)
     where c.id = p_pase_id;

    update public.correos_cola c
       set estado = 'cancelado', reservado_hasta = null
     where c.pase_id = p_pase_id and c.estado = 'pendiente';

    if fila.alumno_id like 'pase-%' and not exists (
      select 1 from public.pases_curso o
       where o.alumno_id = fila.alumno_id and o.id <> p_pase_id
         and o.estado = 'activo' and o.acceso_hasta > now()
    ) then
      update public.sesiones s
         set revocada_en = now()
       where s.alumno_id = fila.alumno_id and s.revocada_en is null;
      get diagnostics sesiones = row_count;
    end if;

    return query select 'revocado'::text, sesiones;
    return;
  end if;

  -- Ya estaba quitado. Una persona puede querer además bloquearlo.
  if coalesce(p_bloquear, false) and not fila.bloqueado_manual then
    update public.pases_curso c set bloqueado_manual = true where c.id = p_pase_id;
  end if;

  return query select 'ya_revocado'::text, 0;
end;
$$;


/** Lo devuelve una persona: quita el bloqueo y conserva su fecha. */
create or replace function public.reactivar_pase(p_pase_id uuid)
returns table (accion text, acceso_hasta timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  fila public.pases_curso;
begin
  update public.pases_curso c
     set estado = 'activo', revocado_en = null, revocado_por = null,
         motivo_revocacion = null, bloqueado_manual = false
   where c.id = p_pase_id
  returning * into fila;

  if not found then
    return query select 'no_existe'::text, null::timestamptz;
    return;
  end if;

  perform public.pase_recuperar_correo(p_pase_id);

  return query select 'reactivado'::text, fila.acceso_hasta;
end;
$$;


/** «Reenviar el email de acceso». Es un envío nuevo, con su propia clave. */
create or replace function public.reenviar_acceso(p_pase_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  fila  public.pases_curso;
  nuevo uuid;
begin
  select * into fila from public.pases_curso c where c.id = p_pase_id;
  if not found then
    raise exception 'reenviar_acceso: no existe el pase %', p_pase_id;
  end if;

  insert into public.correos_cola (clave, tipo, pase_id, destinatario)
  values ('pase:' || p_pase_id::text || ':reenvio:' || gen_random_uuid()::text,
          'acceso_black_pass', p_pase_id, fila.email_normalizado)
  returning id into nuevo;

  return nuevo;
end;
$$;


/**
 * Los siguientes correos que tocan. `skip locked`: dos procesos a la vez
 * se reparten la cola en vez de coger los mismos.
 */
create or replace function public.reclamar_correos(p_limite integer default 20, p_reserva_segundos integer default 120)
returns setof public.correos_cola
language sql
set search_path = ''
as $$
  update public.correos_cola c
     set estado = 'enviando',
         intentos = c.intentos + 1,
         reservado_hasta = now() + make_interval(secs => p_reserva_segundos)
   where c.id in (
     select x.id
       from public.correos_cola x
      where (x.estado = 'pendiente' and x.proximo_intento_en <= now())
         or (x.estado = 'enviando' and x.reservado_hasta < now())
      order by x.creado_en
      for update skip locked
      limit p_limite
   )
  returning c.*;
$$;


create or replace function public.correo_enviado(p_id uuid, p_resend_id text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  fila public.correos_cola;
begin
  update public.correos_cola c
     set estado = 'enviado', enviado_en = now(), resend_id = p_resend_id,
         reservado_hasta = null, ultimo_error = null
   where c.id = p_id
  returning * into fila;

  if found then
    perform public.registrar_pase_log(
      'cola', 'correo_enviado',
      p_wc_order_id => (select p.wc_order_id from public.pases_curso p where p.id = fila.pase_id),
      p_pase_id => fila.pase_id, p_email => fila.destinatario, p_email_enviado => true
    );
  end if;
end;
$$;


/**
 * Un envío que no salió. Vuelve a la cola dentro de `p_espera_segundos`
 * (ante un 429, lo que diga Resend). A los 12 intentos, o si el fallo es
 * definitivo (dirección rechazada), se da por fallido y salta la alerta.
 * Devuelve el estado en que queda.
 */
create or replace function public.correo_fallido(
  p_id              uuid,
  p_error           text,
  p_espera_segundos integer default 60,
  p_definitivo      boolean default false
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  fila public.correos_cola;
begin
  update public.correos_cola c
     set estado = case when coalesce(p_definitivo, false) or c.intentos >= 12 then 'fallido' else 'pendiente' end,
         proximo_intento_en = now() + make_interval(secs => greatest(p_espera_segundos, 1)),
         reservado_hasta = null,
         ultimo_error = left(p_error, 500)
   where c.id = p_id
  returning * into fila;

  if not found then
    return null;
  end if;

  if fila.estado = 'fallido' then
    perform public.registrar_pase_log(
      'cola', 'correo_fallido',
      p_wc_order_id => (select p.wc_order_id from public.pases_curso p where p.id = fila.pase_id),
      p_pase_id => fila.pase_id, p_email => fila.destinatario, p_email_enviado => false,
      p_error => left(p_error, 500), p_alerta => 'correo_fallido'
    );
  end if;

  return fila.estado;
end;
$$;


/**
 * Turno de la conciliación. Devuelve el cursor si le toca a quien pregunta
 * y ninguna fila si hay otra pasada en marcha. La reserva caduca sola: una
 * pasada que muere no bloquea las siguientes.
 */
create or replace function public.tomar_conciliacion(p_reserva_segundos integer default 240)
returns table (cursor_en timestamptz)
language sql
set search_path = ''
as $$
  update public.pases_conciliacion c
     set bloqueado_hasta = now() + make_interval(secs => p_reserva_segundos)
   where c.id and (c.bloqueado_hasta is null or c.bloqueado_hasta < now())
  returning c.cursor_en;
$$;


/** Cierra la pasada. Con error el cursor no se mueve y se repite lo mismo. */
create or replace function public.cerrar_conciliacion(
  p_cursor_en      timestamptz,
  p_error          text default null,
  p_webhook_estado text default null
)
returns void
language sql
set search_path = ''
as $$
  update public.pases_conciliacion c
     set bloqueado_hasta = null,
         cursor_en = case when p_error is null then greatest(c.cursor_en, coalesce(p_cursor_en, c.cursor_en)) else c.cursor_en end,
         ultima_ok_en = case when p_error is null then now() else c.ultima_ok_en end,
         ultimo_error = left(p_error, 500),
         webhook_estado = coalesce(p_webhook_estado, c.webhook_estado),
         webhook_visto_en = case when p_webhook_estado is not null then now() else c.webhook_visto_en end
   where c.id;
$$;


/**
 * Cuántos milisegundos esperar antes de llamar a Resend, y reserva el
 * hueco. El repo trabaja con 2 peticiones por segundo (550 ms).
 */
create or replace function public.reservar_envio_resend(p_intervalo_ms integer default 550)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  ahora timestamptz := clock_timestamp();
  turno timestamptz;
begin
  update public.resend_ritmo r
     set proximo_en = greatest(r.proximo_en, ahora) + make_interval(secs => p_intervalo_ms / 1000.0)
   where r.id
  returning r.proximo_en - make_interval(secs => p_intervalo_ms / 1000.0) into turno;

  return greatest(0, ceil(extract(epoch from (turno - ahora)) * 1000))::integer;
end;
$$;


create or replace function public.purgar_pases_eventos(p_dias integer default 90)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  borradas integer;
begin
  delete from public.pases_eventos e
   where e.recibido_en < now() - make_interval(days => p_dias);
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;


-- ===============================================================
-- 8. LO QUE LEE EL PANEL /black-pass
--
-- Cada pase, y cada pedido visto aunque no tenga pase (una transferencia
-- on-hold), con su último estado y su correo.
-- ===============================================================

create or replace view public.vista_pases_panel
with (security_invoker = on) as
with ultimo as (
  select distinct on (l.wc_order_id)
         l.wc_order_id, l.email, l.estado_wc, l.accion, l.en, l.error, l.origen
    from public.pases_log l
   where l.wc_order_id is not null and l.alerta is null
   order by l.wc_order_id, l.en desc, l.id desc
)
select coalesce(p.wc_order_id, u.wc_order_id)    as wc_order_id,
       p.id                                      as pase_id,
       coalesce(p.email_normalizado, u.email)    as email,
       p.nombre,
       p.alumno_id,
       p.origen                                  as origen_pase,
       p.estado,
       p.inicio,
       p.acceso_hasta,
       p.bloqueado_manual,
       coalesce(p.es_prueba, false)              as es_prueba,
       p.concedido_por,
       p.motivo,
       p.revocado_en,
       p.revocado_por,
       u.estado_wc,
       u.accion                                  as ultima_accion,
       u.en                                      as ultima_accion_en,
       u.origen                                  as ultima_accion_origen,
       u.error                                   as ultimo_error,
       c.estado                                  as correo_estado,
       c.enviado_en                              as correo_enviado_en,
       c.intentos                                as correo_intentos
  from public.pases_curso p
  full join ultimo u on u.wc_order_id = p.wc_order_id
  left join lateral (
    select x.estado, x.enviado_en, x.intentos
      from public.correos_cola x
     where x.pase_id = p.id
     order by x.creado_en desc
     limit 1
  ) c on true;


-- ===============================================================
-- 9. FUERA DE LAS MÉTRICAS DEL PANEL
--
-- Quien solo tiene pase no cuenta en las cifras del panel de alumnos; se
-- ve en /black-pass. Es el único cambio a algo que ya existía. La lista
-- `metricas_excluidos` no cambia: la edita a mano la página /exclusiones.
-- ===============================================================

create or replace function public.metricas_excluido(p_alumno_id text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_alumno_id is null
      or p_alumno_id like 'demo-%'
      or p_alumno_id like 'pase-%'
      or exists (select 1 from public.cuentas_demo d where d.alumno_id = p_alumno_id)
      or exists (select 1 from public.metricas_exclusiones e where e.alumno_id = p_alumno_id);
$$;


-- ===============================================================
-- 10. PERMISOS
-- ===============================================================

alter table public.pases_curso        enable row level security;
alter table public.pases_eventos      enable row level security;
alter table public.pases_log          enable row level security;
alter table public.correos_cola       enable row level security;
alter table public.curso_elegido      enable row level security;
alter table public.pases_conciliacion enable row level security;
alter table public.resend_ritmo       enable row level security;

revoke all on public.pases_curso, public.pases_eventos, public.pases_log, public.correos_cola,
              public.curso_elegido, public.pases_conciliacion, public.resend_ritmo,
              public.vista_pases_panel
  from anon, authenticated;

grant select, insert, update, delete
  on public.pases_curso, public.pases_eventos, public.pases_log, public.correos_cola,
     public.curso_elegido, public.pases_conciliacion, public.resend_ritmo
  to service_role;
grant select on public.vista_pases_panel to service_role;

do $$
declare
  f text;
begin
  foreach f in array array[
    'pase_hasta(timestamptz, integer)',
    'registrar_pase_log(text, text, bigint, uuid, text, text, boolean, text, jsonb, text)',
    'fundir_pase_en_ficha(text, text)',
    'pase_resolver_alumno(text, bigint, text)',
    'pase_encolar_acceso(uuid, text)',
    'pase_recuperar_correo(uuid)',
    'conceder_pase_pedido(bigint, text, text, bigint, text, bigint, timestamptz, integer, boolean)',
    'conceder_pase_manual(text, text, text, integer, text, text, boolean)',
    'revocar_pase(uuid, text, text, boolean)',
    'reactivar_pase(uuid)',
    'reenviar_acceso(uuid)',
    'reclamar_correos(integer, integer)',
    'correo_enviado(uuid, text)',
    'correo_fallido(uuid, text, integer, boolean)',
    'tomar_conciliacion(integer)',
    'cerrar_conciliacion(timestamptz, text, text)',
    'reservar_envio_resend(integer)',
    'purgar_pases_eventos(integer)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

commit;


-- ===============================================================
-- COMPROBACIÓN. Es una sola consulta: al ejecutar el archivo entero, el
-- editor de Supabase enseña solo este resultado. Pásame la tabla.
--
-- En cada fila, `obtenido` tiene que coincidir con `esperado`. Las dos
-- últimas no tienen valor correcto: dicen si pg_cron y pg_net están
-- instaladas, que es lo que necesito para el cron del punto 2.
-- ===============================================================

select 1 as orden, c.relname::text as comprobacion,
       format('rls=%s politicas=%s anon_lee=%s servidor_escribe=%s',
              c.relrowsecurity::text, count(p.policyname),
              has_table_privilege('anon', c.oid, 'select')::text,
              has_table_privilege('service_role', c.oid, 'insert')::text) as obtenido,
       'rls=true politicas=0 anon_lee=false servidor_escribe=true' as esperado
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
 where n.nspname = 'public'
   and c.relname in ('pases_curso', 'pases_eventos', 'pases_log', 'correos_cola',
                     'curso_elegido', 'pases_conciliacion', 'resend_ritmo')
 group by c.relname, c.relrowsecurity, c.oid
union all
select 2, 'metricas_excluido',
       format('pase=%s pruebas=%s alumno=%s',
              public.metricas_excluido('pase-prueba')::text,
              public.metricas_excluido('s_1785879819493')::text,
              public.metricas_excluido('s_cualquiera')::text),
       'pase=true pruebas=true alumno=false'
union all
select 3, 'pase_hasta (19/11/2026 + 12 meses, Madrid)',
       to_char(public.pase_hasta('2026-11-19 00:30:00+01', 12) at time zone 'Europe/Madrid', 'YYYY-MM-DD HH24:MI:SS'),
       '2027-11-19 23:59:59'
union all
select 4, 'permisos de las funciones',
       format('anon=%s servidor=%s',
              has_function_privilege('anon', 'public.revocar_pase(uuid, text, text, boolean)', 'execute')::text,
              has_function_privilege('service_role', 'public.revocar_pase(uuid, text, text, boolean)', 'execute')::text),
       'anon=false servidor=true'
union all
select 5, 'extensión ' || e.name,
       coalesce('instalada ' || e.installed_version, 'disponible, sin instalar'),
       '(informativo)'
  from pg_available_extensions e
 where e.name in ('pg_cron', 'pg_net')
 order by 1, 2;


-- ===============================================================
-- DESHACER (comentado). Borra los pases, el registro y la cola.
-- ===============================================================

-- begin;
-- create or replace function public.metricas_excluido(p_alumno_id text)
-- returns boolean language sql stable set search_path = '' as $$
--   select p_alumno_id is null
--       or p_alumno_id like 'demo-%'
--       or exists (select 1 from public.cuentas_demo d where d.alumno_id = p_alumno_id)
--       or exists (select 1 from public.metricas_exclusiones e where e.alumno_id = p_alumno_id);
-- $$;
-- drop view if exists public.vista_pases_panel;
-- drop function if exists public.purgar_pases_eventos(integer);
-- drop function if exists public.reservar_envio_resend(integer);
-- drop function if exists public.cerrar_conciliacion(timestamptz, text, text);
-- drop function if exists public.tomar_conciliacion(integer);
-- drop function if exists public.correo_fallido(uuid, text, integer, boolean);
-- drop function if exists public.correo_enviado(uuid, text);
-- drop function if exists public.reclamar_correos(integer, integer);
-- drop function if exists public.reenviar_acceso(uuid);
-- drop function if exists public.reactivar_pase(uuid);
-- drop function if exists public.revocar_pase(uuid, text, text, boolean);
-- drop function if exists public.conceder_pase_manual(text, text, text, integer, text, text, boolean);
-- drop function if exists public.conceder_pase_pedido(bigint, text, text, bigint, text, bigint, timestamptz, integer, boolean);
-- drop function if exists public.pase_recuperar_correo(uuid);
-- drop function if exists public.pase_encolar_acceso(uuid, text);
-- drop function if exists public.pase_resolver_alumno(text, bigint, text);
-- drop function if exists public.fundir_pase_en_ficha(text, text);
-- drop function if exists public.registrar_pase_log(text, text, bigint, uuid, text, text, boolean, text, jsonb, text);
-- drop function if exists public.pase_hasta(timestamptz, integer);
-- drop table if exists public.resend_ritmo;
-- drop table if exists public.pases_conciliacion;
-- drop table if exists public.curso_elegido;
-- drop table if exists public.correos_cola;
-- drop table if exists public.pases_log;
-- drop table if exists public.pases_eventos;
-- drop table if exists public.pases_curso;
-- commit;
