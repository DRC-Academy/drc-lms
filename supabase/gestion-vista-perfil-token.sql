-- ===============================================================
-- AMPLIAR vista_perfil_alumno CON EL TOKEN DEL FORMULARIO
--
-- ⚠ ESTO SE EJECUTA EN LA BASE DE DRC GESTIÓN, NO EN LA DEL LMS.
-- Es el único archivo de esta carpeta que no es del LMS: está aquí
-- porque el LMS depende de lo que hace, y si vive en el otro lado nadie
-- de este recuerda que existe.
--
-- QUÉ AÑADE: dos columnas al final de la vista.
--
--   form_token           el token que ese alumno puede usar AHORA MISMO,
--                        o NULL si no tiene ninguno utilizable. Hoy son
--                        123 de los 169.
--
--   form_token_enviado_en  cuándo se le emitió el último token, EN EL
--                        ESTADO QUE SEA. NULL si nunca se le emitió
--                        ninguno: hoy, 87 de los 169.
--
-- LA SEGUNDA COLUMNA EXISTE PARA NO MENTIRLE AL ALUMNO. Sin ella, el
-- LMS solo sabe "tiene token utilizable: sí o no", y el aviso que ve
-- quien no lo tiene tendría que elegir entre dos frases que son falsas
-- la mitad de las veces: "tu profesor te lo ENVIÓ" es mentira para los
-- 87 que nunca recibieron nada, y "te lo ENVIARÁ" es raro para los 4 que
-- sí lo recibieron y se les caducó. Con la fecha, cada uno lee lo suyo.
--
-- No es el token ni nada aprovechable: es una marca de tiempo.
--
-- POR QUÉ EN LA VISTA Y NO LEYENDO `form_tokens` DESDE EL LMS. El LMS
-- entra en Gestión por `lib/supabase-server.ts`, que solo deja leer dos
-- vistas y lo llama "el contrato". Meter `form_tokens` en ese contrato
-- traería `teacher_id`, `student_email`, `plan` y `assignment_id`, que
-- el LMS no necesita y no debería poder ver. Con la columna aquí, el
-- contrato sigue siendo de dos vistas y por él viaja un solo dato.
--
-- Y hay una regla que hay que escribir en algún sitio: 4 alumnos tienen
-- más de un token y uno tiene siete. Escrita en la vista se escribe una
-- vez; escrita en el LMS habría que repetirla cada vez que alguien más
-- necesite el token.
--
-- ---------------------------------------------------------------
-- QUÉ ES "UTILIZABLE", Y POR QUÉ NO SE MIRA `status`
--
--   completed_at is null   → no lo ha rellenado ya
--   expires_at   > now()   → no ha caducado
--
-- `status` NO se usa, y no es una preferencia de estilo: a día de hoy
-- hay 3 tokens en `pending` que ya pasaron su `expires_at` y 1 marcado
-- `expired` que tiene `completed_at`. La columna no la mantiene nadie.
-- Las fechas sí son ciertas.
--
-- `order by created_at desc limit 1` → si hay varios utilizables, el
-- último emitido, que es el que el equipo acaba de mandar.
--
-- `now()` se evalúa EN CADA CONSULTA, así que la vigencia nunca se queda
-- vieja: un token que caduca esta tarde deja de salir esta tarde.
-- ===============================================================


-- ---------------------------------------------------------------
-- PASO 1 — GUARDAR LA DEFINICIÓN ACTUAL
--
-- Ejecuta esto SOLO y guarda el resultado en algún sitio antes de
-- seguir. Es la vuelta atrás: el paso 2 no destruye nada, pero si algo
-- sale raro esto es lo que devuelve la vista a como estaba.
-- ---------------------------------------------------------------

select pg_get_viewdef('public.vista_perfil_alumno'::regclass, true);


-- ---------------------------------------------------------------
-- PASO 2 — AÑADIR LA COLUMNA
--
-- NO HAY QUE PEGAR AQUÍ LA DEFINICIÓN DE LA VISTA. El bloque la lee de
-- la propia base y la envuelve, así que lo que hoy devuelve
-- `vista_perfil_alumno` sigue devolviéndolo igual, en el mismo orden y
-- con los mismos nombres. `create or replace view` exige justamente eso
-- —mismas columnas, mismo orden, solo añadir al final— y por eso el
-- `select base.*` va delante.
--
-- Se puede ejecutar dos veces: la segunda no hace nada y lo dice.
--
-- PRUÉBALO ANTES EN SECO. Este bloque no se ha podido ejecutar contra
-- Gestión desde el LMS —no hay acceso de escritura, que es justo lo que
-- queremos—, así que la primera vez que corre es en tus manos. Para no
-- estrenarlo a lo bruto, envuélvelo:
--
--   begin;
--     <el bloque do $$ … $$;>
--     <la consulta del PASO 3>
--   rollback;
--
-- Ejecuta el `do`, mira los NOTICE, comprueba que el PASO 3 devuelve
-- 169 / 46 / 45, y haz `rollback`. No queda nada. Si los números
-- cuadran, repite con `commit` en vez de `rollback`.
-- ---------------------------------------------------------------

