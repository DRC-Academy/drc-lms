import { describe, expect, it } from "vitest";
import {
  aHuecoGestion,
  comoCodigo,
  idSesionValido,
  leerError,
  leerEstado,
  leerHuecos,
  leerResultadoCambio,
  peticionValida,
} from "@/lib/autoservicio/leer";
import { cambioSimulado, escenarioDe, estadoSimulado, huecosSimulados } from "@/lib/autoservicio/simulacion";
import type { PeticionCambio } from "@/lib/autoservicio/tipos";

// Un martes a mediodía en Madrid: el 6 de octubre de 2026.
const AHORA = new Date("2026-10-06T10:00:00Z");

/** El ejemplo de GET estado del contrato, tal cual. */
const ESTADO_DEL_CONTRATO = {
  ok: true,
  elegible: true,
  motivo_no_elegible: null,
  detalle_no_elegible: null,
  profesor: { nombre: "Berta Gómez" },
  sesiones: [
    {
      id: "Martes_15:00",
      dia: "Martes",
      hora: "15:00",
      duracion: 2,
      fijo: { movible: false, motivo_no_movible: "ANTELACION_INSUFICIENTE", disponible_desde: { fecha: "2026-10-13", hora: "17:00" } },
      proximas_clases: [
        { fecha: "2026-10-20", hora: "15:00", duracion: 2, movible: true, motivo_no_movible: null, disponible_desde: null },
        { fecha: "2026-10-13", hora: "15:00", duracion: 2, movible: false, motivo_no_movible: "ANTELACION_INSUFICIENTE", disponible_desde: null },
      ],
    },
  ],
};

describe("comoCodigo", () => {
  it("los códigos con texto propio pasan; el resto del contrato y lo desconocido es GENERICO", () => {
    expect(comoCodigo("HUECO_YA_OCUPADO")).toBe("HUECO_YA_OCUPADO");
    expect(comoCodigo("ERROR_LECTURA")).toBe("ERROR_LECTURA");
    expect(comoCodigo("EN_CURSO")).toBe("EN_CURSO");
    expect(comoCodigo("ERROR_INTERNO")).toBe("GENERICO");
    expect(comoCodigo("NO_AUTORIZADO")).toBe("GENERICO");
    expect(comoCodigo("CONFLICTO_INVENTADO")).toBe("GENERICO");
    expect(comoCodigo(undefined)).toBe("GENERICO");
  });
});

describe("idSesionValido", () => {
  it("«<dia>_<HH:MM>», con tilde; nada más", () => {
    expect(idSesionValido("Miércoles_15:00")).toBe(true);
    expect(idSesionValido("Sábado_09:00")).toBe(true);
    expect(idSesionValido("ses-martes")).toBe(false);
    expect(idSesionValido("miercoles_15:00")).toBe(false);
    expect(idSesionValido("Lunes_9:00")).toBe(false);
    expect(idSesionValido("Lunes_09:00_x")).toBe(false);
    expect(idSesionValido(42)).toBe(false);
  });
});

describe("leerError", () => {
  it("el código del cuerpo, y el mensaje para el log", () => {
    expect(leerError({ ok: false, codigo: "ERROR_LECTURA", mensaje: "No hemos podido…" })).toEqual({
      codigo: "ERROR_LECTURA",
      mensaje: "No hemos podido…",
    });
    expect(leerError(null)).toEqual({ codigo: "GENERICO", mensaje: null });
  });

  it("el cambio a medias se reconoce por su mensaje, venga con el código que venga", () => {
    const aMedias = "Ha habido un problema al guardar el cambio y el equipo ya está avisado. No lo intentes de nuevo: te escribiremos.";
    expect(leerError({ ok: false, codigo: "HUECO_YA_OCUPADO", mensaje: aMedias }).codigo).toBe("A_MEDIAS");
    expect(leerError({ ok: false, codigo: "ERROR_ESCRITURA", a_medias: true }).codigo).toBe("A_MEDIAS");
  });
});

