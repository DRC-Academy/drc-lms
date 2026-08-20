# Pantallas y estados del alumno

**Inventario de trabajo.** Cada pantalla con lo que el alumno ve y el texto
literal que lee, tal y como está en el código a día de hoy (rama `main`,
commit `09b08e7`).

Convenciones:

- El texto entre comillas angulares es **literal**. Lo que va entre `{llaves}`
  es un dato que se rellena en tiempo de ejecución.
- Cada bloque lleva su origen en `archivo:línea` para poder cambiarlo sin
  buscarlo.
- «Equipo» = sesión con rol `admin`. Solo se menciona cuando cambia lo que se
  ve; el panel del equipo (`/`) queda fuera de este documento a propósito.

Dónde vive hoy el copy, para saber dónde tocar:

| Fuente | Qué redacta |
|---|---|
| `lib/modos.ts` | Tarjeta de generación, esperas, resumen de la última clase, avisos del formulario de perfil |
| `lib/diploma.ts` | El embudo del diploma: la meta de la franja, la línea junto al botón y el hito de la fila |
| `lib/generacion.ts` | Los cinco textos de etapa mientras se genera un bloque |
| `lib/drip.ts` | «Disponible mañana» / «Disponible en N días» |
| `lib/faq.ts` | Las 35 preguntas y respuestas de la ayuda, y el mensaje de WhatsApp |
| `lib/correo.ts` | El email del enlace de acceso |
| Los JSX | Todo lo demás |

---

## Mapa

| Ruta | Pantalla | Quién entra |
|---|---|---|
| `/acceso` | Pedir enlace de entrada | Cualquiera, sin sesión |
| `/entrar?token=…` | Canje del enlace (sin interfaz: redirige) | Cualquiera |
| `/alumno/{id}` | **Inicio** | El alumno dueño de la ficha, y el equipo |
| `/curso/{slug}` | **Temario** del curso | Alumno con ese curso en su plan |
| `/curso/{slug}/{leccion}` | **Lección** (teoría + ejercicios) | Ídem |
| `/alumno/{id}/{bloqueId}` | **Bloque de práctica** (3 fases) | El alumno dueño |
| `/practica` | **Para ti** | Solo alumnos |
| — | **Ayuda** (panel flotante) | En las tres pantallas del alumno |

---

# 1 · `/acceso` — Entrar

`app/acceso/page.tsx` · `components/FormularioAcceso.tsx`

Pantalla sola, sin cabecera ni navegación. Logotipo arriba a la izquierda,
titular, un campo de email y un botón.

### 1.1 Estado inicial

> **Entra en tu práctica**
>
> Pon tu email y te enviamos un enlace para entrar. Sin contraseñas.

- Campo (placeholder): `tucorreo@ejemplo.com` · etiqueta oculta: «Tu email»
- Botón: **Enviarme el enlace**
- Al pie, tras una línea:

> ¿Problemas para entrar? Escribe a tu profesor.

### 1.2 Enviando

El botón cambia a **Enviando…** y se deshabilita el campo. No hay más aviso.

### 1.3 Enlace enviado

El formulario **desaparece** y lo sustituye una tarjeta (`aria-live="polite"`):

> **REVISA TU CORREO**
>
> Si ese email está registrado, te hemos enviado un enlace para entrar.
>
> El enlace caduca en 15 minutos. Si no lo ves, mira en spam.

Debajo, enlace de texto: **Probar con otro email** (vuelve al estado inicial).

> El mensaje es **siempre el mismo, exista el email o no** — decisión de
> seguridad documentada en `app/acceso/acciones.ts:6`. No se puede cambiar por
> uno que confirme la cuenta.

### 1.4 Email mal escrito

Debajo del botón, sin perder lo escrito:

> Ese email no parece completo. Revísalo y vuelve a probar.

### 1.5 Error al enviar el formulario

> No hemos podido enviar el enlace. Inténtalo otra vez en un momento.

### 1.6 Avisos de vuelta (`?motivo=`)

Caja gris encima del formulario. Desaparece en cuanto el visitante envía.
`app/acceso/page.tsx:24`

| Motivo | Texto |
|---|---|
| `caducado` | Ese enlace ya no es válido. Pide uno nuevo. |
| `sinficha` | Ese enlace es correcto, pero no encontramos tu ficha. Escribe a tu profesor y lo miramos. |
| `error` | No hemos podido abrir tu sesión. Vuelve a intentarlo en un momento. |
| `salida` | Has cerrado sesión. Pide un enlace cuando quieras volver. |

### 1.7 El email que recibe

`lib/correo.ts` · remitente `DRC Academy <practica@drcacademy.com>`

- **Asunto:** Tu acceso a la práctica de DRC Academy
- Preheader oculto: «Tu enlace para entrar en la práctica. Caduca en 15 minutos.»

> DRC ACADEMY
>
> **Entra en tu práctica**
>
> Has pedido un enlace para entrar. Pulsa el botón y ya estás dentro: no hay
> contraseña que recordar.
>
> [ **Entrar en la práctica** ]
>
> El enlace caduca en **15 minutos**. Si se te pasa, pide otro sin problema.
>
> ---
>
> ¿El botón no funciona? Copia esta dirección y pégala en el navegador:
> {enlace}
>
> Si no has pedido tú este enlace, no hagas nada: sin pulsarlo no se abre
> ninguna sesión.

Versión en texto plano equivalente, en `lib/correo.ts:114`.

---

# 2 · Estados de sesión (transversales)

### 2.1 Sesión caducada o inexistente — navegación normal

`middleware.ts:59`. **No hay pantalla propia**: redirección silenciosa a
`/acceso`, borrando la cookie. El alumno aterriza en el estado inicial de
acceso, **sin ningún aviso de que su sesión había caducado**.

> **Hueco conocido.** El único caso que sí se explica es el del enlace
> (`?motivo=caducado`). Una sesión de 30 días que expira mientras se navega
> devuelve a la pantalla de entrar sin decir por qué. No hay `?motivo=expirada`.

### 2.2 Sesión caducada — llamada a la API

`middleware.ts:53`. Responde `401` con:

> Tu sesión ha caducado. Vuelve a entrar desde el enlace de tu email.

Ese texto **sí llega al alumno**: es el que pinta la caja de error de la
tarjeta de generación (§5.4 y §10.6) cuando se pulsa «Preparar mi bloque» con
la sesión ya vencida.

### 2.3 Cerrar sesión

Botón **Salir** en la cabecera → `POST /salir` → `/acceso?motivo=salida` →
«Has cerrado sesión. Pide un enlace cuando quieras volver.»

### 2.4 Ficha ajena

Un alumno que escriba el id de otro en la URL es devuelto a la suya, sin aviso
(`lib/sesion-servidor.ts:72`). Lo mismo con un curso que no está en su plan
(`app/curso/[slug]/page.tsx:47`).

### 2.5 Página que no existe

`notFound()` en la ficha, el curso y la lección. **No hay `not-found.tsx`**, así
que sale el 404 por defecto de Next, en inglés y sin marca.

> **Hueco conocido.** Un alumno con un enlace viejo a una lección retirada ve
> una pantalla que no es del producto.

---

# 3 · Cabecera y navegación (transversal)

`components/Cabecera.tsx`

Barra pegajosa arriba en todas las pantallas del alumno.

- Logotipo (alt: `DRC Academy`), lleva al inicio.
- Navegación de secciones: **Inicio** · **Mi curso** · **Para ti**
  - «Mi curso» solo aparece si el alumno tiene curso asignado.
  - En escritorio va junto al logotipo; en móvil baja a una barra fija abajo con
    los mismos tres rótulos y un icono cada uno.
- **Salir** (botón de texto) y el nombre del alumno con su inicial en un círculo.
  Para lector de pantalla: «Practicando como {nombre}».
