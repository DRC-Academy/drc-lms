-- ===============================================================
-- ESQUEMA DE LA BASE PROPIA DEL LMS
--
-- Ejecutar en el SQL Editor del proyecto NUEVO de Supabase, el de
-- LMS_SUPABASE_URL. NO en el de DRC Gestión: aquí se crean tablas y
-- Gestión es de solo lectura para nosotros.
--
-- Comprobación antes de pulsar «Run»: el ref del proyecto abierto en el
-- panel tiene que ser el mismo que el de LMS_SUPABASE_URL en .env.local.
-- Son dos proyectos y ya se cruzaron una vez.
--
-- Todo el archivo es idempotente (`if not exists`), así que se puede
-- volver a ejecutar sin romper nada. Las sentencias para deshacerlo
-- están al final, comentadas.
--
-- ---------------------------------------------------------------
-- PRINCIPIO: GESTIÓN ES LA FUENTE DE VERDAD DE QUIÉN ES EL ALUMNO
--
-- Ninguna tabla de aquí guarda nombre, nivel ni profesor. Solo
-- `alumno_id`, que es el `id` de `students` en Gestión y es `text`.
-- Si hace falta el nombre de alguien, se lee de Gestión.
--
-- La única excepción es `email_normalizado`, y solo donde hace falta
-- para resolver identidad: en `alumno_vinculos` (que existe justo para
-- eso) y en las sesiones de administrador, que no tienen `alumno_id`
-- porque un administrador no es un alumno.
-- ===============================================================


-- ---------------------------------------------------------------
-- UTILIDAD: marca de actualización
-- ---------------------------------------------------------------

create or replace function lms_tocar_actualizado_en()
returns trigger
language plpgsql
-- `search_path` fijado a propósito: sin esto, una función que se
-- ejecuta con los privilegios de quien la definió puede ser desviada
-- a otro esquema por quien controle su `search_path`.
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;


-- ===============================================================
-- 1. alumno_vinculos
--
-- Hoy el email es la única llave entre WooCommerce, Gestión y el LMS,
-- y es un dato que el alumno puede cambiar. Esta tabla fija el vínculo
-- por id la primera vez que se resuelve.
--
-- Al entrar por el botón de WooCommerce:
--   · si el `woo_user_id` ya está aquí, se resuelve por ahí y no hace
--     falta consultar Gestión;
--   · si no está, se resuelve por email contra Gestión y se guarda.
-- A partir de ahí el alumno sigue vinculado aunque cambie de email.
-- ===============================================================

create table if not exists public.alumno_vinculos (
  -- El `id` de `students` en Gestión. Es text, no uuid: no lo elegimos
  -- nosotros y no lo convertimos, para que un id de aquí y uno de allí
  -- sean siempre comparables sin castear.
  alumno_id          text        primary key,

  -- Minúsculas y sin espacios: la misma forma canónica que produce
  -- `normalizarEmail()` en lib/sesion.ts. Único porque dos alumnos con
  -- el mismo email serían dos fichas de la misma persona en Gestión.
  email_normalizado  text        not null unique,

  -- El id de usuario de WordPress. Nullable porque solo se rellena si
  -- el alumno llega alguna vez por el botón; quien entra siempre por el
  -- correo no tiene ninguno.
  --
  -- Único, y en Postgres un índice único deja pasar varios NULL, que es
  -- justo lo que queremos: muchos sin vincular, ninguno compartido.
  woo_user_id        bigint      unique,

  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  -- Un email vacío pasaría el `not null` y rompería la resolución.
  constraint alumno_vinculos_email_no_vacio
    check (length(trim(email_normalizado)) > 0),

  -- Que esté normalizado se garantiza aquí y no solo en TypeScript: si
  -- un día se inserta desde un script o desde el propio SQL Editor, la
  -- regla sigue valiendo.
  constraint alumno_vinculos_email_normalizado
    check (email_normalizado = lower(trim(email_normalizado)))
);

comment on table public.alumno_vinculos is
  'Vínculo estable entre el alumno de Gestión, su email y su usuario de WooCommerce. No duplica datos de Gestión.';

