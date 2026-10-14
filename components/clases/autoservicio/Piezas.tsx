"use client";

import type { ReactNode } from "react";
import { DIAS_LABORABLES, FRANJAS, agruparHuecos, horaFin, type Franja } from "@/lib/autoservicio/franjas";
import type { DiaSemana } from "@/lib/clases";
import type { HuecoLibre } from "@/lib/autoservicio/tipos";
import type { TextosAutoservicio } from "@/lib/textos/autoservicio";
import { TARJETA } from "@/components/base/Seccion";

// ---------------------------------------------------------------
// LAS PIEZAS DE LOS DOS FLUJOS DE «MIS CLASES»
//
// Las páginas /clases/cambiar-horario y /clases/cambiar-profesor, y la
// tarjeta «Tu horario». Lo que decide cada pieza:
//
//   · BOTONES de 52 px con el texto a 19 px en negrita. El blanco sobre
//     el verde de acción da 3,5:1, que solo es AA en texto grande: por
//     eso no se baja de ahí.
//   · LO ELEGIDO, en verde oscuro (`marca-verdeOsc`, 6:1 con blanco), no
//     en el verde de acción, y con `aria-pressed`.
//   · OBJETIVOS DE 48 px o más, foco visible en todo lo que se pulsa.
//   · El amarillo solo como fondo suave de un aviso, nunca en botones.
// ---------------------------------------------------------------

/** El anillo de foco de todo lo que se pulsa y no es `.btn-verde`. */
export const FOCO =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-marca-verdeOsc";

const BOTON = `inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-[19px] font-bold ${FOCO}`;
export const BOTON_VERDE = `btn-verde ${BOTON}`;
export const BOTON_LINEA = `btn-verde-linea ${BOTON}`;
/** Lo que todavía no se puede pulsar: gris, no verde apagado. */
export const BOTON_APAGADO = `${BOTON} cursor-not-allowed bg-marca-pista text-marca-gris`;

/** Una explicación dentro del flujo. `atencion`: el hueco que se acaba de ocupar. */
export function Aviso({
  children,
  tono = "neutro",
  role,
}: {
  children: ReactNode;
  tono?: "neutro" | "ok" | "atencion";
  role?: "alert" | "status";
}) {
  if (tono === "atencion") {
    return (
      <div role={role} className="flex items-start gap-2.5 rounded-[12px] bg-[#FFF7DB] px-4 py-3.5 text-[16px] leading-[1.45] text-marca-tinta">
        <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="#9A7B00" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        <div>{children}</div>
      </div>
    );
  }
  const colores = tono === "ok" ? "border-marca-verdePalido bg-marca-verdeFondo" : "border-marca-borde bg-marca-niebla";
  return (
    <div role={role} className={`rounded-[12px] border px-4 py-3 text-[15.5px] leading-[1.45] text-marca-tinta ${colores}`}>
      {children}
    </div>
  );
}

/** El globo de WhatsApp, en SVG para no traer una librería por un icono. */
function IconoWhatsApp() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/** El botón a WhatsApp. `principal` cuando es lo único que se puede hacer. */
export function BotonWhatsApp({ href, texto, principal = false }: { href: string; texto: string; principal?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={principal ? BOTON_VERDE : BOTON_LINEA}>
      <IconoWhatsApp />
      {texto}
    </a>
  );
}

