-- ===============================================================
-- ESQUEMA DE CURSOS
--
-- Ejecutar en el SQL Editor del proyecto NUEVO de Supabase, el de
-- LMS_SUPABASE_URL (ref vyuk…it). El mismo donde ya están las siete
-- tablas de `lms-esquema.sql`.
--
-- Sustituye a LearnDash. Convive con la práctica generada por IA sin
-- tocarla: el curso enseña contenido estructurado, la práctica genera
-- ejercicios desde el perfil y la última clase. Son dos cosas y no
-- comparten ni una tabla.
--
-- Idempotente (`if not exists`). Rollback comentado al final.
--
-- ---------------------------------------------------------------
-- TRES AJUSTES SOBRE LO PROPUESTO, Y POR QUÉ
--
-- 1. `learndash_id` es ÚNICO en las cuatro tablas de contenido. Sin
--    unicidad, `on conflict (learndash_id)` no existe como cláusula y
--    el importador no puede ser idempotente. Es el requisito de la
--    Tarea 3 traducido a esquema.
--
-- 2. `ejercicios_leccion.correcta` es JSONB, no un escalar. Los cuatro
--    tipos guardan formas distintas y ninguna columna simple las cubre:
--
--      single   → [2]                un índice sobre `opciones`
--      multiple → [0, 3]             varios índices
--      cloze    → ["was", "were"]    respuestas aceptadas, por hueco
--      essay    → null               no hay respuesta automática
--
--    Con un `integer` habría que inventar una convención para cloze y
--    dejar `multiple` fuera. El CHECK de abajo obliga a que essay sea
--    el único con NULL.
--
-- 3. `progreso_lecciones` lleva UNIQUE (alumno_id, leccion_id), a
--    diferencia de `progreso_bloques`, que es append-only.
--
--    No es incoherencia: un bloque de práctica guarda una NOTA y
--    repetirlo produce otra nota que hay que conservar para calcular el
--    mejor intento. Una lección de curso guarda un HECHO —está vista—
--    y volver a verla no genera un dato nuevo. Los intentos de
--    ejercicio sí son append-only, igual que la práctica.
--
-- ---------------------------------------------------------------
-- UN HALLAZGO DEL EXPORT QUE AFECTA AL MODELO
--
-- La premisa era que los ejercicios cuelgan de las lecciones. En el
-- material real, de los 581 quizzes:
--
--      15 cuelgan de un topic  (lo que aquí es `lecciones`)
--     377 cuelgan de un módulo (lo que aquí es `modulos`)
--     189 no son alcanzables desde `ld_course_steps`
--
-- O sea que el caso mayoritario es el que el modelo no contemplaba.
--
-- La solución NO es cambiar el esquema, sino el importador: por cada
-- quiz de módulo se crea una lección sintética al final de ese módulo
-- —"Ejercicios: <título del quiz>"— y el ejercicio cuelga de ella. Se
-- eligió así porque es también lo que ve el alumno: termina las
-- lecciones del módulo y al final le toca practicar. La alternativa
-- —`leccion_id` nullable más un `modulo_id`— obligaría a que toda
-- consulta contemplase dos padres posibles para siempre.
--
-- Esas lecciones sintéticas se reconocen por tener `contenido` vacío y
-- `learndash_id` igual al del quiz.
-- ===============================================================


-- ===============================================================
-- 1. cursos
-- ===============================================================

create table if not exists public.cursos (
  id            uuid        primary key default gen_random_uuid(),

  -- Para la URL: /cursos/b2-first. Estable aunque cambie el título.
  slug          text        not null unique,
  titulo        text        not null,

  nivel         text        not null,
  tipo          text        not null,

  -- Solo para los de tipo `examen`. Los valores son los mismos que
  -- `TipoExamen` en lib/data.ts, incluido `ielts`, que hoy no tiene
  -- curso: si el día que exista se hubiera dejado fuera del CHECK,
  -- habría que migrar la restricción para dar de alta un curso.
  examen        text,

  descripcion   text,
  orden         integer     not null default 0,
  activo        boolean     not null default true,

  -- Trazabilidad con el origen. Único: es la clave de conflicto del
  -- importador. Nullable porque un curso creado a mano aquí no viene
  -- de ningún LearnDash.
  learndash_id  bigint      unique,

  creado_en     timestamptz not null default now(),

  constraint cursos_nivel_valido
    check (nivel in ('A2', 'B1', 'B2', 'C1')),

  constraint cursos_tipo_valido
    check (tipo in ('general', 'examen')),

  constraint cursos_examen_valido
    check (examen is null or examen in ('b2_first', 'b1_preliminary', 'c1_advanced', 'ielts')),

  -- La misma disciplina que en `sesiones`: el tipo manda sobre qué
  -- campos pueden existir, y una fila incoherente no llega a crearse.
  constraint cursos_examen_segun_tipo
    check ((tipo = 'examen' and examen is not null) or (tipo = 'general' and examen is null))
);

