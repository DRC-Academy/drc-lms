-- ===============================================================
-- EXCEPCIONES DE ACCESO A CURSOS
--
-- El acceso normal NO vive aquí. Sale del plan que el alumno compró y
-- lo calcula `lib/cursos.ts` sin tocar la base: plan -> examen, nivel ->
-- curso general. Esta tabla no sustituye ese cálculo, se suma encima.
--
-- Es deliberado y conviene no perderlo de vista: si lo manual
-- reemplazara al cálculo, cada alumno nuevo habría que darlo de alta a
-- mano y volveríamos a tener el acceso pegado a una tabla en vez de al
-- producto. Un alumno sin ninguna fila aquí se comporta exactamente
-- igual que antes de que esta tabla existiera.
--
-- QUÉ ES UNA FILA: una excepción sobre un par (alumno, curso). Puede
-- significar tres cosas, y las tres son legítimas:
--
--   1. Dar acceso a un curso que su plan no le da.
--   2. Abrir el curso entero —saltar el drip— en un curso que su plan SÍ
--      le da. Aquí la fila no concede nada: solo levanta la espera.
--   3. Las dos a la vez.
--
-- Por eso la tabla se llama de excepciones y no de accesos, y por eso
-- "de dónde viene este curso" NO se responde mirando si hay fila: se
-- responde preguntándole al cálculo del plan. Si el plan ya lo daba, el
-- origen es el plan aunque exista fila.
--
-- HISTORIAL: nada se borra ni se pisa. Quitar un acceso es marcar
-- `revocada_en`, igual que en `sesiones`; cambiar el drip es revocar la
-- fila viva y escribir otra. Así cada estado por el que ha pasado un
-- par (alumno, curso) queda con su autor y su fecha, que es lo que
-- permite responder dentro de seis meses a "¿por qué este alumno tiene
-- esto?". El índice único parcial de abajo es lo que garantiza que solo
-- haya una viva a la vez.
-- ===============================================================

create table if not exists public.accesos_manuales (
  id            uuid        primary key default gen_random_uuid(),

  -- El `id` de `students` en Gestión. Sin clave ajena, igual que en
  -- `progreso_lecciones`: Gestión es otra base y además de solo lectura.
  -- Si algún día se borra un alumno allí, estas filas quedan huérfanas y
  -- no molestan a nadie: nunca se leen sin un alumno delante.
  alumno_id     text        not null,

  -- Este sí es nuestro, así que la integridad la sostiene Postgres.
  -- CASCADE: si se borra un curso, sus excepciones no significan nada.
  curso_id      uuid        not null references public.cursos(id) on delete cascade,

  -- SALTARSE LA APERTURA PROGRESIVA para este alumno en este curso.
  --
  -- El curso está diseñado para durar seis meses y el drip es lo que lo
  -- sostiene (ver `lib/drip.ts`), así que esto es una excepción a una
  -- regla de retención, no una preferencia. Va en la misma fila que el
  -- acceso porque se concede y se quita en el mismo sitio, y porque el
  -- 90% de las veces se querrán juntos: "dale el B2 y ábreselo entero".
  --
  -- No hace falta que la fila conceda el acceso para que esto sirva: en
  -- un curso que ya tiene por plan, la fila existe solo para esto.
  sin_drip      boolean     not null default false,

  -- Email del administrador, sacado de la cookie de sesión en el
  -- servidor. NUNCA de un campo del formulario: eso lo elige quien
  -- manda la petición y convertiría la auditoría en decoración.
  concedida_por text        not null,
  creada_en     timestamptz not null default now(),

  -- Por qué. Opcional, pero es lo que hace que esto se pueda leer
  -- dentro de seis meses: "tiene 214 lecciones del A2 migradas de
  -- LearnDash" explica el acceso; una fila sin motivo, no.
  motivo        text,

  -- Revocación, igual que `sesiones.revocada_en`. NULL = viva.
  revocada_en   timestamptz,
  revocada_por  text,

  -- Las dos columnas de revocación van juntas o no van. Sin esto se
  -- puede escribir una fila revocada sin autor, que es justo el agujero
  -- que la auditoría viene a tapar.
  constraint accesos_manuales_revocacion_completa
    check ((revocada_en is null) = (revocada_por is null)),

  -- Un motivo en blanco es peor que ninguno: parece que se rellenó.
  constraint accesos_manuales_motivo_no_vacio
    check (motivo is null or length(btrim(motivo)) > 0),

  constraint accesos_manuales_autor_no_vacio
    check (length(btrim(concedida_por)) > 0)
);

