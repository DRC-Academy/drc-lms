-- ===============================================================
-- PRUEBA DE NIVEL EN EL LMS (BLACK PASS)
--
-- ⚠ SE EJECUTA EN LA BASE DEL LMS (LMS_SUPABASE_URL), NO EN GESTIÓN.
-- Antes de pulsar «Run», comprueba el ref del proyecto abierto.
--
-- Va entero en una transacción: si algo falla, no queda nada a medias.
-- Es idempotente: se puede volver a ejecutar. El deshacer está al final.
--
-- QUÉ ES. La misma prueba de nivel de Gestión (mismas preguntas, misma
-- lógica adaptativa, misma puntuación y la misma corrección de la redacción
-- con IA), copiada al LMS para quien tiene Black Pass y no tiene plan con
-- profesor. Ver lib/prueba-nivel/ORIGEN.md. EL LMS NUNCA ESCRIBE EN GESTIÓN:
-- el resultado se queda aquí.
--
-- DOS PIEZAS:
--   1. `pruebas_nivel`: una fila por intento, con sus respuestas, su
--      puntuación, el nivel y el curso recomendado.
--   2. `fundir_pase_en_ficha`: cuando a alguien con id `pase-…` le crean
--      ficha, sus pruebas pasan a la ficha como el resto de lo suyo.
--
-- SOLO EL SERVIDOR. RLS activado y sin políticas, como el resto del
-- esquema; solo `service_role` lee y escribe.
-- ===============================================================

begin;


-- ===============================================================
-- ANTES DE NADA: QUE `fundir_pase_en_ficha()` SEA LA QUE ESPERO
--
-- Más abajo se recrea con un paso más. Si la de producción se hubiera
-- cambiado a mano desde lms-pases.sql, recrearla perdería ese cambio, así que
-- se compara (sin espacios) y, si no coincide, aquí se para todo sin haber
-- tocado nada. Vale la de lms-pases.sql y la de este archivo (para poder
-- ejecutarlo dos veces).
-- ===============================================================

do $$
declare
  actual text;
begin
  select md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) into actual
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'fundir_pase_en_ficha';

  if actual is null then
    raise exception 'No existe public.fundir_pase_en_ficha(): ¿es la base del LMS? ¿Está ejecutado lms-pases.sql?';
  end if;

  if actual not in ('dd8295f0f8a559b19ed3c5d3f4a02857', '6bc958e16c7680afbb27c986b0af5ece') then
    raise exception 'fundir_pase_en_ficha() no es la esperada (md5 %). No se ha cambiado nada.', actual;
  end if;
end $$;


-- ===============================================================
-- 1. pruebas_nivel — UNA FILA POR INTENTO
--
-- `alumno_id` es el de la sesión: la ficha, o el `pase-…` de quien no la
-- tiene. Repetir la prueba es una fila nueva: las anteriores se quedan como
-- historial.
--
-- LAS RESPUESTAS VAN EN LA MISMA FILA (`respuestas`, un array JSON en orden
-- cronológico, que es lo que exige la puntuación de Gestión). `n_respuestas`
-- es su longitud y hace de cerrojo: el servidor guarda una respuesta solo si
-- `n_respuestas` sigue valiendo lo que leyó, así que un doble envío no se
-- cuenta dos veces.
--
-- SOLO UNA EN CURSO POR ALUMNO (el índice único parcial): retomar es seguir
-- con esa, y empezar otra solo se puede cuando no hay ninguna abierta.
--
-- `banco`: la huella sha256 de lib/prueba-nivel/banco.json con el que se
-- hizo. Si un día cambia el banco, se sabe con cuál salió cada nivel.
-- ===============================================================

