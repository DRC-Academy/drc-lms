# Mascota — pipeline Rive

`mascota/geckonoid.svg` es la **versión lineal de referencia**: define las 16 piezas base
(`<g id>`), las 17 expresiones ocultas, sus pivotes, colores y proporciones. Sirve para
maquetar y validar (`npm run mascota:check`, `mascota:previews`, `mascota:grilla`), no es
el arte final.

La **versión final** se construye con imágenes generadas por IA, recortadas en piezas que
siguen la misma división que los grupos del SVG, y animadas en Rive:

- `piezas/` — PNG con fondo transparente de cada pieza base (`cola`, `pie_izq`, `cuerpo`,
  `cabeza`, …), una por grupo del SVG y con el mismo nombre.
- `expresiones/` — PNG de cada pieza de expresión (`ojos_felices`, `boca_o`,
  `brazo_diploma`, …), alineadas sobre la pieza que reemplazan.
- El archivo `.rev`/proyecto de Rive se guarda acá; el `.riv` exportado va en
  **`public/mascota.riv`**, que es lo que carga la app.

Regla práctica: si cambia una proporción o un pivote, primero se ajusta en el SVG (y pasa
el checker), después se regenera la pieza y se reimporta en Rive.
