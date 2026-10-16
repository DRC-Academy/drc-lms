# Agente de Respond.io para DRC Práctica

Base de conocimiento para el agente de IA que atiende a los alumnos por WhatsApp
sobre la plataforma de práctica (este LMS). Todo lo que se afirma aquí sale del
código de este repo a día de hoy (rama `main`, commit `5516d8b`, 15/10/2026). Lo
que no se puede saber desde el código va marcado **[VERIFICAR]** y está recogido
en la sección 6.

**Cómo leer este documento**

- Las respuestas para el alumno van en bloques de cita (`>`). Están escritas para
  pegarse tal cual en WhatsApp: español de España, tuteo, cortas, sin jerga.
- Debajo de cada respuesta, la línea *Nota interna* es solo para el equipo: el
  porqué y el archivo de origen. El agente no debe repetirla al alumno.
- Categorías:
  - **A**: el alumno lo resuelve solo con las instrucciones del agente.
  - **B**: necesita a una persona del equipo.
  - **C**: es un fallo de la plataforma.
- El agente **no tiene acceso a datos de alumnos**. Solo puede explicar y, cuando
  haga falta, recoger datos y transferir.
- La URL de la plataforma aparece en las respuestas como `{{URL_PLATAFORMA}}`. Su
  valor está **solo** en la sección 1. Cuando cambie a practica.drcacademy.com, se
  cambia allí y en ningún otro sitio.

---

## 1. Datos fijos

| Dato | Valor | De dónde sale |
|---|---|---|
| **`{{URL_PLATAFORMA}}`** | `https://drc-lms.vercel.app` **[VERIFICAR]**. Es el valor que aparece por defecto en los snippets de WordPress y en los ejemplos del código. El real es la variable `URL_BASE` de Vercel, que no está en el repo. Pasará a `https://practica.drcacademy.com`. | `lib/url-publica.ts`, `wordpress/drc-acceso-lms.php:88-90` |
| Pantalla de entrada | `{{URL_PLATAFORMA}}/acceso` | `app/acceso/page.tsx` |
| Remitente del enlace de acceso | `DRC Academy <practica@drcacademy.com>` | `lib/correo.ts:29` |
| Asunto del enlace | «Tu acceso a la práctica de DRC Academy» (siempre en español) | `lib/correo.ts:31` |
| Botón dentro del correo | «Entrar en la práctica» | `lib/correo.ts:68` |
| Duración del enlace por email | **15 minutos**. Se puede usar **varias veces y en varios dispositivos** dentro de esos 15 minutos. | `lib/sesion.ts:38-42,55` |
| Botón desde la web de la academia | «Entrar en mi práctica» (texto por defecto del shortcode `[boton_lms]`). El paso a la plataforma caduca a los 60 s, pero es automático y el alumno no lo nota. | `wordpress/drc-acceso-lms.php:265-283`, `lib/sesion.ts:65` |
| Duración de la sesión | **30 días**, en ese navegador y en ese dispositivo. Una vez en cada dispositivo. | `lib/sesion.ts:58,567-573` |
| Contraseña | No hay | — |
| Idioma por defecto | **Inglés**. El navegador no cuenta. Se cambia con el botón **ES/EN**, arriba a la derecha (también en la pantalla de entrada), y se recuerda 1 año. | `lib/idioma.ts:41-46`, `components/BotonIdioma.tsx` |
| Botón «Unirse a la clase» | Se activa **30 minutos antes** y funciona **hasta que termina** la clase | `lib/clases.ts:122,600-604` |
| Hora de las clases | Siempre **hora de Madrid**, con la etiqueta «(hora de Madrid)». No se convierte a la zona del alumno. | `lib/clases.ts:255-294`, `lib/fechas.ts:16-29` |
| Tiempo en ver cambios hechos en Gestión | Hasta **~2 minutos**: horario, enlace, cancelaciones, nivel, fecha de inicio, clase analizada. Los nombres de los profesores tardan hasta 10 minutos. | `lib/cache-gestion.ts:30-32` |
| Bloque de práctica | 10 ejercicios (4 de reconocer, 4 de transformar y 2 de escribir), unos 10 minutos. Prepararlo tarda menos de un minuto. | `lib/prompt-bloque.ts:48`, `app/api/generar-bloque/route.ts:69` |
| Apertura del curso | 24 aperturas semanales, de los días 0 a 161 desde la fecha de inicio | `import/` (export de LearnDash), `supabase/lms-cursos.sql:139-156` |
| Diploma | 6 meses desde la fecha de inicio. Todavía no se puede descargar. | `lib/diploma.ts`, `lib/diploma-plazo.ts:18`, `lib/textos/diploma.ts:85-89` |
| Avisos de contenido nuevo | Email diario hacia las 8:00 (invierno) o las 9:00 (verano), hora de Madrid, solo cuando se abre algo. Siempre en español. Asunto «Se ha abierto la semana N de tu curso». | `vercel.json`, `lib/correo-avisos.ts:70-74` |
| WhatsApp de DRC | +353 89 940 9220 | `lib/soporte.ts:12` |
| Cuenta en la web (suscripción, pagos, facturas, datos) | https://drcacademy.com/mi-cuenta/perfil/ | `lib/cuenta-woo.ts:17` |
| Descuento por referidos | https://drcacademy.com/mi-cuenta/consigue-un-descuento/ | `lib/cuenta-woo.ts:20` |

---

## 2. Preguntas frecuentes

### 2.1 Acceso

#### ¿Cuál es la web? ¿Dónde entro? — A
*«¿Cuál es la página de la práctica?», «¿dónde se entra?», «¿tenéis app?», «no encuentro la plataforma».*

> ¡Hola! Puedes entrar de dos formas:
> 1️⃣ Desde tu cuenta en drcacademy.com, en «Mi cuenta», con el botón «Entrar en mi práctica».
> 2️⃣ Directamente en {{URL_PLATAFORMA}}: pones tu email y te enviamos un enlace para entrar. No hay contraseña.
> No hace falta instalar ninguna app: funciona desde el navegador del móvil o del ordenador.

*Nota interna:*
- No hay PWA ni app (no existe manifest).
- La redirección automática del escritorio de «Mi cuenta» a la plataforma se menciona en `lib/cuenta-woo.ts:8-13`, pero no está en el repo **[VERIFICAR]**.
- Tampoco consta en el repo en qué página está colocado el botón `[boton_lms]` **[VERIFICAR]**.

#### ¿Con qué correo entro? — A (B si no lo sabe)
*«¿Qué email pongo?», «tengo dos correos», «¿el de la compra o el otro?»*

> Tienes que usar el mismo email con el que te diste de alta en la academia (el que tenemos para tus clases). Da igual si lo escribes con mayúsculas o minúsculas.
> Si tienes varios correos, prueba con cada uno. Si con ninguno te llega el enlace, dime tu nombre completo y los correos que usas, y lo revisamos.

*Nota interna:*
- La búsqueda es por el email de la ficha de **Gestión** (`vista_perfil_alumno.email`), sin distinguir mayúsculas y quitando los espacios (`lib/sesion.ts:104-106`, `lib/gestion.ts:772-795`).
- **No** se mira el email de WooCommerce ni la suscripción.

#### No me llega el correo con el enlace — A → B
*«No me llega nada», «he pedido el link y no aparece», «no recibo el email».*

> Vamos a mirarlo 😊
> 1. Revisa spam, promociones y «Todos los correos». Llega de **practica@drcacademy.com** con el asunto «Tu acceso a la práctica de DRC Academy».
> 2. Puede tardar un par de minutos.
> 3. Comprueba que pusiste el email con el que te diste de alta en la academia.
> Si después de 10 minutos sigue sin llegar, dime tu nombre completo y el email que estás usando y lo revisa una persona del equipo.