drop trigger if exists trg_alumno_vinculos_actualizado on public.alumno_vinculos;
create trigger trg_alumno_vinculos_actualizado
  before update on public.alumno_vinculos
  for each row execute function lms_tocar_actualizado_en();


-- ===============================================================
-- 2. sesiones
--
-- Hoy la cookie es un token autocontenido: lleva dentro todo lo que
-- hace falta y por eso no se puede revocar antes de que caduque (ver la
-- cabecera de lib/sesion.ts, donde queda anotado como pendiente).
--
-- Con esta tabla la cookie pasa a llevar el `id` de sesión firmado, y
-- revocar es marcar `revocada_en`.
-- ===============================================================

create table if not exists public.sesiones (
  id             uuid        primary key default gen_random_uuid(),

  -- Nullable a propósito: refleja la unión discriminada `Sesion` de
  -- lib/sesion.ts, donde un alumno SIEMPRE tiene ficha y un
  -- administrador nunca entra por una ficha concreta.
  alumno_id      text,

  -- Solo para las sesiones de administrador, que no tienen `alumno_id`
  -- y cuya única identidad es el email del equipo (el de EMAILS_ADMIN).
  -- En las de alumno va NULL: su identidad es `alumno_id` y el email
  -- vive en Gestión.
  email_admin    text,

  rol            text        not null,
  origen         text        not null,

  creada_en      timestamptz not null default now(),
  expira_en      timestamptz not null,
  ultimo_uso_en  timestamptz not null default now(),

  -- NULL = sesión viva. Se marca al cerrar sesión y para echar a
  -- alguien sin esperar a que caduque.
  revocada_en    timestamptz,

  constraint sesiones_rol_valido
    check (rol in ('alumno', 'admin')),

  constraint sesiones_origen_valido
    check (origen in ('magic_link', 'woocommerce')),

  -- La misma regla que impone el tipo en TypeScript, aquí abajo: un rol
  -- de alumno exige `alumno_id`; uno de administrador lo prohíbe y pide
  -- email. Así una fila incoherente no llega a existir.
  constraint sesiones_identidad_segun_rol
    check (
      (rol = 'alumno' and alumno_id is not null and email_admin is null)
      or
      (rol = 'admin'  and alumno_id is null     and email_admin is not null)
    ),

  constraint sesiones_expira_despues_de_crearse
    check (expira_en > creada_en)
);

comment on table public.sesiones is
  'Sesiones abiertas. La cookie lleva el id firmado; revocar es marcar revocada_en.';

comment on column public.sesiones.ultimo_uso_en is
  'Se actualiza como mucho una vez cada pocos minutos, no en cada petición: si no, sería una escritura por request.';


-- ===============================================================
-- 3. bloques_generados
--
-- Los ejercicios que hoy solo viven en el localStorage del navegador.
-- Guardarlos aquí evita regenerar lo mismo dos veces y baja el coste de
-- la API de Anthropic.
--
-- SOBRE LAS DOS CLASES DE BLOQUE (importa para las tablas siguientes):
-- un `Bloque` puede venir de dos sitios distintos y solo uno acaba
-- aquí dentro.
--
--   · del catálogo fijo de lib/data.ts   → id como 'conditionals-2-3'
--   · generado por IA o por el banco     → id como 'gen-3f9a2c'
--
-- Los del catálogo viven en el código, no en la base, y aun así el
-- alumno los practica. Por eso `id` de aquí es una uuid interna y el
-- identificador que viaja en el JSON se guarda aparte, en
-- `bloque_clave`. Ver la nota sobre claves en `progreso_bloques`.
-- ===============================================================

