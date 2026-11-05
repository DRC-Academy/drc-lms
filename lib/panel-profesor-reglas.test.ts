import { describe, expect, it } from "vitest";
import {
  diaEnTexto,
  enunciadoEnCorto,
  esPuntoDeClase,
  filasDeLaPestana,
  nombreDePila,
  ordenarPorProximaClase,
  proximaEnCorto,
  semanaDelCurso,
  sinDatosDeCobro,
  situacionDelProfesor,
  textoUltimoAcceso,
} from "@/lib/panel-profesor-reglas";

const COPIA = "ana@drcacademy.com";

describe("situacionDelProfesor", () => {
  const gestion = { email: COPIA, archivado: false };
  const acceso = { emailNormalizado: COPIA, activo: true };

  it("activo solo con acceso activo y el mismo email", () => {
    expect(situacionDelProfesor(acceso, gestion)).toBe("activo");
  });

  it("sin fila o desactivado: sin acceso, aunque esté archivado", () => {
    expect(situacionDelProfesor(null, gestion)).toBe("sin_acceso");
    expect(situacionDelProfesor({ ...acceso, activo: false }, gestion)).toBe("sin_acceso");
    expect(situacionDelProfesor(null, { ...gestion, archivado: true })).toBe("sin_acceso");
  });

  it("si Gestión dice otro email, bloqueado", () => {
    expect(situacionDelProfesor(acceso, { ...gestion, email: "otra@ejemplo.com" })).toBe("bloqueado_email");
    expect(situacionDelProfesor(acceso, { ...gestion, email: "" })).toBe("bloqueado_email");
  });

  it("archivado o desaparecido de Gestión: no entra", () => {
    expect(situacionDelProfesor(acceso, { ...gestion, archivado: true })).toBe("archivado");
    expect(situacionDelProfesor(acceso, null)).toBe("archivado");
  });
});

describe("filasDeLaPestana", () => {
  const profesor = (teacherId: string, profesor: string, extra: object = {}) => ({
    teacherId,
    profesor,
    email: `${teacherId}@drcacademy.com`,
    archivado: false,
    esPrueba: false,
    ...extra,
  });
  const acceso = (email: string, activo = true) => ({ emailNormalizado: email, activo, invitadoEn: null });

  it("oculta a los archivados, salvo los que siguen con el acceso activado", () => {
    const filas = filasDeLaPestana(
      [profesor("t1", "Uno", { archivado: true }), profesor("t2", "Dos", { archivado: true }), profesor("t3", "Tres")],
      new Map([["t2", acceso("t2@drcacademy.com")]]),
      new Map()
    );
    expect(filas.map((f) => f.teacherId).sort()).toEqual(["t2", "t3"]);
    expect(filas.find((f) => f.teacherId === "t2")?.situacion).toBe("archivado");
  });

  it("un archivado con acceso ya desactivado no sale", () => {
    const filas = filasDeLaPestana(
      [profesor("t1", "Uno", { archivado: true })],
      new Map([["t1", acceso("t1@drcacademy.com", false)]]),
      new Map()
    );
    expect(filas).toEqual([]);
  });

  it("marca a los de prueba", () => {
    const [fila] = filasDeLaPestana([profesor("t1", "Sebastian (test)", { esPrueba: true })], new Map(), new Map());
    expect(fila.esPrueba).toBe(true);
    expect(fila.situacion).toBe("sin_acceso");
  });

  it("ordena: primero lo que pide revisión, luego con alumnos, al final con cero", () => {
    const filas = filasDeLaPestana(
      [profesor("a", "Alba"), profesor("b", "Berta"), profesor("c", "Carla"), profesor("d", "Dora")],
      new Map([["d", acceso("vieja@drcacademy.com")]]),
      new Map([["b", 3], ["c", 1]])
    );
    expect(filas.map((f) => f.profesor)).toEqual(["Dora", "Berta", "Carla", "Alba"]);
    expect(filas[0].situacion).toBe("bloqueado_email");
    expect(filas[0].emailAprobado).toBe("vieja@drcacademy.com");
    expect(filas[3].alumnos).toBe(0);
  });
});

describe("textoUltimoAcceso", () => {
  const ahora = new Date("2026-11-05T12:00:00Z");

  it("en días de Madrid", () => {
    expect(textoUltimoAcceso("2026-11-05T01:00:00Z", ahora)).toBe("Entró hoy");
    // 23:30 UTC ya es el día siguiente en Madrid (UTC+1 en noviembre); 22:30 no.
    expect(textoUltimoAcceso("2026-11-04T23:30:00Z", ahora)).toBe("Entró hoy");
    expect(textoUltimoAcceso("2026-11-04T22:30:00Z", ahora)).toBe("Entró ayer");
    expect(textoUltimoAcceso("2026-11-04T12:00:00Z", ahora)).toBe("Entró ayer");
    expect(textoUltimoAcceso("2026-11-01T12:00:00Z", ahora)).toBe("Entró hace 4 días");
  });

  it("sin dato o ilegible", () => {
    expect(textoUltimoAcceso(null, ahora)).toBe("Aún no ha entrado");
    expect(textoUltimoAcceso("basura", ahora)).toBe("Aún no ha entrado");
  });
});

