import { describe, expect, it } from "vitest";
import {
  leerEstado,
  leerHuecosDeProfesor,
  leerListaProfesores,
  leerResultadoCambioProfesor,
  peticionProfesorValida,
} from "@/lib/autoservicio/leer";
import { agruparPorProfesor, cabe, destinosListos, seSolapan } from "@/lib/autoservicio/profesor";
import {
  autoservicioSimulado,
  cambioProfesorSimulado,
  estadoSimulado,
  huecosDeProfesorSimulados,
  listaProfesoresSimulada,
} from "@/lib/autoservicio/simulacion";
import type { HuecoProfesor, SesionOrigen } from "@/lib/autoservicio/tipos";

// «Cambiar de profesor» contra el contrato v2 de Gestión (rama
// fase2-cambio-profesor de academy-scheduler). Los cuerpos de ejemplo son
// los del propio contrato.

const sesion = (dia: SesionOrigen["dia"], hora: string, duracion = 1): SesionOrigen => ({ dia, hora, duracion });

describe("leerEstado: puede_cambiar_profesor", () => {
  const base = { ok: true, elegible: true, motivo_no_elegible: null, detalle_no_elegible: null, profesor: { nombre: "Berta" } };
  const sesiones = [{ id: "Martes_15:00", dia: "Martes", hora: "15:00", duracion: 2, fijo: { movible: true }, proximas_clases: [] }];

  it("el ejemplo del contrato: no puede, por antelación, con fecha", () => {
    const e = leerEstado({
      ...base,
      sesiones,
      puede_cambiar_profesor: { puede: false, motivo: "ANTELACION_INSUFICIENTE", detalle_no_elegible: null, disponible_desde: { fecha: "2026-10-13", hora: "17:00" } },
    });
    expect(e?.cambioProfesor).toEqual({ puede: false, motivo: "ANTELACION_INSUFICIENTE", disponibleDesde: { fecha: "2026-10-13", hora: "17:00" } });
  });

  it("con Gestión en v1 no viene: null, y no se ofrece", () => {
    expect(leerEstado({ ...base, sesiones })?.cambioProfesor).toBeNull();
  });

  it("calendario de SU profesor sin actualizar: sin horario, pero sí cambio de profesor", () => {
    const e = leerEstado({
      ...base,
      elegible: false,
      motivo_no_elegible: "CALENDARIO_SIN_ACTUALIZAR",
      sesiones: [],
      puede_cambiar_profesor: { puede: true, motivo: null, detalle_no_elegible: null, disponible_desde: null },
    });
    expect(e?.elegible).toBe(false);
    expect(e?.cambioProfesor?.puede).toBe(true);
  });

  it("sin `puede` booleano, no se lee", () => {
    expect(leerEstado({ ...base, sesiones, puede_cambiar_profesor: { puede: "sí" } })?.cambioProfesor).toBeNull();
  });
});

describe("leerListaProfesores", () => {
  const contrato = {
    ok: true,
    tipo: "lista",
    sesiones: [
      { dia: "Martes", hora: "15:00", duracion: 2 },
      { dia: "Jueves", hora: "10:00", duracion: 1 },
    ],
    huecos: [
      { profesor: { id: "t15", nombre: "Carla" }, dia: "Lunes", hora: "10:00", duracion: 2, fecha_primera_clase: "2026-10-12" },
      { profesor: { id: "t15", nombre: "Carla" }, dia: "Martes", hora: "19:00", duracion: 2, fecha_primera_clase: "2026-10-13" },
      { profesor: { id: "t8", nombre: "Fran" }, dia: "Viernes", hora: "09:00", duracion: 2, fecha_primera_clase: "2026-10-16" },
    ],
  };

  it("el ejemplo del contrato, en el orden de Gestión", () => {
    const l = leerListaProfesores(contrato)!;
    expect(l.sesiones).toEqual([sesion("Martes", "15:00", 2), sesion("Jueves", "10:00", 1)]);
    expect(l.huecos.map((h) => `${h.profesor.nombre} ${h.dia} ${h.hora}`)).toEqual(["Carla Lunes 10:00", "Carla Martes 19:00", "Fran Viernes 09:00"]);
    expect(l.huecos[0]).toMatchObject({ fecha: null, primeraClase: "2026-10-12", profesor: { id: "t15" } });
  });

  it("una sesión torcida invalida la lista: el cambio tiene que darles destino a todas", () => {
    expect(leerListaProfesores({ ...contrato, sesiones: [...contrato.sesiones, { dia: "Martes", hora: "x" }] })).toBeNull();
  });

  it("un hueco torcido se descarta y el resto sigue", () => {
    const l = leerListaProfesores({ ...contrato, huecos: [...contrato.huecos, { profesor: { id: "t1" }, dia: "Lunes", hora: "10:00", duracion: 1 }] });
    expect(l?.huecos).toHaveLength(3);
  });

  it("un error no es una lista", () => {
    expect(leerListaProfesores({ ok: false, codigo: "NO_ELEGIBLE", mensaje: "No." })).toBeNull();
  });
});