create table if not exists public.pruebas_nivel (
  id                   uuid        primary key default gen_random_uuid(),
  alumno_id            text        not null check (btrim(alumno_id) <> ''),
  email                text,
  estado               text        not null default 'en_curso'
                                   check (estado in ('en_curso', 'terminada', 'abandonada')),
  dificultad_actual    integer     not null default 3 check (dificultad_actual between 1 and 6),
  pregunta_actual      text,
  respuestas           jsonb       not null default '[]'::jsonb check (jsonb_typeof(respuestas) = 'array'),
  n_respuestas         integer     not null default 0 check (n_respuestas >= 0),
  -- El resultado, con las mismas piezas que guarda Gestión:
  puntuacion_lectura   numeric(5,2),
  puntuacion_escritura numeric(5,2),
  puntuacion_total     numeric(5,2),
  nivel                text        check (nivel in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  -- El que habría salido de la puntuación sin la compuerta de C1/C2, y por qué se bajó.
  nivel_por_puntuacion text        check (nivel_por_puntuacion in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  tope                 text,
  -- Provisional: la redacción no se pudo puntuar y el nivel sale solo de la lectura.
  provisional          boolean,
  motivo_provisional   text,
  evaluacion_escritura jsonb,
  curso_recomendado    uuid        references public.cursos(id) on delete set null,
  banco                text        not null,
  creada_en            timestamptz not null default now(),
  actualizada_en       timestamptz not null default now(),
  terminada_en         timestamptz
);

create unique index if not exists pruebas_nivel_una_en_curso
  on public.pruebas_nivel (alumno_id) where estado = 'en_curso';

create index if not exists idx_pruebas_nivel_alumno
  on public.pruebas_nivel (alumno_id, creada_en desc);


-- ===============================================================
-- 2. fundir_pase_en_ficha — AHORA TAMBIÉN MUEVE LAS PRUEBAS
--
-- La misma función de lms-pases.sql con un paso más, antes de revocar las
-- sesiones. Todo lo demás, letra por letra igual.
-- ===============================================================

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

  -- La prueba de nivel (lms-prueba-nivel.sql). Solo puede haber una en curso
  -- por alumno: si la ficha ya tiene una empezada, la del pase se cierra como
  -- abandonada antes de moverla. Las terminadas se mueven todas.
  update public.pruebas_nivel
     set estado = 'abandonada', actualizada_en = now()
   where alumno_id = p_pase_alumno_id
     and estado = 'en_curso'
     and exists (select 1 from public.pruebas_nivel f
                  where f.alumno_id = p_ficha_id and f.estado = 'en_curso');
  update public.pruebas_nivel set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;

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


-- ===============================================================
-- 3. PERMISOS: SOLO EL SERVIDOR
-- ===============================================================

alter table public.pruebas_nivel enable row level security;

revoke all on public.pruebas_nivel from anon, authenticated;
grant select, insert, update, delete on public.pruebas_nivel to service_role;

revoke execute on function public.fundir_pase_en_ficha(text, text) from public, anon, authenticated;
grant execute on function public.fundir_pase_en_ficha(text, text) to service_role;

commit;


-- ===============================================================
-- COMPROBACIÓN. Es una sola consulta: al ejecutar el archivo entero, el
-- editor de Supabase enseña solo este resultado. Pásame la tabla.
--
-- En cada fila, `obtenido` tiene que coincidir con `esperado`.
-- ===============================================================

select 1 as orden, 'pruebas_nivel' as comprobacion,
       format('rls=%s politicas=%s anon_lee=%s servidor_escribe=%s',
              c.relrowsecurity::text, count(p.policyname),
              has_table_privilege('anon', c.oid, 'select')::text,
              has_table_privilege('service_role', c.oid, 'insert')::text) as obtenido,
       'rls=true politicas=0 anon_lee=false servidor_escribe=true' as esperado
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
 where n.nspname = 'public' and c.relname = 'pruebas_nivel'
 group by c.relrowsecurity, c.oid
union all
select 2, 'una sola en curso por alumno',
       coalesce((select 'índice ' || indexname from pg_indexes
                  where schemaname = 'public' and indexname = 'pruebas_nivel_una_en_curso'), 'falta'),
       'índice pruebas_nivel_una_en_curso'
union all
select 3, 'fundir_pase_en_ficha mueve las pruebas',
       (select md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g')))
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'fundir_pase_en_ficha'),
       '6bc958e16c7680afbb27c986b0af5ece'
union all
select 4, 'permisos de fundir_pase_en_ficha',
       format('anon=%s servidor=%s',
              has_function_privilege('anon', 'public.fundir_pase_en_ficha(text, text)', 'execute')::text,
              has_function_privilege('service_role', 'public.fundir_pase_en_ficha(text, text)', 'execute')::text),
       'anon=false servidor=true'
union all
select 5, 'cursos generales para recomendar',
       (select string_agg(nivel, ', ' order by nivel) from public.cursos
         where tipo = 'general' and nivel in ('A2', 'B1', 'B2', 'C1')),
       'A2, B1, B2, C1'
 order by 1;


-- ===============================================================
-- DESHACER (comentado). Vuelve a dejar fundir_pase_en_ficha como en
-- lms-pases.sql y borra la tabla CON LOS RESULTADOS que haya.
-- ===============================================================

-- begin;
-- create or replace function public.fundir_pase_en_ficha(p_pase_alumno_id text, p_ficha_id text)
-- returns table (lecciones integer, intentos integer, pases integer)
-- language plpgsql
-- set search_path = ''
-- as $$
-- declare
--   n_lecciones integer;
--   n_intentos  integer;
--   n_pases     integer;
-- begin
--   if p_pase_alumno_id is null or p_pase_alumno_id not like 'pase-%' then
--     raise exception 'fundir_pase_en_ficha: % no es un id de pase', p_pase_alumno_id;
--   end if;
--   if p_ficha_id is null or btrim(p_ficha_id) = '' or p_ficha_id like 'pase-%' then
--     raise exception 'fundir_pase_en_ficha: % no es una ficha', p_ficha_id;
--   end if;
--
--   -- Una lección que ya tiene hecha se queda con la fecha más antigua.
--   update public.progreso_lecciones f
--      set completada_en = least(f.completada_en, p.completada_en)
--     from public.progreso_lecciones p
--    where f.alumno_id = p_ficha_id
--      and p.alumno_id = p_pase_alumno_id
--      and p.leccion_id = f.leccion_id;
--
--   delete from public.progreso_lecciones p
--    where p.alumno_id = p_pase_alumno_id
--      and exists (select 1 from public.progreso_lecciones f
--                   where f.alumno_id = p_ficha_id and f.leccion_id = p.leccion_id);
--
--   update public.progreso_lecciones set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
--   get diagnostics n_lecciones = row_count;
--
--   update public.intentos_ejercicio set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
--   get diagnostics n_intentos = row_count;
--
--   update public.accesos         set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
--   update public.eventos         set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
--   update public.intentos_acceso set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
--
--   -- Si en la ficha ya había elección, manda esa.
--   insert into public.curso_elegido (alumno_id, curso_id, elegido_en)
--   select p_ficha_id, c.curso_id, c.elegido_en
--     from public.curso_elegido c
--    where c.alumno_id = p_pase_alumno_id
--   on conflict (alumno_id) do nothing;
--   delete from public.curso_elegido where alumno_id = p_pase_alumno_id;
--
--   update public.pases_curso set alumno_id = p_ficha_id where alumno_id = p_pase_alumno_id;
--   get diagnostics n_pases = row_count;
--
--   update public.sesiones
--      set revocada_en = now()
--    where alumno_id = p_pase_alumno_id and revocada_en is null;
--
--   if n_pases > 0 then
--     perform public.registrar_pase_log(
--       'base', 'fusionado',
--       p_detalle => jsonb_build_object('de', p_pase_alumno_id, 'a', p_ficha_id, 'lecciones', n_lecciones, 'intentos', n_intentos)
--     );
--   end if;
--
--   return query select n_lecciones, n_intentos, n_pases;
-- end;
-- $$;
-- drop table if exists public.pruebas_nivel;
-- commit;