- El equipo **no ve la navegación**: solo logotipo, «Salir» y su identidad.

### Contexto del curso (solo dentro de `/curso/…`)

- Escritorio: título del curso + barra + «{completadas} de {total} lecciones»
- Móvil: segunda línea con el título truncado + barra + «{porcentaje}%»

### Cabecera en carga

`components/leccion/CabeceraLeccion.tsx:38` — mismo alto y mismo logotipo, con
barras grises donde irán el título y el progreso.
Para lector de pantalla: «Cargando el curso…»

---

# 4 · `/alumno/{id}` — Inicio

`app/alumno/[id]/page.tsx`

Orden de la pantalla: saludo → (franja del curso, con el diploma dentro, + fila
del hito) a la izquierda, tarjeta de práctica a la derecha → el bloque
preparado, a lo ancho.

**El embudo del diploma** son tres piezas encadenadas, y cada una es un dato
distinto:

| Paso | Dónde | Qué dice |
|---|---|---|
| **Meta** | Cifra grande de la franja | «179 lecciones · PARA TU DIPLOMA» |
| **Paso** | Fila fina bajo la franja | «4 lecciones para cerrar este módulo» |
| **Acción** | Botón de la franja | «Continuar» → la lección exacta |

### 4.1 Saludo

Con clase analizada:

> **Hola, {nombre}**  `[B1 intermedio]`
>
> {profesor} trabajó contigo el {fecha}. Aquí tienes por dónde seguir.

Sin clase analizada todavía:

> **Bienvenido, {nombre}**  `[B1 intermedio]`
>
> {profesor} ya te ha dejado el curso preparado. Empieza cuando quieras.

- Sin profesor en la ficha, la frase empieza por «Tu profesor».
- El chip del nivel usa las palabras de `components/Casillas.tsx:23`:
  A1 inicial · A2 básico · B1 intermedio · B2 intermedio alto · C1 avanzado.
  Sin nivel, el chip no se pinta.

### 4.2 Solo para el equipo

Sobre el saludo: **← Cambiar de alumno** y, a la derecha, el email del alumno
como enlace `mailto:`. Es el único sitio de la interfaz donde se pinta un email.

---

## 5 · Las piezas del inicio

### 5.1 Franja del curso

`components/BannerCurso.tsx`, sobre `components/Banner.tsx` (fondo tinta, botón
verde).

**Sin curso asignado** — tarjeta blanca sobria, sin franja ni botón:

> Tu plan todavía no tiene un curso asociado. Coméntaselo a tu profesor y lo
> activamos. Mientras tanto, tu práctica de abajo funciona con normalidad.

**Con curso**, tres estados:

| Estado | Etiqueta | Titular | Botón | Junto al botón |
|---|---|---|---|---|
| Sin empezar | · EMPIEZA TU CURSO | {título de la 1ª lección} | Empezar | Empieza por la primera y esto se va llenando solo |
| En curso | · CONTINÚA DONDE LO DEJASTE | {título de la lección donde se quedó} | Continuar | Cada lección te acerca una |
| Queda una | · CONTINÚA DONDE LO DEJASTE | {título de la última lección} | Continuar | Es la última que te queda |
| Terminado | · CURSO COMPLETADO | {título del curso} | Repasar el curso | *(nada)* |

- Segunda línea (`meta`): «{título del curso} · {módulo}», con el prefijo de
  LearnDash («Week 3 - Lesson 12:») ya quitado. Con el curso terminado, el
  título ya **es** el curso, así que ahí solo va el módulo.
- El botón lleva el título en su nombre accesible: «Continuar {título}».

### 5.1.1 La cifra de la franja: el diploma

La columna derecha de la franja **es el diploma**. Antes decía «{porcentaje}% ·
del curso completado» y ahora dice lo que falta.

> **179** lecciones
> **PARA TU DIPLOMA**   ← verde claro `#A9DFB7`, la etiqueta del banner
> *(una marca por lección en escritorio, una barra en móvil)*
> llevas 12 de 191

| Estado | Cifra | Etiqueta | Pie |
|---|---|---|---|
| Sin empezar | {total} lecciones | PARA TU DIPLOMA | {total} lecciones por delante |
| En curso | {restantes} lecciones | PARA TU DIPLOMA | llevas {n} de {total} |
| Queda una | 1 lección | PARA TU DIPLOMA | llevas {total-1} de {total} |
| Conseguido | *(sello de 40px)* | DIPLOMA CONSEGUIDO | {total} lecciones, todas hechas |

La cifra es **siempre lo que falta, nunca el porcentaje**: 179 es un objetivo,
el 6% es una nota. El porcentaje sobrevive como relleno de las marcas y de la
barra de móvil, donde no se lee como número sino como distancia.

**Segundo curso** (alumnos de examen), fuera de la franja:

> También tienes acceso a [{título del segundo curso}].

### 5.2 Fila del hito: el paso de esta semana

`components/FilaHito.tsx` + `lib/diploma.ts`. Fila fina bajo la franja, con un
sello y una barra. **No es pulsable.**

Es el mismo mueble de 50px que antes ocupaba la fila del diploma, contando otra
cosa: cuánto falta para **cerrar el módulo en el que está**. El diploma se
mudó arriba, a la cifra de la franja.

| Estado | Lo que se lee | Barra |
|---|---|---|
| Sin curso, o curso sin lecciones | *No se pinta nada* | — |
| Sin empezar | **{n} lecciones** para cerrar tu primer módulo · {módulo} | del módulo |
| En curso | **{n} lecciones** para cerrar este módulo · {módulo} | del módulo |
| Queda una del curso | **La última. Ya está.** · {módulo} | del módulo |
| Conseguido | **El diploma es tuyo. Te contamos enseguida cómo descargarlo.** | *(ninguna)* |

- **La barra es la del módulo, no la del curso.** Es la que se mueve en una
  sesión: cerrar una lección de 191 no mueve un píxel, una de 7 mueve un
  séptimo.
- El nombre del módulo solo sale a partir de 900px, donde sobra ancho.
- Con el curso terminado la fila cambia de color (verde de fondo, sello
  relleno) y pierde la barra: una barra al 100% junto a «ya está» no añade nada.
- Descripción para lector de pantalla: «Te faltan {n} lecciones para cerrar este
  módulo» / «Te queda la última lección del curso».

> **Sigue sin haber descarga del diploma.** Ni botón, ni archivo, ni fecha. Las
> cuatro piezas pendientes están anotadas en `lib/diploma.ts`. El texto de
> «conseguido» es provisional a propósito y no promete archivo ni plazo.

### 5.3 Tarjeta de práctica (columna derecha)

`components/TarjetaGeneracion.tsx` + `lib/modos.ts:271`.
Desaparece entera si el alumno no tiene **ninguna** fuente (ni clase, ni perfil,
ni examen).

> `⭑ Nuevo tras cada clase`
>
> **Tu bloque de práctica**
>
> Diez ejercicios a partir de {fuentes}.
>
> [ **Preparar mi bloque** ]

Las **fuentes** se enumeran según lo que ese alumno tenga de verdad
(`lib/modos.ts:198`), en este orden y unidas con comas y una «y»:

- `lo que trabajaste el {fecha}`
- `lo que se te viene repitiendo de clases anteriores`
- `tu día a día` *(si ha rellenado el perfil)*
- `el formato del {B2 First | C1 Advanced | IELTS | B1 Preliminary}`

Si no hubiera ninguna, la frase de respaldo es:
«Diez ejercicios hechos con lo que sabemos de ti.»

### 5.4 Tarjeta de práctica · en espera (límite alcanzado)

