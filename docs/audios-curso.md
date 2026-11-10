# Los audios del curso: de Podbean a Supabase Storage

Noviembre de 2026. Decisión de Diego del 08/11/2026: dejar de pagar Podbean
(unos 14 $ al mes) y servir los audios desde el Supabase que ya se paga.

## Qué había

- Todo el audio del curso son los ejercicios de listening: 98 de los 581
  quizzes de LearnDash llevaban un iframe de Podbean en su `post_content`.
- `scripts/importar-learndash.ts` los volcó tal cual a `lecciones.contenido`
  (ver `contenidoDeQuiz`).
- `lib/sanear-html.ts` dejaba pasar los iframes de `podbean.com` y
  `app/globals.css` les daba 150 px de alto.

## Qué hay ahora

- Bucket público `audios-curso` en el Supabase del LMS (el de
  `LMS_SUPABASE_URL`). Cada audio en `podbean/<episodio>.mp3`, con el id de
  episodio de Podbean como nombre para poder cruzarlo siempre con el original.
- En `lecciones.contenido`, cada iframe se cambia por:

  ```html
  <audio class="audio-ejercicio" controls preload="metadata"
         src="https://<proyecto>.supabase.co/storage/v1/object/public/audios-curso/podbean/<episodio>.mp3"></audio>
  ```

- `lib/sanear-html.ts` deja pasar un `<audio>` solo si su `src` sale de ese
  bucket (`AUDIO_PERMITIDO`); cualquier otro `<audio>` y todos los `<source>`
  se quitan. Tests en `lib/sanear-html.test.ts`.
- `app/globals.css`: `.leccion audio` a todo el ancho. Los controles son los
  nativos del navegador, que en el móvil son los del sistema.

## Cómo se hace el cambio

Todo con `scripts/audios-podbean.ts` y `.env.local` con `LMS_SUPABASE_URL` y
`LMS_SUPABASE_SERVICE_KEY`. Nada de esto es una migración de esquema: no crea
tablas ni columnas, solo un bucket y el texto de las lecciones.

1. Desplegar primero este código. Mientras tanto Podbean sigue permitido, así
   que da igual el orden en que lleguen el código y el contenido: con este
   código en producción se ven bien tanto el iframe viejo como el audio nuevo.
2. `node scripts/audios-podbean.ts listar`: lee las lecciones con Podbean,
   saca el episodio de cada iframe y le pide a Podbean el mp3
   (`https://www.podbean.com/player/<episodio>` devuelve un JSON con
   `episodes[0].resource`). Deja `import/audios-podbean/manifiesto.json`.
   Lo que importa es 0 errores. El número de lecciones puede ser menor que
   98: una lección normal junta los quizzes de su topic, así que dos audios
   pueden caer en la misma lección, y los quizzes que estaban fuera de todo
   curso no se importaron. Iframes y episodios deberían rondar los 98. Si hay
   algún error, se mira antes de seguir.
3. `node scripts/audios-podbean.ts subir`: crea el bucket si no existe,
   descarga cada mp3 a `import/audios-podbean/mp3/`, lo sube y comprueba que
   la URL pública responde. Se puede repetir: lo que ya está no se vuelve a
   subir.
4. `node scripts/audios-podbean.ts sustituir`: ensayo, enseña cuántas
   lecciones cambiaría y un ejemplo. Comprueba que cada `<audio>` nuevo
   sobrevive al saneador; si no, para.
5. `node scripts/audios-podbean.ts sustituir --escribir`: guarda antes
   `import/audios-podbean/copia-<fecha>.json` con el contenido original de cada
   lección y luego cambia solo las que no se hayan tocado desde que las leyó.
6. `node scripts/audios-podbean.ts comprobar`: 0 lecciones con Podbean, 0
   ejercicios con Podbean y todos los audios responden con un tipo de audio.
7. Probar a mano en el móvil unas cuantas lecciones con audio (Android y
   iPhone).

## Volver atrás

`node scripts/audios-podbean.ts deshacer import/audios-podbean/copia-<fecha>.json --escribir`
devuelve cada lección a su contenido original si nadie la ha cambiado después.
Solo funciona mientras Podbean siga pagado: por eso no se cancela hasta que
`comprobar` salga limpio y se haya oído en el móvil. La copia se guarda también
fuera del repo (no se versiona: está en `/import`).

## Cuando todo esté comprobado

- Diego cancela el plan de Podbean. No se borra nada allí.
- Se quita Podbean de `ANFITRIONES` en `lib/sanear-html.ts`, la regla
  `.leccion iframe[src*="podbean.com"]` de `app/globals.css`, el test
  "mientras dura el cambio" de `lib/sanear-html.test.ts` y la nota de
  `docs/agente-respond-lms.md`.

## Coste

Unos 98 mp3 de pocos MB cada uno: muy lejos de los 100 GB de almacenamiento y
de la transferencia que incluye el plan Pro de Supabase. Coste añadido, cero.