comment on table public.cursos is
  'Cursos del LMS. Sustituyen a LearnDash. No tienen relación con los bloques de práctica generados por IA.';


-- ===============================================================
-- 2. modulos
--
-- Son los `sfwd-lessons` de LearnDash, que en el negocio se llaman
-- módulos. El nombre de aquí es el del negocio, no el de LearnDash: el
-- vocabulario de la herramienta que se va no tiene por qué sobrevivirla.
-- ===============================================================

create table if not exists public.modulos (
  id            uuid        primary key default gen_random_uuid(),

  -- CASCADE de verdad, no como `bloque_clave` en el otro esquema: aquí
  -- padre e hijo viven en esta misma base, así que la integridad la
  -- puede sostener Postgres. Borrar un curso se lleva su árbol entero.
  curso_id      uuid        not null references public.cursos(id) on delete cascade,

  titulo        text        not null,
  orden         integer     not null default 0,
  learndash_id  bigint      unique,

  creado_en     timestamptz not null default now()
);

comment on table public.modulos is
  'Módulos de un curso (sfwd-lessons en LearnDash).';


-- ===============================================================
-- 3. lecciones
--
-- Son los `sfwd-topic`. El HTML viene limpio: ni un solo topic del
-- export trae `_elementor_data`, así que `contenido` se guarda tal cual
-- sale de `post_content` y no hace falta ninguna conversión.
--
-- SOBRE `video_url`: el vídeo de LearnDash NO viaja en el HTML. Vive en
-- la meta del topic (`sfwd-topic_lesson_video_url`) y son 160 topics,
-- todos de YouTube. Los 160 tienen además `post_content` vacío: son
-- topics que son un vídeo y nada más, así que sin esta columna no es
-- que se perdiera el vídeo, es que la lección entera desaparecía por
-- parecer vacía. Columna aparte y no incrustado en `contenido` porque
-- la vista lo pinta arriba, con su propio marco.
-- ===============================================================

create table if not exists public.lecciones (
  id            uuid        primary key default gen_random_uuid(),
  modulo_id     uuid        not null references public.modulos(id) on delete cascade,

  titulo        text        not null,

  -- Vacío en las lecciones sintéticas que solo contienen ejercicios.
  -- Ver la nota sobre el hallazgo, arriba.
  contenido     text        not null default '',

  -- URL de YouTube tal cual venía. NULL = la lección no tiene vídeo.
  video_url     text,

  orden         integer     not null default 0,
  learndash_id  bigint      unique,

  creado_en     timestamptz not null default now()
);

-- Para las bases donde la tabla ya existía sin la columna: este script
-- es `if not exists`, así que el `create` de arriba no se vuelve a
-- ejecutar y por sí solo no la añadiría.
alter table public.lecciones add column if not exists video_url text;

comment on table public.lecciones is
  'Lecciones de un módulo (sfwd-topic). Sin contenido, sin vídeo y con ejercicios = lección de solo práctica.';

comment on column public.lecciones.video_url is
  'URL de YouTube de la meta sfwd-topic_lesson_video_url. NULL si no hay vídeo.';


-- ===============================================================
-- 4. ejercicios_leccion
-- ===============================================================

create table if not exists public.ejercicios_leccion (
  id            uuid        primary key default gen_random_uuid(),
  leccion_id    uuid        not null references public.lecciones(id) on delete cascade,

  tipo          text        not null,
  enunciado     text        not null,

  -- Las opciones tal cual venían, en orden. Para `essay` va un array
  -- vacío: no hay nada que elegir.
  opciones      jsonb       not null default '[]'::jsonb,

  -- Ver el ajuste 2 de la cabecera. NULL solo en `essay`.
  correcta      jsonb,

  explicacion   text,
  orden         integer     not null default 0,
  learndash_id  bigint      unique,

  creado_en     timestamptz not null default now(),

  constraint ejercicios_tipo_valido
    check (tipo in ('single', 'multiple', 'cloze', 'essay')),

  -- Un `essay` sin corrección automática es correcto; cualquier otro
  -- tipo sin respuesta es un ejercicio que el alumno no puede fallar ni
  -- acertar, o sea un fallo de importación disfrazado de ejercicio.
  constraint ejercicios_correcta_segun_tipo
    check ((tipo = 'essay' and correcta is null) or (tipo <> 'essay' and correcta is not null)),

  constraint ejercicios_opciones_es_array
    check (jsonb_typeof(opciones) = 'array')
);