describe("leerEstado", () => {
  it("lee el ejemplo del contrato: profesor, sesión, horario fijo con fecha y clases por fecha", () => {
    const e = leerEstado(ESTADO_DEL_CONTRATO)!;
    expect(e).toMatchObject({ elegible: true, motivoNoElegible: null, profesor: "Berta Gómez" });
    const [s] = e.sesiones;
    expect(s).toMatchObject({ id: "Martes_15:00", dia: "Martes", hora: "15:00", duracion: 2 });
    expect(s.fijo).toEqual({
      movible: false,
      motivo: "ANTELACION_INSUFICIENTE",
      disponibleDesde: { fecha: "2026-10-13", hora: "17:00" },
    });
    expect(s.proximasClases.map((c) => [c.fecha, c.movible])).toEqual([
      ["2026-10-13", false],
      ["2026-10-20", true],
    ]);
    expect(s.proximasClases[0]).toMatchObject({ motivo: "ANTELACION_INSUFICIENTE", disponibleDesde: null });
  });

  it("lee el estado simulado: el fijo del jueves y la marca, con su fecha de desbloqueo", () => {
    const e = leerEstado(estadoSimulado("normal", AHORA))!;
    const [martes, jueves] = e.sesiones;
    expect([martes.id, jueves.id]).toEqual(["Martes_18:00", "Jueves_09:00"]);
    expect(martes.fijo.movible).toBe(true);
    // La primera clase, el jueves 8: ya no se mueve, y el horario fijo cuando acabe.
    expect(jueves.fijo).toMatchObject({ motivo: "ANTELACION_INSUFICIENTE", disponibleDesde: { fecha: "2026-10-08", hora: "11:00" } });
    expect(jueves.proximasClases[0]).toMatchObject({ fecha: "2026-10-08", movible: false, disponibleDesde: null });
    // La tercera en total, el jueves 15: la marca, hasta el lunes 19.
    expect(jueves.proximasClases[1]).toMatchObject({
      fecha: "2026-10-15",
      motivo: "MARCA_PUNTUAL_EXISTENTE",
      disponibleDesde: { fecha: "2026-10-19", hora: "00:00" },
    });
    expect(martes.proximasClases[0]).toMatchObject({ fecha: "2026-10-13", movible: true });
  });

  it("no elegible: el motivo, y un detalle desconocido sigue siendo NO_ELEGIBLE", () => {
    expect(leerEstado(estadoSimulado("RECUPERACION_PENDIENTE", AHORA))).toMatchObject({
      elegible: false,
      motivoNoElegible: "RECUPERACION_PENDIENTE",
      sesiones: [],
    });
    expect(
      leerEstado({ ok: true, elegible: false, motivo_no_elegible: "NO_ELEGIBLE", detalle_no_elegible: "EN_PAUSA", profesor: null, sesiones: [] })
    ).toMatchObject({ elegible: false, motivoNoElegible: "NO_ELEGIBLE", profesor: "" });
  });

  it("descarta lo torcido; sin `movible: true` no se mueve; sin sesiones no es elegible", () => {
    const sesion = ESTADO_DEL_CONTRATO.sesiones[0];
    const e = leerEstado({
      ...ESTADO_DEL_CONTRATO,
      sesiones: [
        { ...sesion, id: "ses-1" },
        { ...sesion, fijo: undefined, proximas_clases: [{ fecha: "2026-10-20", hora: "15:00", duracion: 2 }] },
      ],
    })!;
    expect(e.sesiones).toHaveLength(1);
    expect(e.sesiones[0].fijo).toEqual({ movible: false, motivo: "GENERICO", disponibleDesde: null });
    expect(e.sesiones[0].proximasClases[0].movible).toBe(false);

    expect(leerEstado({ ...ESTADO_DEL_CONTRATO, sesiones: [{ ...sesion, dia: "martes" }] })).toMatchObject({
      elegible: false,
      motivoNoElegible: "GENERICO",
    });
  });

  it("un error, o sin `elegible`, no es un estado", () => {
    expect(leerEstado(estadoSimulado("ERROR_LECTURA", AHORA))).toBeNull();
    expect(leerError(estadoSimulado("ERROR_LECTURA", AHORA)).codigo).toBe("ERROR_LECTURA");
    expect(leerEstado({ profesor: { nombre: "Laura" } })).toBeNull();
  });
});

describe("leerHuecos", () => {
  it("el ejemplo del contrato, en puntual: cada hueco con su fecha", () => {
    const huecos = leerHuecos(
      {
        ok: true,
        modo: "puntual",
        sesion: { id: "Martes_15:00", dia: "Martes", hora: "15:00", duracion: 2 },
        fecha_origen: "2026-10-20",
        huecos: [
          { dia: "Jueves", hora: "10:00", duracion: 2, fecha: "2026-10-15" },
          { dia: "Jueves", hora: "10:00", duracion: 2, fecha: "2026-10-22" },
          { dia: "Jueves", hora: "12:00", duracion: 2 },
        ],
      },
      "puntual"
    )!;
    expect(huecos.map((h) => h.fecha)).toEqual(["2026-10-15", "2026-10-22"]);
  });

  it("en fijo el hueco es semanal y la fecha es la primera clase", () => {
    const fijos = leerHuecos(huecosSimulados("fijo", "Jueves_09:00", AHORA), "fijo")!;
    expect(fijos.every((h) => h.fecha === null && h.primeraClase !== null && h.duracion === 2)).toBe(true);
    expect(fijos.some((h) => h.hora === "21:00")).toBe(false);
    expect(new Set(fijos.map((h) => `${h.dia} ${h.hora}`)).size).toBe(fijos.length);
  });

  it("un error no es una lista", () => {
    expect(leerHuecos({ ok: false, codigo: "ANTELACION_INSUFICIENTE", mensaje: "…" }, "puntual")).toBeNull();
    expect(leerHuecos(huecosSimulados("fijo", "ses-martes", AHORA), "fijo")).toBeNull();
  });
});