La regla única: **se desbloquea cuando entra un transcript nuevo**
(`lib/limites.ts`). No es un cupo ni un plazo. El botón llega ya apagado, con la
explicación **encima** del botón.

**Ya tuvo clase analizada:**

> Ya has practicado lo de tu última clase. En cuanto tengas la siguiente con
> {profesor}, preparamos el próximo bloque.
>
> [ Después de tu próxima clase ]  *(botón gris, inerte)*

**Nunca tuvo clase analizada** (generó con perfil y examen):

> Ya tienes tu bloque con lo que sabemos de ti. En cuanto {profesor} analice tu
> primera clase, preparamos el siguiente con lo que trabajéis.
>
> [ Después de tu primera clase ]  *(botón gris, inerte)*

Sin nombre de profesor, las dos frases se dicen en impersonal («En cuanto se
analice tu primera clase…»).

### 5.5 Tarjeta de práctica · generando

Botón: spinner + **Preparando…**. Debajo aparece la caja de avance
(`components/AvanceGeneracion.tsx`):

> **PREPARANDO TU BLOQUE**
>
> **{texto de la etapa}**                          {progreso}%
> `▓▓▓▓▓▓▓░░░░░░`
>
> Son diez ejercicios, así que tarda un poco. Puedes quedarte aquí mientras.

Las cinco etapas (`lib/generacion.ts:127`), en el orden real:

| Etapa | Texto |
|---|---|
| `preparando` | Repasando tus clases y tu perfil… |
| `escribiendo` | Escribiendo tus diez ejercicios… |
| `revisando` | Revisando que todo esté bien… |
| `guardando` | Guardando tu bloque… |
| `banco` | Preparando un bloque de práctica… *(cuando cae al banco de reserva)* |

Pasados **52 segundos**, la línea de abajo cambia a:

> Se está haciendo de rogar, pero seguimos en ello.

La barra nunca pasa del **95%** hasta tener el bloque en la mano.

### 5.6 Tarjeta de práctica · error

Caja ámbar debajo de la tarjeta.

**Fallo de verdad:**

> **Esta vez no ha salido.**
>
> {mensaje}
>
> [ **Volver a intentarlo** ]

**Todavía no toca** (pestaña vieja, `409`): mismo formato, sin botón de
reintentar, y con otro titular:

> **Por ahora, ya está**
>
> Ya has practicado lo de tu última clase. En cuanto tengas la siguiente,
> preparamos el próximo bloque.

Los `{mensaje}` posibles, todos ellos texto que el alumno lee:

| Origen | Texto |
|---|---|
| Genérico (`components/usarGenerador.ts:28`) | A veces la conexión se hace la remolona. Vuelve a darle y lo preparamos. |
| Se pasó de 70 s sin respuesta | La preparación ha tardado más de lo que podemos esperar. Vuelve a darle y lo intentamos otra vez. |
| El flujo se cortó a medias | La preparación se ha cortado antes de terminar. |
| Respuesta con forma rara | El bloque recibido no tiene la forma esperada |
| Se rompió generando | No hemos podido preparar el bloque. Inténtalo otra vez. |
| Sesión caducada (401) | Tu sesión ha caducado. Vuelve a entrar desde el enlace de tu email. |
| No se pudo comprobar la sesión | No hemos podido comprobar tu sesión. Vuelve a intentarlo en un momento. |
| Gestión no responde | No hemos podido leer tu ficha ahora mismo. Vuelve a intentarlo en un momento. |
| Sin ficha | No encontramos a ese alumno. |
| Sin material suficiente | Todavía no sabemos lo suficiente de ti para prepararte un bloque. |
| Ficha ajena | Esa ficha no es la tuya. |
| Cuerpo inválido | El cuerpo de la petición no es JSON. |

> Las tres últimas y «El cuerpo de la petición no es JSON» **no deberían verse
> nunca** desde la interfaz: llegan por manipulación de la petición. Están
> escritas en tono de sistema, no de alumno.

### 5.7 El bloque preparado

`components/BloquesGenerados.tsx`. A lo ancho, bajo la rejilla. **Solo se
enseña uno**: el más reciente que no haya terminado. Al terminarlo desaparece.

**Con bloque pendiente:**

> **Tu bloque preparado** — Lo tienes aquí hasta que lo termines.
>
> ---
> GRAMÁTICA · 5 MIN   `[Nuevo]`
> **{título del bloque}**
> {intro del bloque}
> `Reconocer` → `Transformar` → `Producir`
> [ **Empezar** ]
> y {n} más en [Para ti]

El chip `Nuevo` solo lo llevan los generados **en esta misma visita**.

**Sin bloque pendiente** — hueco discontinuo con una estrella, cuatro
combinaciones (`components/BloquesGenerados.tsx:262`):

| Situación | Titular | Cuerpo |
|---|---|---|
| Nunca generó ninguno, y puede | **Todavía no has preparado ninguno** | Pulsa «Preparar mi bloque» y en menos de un minuto tienes diez ejercicios hechos con tu última clase, con lo que se te repite y con tu examen. Aparecerán aquí. |
| Nunca generó ninguno, y no puede | **Todavía no has preparado ninguno** | En cuanto tu profesor analice tu primera clase, preparamos aquí tu primer bloque de diez ejercicios. |
| Los ha hecho todos, y puede | **Los has hecho todos** | Prepara otro cuando quieras: sale de tu última clase, de lo que se te repite y de tu examen. |
| Los ha hecho todos, y no puede | **Los has hecho todos** | En cuanto tengas tu próxima clase, aquí aparece el siguiente. |

Si ya tiene bloques hechos, se añade:

> Puedes repetir cualquiera desde [Para ti].

Cuando el botón sí se puede pulsar, una flecha dibujada apunta a la tarjeta de
arriba con el rótulo:

> **Está ahí arriba**

### 5.8 Inicio · generando

En el sitio del bloque aparece un **esqueleto animado** con las medidas exactas
de la tarjeta real, para que no salte nada al llegar. Sin texto.

---

## 5.9 El inicio, por estados del alumno

| Estado del alumno | Franja del curso | Diploma (en la franja) | Fila del hito | Tarjeta de práctica | Bloque preparado |
|---|---|---|---|---|---|
| **Sin perfil en Gestión** | Tarjeta «Tu plan todavía no tiene un curso asociado…» | No se pinta | No se pinta | No se pinta (sin fuentes) | «Todavía no has preparado ninguno» + «En cuanto tu profesor analice tu primera clase…» |
| **Sin curso asignado** | Ídem | No se pinta | No se pinta | Normal, si tiene alguna fuente | Normal |
| **Curso sin lecciones cargadas** | Franja sin columna derecha | No se pinta | No se pinta | Normal | Normal |
| **Sin clase analizada** | Normal | Normal | Normal | Normal (fuentes: perfil y/o examen) | Según haya generado o no |
| **Con todo** | Normal | Normal | Normal | Normal | Normal |

Cuando la tarjeta de práctica no se pinta, la franja del curso pasa a ancho
completo y la columna derecha desaparece (`components/PanelAlumno.tsx:133`).

---

# 6 · `/curso/{slug}` — Temario

`app/curso/[slug]/page.tsx` · `components/curso/Temario.tsx`

Paleta propia (fondo claro `temario-*`), pero la misma cabecera y la misma
franja que el resto.

### 6.1 Cabecera de la pantalla

> ← Volver a la lección  *(o «← Volver al inicio» si aún no ha empezado)*
>
> CURSO COMPLETO
> **{título del curso}**
>
> {n} módulos · {n} lecciones · {n} semanas

### 6.2 Panel del plan (franja)

`components/curso/PanelPlan.tsx`

