"use client";

import { useState } from "react";
import AnclaMascota from "@/components/mascota/AnclaMascota";
import VisorEjercicios, { type SucesoVisor } from "@/components/ejercicios/VisorEjercicios";
import { reaccionarEnCurso, reaccionarEnPractica } from "@/components/ejercicios/reaccionesMascota";
import type { EjercicioUnificado } from "@/lib/ejercicio-unificado";
import { ESTADOS_MASCOTA, GESTOS_MASCOTA, type EstadoMascota, type GestoMascota } from "@/components/mascota/estados";
import { INTENSIDADES, estadoVisible, storeMascota, useStoreMascota, type Intensidad } from "@/components/mascota/store";

/**
 * EL TABLERO DE LA MASCOTA.
 *
 * No pinta una mascota propia: la que se ve es la única de la app (la
 * de CapaMascota), y esto son cuatro anclas de prueba, de prioridades 1
 * a 4, que se montan y desmontan con su casilla. Gana la de más
 * prioridad visible; sin ninguna, se va a la percha de abajo a la
 * derecha. Debajo de las anclas hay un tramo alto para bajar hasta que
 * dejen de verse.
 *
 * Cuelga del mismo middleware que el resto, así que pide sesión. Se
 * queda en el repo a propósito: es donde se prueba cada gesto sin
 * tener que provocarlo en el producto. El fondo oscuro es el del banner
 * (banner.fondo): sobre blanco un filete claro no se nota.
 *
 * AL FINAL, UN EJERCICIO FALSO DE CADA FORMA, con el visor de verdad:
 * para ver el cuadro de diálogo (DialogoMascota) sin generar un bloque.
 * «Práctica» los pinta con fases, veredictos del modelo, explicación y
 * pista, y reacciona como un bloque; «Curso», como una lección: sin nada
 * de eso y sin escalada. El ancla del ejercicio es de prioridad 10: con
 * el visor a la vista, la mascota se va ahí.
 */

const NOMBRES_ESTADO: Record<EstadoMascota, string> = {
  idle: "Idle",
  estudiando: "Estudiando",
  exito: "Éxito",
  duda: "Duda",
  animo: "Ánimo",
  racha_perdida: "Racha perdida",
  nivel_superado: "Nivel superado",
};

const NOMBRES_GESTO: Record<GestoMascota, string> = {
  saludo: "Saludo",
  senala: "Señala",
  salto: "Salto",
  dormido: "Dormido",
  estira: "Se estira",
  piensa: "Piensa",
  asombro: "Asombro",
  mira_izq: "Mira a la izquierda",
  mira_der: "Mira a la derecha",
  sentado: "Sentado",
  guino: "Guiño",
};

const NOMBRES_INTENSIDAD: Record<Intensidad, string> = { tranquila: "Tranquila", normal: "Normal", juguetona: "Juguetona" };

/** Las cuatro anclas de prueba: prioridad y alto. */
const ANCLAS = [
  { id: "dev-a", prioridad: 1, tamaño: 120 },
  { id: "dev-b", prioridad: 2, tamaño: 88 },
  { id: "dev-c", prioridad: 3, tamaño: 150 },
  { id: "dev-d", prioridad: 4, tamaño: 200 },
] as const;

/** Estados que se sostienen: se ponen como base de las anclas, no se disparan. */
const DE_BASE: readonly EstadoMascota[] = ["idle", "estudiando", "nivel_superado"];
const DE_PASO = ESTADOS_MASCOTA.filter((e) => !DE_BASE.includes(e));
const VELOCIDADES = [0.5, 1, 2] as const;

/** Lo que el visor pide y un ejercicio de prueba no trae. */
const VACIO: Omit<EjercicioUnificado, "id" | "forma" | "enunciado"> = {
  fase: null,
  apoyo: null,
  opciones: [],
  correctas: [],
  variasCorrectas: false,
  huecos: [],
  respuestas: [],
  pista: null,
  criterios: [],
  modelo: null,
  explicacion: null,
  veredictoAcierto: null,
  veredictoFallo: null,
};