*Nota interna:*
- La pantalla dice lo mismo exista el email o no (`app/acceso/acciones.ts:115`). Si el email no está en Gestión, **no se envía nada y no hay aviso**.
- Si el envío falla (Resend, `URL_BASE`), el alumno tampoco se entera; solo queda en el log (`acciones.ts:64-68`).
- El propio código avisa de que, mientras la plataforma esté en vercel.app, el correo puede caer en spam (`lib/correo.ts:20-27`).
- Si se le pasa el email correcto y le sigue sin llegar, es **C** (envío).

#### «Ese enlace ya no es válido. Pide uno nuevo.» — A
*«Me dice que el enlace no vale», «caducado», «expired», «el link no funciona».*

> El enlace dura 15 minutos. Pide uno nuevo en {{URL_PLATAFORMA}} y ábrelo en cuanto te llegue (si te llegan varios, usa el más reciente).
> Si te pasó entrando desde la web de la academia, vuelve a pulsar «Entrar en mi práctica».

*Nota interna:*
- `motivo=caducado` sale cuando el token del correo tiene más de 15 minutos, o cuando el paso desde WooCommerce tiene más de 60 s o la firma no cuadra (`app/entrar/route.ts:35-41`, `app/entrar/woo/route.ts:59`).
- Si desde la web le pasa siempre, puede ser la clave `SECRETO_WOO`, que no coincide entre WordPress y Vercel → **C**.

#### «Ese enlace es correcto, pero no encontramos tu ficha. Escribe a tu profesor y lo miramos.» — B
*«Dice que no encuentra mi ficha», «no encontramos tu ficha».*

> Gracias por avisar. Esto lo tiene que revisar una persona del equipo: el email con el que has entrado no coincide con el que tenemos en tu ficha de alumno.
> ¿Me dices tu nombre completo, el email con el que intentas entrar y, si es distinto, el email con el que te diste de alta o pagaste?

*Nota interna:*
- `motivo=sinficha`: el email (del correo o de la cuenta de WordPress) no está en `vista_perfil_alumno` (`app/entrar/route.ts:50-54`, `app/entrar/woo/route.ts:84-85`).
- Pasa típicamente con un alta reciente sin ficha en Gestión, o cuando el email de WooCommerce es distinto del de Gestión.

#### «No hemos podido abrir tu sesión. Vuelve a intentarlo en un momento.» — A → C
> A veces pasa de forma puntual. Espera un minuto y vuelve a abrir el enlace (vale durante 15 minutos). Si vuelve a salir este mensaje, mándame una captura y lo pasamos al equipo.

*Nota interna:* `motivo=error`: no se pudo crear la fila de la sesión (`lib/entrada.ts:69`). Si se repite, es **C**.

#### Pongo mi email y solo dice «Si ese email está registrado…» — A → B
*«Pongo mi email y no pasa nada», «me sale un mensaje pero no entro».*

> Ese mensaje sale siempre, por seguridad, aunque el email no esté dado de alta. Lo importante es si te llega el correo. Mira en spam y promociones. Si no llega en unos minutos, puede que estés usando otro email distinto al de tu alta: prueba con los demás que tengas.
> Si con ninguno funciona, dime tu nombre completo y te ayudamos.

*Nota interna:* `app/acceso/acciones.ts:1-12,115`.

#### «Ese email no parece completo. Revísalo y vuelve a probar.» — A
> Parece que al email le falta algo (la @ o el final, tipo «.com»). Escríbelo completo y vuelve a pulsar «Enviarme el enlace».

*Nota interna:* `app/acceso/acciones.ts:87-92`.

#### Me ha echado / vuelvo a la pantalla de entrar — A
*«Me ha sacado», «me pide entrar otra vez», «Tu sesión ha caducado».*

> No pasa nada: la sesión dura 30 días en cada dispositivo y, cuando se cierra, solo tienes que pedir un enlace nuevo. Tu progreso está guardado en tu cuenta.

*Nota interna:*
- Con la sesión caducada o revocada, la plataforma lleva a `/acceso` **sin ningún mensaje** (`middleware.ts:199-207`, `lib/sesion-servidor.ts:49-53`).
- Solo al completar una lección sale «Tu sesión ha caducado. Pide un enlace y sigues donde lo dejaste.» (`app/api/progreso-leccion/route.ts:34`).
- **Atención:** en ese caso esa lección **no** se ha marcado (ver «Completé una lección y no aparece»).

#### Entro desde el enlace pero luego no estoy dentro / tengo que entrar en el móvil también — A
*«Entré pero al abrir Chrome me pide otra vez», «en el móvil no estoy dentro», «¿tengo que entrar en cada dispositivo?»*

> La sesión se abre en el navegador donde pulsas el enlace, así que hay que entrar una vez en cada dispositivo (después dura 30 días).
> Si abriste el enlace desde la app de Gmail o desde otra app, puede que se haya abierto dentro de esa app. Pide un enlace nuevo, pulsa los tres puntos y elige «Abrir en el navegador» (Chrome o Safari).

*Nota interna:*
- La cookie es por navegador (`lib/sesion.ts:567-573`). El enlace no está atado al navegador que lo pidió (`lib/sesion.ts:315-318`).
- Lo del navegador de la app es deducción de cómo funcionan las cookies: el código no lo detecta.

#### El botón de «Mi cuenta» no me lleva / me deja en la pantalla de entrar — A → B
> Prueba esto:
> 1. Entra en drcacademy.com con tu usuario y vuelve a pulsar «Entrar en mi práctica».
> 2. Si te lleva a la pantalla de entrada de la plataforma, pide ahí el enlace con tu email: entrarás igual.
> Si te aparece «no encontramos tu ficha» o no te llega el correo, dime tu nombre completo y el email de tu cuenta de la web y lo revisamos.

*Nota interna:*
- Sin la sesión iniciada en WordPress, el botón lleva al login de WordPress y después continúa (`wordpress/drc-acceso-lms.php:222-226`).
- Si la clave está mal configurada, el alumno acaba en `/acceso` **sin mensaje** (`:245`) → **C**.
- Si el email de WordPress ≠ email de Gestión y no hay vínculo previo → `sinficha` → **B**.

#### ¿Necesito contraseña? — A
> No, no hay contraseña. Entras con el enlace que te llega por email (o desde tu cuenta en la web) y la sesión te dura 30 días en ese dispositivo.

#### Acabo de apuntarme / pagar y no puedo entrar — B
> ¡Bienvenido/a! 😊 Para entrar en la plataforma primero tenemos que tener lista tu ficha de alumno. Dime tu nombre completo y el email con el que te apuntaste y una persona del equipo lo revisa.

*Nota interna:*
- Solo entra quien está en `vista_perfil_alumno`, es decir, quien tiene asignación en Gestión, activa o inactiva (`supabase/gestion-vista-perfil-inactivos.sql`).
- Un pago en WooCommerce no basta (`app/entrar/woo/route.ts:80-85`).

#### Quiero cambiar mi email / pagué con otro email — B
> El email lo cambiamos nosotros, porque es lo que conecta tu cuenta de la web con la plataforma y con tus clases. Así no pierdes el acceso. Dime tu nombre completo, el email actual y el nuevo, y lo pasamos al equipo.

*Nota interna:*
- Coincide con el FAQ `clases-cambiar-email`.
- Una sesión ya abierta sigue funcionando tras el cambio, porque guarda el id del alumno. Los nuevos enlaces van por el email nuevo de Gestión.

#### ¿Cómo cierro sesión? — A
> En el menú de tu perfil (abajo del todo en el ordenador; en el móvil, la pestaña «Perfil») pulsa «Salir».

*Nota interna:* también cierra la sesión de la web de la academia (`app/salir/route.ts:85-93`).

#### Me he dado de baja / tengo la suscripción en pausa o «en espera»: ¿puedo entrar? — B
> Eso depende del estado de tu ficha, así que prefiero que lo mire una persona del equipo para darte la respuesta exacta. ¿Me dices tu nombre completo y tu email?
> Si es un tema de pago, puedes revisar tu suscripción en https://drcacademy.com/mi-cuenta/perfil/