/** El bloque discreto del final: «¿No encuentras el horario que buscas?» y el enlace. */
export function PieWhatsApp({ href, pregunta, texto }: { href: string; pregunta: string; texto: string }) {
  return (
    <div className="border-t border-marca-borde pt-3">
      <p className="text-[15px] text-marca-tintaMedia">{pregunta}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex min-h-[48px] items-center gap-2 text-[16px] font-semibold text-marca-verdeOsc hover:text-marca-tinta ${FOCO}`}
      >
        <IconoWhatsApp />
        {texto}
      </a>
    </div>
  );
}

/** La pregunta de cada paso. */
export function TituloPaso({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-display text-[20px] font-bold leading-tight text-marca-tinta min-[900px]:text-[22px]">
      {children}
    </h2>
  );
}

/** El reloj y «Horas de España peninsular». */
export function NotaHora({ texto }: { texto: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[14px] text-marca-gris">
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {texto}
    </p>
  );
}

/** La marca de una opción elegible: un círculo, con la palomita si está elegida. */
export function Marca({ elegida, apagada = false }: { elegida: boolean; apagada?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
        elegida ? "border-marca-verdeOsc bg-marca-verdeOsc" : apagada ? "border-marca-puntoPendiente" : "border-[#A9B8AE]"
      }`}
    >
      {elegida && <Palomita className="h-3.5 w-3.5" color="#fff" grosor={3.4} />}
    </span>
  );
}