describe("leerResultadoCambio", () => {
  it("solo un ok: true explícito es un cambio hecho, con la primera clase si viene", () => {
    expect(leerResultadoCambio({ ok: true, modo: "fijo", fecha_original: null, fecha_nueva: "2026-10-15" })).toEqual({
      ok: true,
      fechaNueva: "2026-10-15",
    });
    expect(leerResultadoCambio({})).toEqual({ ok: false, codigo: "GENERICO", mensaje: null });
    expect(leerResultadoCambio(null)).toEqual({ ok: false, codigo: "GENERICO", mensaje: null });
  });

  it("los errores simulados salen con su código", () => {
    const codigo = (destino: { dia: string; hora: string }, modo: "fijo" | "puntual" = "fijo", origen: string | null = null) => {
      const r = leerResultadoCambio(cambioSimulado(modo, origen, destino, AHORA));
      return r.ok ? "ok" : r.codigo;
    };
    expect(codigo({ dia: "Sábado", hora: "10:00" })).toBe("HUECO_YA_OCUPADO");
    expect(codigo({ dia: "Lunes", hora: "13:00" })).toBe("EN_CURSO");
    expect(codigo({ dia: "Miércoles", hora: "20:00" })).toBe("A_MEDIAS");
    expect(codigo({ dia: "Viernes", hora: "18:00" })).toBe("GENERICO");
    expect(codigo({ dia: "Lunes", hora: "09:00" }, "puntual", "2026-10-08")).toBe("ANTELACION_INSUFICIENTE");
    expect(codigo({ dia: "Lunes", hora: "09:00" }, "puntual", "2026-10-15")).toBe("MARCA_PUNTUAL_EXISTENTE");
    expect(codigo({ dia: "Lunes", hora: "09:00" })).toBe("ok");
  });
});

describe("la petición", () => {
  const destino = { dia: "Lunes" as const, hora: "09:00", duracion: 1, fecha: null, primeraClase: "2026-10-12" };
  const base: PeticionCambio = {
    modo: "fijo",
    sesionOrigen: { dia: "Martes", hora: "18:00", duracion: 1 },
    fechaOrigen: null,
    destino,
    idempotencyKey: "0f8b3c2e-aaaa",
  };

  it("el destino vuelve tal cual llegó: en fijo, con la primera clase como fecha", () => {
    expect(aHuecoGestion(destino)).toEqual({ dia: "Lunes", hora: "09:00", duracion: 1, fecha: "2026-10-12" });
    expect(aHuecoGestion({ ...destino, fecha: "2026-10-19", primeraClase: null })).toEqual({
      dia: "Lunes",
      hora: "09:00",
      duracion: 1,
      fecha: "2026-10-19",
    });
  });

  it("el cambio fijo, sin fecha de origen y con la misma duración", () => {
    expect(peticionValida(base)).toBe(true);
    expect(peticionValida({ ...base, fechaOrigen: "2026-10-13" })).toBe(false);
    expect(peticionValida({ ...base, destino: { ...destino, duracion: 2 } })).toBe(false);
    expect(peticionValida({ ...base, sesionOrigen: { dia: "martes" as never, hora: "18:00", duracion: 1 } })).toBe(false);
  });

  it("el puntual necesita la fecha de origen y un destino con fecha", () => {
    const puntual = { ...base, modo: "puntual" as const, destino: { ...destino, primeraClase: null } };
    expect(peticionValida({ ...puntual, fechaOrigen: "2026-10-13" })).toBe(false);
    expect(peticionValida({ ...puntual, fechaOrigen: "2026-10-13", destino: { ...puntual.destino, fecha: "2026-10-12" } })).toBe(true);
  });
});

describe("escenarioDe", () => {
  it("«1» es el normal; los bloqueos por su nombre; lo demás, sin simulación", () => {
    expect(escenarioDe("1")).toBe("normal");
    expect(escenarioDe("NO_ELEGIBLE")).toBe("NO_ELEGIBLE");
    expect(escenarioDe("ERROR_LECTURA")).toBe("ERROR_LECTURA");
    expect(escenarioDe("")).toBeNull();
    expect(escenarioDe("true")).toBeNull();
    expect(escenarioDe(undefined)).toBeNull();
  });
});