describe("leerHuecosDeProfesor", () => {
  it("el ejemplo del contrato: los huecos de cada sesión, por `indice`", () => {
    const h = leerHuecosDeProfesor({
      ok: true,
      tipo: "profesor",
      profesor: { id: "t15", nombre: "Carla" },
      sesiones: [
        { indice: 1, dia: "Jueves", hora: "10:00", duracion: 1, huecos: [{ profesor: { id: "t15", nombre: "Carla" }, dia: "Miércoles", hora: "18:00", duracion: 1, fecha_primera_clase: "2026-10-14" }] },
        { indice: 0, dia: "Martes", hora: "15:00", duracion: 2, huecos: [{ profesor: { id: "t15", nombre: "Carla" }, dia: "Lunes", hora: "10:00", duracion: 2, fecha_primera_clase: "2026-10-12" }] },
      ],
    })!;
    expect(h.profesor).toEqual({ id: "t15", nombre: "Carla" });
    expect(h.sesiones.map((s) => s.sesion)).toEqual([sesion("Martes", "15:00", 2), sesion("Jueves", "10:00", 1)]);
    expect(h.sesiones[1].huecos[0]).toMatchObject({ dia: "Miércoles", hora: "18:00" });
  });
});

describe("leerResultadoCambioProfesor", () => {
  it("el 200 del contrato: el profesor nuevo y sus sesiones", () => {
    const r = leerResultadoCambioProfesor({
      ok: true,
      profesor_anterior: { nombre: "Berta" },
      profesor_nuevo: { id: "t15", nombre: "Carla" },
      sesiones_antes: [{ dia: "Martes", hora: "15:00", duracion: 2 }],
      sesiones_despues: [{ dia: "Lunes", hora: "10:00", duracion: 2 }],
    });
    expect(r).toEqual({ ok: true, profesorNuevo: "Carla", sesionesDespues: [sesion("Lunes", "10:00", 2)] });
  });

  it("a medias: `a_medias: true`, venga con el código que venga", () => {
    const r = leerResultadoCambioProfesor({ ok: false, codigo: "HUECO_YA_OCUPADO", mensaje: "Algo.", a_medias: true });
    expect(r).toMatchObject({ ok: false, codigo: "A_MEDIAS" });
  });

  it("antelación, con desde cuándo", () => {
    const r = leerResultadoCambioProfesor({ ok: false, codigo: "ANTELACION_INSUFICIENTE", mensaje: "Cerca.", disponible_desde: { fecha: "2026-10-13", hora: "17:00" } });
    expect(r).toEqual({ ok: false, codigo: "ANTELACION_INSUFICIENTE", mensaje: "Cerca.", disponibleDesde: { fecha: "2026-10-13", hora: "17:00" } });
  });

  it("los ocho códigos nuevos se reconocen", () => {
    for (const codigo of [
      "MISMO_PROFESOR",
      "PROFESOR_NO_EXISTE",
      "PROFESOR_ARCHIVADO",
      "PROFESOR_DE_PRUEBA",
      "HORAS_NO_COINCIDEN",
      "ASIGNACION_CAMBIADA",
      "ASIGNACION_INACTIVA",
      "ASIGNACION_NO_EXISTE",
    ]) {
      expect(leerResultadoCambioProfesor({ ok: false, codigo, mensaje: "x" })).toMatchObject({ codigo });
    }
  });

  it("sin `ok: true` explícito no está hecho", () => {
    expect(leerResultadoCambioProfesor({ profesor_nuevo: { nombre: "Carla" } }).ok).toBe(false);
    expect(leerResultadoCambioProfesor(null)).toMatchObject({ ok: false, codigo: "GENERICO" });
  });
});