create table if not exists public.bloques_generados (
  id            uuid        primary key default gen_random_uuid(),

  -- El `Bloque.id` del JSON: 'gen-3f9a2c'. Es la clave con la que el
  -- resto de tablas referencian un bloque, porque es la única que
  -- también tienen los bloques del catálogo.
  bloque_clave  text        not null unique,

  alumno_id     text        not null,

  modo          text        not null,
  nivel         text        not null,

  -- El `Bloque` completo, tal cual lo valida lib/validarBloque.ts. Se
  -- guarda entero y no descompuesto en tablas a propósito: la forma del
  -- bloque la fija el validador en TypeScript, y partirla aquí obligaría
  -- a migrar la base cada vez que cambie un campo del ejercicio.
  contenido     jsonb       not null,

  -- El resultado del revisor pedagógico (lib/revisor.ts). Nullable
  -- porque un bloque del banco puede no haber pasado por él.
  revision      jsonb,

  origen        text        not null,
  generado_en   timestamptz not null default now(),

  constraint bloques_generados_modo_valido
    -- Cuando entren los cursos de LearnDash hará falta un modo más.
    -- Es un CHECK y no un ENUM justamente por eso: añadir un valor es
    -- `alter table ... drop constraint` + volver a crearla, sin tocar
    -- ningún tipo del que ya dependan otras columnas.
    check (modo in ('repaso', 'examen', 'contexto')),

  constraint bloques_generados_nivel_valido
    -- Los mismos cinco de `Bloque["nivel"]` en lib/data.ts.
    check (nivel in ('A1', 'A2', 'B1', 'B2', 'C1')),

  constraint bloques_generados_origen_valido
    check (origen in ('ia', 'banco')),

  -- `contenido` tiene que ser un objeto, no un array ni un escalar:
  -- `jsonb` por sí solo aceptaría `'[]'` o `'3'`.
  constraint bloques_generados_contenido_es_objeto
    check (jsonb_typeof(contenido) = 'object')
);

comment on table public.bloques_generados is
  'Bloques generados por IA o sacados del banco. Los del catálogo de lib/data.ts NO están aquí: viven en el código.';


-- ===============================================================
-- 4. progreso_bloques
--
-- El resultado de practicar. Un intento por fila.
--
-- POR QUÉ `bloque_clave` NO ES UNA CLAVE AJENA
--
-- Sería lo natural, y aquí sería un error. Los bloques del catálogo de
-- lib/data.ts no tienen fila en `bloques_generados` —viven en el
-- código—, así que una FK haría imposible guardar el progreso de la
-- mayor parte de lo que se practica hoy.
--
-- Además nos deja el sitio abierto para los cursos de LearnDash: cuando
-- entren, sus bloques podrán referenciarse con la misma columna sin
-- migrar nada.
--
-- El precio es que la base no garantiza que la clave exista. Se asume:
-- quien la escribe es el propio LMS, que acaba de servir ese bloque.
--
-- APPEND-ONLY: un alumno puede repetir un bloque y cada intento se
-- guarda. Nunca se pisa el anterior. El "dominado" se calcula sobre el
-- mejor intento, con el índice de más abajo.
-- ===============================================================

create table if not exists public.progreso_bloques (
  id            uuid        primary key default gen_random_uuid(),
  alumno_id     text        not null,
  bloque_clave  text        not null,

  aciertos      integer     not null,
  total         integer     not null,

  completado_en timestamptz not null default now(),

  -- `total > 0` evita la división por cero al calcular el porcentaje, y
  -- `aciertos <= total` descarta un resultado imposible.
  constraint progreso_bloques_recuento_coherente
    check (total > 0 and aciertos >= 0 and aciertos <= total)
);

comment on table public.progreso_bloques is
  'Un intento por fila; nunca se pisa el anterior. El porcentaje se calcula en TypeScript (UMBRAL_DOMINADO en lib/progreso.ts) para no tener el umbral en dos sitios.';


-- ===============================================================
-- 5. avance_bloques
--
-- ⚠ ESTA TABLA NO ESTABA EN TU LISTA. La añado porque lib/progreso.ts
-- tiene TRES almacenes y el encargo solo cubre dos:
--
--   progreso → progreso_bloques   ✓
--   bloques  → bloques_generados  ✓
--   avance   → no tenía dónde ir
--
-- `guardarAvance` / `borrarAvance` / `leerAvanceAlumno` son lo que hace
-- que un bloque empezado y sin terminar salga como "en curso" en la
-- ficha (`estadoDeBloque`). Sin esta tabla, la Tarea 2 pierde ese
-- estado. Si preferís dejarlo caer, se borra este bloque entero y no
-- afecta a nada más.
--
-- A diferencia de `progreso_bloques`, aquí NO se acumula: es la
-- posición actual, una por alumno y bloque, y se sobrescribe.
-- ===============================================================