describe("semanaDelCurso", () => {
  const ahora = new Date("2026-11-05T12:00:00Z");

  it("la primera es la 1 y cambia cada siete días", () => {
    expect(semanaDelCurso(new Date("2026-11-05T09:00:00Z"), ahora)).toBe(1);
    expect(semanaDelCurso(new Date("2026-10-30T09:00:00Z"), ahora)).toBe(1);
    expect(semanaDelCurso(new Date("2026-10-29T09:00:00Z"), ahora)).toBe(2);
  });

  it("una fecha por delante sigue siendo la 1; sin fecha, null", () => {
    expect(semanaDelCurso(new Date("2026-12-01T09:00:00Z"), ahora)).toBe(1);
    expect(semanaDelCurso(null, ahora)).toBeNull();
  });
});

describe("la próxima clase en palabras", () => {
  const ahora = new Date("2026-11-05T12:00:00Z");

  it("hoy, mañana o el día", () => {
    expect(proximaEnCorto("2026-11-05", "18:00", ahora)).toBe("Hoy, 18:00");
    expect(proximaEnCorto("2026-11-06", "09:00", ahora)).toBe("Mañana, 09:00");
    expect(proximaEnCorto("2026-11-12", "18:00", ahora)).toMatch(/jue.*12.*nov.*18:00/);
  });

  it("el día no se corre por la zona horaria", () => {
    expect(diaEnTexto("2026-11-12")).toMatch(/jueves.*12.*noviembre/);
  });
});

describe("ordenarPorProximaClase", () => {
  it("primero quien la tiene antes, sin clase al final, y a igualdad por nombre", () => {
    const filas = [
      { nombre: "Sin clase", empiezaEn: null },
      { nombre: "Zoe", empiezaEn: 200 },
      { nombre: "Ana", empiezaEn: 200 },
      { nombre: "Primero", empiezaEn: 100 },
      { nombre: "Otro sin", empiezaEn: null },
    ];
    expect(ordenarPorProximaClase(filas).map((f) => f.nombre)).toEqual(["Primero", "Ana", "Zoe", "Otro sin", "Sin clase"]);
    expect(filas[0].nombre).toBe("Sin clase");
  });
});

describe("sinDatosDeCobro", () => {
  it("quita la frase entera y deja el resto", () => {
    const texto = "Trabajó el pasado simple. Comentó que quiere cancelar su suscripción. Mejoró la pronunciación.";
    expect(sinDatosDeCobro(texto)).toBe("Trabajó el pasado simple. Mejoró la pronunciación.");
  });

  it.each([
    "Habló del pago de la cuota.",
    "Preguntó por el precio.",
    "Pagó ayer.",
    "Son 50 €.",
    "Pidió la factura.",
    "Mencionó la garantía del plan.",
    "Dejó una valoración de cinco estrellas.",
    "Quiere ampliar el plan.",
    "Tiene un plan de 3 horas.",
  ])("«%s» se va", (frase) => {
    expect(sinDatosDeCobro(frase)).toBe("");
  });

  it("no toca lo que solo se parece", () => {
    const texto = "Planificó su viaje. Hizo un plan de estudio con repaso. Compagina el trabajo.";
    expect(sinDatosDeCobro(texto)).toBe(texto);
  });

  it("vacío o nulo", () => {
    expect(sinDatosDeCobro(null)).toBe("");
    expect(sinDatosDeCobro("   ")).toBe("");
  });
});

describe("esPuntoDeClase", () => {
  it("descarta lo que dice que no hubo clase", () => {
    expect(esPuntoDeClase("No aplica. No se trata de una clase.")).toBe(false);
    expect(esPuntoDeClase("No es posible detectar errores del alumno.")).toBe(false);
    expect(esPuntoDeClase("No procede analizar.")).toBe(false);
    expect(esPuntoDeClase("")).toBe(false);
  });

  it("se queda con lo demás", () => {
    expect(esPuntoDeClase("Preposiciones: 'listen music' en vez de 'listen to music'.")).toBe(true);
    expect(esPuntoDeClase("Nota mucha mejora en los tiempos verbales.")).toBe(true);
  });
});

describe("enunciadoEnCorto y nombreDePila", () => {
  it("quita el HTML, las entidades y recorta", () => {
    expect(enunciadoEnCorto("<p>Choose&nbsp;the <b>right</b> word &amp; go</p>")).toBe("Choose the right word & go");
    const largo = enunciadoEnCorto("a".repeat(300));
    expect(largo.length).toBeLessThanOrEqual(121);
    expect(largo.endsWith("…")).toBe(true);
  });

  it("el nombre de pila", () => {
    expect(nombreDePila("  Ana María  Ruiz ")).toBe("Ana");
    expect(nombreDePila("")).toBe("");
  });
});
