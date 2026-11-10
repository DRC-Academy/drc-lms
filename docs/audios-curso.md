# Los audios del curso: de Podbean a Supabase Storage

Noviembre de 2026. Decisión de Diego del 08/11/2026: dejar de pagar Podbean
(unos 14 $ al mes) y servir los audios desde el Supabase que ya se paga.

**Podbean se canceló el 10/11/2026.** Desde ese día `deshacer` ya no sirve:
devolvería las lecciones a iframes que no suenan. Ver «Volver atrás».

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
   Tienen que salir 98 lecciones y 0 errores; si no, se mira antes de seguir.
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

**Ya no hay vuelta atrás a Podbean.** `deshacer` devolvía cada lección a su
contenido original (los iframes), y eso solo valía mientras Podbean siguiera
pagado. Desde la cancelación del 10/11/2026, ejecutarlo dejaría 98 lecciones
sin audio: no se usa. La copia `import/audios-podbean/copia-<fecha>.json` se
conserva solo como registro de qué había.

Si un audio falla, el original está en `import/audios-podbean/mp3/` (los mismos
bytes que el bucket: comprobado por MD5 el 10/11/2026) y se vuelve a subir a la
misma ruta.

## Cancelación (10/11/2026)

Antes de cancelar se comprobó: `comprobar` limpio; «podbean» solo aparece en
`lecciones.contenido` como la carpeta `podbean/` del bucket, en ninguna otra
tabla; los 93 objetos del bucket idénticos a los mp3 locales; las 98 lecciones
con 100 `<audio>` apuntan a archivos que existen; y con `*.podbean.com`
bloqueado los audios suenan sin una sola petición a Podbean.

Hecho después de cancelar:

- Podbean fuera de `ANFITRIONES` en `lib/sanear-html.ts`: un iframe suyo se
  quita como cualquier otro (test en `lib/sanear-html.test.ts`).
- Fuera la regla `.leccion iframe[src*="podbean.com"]` de `app/globals.css`.
- Nota actualizada en `docs/agente-respond-lms.md`.
- `scripts/importar-learndash.ts` ya no reintroduce Podbean: al montar el
  contenido de cada lección cambia cada iframe por el `<audio>` del bucket con
  `import/audios-podbean/manifiesto.json` (`cambiarIframesPorAudio`, la misma
  función que usó `sustituir`). Se hace sobre la lección entera y no solo
  sobre el quiz porque 2 de los 100 iframes (topics 19769 y 20239) vienen en
  el propio topic. Su ensayo da las 98 lecciones con audio idénticas a la base. Si falta el manifiesto, falta
  `LMS_SUPABASE_URL` o un episodio no está en él, o queda `podbean.com` en
  cualquier cosa que vaya a entrar, `--escribir` para sin escribir nada.

Lo que queda fuera: el quiz 17882 («Identifying hesitation strategies and
paraphrasing in native speech», 3 audios) está publicado en LearnDash pero fuera
del árbol de cursos, así que nunca se importó. Sus tres mp3 se bajaron antes de
cancelar a `import/audios-podbean/mp3-sueltos/`; no están en el bucket.

`import/` no se versiona: esa carpeta tiene que tener copia fuera de este equipo.

## Coste

Unos 98 mp3 de pocos MB cada uno: muy lejos de los 100 GB de almacenamiento y
de la transferencia que incluye el plan Pro de Supabase. Coste añadido, cero.