*Nota interna:*
- La plataforma **no comprueba** la suscripción de WooCommerce: deja entrar a quien tenga ficha en Gestión.
- Si un alumno de baja conserva la asignación inactiva, seguramente sigue entrando **[VERIFICAR]**.

---

### 2.2 Idioma

#### La plataforma me sale en inglés — A
*«Está todo en inglés», «¿se puede poner en español?», «la web sale en inglés».*

> ¡Claro! Arriba a la derecha tienes un botón **ES / EN**. Pulsa en «ES» y se queda en español (la plataforma lo recuerda en ese navegador).

*Nota interna:* el idioma por defecto es inglés y no se mira el del navegador (`lib/idioma.ts:41`). Se guarda un año en la cookie `drc_idioma`.

#### He puesto español pero los ejercicios siguen en inglés — A
> Es así a propósito: los ejercicios son de inglés, así que las frases y las respuestas siempre están en inglés. Lo que se traduce son las instrucciones, las pistas y las explicaciones. Las lecciones del curso también están en inglés.

*Nota interna:*
- Solo se traduce el «andamio» de los bloques de práctica (`lib/traduccion-bloque.ts:8-24`). Las lecciones del curso no se traducen.
- Si sale «Los ejercicios se han quedado en inglés. Vuelve a pulsar para intentarlo otra vez.», ha fallado la traducción → que vuelva a pulsar. Si se repite → **C**.

#### Tengo la plataforma en inglés pero los correos me llegan en español — A
> Sí, de momento los correos de acceso y de avisos se envían siempre en español. La plataforma la puedes usar en el idioma que prefieras.

*Nota interna:* `lib/correo.ts`, `lib/correo-avisos.ts` (solo ES).

---

### 2.3 Clases y botón de la clase

#### No me sale el botón para entrar a la clase — A
*«No veo el botón», «¿dónde está el link de la clase?», «no puedo entrar a la clase», «el botón está gris».*

> El botón «Unirse a la clase» está en «Clases» (y también en Inicio cuando falta poco) y se activa **30 minutos antes** de la clase.
> 📱 En el móvil no aparece hasta esa media hora antes. 💻 En el ordenador se ve gris con «Se abre 30 minutos antes».
> Si ya falta menos de media hora y no lo ves, recarga la página. Si sigue sin salir, dime el día y la hora de tu clase y lo miramos enseguida.

*Nota interna:*
- La ventana es desde `inicio − 30 min` hasta el final de la clase (`lib/clases.ts:600-604`).
- En móvil, `CtaProximaClase` solo muestra el botón con la sala abierta (`components/clases/CtaProximaClase.tsx:90-94`).
- La página se refresca sola al abrirse la sala (`components/clases/RefrescoEnCortes.tsx`).

#### «Habla con tu profesor para el enlace» o «Tu enlace de clase está en camino» — B (urgente si la clase es pronto)
> Gracias por avisar. Eso significa que todavía no tenemos guardado el enlace de tu videollamada. Lo pasamos ahora mismo al equipo para que te lo envíen.
> ¿Me confirmas tu nombre completo y el día y la hora de tu clase?

*Nota interna:*
- No hay un `meet_link` válido en la asignación (`vista_calendario_alumno`). Solo valen Meet, Zoom, Teams, Whereby o Jitsi, con ruta (`lib/clases.ts:650-679`).
- `/clase/sin-enlace` sale al pulsar si tampoco lo hay en la ficha (`app/clase/entrar/route.ts:92-96`).

#### ¿A qué hora es mi clase? Vivo fuera de España — A
> En la plataforma todas las horas están en **hora de Madrid** (lo pone al lado: «(hora de Madrid)»). Si estás en otro país, cuenta la diferencia horaria con España. Por ejemplo, Canarias tiene una hora menos.

*Nota interna:*
- No hay conversión a la zona del alumno (`components/clases/BannerClase.tsx:119,416`, `SemanaClases.tsx:88`).
- Excepción: la fecha de cabecera de «Para ti» usa la zona del navegador (`components/PanelPractica.tsx:136-140`).

#### No veo mis clases / «Aquí aparecerán tus clases» — A → B
> Ese mensaje sale cuando todavía no hay un horario fijado en tu plan. En cuanto lo cerréis, verás aquí tus clases (puede tardar un par de minutos en aparecer).
> Si ya tienes horario y sigue sin salir, dime tu nombre completo y lo revisamos.

*Nota interna:*
- `sinHorario` (`components/clases/PantallaClases.tsx:89`).
- **Ojo:** si falla la lectura de Gestión, también se ve vacío, sin ningún mensaje de error (`lib/cache-gestion.ts`) → si le pasa a varios a la vez, es **C**.

#### «Aún no tienes tu próxima clase programada» — A → B
> Eso sale cuando no hay ninguna clase próxima en tu calendario. Si crees que sí deberías tener una, dime tu nombre completo y el día que esperabas y lo revisamos.

#### Mi clase aparece cancelada / tengo una clase por recuperar — A
> Cuando se cancela una clase, aparece en «Clases» como «Clase cancelada». Si hay que recuperarla, verás «Tienes una clase por recuperar» con el botón «Elige la fecha». Ahí eliges una de las fechas que te propone tu profesor, o le propones tú otras.

*Nota interna:*
- `components/clases/TarjetaRecuperacion.tsx`, `lib/textos/recuperaciones.ts`.
- «No hemos podido cerrar una fecha. El equipo te contactará para recuperar tu clase.» → **B**.
- «No podemos cargar tus recuperaciones ahora mismo» → reintentar en unos minutos; si persiste, **C**.

#### Me han cambiado la clase y no lo veo — A → B
> Los cambios pueden tardar un par de minutos en verse. Recarga la página. Si después de eso sigue igual, dime tu nombre completo y qué cambio esperabas y lo revisamos.

*Nota interna:* caché de 90–120 s (`lib/cache-gestion.ts:30-32`). Lo reprogramado se ve como «Clase del {día} reprogramada al {día}, {hora}».

#### Quiero cambiar de horario o de profesor — A / B
> **[VERIFICAR]**: depende de si el autoservicio está activo en producción.
> Si está activo:
> Puedes hacerlo tú desde «Clases», en la tarjeta «Tu horario»: «Cambiar de horario» o «Cambiar de profesor». Si la plataforma te dice que lo hagamos por WhatsApp, cuéntame qué cambio necesitas y lo vemos contigo.
> Si no está activo:
> Cuéntame qué necesitas (qué días y horas te vendrían bien) y una persona del equipo lo ve contigo según los horarios libres.

*Nota interna:*
- Interruptores `AUTOSERVICIO_ACTIVO` y `AUTOSERVICIO_PROFESOR_ACTIVO` (`lib/autoservicio/index.ts:36-48`).
- Cuando la plataforma no deja hacer el cambio, el texto siempre acaba en «escríbenos por WhatsApp» (`lib/textos/autoservicio.ts:397-466`) → **B**.
- «Tu cambio no ha terminado de guardarse» → el equipo ya está avisado → **B**, no repetir.

#### La videollamada no funciona / el profesor no está en la sala — A → B (urgente)
> Prueba a recargar el enlace, comprobar tu conexión y, si puedes, abrirlo en otro navegador (Chrome funciona bien con Meet).
> Si no se arregla o tu profesor no está en la sala, dime tu nombre completo y la hora de la clase y avisamos al equipo enseguida.

*Nota interna:* la sala depende de la herramienta del profesor (Meet, Zoom…), no del LMS.

---

### 2.4 El curso

#### ¿Por qué tengo lecciones bloqueadas? — A
*«Candado», «no puedo abrir la lección», «se abre en X días», «está bloqueado».*

> El curso se va abriendo semana a semana desde que empezaste con la academia. Es el ritmo con el que está pensado. Al lado de cada parte cerrada ves cuándo se abre: «Se abre mañana», «Se abre en N días» o «Se abre el [día]».
> No tienes que hacer nada: se abre sola y además te avisamos por email.

