"""
Los parches de cada estado: lo que cambia entre el maestro y su variante.

    npm run mascota:parches            (antes: npm run mascota:base)

Para cada variante de rive/variantes/: la alinea al maestro (comun),
quita el fondo a los dos con rembg —mismo modelo y parámetros—, y
calcula dónde difieren (más de 25 en algún canal RGB, dentro del
personaje). Esa máscara se limpia (apertura 3 px), se ensancha
(dilatación 14 px) y se difumina (gaussiana 10 px); cada región conexa
es un parche: los píxeles de la variante recortados con ese alfa
difuminado, en public/mascota/parches/<estado>_<n>.png. Se ignoran las
regiones con menos de 400 px² de diferencia real —antes de ensanchar:
ensanchado, hasta un píxel suelto ocupa 630—, que son ruido del render.

LA COLA SE EXCLUYE de la diferencia: es una capa aparte que se mueve
sola, y ninguna variante la cambia; lo que difiere ahí es ruido del
render, y un parche encima de una cola que gira se notaría.

EL HUECO. Un parche tapa, pero no borra: en «éxito» los brazos suben y
los del maestro, que cuelgan, tienen que desaparecer. Por eso cada
estado lleva además parches/hueco_<estado>.png, del tamaño del lienzo:
un alfa que dice cuánto se le quita a cuerpo.png donde la variante
tiene fondo y el maestro no. El componente lo aplica como mask-image.
Y su inverso, parches/resto_<estado>.png —solo lo que se quita—, para
que el brazo se desvanezca en vez de desaparecer de golpe: mask-image
no se anima. Solo se escriben si hay algo que quitar.

Escribe components/mascota/parches.json (`parches`, `huecos`, `restos`; respeta
`lienzo` y `cola` de base.py) y rive/parches_check.png: por estado, la
mascota con sus parches puestos y el contorno de cada uno en rojo, y
el hueco en azul; el rectángulo gris es el lienzo (las manos de
«éxito» y el diploma sobresalen por la izquierda).
"""

from __future__ import annotations

import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

from comun import (
    ESTADOS,
    PUBLICO,
    RIVE,
    UMBRAL_ALFA,
    alinear,
    cargar_maestro,
    cargar_variante,
    color_fondo,
    desplazar,
    escribir_parches_json,
    leer_parches_json,
    lienzo_de,
    poligono_cola,
    sesion_rembg,
    sin_fondo,
)

PARCHES = PUBLICO / "parches"
SALIDA_CHECK = RIVE / "parches_check.png"

UMBRAL_DIFERENCIA = 25
APERTURA = 3
DILATACION = 14
DIFUMINADO = 10
AREA_MINIMA = 400
HUECO_MINIMO = 20  # píxeles del cuerpo que hay que quitar para escribir un hueco
AIRE_VISTA = 60  # lo que sobresale del lienzo en la hoja de control (las manos de «éxito»)

# Zonas del maestro para la etiqueta (x0, y0, x1, y1 en píxeles del
# maestro, medidas sobre rive/maestro.png). Izquierda y derecha son
# desde quien mira. Un parche se etiqueta por dónde cae su centro.
ZONA_CABEZA = (383, 84, 645, 266)
ZONA_CARA = (405, 110, 625, 250)
ZONA_BRAZOS_Y = (60, 430)
CENTRO_X = (480, 560)  # entre ambos, ni un brazo ni el otro


def etiquetar(cx: float, cy: float) -> str:
    def dentro(zona: tuple[int, int, int, int]) -> bool:
        return zona[0] <= cx <= zona[2] and zona[1] <= cy <= zona[3]

    if dentro(ZONA_CARA):
        return "cara"
    if dentro(ZONA_CABEZA):
        return "cabeza"
    if ZONA_BRAZOS_Y[0] <= cy <= ZONA_BRAZOS_Y[1]:
        if cx < CENTRO_X[0]:
            return "brazo_izq"
        if cx > CENTRO_X[1]:
            return "brazo_der"
    return "otro"