do $$
declare
  definicion text;
  opciones   text[];
  con_with   text := '';
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'vista_perfil_alumno'
      and column_name in ('form_token', 'form_token_enviado_en')
  ) then
    raise notice 'vista_perfil_alumno ya tiene las columnas del formulario. No se toca nada.';
    return;
  end if;

  select rtrim(btrim(pg_get_viewdef('public.vista_perfil_alumno'::regclass, true)), ';')
    into definicion;

  -- ---------------------------------------------------------------
  -- LAS OPCIONES DE LA VISTA SE VUELVEN A PONER A MANO
  --
  -- `create or replace view` sin cláusula `with (…)` DEJA LA VISTA CON
  -- LAS OPCIONES POR DEFECTO. Si esta vista está creada con
  -- `security_invoker = on` —lo normal en Supabase para que respete el
  -- RLS de las tablas de debajo— y se reemplaza sin repetirlo, pasa a
  -- ejecutarse con los permisos de su propietario. Nadie se entera:
  -- la vista sigue devolviendo lo mismo, y de hecho devuelve MÁS de lo
  -- que debería a quien no tendría que verlo.
  --
  -- Así que se leen de `pg_class` y se vuelven a escribir tal cual.
  -- ---------------------------------------------------------------
  select c.reloptions into opciones
  from pg_class c
  where c.oid = 'public.vista_perfil_alumno'::regclass;

  if opciones is not null and array_length(opciones, 1) > 0 then
    con_with := ' with (' || array_to_string(opciones, ', ') || ')';
    raise notice 'opciones conservadas: %', array_to_string(opciones, ', ');
  end if;

  execute format($consulta$
    create or replace view public.vista_perfil_alumno%s as
    select
      base.*,
      tok.token         as form_token,
      ult.created_at    as form_token_enviado_en
    from (%s) as base

    -- El utilizable: sin completar y sin caducar. Si hay varios, el
    -- último emitido.
    left join lateral (
      select ft.token
      from public.form_tokens ft
      where ft.student_id  = base.alumno_id
        and ft.completed_at is null
        and ft.expires_at  > now()
      order by ft.created_at desc
      limit 1
    ) as tok on true

    -- El último de todos, sirva o no. Es lo que distingue "nunca se le
    -- envió nada" de "se le envió y ya no vale", que es lo único que
    -- necesita el aviso del LMS para no mentir.
    left join lateral (
      select ft.created_at
      from public.form_tokens ft
      where ft.student_id = base.alumno_id
      order by ft.created_at desc
      limit 1
    ) as ult on true
  $consulta$, con_with, definicion);

  raise notice 'vista_perfil_alumno ampliada con form_token y form_token_enviado_en.';
end
$$;


-- ---------------------------------------------------------------
-- PASO 3 — COMPROBAR
--
-- Con los datos del 14-08-2026 esto tiene que dar:
--
--   alumnos            169
--   con_token           46
--   veran_el_boton      45
--   recibieron_alguno   82
--
-- `con_token` (46) es uno más que `veran_el_boton` (45) y está bien: hay
-- un alumno que ya tiene ocupación rellenada y además un token vigente
-- sin usar. Tiene el token, pero no ve el botón porque ya no le hace
-- falta.
--
-- Si `con_token` da 0, el `left join lateral` no está casando: mira que
-- `form_tokens.student_id` y `vista_perfil_alumno.alumno_id` sean el
-- mismo identificador.
-- ---------------------------------------------------------------

select
  count(*)                      as alumnos,
  count(form_token)             as con_token,
  count(*) filter (
    where form_token is not null
      and coalesce(btrim(ocupacion), '')       = ''
      and coalesce(btrim(objetivo_perfil), '') = ''
  )                             as veran_el_boton,
  count(form_token_enviado_en)  as recibieron_alguno
from public.vista_perfil_alumno;


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
-- Con la definición del paso 1 guardada:
--
--   create or replace view public.vista_perfil_alumno as <lo guardado>;
--
-- El LMS aguanta la vuelta atrás sin desplegar nada: lee la vista con
-- `select("*")`, así que si la columna desaparece el token pasa a null y
-- el botón deja de pintarse. Ver `lib/gestion.ts`.
-- ---------------------------------------------------------------