*Nota interna:*
- `lib/drip.ts:47-108`.
- Si pulsa una lección cerrada, la plataforma le devuelve al temario **sin mensaje** (`app/(alumno)/curso/[slug]/[leccion]/page.tsx:96`).

#### ¿Desde cuándo se cuentan los días? — A
> Desde la fecha en que empezaste con la academia, no desde que entraste por primera vez a la plataforma.

*Nota interna:* `vista_perfil_alumno.fecha_inicio`, contada en días de Madrid. Una fecha futura cuenta como día 0.

#### ¿Puedo adelantar el curso? — A / B
> El ritmo está pensado para que lo aprendido se asiente. Si tienes un examen cerca o una situación concreta, coméntaselo a tu profesor o cuéntamelo y lo vemos con el equipo.

*Nota interna:* el equipo puede abrir el curso entero desde el panel: «Gestionar accesos» → «Abrirle el curso entero» (`components/admin/GestorAccesos.tsx`).

#### Ya había hecho esta lección y ahora aparece bloqueada — B / C
> Eso no debería pasar: lo que has completado se queda abierto siempre. ¿Me dices el nombre del curso y de la lección y, si puedes, una captura? Lo pasamos al equipo.

*Nota interna:*
- Lo completado nunca se cierra (`lib/drip.ts:78-84`).
- Si pasa, lo más probable es que el curso haya cambiado, por ejemplo por un cambio de nivel en Gestión (ver «Mi curso ha cambiado»), o que la compleción no se guardara.

#### Puedo ver todo el curso desde el primer día — B (no urgente)
> ¡Genial que te animes! Lo comento con el equipo para que revisen tu plan.

*Nota interna:*
- Pasa si `fecha_inicio` está vacía o ilegible: falla abierto (`lib/drip.ts:52-53`).
- También si tiene un acceso manual con «Abrirle el curso entero».
- La persona debe revisar `fecha_inicio` en Gestión.

#### No veo «Mi curso» / «Tu plan todavía no tiene un curso asociado» — B
> Gracias por avisar. Hay que activarte el curso desde nuestro lado. Dime tu nombre completo y tu email y lo pasamos al equipo. Mientras tanto, tu práctica personalizada funciona con normalidad.

*Nota interna:* sin perfil o sin un curso que case con el plan y el nivel (`components/BannerCurso.tsx:71-79`, `lib/cursos.ts:91-104`).

#### Preparo un examen: ¿dónde está el curso general? — B
> Con tu plan de examen tienes el curso específico de ese examen. Si además te interesa el curso general, cuéntamelo y lo vemos con el equipo.

*Nota interna:*
- Con un plan de examen se da **solo** el curso de examen (`lib/cursos.ts:97-101`). El FAQ dice «además» (ver sección 5).
- El equipo puede añadir el general desde «Gestionar accesos».

#### Mi curso ha cambiado / ha desaparecido — B
> Puede que se haya actualizado tu nivel y con él tu curso. Tu progreso no se pierde. Dime tu nombre completo y lo revisa una persona del equipo.

*Nota interna:*
- En planes generales, el curso depende del nivel (`lib/cursos.ts`, `lib/estimacion.ts:617-632`).
- Si el profesor cambia el nivel en Gestión, el curso antiguo desaparece; el progreso se guarda pero no se ve.

#### El vídeo no carga / sale en negro — A → B
> Suele ser un bloqueador de anuncios o una extensión del navegador. Desactívalo para esta página o prueba en otro navegador.
> Si sigue igual, dime en qué curso y lección estás y lo revisamos.

*Nota interna:*
- YouTube va incrustado como `youtube-nocookie.com` (`lib/youtube.ts:71`). No hay mensaje ni enlace alternativo.
- Si la URL del vídeo no se reconoce, la parte del vídeo **desaparece** sin aviso (`components/leccion/VistaLeccion.tsx:97,110`) → **C** si la lección claramente debería tener vídeo.

#### El audio no suena — A → B
> Prueba a recargar la página y mira el volumen del reproductor (y el del móvil o el ordenador). Si sigue sin sonar, dime en qué curso y lección estás.

*Nota interna:* los audios son reproductores de Podbean dentro de la lección (`lib/sanear-html.ts:30-33`). Si se bloquean, se ve un recuadro vacío, sin mensaje.

#### Completé una lección y no aparece marcada — A → B
> Recarga la página. Si sigue sin marcarse, ábrela otra vez y pulsa el botón del final («Marcar como completada y continuar», o «Completar y seguir» si tenía ejercicios).
> Si aun así no se guarda, dime el nombre de la lección y lo revisamos.

*Nota interna:*
- Con la sesión caducada al pulsar, **no se guarda** y aparece la pantalla de entrar con «Tu sesión ha caducado» (`app/api/progreso-leccion/route.ts:28-35`). Hay que repetirla después de entrar.
- Con ejercicios, se completa solo desde la pantalla final de los ejercicios.

#### ¿Cuánto dura el curso? — A
> Son seis meses de contenido que se va abriendo semana a semana.

*Nota interna:* 24 aperturas (días 0–161). El FAQ dice «23 semanas» (ver sección 5).

#### Me sale una página en inglés que pone «404» o «This page could not be found» — C
> Vaya, esa página no debería salirte. ¿Me mandas una captura y me dices qué estabas pulsando? Lo pasamos al equipo. Mientras tanto, puedes volver a entrar desde {{URL_PLATAFORMA}}.

*Nota interna:* no existe `app/not-found.tsx`, así que sale la 404 de Next en inglés (`notFound()` en ficha, curso o lección inexistentes).

---

### 2.5 «Para ti» (práctica personalizada)

#### No puedo preparar un bloque nuevo / el botón está gris — A
*«No me deja generar», «Después de tu próxima clase», «Se abre con tu próxima clase», «Ya has practicado lo de tu última clase».*

> La práctica se prepara con lo que trabajaste en tu última clase. Cuando ya has hecho el bloque de esa clase, el siguiente se abre después de tu próxima clase, en cuanto tu profesor suba lo que trabajasteis. No tienes que hacer nada: te lo encontrarás abierto en «Para ti».
> Mientras tanto, puedes repetir los bloques que ya hiciste.

*Nota interna:*
- Solo se puede generar si hay un análisis de clase `ready` y validado (`approved`, `auto_approved` u `ok`) más nuevo que el último bloque (`lib/limites.ts:58-77`, `lib/gestion.ts:247-261`).
- No hay aviso al alumno cuando se abre.

#### Ya tuve la clase y sigue sin dejarme — A → B
> Puede tardar un poco: primero tu profesor tiene que subir lo que trabajasteis en clase. Vuelve a mirarlo más tarde.
> Si han pasado varios días desde tu clase y sigue cerrado, dime tu nombre completo y la fecha de la clase y lo revisamos.

*Nota interna:*
- Una clase en revisión (`validation_status = review`) no cuenta hasta que se aprueba en Gestión.
- Cuánto tarda normalmente el análisis: **[VERIFICAR]**.
- La persona debe mirar el análisis de esa clase en Gestión.

#### «Esta vez no ha salido» / se queda preparando / tarda mucho — A → C
> Prepararlo suele tardar menos de un minuto. Si pone «Está tardando más de lo normal», espera un poco más sin cerrar la página.
> Si sale «Esta vez no ha salido», pulsa «Volver a intentarlo».
> Si te dice «Ya has practicado lo de tu última clase», recarga la página: seguramente el bloque ya está preparado.
> Si falla varias veces, mándame una captura y lo pasamos al equipo.

*Nota interna:*
- Tiempo máximo del servidor: 60 s. El cliente corta a los 70 s; el aviso de «tardando» sale a los 52 s.
- El bloque se guarda antes del último paso. Si el aviso final no llega, el bloque existe pero el reintento da «Ya has practicado…» hasta que se recarga.
- Si se cierra la pestaña a mitad, probablemente **no** se guarda **[VERIFICAR]**: deducción del funcionamiento del streaming (`app/api/generar-bloque/route.ts:188-210,528-548`).

