"""
La base de la mascota: el maestro sin fondo, y la cola aparte.

    npm run mascota:base

Escribe en public/mascota/:
  base.png    el maestro sin fondo, recortado con un 5 % de margen. Es
              el LIENZO al que se refiere todo lo demás (comun.Lienzo).
  cola.png    la cola sola, recortada a su caja, con el corte contra el
              cuerpo difuminado.
  cuerpo.png  la base sin la cola. El cuerpo se mete unos píxeles bajo
              la raíz de la cola y esa franja se rellena con cv2.inpaint,
              para que al girar la cola no asome el corte.

Y en components/mascota/parches.json las claves `lienzo` (tamaño en
píxeles y proporción) y `cola` (caja normalizada y pivote), sin tocar
lo que haya escrito parches.py. Además rive/base_check.png: cuerpo y
cola separados, y la unión ampliada.
"""

from __future__ import annotations

import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

from comun import (
    COLA_PIVOTE,
    COLA_SOLAPE,
    PUBLICO,
    RIVE,
    UMBRAL_ALFA,
    cargar_maestro,
    escribir_parches_json,
    leer_parches_json,
    lienzo_de,
    mascara_cola,
    poligono_cola,
    sesion_rembg,
    sin_fondo,
)

SALIDA_CHECK = RIVE / "base_check.png"
AIRE_COLA = 4  # píxeles de margen alrededor de la caja de la cola


def suavizar(mascara: np.ndarray, radio: int) -> np.ndarray:
    """Una máscara 0–255 como float 0–1 con el borde difuminado."""
    k = radio * 2 + 1
    return cv2.GaussianBlur(mascara.astype(np.float32) / 255.0, (k, k), 0)


