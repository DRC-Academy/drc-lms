"""
Iguala el verde de las expresiones al de la pieza base que sustituyen.

    npm run mascota:igualar
    npm run mascota:igualar -- --ensayo      (mide y cuenta, no escribe)

Cada expresión se generó por separado y su verde no es exactamente el de
la pieza a la que reemplaza: al cambiar de boca en Rive, el color salta.
Para cada par (referencia → objetivo) se toman SOLO los píxeles verdes
de las dos —matiz entre 60° y 160°, alfa > 200— y se desplazan el
matiz, la saturación y el valor del objetivo para que su mediana coincida
con la de la referencia. Lo que no es verde —la lengua, el diploma, la
cinta, el blanco del ojo— no se toca, ni tampoco el alfa.

El original se guarda al lado como nombre.orig.png antes de
sobrescribir, y si ya existe se parte de él: correr esto dos veces da lo
mismo que correrlo una.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RIVE = Path(__file__).resolve().parents[1] / "rive"

# referencia → objetivos, relativos a rive/
PARES: dict[str, list[str]] = {
    "piezas/boca_sonrisa.png": [
        "expresiones/boca_abierta.png",
        "expresiones/boca_o.png",
        "expresiones/boca_triste.png",
    ],
    "piezas/brazo_der.png": [
        "expresiones/brazo_pulgar.png",
        "expresiones/brazo_diploma.png",
    ],
}

# Pillow codifica el matiz en 0–255 (255 = 360°).
MATIZ_MIN = round(60 / 360 * 255)
MATIZ_MAX = round(160 / 360 * 255)
ALFA_MIN = 200


def hsv_y_alfa(imagen: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    """El HSV (uint8, alto×ancho×3) y el alfa (uint8) de una imagen."""
    rgba = imagen.convert("RGBA")
    hsv = np.asarray(rgba.convert("RGB").convert("HSV"), dtype=np.uint8)
    alfa = np.asarray(rgba.getchannel("A"), dtype=np.uint8)
    return hsv, alfa


def mascara_verde(hsv: np.ndarray, alfa: np.ndarray) -> np.ndarray:
    matiz = hsv[..., 0]
    return (matiz >= MATIZ_MIN) & (matiz <= MATIZ_MAX) & (alfa > ALFA_MIN)


def medianas(hsv: np.ndarray, mascara: np.ndarray) -> np.ndarray:
    """Mediana de H, S y V sobre la máscara, como float."""
    return np.median(hsv[mascara].astype(np.float64), axis=0)


def igualar(referencia: Image.Image, objetivo: Image.Image) -> tuple[Image.Image, np.ndarray, np.ndarray, int]:
    """El objetivo con su verde desplazado al de la referencia."""
    hsv_ref, alfa_ref = hsv_y_alfa(referencia)
    hsv_obj, alfa_obj = hsv_y_alfa(objetivo)

    verde_ref = mascara_verde(hsv_ref, alfa_ref)
    verde_obj = mascara_verde(hsv_obj, alfa_obj)
    if verde_ref.sum() == 0 or verde_obj.sum() == 0:
        raise ValueError("una de las dos imágenes no tiene píxeles verdes que medir")

    med_ref = medianas(hsv_ref, verde_ref)
    med_obj = medianas(hsv_obj, verde_obj)
    desplazamiento = med_ref - med_obj

    ajustado = hsv_obj.astype(np.float64)
    # El matiz es circular: se suma y se envuelve. Saturación y valor se
    # suman y se recortan al rango.
    ajustado[verde_obj, 0] = np.mod(ajustado[verde_obj, 0] + desplazamiento[0], 256)
    ajustado[verde_obj, 1] = np.clip(ajustado[verde_obj, 1] + desplazamiento[1], 0, 255)
    ajustado[verde_obj, 2] = np.clip(ajustado[verde_obj, 2] + desplazamiento[2], 0, 255)

    rgb = Image.fromarray(np.rint(ajustado).astype(np.uint8), "HSV").convert("RGB")
    salida = rgb.convert("RGBA")
    salida.putalpha(Image.fromarray(alfa_obj, "L"))
    return salida, med_ref, med_obj, int(verde_obj.sum())


def en_grados(mediana: np.ndarray) -> str:
    h, s, v = mediana
    return f"H {h / 255 * 360:5.1f}°  S {s / 255 * 100:4.1f}%  V {v / 255 * 100:4.1f}%"


def main() -> int:
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ensayo", action="store_true", help="medir y contar sin escribir nada")
    args = parser.parse_args()

    if args.ensayo:
        print("ENSAYO: no se escribe nada.\n")

    for ref_rel, objetivos in PARES.items():
        ruta_ref = RIVE / ref_rel
        if not ruta_ref.exists():
            print(f"✗ falta la referencia {ref_rel}")
            return 1
        with Image.open(ruta_ref) as im:
            referencia = im.convert("RGBA")

        print(f"{ref_rel}")
        for obj_rel in objetivos:
            ruta = RIVE / obj_rel
            original = ruta.with_suffix(".orig.png")
            if not ruta.exists():
                print(f"  ✗ falta {obj_rel}")
                continue

            # Se parte siempre del original: así la segunda corrida no
            # desplaza lo ya desplazado.
            fuente = original if original.exists() else ruta
            with Image.open(fuente) as im:
                objetivo = im.convert("RGBA")

            ajustado, med_ref, med_obj, n = igualar(referencia, objetivo)
            print(f"  → {obj_rel}  ({n} px verdes)")
            print(f"      referencia  {en_grados(med_ref)}")
            print(f"      objetivo    {en_grados(med_obj)}")

            if args.ensayo:
                continue
            if not original.exists():
                objetivo.save(original, "PNG")
            ajustado.save(ruta, "PNG")
            print(f"      ✓ escrito (original en {original.name})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
