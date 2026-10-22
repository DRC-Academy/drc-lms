-- ===============================================================
-- IP Y NAVEGADOR EN LAS ENTRADAS, SESIONES, VISITAS E INTENTOS
--
-- La prueba del servicio prestado en una disputa de Stripe: desde qué
-- IP y con qué navegador entró el alumno a clase y a la plataforma.
-- Las lee de la petición `lib/cliente-request.ts`, el único sitio que
-- mira esas cabeceras.
--
-- Nullable y sin valor por defecto: las filas que ya hay se quedan
-- como están, y las que se escriban fuera de una petición (scripts)
-- van sin ellas.
--
-- Mientras esto no se ejecute, todo funciona igual: la inserción con
-- las columnas falla, se repite sin ellas (`conColumnasCliente`) y se
-- avisa en el log. Se puede desplegar el código antes.
--
-- Ejecutar en el SQL Editor del proyecto del LMS. Es idempotente.
-- ===============================================================

alter table public.entradas_clase  add column if not exists ip text, add column if not exists user_agent text;
alter table public.sesiones        add column if not exists ip text, add column if not exists user_agent text;
alter table public.accesos         add column if not exists ip text, add column if not exists user_agent text;
alter table public.intentos_acceso add column if not exists ip text, add column if not exists user_agent text;

-- Que PostgREST vea las columnas nuevas sin esperar.
notify pgrst, 'reload schema';


-- ---------------------------------------------------------------
-- COMPROBAR
-- ---------------------------------------------------------------

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('entradas_clase', 'sesiones', 'accesos', 'intentos_acceso')
  and column_name in ('ip', 'user_agent')
order by table_name, column_name;
-- Esperado: 8 filas, todas text y nullable (YES).


-- ---------------------------------------------------------------
-- VUELTA ATRÁS
--
--   alter table public.entradas_clase  drop column if exists ip, drop column if exists user_agent;
--   alter table public.sesiones        drop column if exists ip, drop column if exists user_agent;
--   alter table public.accesos         drop column if exists ip, drop column if exists user_agent;
--   alter table public.intentos_acceso drop column if exists ip, drop column if exists user_agent;
-- ---------------------------------------------------------------