export function Palomita({ className, color = "currentColor", grosor = 2.6 }: { className: string; color?: string; grosor?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/**
 * Una tarjeta que se elige: la clase, «solo una clase», una fecha. Con
 * `aria-pressed`, como los chips, para que el lector diga cuál está
 * elegida. Desactivada: en gris, con el motivo debajo.
 */
export function Opcion({
  elegida,
  alPulsar,
  titulo,
  detalle,
  icono,
  desactivada = false,
  grande = false,
}: {
  elegida: boolean;
  alPulsar: () => void;
  titulo: ReactNode;
  detalle?: ReactNode;
  icono?: ReactNode;
  desactivada?: boolean;
  grande?: boolean;
}) {
  const fondo = desactivada
    ? "cursor-default border-dashed border-marca-bordeSuave bg-marca-niebla"
    : elegida
      ? "border-2 border-marca-verdeOsc bg-marca-verdeFondo"
      : "border-[1.5px] border-marca-borde bg-white hover:border-marca-verde";
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={desactivada}
      aria-pressed={desactivada ? undefined : elegida}
      className={`flex w-full items-start gap-3.5 rounded-[16px] border text-left ${grande ? "px-4 py-[18px]" : "min-h-[64px] px-4 py-3.5"} ${fondo} ${FOCO}`}
    >
      {icono ? (
        <span
          aria-hidden
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${elegida ? "bg-white" : "bg-marca-niebla"} ${
            desactivada ? "text-marca-grisTenue" : "text-marca-verdeOsc"
          }`}
        >
          {icono}
        </span>
      ) : (
        <span className="mt-0.5">
          <Marca elegida={elegida} apagada={desactivada} />
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span
          className={`${grande ? "font-display text-[19px]" : "text-[17.5px]"} font-bold leading-snug ${
            desactivada ? "text-marca-gris" : "text-marca-tinta"
          }`}
        >
          {titulo}
        </span>
        {detalle && <span className={`text-[15.5px] leading-snug ${desactivada ? "text-marca-gris" : "text-marca-tintaMedia"}`}>{detalle}</span>}
      </span>
    </button>
  );
}

/** Un chip de filtro: 48 px de alto, `aria-pressed` en el elegido. */
function Chip({ activo, alPulsar, etiqueta, children }: { activo: boolean; alPulsar: () => void; etiqueta?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      aria-label={etiqueta}
      onClick={alPulsar}
      className={`min-h-[48px] min-w-[48px] rounded-full border-[1.5px] px-3.5 text-[16px] font-semibold transition-colors ${FOCO} ${
        activo ? "border-marca-verdeOsc bg-marca-verdeOsc text-white" : "border-marca-borde bg-white text-marca-tinta hover:border-marca-verde"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Los filtros de los huecos: el día (L M X J V S en móvil, el nombre
 * entero en escritorio; el lector oye siempre el nombre) y el momento
 * del día.
 */
export function Filtros({
  t,
  dia,
  franja,
  alElegirDia,
  alElegirFranja,
}: {
  t: TextosAutoservicio;
  dia: DiaSemana | null;
  franja: Franja | null;
  alElegirDia: (d: DiaSemana | null) => void;
  alElegirFranja: (f: Franja | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:flex-wrap min-[900px]:gap-8">
      <div>
        <p id="filtro-dia" className="mb-2 text-[14px] font-semibold text-marca-tintaMedia">
          {t.etiquetaDia}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="filtro-dia">
          <Chip activo={dia === null} alPulsar={() => alElegirDia(null)}>
            {t.cualquierDia}
          </Chip>
          {DIAS_LABORABLES.map((d) => (
            <Chip key={d} activo={dia === d} alPulsar={() => alElegirDia(d)} etiqueta={t.diaSemanal(d)}>
              <span className="min-[900px]:hidden">{t.diaCorto(d)}</span>
              <span className="hidden min-[900px]:inline">{t.diaSemanal(d)}</span>
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p id="filtro-franja" className="mb-2 text-[14px] font-semibold text-marca-tintaMedia">
          {t.etiquetaFranja}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="filtro-franja">
          <Chip activo={franja === null} alPulsar={() => alElegirFranja(null)}>
            {t.cualquierHora}
          </Chip>
          {FRANJAS.map((f) => (
            <Chip key={f} activo={franja === f} alPulsar={() => alElegirFranja(f)}>
              {t.franja[f]}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Los huecos por día (o por fecha, en «solo una clase»), en orden, como
 * chips grandes «10:00–11:00». Dos columnas en móvil, cuatro en
 * escritorio. `elegido` marca el que está puesto con `aria-pressed`.
 */
export function RejillaHuecos<H extends HuecoLibre>({
  huecos,
  t,
  alElegir,
  elegido,
}: {
  huecos: H[];
  t: TextosAutoservicio;
  alElegir: (h: H) => void;
  elegido?: (h: H) => boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {agruparHuecos(huecos).map((g) => {
        const cabecera = g.fecha ? t.diaConFecha(g.fecha) : t.diaSemanal(g.dia);
        const id = `huecos-${g.clave}`;
        return (
          <section key={g.clave} aria-labelledby={id}>
            <h3 id={id} className="mb-2 text-[17px] font-bold text-marca-tinta">
              {cabecera}
            </h3>
            <ul className="grid grid-cols-2 gap-2 min-[900px]:grid-cols-4 min-[900px]:gap-2.5">
              {g.franjas
                .flatMap((f) => f.huecos)
                .map((h) => {
                  const puesto = elegido?.(h) ?? false;
                  return (
                    <li key={`${h.fecha ?? h.dia}-${h.hora}-${h.duracion}`}>
                      <button
                        type="button"
                        onClick={() => alElegir(h)}
                        aria-pressed={elegido ? puesto : undefined}
                        className={`flex min-h-[56px] w-full items-center justify-center rounded-[14px] border-[1.5px] px-2 text-[18px] font-bold transition-colors ${FOCO} ${
                          puesto
                            ? "border-marca-verdeOsc bg-marca-verdeOsc text-white"
                            : "border-marca-borde bg-white text-marca-verdeOsc hover:border-marca-verde hover:bg-marca-verdeFondo"
                        }`}
                      >
                        {h.hora}–{horaFin(h.hora, h.duracion)}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Mientras llegan los huecos: unas formas suaves donde van a estar, sin rueda que gira. */
export function Esqueleto({ texto }: { texto: string }) {
  const hueso = "rounded-[14px] bg-marca-pista";
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        {texto}
      </p>
      <div aria-hidden className="flex flex-col gap-6">
        {[2, 3, 1].map((n, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <div className={`${hueso} h-4 w-24 rounded-[8px]`} />
            <div className="grid grid-cols-2 gap-2 min-[900px]:grid-cols-4">
              {Array.from({ length: n }, (_, k) => (
                <div key={k} className={`${hueso} h-14`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Lo que no se ha podido leer. Si Gestión no contesta: título, «prueba
 * otra vez en un rato», el botón de reintentar y el WhatsApp. Si contesta
 * con un motivo del alumno, solo el motivo y el WhatsApp.
 */
export function PanelNoSePudo({
  t,
  whatsapp,
  titulo,
  texto,
  alReintentar,
  nota,
}: {
  t: TextosAutoservicio;
  whatsapp: string;
  titulo?: string;
  texto: string;
  alReintentar?: () => void;
  nota?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div role="alert" className="flex flex-col gap-3 rounded-[16px] border border-marca-borde bg-white px-5 py-6">
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-marca-niebla text-marca-tintaMedia">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5" />
            <path d="M12 13v3M12 19h.01" />
          </svg>
        </span>
        {titulo && <p className="font-display text-[20px] font-bold leading-snug text-marca-tinta">{titulo}</p>}
        <p className="text-[16px] leading-[1.45] text-marca-tintaMedia">{texto}</p>
        <div className="mt-1.5 flex flex-col gap-2.5">
          {alReintentar && (
            <button type="button" onClick={alReintentar} className={BOTON_VERDE}>
              {t.probarOtraVez}
            </button>
          )}
          <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal={!alReintentar} />
        </div>
      </div>
      {nota && <p className="text-[15px] text-marca-tintaMedia">{nota}</p>}
    </div>
  );
}

/** Los códigos con los que no es el alumno, sino que Gestión no ha contestado: se puede reintentar. */
export function sePuedeReintentar(codigo: string): boolean {
  return codigo === "GENERICO" || codigo === "ERROR_LECTURA" || codigo === "CALENDARIO_ILEGIBLE";
}

/**
 * El cambio a medias: serio pero tranquilo, sin rojo. Solo «Cerrar»: no
 * se ofrece repetir un cambio que ya ha escrito algo.
 */
export function PanelAMedias({ t }: { t: TextosAutoservicio }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-[16px] border-[1.5px] border-marca-tinta bg-white px-5 py-6">
      <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-marca-tinta text-white">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      </span>
      <p className="font-display text-[20px] font-bold leading-snug text-marca-tinta">{t.aMediasTitulo}</p>
      <p className="text-[16.5px] leading-[1.5] text-marca-tintaCuerpo">{t.aMediasTexto}</p>
    </div>
  );
}

/** El rótulo pequeño en mayúsculas de «Antes» y «Después». */
export function Rotulo({ children, verde = false }: { children: ReactNode; verde?: boolean }) {
  return (
    <p className={`text-[13px] font-bold uppercase tracking-[0.06em] ${verde ? "text-marca-verdeOsc" : "text-marca-tintaMedia"}`}>{children}</p>
  );
}

/** «Antes» en gris, una flecha, y «Después» con el borde verde. */
export function AntesDespues({ antes, despues }: { antes: ReactNode; despues: ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1 rounded-[16px] bg-marca-nieblaOscura px-[18px] py-4">{antes}</div>
      <div aria-hidden className="relative z-[1] -my-2.5 flex justify-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-marca-borde bg-white text-marca-verdeOsc">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
        </span>
      </div>
      <div className="flex flex-col gap-1.5 rounded-[16px] border-2 border-marca-verde bg-white p-[18px] shadow-[0_10px_24px_rgba(18,33,26,0.07)]">
        {despues}
      </div>
    </div>
  );
}

/** El final: la palomita verde, sin celebración, el título y lo que pasa ahora. */
export function Hecho({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 pt-4">
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-marca-verde bg-marca-verdeFondo text-marca-verdeOsc">
          <Palomita className="h-[30px] w-[30px]" />
        </span>
        <h2 className="font-display text-[26px] font-bold leading-tight text-marca-tinta">{titulo}</h2>
        <p className="max-w-[340px] text-[17px] leading-[1.45] text-marca-tintaCuerpo">{texto}</p>
      </div>
      {children && <div className={`${TARJETA} flex flex-col gap-2.5 px-[18px] py-4`}>{children}</div>}
    </div>
  );
}

/** Una clave por intento de confirmación. `randomUUID` solo existe en https y localhost. */
export function nuevaClave(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