comment on table public.accesos_manuales is
  'Excepciones de acceso a cursos, por encima del cálculo del plan. Nunca lo sustituye.';

comment on column public.accesos_manuales.sin_drip is
  'Abre el curso entero para este alumno, saltándose la apertura progresiva de lib/drip.ts.';

comment on column public.accesos_manuales.revocada_en is
  'NULL = viva. No se borran filas: revocar deja el rastro de quién la quitó y cuándo.';


-- ===============================================================
-- UNA VIVA POR ALUMNO Y CURSO
--
-- Parcial, sobre `revocada_en is null`: un par (alumno, curso) puede
-- tener todo el historial que haga falta, pero solo una excepción en
-- vigor. Sin esto, conceder dos veces por dos pestañas abiertas deja
-- dos filas y "quitar el acceso" solo quitaría una.
--
-- Es además el índice sobre el que se apoya el upsert de la acción de
-- conceder: `on conflict` necesita un único que case con esta forma.
-- ===============================================================
create unique index if not exists idx_accesos_manuales_vivo
  on public.accesos_manuales (alumno_id, curso_id)
  where revocada_en is null;

-- La lectura real es siempre "las excepciones vivas de ESTE alumno",
-- una vez por página que compruebe acceso. Parcial por el mismo motivo:
-- el historial revocado no se consulta en el camino caliente.
create index if not exists idx_accesos_manuales_alumno
  on public.accesos_manuales (alumno_id)
  where revocada_en is null;

-- Para la vista de un curso concreto en el panel ("quién tiene esto a
-- mano") y para el CASCADE del borrado de un curso.
create index if not exists idx_accesos_manuales_curso
  on public.accesos_manuales (curso_id);


-- ===============================================================
-- PERMISOS
--
-- Mismo trato que el resto del esquema: RLS activado y SIN una sola
-- política. El servidor entra siempre con la service key, que se salta
-- RLS; sin políticas, `anon` y `authenticated` no pueden leer ni
-- escribir nada. A esta base no se llega desde el navegador. La nota
-- larga está en `lms-esquema.sql`.
--
-- ESTE BLOQUE FALTABA, y es la segunda vez que pasa lo mismo: una tabla
-- que nace en su propio archivo, después del esquema base, y se queda
-- sin el cierre que llevan las otras diecisiete. La primera fue
-- `intentos_acceso` —está contado al final de `lms-esquema.sql`— y el
-- motivo de fondo es el mismo: el `alter default privileges` de aquel
-- archivo cubre el GRANT de lo que se cree después, pero NO cubre RLS,
-- que no es un permiso por defecto. Con media puerta puesta, la tabla
-- parecía cerrada y no lo estaba.
--
-- AQUÍ IMPORTA MÁS QUE EN CASI NINGUNA OTRA. Leer esto da el email del
-- administrador que concedió cada excepción y el motivo que escribió;
-- escribirlo es concederse un curso, y con `sin_drip` a true, el curso
-- entero de golpe. Es la única tabla del LMS en la que escribir cambia
-- lo que un alumno puede ver.
--
-- EL `revoke` VA EXPLÍCITO y no se deja al `alter default privileges`:
-- aquel solo alcanza a lo que cree EL MISMO ROL que lo ejecutó, así que
-- el día que estas tablas las cree una herramienta de migraciones con
-- credenciales propias deja de alcanzarlas. Repetirlo cuesta una línea
-- y no depende de acordarse.
-- ===============================================================

alter table public.accesos_manuales enable row level security;

revoke all on public.accesos_manuales from anon, authenticated;


-- ===============================================================
-- COMPROBACIÓN
--
-- Tiene que devolver una fila con `rls` en true y `politicas` en 0. Es
-- la misma consulta que cierra `lms-esquema.sql`, acotada a esta tabla.
--
-- Si vuelve a salir `false`, es que la tabla se creó sin pasar por este
-- archivo. Merece la pena correr la de `lms-esquema.sql` —que las mira
-- todas— cada vez que se añada una tabla nueva: es la única forma de
-- que esto no vuelva a pasar una tercera vez.
-- ===============================================================

select c.relname           as tabla,
       c.relrowsecurity    as rls,
       count(p.policyname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname = 'accesos_manuales'
group by c.relname, c.relrowsecurity;