create table if not exists public.avance_bloques (
  alumno_id      text        not null,
  bloque_clave   text        not null,

  -- Por qué ejercicio va, y de cuántos.
  indice         integer     not null,
  total          integer     not null,

  actualizado_en timestamptz not null default now(),

  primary key (alumno_id, bloque_clave),

  constraint avance_bloques_indice_coherente
    check (total > 0 and indice >= 0 and indice < total)
);

comment on table public.avance_bloques is
  'Posición dentro de un bloque empezado y sin terminar. Se sobrescribe; al terminar el bloque se borra la fila.';


-- ===============================================================
-- 6. respuestas_produccion
--
-- La fase de producir es texto libre y hoy no se guarda en ningún
-- sitio: el alumno lo escribe, lo compara con el modelo y se pierde.
-- Es lo que después alimentará el bucle de vuelta al profesor.
--
-- `ejercicio_id` es el `Ejercicio.id` del JSON ('gen-3f9a2c-5', 'c23-p1').
-- ===============================================================

create table if not exists public.respuestas_produccion (
  id            uuid        primary key default gen_random_uuid(),
  alumno_id     text        not null,
  bloque_clave  text        not null,
  ejercicio_id  text        not null,

  texto         text        not null,
  enviada_en    timestamptz not null default now(),

  -- Sin tope, una respuesta pegada desde otro sitio podría entrar
  -- entera. 20.000 caracteres son de sobra para un ejercicio de
  -- producción y acotan lo que puede crecer la fila.
  constraint respuestas_produccion_texto_acotado
    check (length(texto) between 1 and 20000)
);

comment on table public.respuestas_produccion is
  'Texto libre de la fase de producir. Materia prima del bucle de vuelta al profesor.';


-- ===============================================================
-- 7. reportes_ejercicio
--
-- El botón de «este ejercicio está mal», que todavía no existe en la
-- interfaz. La tabla va ahora para que la interfaz pueda llegar después
-- sin tocar el esquema.
-- ===============================================================

create table if not exists public.reportes_ejercicio (
  id            uuid        primary key default gen_random_uuid(),
  alumno_id     text        not null,
  bloque_clave  text        not null,
  ejercicio_id  text        not null,

  -- Nullable: reportar tiene que costar un clic. Explicar por qué es
  -- opcional o el botón no se usa.
  motivo        text,

  reportado_en  timestamptz not null default now(),

  -- NULL = pendiente de mirar. Es la cola de trabajo del equipo.
  revisado_en   timestamptz,

  constraint reportes_ejercicio_motivo_acotado
    check (motivo is null or length(motivo) between 1 and 2000)
);

comment on table public.reportes_ejercicio is
  'Reportes de ejercicios defectuosos. revisado_en NULL = pendiente.';


-- ===============================================================
-- ÍNDICES
--
-- `alumno_id` en todas: cada consulta del LMS empieza por «lo de este
-- alumno». Los compuestos llevan además la columna por la que se
-- ordena o se filtra después, para que el índice resuelva la consulta
-- entera y no solo el primer filtro.
-- ===============================================================

-- alumno_vinculos: las dos entradas por las que se resuelve identidad.
-- (`email_normalizado` y `woo_user_id` ya tienen índice por ser UNIQUE,
--  así que no hace falta crearlos otra vez.)

-- sesiones: la comprobación de cada petición entra por la PK. Estos dos
-- son para revocar en bloque y para la limpieza.
create index if not exists idx_sesiones_alumno
  on public.sesiones (alumno_id, creada_en desc)
  where alumno_id is not null;

create index if not exists idx_sesiones_email_admin
  on public.sesiones (email_admin, creada_en desc)
  where email_admin is not null;

-- Parcial: solo las sesiones vivas. Es sobre las que se pregunta.
create index if not exists idx_sesiones_vivas
  on public.sesiones (expira_en)
  where revocada_en is null;

-- bloques_generados: el listado del alumno va del más reciente al más
-- antiguo, y `contarGeneradosEstaSemana` filtra por fecha sobre el
-- mismo par de columnas.
create index if not exists idx_bloques_generados_alumno
  on public.bloques_generados (alumno_id, generado_en desc);

