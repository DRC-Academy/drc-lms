# Geckonoid, la mascota

Una sola mascota para toda la app, hecha con imágenes y animada en código
(React + framer-motion). No hay Rive ni `.riv`: el render maestro es la
mascota, y cada gesto es un parche encima.

- **Las imágenes** salen de un pipeline en Python/Node que está en
  `mascota/scripts/` y se explica en [`rive/README.md`](rive/README.md)
  (maestro + variantes → parches).
- **La mascota en la app** vive en `components/mascota/`. Es lo que se
  describe aquí.

## La arquitectura

```
app/layout.tsx
└─ <CapaMascota>            la ÚNICA mascota: fija, a pantalla completa
   └─ <Geckonoid>           pinta cuerpo, cola y parches, y los mueve

pantallas
└─ <AnclaMascota> / useAnclaMascota    huecos en la maqueta, con prioridad
└─ useMascota()                        pedir estados y gestos

components/mascota/store.ts            el estado, uno para toda la app
```

### `CapaMascota` (components/mascota/CapaMascota.tsx)

Montada **una vez**, en el layout raíz: sobrevive a la navegación y nunca
hay dos. Es una capa `position: fixed` que no recibe el ratón salvo sobre
la propia mascota, con `z-index: 38`: encima del contenido y de la barra
fija del banner (30), debajo de la navegación inferior y de los paneles
(40 y más). No se pinta en `/avisos`.

En cada frame —**un solo** `requestAnimationFrame`— mide todas las anclas
(primero lee todos los rectángulos y después escribe un único
`transform`), elige la que manda y pone la mascota encima con su alto.
Se pinta siempre a 200 px y se escala. El scroll se sigue en el mismo
evento, sin esperar al frame.

- **Qué ancla manda**: la de más prioridad entre las visibles (al menos
  media altura dentro de la ventana; la que ya manda aguanta hasta un
  cuarto). A igualdad, la última montada.
- **Si la que manda desaparece** (se remonta, se sale de la vista),
  espera 300 ms donde estaba antes de irse; una de más prioridad se la
  lleva enseguida.
- **Sin ancla visible, a la percha**: abajo a la derecha, pequeña y
  sentada, por encima de lo que haya fijo en esa esquina
  (`[data-nav-inferior]`, `[data-barra-inferior]`, `.zona-ayuda`) y del
  safe-area. Con un cajón abierto (el panel del bloque por debajo de
  1200 px, que lleva `data-cajon-mascota`) también, y la capa sube a
  z-55 para quedar encima del velo; al cerrarlo vuelve a su ancla.
- **Al cambiar de ancla, viaja**: se agacha (90 ms), vuela en parábola con
  la pose de «salto» (500–800 ms según la distancia, estirada al subir y
  al bajar, desde los pies), se aplasta al caer y pone cara de asombro
  200 ms. El destino se mide en cada frame, así que llega aunque se
  mueva; si sale de fuera de la ventana, arranca asomando por el borde.
  Nunca dos viajes a la vez: lo que cambie en el aire espera a que
  aterrice. La primera vez entra saltando desde abajo. Con
  `prefers-reduced-motion` no viaja: se apaga y se enciende en el
  destino (130 ms). Cada viaje queda en la cola de eventos.
- **Al cerrar sesión** (el formulario de `/salir`) se despide con la mano
  y el envío espera 900 ms.
- **Al tocarla** en reposo: un gesto al azar entre saludo, salto y guiño,
  más lo que el ancla haga al tocarla (`onToque`: la ruta centra la
  parada). **Doble clic**: una vuelta entera en el aire. **Arrastrarla**
  (con ratón, desde 900 px): se queda donde se suelta, rebota, y a los
  10 s vuelve viajando a su sitio. En móvil no se arrastra.
- **La espera**: con «estudiando» de base, «piensa» cada 4 s, con los
  anteojos puestos.

Parpadeo y respiración los lleva el único `Geckonoid`; los micro-gestos
y el sueño, la capa (`vidaPropia={false}` en el Geckonoid): hay un solo
reloj.

#### La vida propia, según la intensidad

| | tranquila | normal | juguetona |
|---|---|---|---|
| Respira, parpadea, sigue el cursor | sí | sí | sí |
| Micro-gestos (mirar a un lado y a otro alternando, pensar, estirarse, inclinar la cabeza) | — | cada 8–15 s | cada 4–7,5 s, y a veces un salto en el sitio |
| Sueño: a los 90 s sin tocar nada bosteza y se sienta; a los 60 s más se duerme, con zetas | — | sí | sí |

Cualquier cosa del alumno (ratón, tecla, rueda, toque, scroll) la
despierta con asombro. **Seguir el cursor**: con ratón, los ojos
(`mira_izq`/`mira_der`, que miran hacia la izquierda y la derecha de la
pantalla) siguen al cursor por toda la pantalla, y se inclina hasta 4°
hacia él. **En móvil**, sin cursor, mientras se hace scroll mira hacia el
contenido que pasa. La mirada solo se pone si el estado tiene los ojos
libres (no con los anteojos, ni con los ojos cerrados de «éxito»). Con
`prefers-reduced-motion`, nada de esto. En el tablero, «Sueño +90 s /
+150 s» adelanta el reloj (sin mover el ratón después: la despierta).