#### He cerrado a mitad de un bloque — A
> Al volver a abrir el bloque empieza desde el primer ejercicio. El bloque cuenta como hecho cuando llegas al final, así que te recomiendo hacerlo de una vez (son unos 10 minutos).

*Nota interna:*
- Se guarda el punto de avance, pero no se usa al reabrir (`leerAvanceAlumno` no se llama).
- Las respuestas sueltas de la práctica no se guardan.
- Completado = llegar al último ejercicio (`components/practica/VistaBloque.tsx:141-214`).

#### Preparé un bloque y ha desaparecido — A → C
> Recarga la página de «Para ti» o de Inicio: debería aparecer. Si no está, mándame una captura y lo revisamos.

*Nota interna:*
- Si falló el guardado, el alumno vio el bloque pero no queda guardado (`app/api/generar-bloque/route.ts:124-131`). En ese caso puede volver a generarlo.
- «Este bloque ya no está aquí» → que genere uno nuevo si puede; si no, **C**.

#### Creo que un ejercicio está mal — B
> ¡Gracias por avisar! ¿Me dices qué ejercicio es (o me mandas una captura) y qué crees que falla? Lo pasamos al equipo para revisarlo.

#### Mis ejercicios no hablan de mi trabajo — A / B
> Para eso necesitamos conocerte un poco más. Completa tu perfil (a qué te dedicas y qué quieres conseguir con el inglés): en «Para ti» verás «Completar mi perfil», o tienes el formulario en tu correo. Desde tu próximo bloque, parte de los ejercicios irán sobre tus situaciones reales.
> Si no encuentras el formulario, dímelo y te lo hacemos llegar.

*Nota interna:*
- `components/practica/InvitacionPerfil.tsx`, `lib/modos.ts:58-61,89-109`.
- Si no tiene enlace de formulario → **B** (reenviar el formulario desde Gestión).

#### ¿Qué es «Para ti»? ¿Cuánto dura un bloque? — A
> El curso es igual para todos los alumnos de tu nivel. «Para ti» es tu práctica personal: se prepara con lo que trabajaste en tu última clase, lo que se te repite y lo que nos has contado de ti. Cada bloque son 10 ejercicios, unos 10 minutos.

#### ¿Mi profesor ve lo que hago en la práctica? — A
> Tu profesor prepara cada clase con lo que trabajáis juntos. Si quieres repasar algo de tu práctica, coméntaselo en tu próxima clase.

*Nota interna:* es la respuesta literal del FAQ `practica-profesor-ve`. No ampliar.

---

### 2.6 Progreso, nivel y diploma

#### Creo que mi nivel está mal — A → B
> El nivel que ves sale, por orden, de lo que haya confirmado tu profesor, de tu ficha, de tu prueba de nivel o del nivel con el que te apuntaste. Al lado pone de dónde sale («estimado», «prueba de nivel» o el nombre de tu profesor).
> Si crees que no es el tuyo, coméntaselo a tu profesor en tu próxima clase. Si quieres, también lo paso al equipo: dime tu nombre completo.

*Nota interna:*
- `lib/estimacion.ts:548-632,712-724`. Hay 10 alumnos con el nivel congelado al de alta (`NIVEL_CONGELADO`).
- Cambiar el nivel (`nivel_profesor` en Gestión) puede cambiarle el curso en planes generales.

#### ¿Qué significa «estimado»? — A
> Que es el nivel que calculamos con lo que sabemos de ti hasta ahora. Tu profesor lo irá confirmando en clase.

#### ¿Se guarda mi progreso si cambio de móvil u ordenador? — A
> Sí, tu progreso va con tu cuenta, no con el dispositivo. Solo tienes que entrar en el nuevo dispositivo con tu email.

#### ¿Cuándo tengo el diploma? ¿Cómo lo descargo? — A
> El diploma se consigue a los seis meses desde que empezaste. En «Mi diploma» ves cuánto te queda. Cuando llegues, la descarga estará en esa misma página: la estamos preparando.

*Nota interna:*
- Se cuenta por tiempo desde el 12/10/2026 (`lib/diploma.ts`). No hay descarga todavía (`lib/textos/diploma.ts:85-89,126`).
- Gestión y algunas pantallas usan aún la regla antigua del 100 % de lecciones (ver sección 7).

#### «Tu profe está preparando tu plan; aquí verás tu camino hacia el diploma» — B (si lleva tiempo así)
> Eso sale mientras terminamos de preparar tu plan. Si llevas ya un tiempo con clases y sigue saliendo, dime tu nombre completo y lo revisamos.

*Nota interna:* `fecha_inicio` vacía o con formato distinto de `YYYY-MM-DD` (`lib/diploma-plazo.ts:34-43`).

---

### 2.7 Otros

#### ¿Funciona en el móvil? ¿Qué navegador uso? — A
> Sí, funciona en el móvil y en el ordenador, desde el navegador; no hace falta instalar nada. Te recomendamos tener el navegador actualizado (Chrome, Safari, Edge o Firefox).

*Nota interna:*
- En móvil hay barra de pestañas abajo: Inicio, Clases, Curso, Para ti, Progreso y Perfil. Diploma y Descuento están dentro de Perfil (`components/Navegacion.tsx:73-93`).
- El diseño usa CSS `:has()` y `dvh`, sin alternativa para navegadores antiguos → recomendar navegador actualizado. No hay requisito explícito **[VERIFICAR]**.

#### No me llegan los avisos de contenido nuevo — A → B
> Esos avisos llegan por email por la mañana el día que se abre contenido nuevo de tu curso (más o menos una vez por semana), desde practica@drcacademy.com. Mira en spam y promociones.
> Si te diste de baja de ellos, puedes volver a activarlos desde el enlace «Dejar de recibir avisos…» de cualquier aviso anterior.
> Si nunca te ha llegado ninguno, dime tu nombre completo y lo revisamos.

*Nota interna:* razones para no recibirlos (`app/api/avisos-apertura/route.ts:208-219,387-397`):
- se dio de baja;
- no tiene `fecha_inicio`;
- tiene el curso abierto entero;
- el módulo ya se avisó (se avisa una sola vez);
- el cron no corrió ese día;
- falta `CRON_SECRET`.

#### Quiero dejar de recibir los avisos — A
> Al final de cualquier aviso tienes el enlace «Dejar de recibir avisos de contenido nuevo». Esto no cambia nada de tu curso ni de tu práctica, y desde ese mismo enlace puedes volver a activarlos cuando quieras.

#### «Algo se ha roto por aquí» — A → C
> Pulsa «Volver a intentarlo»; casi siempre se arregla así y no se pierde nada de lo que llevas hecho. Si vuelve a salir, mándame una captura (abajo aparece un código) y lo pasamos al equipo.

*Nota interna:* `app/error.tsx`. El código es el `digest` de Next, útil para buscar en los logs de Vercel.

#### La página se queda cargando / en blanco — A → C
> Recarga la página. Si sigue igual, dime desde qué dispositivo y navegador entras y en qué pantalla te pasa.

#### Facturas, tarjeta, suscripción, cancelar — A
> Todo eso está en tu cuenta de la web: https://drcacademy.com/mi-cuenta/perfil/ (también desde la plataforma, en el menú de tu perfil → «Perfil»). Si no se arregla, cuéntame qué necesitas.

#### ¿Cómo consigo los 50 € de descuento? — A
> En el menú de la plataforma tienes «50 € de descuento» (en el móvil, dentro de «Perfil»), que te lleva a https://drcacademy.com/mi-cuenta/consigue-un-descuento/ con todos los detalles.

#### ¿Dónde está la ayuda / el tutorial? — A
> Abajo a la derecha tienes un botón verde con «?». Ahí puedes abrir el «Tutorial» (te enseña dónde está cada cosa) o el «Chat» con las preguntas frecuentes.

---

## 3. Árbol de diagnóstico: «no puedo entrar»

Haz las preguntas de una en una y sigue la rama que corresponda.

