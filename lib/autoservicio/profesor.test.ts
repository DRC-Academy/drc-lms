import { describe, expect, it } from "vitest";
import { leerElegidos, leerEstado, leerHorariosProfesor, leerResultadoCambioProfesor, peticionProfesorValida } from "@/lib/autoservicio/leer";
import { cambiarDesde, chocan, destinosListos, elegidosValidos, elegir, horariosQueValen, siguienteSesion } from "@/lib/autoservicio/profesor";
import { autoservicioSimulado, cambioProfesorSimulado, estadoSimulado, horariosProfesorSimulados } from "@/lib/autoservicio/simulacion";
import type { SesionOrigen } from "@/lib/autoservicio/tipos";

// «Cambiar de profesor» contra el contrato v3 de Gestión (rama
// cambio-profesor-sin-eleccion de academy-scheduler): el alumno elige
// horarios, nunca profesores, y Gestión le asigna uno al confirmar.

const sesion = (dia: SesionOrigen["dia"], hora: string, duracion = 1): SesionOrigen => ({ dia, hora, duracion });

/** Los nombres de los profesores de la simulación: ninguno puede salir antes de confirmar. */
const NOMBRES = ["Daniela", "Ignacio", "Sol", "Bruno", "Maribel", "Laura"];

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

  it("una sesión de 5 horas se lee (planes de hasta 5 h)", () => {
    const cinco = [{ ...sesiones[0], duracion: 5 }];
    expect(leerEstado({ ...base, sesiones: cinco })?.sesiones[0]?.duracion).toBe(5);
  });
});

describe("leerHorariosProfesor", () => {
  const cuerpo = {
    ok: true,
    sesiones: [
      { dia: "Martes", hora: "15:00", duracion: 2 },
      { dia: "Jueves", hora: "10:00", duracion: 1 },
    ],
    siguiente: { indice: 1, duracion: 1 },
    elegidos_disponibles: true,
    horarios: [
      { dia: "Lunes", hora: "10:00", duracion: 1, fecha_primera_clase: "2026-10-19" },
      { dia: "Miércoles", hora: "18:00", duracion: 1, fecha_primera_clase: "2026-10-14" },
    ],
  };

  it("sus sesiones, y los horarios de la siguiente, semanales con su primera clase", () => {
    expect(leerHorariosProfesor(cuerpo)).toEqual({
      sesiones: [sesion("Martes", "15:00", 2), sesion("Jueves", "10:00", 1)],
      elegidosDisponibles: true,
      horarios: [
        { ...sesion("Lunes", "10:00"), fecha: null, primeraClase: "2026-10-19" },
        { ...sesion("Miércoles", "18:00"), fecha: null, primeraClase: "2026-10-14" },
      ],
    });
  });

  it("si Gestión mandara un profesor con un horario, no pasa", () => {
    const conProfesor = { ...cuerpo, horarios: cuerpo.horarios.map((h) => ({ ...h, profesor: { id: "t15", nombre: "Carla" } })) };
    const leidos = leerHorariosProfesor(conProfesor)!.horarios;
    expect(JSON.stringify(leidos)).not.toMatch(/Carla|t15|profesor/);
    expect(Object.keys(leidos[0]).sort()).toEqual(["dia", "duracion", "fecha", "hora", "primeraClase"]);
  });

  it("solo los de la duración de la sesión siguiente", () => {
    const mezcla = { ...cuerpo, horarios: [...cuerpo.horarios, { dia: "Viernes", hora: "09:00", duracion: 2, fecha_primera_clase: "2026-10-16" }] };
    expect(leerHorariosProfesor(mezcla)!.horarios.map((h) => h.dia)).toEqual(["Lunes", "Miércoles"]);
  });

  it("con todas elegidas (`siguiente: null`), sin horarios", () => {
    expect(leerHorariosProfesor({ ...cuerpo, siguiente: null })!.horarios).toEqual([]);
  });

  it("lo elegido ya no lo cubre nadie", () => {
    expect(leerHorariosProfesor({ ...cuerpo, elegidos_disponibles: false })!.elegidosDisponibles).toBe(false);
  });

  it("una sesión torcida invalida la respuesta; un error no es una respuesta", () => {
    expect(leerHorariosProfesor({ ...cuerpo, sesiones: [...cuerpo.sesiones, { dia: "Jueves" }] })).toBeNull();
    expect(leerHorariosProfesor({ ok: false, codigo: "NO_ELEGIBLE" })).toBeNull();
  });
});