#### Burbujas y escenas

Las **burbujas** son una línea corta junto a la mascota, que la señala
mientras tanto (`storeMascota.decir(clave)`). Los textos, en los dos
idiomas, están **todos en `lib/textos/mascota.ts`**, para editarlos sin
tocar código. Reglas (las aplica la capa): se dicen cuando está posada,
como mucho una por pantalla y ninguna repetida en la sesión. Con
`prefers-reduced-motion`, sin animación. Se anuncian al lector de
pantalla (`role="status"`).

| Cuándo | Qué hace | Burbuja |
|---|---|---|
| Primera vez en la sesión que se posa en la franja del inicio (`escena: "inicio"`) | entra saltando, saluda | «Aquí tienes por dónde seguir» |
| Lo mismo, si vuelve tras 5 días o más (localStorage) | saluda y se asombra | «¡Cuánto tiempo! Sigamos por aquí» |
| Termina una generación (`usarGenerador` → escena `bloque_listo`) | se quita los anteojos, asombro, viaja a su sitio | «Tu bloque está listo» |
| Cierre de bloque ≥ 80 % | éxito (salto con la pose, estrellas, saludo) | solo con `BUCLE_PROFESOR`: «…se lo contaré a <profesor>» |
| Cierre de bloque < 80 % | ánimo | «Buen trabajo, sigamos» (o la versión con profesor) |

`BUCLE_PROFESOR` (en el mismo archivo) está en `false`: las burbujas que
prometen contárselo al profesor no salen hasta que ese bucle exista.

**Durante el bloque** (`VistaBloque`): un acierto, ánimo; tras un fallo,
asombro y ánimo; 3 seguidos, ánimo con rebote más alto; 5 (y cada 5), un
salto en el sitio sin estrellas; un fallo, duda. Mientras se lee el
enunciado mira hacia él (`storeMascota.mirarA`, que manda sobre el
cursor): en escritorio, desde el panel, a la derecha; en móvil, desde la
percha, a la izquierda. Al tocar la respuesta vuelve a mirar al alumno.

**Los gestos de estado**: «estudiando», anteojos y «piensa» cada 4 s;
«éxito», anticipación, salto alto con la pose de «salto», estrellas,
aterriza y saluda; «ánimo», el pulgar y un rebote; «duda», «piensa»
600 ms y después la cara de duda con el signo; «nivel superado», salto
con el diploma y confeti de tres colores de marca (1,2 s). Mientras
viaja, el estado se congela y se enseña al aterrizar.

### Las anclas (components/mascota/AnclaMascota.tsx)

Un ancla es un hueco vacío del tamaño que ocupará la mascota.

```tsx
// Con el hueco hecho: `tamaño` es el alto en escritorio; en móvil va a 0,7.
<AnclaMascota id="inicio-espera" prioridad={3} tamaño={112} estado="estudiando" />

// Con un hueco propio (la ruta mueve el suyo por el camino):
const ref = useAnclaMascota("parati-ruta", { prioridad: 2, estado, quieta, activa, titulo, onToque });
<div ref={ref} style={{ width, height }} />
```

| Opción | Qué es |
|---|---|
| `prioridad` | Gana la más alta visible. |
| `estado` | El de base mientras está aquí: `idle`, `estudiando`, `nivel_superado`. |
| `quieta` | Enseñar el estado sin su gesto (el diploma ya celebrado). |
| `lado` | Hacia dónde se alinea si el hueco es más ancho que ella. |
| `activa` | `false`: declarada pero fuera de juego por ahora. |
| `titulo`, `onToque` | Tooltip y qué más pasa al tocarla aquí. |
| `escena` | `"inicio"`: la escena de llegada, la primera vez en la sesión. |

Los ids son únicos entre las anclas montadas a la vez. Las de la app:

| Pantalla | Ancla | Prioridad | Estado de base |
|---|---|---|---|
| Inicio | `inicio-clase` (FranjaClase) | 1 | diploma si el curso está terminado |
| | `inicio-curso` (BannerCurso) | 2 | diploma si el curso está terminado |
| | `inicio-espera` (TarjetaGeneracion, mientras genera) | 3 | estudiando |
| Para ti | `parati-saludo` (cabecera, solo sin curso) | 1 | idle |
| | `parati-ruta` (parada «Estás aquí») | 2 | idle, o el diploma con todo hecho |
| | `parati-espera` (bajo la ruta, mientras genera) | 3 | estudiando |
| Bloque | `bloque-panel` (cabecera del panel) | 2 | idle |
| | `bloque-cierre` (CierreEjercicios) | 3 | idle |
| `/dev/mascota` | `dev-a` … `dev-d` | 1–4 | el que elija el tablero |

La franja del inicio (`franja`) y el saludo de «Para ti» (`saludo`) salen
de `MascotaBienvenida`, que es un ancla con los tamaños de esa maqueta.