/** Uno de cada forma, como vendrían de un bloque generado. */
const DE_PRACTICA: EjercicioUnificado[] = [
  {
    ...VACIO,
    id: "dev-opciones",
    forma: "opciones",
    fase: "reconocer",
    enunciado: "I've lived here ___ 2019.",
    opciones: ["for", "since", "during", "from"],
    correctas: [1],
    explicacion: "«Since» va con el momento en que empezó algo (2019); «for», con cuánto dura (for five years).",
    veredictoAcierto: "«Since» marca el punto de partida, y 2019 lo es.",
    veredictoFallo: "2019 es un momento, no una duración: ahí va «since».",
  },
  {
    ...VACIO,
    id: "dev-varias",
    forma: "opciones",
    fase: "reconocer",
    enunciado: "¿Cuáles de estas frases están en present perfect?",
    opciones: ["I have finished", "I finished", "She has gone", "They were going"],
    correctas: [0, 2],
    variasCorrectas: true,
    explicacion: "El present perfect se forma con have/has + participio: «have finished», «has gone».",
  },
  {
    ...VACIO,
    id: "dev-huecos",
    forma: "huecos",
    fase: "transformar",
    enunciado: "Yesterday I {{1}} (go) to the cinema and {{2}} (see) a great film.",
    huecos: [["went"], ["saw"]],
    explicacion: "«Yesterday» pide pasado simple: go → went, see → saw. Los dos son irregulares.",
  },
  {
    ...VACIO,
    id: "dev-escritura",
    forma: "escritura",
    fase: "transformar",
    enunciado: "Reescribe la frase en pasiva.",
    apoyo: "They built this bridge in 1890.",
    respuestas: ["This bridge was built in 1890", "This bridge was built in 1890."],
    pista: "Empieza por «This bridge» y usa was + participio.",
    explicacion: "En pasiva, el objeto pasa a sujeto y el verbo va con «be» en el mismo tiempo: built → was built.",
    veredictoFallo: "El sujeto nuevo es el puente, y el verbo lleva «was».",
  },
  {
    ...VACIO,
    id: "dev-libre",
    forma: "libre",
    fase: "producir",
    enunciado: "Cuéntale a un amigo algo que has hecho esta semana.",
    apoyo: "Dos o tres frases, en present perfect o past simple.",
    criterios: ["Usa al menos un verbo en pasado", "Dice cuándo pasó"],
    modelo: "I've started a new course this week. On Monday I went to my first class.",
  },
];

/** Los mismos, como vendrían del curso: sin fases, veredictos, explicación ni pista. */
const DE_CURSO: EjercicioUnificado[] = DE_PRACTICA.filter((e) => e.forma !== "escritura").map((e) => ({
  ...e,
  id: `${e.id}-curso`,
  fase: null,
  apoyo: e.forma === "libre" ? null : e.apoyo,
  pista: null,
  explicacion: null,
  veredictoAcierto: null,
  veredictoFallo: null,
}));

const boton = "rounded-full border border-marca-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-marca-tinta hover:bg-marca-niebla";
const botonElegido = (si: boolean) =>
  `rounded-full px-2.5 py-1 text-[13px] font-semibold ${si ? "bg-marca-tinta text-white" : "bg-marca-niebla text-marca-tinta"}`;

