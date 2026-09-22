"""
Saca los ojos del render maestro de la mascota.

    npm run mascota:ojos -- --vista                 → solo la vista previa
    npm run mascota:ojos                            → escribe piezas/ojos_maestro.png
    npm run mascota:ojos -- --caja 418 90 614 178   → otra caja (x0 y0 x1 y1, en píxeles del maestro)
    npm run mascota:ojos -- --desvanecer 0          → corte a hueso, sin fundir el borde

El maestro tiene los ojos de referencia, con sus párpados verdes. Se
recorta esa región —sin la nariz ni la boca—, se le quita el fondo con
rembg, se hace trim con AIRE píxeles y se guarda como
piezas/ojos_maestro.png; si ya existía, el anterior queda como
ojos_maestro.orig.png (solo la primera vez).

NO SUSTITUYE A piezas/ojos_normal.png: esa pieza sale de su propio JPG
generado, a resolución completa (872 px de ancho contra los ~200 del
recorte del maestro, que es de 1024 px en total). El recorte del maestro
es la referencia para comparar y, si hiciera falta, el respaldo.

EL FONDO SE QUITA SOBRE EL MAESTRO ENTERO, no sobre el recorte: rembg
sabe separar un personaje de un fondo blanco, pero un rectángulo de piel
con dos ojos no es algo que reconozca, y se llevaría la piel. Con el
personaje ya aislado, el recorte solo tiene ojos, párpados y la piel de
en medio; las esquinas que quedaban fuera de la cabeza salen
transparentes solas.

La vista previa (rive/ojos_vista.png) enseña la caja dibujada sobre el
maestro y el recorte ampliado, para ajustar los márgenes antes de
escribir.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from rembg import new_session, remove

from recortar import AIRE, UMBRAL_ALFA

RIVE = Path(__file__).resolve().parents[1] / "rive"
MAESTRO = RIVE / "maestro.png"
DESTINO = RIVE.parent / "_archivo" / "piezas" / "ojos_maestro.png"
VISTA = RIVE / "ojos_vista.png"

# Los dos ojos con sus párpados, sin las fosas nasales (empiezan en y≈182),
# la boca ni las orejas (la derecha asoma desde x≈606). Medida sobre el
# maestro de 1024×559.
CAJA_POR_DEFECTO = (420, 90, 604, 178)

# EL BORDE SE DESVANECE. La pieza es un rectángulo de piel del maestro
# que va a ir encima de la cabeza de `cabeza.png`, que es otro render y
# otro verde: con el corte a hueso se vería el parche. Con el alfa
# cayendo a cero en los últimos píxeles del rectángulo, la piel del
# recorte se funde con la de debajo y solo quedan los ojos. Se aplica
# antes del trim, y no toca lo que ya era transparente.
DESVANECIDO_POR_DEFECTO = 12


def sin_fondo(maestro: Image.Image) -> Image.Image:
    salida = remove(maestro.convert("RGBA"), session=new_session("u2net"), post_process_mask=True)
    if not isinstance(salida, Image.Image):
        raise TypeError("rembg devolvió algo que no es una imagen")
    return salida


def desvanecer_bordes(region: Image.Image, ancho: int) -> Image.Image:
    """El alfa cae linealmente a cero en los `ancho` píxeles del borde del rectángulo."""
    if ancho <= 0:
        return region
    alto, largo = region.height, region.width
    y = np.arange(alto)[:, None]
    x = np.arange(largo)[None, :]
    # Distancia al borde más cercano, en píxeles, y de ahí un factor 0–1.
    distancia = np.minimum(np.minimum(x + 1, largo - x), np.minimum(y + 1, alto - y))
    factor = np.clip(distancia / (ancho + 1), 0.0, 1.0)
    alfa = np.asarray(region.getchannel("A"), dtype=np.float64) * factor
    salida = region.copy()
    salida.putalpha(Image.fromarray(np.rint(alfa).astype(np.uint8), "L"))
    return salida


def recortar_ojos(
    personaje: Image.Image, caja: tuple[int, int, int, int], desvanecido: int
) -> Image.Image:
    region = desvanecer_bordes(personaje.crop(caja), desvanecido)
    alfa = region.getchannel("A").point(lambda a: 255 if a > UMBRAL_ALFA else 0)
    limites = alfa.getbbox()
    if limites is None:
        raise ValueError("la caja no contiene nada opaco")
    pieza = region.crop(limites)
    lienzo = Image.new("RGBA", (pieza.width + 2 * AIRE, pieza.height + 2 * AIRE), (0, 0, 0, 0))
    lienzo.paste(pieza, (AIRE, AIRE))
    return lienzo


def vista_previa(maestro: Image.Image, caja: tuple[int, int, int, int], pieza: Image.Image) -> None:
    """El maestro con la caja marcada, y debajo el recorte a 3×."""
    marcado = maestro.convert("RGBA")
    dibujo = ImageDraw.Draw(marcado)
    dibujo.rectangle(caja, outline=(224, 71, 63, 255), width=3)

    escala = 3
    ampliada = pieza.resize((pieza.width * escala, pieza.height * escala), Image.Resampling.LANCZOS)

    # Fondo a cuadros bajo el recorte, para ver el alfa.
    cuadro = 12
    fondo = Image.new("RGBA", ampliada.size, (235, 235, 235, 255))
    lapiz = ImageDraw.Draw(fondo)
    for y in range(0, fondo.height, cuadro):
        for x in range(0, fondo.width, cuadro):
            if (x // cuadro + y // cuadro) % 2 == 0:
                lapiz.rectangle((x, y, x + cuadro - 1, y + cuadro - 1), fill=(205, 205, 205, 255))
    fondo.alpha_composite(ampliada)

    hoja = Image.new("RGBA", (max(marcado.width, fondo.width), marcado.height + fondo.height + 20), (255, 255, 255, 255))
    hoja.paste(marcado, (0, 0))
    hoja.paste(fondo, (0, marcado.height + 20))
    hoja.save(VISTA, "PNG")


def main() -> int:
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--caja", nargs=4, type=int, metavar=("X0", "Y0", "X1", "Y1"), default=CAJA_POR_DEFECTO)
    parser.add_argument("--desvanecer", type=int, default=DESVANECIDO_POR_DEFECTO, metavar="PX", help="ancho del borde que se funde; 0 para corte a hueso")
    parser.add_argument("--vista", action="store_true", help="solo la vista previa, sin escribir la pieza")
    args = parser.parse_args()
    caja = (args.caja[0], args.caja[1], args.caja[2], args.caja[3])

    if not MAESTRO.exists():
        print(f"✗ falta {MAESTRO.relative_to(RIVE.parent)}")
        return 1

    with Image.open(MAESTRO) as im:
        maestro = im.convert("RGBA")

    personaje = sin_fondo(maestro)
    pieza = recortar_ojos(personaje, caja, args.desvanecer)
    vista_previa(maestro, caja, pieza)
    print(f"caja {caja} · desvanecido {args.desvanecer}px → pieza de {pieza.width}×{pieza.height} (con {AIRE}px de aire)")
    print(f"vista previa en {VISTA.relative_to(RIVE.parent)}")

    if args.vista:
        return 0

    original = DESTINO.with_suffix(".orig.png")
    if DESTINO.exists() and not original.exists():
        DESTINO.rename(original)
        print(f"anterior guardado como {original.name}")
    pieza.save(DESTINO, "PNG")
    print(f"✓ escrito {DESTINO.relative_to(RIVE.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