-- progreso_bloques: el mejor intento de cada bloque de un alumno sale
-- de aquí con un `distinct on (bloque_clave)` ordenando por aciertos.
create index if not exists idx_progreso_alumno
  on public.progreso_bloques (alumno_id, bloque_clave, completado_en desc);

-- avance_bloques: la PK (alumno_id, bloque_clave) ya cubre la lectura
-- por alumno, porque alumno_id va primero.

create index if not exists idx_respuestas_alumno
  on public.respuestas_produccion (alumno_id, enviada_en desc);

-- Para el profesor: todas las respuestas de un bloque concreto.
create index if not exists idx_respuestas_bloque
  on public.respuestas_produccion (bloque_clave, enviada_en desc);

create index if not exists idx_reportes_alumno
  on public.reportes_ejercicio (alumno_id, reportado_en desc);

-- Parcial: la cola de pendientes es lo que se mira a diario, y así el
-- índice no carga con los ya revisados.
create index if not exists idx_reportes_pendientes
  on public.reportes_ejercicio (reportado_en desc)
  where revisado_en is null;


-- ===============================================================
-- RLS
--
-- Activado en todas las tablas y SIN NINGUNA POLÍTICA. No es un olvido:
--
--   · El LMS entra siempre desde el servidor con la secret key, que
--     actúa como `service_role` y se salta RLS por definición. Para que
--     la aplicación funcione no hace falta ni una política.
--   · Sin políticas, `anon` y `authenticated` no pueden leer ni escribir
--     absolutamente nada. Es el resultado que queremos: a esta base no
--     se llega desde el navegador, ni hoy ni por accidente mañana.
--
-- Si algún día hiciera falta acceso directo desde el cliente, ese día
-- se escribe la política concreta. Empezar abierto y cerrar después no
-- funciona nunca.
-- ===============================================================

alter table public.alumno_vinculos      enable row level security;
alter table public.sesiones             enable row level security;
alter table public.bloques_generados    enable row level security;
alter table public.progreso_bloques     enable row level security;
alter table public.avance_bloques       enable row level security;
alter table public.respuestas_produccion enable row level security;
alter table public.reportes_ejercicio   enable row level security;


-- ===============================================================
-- PERMISOS
--
-- RLS y GRANT son dos cosas distintas y hacen falta las dos. RLS filtra
-- filas; GRANT decide si el rol puede siquiera mirar la tabla. Quitando
-- el GRANT, un fallo futuro al escribir una política permisiva sigue
-- sin abrir la puerta.
--
-- Es lo mismo que se hizo con las vistas de Gestión.
-- ===============================================================

revoke all on public.alumno_vinculos       from anon, authenticated;
revoke all on public.sesiones              from anon, authenticated;
revoke all on public.bloques_generados     from anon, authenticated;
revoke all on public.progreso_bloques      from anon, authenticated;
revoke all on public.avance_bloques        from anon, authenticated;
revoke all on public.respuestas_produccion from anon, authenticated;
revoke all on public.reportes_ejercicio    from anon, authenticated;

-- Y lo mismo para las tablas que se creen a partir de ahora, que si no
-- nacen con los permisos por defecto de Supabase. Importa para los
-- cursos de LearnDash: son varias tablas más y no conviene depender de
-- acordarse de revocar cada una.
--
-- OJO con el alcance: `alter default privileges` solo se aplica a lo
-- que cree EL MISMO ROL que ejecuta esta sentencia. Aquí eso es
-- `postgres`, el rol del SQL Editor, así que cubre todo lo que se cree
-- desde el panel. Si algún día las tablas las crea otro rol —una
-- herramienta de migraciones con credenciales propias, por ejemplo—
-- esto no las alcanza y hay que revocar a mano o repetir la sentencia
-- para ese rol.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

alter default privileges in schema public
  revoke all on sequences from anon, authenticated;

-- OPCIONAL, el martillo grande. Descomentar solo si se quiere cerrar el
-- esquema entero a los dos roles. Es más contundente que lo de arriba,
-- pero deja el proyecto sin ninguna vía de acceso desde el cliente, así
-- que hay que saber que se está haciendo.
--
-- revoke usage on schema public from anon, authenticated;