```
1. «¿Cómo intentas entrar: desde «Mi cuenta» en drcacademy.com, o pidiendo
   el enlace por email en la plataforma?»
   │
   ├─ Desde «Mi cuenta» (botón «Entrar en mi práctica")
   │   2a. «¿Qué ves al pulsarlo?» (pide captura)
   │   ├─ Me pide usuario y contraseña de la web → que entre en la web con su
   │   │   usuario; después le lleva sola a la plataforma.
   │   ├─ «Ese enlace ya no es válido» → que vuelva a pulsar el botón.
   │   │   Si se repite siempre → C (configuración del botón). Mientras tanto,
   │   │   rama del email.
   │   ├─ «No encontramos tu ficha» → B (email de la web ≠ email de la ficha).
   │   ├─ Pantalla «Entra en tu práctica» sin mensaje → que pida el enlace por
   │   │   email (rama de abajo). Si le pasa siempre desde el botón → C.
   │   └─ No encuentra el botón → que use la rama del email. [VERIFICAR dónde está]
   │
   └─ Pidiendo el enlace por email
       2b. «¿Qué email escribiste? ¿Es el mismo con el que te diste de alta en la
            academia?»
       ├─ Sale «Ese email no parece completo» → que lo escriba entero.
       └─ Sale «Si ese email está registrado, te hemos enviado un enlace»
           3. «¿Te ha llegado el correo de practica@drcacademy.com? Mira spam,
              promociones y Todos los correos; puede tardar un par de minutos.»
           ├─ NO llega
           │   4. «¿Tienes otro email con el que te hayas podido dar de alta?
           │      Prueba con él.»
           │   ├─ Con otro sí llega → resuelto (A). Dile que use siempre ese.
           │   └─ Con ninguno, tras 10 min → B. Recoge nombre y emails.
           │      (Si es alta reciente → B igualmente.)
           └─ SÍ llega
               5. «¿Qué pasa al pulsar «Entrar en la práctica»?»
               ├─ «Ese enlace ya no es válido» → han pasado más de 15 min: pedir
               │   otro y abrirlo enseguida (el más reciente).
               ├─ «No encontramos tu ficha» → B.
               ├─ «No hemos podido abrir tu sesión» → reintentar en 1 min;
               │   si se repite → C.
               ├─ Entra, pero luego en el navegador «normal» no está dentro →
               │   se abrió en el navegador de la app de correo: pedir otro
               │   enlace y «Abrir en el navegador».
               ├─ Entra y al rato le devuelve a la pantalla de entrar → sesión
               │   cerrada: pedir otro enlace. Si pasa a diario → C.
               └─ Pantalla «Algo se ha roto por aquí» o página en inglés «404»
                   → C (captura + código).
```

Antes de cerrar cualquier rama resuelta, recuérdale: «Una vez dentro, la sesión dura 30 días en ese dispositivo».

---

## 4. Cuándo transferir a una persona

### Regla general
Transfiere cuando:
1. la solución exige mirar o cambiar datos del alumno;
2. el alumno ya ha seguido las instrucciones (A) y no ha funcionado;
3. hay una clase inminente afectada (márcalo **URGENTE**);
4. la pregunta no está en este documento.

### Datos que hay que recoger siempre
- Nombre y apellidos.
- Email con el que intenta entrar.
- Qué ve: texto exacto o captura.
- Dispositivo y navegador (móvil u ordenador; Chrome, Safari…).

### Casos B: qué pedir y qué hace la persona del equipo

| Caso | Pedir además | Qué hace la persona y dónde |
|---|---|---|
| «No encontramos tu ficha» / no le llega el enlace con ningún email | Todos los emails que use; email con el que pagó | **Gestión**: buscar la ficha y comprobar el email. Si es distinto, corregirlo en la ficha (el LMS lo lee al momento) o decirle al alumno con qué email entrar. Si no tiene ficha o asignación, darle de alta. El panel del LMS no deja buscar por email ni generar enlaces. |
| Alta reciente, aún sin acceso | Email de la compra, fecha de compra | **Gestión**: crear la ficha o asignación. Hasta entonces no puede entrar. |
| Botón de la web → «no encontramos tu ficha» | Email de su cuenta de la web | **Gestión**: igualar el email al de la web, o indicarle que entre por email con el de Gestión. El vínculo web↔alumno solo se puede corregir en Supabase (sin interfaz). |
| Cambiar email | Email actual y nuevo | **Gestión** (ficha) y **WooCommerce** (cuenta) a la vez, para que sigan coincidiendo. |
| Sin enlace de clase («Habla con tu profesor para el enlace», «Tu enlace de clase está en camino») | Día y hora de la clase | Enviarle ya el enlace por WhatsApp. En **Gestión**, poner el `meet_link` de la asignación. Tiene que ser Meet, Zoom, Teams, Whereby o Jitsi, con la ruta completa. |
| Sin horario / no ve sus clases | Qué horario cree tener | **Gestión**: calendario o asignación del alumno. |
| «Tu plan todavía no tiene un curso asociado» / curso equivocado o desaparecido | Curso que esperaba | **Gestión**: revisar plan y nivel. O en el **panel del LMS** (en ordenador): «···» en la fila del alumno → «Gestionar accesos» → marcar el curso, con motivo. |
| Quiere adelantar el curso (examen cercano) | Examen y fecha | **Panel del LMS** → «Gestionar accesos» → «Abrirle el curso entero». |
| Todo el curso abierto desde el día 1 / diploma sin fecha | — | **Gestión**: revisar `fecha_inicio`. Tiene que ser una fecha válida (AAAA-MM-DD). |
| Clase hecha hace días y la práctica sigue cerrada | Fecha de la clase | **Gestión**: ver si el análisis de esa clase está en revisión y validarlo. |
| Ejercicio que cree que está mal | Captura o texto del ejercicio | Revisar el bloque. Para ver lo que ve el alumno: **panel del LMS** → clic en su fila («Revisando la ficha de…», solo lectura). |
| Nivel que cree incorrecto | — | Avisar al profesor. **Gestión**: `nivel_profesor`. Ojo: en planes generales cambia el curso. |
| Cambio de horario o profesor que la plataforma no le deja hacer | Días y horas que le vendrían bien | **Gestión**: el cambio a mano. |
| «Tu cambio no ha terminado de guardarse» | — | El equipo ya está avisado: revisar el cambio a medias en Gestión y escribir al alumno. |
| «No hemos podido cerrar una fecha» (recuperación) | Clase cancelada (fecha) | **Gestión**: cerrar la recuperación con el alumno. |
| Baja, pausa o «en espera» y dudas de acceso | — | **WooCommerce** (suscripción) y **Gestión** (asignación). |
| Formulario de perfil perdido | — | **Gestión**: reenviar el formulario. |
| No recibe avisos de contenido nuevo | — | Comprobar que tiene `fecha_inicio` y que no se dio de baja (`avisos_preferencias` en la base del LMS). |

### Casos C: cómo reconocer un fallo de la plataforma
- Pantalla «Algo se ha roto por aquí» que se repite. Pedir el código del pie.
- Página en inglés «404 / This page could not be found».
- El correo de acceso no llega a nadie, o a un email que el equipo ha confirmado que es correcto. Revisar Resend y `URL_BASE`.
- El botón de la web siempre deja en la pantalla de entrar sin mensaje, o siempre dice «ya no es válido». Revisar `SECRETO_WOO`/`DRC_SECRETO_WOO`.
- «No hemos podido abrir tu sesión» repetido.
- «Esta vez no ha salido» al preparar un bloque, varias veces seguidas.
- Varios alumnos a la vez sin clases, sin curso o sin recuperaciones. Suele ser que Gestión no responde: la plataforma lo enseña como vacío, sin aviso.
- Lecciones completadas que no se guardan sin que haya caducado la sesión.

Pasar a quien mantiene la plataforma con: captura, código de error si lo hay, hora aproximada, email del alumno y pantalla.

