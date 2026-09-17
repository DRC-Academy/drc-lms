"""
Quita el fondo de las piezas de la mascota y las deja listas para Rive.

    npm run mascota:recortar            → todas las carpetas
    npm run mascota:recortar -- --solo cabeza brazo_izq
    npm run mascota:recortar -- --matting   (bordes más finos, más lento)

Para cada JPG de rive/piezas/ y rive/expresiones/ guarda un PNG con canal
alfa, mismo nombre y misma carpeta: quita el fondo con rembg (modelo
u2net, en CPU), recorta los márgenes transparentes y deja AIRE píxeles
alrededor. Los JPG no se tocan. Al final rehace rive/contacto.png: todos
los PNG sobre un fondo a cuadros, con su nombre debajo.

Corre dentro del venv de mascota/.venv; lo crea y lo llena el lanzador
(mascota/scripts/recortar.js), que es lo que llama el script npm.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from rembg import new_session, remove

RIVE = Path(__file__).resolve().parents[1] / "rive"
CARPETAS = ("piezas", "expresiones")
AIRE = 10
# Por debajo de esto el alfa es ruido del recorte, no pieza: no cuenta
# para el trim. Sin umbral, un solo píxel casi transparente en la esquina
# deja el margen entero.
UMBRAL_ALFA = 8

# ---------------------------------------------------------------
# EL RECORTE
# ---------------------------------------------------------------


def recortar(origen: Path, sesion, matting: bool) -> Image.Image:
    """El PNG con alfa de un JPG: sin fondo, recortado y con aire."""
    with Image.open(origen) as jpg:
        rgba = jpg.convert("RGBA")

    sin_fondo = remove(
        rgba,
        session=sesion,
        post_process_mask=True,
        alpha_matting=matting,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=8,
    )
    if not isinstance(sin_fondo, Image.Image):
        raise TypeError("rembg devolvió algo que no es una imagen")

    alfa = sin_fondo.getchannel("A").point(lambda a: 255 if a > UMBRAL_ALFA else 0)
    caja = alfa.getbbox()
    if caja is None:
        raise ValueError(f"{origen.name}: no quedó nada tras quitar el fondo")

    pieza = sin_fondo.crop(caja)
    lienzo = Image.new("RGBA", (pieza.width + 2 * AIRE, pieza.height + 2 * AIRE), (0, 0, 0, 0))
    lienzo.paste(pieza, (AIRE, AIRE))
    return lienzo


# ---------------------------------------------------------------
# LA HOJA DE CONTACTO
# ---------------------------------------------------------------

CELDA = 260
ROTULO = 34
MARGEN = 14
COLUMNAS = 5
CUADRO = 12


def a_cuadros(ancho: int, alto: int) -> Image.Image:
    """El fondo gris a cuadros que deja ver la transparencia."""
    fondo = Image.new("RGBA", (ancho, alto), (235, 235, 235, 255))
    dibujo = ImageDraw.Draw(fondo)
    for y in range(0, alto, CUADRO):
        for x in range(0, ancho, CUADRO):
            if (x // CUADRO + y // CUADRO) % 2 == 0:
                dibujo.rectangle((x, y, x + CUADRO - 1, y + CUADRO - 1), fill=(205, 205, 205, 255))
    return fondo


def fuente(tamano: int) -> ImageFont.ImageFont | ImageFont.FreeTypeFont:
    for nombre in ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(nombre, tamano)
        except OSError:
            continue
    return ImageFont.load_default()


def hoja_de_contacto(pngs: list[Path], destino: Path) -> None:
    filas = max(1, (len(pngs) + COLUMNAS - 1) // COLUMNAS)
    ancho_celda = CELDA + 2 * MARGEN
    alto_celda = CELDA + ROTULO + MARGEN
    hoja = Image.new("RGBA", (COLUMNAS * ancho_celda, filas * alto_celda), (255, 255, 255, 255))
    dibujo = ImageDraw.Draw(hoja)
    letra = fuente(15)

    for i, png in enumerate(pngs):
        x0 = (i % COLUMNAS) * ancho_celda + MARGEN
        y0 = (i // COLUMNAS) * alto_celda + MARGEN
        hoja.paste(a_cuadros(CELDA, CELDA), (x0, y0))

        with Image.open(png) as im:
            pieza = im.convert("RGBA")
            pieza.thumbnail((CELDA - 2 * AIRE, CELDA - 2 * AIRE))
        hoja.alpha_composite(pieza, (x0 + (CELDA - pieza.width) // 2, y0 + (CELDA - pieza.height) // 2))

        rotulo = f"{png.parent.name}/{png.name}"
        ancho_texto = dibujo.textlength(rotulo, font=letra)
        dibujo.text((x0 + (CELDA - ancho_texto) / 2, y0 + CELDA + 9), rotulo, fill=(30, 94, 46, 255), font=letra)

    hoja.save(destino, "PNG")


# ---------------------------------------------------------------


def main() -> int:
    # La consola de Windows arranca en cp1252 y no sabe imprimir «✓» ni
    # «×»: se pide UTF-8 y, si no puede, se sustituye en vez de reventar
    # con la primera pieza ya recortada.
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--solo", nargs="*", default=None, help="nombres (sin extensión) a recortar; por defecto, todos")
    parser.add_argument("--matting", action="store_true", help="alpha matting: bordes más finos, más lento")
    parser.add_argument("--sin-contacto", action="store_true", help="no rehacer contacto.png")
    args = parser.parse_args()

    jpgs = [jpg for carpeta in CARPETAS for jpg in sorted((RIVE / carpeta).glob("*.jpg"))]
    if args.solo is not None:
        jpgs = [jpg for jpg in jpgs if jpg.stem in args.solo]
    if not jpgs:
        print("No hay JPG que recortar.")
        return 1

    print(f"{len(jpgs)} piezas · modelo u2net en CPU{' · alpha matting' if args.matting else ''}\n")
    sesion = new_session("u2net")

    for jpg in jpgs:
        destino = jpg.with_suffix(".png")
        png = recortar(jpg, sesion, args.matting)
        png.save(destino, "PNG")
        print(f"  ✓ {jpg.parent.name}/{destino.name}  {png.width}×{png.height}")

    if not args.sin_contacto:
        pngs = [png for carpeta in CARPETAS for png in sorted((RIVE / carpeta).glob("*.png"))]
        hoja_de_contacto(pngs, RIVE / "contacto.png")
        print(f"\ncontacto.png con {len(pngs)} piezas")

    return 0


if __name__ == "__main__":
    sys.exit(main())