def main() -> int:
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8", errors="replace")

    maestro = cargar_maestro()
    rgba = np.asarray(sin_fondo(maestro, sesion_rembg()))
    rgb, alfa = rgba[..., :3].copy(), rgba[..., 3]
    lienzo = lienzo_de(alfa)
    PUBLICO.mkdir(parents=True, exist_ok=True)

    # ------------------------------ LA BASE ------------------------------
    base = lienzo.recortar(Image.fromarray(rgba))
    base.save(PUBLICO / "base.png", "PNG")
    print(f"base.png {base.width}×{base.height}  (lienzo {lienzo.x0},{lienzo.y0}–{lienzo.x1},{lienzo.y1} del maestro)")

    # ------------------------------ LA COLA ------------------------------
    cola_dura = mascara_cola(rgb, alfa)
    # El corte contra el cuerpo se difumina; el borde exterior sigue
    # siendo el alfa de rembg.
    cola_alfa = alfa.astype(np.float32) / 255.0 * suavizar(cola_dura, 2)
    ys, xs = np.where(cola_alfa > 0.01)
    cx0, cy0 = max(0, int(xs.min()) - AIRE_COLA), max(0, int(ys.min()) - AIRE_COLA)
    cx1, cy1 = min(alfa.shape[1], int(xs.max()) + 1 + AIRE_COLA), min(alfa.shape[0], int(ys.max()) + 1 + AIRE_COLA)
    cola_rgba = rgba.copy()
    cola_rgba[..., 3] = np.round(cola_alfa * 255).astype(np.uint8)
    cola = Image.fromarray(cola_rgba[cy0:cy1, cx0:cx1])
    cola.save(PUBLICO / "cola.png", "PNG")
    print(f"cola.png {cola.width}×{cola.height}  caja ({cx0}, {cy0})–({cx1}, {cy1}), pivote {COLA_PIVOTE}")

    # ----------------------------- EL CUERPO -----------------------------
    # Del cuerpo se quita el polígono de la cola entero —no solo la
    # máscara, para que no quede el contorno de alfa casi cero que la
    # máscara descarta— menos una franja de COLA_SOLAPE píxeles pegada al
    # resto del cuerpo: así el cuerpo sigue un poco por debajo de la
    # raíz. Esa franja es cola de verdad, y se rellena con cv2.inpaint
    # desde el lado del cuerpo: en un recorte alrededor de la cola se
    # pinta todo lo que no es cuerpo —polígono y fondo—, para que el
    # relleno solo conozca píxeles del cuerpo, y se usa solo la franja.
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (COLA_SOLAPE * 2 + 1, COLA_SOLAPE * 2 + 1))
    poligono = poligono_cola(alfa.shape)
    resto = ((alfa > UMBRAL_ALFA) & (poligono == 0)).astype(np.uint8)
    junto_al_cuerpo = (cv2.dilate(resto, k) > 0) & (poligono > 0)
    quitar = np.where(junto_al_cuerpo, 0, poligono).astype(np.uint8)
    franja = ((cola_dura > 0) & junto_al_cuerpo).astype(np.uint8) * 255
    cuerpo_alfa = alfa.astype(np.float32) / 255.0 * (1.0 - suavizar(quitar, 2))
    rx0, ry0, rx1, ry1 = 540, 230, 760, 500
    pintar = ((poligono > 0) | (alfa <= UMBRAL_ALFA)).astype(np.uint8) * 255
    relleno = cv2.inpaint(np.ascontiguousarray(rgb[ry0:ry1, rx0:rx1]), pintar[ry0:ry1, rx0:rx1], 5, cv2.INPAINT_TELEA)
    cuerpo_rgb = rgb.copy()
    cuerpo_rgb[ry0:ry1, rx0:rx1] = np.where(franja[ry0:ry1, rx0:rx1, None] > 0, relleno, rgb[ry0:ry1, rx0:rx1])
    cuerpo_rgba = np.dstack([cuerpo_rgb, np.round(cuerpo_alfa * 255).astype(np.uint8)])
    cuerpo = lienzo.recortar(Image.fromarray(cuerpo_rgba))
    cuerpo.save(PUBLICO / "cuerpo.png", "PNG")
    print(f"cuerpo.png {cuerpo.width}×{cuerpo.height}  franja rellenada: {int((franja > 0).sum())} px")

    # ------------------------------ EL JSON ------------------------------
    datos = leer_parches_json()
    datos["lienzo"] = {"ancho": lienzo.ancho, "alto": lienzo.alto, "proporcion": round(lienzo.ancho / lienzo.alto, 4)}
    datos["cola"] = {
        "archivo": "cola.png",
        **lienzo.caja(cx0, cy0, cx1 - cx0, cy1 - cy0),
        # El pivote en fracciones de la propia cola (para transform-origin)
        # y en el lienzo (por si hace falta).
        "pivote": {"x": round((COLA_PIVOTE[0] - cx0) / (cx1 - cx0), 4), "y": round((COLA_PIVOTE[1] - cy0) / (cy1 - cy0), 4)},
        "pivote_lienzo": lienzo.punto(*COLA_PIVOTE),
    }
    escribir_parches_json(datos)
    print("parches.json: lienzo y cola")

    # --------------------------- LA COMPROBACIÓN ---------------------------
    # Cuerpo | cola | los dos juntos, y la unión ampliada ×3 con el
    # polígono y el pivote.
    def sobre_cuadros(im: Image.Image) -> Image.Image:
        fondo = Image.new("RGBA", im.size, (235, 235, 235, 255))
        d = ImageDraw.Draw(fondo)
        for y in range(0, im.height, 16):
            for x in range(0, im.width, 16):
                if (x // 16 + y // 16) % 2 == 0:
                    d.rectangle((x, y, x + 15, y + 15), fill=(250, 250, 250, 255))
        fondo.alpha_composite(im)
        return fondo

    juntos = cuerpo.copy()
    juntos.alpha_composite(cola, (cx0 - lienzo.x0, cy0 - lienzo.y0))
    cola_en_lienzo = Image.new("RGBA", cuerpo.size, (0, 0, 0, 0))
    cola_en_lienzo.alpha_composite(cola, (cx0 - lienzo.x0, cy0 - lienzo.y0))

    zx0, zy0, zx1, zy1 = 540, 370, 660, 490
    zoom = sobre_cuadros(Image.fromarray(cuerpo_rgba[zy0:zy1, zx0:zx1])).resize((360, 360), Image.Resampling.NEAREST)
    zoom_cola = sobre_cuadros(Image.fromarray(cola_rgba[zy0:zy1, zx0:zx1])).resize((360, 360), Image.Resampling.NEAREST)
    for z in (zoom, zoom_cola):
        d = ImageDraw.Draw(z)
        px, py = (COLA_PIVOTE[0] - zx0) * 3, (COLA_PIVOTE[1] - zy0) * 3
        d.ellipse((px - 5, py - 5, px + 5, py + 5), fill=(224, 71, 63, 255))

    sep = 12
    hoja = Image.new("RGBA", (cuerpo.width * 3 + 360 * 2 + sep * 6, max(cuerpo.height, 360) + sep * 2), (255, 255, 255, 255))
    x = sep
    for im in (sobre_cuadros(cuerpo), sobre_cuadros(cola_en_lienzo), sobre_cuadros(juntos)):
        hoja.paste(im, (x, sep))
        x += im.width + sep
    hoja.paste(zoom, (x, sep))
    hoja.paste(zoom_cola, (x + 360 + sep, sep))
    d = ImageDraw.Draw(hoja)
    d.text((sep + 4, 2), "cuerpo.png", fill=(30, 94, 46, 255))
    d.text((sep * 2 + cuerpo.width + 4, 2), "cola.png", fill=(30, 94, 46, 255))
    d.text((sep * 3 + cuerpo.width * 2 + 4, 2), "juntos", fill=(30, 94, 46, 255))
    d.text((x + 4, 2), "unión ×3: cuerpo · cola (pivote en rojo)", fill=(30, 94, 46, 255))
    hoja.save(SALIDA_CHECK, "PNG")
    print(f"{SALIDA_CHECK.relative_to(RIVE.parent.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
