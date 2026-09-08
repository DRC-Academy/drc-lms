-- ===============================================================
-- TRADUCCIONES DE BLOQUE
--
-- Un bloque se escribe en un idioma —hoy inglés, ver
-- `IDIOMA_BLOQUE_POR_DEFECTO` en lib/prompt-bloque.ts— y el alumno tiene
-- un botón para leerlo en el otro. Esta tabla guarda esa segunda
-- versión, escrita una vez y servida siempre.
--
-- SOLO SE TRADUCE EL ANDAMIO. El título, la intro, las instrucciones,
-- los contextos, las pistas, los criterios, las explicaciones y los
-- veredictos. El ejercicio —la frase con el hueco, las opciones, la
-- frase de partida, las respuestas aceptadas y el modelo— va en inglés
-- en las dos versiones porque es lo que se practica, y por eso NO está
-- aquí. Que no esté no es un ahorro de espacio: es lo que hace
-- imposible que las dos versiones acaben en desacuerdo sobre cuál era
-- la respuesta buena.
--
-- ---------------------------------------------------------------
-- POR QUÉ UNA TABLA Y NO UN CAMPO DENTRO DE `contenido`
--
-- La primera idea fue meterla en `bloques_generados.contenido`, que es
-- un jsonb con el `Bloque` entero y por tanto no pedía migración. Se
-- descartó por dos razones, y la segunda es la que decide:
--
--   1. Escribir ahí es leer el JSON, modificarlo y volver a escribirlo
--      entero. Dos peticiones a la vez sobre el mismo bloque —el alumno
--      y el equipo revisándolo, o dos pestañas— y la última pisa a la
--      primera con una copia vieja de todo lo demás.
--
--   2. Y sobre todo: LOS NUEVE BLOQUES DEL CATÁLOGO NO TIENEN FILA.
--      Viven en `lib/data.ts`, se sirven desde `app/practica/page.tsx` y
--      llegan al alumno igual que los generados. Con la traducción
--      dentro de `contenido` no habría dónde guardar la suya, y el botón
--      se quedaría muerto justo en los bloques que más gente comparte.
--
-- La clave es `bloque_clave`, que es el identificador que TODOS los
-- bloques tienen —el del catálogo, el del banco y el generado—, y es la
-- misma con la que los referencian `progreso_bloques` y `avance_bloques`.
-- Ver la nota sobre claves en `supabase/lms-esquema.sql`.
--
-- ---------------------------------------------------------------
-- SE COMPARTE, Y ESO ES LO QUE SE BUSCA
--
-- No hay `alumno_id`. Un bloque del catálogo lo tienen delante todos los
-- alumnos de su nivel, así que traducirlo una vez sirve para todos: el
-- primero que pulsa el botón lo paga y el resto lo encuentra hecho.
--
-- Y no filtra nada entre alumnos: un bloque generado tiene una clave
-- única por generación ('gen-3f9a2c'), así que su traducción solo la
-- alcanza quien alcanza el bloque.
-- ===============================================================

create table if not exists public.traducciones_bloque (
  -- El `Bloque.id`: 'conditionals-2-3' en el catálogo, 'gen-3f9a2c' en
  -- lo generado. No es una FK: los del catálogo no están en ninguna
  -- tabla, y exigirla dejaría fuera justo al caso que motiva el diseño.
  bloque_clave  text        not null,

  -- EL IDIOMA DE LA TRADUCCIÓN, no el del bloque. Si el bloque está en
  -- inglés, aquí hay una fila 'es'. En la columna va el destino porque
  -- es lo que se busca: el visor pide "este bloque en español".
  idioma        text        not null,

  -- El andamio traducido. Ver `TraduccionBloque` en
  -- `lib/traduccion-bloque.ts`, que es quien fija la forma y quien la
  -- valida al leer: se guarda entera y sin descomponer por la misma
  -- razón que `bloques_generados.contenido`.
  contenido     jsonb       not null,

  -- Qué modelo la escribió. Sirve para saber qué hay que rehacer si
  -- alguna tirada sale mal: sin esto, una tanda mala no se distingue de
  -- una buena y habría que tirarlas todas.
  modelo        text        not null,

  creado_en     timestamptz not null default now(),

  -- UNA TRADUCCIÓN POR BLOQUE E IDIOMA. Es lo que convierte la segunda
  -- pulsación —y la de cualquier otro alumno— en una lectura en vez de
  -- otra llamada al modelo.
  primary key (bloque_clave, idioma),

  constraint traducciones_idioma_valido
    -- Los dos de `Bloque["idioma"]` en lib/data.ts.
    check (idioma in ('en', 'es')),

  constraint traducciones_contenido_es_objeto
    check (jsonb_typeof(contenido) = 'object')
);

comment on table public.traducciones_bloque is
  'La otra versión del andamio de un bloque: título, intro, instrucciones, contextos, pistas, criterios, explicaciones y veredictos. El ejercicio en sí no se traduce y no está aquí.';

comment on column public.traducciones_bloque.idioma is
  'El idioma DE la traducción, no el del bloque. Un bloque en inglés tiene aquí una fila es.';