> · TU PLAN DE {n} MESES
>
> **Mes {m} · Semana {s} · Módulo {mo}**
> {título del módulo actual}
>
> [ **Continuar** ]   {completadas} de {total} lecciones en este módulo
>
> — columna derecha —
> **{porcentaje}** %
> llevas {completadas} de {total} lecciones
> *(rejilla de puntos, una casilla por lección, agrupada por mes:*
> *«Mes 1  74%» + puntos + «{n} módulos», pulsable)*

Titular en los otros dos casos:

- Curso terminado: **Has terminado el curso** (sin botón)
- Curso sin contenido: **Todavía sin contenido** (sin botón)

Cada celda de mes, para lector de pantalla:
«{completadas} de {total} lecciones hechas. Ir al mes {n}.»

### 6.3 Barra de sección

> **PROGRAMA MES A MES**        [ Expandir todo ] [ Contraer todo ]

Los dos botones solo en escritorio.

### 6.4 Un mes (cabecera desplegable)

> `①`  MES 1 · Semanas 1 – 4
> **{título del mes}**
> 8 módulos · 32 lecciones
> `▓▓▓░░░`  12 de 32 lecciones     ▼

- El círculo lleva `✓` cuando el mes está completo.
- Arranca con **un solo mes abierto**, el del módulo actual.
- Si el mes entero está aún por abrir y no está completado, se añade la línea de
  espera del drip (§6.6).

### 6.5 Una semana y sus módulos

> SEMANA 3 ————————————— 2 módulos · 8 lecciones

Cada módulo (`components/curso/FilaModulo.tsx`):

| Estado | Marca | Derecha |
|---|---|---|
| Hecho | `✓` verde | `›` |
| Actual | punto ámbar | **Continuar →** |
| Pendiente | círculo hueco | `›` |
| Bloqueado por drip | círculo hueco discontinuo, fila apagada | «Disponible en {n} días» |

Texto de la fila:

> MÓDULO {n}
> **{título del módulo}**
> {n} lecciones · {n} hechas

- En un módulo bloqueado **no se pintan** las lecciones hechas: solo el título y
  cuándo se abre.
- Un módulo sin lecciones no es enlace: se pinta apagado y no lleva a ninguna
  parte.
- Nombre accesible del enlace: «Repasar / Continuar / Empezar el módulo {n}».

### 6.6 Contenido bloqueado por el drip

`lib/drip.ts:77`. Dos textos y nada más:

> **Disponible mañana**   *(cuando queda 1 día o menos)*
> **Disponible en {n} días**

Reglas que sostienen ese texto (`lib/drip.ts:9`):

1. Lo completado nunca se vuelve a cerrar.
2. Sin fecha de matrícula o sin dato de drip, **se abre**.
3. Lo bloqueado **se ve**: título, sitio y cuándo llega.

Si alguien llega a la URL de una lección bloqueada (enlace viejo, botón atrás),
se le devuelve al temario **sin aviso** (`app/curso/[slug]/[leccion]/page.tsx:80`).

> **Hueco conocido.** Ese rebote es mudo. La explicación de por qué está
> bloqueado solo existe en la FAQ («¿Por qué no puedo abrir esta lección?») y en
> la fila del temario.

### 6.7 Curso sin contenido cargado

> Este curso todavía no tiene contenido cargado.

---

# 7 · `/curso/{slug}/{leccion}` — Lección

`components/leccion/VistaLeccion.tsx`

Tres columnas en escritorio: lateral de lecciones (300px) · texto (680px) ·
índice de la lección (220px). En móvil, una sola columna con una barra propia
arriba y el lateral en un panel.

### 7.1 Carga

`app/curso/[slug]/[leccion]/loading.tsx`. Esqueleto gris con las medidas
exactas de la lección: lateral, kicker, título en dos líneas, párrafos y la
barra de acciones ya dibujada. Sin animación de pulso.
Para lector de pantalla: «Cargando la lección…»

### 7.2 Teoría

> LECCIÓN {n} DE {total}
>
> **{título de la lección}**
>
> *(vídeo de YouTube incrustado, si lo hay — `title` = el título de la lección)*
>
> *(el HTML de la lección)*

### 7.3 Lección vacía

Cuando no hay ni teoría, ni vídeo, ni ejercicios:

> Esta lección todavía no tiene contenido. Puedes seguir con la siguiente.

### 7.4 Aviso al equipo

Solo con rol `admin`, arriba del todo:

> ● **Estás viendo el curso como equipo.** Nada de lo que marques aquí guarda
> progreso.

### 7.5 Franja de ejercicios

Al final de la teoría, si la lección tiene ejercicios:

> · EJERCICIOS
>
> **{n} ejercicios para fijar lo de arriba**
> *(con uno solo: «Un ejercicio para fijar lo de arriba»)*
>
> De uno en uno. Se corrigen al momento.
>
> [ **Empezar** ]

Nombre accesible: «Empezar los ejercicios de esta lección».

### 7.6 Barra de acciones (pegada abajo)

Flecha de volver + un solo botón verde:

| Situación | Móvil | Escritorio |
|---|---|---|
| Sin completar, lección intermedia | Completada y continuar | Marcar como completada y continuar |
| Sin completar, última del módulo | Completada y continuar | Marcar el módulo como completado |
| Ya completada | Continuar | Continuar |

Flecha: `←` en móvil, **← Anterior** en escritorio. En la primera lección del
curso el hueco se conserva vacío para que el botón no salte de sitio.

### 7.7 Lateral de lecciones (escritorio)

> {Semana 3 · Módulo 12}
> **{título del módulo}**
> `▓▓▓░░`  4 de 9
>
> ○ {título de la lección}
> ● {título de la lección}   ← la actual, con acento verde
> ✓ {título de la lección}
>   · ejercicios              ← solo en las lecciones de solo ejercicios
>
> [ Ver el curso completo → ]
> {completadas} de {total} lecciones del curso

Durante los ejercicios el lateral se repliega a un carril de 72px: solo los
puntos, una barra vertical con «{hechas}/{total}» y un botón `←` con nombre
accesible «Volver a la lección».

### 7.8 Panel de lecciones (móvil)

Barra propia de la lección, encima del contenido:

> Lección {n} de {total}  `▓▓▓░░`        [ Lecciones ]

Durante los ejercicios, el rótulo de la izquierda pasa a **Ejercicios** y el
botón a **Cerrar**. Al abrirlo sube una hoja con la misma cabecera de módulo, la
lista completa y, al pie, **Ver el curso completo →**.
El fondo oscuro tiene por nombre «Cerrar el panel de lecciones».

### 7.9 Índice de la lección (columna derecha)

Solo si la lección tiene **dos títulos o más**.

> **EN ESTA LECCIÓN**
> {título 1}
> {título 2}   ← resaltado según se baja
> …

---

# 8 · Los ejercicios de la lección

`components/ejercicios/VisorEjercicios.tsx` — el **mismo visor** que el bloque
de práctica. Un ejercicio por pantalla.

### 8.1 Barra de progreso

> Ejercicio {n} de {total}   `▓▓▓░░░`                        Salir

Los segmentos: tinta el actual, verde los acertados, ámbar los fallados, gris
los que faltan.

### 8.2 Las cuatro formas de ejercicio

**Opciones** (una correcta) — el enunciado como titular, las opciones con letra
A, B, C… Se responde pulsando; se puede responder con las teclas 1–8.

**Opciones (varias correctas)** — se añade:

> Puede haber más de una correcta.

y hay que confirmar con el botón **Comprobar**.

**Huecos** — el texto con campos intercalados. Cada hueco se corrige al salir de
él. Debajo:

> Escribe y sal del hueco para corregirlo. {tres} huecos.

**Escritura** — un `textarea` con placeholder **«Escribe tu versión…»**, botón
**Comprobar**, y una pista opcional plegada:

> ▸ Ver pista
> {texto de la pista}

**Libre (producir)** — ver §9.3.

Cuando el ejercicio trae una frase de apoyo (la que hay que reescribir, o el
contexto de la consigna), va destacada en una tarjeta blanca bajo el enunciado.

### 8.3 Correcciones

| Caso | Texto |
|---|---|
| Opciones, acertado | ✓ Eso es. |
| Opciones, fallado | — No era esa. La correcta es la {A: {opción}} |
| Escritura, acertado | ✓ Eso es. |
| Escritura, fallado | — Casi. Una versión correcta: {respuesta} |
| Un hueco, acertado | ✓ El hueco, correcto. |
| Varios huecos, acertados | ✓ Los {tres} huecos, correctos. |
| Un hueco, fallado | — Casi. La respuesta era {x}. |
| Varios huecos, fallados | — Casi. Las respuestas eran {a}, {b} y {c}. |

Debajo, si el ejercicio trae explicación, va en una caja gris. **1.492
ejercicios del curso la traen vacía**, y entonces no se reserva sitio.

### 8.4 Botón de avanzar

| Situación | Texto del botón |
|---|---|
| Sin responder, opciones | Elige una opción *(gris, inerte)* |
| Sin responder, huecos | Rellena los huecos *(gris, inerte)* |
| Sin responder, libre | Escribe tu respuesta *(gris, inerte)* |
| Sin responder, escritura | Escribe tu versión *(gris, inerte)* |
| Listo para comprobar | **Comprobar** |
| Respondido, quedan más | **Siguiente ejercicio →** |
| Respondido, el último | **Ver el resultado →** |

### 8.5 Cierre de los ejercicios de una lección

`components/leccion/FlujoEjercicios.tsx:76`

> EJERCICIOS TERMINADOS
>
> **Los cinco, correctos.**
> *(con uno solo: «Correcto.» · si falla alguno: «Acertaste 3 de 5.»)*
>
> Has terminado los ejercicios de esta lección. Puedes seguir con la siguiente
> cuando quieras.

Si no acertó todos, el cuerpo cambia a:

> Lo que se te ha quedado a medias vuelve a aparecer en tu práctica. {profesor}
> lo verá antes de vuestra próxima clase.

*(la segunda frase solo si hay profesor en la ficha)*

Debajo, la lista de los ejercicios con `✓` o `—` y un enlace **Ver** en cada uno,
y luego:

> [ Repetir los ejercicios ]   [ **Completar y seguir** ]
>
> ← Volver a la teoría de la lección

---

# 9 · `/alumno/{id}/{bloqueId}` — Bloque de práctica

`components/Practica.tsx` sobre el mismo visor. Diez ejercicios repartidos en
tres fases.

### 9.1 Lateral de fases

`components/ejercicios/LateralFases.tsx`. No navega: informa.

> **TU PRÁCTICA**
> **{título del bloque}**
> `▓▓▓░░`  4 de 10
>
> FASE 1 · RECONOCER
>   ✓ Elige la forma
>   ✓ Elige la forma
>   ③ Elige la forma      ← el actual
>   ④ Elige la forma
> FASE 2 · TRANSFORMAR
>   ⑤ Reescribe …
> FASE 3 · PRODUCIR
>   ⑨ Escribe tú …
>
> ---
> `{A}` {profesor} verá tu respuesta antes de la clase.

El pie solo aparece si hay profesor en la ficha.

### 9.2 Encima de cada ejercicio

> FASE 2 · TRANSFORMAR
>
> **{enunciado}**

Y al pie del ejercicio, cuando el bloque salió de una clase concreta y **no** es
fase de producir:

> Lo viste con {profesor} el {fecha}.

### 9.3 Fase 3 · Producir

No se corrige sola.

> **{consigna}**
>
> *(textarea, placeholder «Escribe aquí…»)*
>
> [ **Comparar con el modelo** ]  *(apagado hasta escribir algo)*

Al pulsarlo se abre:

> **Revisa tu respuesta**
>
> ☐ {criterio 1}
> ☐ {criterio 2}
> ☐ {criterio 3}
>
> UN EJEMPLO VÁLIDO
> {modelo}
>
> Tu profesor verá esta respuesta antes de la próxima clase.

Marcar todos los criterios es lo que cuenta como «acertado» en este ejercicio.

### 9.4 Cierre del bloque

`components/Practica.tsx:130`

> `( {porcentaje}% )`   *(círculo ámbar si ≥ 80%, verde claro si no)*
>
> **{título del bloque}**
>
> {cierre según el resultado}
>
> [ **Volver a mis bloques** ]

| Resultado | Texto |
|---|---|
| 100% | Bloque impecable. Esto ya lo tienes dominado. |
| 80–99% | Muy bien. Lo tienes cogido; un repaso en unos días y queda fijado. |
| 60–79% | Buen avance. Lo que se resistió hoy vuelve la semana que viene. |
| < 60% | Bloque exigente. Repítelo en un par de días y verás el salto. |

El umbral de «dominado» es **80%** (`lib/progreso.ts:18`).

### 9.5 Bloque que ya no existe

`app/alumno/[id]/[bloqueId]/page.tsx:46`

**Al alumno:**

> **Este bloque ya no está aquí**
>
> No encontramos este bloque entre los tuyos. Genera uno nuevo y seguimos donde
> lo dejaste.
>
> [ **Volver a mis bloques** ]

**Al equipo:**

> **Este bloque ya no está aquí**
>
> Los bloques que el equipo generaba antes no llegaban a guardarse, así que no
> hay nada que abrir. Genera uno nuevo desde la ficha y ese sí se puede revisar
> entero.
>
> [ **Volver a la ficha** ]

---

# 10 · `/practica` — Para ti

`app/practica/page.tsx` · `components/PanelPractica.tsx`

Orden: por dónde iba → cómo va → qué más hay.

### 10.1 Cabecera

> **Para ti**
>
> Ejercicios hechos contigo dentro: tu perfil, tus clases y lo que se te viene
> repitiendo. No es el curso, que es igual para todos: es lo tuyo.

### 10.2 Fila destacada

`components/practica/FilaDestacada.tsx`. Franja a la izquierda, tarjeta crema de
la última clase a la derecha.

**Con bloque sin terminar:**

> · SIGUE POR AQUÍ
> **{título del bloque}**
> {área} · Bloque {n} de {total}
> {intro del bloque}
>
> [ **Continuar** ]  Lo dejaste a medias
> *(o [ **Empezar** ]  Es por donde toca seguir, si no lo ha tocado)*
>
> — columna derecha —
> **{total}** bloques / preparados para ti
> *(una marca por bloque)*
> {n} ya empezados  ·  *o* «ninguno empezado todavía»

**Con todos los bloques terminados:**

> · POR HOY, HECHO
> **Has terminado tu práctica de hoy**
> Los {n} bloques, terminados
>
> Tu práctica se vuelve a generar con lo de tu siguiente clase. Mientras tanto,
> puedes repasar cualquiera de los bloques de abajo.

*(sin botón)*

**Sin ningún bloque:** la franja no se pinta y la tarjeta de la clase ocupa el
ancho entero.

### 10.3 Tarjeta de la última clase

`lib/modos.ts:324`. Tarjeta discontinua, tres redacciones:

| Situación | Titular | Cuerpo |
|---|---|---|
| Sin clase analizada | **Todavía no hay clase que repasar** | En cuanto tu profesor analice tu primera clase, preparamos aquí un bloque con lo que trabajasteis. |
| Clase nueva sin practicar | **Tienes clase nueva** | {profesor} trabajó contigo {tema} el {fecha}. Ahí abajo puedes prepararte el bloque con lo que trabajasteis. |
| Ya practicada | **Ya lo has practicado** | {profesor} trabajó contigo {tema} el {fecha}. En cuanto tengas la siguiente clase, preparamos el próximo bloque. |