comment on table public.ejercicios_leccion is
  'Ejercicios de una lección. Los de tipo essay no tienen corrección automática: correcta va NULL y hay que decidir qué se hace con ellos.';

comment on column public.ejercicios_leccion.correcta is
  'single/multiple: array de índices sobre opciones. cloze: array de respuestas aceptadas. essay: NULL.';


-- ===============================================================
-- 5. progreso_lecciones
--
-- `origen` es lo que permite deshacer solo la migración si sale mal:
--
--   delete from progreso_lecciones where origen = 'learndash_migrado';
--
-- y lo hecho en la plataforma nueva se queda.
--
-- SOBRE LA MIGRACIÓN (pendiente, no la hace este esquema):
-- LearnDash identifica por `user_id` de WordPress y nosotros por
-- `alumno_id` de Gestión. La resolución debe intentarse EN ESTE ORDEN:
--
--   1. `alumno_vinculos.woo_user_id` — el user_id de LearnDash ES el id
--      de usuario de WordPress, o sea exactamente esa columna. No
--      depende del email y es el puente fiable.
--   2. email normalizado contra `vista_perfil_alumno` de Gestión.
--
-- El orden importa: el email es el que falla cuando un alumno lo cambia
-- en uno de los tres sistemas y no en los otros. Al cruzar el export se
-- resolvió el 86,0% de los usuarios activos solo por email; el vínculo
-- por id sube esa cifra sola, según los alumnos vayan entrando por el
-- botón de WooCommerce.
-- ===============================================================

create table if not exists public.progreso_lecciones (
  id            uuid        primary key default gen_random_uuid(),

  -- El `id` de `students` en Gestión. Sin clave ajena: Gestión es otra
  -- base y además de solo lectura.
  alumno_id     text        not null,
  leccion_id    uuid        not null references public.lecciones(id) on delete cascade,

  completada_en timestamptz not null default now(),
  origen        text        not null default 'lms',

  constraint progreso_lecciones_origen_valido
    check (origen in ('lms', 'learndash_migrado')),

  -- Una lección se completa una vez. Ver el ajuste 3 de la cabecera.
  constraint progreso_lecciones_una_por_alumno
    unique (alumno_id, leccion_id)
);

comment on table public.progreso_lecciones is
  'Lecciones completadas. UNIQUE por alumno y lección: completar dos veces no genera dos filas.';


-- ===============================================================
-- 6. intentos_ejercicio
--
-- Append-only, igual que `progreso_bloques` en la práctica: cada
-- intento es una fila y ninguno pisa al anterior. Es lo que permite ver
-- si alguien acertó a la primera o a la quinta.
-- ===============================================================

create table if not exists public.intentos_ejercicio (
  id            uuid        primary key default gen_random_uuid(),
  alumno_id     text        not null,
  ejercicio_id  uuid        not null references public.ejercicios_leccion(id) on delete cascade,

  correcto      boolean     not null,
  respondido_en timestamptz not null default now(),

  -- ⚠ NO ESTABA EN TU LISTA. Lo añado por simetría con
  -- `progreso_lecciones`: `user_activity.ld` trae 13.101 registros de
  -- tipo quiz, así que el día que se migren hará falta distinguirlos de
  -- los hechos aquí, y añadir la columna entonces obliga a decidir qué
  -- valor toman las filas ya existentes. Si no lo querés, se borra esta
  -- columna y su CHECK y no arrastra nada.
  origen        text        not null default 'lms',

  constraint intentos_ejercicio_origen_valido
    check (origen in ('lms', 'learndash_migrado'))
);

comment on table public.intentos_ejercicio is
  'Un intento por fila; nunca se pisa el anterior.';


-- ===============================================================
-- ÍNDICES
--
-- Las claves ajenas NO llevan índice automático en Postgres: solo lo
-- llevan las claves primarias y las restricciones únicas. Sin estos, un
-- `delete` en cascada sobre un curso obliga a recorrer las hijas
-- enteras, y la consulta de "las lecciones de este módulo" también.
-- ===============================================================