describe("la petición", () => {
  const buena = { profesorId: "t15", destinos: [sesion("Lunes", "10:00", 2)], idempotencyKey: "c0a8f1e2-0000-4000-8000-000000000000" };

  it("buena, y con el número de sesiones que toca", () => {
    expect(peticionProfesorValida(buena)).toBe(true);
    expect(peticionProfesorValida(buena, 1)).toBe(true);
    expect(peticionProfesorValida(buena, 2)).toBe(false);
  });

  it("un id de profesor raro, sin destinos o sin clave, no sale", () => {
    expect(peticionProfesorValida({ ...buena, profesorId: "t15; drop" })).toBe(false);
    expect(peticionProfesorValida({ ...buena, destinos: [] })).toBe(false);
    expect(peticionProfesorValida({ ...buena, idempotencyKey: "x" })).toBe(false);
    expect(peticionProfesorValida({ ...buena, destinos: [{ dia: "Lunes", hora: "10", duracion: 2 } as SesionOrigen] })).toBe(false);
  });
});

describe("los solapes", () => {
  it("se solapan los que se pisan, no los que se tocan", () => {
    expect(seSolapan(sesion("Lunes", "15:00", 2), sesion("Lunes", "16:00", 2))).toBe(true);
    expect(seSolapan(sesion("Lunes", "15:00", 1), sesion("Lunes", "16:00", 1))).toBe(false);
    expect(seSolapan(sesion("Lunes", "15:00", 2), sesion("Martes", "15:00", 2))).toBe(false);
    expect(seSolapan(sesion("Lunes", "15:00", 1), sesion("Lunes", "15:00", 1))).toBe(true);
  });

  it("un hueco cabe si no pisa lo elegido para OTRA sesión", () => {
    const elegidos = [sesion("Lunes", "10:00", 2), null];
    expect(cabe(sesion("Lunes", "11:00"), 1, elegidos)).toBe(false);
    expect(cabe(sesion("Lunes", "12:00"), 1, elegidos)).toBe(true);
    // Su propio destino no cuenta: se puede cambiar.
    expect(cabe(sesion("Lunes", "11:00", 2), 0, elegidos)).toBe(true);
  });

  it("listos: uno por sesión, con su duración y sin pisarse", () => {
    const sesiones = [sesion("Martes", "18:00", 1), sesion("Jueves", "09:00", 2)];
    expect(destinosListos(sesiones, [sesion("Lunes", "08:00", 1), sesion("Viernes", "10:00", 2)])).toBe(true);
    expect(destinosListos(sesiones, [sesion("Lunes", "08:00", 1), null])).toBe(false);
    expect(destinosListos(sesiones, [sesion("Lunes", "08:00", 1), sesion("Lunes", "08:00", 2)])).toBe(false);
    expect(destinosListos(sesiones, [sesion("Lunes", "08:00", 2), sesion("Viernes", "10:00", 2)])).toBe(false);
  });
});

describe("agruparPorProfesor", () => {
  const h = (id: string, nombre: string, dia: HuecoProfesor["dia"], hora: string): HuecoProfesor => ({
    dia,
    hora,
    duracion: 1,
    fecha: null,
    primeraClase: null,
    profesor: { id, nombre },
  });

  it("en el orden en que llegan, sin reordenar por nombre ni por día", () => {
    const grupos = agruparPorProfesor([h("t8", "Fran", "Viernes", "09:00"), h("t8", "Fran", "Lunes", "10:00"), h("t15", "Carla", "Martes", "12:00")]);
    expect(grupos.map((g) => g.profesor.nombre)).toEqual(["Fran", "Carla"]);
    expect(grupos[0].huecos.map((x) => x.dia)).toEqual(["Viernes", "Lunes"]);
  });

  it("los de un profesor separados se juntan donde apareció primero", () => {
    const grupos = agruparPorProfesor([h("t8", "Fran", "Lunes", "10:00"), h("t15", "Carla", "Martes", "12:00"), h("t8", "Fran", "Jueves", "10:00")]);
    expect(grupos.map((g) => [g.profesor.nombre, g.huecos.length])).toEqual([
      ["Fran", 2],
      ["Carla", 1],
    ]);
  });
});