Sin perfil, la frase se dice sin nombre: «Trabajaste {tema} el {fecha}.»

Encima de todo: `TU ÚLTIMA CLASE`.

### 10.4 Cómo va tu sesión

`components/practica/SesionPractica.tsx`. Cuatro casillas. **No se pinta si el
alumno no tiene ni un bloque.**

> **Cómo va tu sesión**

| Casilla | Cifra | Pie (escritorio / móvil) |
|---|---|---|
| Bloques de hoy / «De hoy» | {n} de {total} | «ninguno terminado todavía» / «sin terminar aún» — «los tienes todos hechos» — «los que ya has cerrado» / «terminados» |
| En progreso | {n} bloques | «no tienes ninguno a medias» / «ninguno a medias» — «retómalos antes de abrir otros» / «retómalos primero» |
| Bloques dominados / «Dominados» | {n} de {practicados} | «de los que has practicado» / «dominados» |
| Nivel MCER | {B1} intermedio | «todo lo de hoy va a este nivel» / «tu nivel» |

Sin haber practicado nunca, la casilla de dominados enseña `—`.

### 10.5 Tu práctica de hoy

`components/TarjetasGeneracion.tsx`

> **Tu práctica de hoy** — Diez ejercicios, hechos con lo que sabemos de ti.
>
> ---
> ● HECHO PARA TI
> **Tu bloque de práctica**
> Diez ejercicios a partir de {fuentes}.
>                                            [ **Preparar mi bloque** ]

Es la misma tarjeta del inicio (§5.3), con los mismos estados de espera, avance
y error, pero a lo ancho.

**Si ya tiene bloque pero no nos ha contado a qué se dedica**, una línea suelta
debajo:

> ¿Nos cuentas a qué te dedicas? Con eso ambientamos parte de tus ejercicios en
> tus situaciones del día a día. [Completar mi perfil]

*(la línea desaparece entera si no hay enlace de formulario)*

### 10.6 Sin ninguna fuente — la invitación al perfil

Sustituye a la tarjeta. Es **el único sitio del producto** donde se invita a
completar el perfil.

El subtítulo de la sección cambia a:

> En cuanto sepamos un poco más de ti, esto se llena de práctica hecha para ti.

**Con enlace de formulario:**

> ● EMPIEZA POR AQUÍ
>
> **Cuéntanos un poco de ti**
>
> Con saber a qué te dedicas y qué quieres conseguir con el inglés, preparamos
> ejercicios con tus situaciones de verdad en lugar de frases de libro. Lo notas
> desde el primer bloque.
>
> [ **Completar mi perfil** ]

**Sin enlace** (123 de 169 alumnos no tienen token utilizable), la tarjeta se
queda y el botón se cambia por el aviso que redacta `lib/modos.ts:87`:

| Caso | Titular | Cuerpo |
|---|---|---|
| Nunca se le mandó | **¿Nos cuentas a qué te dedicas?** | {profesor} te enviará por correo un formulario para conocerte mejor. Con eso preparamos también ejercicios con tus situaciones del día a día. |
| Se le mandó y caducó | **Busca el formulario en tu correo** | {profesor} te lo envió el {fecha}. Si no lo encuentras o el enlace ya no funciona, pídeselo otra vez. |

Sin profesor en la ficha, la frase empieza por «Tu profesor».

### 10.7 Tus bloques

> **Tus bloques** — Cada bloque va de reconocer la forma a producirla tú solo.
>                                                            {n} BLOQUES

**Sin ningún bloque** (y sin estar generando), hueco discontinuo:

> **Tu práctica se prepara después de tu primera clase**
>
> En cuanto tu profesor analice lo que trabajáis, aquí aparecen tus bloques:
> ejercicios hechos con lo tuyo, no material de catálogo.

**Con bloques** (`components/ListaBloques.tsx`), una fila cada uno:

> 01  GRAMÁTICA  `Dominado 90%`
> **{título}**
> {intro}
> `Reconocer` → `Transformar` → `Producir`
>                                              [ **Empezar** ]

Estados de la píldora:

| Estado | Píldora | Botón | Dónde sale |
|---|---|---|---|
| Generado en esta visita, sin empezar | `Nuevo` (ámbar) + borde ámbar | Empezar | Pendientes |
| Sin empezar | `Sin empezar` (gris) | Empezar | Pendientes |
| A medias | `En progreso` (verde claro) | Continuar | Pendientes |
| Cerrado con ≥80% | `Dominado {n}%` (verde) | Repasar | Desplegable |
| Cerrado por debajo del 80% | `Practicado {n}%` (arena) | Repasar | Desplegable |

Solo el primero de **lo pendiente** lleva el botón sólido. Si no queda nada
pendiente, no lo lleva ninguno.

### 10.7.1 El desplegable de lo ya hecho

Lo cerrado no se mezcla con lo que queda por hacer: se recoge detrás de una
fila discontinua, al final de la lista.

> `(2)`  Ver los que ya has hecho                                    ▼

Abierto:

> `(2)`  Ocultar los que ya has hecho                                ▲
>
> *(las mismas filas de bloque, con su número original y su botón «Repasar»)*

Con uno solo: «Ver el que ya has hecho» / «Ocultar el que ya has hecho».

Reglas:

- **Hecho = cerrado con un intento completo**, no «dominado». Es la misma regla
  que la casilla «Bloques de hoy · los que ya has cerrado» de arriba, para que
  los dos números de la pantalla no se contradigan.
- La **numeración no cambia**: un bloque que era el `03` sigue siendo el `03`
  dentro del desplegable.
- El bloque **bloqueado por la próxima clase nunca se recoge**, aunque conste
  cerrado: se enseña justamente para que se sepa que está ahí.
- Si **no hay nada hecho**, o si **está todo hecho**, no hay desplegable: la
  lista se queda plana.
- Es un `<details>` nativo: funciona sin JavaScript y se anuncia como
  desplegable en lector de pantalla.

Para lector de pantalla, antes de las fases: «Vas por la fase 2 de 3. Las tres
fases del bloque: » o «Sin empezar. Las tres fases del bloque: ».

**Último bloque bloqueado** (cuando hay más de uno), fila apagada y discontinua:

> {título en gris}
> Se desbloquea después de tu próxima clase.
>                                              [ Aún no ]  *(inerte)*

Bajo la lista, **solo mientras quede algo por cerrar**:

> Cuando termines los {n}, tu práctica se vuelve a generar con lo de tu
> siguiente clase.

Terminados todos, esa línea desaparece: lo que hay que decir entonces —que la
próxima clase trae bloque nuevo— ya lo dicen la franja de arriba y la barra de
abajo.

### 10.8 Barra fija de continuar

Al pie de `/practica`, siempre a la vista (`components/Banner.tsx:99`):

> · SIGUE POR AQUÍ
> **{título del bloque en curso}**            [ **Continuar** ]

Cuando no queda ninguno sin cerrar:

> · POR HOY, HECHO
> **Has terminado tu práctica de hoy**        *(sin botón)*

No se pinta mientras se está generando.

---

# 11 · Ayuda (panel flotante)

`components/ChatAyuda.tsx` + `lib/faq.ts`. Botón verde abajo a la derecha en las
tres pantallas del alumno. **No hay modelo detrás**: busca sobre 35 preguntas
escritas a mano.

### 11.1 Lanzador y marco

Botón: **Ayuda** (o **Cerrar** con el panel abierto).
A menos de 640px el panel ocupa la pantalla entera.

> `?` **Ayuda**
>     Respuestas a lo que más se pregunta                        ✕
>
> *(campo)* Escribe tu duda…                                    🔍
>
> …conversación…
>
> ---
> ¿Prefieres hablar con soporte?