export default function TableroMascota() {
  const [montadas, setMontadas] = useState<Record<string, boolean>>({ "dev-a": true, "dev-b": true, "dev-c": false, "dev-d": false });
  const [base, setBase] = useState<EstadoMascota>("idle");
  const [fondo, setFondo] = useState<"claro" | "oscuro">("claro");

  const store = useStoreMascota((e) => e);
  const visible = estadoVisible(store);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[980px] flex-col gap-6 px-5 py-10">
      <div>
        <h1 className="font-display text-[26px] font-bold text-marca-tinta">Geckonoid · tablero</h1>
        <p className="mt-1 text-[14px] text-marca-gris">
          Ancla activa: <strong className="text-marca-tinta">{store.activa ?? "percha"}</strong> · estado{" "}
          <strong className="text-marca-tinta">{visible}</strong>
          {store.transitorio && " (de paso)"} · gesto <strong className="text-marca-tinta">{store.pose?.nombre ?? "—"}</strong> ·
          intensidad <strong className="text-marca-tinta">{store.intensidad}</strong>
        </p>
      </div>

      {/* LOS MANDOS */}
      <section className="flex flex-col gap-3 text-[13.5px] text-marca-gris">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24">Intensidad</span>
          {INTENSIDADES.map((i) => (
            <button key={i} type="button" aria-pressed={store.intensidad === i} onClick={() => storeMascota.fijarIntensidad(i)} className={botonElegido(store.intensidad === i)}>
              {NOMBRES_INTENSIDAD[i]}
            </button>
          ))}
          <span className="ml-4">Velocidad</span>
          {VELOCIDADES.map((x) => (
            <button key={x} type="button" aria-pressed={store.velocidad === x} onClick={() => storeMascota.fijarVelocidad(x)} className={botonElegido(store.velocidad === x)}>
              {x}×
            </button>
          ))}
          <span className="ml-4">Sueño</span>
          {/* Sin mover el ratón después: cualquier cosa la despierta. */}
          <button type="button" onClick={() => storeMascota.adelantarSueno(90000)} className={boton}>
            +90 s
          </button>
          <button type="button" onClick={() => storeMascota.adelantarSueno(150000)} className={boton}>
            +150 s
          </button>
          <span className="ml-4">Fondo</span>
          {(["claro", "oscuro"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={fondo === f} onClick={() => setFondo(f)} className={botonElegido(fondo === f)}>
              {f === "claro" ? "Claro" : "Oscuro"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24">De paso</span>
          {DE_PASO.map((e) => (
            <button key={e} type="button" onClick={() => storeMascota.dispara(e)} className={boton}>
              {NOMBRES_ESTADO[e]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24">De base</span>
          {DE_BASE.map((e) => (
            <button key={e} type="button" aria-pressed={base === e} onClick={() => setBase(e)} className={botonElegido(base === e)}>
              {NOMBRES_ESTADO[e]}
            </button>
          ))}
          <span className="text-marca-grisSuave">(el de las cuatro anclas)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24">Gesto</span>
          {GESTOS_MASCOTA.map((g) => (
            <button key={g} type="button" onClick={() => storeMascota.gesto(g)} className={boton}>
              {NOMBRES_GESTO[g]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24">Anclas</span>
          {ANCLAS.map((a) => (
            <label key={a.id} className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={montadas[a.id]} onChange={(e) => setMontadas((m) => ({ ...m, [a.id]: e.target.checked }))} />
              {a.id} · p{a.prioridad} · {a.tamaño}px
            </label>
          ))}
        </div>
      </section>

      {/* LAS ANCLAS. Con aire arriba: el salto de «éxito» sube. */}
      <section className={`grid grid-cols-2 gap-4 rounded-[24px] border border-marca-borde p-6 pt-14 min-[700px]:grid-cols-4 ${fondo === "oscuro" ? "bg-banner-fondo" : "bg-white"}`}>
        {ANCLAS.map((a) => (
          <div key={a.id} className="flex min-h-[220px] flex-col items-center justify-end gap-2 rounded-[16px] border border-dashed border-marca-borde p-3">
            {montadas[a.id] && <AnclaMascota id={a.id} prioridad={a.prioridad} tamaño={a.tamaño} estado={base} />}
            <span className={`text-[12px] ${fondo === "oscuro" ? "text-white/70" : "text-marca-gris"}`}>
              {a.id} · p{a.prioridad} {store.activa === a.id && "· activa"}
            </span>
          </div>
        ))}
      </section>

      {/* EL STORE */}
      <section className="grid gap-4 min-[800px]:grid-cols-2">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-marca-grisSuave">Anclas registradas</h2>
          <pre className="mt-2 overflow-x-auto rounded-[12px] bg-marca-niebla p-3 text-[12px] leading-[1.5] text-marca-tinta">
            {Object.values(store.anclas)
              .map((a) => `${a.id.padEnd(16)} p${a.prioridad}  ${a.estado.padEnd(15)} ${a.activa ? "" : "(fuera) "}${a.el ? "" : "(sin hueco)"}`)
              .join("\n") || "—"}
          </pre>
        </div>
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-marca-grisSuave">Eventos</h2>
          <pre className="mt-2 max-h-[260px] overflow-auto rounded-[12px] bg-marca-niebla p-3 text-[12px] leading-[1.5] text-marca-tinta">
            {store.eventos.map((e) => `${new Date(e.t).toLocaleTimeString()}  ${e.tipo.padEnd(10)} ${e.detalle}`).join("\n") || "—"}
          </pre>
        </div>
      </section>

      <EjerciciosDePrueba />

      {/* Para bajar hasta que las anclas dejen de verse y probar la percha. */}
      <div className="flex h-[140vh] items-start justify-center rounded-[24px] border border-dashed border-marca-borde pt-10 text-[13px] text-marca-grisSuave">
        Sin anclas a la vista: la mascota se va a la percha, abajo a la derecha.
      </div>
    </main>
  );
}

/** El visor con los ejercicios falsos, como bloque o como lección. */
function EjerciciosDePrueba() {
  const [modo, setModo] = useState<"practica" | "curso">("practica");
  const [vuelta, setVuelta] = useState(0);
  const reaccionar = modo === "practica" ? reaccionarEnPractica : reaccionarEnCurso;
  const alSuceso = (s: SucesoVisor) => {
    if (s.tipo === "intento") reaccionar(s);
  };
  return (
    <section id="ejercicios" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-marca-gris">
        <h2 className="mr-2 text-[13px] font-bold uppercase tracking-[0.1em] text-marca-grisSuave">Ejercicios de prueba</h2>
        {(["practica", "curso"] as const).map((m) => (
          <button key={m} type="button" aria-pressed={modo === m} onClick={() => { setModo(m); setVuelta((v) => v + 1); }} className={botonElegido(modo === m)}>
            {m === "practica" ? "Práctica" : "Curso"}
          </button>
        ))}
        <button type="button" onClick={() => setVuelta((v) => v + 1)} className={boton}>
          Empezar de nuevo
        </button>
      </div>
      <div className="rounded-[24px] bg-marca-niebla px-4 py-6 min-[900px]:px-8">
        <div className="mx-auto max-w-[696px]">
          <VisorEjercicios
            key={`${modo}-${vuelta}`}
            ejercicios={modo === "practica" ? DE_PRACTICA : DE_CURSO}
            alSuceso={alSuceso}
            cierre={({ aciertos, total, repetir }) => (
              <div className="flex flex-col items-start gap-3">
                <p className="text-[15px] text-marca-tinta">
                  {aciertos} de {total}
                </p>
                <button type="button" onClick={repetir} className={boton}>
                  Repetir
                </button>
              </div>
            )}
          />
        </div>
      </div>
    </section>
  );
}
