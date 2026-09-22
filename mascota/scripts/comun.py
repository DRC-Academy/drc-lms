"""
Lo que comparten los scripts del enfoque «maestro + parches»:
variantes_check.py, base.py y parches.py.

EL ENFOQUE. La mascota es el render maestro (rive/maestro.png) sin
fondo, y cada estado es un parche: lo que cambia entre el maestro y
una variante del mismo render editada con Gemini (rive/variantes/*.jpg).
Para comparar hay que poner cada variante encima del maestro, píxel a
píxel, y de eso se ocupa esto: cargar, escalar a la resolución del
maestro, buscar el corrimiento y quitar el fondo siempre igual.

COORDENADAS. Todo lo que sale a components/mascota/parches.json va
normalizado (0–1) respecto al LIENZO: el recorte del maestro sin fondo
con un 5 % de margen por lado. Es la caja de public/mascota/base.png, y
el componente multiplica por su tamaño.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

MASCOTA = Path(__file__).resolve().parents[1]
RIVE = MASCOTA / "rive"
MAESTRO = RIVE / "maestro.png"
VARIANTES = RIVE / "variantes"
PUBLICO = MASCOTA.parent / "public" / "mascota"
PARCHES_JSON = MASCOTA.parent / "components" / "mascota" / "parches.json"

# Variante → estado del componente. Las variantes se llaman como el
# gesto y los estados como en components/mascota/estados.ts.
ESTADOS: dict[str, str] = {
    "exito": "exito",
    "duda": "duda",
    "animo": "animo",
    "racha": "racha_perdida",
    "nivel": "nivel_superado",
    "estudio": "estudiando",
    "parpadeo": "parpadeo",
}

# Variante → gesto: poses sueltas que el componente pone encima de
# cualquier estado (mascota.gesto("saludo")), no estados. El archivo de
# «señala» lleva eñe; el gesto, no.
GESTOS: dict[str, str] = {
    "saludo": "saludo",
    "señala": "senala",
    "salto": "salto",
    "dormido": "dormido",
    "estira": "estira",
    "piensa": "piensa",
    "asombro": "asombro",
    "mira_izq": "mira_izq",
    "mira_der": "mira_der",
    "sentado": "sentado",
}

# Los gestos que cambian la pose entera: el cuerpo del maestro no está
# donde estaba (salta, se sienta) y no hay corrimiento que lo haga
# calzar, así que no se recortan diferencias. Su parche es el personaje
# entero sin fondo, con el encuadre de base.png, y el componente lo pone
# EN LUGAR del cuerpo y la cola.
COMPLETOS: set[str] = {"salto", "sentado"}

# Todas las variantes, para las comprobaciones.
VARIANTES_TODAS: dict[str, str] = {**ESTADOS, **GESTOS}

MARGEN = 0.05  # del lienzo, por lado, sobre el bbox del maestro sin fondo
UMBRAL_ALFA = 8  # por debajo es ruido del recorte, no personaje

# El cuerpo del maestro que no cambia en ninguna variante: barriga,
# cadera, piernas y pies (x0, y0, x1, y1 en píxeles del maestro). Los
# brazos quedan fuera a propósito: en «éxito» suben. Es la plantilla
# con la que se busca el corrimiento de cada variante.
CUERPO = (460, 255, 570, 500)
BUSQUEDA = 60  # píxeles alrededor del sitio original


# ---------------------------------------------------------------
# CARGA Y ALINEACIÓN
# ---------------------------------------------------------------


def cargar_maestro() -> Image.Image:
    with Image.open(MAESTRO) as im:
        return im.convert("RGB")


def cargar_variante(nombre: str, tamano: tuple[int, int]) -> Image.Image:
    """La variante en RGB, a la resolución del maestro.

    Gemini devuelve el mismo encuadre a otra resolución (1407×768 frente
    a 1024×559: la misma proporción), así que escalar es lo único que
    hace falta antes de buscar el corrimiento.
    """
    with Image.open(VARIANTES / f"{nombre}.jpg") as im:
        variante = im.convert("RGB").resize(tamano, Image.Resampling.LANCZOS)
    if nombre in IGUALAR_LUZ:
        variante = igualar_luz(cargar_maestro().resize(tamano), variante)
    return variante


# Las variantes que Gemini devolvió con otra luz: «asombro» sale entera
# unos 20 niveles más oscura, fondo incluido (200 frente a 239). Sin
# corregir, todo el personaje difiere y el parche sería el cuerpo entero.
IGUALAR_LUZ = {"asombro"}


def igualar_luz(maestro: Image.Image, variante: Image.Image) -> Image.Image:
    """La variante con el color del maestro: por canal, la recta
    (ganancia y desplazamiento) que mejor lleva el CUERPO de la variante
    al del maestro, por mínimos cuadrados. El cuerpo no cambia entre
    variantes y cae en el mismo sitio (el template matching no depende
    del brillo), así que lo que difiera ahí es la luz."""
    x0, y0, x1, y1 = CUERPO
    m = np.asarray(maestro).astype(np.float32)
    v = np.asarray(variante).astype(np.float32)
    salida = np.empty_like(v)
    for c in range(3):
        a, b = m[y0:y1, x0:x1, c].ravel(), v[y0:y1, x0:x1, c].ravel()
        ganancia, desplazamiento = np.polyfit(b, a, 1)
        salida[..., c] = v[..., c] * ganancia + desplazamiento
    return Image.fromarray(np.clip(np.round(salida), 0, 255).astype(np.uint8))


@dataclass(frozen=True)
class Alineacion:
    dx: int  # cuánto se corrió la variante respecto al maestro
    dy: int
    puntuacion: float  # correlación del cuerpo en el sitio elegido (0–1)
    escala: float  # la escala a la que mejor calza el cuerpo (1 = ninguna)


def alinear(maestro: Image.Image, variante: Image.Image) -> Alineacion:
    """Dónde cayó el cuerpo del maestro dentro de la variante.

    Template matching del cuerpo en gris (TM_CCOEFF_NORMED, que ignora
    la diferencia de brillo entre renders), buscando solo a BUSQUEDA
    píxeles del sitio original. Además prueba unas escalas alrededor
    de 1 para decir si la variante viene a otro tamaño; el corrimiento
    que se devuelve es siempre el de escala 1, porque los parches se
    recortan solo trasladando.
    """
    m = cv2.cvtColor(np.asarray(maestro), cv2.COLOR_RGB2GRAY)
    v = cv2.cvtColor(np.asarray(variante), cv2.COLOR_RGB2GRAY)
    x0, y0, x1, y1 = CUERPO
    plantilla = m[y0:y1, x0:x1]
    sx0, sy0 = max(0, x0 - BUSQUEDA), max(0, y0 - BUSQUEDA)
    sx1, sy1 = min(v.shape[1], x1 + BUSQUEDA), min(v.shape[0], y1 + BUSQUEDA)
    zona = v[sy0:sy1, sx0:sx1]

    def mejor(escala: float) -> tuple[float, int, int]:
        if escala == 1.0:
            p = plantilla
        else:
            p = cv2.resize(plantilla, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA)
        if p.shape[0] >= zona.shape[0] or p.shape[1] >= zona.shape[1]:
            return -1.0, 0, 0
        r = cv2.matchTemplate(zona, p, cv2.TM_CCOEFF_NORMED)
        _, valor, _, (mx, my) = cv2.minMaxLoc(r)
        return float(valor), sx0 + mx, sy0 + my

    puntuacion, px, py = mejor(1.0)
    mejor_escala, mejor_valor = 1.0, puntuacion
    for escala in np.arange(0.96, 1.0401, 0.005):
        valor, _, _ = mejor(float(escala))
        if valor > mejor_valor + 0.002:
            mejor_escala, mejor_valor = float(escala), valor
    return Alineacion(px - x0, py - y0, puntuacion, round(mejor_escala, 3))


def desplazar(imagen: np.ndarray, dx: int, dy: int, relleno) -> np.ndarray:
    """La imagen corrida (-dx, -dy): lo que estaba en (x+dx) pasa a (x)."""
    matriz = np.array([[1, 0, -dx], [0, 1, -dy]], dtype=np.float32)
    return cv2.warpAffine(
        imagen, matriz, (imagen.shape[1], imagen.shape[0]), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=relleno
    )


def color_fondo(imagen: Image.Image) -> tuple[int, int, int]:
    """El color del fondo: la mediana del borde de la imagen."""
    a = np.asarray(imagen)
    borde = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    return tuple(int(c) for c in np.median(borde, axis=0))


# ---------------------------------------------------------------
# EL FONDO
# ---------------------------------------------------------------


def sesion_rembg():
    return new_session("u2net")


def sin_fondo(imagen: Image.Image, sesion) -> Image.Image:
    """La imagen en RGBA sin fondo. Mismo modelo y parámetros para todas.

    De rembg se toma SOLO el alfa. Su RGB viene premultiplicado (compone
    sobre negro transparente), y con alfa recto —que es como lo pinta el
    navegador— todo borde con alfa parcial sale con un filete negro. Con
    el RGB original el borde queda con el antialiasado del render.
    """
    salida = remove(imagen.convert("RGBA"), session=sesion, post_process_mask=True)
    if not isinstance(salida, Image.Image):
        raise TypeError("rembg devolvió algo que no es una imagen")
    rgb = imagen.convert("RGB")
    return Image.merge("RGBA", (*rgb.split(), salida.getchannel("A")))


# ---------------------------------------------------------------
# EL LIENZO
# ---------------------------------------------------------------


@dataclass(frozen=True)
class Lienzo:
    """El recorte del maestro sin fondo con margen, en píxeles del maestro."""

    x0: int
    y0: int
    x1: int
    y1: int

    @property
    def ancho(self) -> int:
        return self.x1 - self.x0

    @property
    def alto(self) -> int:
        return self.y1 - self.y0

    def caja(self, x: int, y: int, w: int, h: int) -> dict[str, float]:
        """Una caja en píxeles del maestro, normalizada al lienzo."""
        return {
            "x": round((x - self.x0) / self.ancho, 4),
            "y": round((y - self.y0) / self.alto, 4),
            "ancho": round(w / self.ancho, 4),
            "alto": round(h / self.alto, 4),
        }

    def punto(self, x: float, y: float) -> dict[str, float]:
        return {"x": round((x - self.x0) / self.ancho, 4), "y": round((y - self.y0) / self.alto, 4)}

    def recortar(self, imagen: Image.Image) -> Image.Image:
        return imagen.crop((self.x0, self.y0, self.x1, self.y1))


def lienzo_de(alfa: np.ndarray) -> Lienzo:
    ys, xs = np.where(alfa > UMBRAL_ALFA)
    bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    mx, my = round((bx1 - bx0) * MARGEN), round((by1 - by0) * MARGEN)
    alto, ancho = alfa.shape
    return Lienzo(max(0, bx0 - mx), max(0, by0 - my), min(ancho, bx1 + mx), min(alto, by1 + my))


# ---------------------------------------------------------------
# EL JSON
# ---------------------------------------------------------------


def leer_parches_json() -> dict:
    if PARCHES_JSON.exists():
        return json.loads(PARCHES_JSON.read_text(encoding="utf-8"))
    return {}


def escribir_parches_json(datos: dict) -> None:
    PARCHES_JSON.parent.mkdir(parents=True, exist_ok=True)
    PARCHES_JSON.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------
# LA COLA
#
# La cola se separa del cuerpo para moverla sola. Es la parte del
# maestro sin fondo que cae dentro de este polígono (píxeles del
# maestro, medido a mano sobre rive/maestro.png): por dentro va por el
# hueco de fondo que separa el brazo derecho de la cola —entre x≈618 y
# x≈632 a la altura de la mano—, por abajo sigue el borde de la pierna
# derecha, y por fuera es generoso. El pivote es la base de la cola,
# en la cadera, detrás de la pierna.
# ---------------------------------------------------------------

COLA_POLIGONO: list[tuple[int, int]] = [
    (583, 407), (595, 403), (605, 399), (616, 392), (625, 372), (628, 350), (624, 322),
    (630, 300), (645, 275), (665, 255), (685, 243), (700, 243), (715, 258), (745, 300),
    (745, 480), (600, 480), (586, 468),
]
COLA_PIVOTE = (588, 432)
# Cuánto se mete el cuerpo debajo de la raíz de la cola, para que al
# girar ±5° no asome el borde del corte.
COLA_SOLAPE = 6


def poligono_cola(forma: tuple[int, ...]) -> np.ndarray:
    poligono = np.zeros(forma[:2], dtype=np.uint8)
    cv2.fillPoly(poligono, [np.array(COLA_POLIGONO, dtype=np.int32)], 255)
    return poligono


def mascara_cola(rgb: np.ndarray, alfa: np.ndarray) -> np.ndarray:
    """La cola en el maestro: dentro del polígono, con alfa y con color.

    El color (saturación) descarta la sombra gris del suelo si rembg la
    dejó: la cola es verde y amarilla, saturada. Se dilata unos píxeles
    para no perder el borde antialiasado, que mezcla con el fondo y
    sale desaturado. El alfa se pide alto por lo mismo: la sombra queda
    con alfa bajo, y el borde de la cola que se pierde lo recupera el
    difuminado de base.py.
    """
    poligono = poligono_cola(alfa.shape)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    saturada = (hsv[..., 1] > 60).astype(np.uint8)
    saturada = cv2.dilate(saturada, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    return ((poligono > 0) & (alfa > 60) & (saturada > 0)).astype(np.uint8) * 255