### 11.2 Saludo y categorías

> ¡Hola! Soy la ayuda de DRC Academy. ¿Sobre qué necesitas una mano?

Botones: **Acceso** · **El curso** · **Tu práctica** · **Progreso** ·
**Problemas técnicos** · **Clases y pagos**

Al elegir una:

> Esto es lo que más se pregunta sobre {categoría en minúsculas}:

### 11.3 Respuesta y valoración

Tras cada respuesta:

> ¿Te ha servido?   [ Sí ]  [ No ]

- **Sí** → el alumno «dice» «Sí, gracias» y el bot responde:
  «¡Genial! ¿Te ayudo con algo más?» + las categorías otra vez.
- **No** → el alumno «dice» «No del todo» y el bot responde:
  «Vaya, siento no haberlo resuelto. Escríbenos y te contestamos nosotros.»
  + botón **Escribir por WhatsApp**.

Ya valorada, la pregunta deja registro: «Marcaste que te ha servido.» /
«Marcaste que no te ha servido.»

### 11.4 Búsqueda

- Un resultado: «Creo que va por aquí:»
- Varios: «Puede que sea alguna de estas:»
- **Ninguno**: «Esto no lo tengo escrito. Te paso con soporte, que sí sabrá.»
  + botón de WhatsApp.

### 11.5 Soporte directo

Desde el pie («¿Prefieres hablar con soporte?»):

> Claro. Te abrimos WhatsApp con tu nombre y la pantalla desde la que escribes.

El mensaje de WhatsApp va prerrellenado (`lib/faq.ts:517`):

> Hola, soy {nombre}. Escribo desde {mi inicio | mi práctica | una lección del
> curso | el temario del curso | la plataforma}. Mi duda: «{lo que buscó}».

Sin nombre en la ficha: «Hola, soy un alumno.»
Número: `+353 89 940 9220`.

### 11.6 Respuesta retirada

Si una pregunta desapareciera del FAQ:

> Esta respuesta ya no está disponible.

---

## 11.7 Las 35 preguntas, con su respuesta

### Acceso

**¿Cómo entro a la plataforma de práctica?**
Desde tu cuenta en la web, con el botón que verás en «Mi cuenta». También puedes
pedir un enlace de acceso por email desde la propia plataforma.

**No me llega el enlace de acceso.**
Revisa la carpeta de spam o promociones de tu correo. Si sigue sin aparecer,
escríbenos por WhatsApp y lo miramos.

**El enlace dice que ya no es válido.**
Los enlaces caducan a los 15 minutos por seguridad. Pide uno nuevo desde la
pantalla de acceso y úsalo enseguida.

**¿Necesito una contraseña?**
No. Entras con un enlace y la sesión te dura un mes, así que no tendrás que
repetirlo cada vez.

**Entré desde el ordenador. ¿Tengo que volver a entrar en el móvil?**
Sí, una vez en cada dispositivo. Después queda abierto durante un mes.

**Pongo mi email y no pasa nada.**
Por seguridad siempre mostramos el mismo mensaje, exista o no el correo.
Comprueba que sea el mismo email con el que estás dado de alta en la academia.
Si no estás seguro, escríbenos.

**¿Qué tengo que hacer después de registrarme?**
Completar tu formulario de bienvenida y la prueba de nivel. Es rápido y nos
permite conocer tu nivel y tus objetivos para asignarte el profesor que mejor
encaje contigo. Hasta que no lo completes, no podemos asignarte clases.

**¿Para qué sirve la prueba de nivel?**
Para ubicarte en el nivel correcto y que tus clases sean provechosas desde el
primer día, ni demasiado fáciles ni demasiado difíciles.

**Empecé el formulario pero no lo terminé. ¿Puedo retomarlo?**
Sí. Usa el mismo enlace que te enviamos por email. Si no lo encuentras, revisa
spam o escríbenos.

### El curso

**¿Qué curso me corresponde?**
El curso general de tu nivel. Si estás preparando un examen (FCE, CAE, PET),
tienes además el curso específico de ese examen.

**¿Por qué no puedo abrir esta lección?**
El curso se libera semana a semana a lo largo de seis meses. Es el ritmo con el
que está diseñado: da tiempo a que cada bloque asiente antes de pasar al
siguiente.

**Dice «disponible en X días». ¿Desde cuándo se cuenta?**
Desde que empezaste con la academia, no desde que entraste por primera vez a la
plataforma.

**Ya había hecho esta lección y ahora aparece bloqueada.**
No debería pasar: todo lo que hayas completado sigue abierto siempre. Si te
ocurre, avísanos con el nombre de la lección.

**¿Puedo adelantar el curso si tengo tiempo?**
El ritmo está pensado para que el aprendizaje se consolide. Si tienes un examen
cerca o una situación concreta, coméntaselo a tu profesor.

**¿Cuánto dura el curso?**
Seis meses de contenido, repartido en 23 semanas.

**Hice contenido en la plataforma anterior. ¿Se ha perdido?**
No. Tu progreso se conservó y lo verás reflejado al entrar.

### Tu práctica

**¿Qué es «tu práctica» y en qué se diferencia del curso?**
El curso es el mismo para todos los alumnos de tu nivel. La práctica se genera
solo para ti, a partir de lo que trabajaste en tu última clase, de lo que se te
viene repitiendo en las anteriores y de lo que nos hayas contado sobre ti.

**¿De dónde salen estos ejercicios?**
De cuatro sitios a la vez: lo que trabajaste en tu última clase, lo que se te
repite en las anteriores, a qué te dedicas si nos lo has contado, y el formato de
tu examen si preparas uno. Todo eso va en el mismo bloque.

**¿Por qué no puedo generar otro bloque hoy?**
Porque hasta tu próxima clase no hay material nuevo del que partir, y otro bloque
con lo mismo sería el que ya tienes con otras palabras. En cuanto tengas la
siguiente, preparamos otro.

**¿Por qué mis ejercicios no hablan de mi trabajo?**
Porque todavía no sabemos a qué te dedicas. Completa tu perfil —a qué te dedicas
y qué quieres conseguir con el inglés— y parte de los ejercicios de tu próximo
bloque estarán ambientados en tus situaciones reales.

**¿Cuánto dura cada bloque de práctica?**
Unos diez minutos. Son diez ejercicios que van de reconocer la forma correcta a
producirla tú: cuatro de reconocer, cuatro de transformar y dos de escribir.

**Creo que este ejercicio está mal.**
Puedes marcarlo desde el propio ejercicio y lo revisamos.

> **Contradicción a resolver.** No existe ninguna forma de marcar un ejercicio
> como incorrecto en la interfaz. La respuesta manda a una función que no está
> construida.

**¿Mi profesor ve lo que hago en la práctica?**
Lo que escribes en la última parte de cada bloque está pensado para que tu
profesor lo tenga en cuenta.

### Progreso

**¿Se guarda mi progreso si cambio de dispositivo?**
Sí. Tu progreso está asociado a tu cuenta, no al navegador.

**Completé una lección y no aparece marcada.**
Recarga la página. Si sigue sin aparecer, avísanos con el nombre de la lección.

### Problemas técnicos

**El audio de la lección no suena.**
Prueba a recargar la página y comprueba el volumen del reproductor. Si sigue sin
funcionar, escríbenos indicando en qué lección estás.

**El vídeo no carga.**
Suele ser un bloqueador de anuncios o una extensión del navegador. Prueba a
desactivarlo para esta página o abrirla en otro navegador.

**La página se queda cargando.**
Recarga. Si el problema continúa, dinos desde qué dispositivo y navegador entras.

### Clases y pagos