describe("la simulación del cambio de profesor", () => {
  const lunes = new Date("2026-10-12T10:00:00Z");
  const martes = new Date("2026-10-13T10:00:00Z");

  it("el orden es el mismo todo el día y cambia al siguiente", () => {
    const orden = (d: Date) => agruparPorProfesor(leerListaProfesores(listaProfesoresSimulada(d))!.huecos).map((g) => g.profesor.id);
    expect(orden(lunes)).toEqual(orden(new Date("2026-10-12T20:00:00Z")));
    expect(orden(lunes)).not.toEqual(orden(martes));
  });

  it("la lista es para la duración de su primera sesión, y trae sus dos sesiones", () => {
    const l = leerListaProfesores(listaProfesoresSimulada(lunes))!;
    expect(l.sesiones).toHaveLength(2);
    expect(l.huecos.every((x) => x.duracion === l.sesiones[0].duracion)).toBe(true);
  });

  it("los huecos de un profesor: los de cada sesión, con su duración", () => {
    const h = leerHuecosDeProfesor(huecosDeProfesorSimulados("t21", lunes))!;
    expect(h.sesiones.map((s) => s.huecos.every((x) => x.duracion === s.sesion.duracion))).toEqual([true, true]);
  });

  it("Maribel está archivada", () => {
    expect(huecosDeProfesorSimulados("t24")).toMatchObject({ ok: false, codigo: "PROFESOR_ARCHIVADO" });
  });

  it("el POST: hecho, ocupado, a medias, asignación cambiada y solapes", () => {
    const ok = [sesion("Lunes", "08:00", 1), sesion("Viernes", "10:00", 2)];
    expect(leerResultadoCambioProfesor(cambioProfesorSimulado("t21", ok))).toMatchObject({ ok: true, profesorNuevo: "Daniela" });
    expect(leerResultadoCambioProfesor(cambioProfesorSimulado("t23", [sesion("Sábado", "10:00"), sesion("Jueves", "13:00", 2)]))).toMatchObject({
      codigo: "HUECO_YA_OCUPADO",
    });
    expect(leerResultadoCambioProfesor(cambioProfesorSimulado("t23", [sesion("Miércoles", "20:00"), sesion("Jueves", "13:00", 2)]))).toMatchObject({
      codigo: "A_MEDIAS",
    });
    expect(leerResultadoCambioProfesor(cambioProfesorSimulado("t21", [sesion("Lunes", "08:00"), sesion("Jueves", "17:00", 2)]))).toMatchObject({
      codigo: "ASIGNACION_CAMBIADA",
    });
    expect(leerResultadoCambioProfesor(cambioProfesorSimulado("t21", [sesion("Lunes", "08:00"), sesion("Lunes", "08:00", 2)]))).toMatchObject({
      ok: false,
      codigo: "GENERICO",
    });
  });

  it("calendario sin actualizar: sin horario, con cambio de profesor; PROFESOR_ANTELACION: al revés", () => {
    const sinCalendario = leerEstado(estadoSimulado("CALENDARIO_SIN_ACTUALIZAR", lunes))!;
    expect(sinCalendario.elegible).toBe(false);
    expect(sinCalendario.cambioProfesor?.puede).toBe(true);

    const antelacion = leerEstado(estadoSimulado("PROFESOR_ANTELACION", lunes))!;
    expect(antelacion.elegible).toBe(true);
    expect(antelacion.cambioProfesor).toMatchObject({ puede: false, motivo: "ANTELACION_INSUFICIENTE" });
    expect(antelacion.cambioProfesor?.disponibleDesde).not.toBeNull();
  });

  it("con el cambio bloqueado, el proveedor contesta con el motivo también al pedir huecos", async () => {
    const r = await autoservicioSimulado("RECUPERACION_PENDIENTE").huecosProfesores("prueba");
    expect(r).toEqual({ ok: false, codigo: "RECUPERACION_PENDIENTE" });
  });
});
