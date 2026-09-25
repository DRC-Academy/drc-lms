import { describe, expect, it } from "vitest";
import { calcularPoseMascota, type Rect } from "@/components/mascota/pose";

// La mascota: 86 × 110, con la mano a media altura (y = 555).
const mascota: Rect = { left: 400, top: 500, width: 86, height: 110 };
const vista = { ancho: 1440, alto: 900 };

describe("calcularPoseMascota", () => {
  it("señala a la izquierda lo que está a su izquierda y a su altura", () => {
    const boton = { left: 200, top: 530, width: 120, height: 44 };
    expect(calcularPoseMascota(boton, mascota, vista)).toEqual({ tipo: "senala", lado: "izq" });
  });

  it("señala a la derecha lo que está a su derecha", () => {
    const boton = { left: 560, top: 520, width: 120, height: 44 };
    expect(calcularPoseMascota(boton, mascota, vista)).toEqual({ tipo: "senala", lado: "der" });
  });

  it("no señala sin objetivo ni con uno sin tamaño", () => {
    expect(calcularPoseMascota(null, mascota, vista)).toEqual({ tipo: "neutra" });
    expect(calcularPoseMascota({ left: 100, top: 500, width: 0, height: 0 }, mascota, vista)).toEqual({ tipo: "neutra" });
  });

  it("no señala lo que tiene encima o debajo: no hay pose para eso", () => {
    const encima = { left: 380, top: 200, width: 300, height: 120 };
    const debajo = { left: 300, top: 700, width: 400, height: 60 };
    expect(calcularPoseMascota(encima, mascota, vista)).toEqual({ tipo: "neutra" });
    expect(calcularPoseMascota(debajo, mascota, vista)).toEqual({ tipo: "neutra" });
  });

  it("no señala lo que está pegado a ella o la tapa", () => {
    const pegado = { left: 488, top: 530, width: 100, height: 40 };
    expect(calcularPoseMascota(pegado, mascota, vista)).toEqual({ tipo: "neutra" });
  });

  it("no señala de lado lo que está debajo de ella aunque esté algo desplazado (la pestaña de móvil)", () => {
    const pestaña = { left: 300, top: 625, width: 90, height: 50 };
    expect(calcularPoseMascota(pestaña, mascota, vista)).toEqual({ tipo: "neutra" });
  });

  it("no señala a un lado lo que está mucho más arriba que a un lado", () => {
    const lejosArriba = { left: 300, top: 40, width: 80, height: 40 };
    expect(calcularPoseMascota(lejosArriba, mascota, vista)).toEqual({ tipo: "neutra" });
  });

  it("no señala lo que está fuera de la pantalla", () => {
    const fuera = { left: -300, top: 530, width: 120, height: 44 };
    expect(calcularPoseMascota(fuera, mascota, vista)).toEqual({ tipo: "neutra" });
  });
});