**¿Cómo son las clases?**
Clases de inglés online, en directo, uno a uno con tu profesor por videollamada.

**¿Cómo entro a mi clase?**
A la hora de tu clase, con el enlace de videollamada que te haya facilitado tu
profesor.

**¿Puedo decirle a mi profesor en qué quiero enfocarme?**
Sí, y es muy recomendable. Cuéntale tu objetivo —trabajo, examen, conversación—
y adaptará las clases.

**No me funciona la videollamada.**
Comprueba tu conexión y prueba a recargar el enlace. Si sigue sin funcionar,
escríbenos enseguida para no perder la clase.

**¿Puedo cambiar de horario o de profesor?**
Escríbenos y vemos las opciones disponibles según la disponibilidad de horarios.

**Mi suscripción aparece «en espera». ¿Qué significa?**
Suele deberse a un pago pendiente. Mientras esté en espera no podrás tomar
clases. Revisa tu método de pago o escríbenos para regularizarlo.

**¿Qué pasa si cancelo mi suscripción?**
Puedes seguir dando tus clases hasta que termine el periodo que ya has pagado.

---

# 12 · Los estados que se olvidan, en una tabla

### 12.1 Vacíos

| Dónde | Qué se lee | Ficha |
|---|---|---|
| Inicio · sin curso | Tu plan todavía no tiene un curso asociado. Coméntaselo a tu profesor y lo activamos. Mientras tanto, tu práctica de abajo funciona con normalidad. | §5.1 |
| Inicio · sin bloque preparado | Todavía no has preparado ninguno / Los has hecho todos (4 cuerpos) | §5.7 |
| Para ti · sin bloques | Tu práctica se prepara después de tu primera clase | §10.7 |
| Para ti · sin fuentes | Cuéntanos un poco de ti / los dos avisos del formulario | §10.6 |
| Para ti · sin clase | Todavía no hay clase que repasar | §10.3 |
| Temario · curso sin contenido | Este curso todavía no tiene contenido cargado. | §6.7 |
| Lección vacía | Esta lección todavía no tiene contenido. Puedes seguir con la siguiente. | §7.3 |
| Bloque inexistente | Este bloque ya no está aquí | §9.5 |
| Sesión sin bloques dominados | La casilla enseña `—` | §10.4 |

### 12.2 Errores

| Dónde | Qué se lee |
|---|---|
| Acceso · email mal escrito | Ese email no parece completo. Revísalo y vuelve a probar. |
| Acceso · fallo de envío | No hemos podido enviar el enlace. Inténtalo otra vez en un momento. |
| Acceso · enlace caducado | Ese enlace ya no es válido. Pide uno nuevo. |
| Acceso · sin ficha | Ese enlace es correcto, pero no encontramos tu ficha. Escribe a tu profesor y lo miramos. |
| Acceso · no se abrió la sesión | No hemos podido abrir tu sesión. Vuelve a intentarlo en un momento. |
| Generación · genérico | Esta vez no ha salido. + A veces la conexión se hace la remolona. Vuelve a darle y lo preparamos. |
| Generación · el resto | Ver la tabla completa en §5.6 |
| Guardado de progreso | **Nada.** Se pierde en silencio y queda en consola (`components/Practica.tsx:69`) |
| Registro de un intento del curso | **Nada.** Ídem (`components/leccion/FlujoEjercicios.tsx:38`) |
| Migración del progreso local | **Nada.** Se reintenta sola en la siguiente visita (`components/PanelAlumno.tsx:123`) |
| Página inexistente | 404 por defecto de Next, en inglés |

### 12.3 Carga

| Dónde | Qué se ve |
|---|---|
| Cabecera del curso | Esqueleto con logotipo real + «Cargando el curso…» (solo lector de pantalla) |
| Lección | Esqueleto a medida, sin pulso + «Cargando la lección…» |
| Bloque generándose (inicio) | Esqueleto de la tarjeta, sin texto |
| Bloque generándose (Para ti) | Esqueleto de fila, en cabeza de la lista |
| Generación en marcha | Caja de avance con etapa, porcentaje y barra (§5.5) |
| Enviando el email de acceso | Botón «Enviando…» |

### 12.4 Límite alcanzado

No es un cupo: **hace falta una clase nueva analizada**. Se avisa **antes** de
pulsar, con el botón ya apagado y la razón encima (§5.4). Textos:

- Botón: «Después de tu próxima clase» / «Después de tu primera clase»
- Nota: «Ya has practicado lo de tu última clase. En cuanto tengas la siguiente
  con {profesor}, preparamos el próximo bloque.» /
  «Ya tienes tu bloque con lo que sabemos de ti. En cuanto {profesor} analice tu
  primera clase, preparamos el siguiente con lo que trabajéis.»
- Si se fuerza desde una pestaña vieja: caja «Por ahora, ya está», sin botón de
  reintentar, con el texto de `mensajeDeEspera()`.

### 12.5 Contenido bloqueado por el drip

- En el temario, módulo a módulo: «Disponible mañana» / «Disponible en {n} días»
- El módulo bloqueado **se ve** con su título y su sitio, apagado y sin
  contador de lecciones hechas.
- Un mes entero por abrir lo dice en su cabecera, sin necesidad de desplegarlo.
- La URL directa a una lección bloqueada rebota al temario **sin mensaje**.

### 12.6 Sesión caducada

- Navegación normal: redirección muda a `/acceso`.
- Llamada a la API: «Tu sesión ha caducado. Vuelve a entrar desde el enlace de tu
  email.», que sí se pinta en la caja de error de la generación.
- Cierre voluntario: «Has cerrado sesión. Pide un enlace cuando quieras volver.»
- Duración: **30 días** de sesión, **15 minutos** de enlace.

---

# 13 · Lo que este inventario deja al descubierto

Por orden de lo que más se nota en pantalla:

1. **La sesión que caduca no se explica.** Redirección muda a la pantalla de
   entrar. Falta un `?motivo=` para ese caso.
2. **No hay 404 propio.** Un enlace viejo a una lección retirada saca la página
   por defecto de Next, en inglés.
3. **El rebote del drip es mudo.** Quien llega por URL a una lección bloqueada
   vuelve al temario sin saber por qué.
4. **La FAQ promete algo que no existe:** «Puedes marcarlo desde el propio
   ejercicio y lo revisamos» — no hay tal control.
5. **El diploma sigue sin poder descargarse.** El texto de «conseguido» es
   provisional a propósito y no promete archivo ni fecha, pero es la única
   pantalla del producto que reconoce el logro. Las cuatro piezas que faltan
   están anotadas en `lib/diploma.ts`.
6. **Cuatro mensajes de error están escritos en tono de sistema**, no de alumno:
   «El cuerpo de la petición no es JSON», «Esa ficha no es la tuya», «No
   encontramos a ese alumno», «El bloque recibido no tiene la forma esperada».
7. **Los fallos de guardado son silenciosos** por decisión explícita. Conviene
   confirmarlo en la reunión: hoy un alumno puede terminar un bloque y que su
   progreso no se guarde sin enterarse.

## Resuelto desde la primera versión de este documento

- **En «Para ti», los bloques ya hechos se recogen en un desplegable**
  (§10.7.1). Con ello apareció la píldora `Practicado` para los que se cerraron
  por debajo del 80%: antes se etiquetaban «En progreso», igual que los que
  están de verdad a medias.
- **El diploma pasa a ser la cifra grande de la franja** (§5.1.1) y la fila de
  debajo cuenta el paso de esta semana (§5.2). Con eso desaparece la
  duplicación que tenía el inicio —«llevas 12 de 191» y «179 lecciones para tu
  diploma», el mismo hecho en dos renglones— y el copy motivador que estaba
  escrito y sin pintar pasa a leerse junto al botón.