-- ===============================================================
-- COMPROBACIÓN
--
-- Tras ejecutar, esto tiene que devolver las 7 tablas con rls = true y
-- politicas = 0.
-- ===============================================================

select
  c.relname                as tabla,
  c.relrowsecurity         as rls,
  count(p.policyname)      as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relname;


-- ===============================================================
-- ROLLBACK
--
-- Descomentar y ejecutar para deshacerlo todo. Borra los datos: no es
-- una migración hacia atrás, es una demolición. En una base con
-- progreso real, exportar antes.
--
-- El orden no importa porque no hay claves ajenas entre estas tablas
-- (ver la nota en `progreso_bloques`), pero se dejan en orden inverso
-- al de creación por costumbre.
-- ===============================================================

-- drop table if exists public.reportes_ejercicio;
-- drop table if exists public.respuestas_produccion;
-- drop table if exists public.avance_bloques;
-- drop table if exists public.progreso_bloques;
-- drop table if exists public.bloques_generados;
-- drop table if exists public.sesiones;
-- drop trigger if exists trg_alumno_vinculos_actualizado on public.alumno_vinculos;
-- drop table if exists public.alumno_vinculos;
-- drop function if exists lms_tocar_actualizado_en();
--
-- -- Los permisos por defecto no se van con las tablas: hay que
-- -- devolverlos a mano si se quiere dejar el proyecto como estaba.
-- alter default privileges in schema public
--   grant all on tables to anon, authenticated;
-- alter default privileges in schema public
--   grant all on sequences to anon, authenticated;


-- ===============================================================
-- 8. intentos_acceso
--
-- Qué pasa cuando alguien intenta entrar y NO acaba en sesión.
--
-- `sesiones` solo guarda los finales felices, así que hasta ahora la
-- pregunta "¿funciona el enlace mágico?" no se podía contestar: si de
-- 172 invitaciones entran 20, sin esta tabla los otros 152 son silencio.
-- Aquí se anota cada desenlace, y el panel compara enlaces enviados con
-- sesiones abiertas.
--
-- SIN EMAIL, A PROPÓSITO. `app/acceso/acciones.ts` se sostiene sobre no
-- revelar quién está registrado; guardar aquí las direcciones que se
-- prueban crearía justo la lista que ese fichero evita. Se guarda el
-- `alumno_id` cuando se sabe —que ya está en Gestión— y para el resto
-- solo el recuento.
-- ===============================================================

create table if not exists public.intentos_acceso (
  id            uuid        primary key default gen_random_uuid(),

  -- Null cuando el email no correspondía a ningún alumno, o cuando era
  -- del equipo: ahí no hay ficha que señalar.
  alumno_id     text,
  rol           text        not null,
  resultado     text        not null,
  origen        text        not null default 'magic_link',
  creado_en     timestamptz not null default now(),

  constraint intentos_acceso_rol_valido
    check (rol in ('alumno', 'admin', 'desconocido')),

  constraint intentos_acceso_origen_valido
    check (origen in ('magic_link', 'woocommerce')),

  -- Los seis finales que no son una sesión, más el enlace enviado, que
  -- es el denominador con el que se comparan las sesiones.
  constraint intentos_acceso_resultado_valido
    check (resultado in (
      'enlace_enviado',    -- salió el correo
      'envio_fallido',     -- Resend lo rechazó
      'sin_cuenta',        -- email bien escrito, sin ficha ni equipo
      'email_invalido',    -- ni siquiera parecía un email
      'enlace_caducado',   -- pulsó tarde, o el token venía roto
      'sin_ficha'          -- pidió el enlace y para cuando lo pulsó ya no estaba en Gestión
    ))
);

comment on table public.intentos_acceso is
  'Intentos de acceso que no acabaron en sesión, más los enlaces enviados. Sin emails: solo alumno_id cuando se conoce.';

-- El panel siempre pregunta por una ventana de tiempo.
create index if not exists idx_intentos_acceso_fecha
  on public.intentos_acceso (creado_en desc);