def main() -> int:
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8", errors="replace")

    sesion = sesion_rembg()
    maestro = cargar_maestro()
    maestro_rgba = np.asarray(sin_fondo(maestro, sesion))
    m = np.asarray(maestro).astype(np.int16)
    alfa_m = maestro_rgba[..., 3]
    lienzo = lienzo_de(alfa_m)
    alto, ancho = alfa_m.shape
    cola = poligono_cola(alfa_m.shape) > 0

    PARCHES.mkdir(parents=True, exist_ok=True)
    for viejo in PARCHES.glob("*.png"):
        viejo.unlink()

    k_apertura = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (APERTURA, APERTURA))
    k_dilatar = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (DILATACION * 2 + 1, DILATACION * 2 + 1))
    k_difuminar = (DIFUMINADO * 2 + 1, DIFUMINADO * 2 + 1)

    parches: list[dict] = []
    huecos: dict[str, str] = {}
    restos: dict[str, str] = {}
    vistas: list[tuple[str, Image.Image]] = []

    for nombre, estado in ESTADOS.items():
        variante = cargar_variante(nombre, maestro.size)
        al = alinear(maestro, variante)
        v_rgb = desplazar(np.asarray(variante), al.dx, al.dy, color_fondo(variante))
        v = np.asarray(sin_fondo(Image.fromarray(v_rgb), sesion))
        alfa_v = v[..., 3].astype(np.float32) / 255.0

        # La diferencia, solo donde hay personaje en alguno de los dos y
        # fuera de la cola.
        diferencia = np.abs(m - v_rgb.astype(np.int16)).max(axis=2)
        personaje = (alfa_m > UMBRAL_ALFA) | (v[..., 3] > UMBRAL_ALFA)
        mascara = ((diferencia > UMBRAL_DIFERENCIA) & personaje & ~cola).astype(np.uint8)
        mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, k_apertura)
        dilatada = cv2.dilate(mascara, k_dilatar)

        n, etiquetas, stats, centroides = cv2.connectedComponentsWithStats(dilatada, connectivity=8)
        hueco = np.zeros(alfa_m.shape, dtype=np.float32)
        indice = 0
        print(f"{nombre} → {estado}  (corrimiento {al.dx:+d},{al.dy:+d})")
        for i in range(1, n):
            x, y, w, h, _ = (int(s) for s in stats[i])
            area = int(mascara[etiquetas == i].sum())
            if area < AREA_MINIMA:
                continue
            region = (etiquetas == i).astype(np.float32)
            suave = cv2.GaussianBlur(region, k_difuminar, 0)
            x0, y0 = max(0, x - DIFUMINADO), max(0, y - DIFUMINADO)
            x1, y1 = min(ancho, x + w + DIFUMINADO), min(alto, y + h + DIFUMINADO)

            parche = v.copy()
            parche[..., 3] = np.round(suave * alfa_v * 255).astype(np.uint8)
            indice += 1
            archivo = f"{estado}_{indice}.png"
            Image.fromarray(parche[y0:y1, x0:x1]).save(PARCHES / archivo, "PNG")

            # Donde la variante tiene fondo y el maestro no, hay que
            # quitarle al cuerpo.
            hueco = np.maximum(hueco, suave * (1.0 - alfa_v))

            cx, cy = (float(c) for c in centroides[i])
            etiqueta = etiquetar(cx, cy)
            parches.append({"estado": estado, "archivo": archivo, **lienzo.caja(x0, y0, x1 - x0, y1 - y0), "etiqueta": etiqueta})
            print(f"   {archivo:22s} {etiqueta:10s} caja ({x0}, {y0})–({x1}, {y1})  {area} px²")

        # El hueco se cuenta donde el cuerpo tiene algo que perder, pero
        # la máscara se escribe entera: multiplicada por el alfa del
        # maestro, el borde antialiasado del brazo —alfa parcial— solo
        # se quitaba a medias y dejaba un contorno fantasma.
        quita = int((hueco * (alfa_m.astype(np.float32) / 255.0) > 0.5).sum())
        if quita >= HUECO_MINIMO:
            hueco_alfa = np.round(hueco * 255).astype(np.uint8)
            for clave, alfa, registro in (("hueco", 255 - hueco_alfa, huecos), ("resto", hueco_alfa, restos)):
                archivo = f"{clave}_{estado}.png"
                Image.fromarray(np.dstack([np.zeros_like(alfa), alfa]), "LA").crop((lienzo.x0, lienzo.y0, lienzo.x1, lienzo.y1)).save(PARCHES / archivo, "PNG")
                registro[estado] = archivo
            print(f"   hueco/resto_{estado}.png quita {quita} px del cuerpo")

        vistas.append((estado, vista(lienzo, maestro_rgba, hueco, [p for p in parches if p["estado"] == estado])))

    datos = leer_parches_json()
    datos["parches"] = parches
    datos["huecos"] = huecos
    datos["restos"] = restos
    escribir_parches_json(datos)
    print(f"\ncomponents/mascota/parches.json: {len(parches)} parches, {len(huecos)} huecos")

    columnas = 4
    sep = 12
    w, h = vistas[0][1].size
    filas = -(-len(vistas) // columnas)
    hoja = Image.new("RGBA", (columnas * (w + sep) + sep, filas * (h + sep + 20) + sep), (255, 255, 255, 255))
    dibujo = ImageDraw.Draw(hoja)
    for i, (estado, im) in enumerate(vistas):
        x, y = sep + (i % columnas) * (w + sep), sep + (i // columnas) * (h + sep + 20)
        dibujo.text((x + 2, y + 2), estado, fill=(30, 94, 46, 255))
        hoja.paste(im, (x, y + 18))
    hoja.save(SALIDA_CHECK, "PNG")
    print(f"{SALIDA_CHECK.relative_to(RIVE.parent.parent)}")
    return 0


def vista(lienzo, maestro_rgba: np.ndarray, hueco: np.ndarray, parches: list[dict]) -> Image.Image:
    """La mascota con los parches puestos, y sus contornos.

    El panel es el lienzo con AIRE_VISTA píxeles alrededor, con el
    lienzo marcado en gris: lo que queda fuera se ve igual en el
    navegador, pero sobresale de la caja del componente.
    """
    w, h = lienzo.ancho + AIRE_VISTA * 2, lienzo.alto + AIRE_VISTA * 2
    fondo = Image.new("RGBA", (w, h), (232, 232, 232, 255))
    d = ImageDraw.Draw(fondo)
    for y in range(0, h, 12):
        for x in range(0, w, 12):
            if (x // 12 + y // 12) % 2 == 0:
                d.rectangle((x, y, x + 11, y + 11), fill=(246, 246, 246, 255))
    d.rectangle((AIRE_VISTA, AIRE_VISTA, AIRE_VISTA + lienzo.ancho - 1, AIRE_VISTA + lienzo.alto - 1), outline=(170, 170, 170, 255), width=1)

    # De píxeles del maestro a píxeles del panel.
    ox, oy = AIRE_VISTA - lienzo.x0, AIRE_VISTA - lienzo.y0

    base = maestro_rgba.copy()
    base[..., 3] = np.round(base[..., 3] * (1.0 - hueco)).astype(np.uint8)
    fondo.alpha_composite(Image.fromarray(base), (ox, oy))
    for p in parches:
        with Image.open(PARCHES / p["archivo"]) as im:
            fondo.alpha_composite(im.convert("RGBA"), (round(p["x"] * lienzo.ancho) + AIRE_VISTA, round(p["y"] * lienzo.alto) + AIRE_VISTA))

    d = ImageDraw.Draw(fondo)
    for contorno in cv2.findContours((hueco > 0.5).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]:
        puntos = [(int(pt[0][0]) + ox, int(pt[0][1]) + oy) for pt in contorno]
        d.line(puntos + [puntos[0]], fill=(40, 120, 220, 255), width=1)
    for p in parches:
        with Image.open(PARCHES / p["archivo"]) as im:
            a = (np.asarray(im.getchannel("A")) > 128).astype(np.uint8)
        px, py = round(p["x"] * lienzo.ancho) + AIRE_VISTA, round(p["y"] * lienzo.alto) + AIRE_VISTA
        for contorno in cv2.findContours(a, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]:
            puntos = [(int(pt[0][0]) + px, int(pt[0][1]) + py) for pt in contorno]
            d.line(puntos + [puntos[0]], fill=(224, 71, 63, 255), width=1)
        d.text((max(2, px + 2), max(2, py + 2)), p["archivo"].replace(".png", ""), fill=(160, 30, 30, 255))
    return fondo


if __name__ == "__main__":
    sys.exit(main())