### Mensaje de cierre al transferir
> Gracias, [nombre]. Se lo paso ahora a una persona del equipo y te escribe por aquí en cuanto pueda. 🙌

No prometas plazos.

---

## 5. Discrepancias entre el FAQ del chat de ayuda y el código

El FAQ está en `lib/faq.ts`. En estos casos el agente sigue **el código** (la sección 2 ya lo hace) y conviene corregir el FAQ:

| FAQ (id) | Dice | El código hace | Qué hace el agente |
|---|---|---|---|
| `curso-cual-me-toca` | «Si estás preparando un examen… tienes **además** el curso específico de ese examen» | Con un plan de examen da **solo** el curso de examen (`lib/cursos.ts:97-101`). El general solo con acceso manual. | Dice «tienes el curso de tu examen». Si quiere el general → B. |
| `curso-disponible-en-dias` | Cita «disponible en X días» | La pantalla dice «Se abre mañana», «Se abre en N días» o «Se abre el D de mes» (`lib/textos/banners.ts:194-196`) | Usa los textos actuales. |
| `curso-duracion` | «23 semanas» | 24 aperturas (días 0 a 161). Los comentarios del código dicen «24 semanas» (`lib/temario.ts:6`, `lib/diploma.ts:29`). | Dice «seis meses, semana a semana». |
| `clases-cambiar` | «Escríbenos y vemos contigo las opciones» | Hay autoservicio en «Clases» si los interruptores están encendidos **[VERIFICAR]** | Depende del interruptor (ver 2.3). |
| `clases-suscripcion-espera` | «Mientras esté en espera no podrás tomar clases» | La plataforma no mira la suscripción y el alumno sigue entrando y viendo su botón de clase. Si Gestión bloquea las clases **[VERIFICAR]**. | No afirma nada sobre el acceso: lo deriva a B. |
| `practica-otro-bloque` | «Hasta tu próxima clase no hay material nuevo» | No basta con la clase: tiene que estar **analizada y validada** (`lib/gestion.ts:247-261`) | Dice «en cuanto tu profesor suba lo que trabajasteis». |
| `clases-como-entro` | «Entra en Clases y pulsa «Unirse a la clase». Se activa 30 minutos antes» | Es correcto, pero en móvil el botón **no existe** hasta esos 30 min y en ordenador se ve gris. También está en Inicio. | Lo explica (2.3). |
| `acceso-como-entro` | «Con el botón que verás en «Mi cuenta»» | El botón «Entrar en mi práctica» existe (shortcode). `lib/cuenta-woo.ts` dice además que el escritorio de «Mi cuenta» **redirige solo** a la plataforma. Ninguna de las dos cosas está implementada en el repo. **[VERIFICAR]** | Habla del botón; si no lo encuentra, va por email. |
| `curso-plataforma-anterior` | «Tu progreso se conservó y lo verás reflejado al entrar» | Se migró, pero solo se ve el progreso de los cursos que tiene ahora. El panel avisa de «N lecciones hechas aquí y sin acceso. Progreso migrado de LearnDash.» | Si echa algo en falta → B. |
| `acceso-no-llega`, `tecnico-*`, `practica-ejercicio-mal`… | Mandan escribir por **WhatsApp** | Varios textos de la plataforma mandan a «escribe a tu profesor»: aviso de `sinficha`, pie de `/acceso`, pantalla de error, banner sin curso y «Habla con tu profesor para el enlace». | El agente atiende él mismo el caso; no reenvía al profesor por temas de acceso o enlace. |
| `acceso-despues-registro`, `acceso-prueba-nivel`, `acceso-formulario-a-medias` | Formulario de bienvenida y prueba de nivel | Ocurren fuera de este repo **[VERIFICAR]** | Repite el FAQ sin añadir nada; dudas concretas → B. |

Coinciden con el código: `acceso-caducado` (15 min), `acceso-contrasena` (30 días), `acceso-otro-dispositivo`, `acceso-no-pasa-nada`, `curso-hecha-y-bloqueada`, `practica-duracion-bloque` (4/4/2), `progreso-dispositivos` y `clases-cambiar-email`.

---

## 6. Lista de [VERIFICAR]

1. **URL pública real** (`URL_BASE` en Vercel). En el repo solo aparece `https://drc-lms.vercel.app` por defecto. Pendiente el paso a `practica.drcacademy.com`: hay que cambiar `URL_BASE` en Vercel, `DRC_LMS_URL` en `wp-config.php` y la sección 1 de este documento.
2. **Interruptores de autoservicio en producción** (`AUTOSERVICIO_ACTIVO`, `AUTOSERVICIO_PROFESOR_ACTIVO`). Decide la respuesta a «quiero cambiar de horario o de profesor».
3. **Alumnos de baja o en pausa**: ¿conservan una asignación inactiva en Gestión? Si la conservan, siguen entrando al LMS (la vista incluye asignaciones inactivas).
4. **La entrada desde «Mi cuenta»**: dónde está colocado el botón `[boton_lms]` y si el escritorio de «Mi cuenta» redirige solo al LMS. No está en el repo.
5. **Si `DRC_SECRETO_WOO` (WordPress) y `SECRETO_WOO` (Vercel) coinciden.** Si no, el botón de la web falla siempre.
6. **Cuánto tarda en estar listo el análisis de una clase** (y su validación) en Gestión. Es lo que abre la siguiente práctica.
7. **Si Gestión bloquea las clases con la suscripción «en espera»** (el LMS no lo hace).
8. **El registro, el formulario de bienvenida y la prueba de nivel**: flujo fuera del repo.
9. **Entregabilidad del correo** `practica@drcacademy.com` (SPF, DKIM, carpeta de spam). El código avisa del riesgo mientras se use vercel.app.
10. **Avisos de contenido nuevo**: que `CRON_SECRET` esté definido y que el sembrado inicial (`?sembrar=1`) se ejecutara.
11. **Cerrar la pestaña mientras se prepara un bloque**: se deduce que el bloque no se guarda, pero no se puede confirmar sin probarlo en Vercel.
12. **Valores reales de `visible_after` en la base.** Los del export de LearnDash cuadran (días 0–161), pero la base viva no se puede consultar desde el repo.
13. **Navegadores soportados**: no hay requisito explícito. El diseño necesita navegadores actuales (`:has()`, `dvh`).
14. **Textos de Gestión en recuperaciones**: en español se muestra a veces el mensaje literal que devuelve Gestión, y esos textos no están en el repo.
15. **Qué considera Gestión «elegible»** para el autoservicio y para las opciones de recuperación.

---

## 7. Problemas reales detectados (mejoras posibles, no aplicadas)

Sitios donde el alumno se puede quedar atascado o confundido sin un mensaje claro.

**Acceso**
1. **Sesión caducada o cerrada → pantalla de entrar sin explicación.** El middleware nunca añade `?motivo=` (`middleware.ts:199-207`) y la guarda de página tampoco (`lib/sesion-servidor.ts:49-53`).
2. **La plataforma sale en inglés por defecto** y no mira el idioma del navegador (`lib/idioma.ts:41`). La mayoría de los alumnos son hispanohablantes.
3. **Los correos solo están en español** (acceso y avisos), aunque el alumno use la plataforma en inglés.
4. **Botón de la web mal configurado → `/acceso` sin mensaje** (`wordpress/drc-acceso-lms.php:245`). Además, los fallos por la web no se registran (`app/entrar/woo/route.ts` no llama a `registrarIntento`).
5. **Email de la web ≠ email de Gestión**: el vínculo por id de WordPress nunca llega a crearse solo. Tampoco hay interfaz para crearlo a mano (`lib/vinculos.ts`).
6. **El equipo no tiene herramientas de soporte de acceso en el panel**: no puede buscar por email, ver intentos de entrada, generar un enlace para un alumno ni cerrar sesiones (`components/admin/PanelAdmin.tsx:91-97`).
7. **Sin límite de peticiones de enlace** por email o IP (`app/acceso/acciones.ts:35-40`).
8. **Mensajes que mandan a «escribe a tu profesor»** para problemas que no puede resolver el profesor: `sinficha`, pie de `/acceso` y pantalla de error (`lib/textos/entrada.ts:80,94-95,105`).

