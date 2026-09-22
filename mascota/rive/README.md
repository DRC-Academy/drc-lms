# Las imágenes de la mascota: maestro, variantes y parches

(La carpeta se llama `rive/` por historia: aquí no hay Rive. La
arquitectura en la app está en [`../README.md`](../README.md).)

```
rive/maestro.png            el render de referencia: la mascota en reposo
rive/variantes/<n>.jpg      el mismo render con UN gesto cambiado
        │
        ├─ mascota:variantes → rive/variantes_check.png
        ├─ mascota:base      → public/mascota/{base,cuerpo,cola}.png
        ├─ mascota:parches   → public/mascota/parches/*.png
        │                      components/mascota/parches.json
        └─ mascota:optimizar → los mismos PNG, con paleta y ≤ 800 px
```

`npm run mascota:rehacer` corre los cuatro seguidos. **Es determinista**:
sin cambios en las variantes, deja `public/mascota/` y `parches.json`
idénticos byte a byte.

## Las piezas

- **El maestro** (`maestro.png`, 1024×559). Todo se mide contra él.
- **Las variantes** (`variantes/*.jpg`): ediciones del maestro, cada una
  con un gesto. Vienen a otra resolución (1407×768, la misma proporción)
  y se escalan. El nombre del archivo es el de la variante, sin eñes ni
  tildes. `mascota/scripts/comun.py` dice qué es cada una:
  - `ESTADOS`: variante → estado del componente (`racha` → `racha_perdida`).
  - `GESTOS`: variante → gesto (saludo, senala, salto, dormido, estira,
    piensa, asombro, mira_izq, mira_der, sentado).
  - `COMPLETOS`: los gestos que cambian la pose entera (salto, sentado).
  - `IGUALAR_LUZ`: las que vinieron con otra luz (asombro).

## Los pasos

### 1. `mascota:variantes` — ¿cada variante es el maestro con un gesto?

Alinea cada variante al maestro buscando el cuerpo (barriga, cadera,
piernas: `CUERPO` en `comun.py`) por template matching, y cuenta cuánto
coincide. Falla si coincide menos del 80 % del cuadro o si se corre más de
15 px, y sale con código 1: es la señal de parar y mirar. Las completas no
fallan (no pueden calzar); las de luz igualada se miden por el personaje.
Escribe `variantes_check.png`: maestro | variante alineada | diferencia.

**La luz.** A las de `IGUALAR_LUZ` se les corrige el color con una recta
por canal (ganancia y desplazamiento) ajustada sobre el cuerpo, que no
cambia entre variantes.

### 2. `mascota:base` — el lienzo, el cuerpo y la cola

Quita el fondo al maestro con rembg (`u2net`) y recorta con un 5 % de
margen: ese recorte es **el lienzo**, y todo lo que sale a `parches.json`
va normalizado (0–1) respecto a él. Separa la cola (polígono y pivote en
`comun.py`) para que oscile sola, y rellena con `inpaint` la raíz que
queda debajo. Escribe `base.png`, `cuerpo.png`, `cola.png` y las claves
`lienzo` y `cola` de `parches.json`.

### 3. `mascota:parches` — lo que cambia

Para cada variante, alinea, quita el fondo y calcula dónde difiere del
maestro (> 25 en algún canal, dentro del personaje, fuera de la cola).
Cada región conexa, limpia, ensanchada y difuminada, es un parche:
`parches/<estado>_<n>.png`. Donde la variante tiene fondo y el maestro
no (el brazo que sube), escribe además `hueco_<n>.png` (lo que se le
quita al cuerpo, como `mask-image`) y `resto_<n>.png` (eso mismo, para
desvanecerlo).

- **Completos**: `<gesto>_completo.png`, la variante entera sin fondo en
  las coordenadas del lienzo, marcada `"completo": true`.
- **Des-fringe** (`desflecar`, para salto, sentado y estira): rembg deja
  el alfa en 0/255 y un filete claro entre brazo y cabeza. Se erosiona
  el alfa 2 px, se difumina un píxel y se quita lo casi blanco con alfa
  parcial, más los huecos cerrados del color del fondo (salvo en la zona
  de los ojos, cuyo blanco es del mismo gris).
- **`--solo <nombre>`** (`npm run mascota:parches -- --solo senala`):
  rehace solo esa variante —sus PNG y sus entradas de `parches.json`, en
  su sitio— y deja lo demás intacto.

Escribe `parches_check.png`: cada estado con sus parches y el contorno de
cada uno en rojo, el hueco en azul.

### 4. `mascota:optimizar` — para servir

Paleta de 256 colores y ≤ 800 px de ancho con sharp. Deja como están los
PNG que ya tienen paleta (volver a cuantizar los cambia en cada pasada),
los que salen iguales byte a byte y las máscaras (`hueco_`, `resto_`).

## Las comprobaciones

`variantes_check.png`, `base_check.png` y `parches_check.png` no se
commitean (`.gitignore`): se rehacen. Hay que mirarlas antes de dar por
buena una variante, sobre fondo oscuro si hace falta ver filetes.

## El archivo

`mascota/_archivo/` guarda las piezas y expresiones sueltas del enfoque
anterior (renders por pieza para animarlas por separado). No las usa la
app. Ver «Lo que no está en uso» en [`../README.md`](../README.md).
