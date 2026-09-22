"""
Comprueba que cada variante de rive/variantes/ es el maestro con un
gesto cambiado y nada más: misma pose, mismo encuadre, mismo fondo.

    npm run mascota:variantes

Para cada variante: la escala a la resolución del maestro, busca su
corrimiento con el cuerpo como plantilla (comun.alinear), la corre
para que calce, y cuenta qué parte de los píxeles coincide con el
maestro (diferencia menor a 12 en los tres canales). Escribe
rive/variantes_check.png con una fila por variante —maestro | variante
alineada | diferencia en rojo— y el resultado de cada una.

UNA VARIANTE FALLA si coincide en menos del 80 % del cuadro o si el
corrimiento pasa de 15 px. Con una que falle el script sale con
código 1: es la señal de parar y mirar antes de recortar parches.
El 80 % es sobre el cuadro entero; el personaje ocupa un cuarto,
así que una pose distinta lo baja por debajo y un fondo distinto
lo hunde. También se imprime la coincidencia solo sobre el
personaje, que es la que dice cuánto cambió de verdad el gesto.

Dos excepciones. Las de comun.IGUALAR_LUZ vienen con otro fondo: se les
corrige la luz del personaje y se miden por él (MINIMO_PERSONAJE), no
por el cuadro. Las de comun.COMPLETOS cambian la pose entera y no
calzan por definición: se enseñan, pero no fallan —su parche es el
personaje entero—.
"""

from __future__ import annotations

import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from comun import COMPLETOS, GESTOS, IGUALAR_LUZ, VARIANTES_TODAS as ESTADOS, RIVE, alinear, cargar_maestro, cargar_variante, color_fondo, desplazar

SALIDA = RIVE / "variantes_check.png"
UMBRAL_DIFERENCIA = 12
MINIMO_COINCIDENCIA = 80.0
MAXIMO_CORRIMIENTO = 15
# Para las de luz igualada: con el fondo distinto el cuadro no dice nada.
MINIMO_PERSONAJE = 35.0
# El personaje, para la coincidencia «solo personaje»: lo que se aparta
# del color del fondo más que esto, en el maestro o en la variante.
UMBRAL_PERSONAJE = 40


def fuente(tamano: int) -> ImageFont.ImageFont | ImageFont.FreeTypeFont:
    for nombre in ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(nombre, tamano)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> int:
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8", errors="replace")

    maestro = cargar_maestro()
    m = np.asarray(maestro).astype(np.int16)
    fondo_m = np.array(color_fondo(maestro), dtype=np.int16)
    personaje_m = np.abs(m - fondo_m).max(axis=2) > UMBRAL_PERSONAJE

    ancho, alto = maestro.size
    escala_vista = 0.5
    va, vh = round(ancho * escala_vista), round(alto * escala_vista)
    margen, cabecera = 12, 34
    hoja = Image.new("RGB", (va * 3 + margen * 4, (vh + cabecera + margen) * len(ESTADOS) + margen), "white")
    dibujo = ImageDraw.Draw(hoja)
    f_titulo, f_col = fuente(16), fuente(13)

    fallan: list[str] = []
    print(f"Maestro {ancho}×{alto}. Coincidencia = píxeles con diferencia < {UMBRAL_DIFERENCIA} en RGB.\n")
    print(f"{'variante':10s} {'corrimiento':>12s} {'escala':>7s} {'cuerpo':>7s} {'cuadro':>8s} {'personaje':>10s}")
    for fila, nombre in enumerate(ESTADOS):
        variante = cargar_variante(nombre, (ancho, alto))
        al = alinear(maestro, variante)
        fondo_v = color_fondo(variante)
        v = desplazar(np.asarray(variante), al.dx, al.dy, fondo_v).astype(np.int16)

        diferencia = np.abs(m - v).max(axis=2)
        coincide = diferencia < UMBRAL_DIFERENCIA
        cuadro = float(coincide.mean() * 100)
        personaje = personaje_m | (np.abs(v - np.array(fondo_v, dtype=np.int16)).max(axis=2) > UMBRAL_PERSONAJE)
        solo_personaje = float(coincide[personaje].mean() * 100) if personaje.any() else 0.0

        corrimiento = max(abs(al.dx), abs(al.dy))
        motivos = []
        if nombre in IGUALAR_LUZ:
            if solo_personaje < MINIMO_PERSONAJE:
                motivos.append(f"personaje {solo_personaje:.1f} % < {MINIMO_PERSONAJE:.0f} %")
        elif cuadro < MINIMO_COINCIDENCIA:
            motivos.append(f"coincide {cuadro:.1f} % < {MINIMO_COINCIDENCIA:.0f} %")
        if corrimiento > MAXIMO_CORRIMIENTO:
            motivos.append(f"corrimiento {corrimiento} px > {MAXIMO_CORRIMIENTO}")
        if GESTOS.get(nombre) in COMPLETOS:
            veredicto = "completo: otra pose, va entero"
            motivos = []
        else:
            if motivos:
                fallan.append(nombre)
            veredicto = "FALLA: " + "; ".join(motivos) if motivos else ("ok (luz igualada)" if nombre in IGUALAR_LUZ else "ok")
        print(f"{nombre:10s} {f'({al.dx:+d}, {al.dy:+d})':>12s} {al.escala:7.3f} {al.puntuacion:7.3f} {cuadro:7.1f}% {solo_personaje:9.1f}%  {veredicto}")

        # La fila de la hoja: maestro | variante alineada | diferencia.
        y = margen + fila * (vh + cabecera + margen)
        color = (200, 30, 30) if motivos else (30, 94, 46)
        dibujo.text((margen, y), f"{nombre} → {ESTADOS[nombre]}   {veredicto}", fill=color, font=f_titulo)
        dibujo.text(
            (margen, y + 18),
            f"corrimiento ({al.dx:+d}, {al.dy:+d}) px · escala {al.escala:.3f} · cuerpo {al.puntuacion:.3f} · coincide {cuadro:.1f} % del cuadro, {solo_personaje:.1f} % del personaje",
            fill=(90, 90, 90),
            font=f_col,
        )
        y += cabecera
        hoja.paste(maestro.resize((va, vh), Image.Resampling.LANCZOS), (margen, y))
        hoja.paste(Image.fromarray(v.astype(np.uint8)).resize((va, vh), Image.Resampling.LANCZOS), (margen * 2 + va, y))
        # El mapa: el maestro apagado y, encima, en rojo, lo que no coincide.
        gris = cv2.cvtColor(m.astype(np.uint8), cv2.COLOR_RGB2GRAY)
        mapa = np.stack([gris] * 3, axis=2).astype(np.float32) * 0.35 + 255 * 0.65
        mapa[~coincide] = (224, 40, 40)
        hoja.paste(Image.fromarray(mapa.astype(np.uint8)).resize((va, vh), Image.Resampling.LANCZOS), (margen * 3 + va * 2, y))

    hoja.save(SALIDA, "PNG")
    print(f"\n{SALIDA.relative_to(RIVE.parent.parent)}")
    if fallan:
        print(f"\nFALLAN: {', '.join(fallan)}. Mirá la hoja antes de seguir con los parches.")
        return 1
    print("\nTodas pasan.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
