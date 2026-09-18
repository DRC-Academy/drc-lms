"""
Ubica cada pieza de la mascota sobre el render maestro y escribe el layout
que usa el componente React (components/mascota/layout.json).

    npm run mascota:layout
    npm run mascota:layout -- --ver          (además imprime la puntuación de cada ajuste)

CÓMO. Cada pieza base (rive/piezas/*.png) se busca sobre rive/maestro.png
por template matching multiescala con OpenCV, usando el alfa de la pieza
como máscara: se prueba una escala tras otra y se queda con la mejor
correlación. Las piezas son renders aparte —no recortes del maestro—, así
que el ajuste es aproximado: por eso hay regiones de búsqueda por lado
(el brazo izquierdo no se busca en el lado derecho) y un diccionario de
AJUSTES para lo que el matching no resuelve. Lo que se ajustó a mano se
dice en la salida.

Las expresiones no se buscan: toman el sitio de la pieza a la que
sustituyen (ojos sobre ojos_normal, bocas sobre boca_sonrisa, brazos
alternativos sobre brazo_der por el hombro) y los adornos se colocan
respecto a la cabeza y los ojos.

COORDENADAS. Todo sale normalizado (0–1) respecto a un lienzo cuadrado de
1024×1024 en el que el personaje ocupa el 90 % del alto, centrado. El
componente multiplica por su `size`. El pivote de cada pieza va en
fracciones de la propia pieza (0–1), listo para `transform-origin`.

Además escribe rive/layout_check.png: las piezas compuestas sobre el
maestro al 30 %, con cajas y pivotes, para comprobar el calce a ojo.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from rembg import new_session, remove

MASCOTA = Path(__file__).resolve().parents[1]
RIVE = MASCOTA / "rive"
MAESTRO = RIVE / "maestro.png"
SALIDA_JSON = MASCOTA.parent / "components" / "mascota" / "layout.json"
SALIDA_CHECK = RIVE / "layout_check.png"

LIENZO = 1024
OCUPACION = 0.9  # el personaje ocupa este alto del lienzo

# ---------------------------------------------------------------
# LAS PIEZAS BASE: dónde buscarlas y dónde está su pivote
#
# `region` acota la búsqueda en fracciones del bbox del personaje
# (x0, y0, x1, y1). `pivote` va en fracciones de la pieza. Los nombres
# izq/der son desde el punto de vista de quien mira: brazo_der.png lleva
# el hombro (la bola) arriba a la izquierda, o sea pegado al torso cuando
# el brazo va a la derecha del personaje.
# ---------------------------------------------------------------


@dataclass(frozen=True)
class Base:
    nombre: str
    region: tuple[float, float, float, float]
    escalas: tuple[float, float]
    pivote: tuple[float, float]
    pivote_nombre: str


BASES: list[Base] = [
    Base("cabeza", (0.0, 0.0, 1.0, 0.55), (0.22, 0.42), (0.5, 0.94), "cuello"),
    Base("torso", (0.15, 0.3, 0.85, 0.85), (0.22, 0.45), (0.5, 0.96), "cadera"),
    Base("brazo_izq", (0.0, 0.3, 0.45, 0.85), (0.14, 0.34), (0.8, 0.07), "hombro"),
    Base("brazo_der", (0.45, 0.3, 0.9, 0.85), (0.14, 0.34), (0.2, 0.07), "hombro"),
    Base("pierna_izq", (0.05, 0.6, 0.5, 1.0), (0.14, 0.34), (0.7, 0.05), "cadera"),
    Base("pierna_der", (0.35, 0.6, 0.8, 1.0), (0.14, 0.34), (0.3, 0.05), "cadera"),
    Base("cola", (0.5, 0.3, 1.0, 1.0), (0.2, 0.5), (0.15, 0.9), "base"),
    Base("ojos_maestro", (0.1, 0.05, 0.9, 0.35), (0.9, 1.1), (0.5, 0.5), "centro"),
    Base("boca_sonrisa", (0.1, 0.15, 0.9, 0.45), (0.12, 0.35), (0.5, 0.5), "centro"),
]

# Orden de capas, de atrás a delante.
CAPAS = [
    "cola", "pierna_izq", "pierna_der", "torso", "brazo_izq", "brazo_der", "cabeza",
    "ojos_normal", "boca_sonrisa",
    "ojos_feliz", "ojos_guino", "ojos_triste", "ojos_brillante",
    "boca_abierta", "boca_o", "boca_triste",
    "brazo_pulgar", "brazo_diploma",
    "anteojos", "estrellas", "gotita", "signo",
]

# Cajas (x, y, ancho, alto) en píxeles del maestro que se imponen sobre
# el matching cuando este no sirve. Medidas a mano sobre layout_check.png.
#
# El matching acierta con lo que tiene bordes propios y grandes —cabeza,
# torso, ojos, boca— y falla con las extremidades: un brazo recto y una
# pierna son dos tubos con la misma silueta que media docena de sitios
# del maestro, y la mejor correlación sale donde toca por casualidad.
# Las cajas de abajo son la silueta de cada extremidad en el maestro,
# con la proporción de la pieza (ajustada por alto).
AJUSTES: dict[str, tuple[int, int, int, int]] = {
    # La cabeza la encuentra el matching, pero 8 px alta: asomaba la oreja
    # del maestro por debajo de la de la pieza.
    "cabeza": (383, 84, 262, 182),
    # Los brazos van DELANTE del torso, así que la bola del hombro tiene
    # que caer sobre el torso, no fuera: 12 px más adentro que la silueta.
    "brazo_izq": (404, 252, 69, 150),
    "brazo_der": (573, 252, 69, 150),
    "pierna_izq": (432, 396, 58, 100),
    "pierna_der": (530, 396, 55, 100),
    "cola": (575, 258, 151, 212),
}


# ---------------------------------------------------------------
# EL MATCHING
# ---------------------------------------------------------------


def cargar_pieza(nombre: str) -> Image.Image:
    for carpeta in ("piezas", "expresiones"):
        ruta = RIVE / carpeta / f"{nombre}.png"
        if ruta.exists():
            with Image.open(ruta) as im:
                return im.convert("RGBA")
    raise FileNotFoundError(nombre)


def gris_y_mascara(imagen: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    """Los bordes (magnitud del gradiente) con el fondo a negro, y la máscara del alfa.

    Se compara por bordes y no por gris: las piezas son renders aparte,
    con otra luz y otro verde, y lo que comparten con el maestro es la
    silueta. El gris puro se iba a las zonas claras.
    """
    rgba = np.asarray(imagen, dtype=np.uint8)
    alfa = rgba[..., 3]
    gris = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2GRAY)
    gris = np.where(alfa > 8, gris, 0).astype(np.uint8)
    suave = cv2.GaussianBlur(gris, (5, 5), 0)
    gx = cv2.Sobel(suave, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(suave, cv2.CV_32F, 0, 1, ksize=3)
    bordes = cv2.magnitude(gx, gy)
    bordes = np.clip(bordes / max(1.0, float(np.percentile(bordes, 99))) * 255, 0, 255).astype(np.uint8)
    mascara = (alfa > 8).astype(np.uint8) * 255
    return bordes, mascara


def buscar(
    maestro_gris: np.ndarray,
    pieza: Image.Image,
    region: tuple[int, int, int, int],
    escalas: tuple[float, float],
) -> tuple[tuple[int, int, int, int], float, float]:
    """La mejor caja (x, y, w, h) en el maestro, su puntuación y su escala."""
    gris, mascara = gris_y_mascara(pieza)
    x0, y0, x1, y1 = region
    recorte = maestro_gris[y0:y1, x0:x1]

    mejor = (None, -1.0, 1.0)
    escala = escalas[0]
    while escala <= escalas[1]:
        w = max(8, round(pieza.width * escala))
        h = max(8, round(pieza.height * escala))
        if w < recorte.shape[1] and h < recorte.shape[0]:
            plantilla = cv2.resize(gris, (w, h), interpolation=cv2.INTER_AREA)
            mask = cv2.resize(mascara, (w, h), interpolation=cv2.INTER_NEAREST)
            resultado = cv2.matchTemplate(recorte, plantilla, cv2.TM_CCOEFF_NORMED, mask=mask)
            _, valor, _, (mx, my) = cv2.minMaxLoc(resultado)
            if np.isfinite(valor) and valor > mejor[1]:
                mejor = ((x0 + mx, y0 + my, w, h), float(valor), escala)
        escala *= 1.03

    caja, valor, escala = mejor
    if caja is None:
        raise ValueError("ninguna escala cabe en la región")
    return caja, valor, escala


# ---------------------------------------------------------------
# EL LIENZO
# ---------------------------------------------------------------


@dataclass
class Lienzo:
    """Cómo se pasa del maestro (píxeles) al lienzo (0–1)."""

    bx0: int
    by0: int
    escala: float
    dx: float
    dy: float

    def caja(self, x: int, y: int, w: int, h: int) -> dict[str, float]:
        return {
            "x": ((x - self.bx0) * self.escala + self.dx) / LIENZO,
            "y": ((y - self.by0) * self.escala + self.dy) / LIENZO,
            "ancho": w * self.escala / LIENZO,
            "alto": h * self.escala / LIENZO,
        }


def lienzo_de(alfa_maestro: np.ndarray) -> Lienzo:
    ys, xs = np.where(alfa_maestro > 8)
    bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    escala = LIENZO * OCUPACION / (by1 - by0)
    dx = (LIENZO - (bx1 - bx0) * escala) / 2
    dy = (LIENZO - (by1 - by0) * escala) / 2
    return Lienzo(bx0, by0, escala, dx, dy)


def region_absoluta(lienzo: Lienzo, alfa_maestro: np.ndarray, fr: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
    ys, xs = np.where(alfa_maestro > 8)
    bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    ancho, alto = bx1 - bx0, by1 - by0
    # Un poco de holgura: las piezas sueltas son algo más grandes que en el maestro.
    margen = 0.08
    return (
        max(0, round(bx0 + (fr[0] - margen) * ancho)),
        max(0, round(by0 + (fr[1] - margen) * alto)),
        min(alfa_maestro.shape[1], round(bx0 + (fr[2] + margen) * ancho)),
        min(alfa_maestro.shape[0], round(by0 + (fr[3] + margen) * alto)),
    )


# ---------------------------------------------------------------
# LAS EXPRESIONES Y LOS ADORNOS
# ---------------------------------------------------------------


def misma_anchura(base: dict[str, float], pieza: Image.Image, alinear: str) -> dict[str, float]:
    """La caja de una pieza con la anchura de la base; alto según su proporción."""
    ancho = base["ancho"]
    alto = ancho * pieza.height / pieza.width
    if alinear == "arriba":
        y = base["y"]
    elif alinear == "abajo":
        y = base["y"] + base["alto"] - alto
    else:
        y = base["y"] + (base["alto"] - alto) / 2
    return {"x": base["x"], "y": y, "ancho": ancho, "alto": alto}


def por_pivote(
    base: dict[str, float], pivote_base: tuple[float, float], pieza: Image.Image, pivote_pieza: tuple[float, float], alto: float
) -> dict[str, float]:
    """Una pieza colocada de modo que su pivote caiga sobre el pivote de la base."""
    ancho = alto * pieza.width / pieza.height
    px = base["x"] + base["ancho"] * pivote_base[0]
    py = base["y"] + base["alto"] * pivote_base[1]
    return {"x": px - ancho * pivote_pieza[0], "y": py - alto * pivote_pieza[1], "ancho": ancho, "alto": alto}


def centrada_en(cx: float, cy: float, pieza: Image.Image, ancho: float) -> dict[str, float]:
    alto = ancho * pieza.height / pieza.width
    return {"x": cx - ancho / 2, "y": cy - alto / 2, "ancho": ancho, "alto": alto}


# ---------------------------------------------------------------


def main() -> int:
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ver", action="store_true", help="imprimir la puntuación y la escala de cada ajuste")
    args = parser.parse_args()

    with Image.open(MAESTRO) as im:
        maestro = remove(im.convert("RGBA"), session=new_session("u2net"), post_process_mask=True)
    if not isinstance(maestro, Image.Image):
        raise TypeError("rembg devolvió algo que no es una imagen")
    maestro_gris, _ = gris_y_mascara(maestro)
    alfa_maestro = np.asarray(maestro.getchannel("A"), dtype=np.uint8)
    lienzo = lienzo_de(alfa_maestro)

    piezas: dict[str, dict] = {}
    cajas_maestro: dict[str, tuple[int, int, int, int]] = {}

    print("Piezas base sobre el maestro:")
    for base in BASES:
        pieza = cargar_pieza(base.nombre)
        if base.nombre in AJUSTES:
            caja, valor, escala, como = AJUSTES[base.nombre], float("nan"), float("nan"), "a mano"
        else:
            region = region_absoluta(lienzo, alfa_maestro, base.region)
            caja, valor, escala = buscar(maestro_gris, pieza, region, base.escalas)
            como = "matching"
        cajas_maestro[base.nombre] = caja
        detalle = f"  puntuación {valor:.3f} · escala {escala:.3f}" if args.ver and como == "matching" else ""
        print(f"  {base.nombre:14s} {como:9s} caja {caja}{detalle}")
        piezas[base.nombre] = {
            **lienzo.caja(*caja),
            "pivote": {"x": base.pivote[0], "y": base.pivote[1], "nombre": base.pivote_nombre},
        }

    # ojos_normal es otro render, con otra proporción: toma el centro y la
    # anchura de los ojos del maestro.
    ojos = piezas.pop("ojos_maestro")
    ojos_normal = cargar_pieza("ojos_normal")
    piezas["ojos_normal"] = {
        **centrada_en(ojos["x"] + ojos["ancho"] / 2, ojos["y"] + ojos["alto"] / 2, ojos_normal, ojos["ancho"] * 1.02),
        "pivote": {"x": 0.5, "y": 0.5, "nombre": "centro"},
    }

    # Las expresiones, sobre lo que sustituyen.
    for nombre in ("ojos_feliz", "ojos_guino", "ojos_triste", "ojos_brillante"):
        piezas[nombre] = {**misma_anchura(piezas["ojos_normal"], cargar_pieza(nombre), "centro"), "pivote": {"x": 0.5, "y": 0.5, "nombre": "centro"}, "reemplaza": "ojos_normal"}
    for nombre in ("boca_abierta", "boca_o", "boca_triste"):
        piezas[nombre] = {**misma_anchura(piezas["boca_sonrisa"], cargar_pieza(nombre), "arriba"), "pivote": {"x": 0.5, "y": 0.3, "nombre": "labio"}, "reemplaza": "boca_sonrisa"}

    # Los brazos alternativos cuelgan del mismo hombro que brazo_der. Su
    # hombro está abajo a la izquierda de la pieza (el brazo sube). La
    # escala la fija el GROSOR del brazo, no el alto de la pieza: son
    # brazos doblados, y a igual alto salían el doble de gruesos.
    brazo = piezas["brazo_der"]
    for nombre, pivote_pieza, alto in (("brazo_pulgar", (0.12, 0.86), brazo["alto"] * 0.62), ("brazo_diploma", (0.12, 0.9), brazo["alto"] * 0.74)):
        pieza = cargar_pieza(nombre)
        piezas[nombre] = {**por_pivote(brazo, (0.2, 0.07), pieza, pivote_pieza, alto), "pivote": {"x": pivote_pieza[0], "y": pivote_pieza[1], "nombre": "hombro"}, "reemplaza": "brazo_der"}

    # Los adornos, respecto a la cabeza y los ojos.
    cabeza = piezas["cabeza"]
    ojos_n = piezas["ojos_normal"]
    cx_ojos = ojos_n["x"] + ojos_n["ancho"] / 2
    cy_ojos = ojos_n["y"] + ojos_n["alto"] / 2
    # Los anteojos, un poco más anchos que los ojos con sus párpados. Las
    # estrellas, sobre la coronilla, sin salirse del lienzo. La gotita,
    # colgando del párpado inferior del ojo derecho. El signo, arriba a la
    # derecha de la cabeza, con el pivote abajo para que rebote de pie.
    piezas["anteojos"] = {**centrada_en(cx_ojos, cy_ojos, cargar_pieza("anteojos"), ojos_n["ancho"] * 1.16), "pivote": {"x": 0.5, "y": 0.5, "nombre": "centro"}}
    piezas["estrellas"] = {**centrada_en(cabeza["x"] + cabeza["ancho"] / 2, cabeza["y"] + cabeza["alto"] * 0.05, cargar_pieza("estrellas"), cabeza["ancho"] * 0.4), "pivote": {"x": 0.5, "y": 0.5, "nombre": "centro"}}
    piezas["gotita"] = {**centrada_en(ojos_n["x"] + ojos_n["ancho"] * 0.9, ojos_n["y"] + ojos_n["alto"] * 1.3, cargar_pieza("gotita"), cabeza["ancho"] * 0.075), "pivote": {"x": 0.5, "y": 0.0, "nombre": "arriba"}}
    piezas["signo"] = {**centrada_en(cabeza["x"] + cabeza["ancho"] * 1.0, cabeza["y"] + cabeza["alto"] * 0.28, cargar_pieza("signo"), cabeza["ancho"] * 0.06), "pivote": {"x": 0.5, "y": 1.0, "nombre": "abajo"}}

    # Redondeo y orden de capas.
    layout = {
        "lienzo": LIENZO,
        "capas": CAPAS,
        "piezas": {
            nombre: {k: (round(v, 4) if isinstance(v, float) else v) for k, v in piezas[nombre].items()}
            for nombre in CAPAS
        },
    }
    SALIDA_JSON.parent.mkdir(parents=True, exist_ok=True)
    SALIDA_JSON.write_text(json.dumps(layout, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n{SALIDA_JSON.relative_to(MASCOTA.parent)} con {len(layout['piezas'])} piezas")

    # ---------------------------- LA COMPROBACIÓN ----------------------------
    def panel(nombres: list[str]) -> Image.Image:
        fondo = Image.new("RGBA", (LIENZO, LIENZO), (255, 255, 255, 255))
        # El maestro al 30 %, en el sitio del lienzo.
        m = maestro.resize((round(maestro.width * lienzo.escala), round(maestro.height * lienzo.escala)), Image.Resampling.LANCZOS)
        alfa = m.getchannel("A").point(lambda a: int(a * 0.3))
        m.putalpha(alfa)
        fondo.alpha_composite(m, (round(lienzo.dx - lienzo.bx0 * lienzo.escala), round(lienzo.dy - lienzo.by0 * lienzo.escala)))
        dibujo = ImageDraw.Draw(fondo)
        for nombre in nombres:
            p = layout["piezas"][nombre]
            x, y, w, h = round(p["x"] * LIENZO), round(p["y"] * LIENZO), round(p["ancho"] * LIENZO), round(p["alto"] * LIENZO)
            pieza = cargar_pieza(nombre).resize((max(1, w), max(1, h)), Image.Resampling.LANCZOS)
            fondo.alpha_composite(pieza, (x, y))
        for nombre in nombres:
            p = layout["piezas"][nombre]
            x, y, w, h = round(p["x"] * LIENZO), round(p["y"] * LIENZO), round(p["ancho"] * LIENZO), round(p["alto"] * LIENZO)
            dibujo.rectangle((x, y, x + w, y + h), outline=(224, 71, 63, 160), width=1)
            px, py = x + w * p["pivote"]["x"], y + h * p["pivote"]["y"]
            dibujo.ellipse((px - 5, py - 5, px + 5, py + 5), fill=(224, 71, 63, 255))
            dibujo.text((x + 3, y + 2), nombre, fill=(30, 94, 46, 255))
        return fondo

    base_capas = [n for n in CAPAS if "reemplaza" not in layout["piezas"][n] and n not in ("anteojos", "estrellas", "gotita", "signo")]
    muestra = ["cola", "pierna_izq", "pierna_der", "torso", "brazo_izq", "brazo_pulgar", "cabeza", "ojos_feliz", "boca_abierta", "anteojos", "estrellas", "gotita", "signo"]
    hoja = Image.new("RGBA", (LIENZO * 2 + 20, LIENZO), (255, 255, 255, 255))
    hoja.paste(panel(base_capas), (0, 0))
    hoja.paste(panel(muestra), (LIENZO + 20, 0))
    hoja.save(SALIDA_CHECK, "PNG")
    print(f"{SALIDA_CHECK.relative_to(MASCOTA.parent)}: base a la izquierda, expresiones y adornos a la derecha")
    return 0


if __name__ == "__main__":
    sys.exit(main())