### El store (components/mascota/store.ts)

Un módulo con `useSyncExternalStore`, sin dependencias. Guarda las anclas,
la que manda (`activa`; `null` es la percha), el estado de paso
(`transitorio`, 2,5 s), el último gesto (`pose`), la **intensidad**, la
velocidad (solo para revisar) y una cola de eventos, lo último primero.

- `useMascota()` → `{ estado, disparo, dispara, gesto }`. Con
  `useMascota({ desde: "parati-ruta" })`, lo pedido solo vale si ese ancla
  es la que manda: la ruta no le cambia la cara a la mascota si está en
  la espera.
- `storeMascota.dispara("exito")` enseña un estado de paso y vuelve solo
  al de base del ancla; `dispara("idle")` lo corta.
- **La intensidad** (`tranquila` | `normal` | `juguetona`, por omisión
  `normal`) se guarda en `localStorage` (`drc:mascota-intensidad`) y se
  cambia en `/dev/mascota`. No hay pantalla de ajustes del alumno donde
  ponerla todavía. Dice cuánta vida propia tiene la mascota.
- En desarrollo, el store está en `window.__mascota` para la consola.

### Estados, gestos y micro-gestos

- **Estados** (`components/mascota/estados.ts`): `idle`, `estudiando`,
  `exito`, `duda`, `animo`, `racha_perdida`, `nivel_superado`. Los de base
  los pone el ancla; los de paso, `dispara`. `lib/gamificacion.ts` manda:
  `exito` es solo el cierre de bloque con ≥ 80 %, y la escena (salto y
  estrellas) es del diploma.
- **Gestos**: poses sueltas encima de cualquier estado, con
  `mascota.gesto("saludo")`: saludo, senala, salto, dormido, estira,
  piensa, asombro, mira_izq, mira_der, sentado y guino (este último sin
  variante propia: usa la cara de «ánimo»). Si un parche del estado pisa
  uno del gesto, el estado se aparta mientras dura, salvo «estudiando»,
  cuyos anteojos van encima. **Salto** y **sentado** son parches
  completos: sustituyen al cuerpo, la cola y los parches, con un fundido
  sumado (`plus-lighter`) para que el fondo no se transparente.
- **Micro-gestos** de reposo, cada 8–15 s: cabeza, balanceo, parpadeo
  doble y cola.

## Cómo se hace

### Añadir una variante (un estado o un gesto nuevo)

1. Pedir la variante con el maestro como referencia: mismo encuadre,
   fondo y luz, y solo el gesto cambiado. Guardarla como
   `mascota/rive/variantes/<nombre>.jpg`, sin eñes ni tildes.
2. Darla de alta en `mascota/scripts/comun.py`: en `ESTADOS` o en
   `GESTOS`. Si cambia la pose entera, en `COMPLETOS`. Si viene con otra
   luz, en `IGUALAR_LUZ`.
3. `npm run mascota:variantes` para comprobar que alinea, y después
   `npm run mascota:parches -- --solo <nombre>` y `npm run mascota:optimizar`.
   Mirar `mascota/rive/parches_check.png`.
4. En `components/mascota/estados.ts`, añadirla a `EstadoMascota` o a
   `GestoMascota` (con su `DURACION_GESTO_MS`), y en `Geckonoid.tsx` su
   movimiento (`GESTOS` o `MOVIMIENTOS`). Probarla en `/dev/mascota`.

### Añadir un ancla

1. Poner en la maqueta `<AnclaMascota id="…" prioridad={n} tamaño={alto} />`,
   o `useAnclaMascota` con un hueco propio si se mueve.
2. Elegir la prioridad contra las otras anclas de esa pantalla: la más
   alta visible gana y la mascota se va a ella.
3. Si en ese sitio hace algo distinto, pasarle `estado`. Para los estados
   de paso, `useMascota({ desde: id })`.
4. Añadirla a la tabla de arriba.

## Probar

`/dev/mascota` es el tablero: intensidad, velocidad (0,5×–2×), fondo
claro u oscuro (el del banner), cada estado y cada gesto, cuatro anclas
de prioridad 1–4 que se montan y desmontan, y el store en vivo (anclas y
eventos). Debajo hay un tramo alto para bajar hasta la percha.
`/dev/ruta` es el banco del camino de «Para ti». Los dos piden sesión:
para capturarlos sin ella, una página temporal bajo `/acceso` que los
reexporte (y borrarla después).

## Lo que no está en uso

`mascota/geckonoid.svg`, `check.js`, las `preview*.png`, `grilla.png` y
`mascota/_archivo/` (piezas y expresiones sueltas) son del enfoque
anterior: el SVG lineal para maquetar y las piezas recortadas para
animarlas por separado. Los scripts `mascota:check`, `previews`, `grilla`,
`recortar`, `igualar`, `ojos`, `layout` y `publicar` trabajan con eso y
siguen funcionando contra `_archivo/`, pero **`mascota:publicar` escribe
en `public/mascota/`**: no correrlo sin querer volver a las piezas.