**Clases**
9. **En móvil no se avisa de que falta el enlace de clase** hasta la media hora antes, porque no hay botón gris ni aviso (`components/clases/CtaProximaClase.tsx:90-94`).
10. **El botón y el destino usan enlaces distintos**: el botón solo mira el enlace del calendario y, al pulsar, se usa como reserva el de la ficha (`lib/entradas-clase.ts:93-122`). Puede salir «Habla con tu profesor para el enlace» aunque el enlace de la ficha funcione.
11. **Un enlace de sala de una herramienta no prevista** cuenta como «sin enlace» (`lib/clases.ts:650-679`).
12. **Si Gestión no responde, el calendario sale vacío** («no tienes clase»), sin aviso de error.
13. **Hora de Madrid sin conversión** para alumnos fuera de España. La cabecera de «Para ti», en cambio, usa la hora del navegador (`components/PanelPractica.tsx:136-140`).

**Curso**
14. **Lección cerrada o curso fuera del plan → redirección silenciosa** al temario o al Inicio (`app/(alumno)/curso/[slug]/[leccion]/page.tsx:85-96`, `curso/[slug]/page.tsx:68-71`).
15. **No hay 404 propia**: sale la de Next, en inglés.
16. **Vídeo o audio que no carga**: no hay mensaje ni enlace alternativo. Una URL de YouTube no reconocida hace desaparecer el vídeo sin rastro (`lib/youtube.ts:67-72`).
17. **Completar una lección con la sesión caducada** pierde la compleción y, tras entrar, no devuelve a la lección: no lleva `volver` (`app/api/progreso-leccion/route.ts:28-35`).
18. **Cambio de nivel en Gestión → el curso cambia** y el anterior desaparece sin explicación.

**Práctica**
19. **Reabrir un bloque empieza de cero**: el avance se guarda pero no se usa (`leerAvanceAlumno` no tiene llamadas).
20. **Tras un fallo de generación con el bloque ya guardado**, «Volver a intentarlo» da «Ya has practicado lo de tu última clase…» hasta recargar.
21. **Cerrar la pestaña durante la generación** probablemente pierde el bloque (sin `cancel` en el stream).
22. **Una clase en revisión no desbloquea la práctica** y el alumno no sabe que está pendiente de validar.
23. **No se avisa al alumno** cuando tiene un bloque nuevo disponible.
24. `components/PanelPractica.tsx:338`: la expresión `/:s*$/` debería ser `/:\s*$/`. Se ve «Parada 1:» con los dos puntos.
25. `app/api/generar-bloque/route.ts:237-259`: la rama «Ya tienes tu bloque con lo que sabemos de ti…» nunca se alcanza.
26. `components/practica/Ruta.tsx:762`: botón «Ir» sin traducir.

**Diploma y otros**
27. **Dos reglas de diploma a la vez.** La pantalla «Mi diploma» cuenta por tiempo; Gestión (`/api/externo/diploma`), «Mi progreso», «Mi curso» y los avisos usan aún el 100 % de lecciones. El alumno puede ver estados distintos.
28. **El diploma promete una descarga que no existe** (`lib/textos/diploma.ts:87-88,126`).
29. **La fecha de inicio se lee distinto en el diploma y en el curso**: una fecha rara abre todo el curso pero oculta la cuenta atrás del diploma.
30. **Avisos de contenido**:
    - un módulo que se abrió hace más de un día ya no se avisa nunca (si el cron falla dos días seguidos, se pierde);
    - un envío que se cortó a mitad queda «reservado» para siempre y no se reintenta.
31. **Recuperaciones**: en español se enseñan mensajes literales de Gestión que no se controlan desde el LMS.
32. **El FAQ dice «además»** sobre el curso general en planes de examen (ver sección 5).
33. **Sin cabeceras de seguridad** (CSP, `frame-ancestors`): la plataforma se puede incrustar en otra web. No afecta al alumno directamente.

---

## Anexo: prompt de sistema para Respond.io

Copia este bloque como instrucciones del agente. Las respuestas de la sección 2 se pueden cargar como base de conocimiento. Sustituye `{{URL_PLATAFORMA}}` por el valor de la sección 1.

```
ROL
Eres el asistente de soporte de DRC Academy por WhatsApp para DRC Práctica, la
plataforma donde los alumnos hacen su curso, su práctica personalizada («Para ti») y
entran a sus clases. Resuelves dudas de uso y problemas técnicos.
NO tienes acceso a los datos de ningún alumno: solo das instrucciones. Si hay que
mirar o cambiar datos, recoges la información y pasas la conversación al equipo.

ESTILO
- Español de España, tuteo, cálido, mensajes cortos, un paso cada vez.
- Sin jerga técnica (nada de token, cookie, caché, Gestión, WooCommerce, drip).
- Nunca culpes al alumno ni hables de sus errores.
- No inventes nada que no esté en tu base de conocimiento. Si no lo sabes, transfiere.
- No prometas plazos ni cambios que dependan del equipo.
- Si el alumno escribe en inglés, responde en inglés.

DATOS CLAVE
- Plataforma: {{URL_PLATAFORMA}} · No hay contraseña ni app.
- Entrar: botón «Entrar en mi práctica» en «Mi cuenta» de drcacademy.com, o pedir el
  enlace con el email en la plataforma. Tiene que ser el email con el que se dio de alta
  en la academia.
- El correo llega de practica@drcacademy.com («Tu acceso a la práctica de DRC Academy»).
  El enlace dura 15 minutos; la sesión, 30 días en cada dispositivo.
- La pantalla siempre dice «Si ese email está registrado, te hemos enviado un enlace»,
  exista o no: no confirma nada.
- La plataforma sale en inglés por defecto: botón ES/EN arriba a la derecha.
- Botón «Unirse a la clase»: 30 minutos antes de la clase hasta que termina. En el
  móvil no aparece antes. Horas siempre en hora de Madrid.
- El curso se abre semana a semana desde la fecha de inicio con la academia; lo
  completado nunca se cierra.
- Nuevo bloque de práctica: solo cuando el profesor ha subido la clase nueva
  analizada. 10 ejercicios, unos 10 minutos. Reabrir un bloque empieza de cero.
- Los cambios hechos por la academia tardan hasta 2 minutos en verse: recargar.
- Pagos, facturas, suscripción: https://drcacademy.com/mi-cuenta/perfil/
- Diploma: a los 6 meses desde el inicio; la descarga aún se está preparando.

TRANSFIERE A UNA PERSONA cuando:
- «No encontramos tu ficha», no le llega el enlace con ningún email, alta reciente,
  cambio de email o email de compra distinto.
- No hay enlace de clase («Habla con tu profesor para el enlace» o «Tu enlace de
  clase está en camino»). URGENTE si la clase es en menos de 1 hora.
- Sin curso, curso cambiado, algo completado que aparece cerrado, diploma sin fecha,
  práctica cerrada varios días después de una clase.
- Fallos que se repiten: «Algo se ha roto por aquí», página 404 en inglés, «Esta vez
  no ha salido» varias veces, progreso que no se guarda.
- Ejercicio con un error, nivel que cree incorrecto, cambio de horario o profesor,
  bajas o pagos que no se resuelven en «Mi cuenta», o cualquier cosa que no sepas.
Antes de transferir pide: nombre y apellidos, email con el que entra (y el de compra
si es distinto), qué ve (texto o captura), dispositivo y navegador y, según el caso,
lección, día y hora de la clase o código de error. Cierra con: «Gracias, se lo paso
ahora a una persona del equipo y te escribe por aquí.»

NO CONTRADIGAS la ayuda de la plataforma: enlace de 15 minutos, sesión de un mes, una
vez por dispositivo, botón 30 minutos antes, curso semana a semana, bloque de unos 10
minutos, el email lo cambia el equipo.
```