create index if not exists idx_modulos_curso
  on public.modulos (curso_id, orden);

create index if not exists idx_lecciones_modulo
  on public.lecciones (modulo_id, orden);

create index if not exists idx_ejercicios_leccion
  on public.ejercicios_leccion (leccion_id, orden);

-- Cada consulta del LMS empieza por "lo de este alumno".
create index if not exists idx_progreso_lecciones_alumno
  on public.progreso_lecciones (alumno_id, completada_en desc);

-- Para deshacer la migración y para contar qué vino de dónde.
create index if not exists idx_progreso_lecciones_origen
  on public.progreso_lecciones (origen)
  where origen = 'learndash_migrado';

create index if not exists idx_intentos_alumno
  on public.intentos_ejercicio (alumno_id, respondido_en desc);

-- El mejor intento de un ejercicio concreto de un alumno.
create index if not exists idx_intentos_alumno_ejercicio
  on public.intentos_ejercicio (alumno_id, ejercicio_id, respondido_en desc);

-- El listado de cursos visibles, que es la portada de la sección.
create index if not exists idx_cursos_activos
  on public.cursos (orden, nivel)
  where activo;


-- ===============================================================
-- RLS
--
-- Activado y SIN POLÍTICAS, igual que en `lms-esquema.sql`. El LMS
-- entra siempre desde el servidor con la secret key, que se salta RLS,
-- así que no hace falta ninguna política para que funcione; y sin
-- políticas, `anon` y `authenticated` no pueden leer ni escribir nada.
--
-- Merece una nota aquí porque el contenido de los cursos NO es dato
-- personal y podría parecer que da igual dejarlo abierto. No da igual:
-- es material propio de la academia, y abrirlo a `anon` significa que
-- cualquiera con la URL del proyecto se lleva los 8 cursos enteros.
-- ===============================================================

alter table public.cursos             enable row level security;
alter table public.modulos            enable row level security;
alter table public.lecciones          enable row level security;
alter table public.ejercicios_leccion enable row level security;
alter table public.progreso_lecciones enable row level security;
alter table public.intentos_ejercicio enable row level security;


-- ===============================================================
-- PERMISOS
--
-- RLS filtra filas; GRANT decide si el rol puede mirar la tabla. Hacen
-- falta los dos, por lo mismo que en el esquema anterior.
--
-- El `alter default privileges` de `lms-esquema.sql` ya cubre las
-- tablas nuevas creadas por el mismo rol, pero se revoca aquí también
-- de forma explícita: depender de una sentencia escrita en otro archivo
-- para que estas seis tablas estén cerradas es un acoplamiento que no
-- se ve al leer este.
-- ===============================================================

revoke all on public.cursos             from anon, authenticated;
revoke all on public.modulos            from anon, authenticated;
revoke all on public.lecciones          from anon, authenticated;
revoke all on public.ejercicios_leccion from anon, authenticated;
revoke all on public.progreso_lecciones from anon, authenticated;
revoke all on public.intentos_ejercicio from anon, authenticated;


-- ===============================================================
-- COMPROBACIÓN
--
-- Tras ejecutar, las trece tablas (las 7 de antes + estas 6) deben
-- salir con rls = true y politicas = 0.
-- ===============================================================

select
  c.relname           as tabla,
  c.relrowsecurity    as rls,
  count(p.policyname) as politicas
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
-- Descomentar y ejecutar para deshacerlo. Borra el contenido de los
-- cursos y el progreso que haya sobre ellos.
--
-- Aquí el orden SÍ importa, al revés que en `lms-esquema.sql`: estas
-- tablas sí tienen claves ajenas entre sí. Van de hija a madre. (Con
-- `cascade` bastaría el primer drop, pero se dejan explícitas para que
-- se vea qué se está borrando.)
--
-- Si solo querés deshacer la MIGRACIÓN de progreso y conservar los
-- cursos, no hace falta nada de esto:
--   delete from public.progreso_lecciones where origen = 'learndash_migrado';
--   delete from public.intentos_ejercicio where origen = 'learndash_migrado';
-- ===============================================================

-- drop table if exists public.intentos_ejercicio;
-- drop table if exists public.progreso_lecciones;
-- drop table if exists public.ejercicios_leccion;
-- drop table if exists public.lecciones;
-- drop table if exists public.modulos;
-- drop table if exists public.cursos;