describe("leerResultadoCambioProfesor", () => {
  it("el 200 de v3: el profesor asignado en `profesor.nombre`, y sus sesiones", () => {
    const r = leerResultadoCambioProfesor({
      ok: true,
      profesor: { nombre: "Carla" },
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

  it("los de su asignación se reconocen; los de «ese profesor no vale» de v2 ya son GENERICO", () => {
    for (const codigo of ["HORAS_NO_COINCIDEN", "ASIGNACION_CAMBIADA", "ASIGNACION_INACTIVA", "ASIGNACION_NO_EXISTE"]) {
      expect(leerResultadoCambioProfesor({ ok: false, codigo, mensaje: "x" })).toMatchObject({ codigo });
    }
    for (const codigo of ["MISMO_PROFESOR", "PROFESOR_NO_EXISTE", "PROFESOR_ARCHIVADO", "PROFESOR_DE_PRUEBA"]) {
      expect(leerResultadoCambioProfesor({ ok: false, codigo, mensaje: "x" })).toMatchObject({ codigo: "GENERICO" });
    }
  });

  it("sin `ok: true` explícito no está hecho", () => {
    expect(leerResultadoCambioProfesor({ profesor: { nombre: "Carla" } }).ok).toBe(false);
    expect(leerResultadoCambioProfesor(null)).toMatchObject({ ok: false, codigo: "GENERICO" });
  });
});

describe("la petición y los elegidos", () => {
  const buena = { destinos: [sesion("Lunes", "10:00", 2)], idempotencyKey: "c0a8f1e2-0000-4000-8000-000000000000" };

  it("buena, sin profesor, y con el número de sesiones que toca", () => {
    expect(peticionProfesorValida(buena)).toBe(true);
    expect(peticionProfesorValida(buena, 1)).toBe(true);
    expect(peticionProfesorValida(buena, 2)).toBe(false);
  });

  it("sin destinos, sin clave o con un destino torcido, no sale", () => {
    expect(peticionProfesorValida({ ...buena, destinos: [] })).toBe(false);
    expect(peticionProfesorValida({ ...buena, idempotencyKey: "x" })).toBe(false);
    expect(peticionProfesorValida({ ...buena, destinos: [{ dia: "Lunes", hora: "10", duracion: 2 } as SesionOrigen] })).toBe(false);
  });

  it("los elegidos del navegador se rearman campo a campo; lo torcido, fuera", () => {
    expect(leerElegidos([{ dia: "Lunes", hora: "10:00", duracion: 2, profesor: "t15" }])).toEqual([sesion("Lunes", "10:00", 2)]);
    expect(leerElegidos([])).toEqual([]);
    expect(leerElegidos([{ dia: "Lunes", hora: "10:00", duracion: 6 }])).toBeNull();
    expect(leerElegidos("[]")).toBeNull();
  });
});

describe("chocan: la regla de Gestión", () => {
  it("chocan los que se pisan y los que van seguidos (serían una sola clase)", () => {
    expect(chocan(sesion("Lunes", "15:00", 2), sesion("Lunes", "16:00", 2))).toBe(true);
    expect(chocan(sesion("Lunes", "15:00"), sesion("Lunes", "16:00"))).toBe(true);
    expect(chocan(sesion("Lunes", "16:00"), sesion("Lunes", "15:00"))).toBe(true);
    expect(chocan(sesion("Lunes", "15:00"), sesion("Lunes", "17:00"))).toBe(false);
    expect(chocan(sesion("Lunes", "15:00"), sesion("Martes", "15:00"))).toBe(false);
  });
});

describe("el flujo: de una en una, en orden", () => {
  const sesiones = [sesion("Martes", "18:00", 1), sesion("Jueves", "09:00", 2), sesion("Viernes", "18:00", 1)];
  const a = sesion("Lunes", "10:00", 1);
  const b = sesion("Miércoles", "10:00", 2);
  const c = sesion("Sábado", "11:00", 1);

  it("toca la siguiente sin elegir; con todas, ninguna", () => {
    expect(siguienteSesion(sesiones, [])).toBe(0);
    expect(siguienteSesion(sesiones, [a, b])).toBe(2);
    expect(siguienteSesion(sesiones, [a, b, c])).toBeNull();
  });

  it("solo está listo con TODAS elegidas, cada una de su duración y sin chocar", () => {
    expect(destinosListos(sesiones, [a, b])).toBe(false);
    expect(destinosListos(sesiones, [a, b, c])).toBe(true);
    expect(destinosListos(sesiones, [b, a, c])).toBe(false);
    expect(destinosListos(sesiones, [a, b, sesion("Lunes", "11:00")])).toBe(false);
    expect(elegidosValidos(sesiones, [a, b, c, c])).toBe(false);
  });

  it("cambiar una ya elegida deshace esa y las de detrás", () => {
    const todas = elegir(elegir(elegir([], a), b), c);
    expect(cambiarDesde(todas, 1)).toEqual([a]);
    expect(cambiarDesde(todas, 0)).toEqual([]);
  });

  it("no se fía: fuera los de otra duración y los que chocan con lo elegido", () => {
    const lista = [sesion("Lunes", "11:00", 2), sesion("Martes", "10:00", 2), sesion("Martes", "12:00", 1)];
    expect(horariosQueValen(sesiones[1], [a], lista)).toEqual([sesion("Martes", "10:00", 2)]);
  });
});

describe("la simulación de Gestión", () => {
  const lunes = new Date("2026-10-12T10:00:00Z");

  it("sin elegidos: los horarios de la primera clase (1 h), sin repetir y sin profesor", () => {
    const h = leerHorariosProfesor(horariosProfesorSimulados([], { ahora: lunes }))!;
    expect(h.sesiones).toEqual([sesion("Martes", "18:00", 1), sesion("Jueves", "09:00", 2)]);
    expect(h.horarios.every((x) => x.duracion === 1)).toBe(true);
    const claves = h.horarios.map((x) => `${x.dia} ${x.hora}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("con un elegido, solo lo que el MISMO profesor puede cubrir junto con él", () => {
    // El lunes a las 8:00 solo lo tiene Daniela: sus bloques de 2 h que no chocan.
    const h = leerHorariosProfesor(horariosProfesorSimulados([sesion("Lunes", "08:00")], { ahora: lunes }))!;
    expect(h.horarios.map((x) => `${x.dia} ${x.hora}`)).toEqual(["Martes 20:00", "Jueves 17:00", "Viernes 10:00"]);
  });

  it("callejón: el lunes a las 21:00 deja sin nadie para la clase de 2 horas", () => {
    const h = leerHorariosProfesor(horariosProfesorSimulados([sesion("Lunes", "21:00")], { ahora: lunes }))!;
    expect(h).toMatchObject({ elegidosDisponibles: true, horarios: [] });
  });

  it("un elegido que ya no tiene nadie libre", () => {
    expect(leerHorariosProfesor(horariosProfesorSimulados([sesion("Domingo", "10:00")], { ahora: lunes }))!.elegidosDisponibles).toBe(false);
  });

  it("el POST asigna profesor; ocupado, a medias, asignación cambiada, nadie para todo y choques", () => {
    const lee = (d: SesionOrigen[]) => leerResultadoCambioProfesor(cambioProfesorSimulado(d));
    expect(lee([sesion("Lunes", "08:00"), sesion("Viernes", "10:00", 2)])).toMatchObject({ ok: true, profesorNuevo: "Daniela" });
    expect(lee([sesion("Sábado", "10:00"), sesion("Jueves", "13:00", 2)])).toMatchObject({ codigo: "HUECO_YA_OCUPADO" });
    expect(lee([sesion("Miércoles", "20:00"), sesion("Jueves", "13:00", 2)])).toMatchObject({ codigo: "A_MEDIAS" });
    expect(lee([sesion("Lunes", "08:00"), sesion("Jueves", "17:00", 2)])).toMatchObject({ codigo: "ASIGNACION_CAMBIADA" });
    expect(lee([sesion("Lunes", "21:00"), sesion("Martes", "12:00", 2)])).toMatchObject({ codigo: "SLOT_NO_DISPONIBLE" });
    expect(lee([sesion("Lunes", "08:00"), sesion("Lunes", "09:00", 2)])).toMatchObject({ ok: false, codigo: "GENERICO" });
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

  it("con el cambio bloqueado, el proveedor contesta con el motivo también al pedir horarios", async () => {
    const r = await autoservicioSimulado("RECUPERACION_PENDIENTE").horariosProfesor("prueba", []);
    expect(r).toEqual({ ok: false, codigo: "RECUPERACION_PENDIENTE" });
  });
});

describe("ningún nombre de profesor antes de confirmar", () => {
  it("en todo el recorrido de la simulación, ni en lo que manda Gestión ni en lo que lee la pantalla", () => {
    const lunes = new Date("2026-10-12T10:00:00Z");
    // Cada horario posible para la primera clase, y todos los de la segunda con él.
    const primeros = leerHorariosProfesor(horariosProfesorSimulados([], { ahora: lunes }))!.horarios;
    expect(primeros.length).toBeGreaterThan(0);
    for (const p of [null, ...primeros]) {
      const crudo = horariosProfesorSimulados(p ? [p] : [], { ahora: lunes });
      for (const texto of [JSON.stringify(crudo), JSON.stringify(leerHorariosProfesor(crudo))]) {
        expect(texto).not.toMatch(/profesor/i);
        for (const nombre of NOMBRES) expect(texto).not.toContain(nombre);
      }
    }
  });

  it("el nombre llega por primera vez en la respuesta del cambio", async () => {
    const r = await autoservicioSimulado("normal").cambiarProfesor("prueba", {
      destinos: [sesion("Lunes", "08:00"), sesion("Viernes", "10:00", 2)],
      idempotencyKey: "c0a8f1e2-0000-4000-8000-000000000000",
    });
    expect(r).toMatchObject({ ok: true, profesorNuevo: "Daniela" });
  });
});
