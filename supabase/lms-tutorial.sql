-- ===============================================================
-- EL RECORRIDO GUIADO: CUÁNDO LO VIO CADA ALUMNO
--
-- Una columna en `alumno_vinculos`, que tiene una fila por cada alumno
-- que ha entrado alguna vez (la escriben las dos entradas, el correo y
-- WooCommerce, con `guardarVinculo`). Null: nunca se le lanzó.
--
-- Se marca en cuanto el onboarding arranca: terminarlo, saltarlo o
-- cerrarlo a medias cuentan igual. No se le persigue. El botón «Ver el
-- recorrido» de la Ayuda no la toca.
--
-- Mientras la columna no exista, el LMS no lanza el onboarding solo
-- (`lib/tutorial/estado.ts` lee el error como «visto»): se puede
-- desplegar el código antes de ejecutar esto.
--
-- Ejecutar en el SQL Editor del proyecto del LMS. Es idempotente.
-- ===============================================================

alter table public.alumno_vinculos
  add column if not exists tutorial_visto_en timestamptz;

comment on column public.alumno_vinculos.tutorial_visto_en is
  'Cuándo se le lanzó el recorrido guiado por primera vez (terminado, saltado o cerrado a medias). Null: nunca.';
