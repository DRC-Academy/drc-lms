"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FAQ, buscar, enlaceSoporte, preguntaPorId } from "@/lib/faq";

/**
 * LA AYUDA DEL ALUMNO. Un buscador de FAQ con forma de conversación.
 *
 * NO HAY MODELO DETRÁS Y ES A PROPÓSITO. Todo lo que se lee aquí está
 * escrito por una persona y vive en `lib/faq.ts`; esto solo lo busca y
 * lo enseña. Una ayuda que improvisa una política de cancelación que no
 * existe cuesta más de lo que ahorra, y aquí el suelo es claro: lo que
 * no está escrito acaba en WhatsApp, no en una respuesta inventada.
 *
 * FORMA DE CHAT, NO DE ACORDEÓN. Un desplegable con 35 preguntas obliga
 * a leerlas todas para descartar 34; la conversación va estrechando —
 * categoría, pregunta, respuesta— y deja hablar a quien prefiere
 * escribir. Es la misma información con dos caminos para llegar.
 *
 * CADA RESPUESTA PREGUNTA SI HA SERVIDO, y el "no" no es una encuesta:
 * es la puerta a soporte. Sin eso, quien no encuentra lo que busca cierra
 * el panel y escribe por su cuenta, o peor, no escribe.
 *
 * EL MENSAJE DE WHATSAPP VA PRERRELLENADO con quién escribe, desde qué
 * pantalla y qué buscaba. Cada conversación de soporte empezaba con dos
 * preguntas nuestras antes de poder ayudar en nada.
 *
 * A 375px OCUPA LA PANTALLA ENTERA. Una burbuja de 300px con una lista
 * de preguntas dentro no se puede usar con el pulgar; a partir de 640
 * vuelve a ser un panel flotante, que ahí sí hay sitio para las dos
 * cosas a la vez.
 */

/** El contenido de un mensaje. La conversación es una lista de estos. */
type Mensaje =
  | { id: number; de: "alumno"; texto: string }
  | { id: number; de: "bot"; tipo: "texto"; texto: string }
  | { id: number; de: "bot"; tipo: "categorias"; texto: string }
  | { id: number; de: "bot"; tipo: "preguntas"; texto: string; ids: string[] }
  | { id: number; de: "bot"; tipo: "respuesta"; idPregunta: string; util: "si" | "no" | null }
  | { id: number; de: "bot"; tipo: "soporte"; texto: string; asunto: string };

/**
 * Un mensaje antes de tener número.
 *
 * `Omit` a secas sobre una unión se queda con las claves COMUNES a todas
 * las variantes —aquí, solo `de`— y entonces ningún mensaje concreto
 * encaja. Repartirlo con un condicional lo aplica variante a variante,
 * que es lo que hace falta para poder pasarle uno cualquiera a `anadir`.
 */
type SinId<T> = T extends unknown ? Omit<T, "id"> : never;

const SALUDO = "¡Hola! Soy la ayuda de DRC Academy. ¿Sobre qué necesitas una mano?";

export default function ChatAyuda({ nombre }: { nombre: string }) {
  const ruta = usePathname() ?? "/";

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [consulta, setConsulta] = useState("");

  const lanzador = useRef<HTMLButtonElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const fin = useRef<HTMLDivElement>(null);
  const siguienteId = useRef(0);

  const anadir = useCallback((...nuevos: SinId<Mensaje>[]) => {
    setMensajes((previos) => [
      ...previos,
      ...(nuevos.map((m) => ({ ...m, id: ++siguienteId.current })) as Mensaje[]),
    ]);
  }, []);

  // ---------------------------------------------------------------
  // ABRIR Y CERRAR
  //
  // Al abrir por primera vez se siembra el saludo y las categorías. La
  // conversación NO se borra al cerrar: quien vuelve a abrir a los diez
  // segundos porque le ha entrado otra duda no tiene por qué empezar de
  // cero.
  // ---------------------------------------------------------------
  function abrir() {
    setAbierto(true);
    if (mensajes.length === 0) {
      anadir({ de: "bot", tipo: "categorias", texto: SALUDO });
    }
  }

  const cerrar = useCallback(() => {
    setAbierto(false);
    // El foco vuelve de donde salió: si no, quien navega con teclado
    // acaba al principio de la página después de cerrar.
    lanzador.current?.focus();
  }, []);

  // Escape cierra, esté el foco donde esté dentro del panel.
  useEffect(() => {
    if (!abierto) return;

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        cerrar();
      }
    }

    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierto, cerrar]);

  // Al abrir, el foco al buscador: es lo primero que hace quien ya sabe
  // lo que quiere preguntar.
  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  // Cada mensaje nuevo trae la vista consigo.
  useEffect(() => {
    if (abierto) fin.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [mensajes, abierto]);

  // ---------------------------------------------------------------
  // LOS CAMINOS DE LA CONVERSACIÓN
  // ---------------------------------------------------------------

  function elegirCategoria(id: string) {
    const categoria = FAQ.find((c) => c.id === id);
    if (!categoria) return;

    anadir(
      { de: "alumno", texto: categoria.nombre },
      {
        de: "bot",
        tipo: "preguntas",
        texto: `Esto es lo que más se pregunta sobre ${categoria.nombre.toLowerCase()}:`,
        ids: categoria.preguntas.map((p) => p.id),
      }
    );
  }

  function elegirPregunta(id: string) {
    const pregunta = preguntaPorId(id);
    if (!pregunta) return;

    anadir(
      { de: "alumno", texto: pregunta.pregunta },
      { de: "bot", tipo: "respuesta", idPregunta: id, util: null }
    );
  }

  function valorar(idMensaje: number, util: "si" | "no", asunto: string) {
    setMensajes((previos) =>
      previos.map((m) =>
        m.id === idMensaje && m.de === "bot" && m.tipo === "respuesta" ? { ...m, util } : m
      )
    );

    if (util === "si") {
      anadir({ de: "alumno", texto: "Sí, gracias" }, { de: "bot", tipo: "categorias", texto: "¡Genial! ¿Te ayudo con algo más?" });
    } else {
      anadir(
        { de: "alumno", texto: "No del todo" },
        {
          de: "bot",
          tipo: "soporte",
          texto: "Vaya, siento no haberlo resuelto. Escríbenos y te contestamos nosotros.",
          asunto,
        }
      );
    }
  }

  function pedirSoporte() {
    anadir(
      { de: "alumno", texto: "Quiero hablar con soporte" },
      {
        de: "bot",
        tipo: "soporte",
        texto: "Claro. Te abrimos WhatsApp con tu nombre y la pantalla desde la que escribes.",
        asunto: "",
      }
    );
  }

  function enviarBusqueda(evento: React.FormEvent) {
    evento.preventDefault();

    const texto = consulta.trim();
    if (texto === "") return;

    setConsulta("");
    const encontradas = buscar(texto);

    if (encontradas.length === 0) {
      anadir(
        { de: "alumno", texto },
        {
          de: "bot",
          tipo: "soporte",
          // Es nuestro fallo, no suyo: no encontramos, no "no existe".
          texto: "Esto no lo tengo escrito. Te paso con soporte, que sí sabrá.",
          asunto: texto,
        }
      );
      return;
    }

    anadir(
      { de: "alumno", texto },
      {
        de: "bot",
        tipo: "preguntas",
        texto:
          encontradas.length === 1
            ? "Creo que va por aquí:"
            : "Puede que sea alguna de estas:",
        ids: encontradas.map((r) => r.pregunta.id),
      }
    );
  }

  return (
    <div className="zona-ayuda z-50 flex flex-col items-end gap-3">
      {abierto && (
        <section
          role="dialog"
          aria-label="Ayuda de DRC Academy"
          className="fixed inset-0 flex flex-col overflow-hidden bg-marca-niebla min-[640px]:static min-[640px]:h-[min(620px,calc(100vh-150px))] min-[640px]:w-[380px] min-[640px]:rounded-[16px] min-[640px]:border min-[640px]:border-marca-borde min-[640px]:shadow-[0_18px_44px_-16px_rgba(18,33,26,0.35)]"
        >
          {/* ------------------------------ CABECERA ------------------------------ */}
          <header className="flex shrink-0 items-center gap-3 border-b border-marca-borde bg-white px-4 py-3">
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marca-verdeFondo"
            >
              <IconoAyuda className="h-[18px] w-[18px] text-marca-verdeOsc" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] font-bold leading-tight text-marca-tinta">
                Ayuda
              </p>
              <p className="text-[12.5px] leading-tight text-marca-gris">
                Respuestas a lo que más se pregunta
              </p>
            </div>

            <button
              type="button"
              onClick={cerrar}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-marca-gris transition-colors hover:bg-marca-nieblaOscura hover:text-marca-tinta"
            >
              <span className="sr-only">Cerrar la ayuda</span>
              <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" strokeWidth="1.8" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" />
              </svg>
            </button>
          </header>

          {/* ------------------------------ BUSCADOR ------------------------------ */}
          <form onSubmit={enviarBusqueda} className="shrink-0 border-b border-marca-borde bg-white px-4 pb-3">
            <label htmlFor="ayuda-consulta" className="sr-only">
              Escribe tu duda
            </label>
            <div className="flex gap-2">
              <input
                ref={campo}
                id="ayuda-consulta"
                type="text"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Escribe tu duda…"
                autoComplete="off"
                className="min-h-[42px] w-full flex-1 rounded-full border border-marca-borde bg-marca-niebla px-4 text-[15px] text-marca-tinta outline-none transition-colors placeholder:text-marca-grisTenue focus:border-marca-verde"
              />
              <button
                type="submit"
                disabled={consulta.trim() === ""}
                className="btn-verde grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="sr-only">Buscar en la ayuda</span>
                <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="5.5" stroke="currentColor" />
                  <path d="M13.2 13.2 17 17" stroke="currentColor" />
                </svg>
              </button>
            </div>
          </form>

          {/* --------------------------- CONVERSACIÓN --------------------------- */}
          {/* `aria-live` para que el lector anuncie la respuesta al pulsar
              una pregunta: sin esto, quien no ve la pantalla pulsa y no se
              entera de que ha pasado algo. */}
          <div
            aria-live="polite"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
          >
            {mensajes.map((mensaje) =>
              mensaje.de === "alumno" ? (
                <p
                  key={mensaje.id}
                  className="max-w-[85%] self-end rounded-[14px] rounded-br-[4px] bg-marca-verdeFondo px-3.5 py-2.5 text-[14px] leading-[1.45] text-marca-tinta"
                >
                  {mensaje.texto}
                </p>
              ) : (
                <div key={mensaje.id} className="flex max-w-[92%] flex-col gap-2.5 self-start">
                  <Burbuja>{mensaje.tipo === "respuesta" ? textoRespuesta(mensaje.idPregunta) : mensaje.texto}</Burbuja>

                  {mensaje.tipo === "categorias" && (
                    <ListaOpciones>
                      {FAQ.map((categoria) => (
                        <Opcion key={categoria.id} onClick={() => elegirCategoria(categoria.id)}>
                          {categoria.nombre}
                        </Opcion>
                      ))}
                    </ListaOpciones>
                  )}

                  {mensaje.tipo === "preguntas" && (
                    <ListaOpciones>
                      {mensaje.ids.map((id) => {
                        const pregunta = preguntaPorId(id);
                        if (!pregunta) return null;
                        return (
                          <Opcion key={id} onClick={() => elegirPregunta(id)} completa>
                            {pregunta.pregunta}
                          </Opcion>
                        );
                      })}
                    </ListaOpciones>
                  )}

                  {mensaje.tipo === "respuesta" && (
                    <Valoracion
                      util={mensaje.util}
                      onValorar={(util) =>
                        valorar(mensaje.id, util, preguntaPorId(mensaje.idPregunta)?.pregunta ?? "")
                      }
                    />
                  )}

                  {mensaje.tipo === "soporte" && (
                    <a
                      href={enlaceSoporte({ nombre, ruta, asunto: mensaje.asunto })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-verde inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-full px-5 text-[14.5px] font-semibold"
                    >
                      <IconoWhatsApp className="h-[18px] w-[18px]" />
                      Escribir por WhatsApp
                    </a>
                  )}
                </div>
              )
            )}

            <div ref={fin} />
          </div>

          {/* -------------------------------- PIE -------------------------------- */}
          {/* La salida a soporte, siempre a mano. Quien ya sabe que su caso
              es suyo y solo suyo —un pago, un horario— no debería tener que
              recorrer una conversación para llegar aquí. */}
          <div className="shrink-0 border-t border-marca-borde bg-white px-4 py-3">
            <button
              type="button"
              onClick={pedirSoporte}
              className="text-[13.5px] font-semibold text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
            >
              ¿Prefieres hablar con soporte?
            </button>
          </div>
        </section>
      )}

      {/* ------------------------------ LANZADOR ------------------------------ */}
      {/* Se esconde con el panel abierto en móvil, donde el panel ocupa
          toda la pantalla y el botón quedaría flotando encima de su
          propio contenido. */}
      <button
        ref={lanzador}
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        aria-expanded={abierto}
        className={`btn-verde inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold ${
          abierto ? "hidden min-[640px]:inline-flex" : ""
        }`}
      >
        <IconoAyuda className="h-[19px] w-[19px]" />
        {abierto ? "Cerrar" : "Ayuda"}
      </button>
    </div>
  );
}

/** El texto de una respuesta, por si la pregunta desapareciera del FAQ. */
function textoRespuesta(id: string): string {
  return preguntaPorId(id)?.respuesta ?? "Esta respuesta ya no está disponible.";
}

function Burbuja({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[14px] rounded-bl-[4px] border border-marca-borde bg-white px-3.5 py-2.5 text-[14px] leading-[1.5] text-marca-tintaMedia">
      {children}
    </p>
  );
}

function ListaOpciones({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

/**
 * Una opción pulsable. `completa` es para las preguntas, que ocupan la
 * línea entera: una lista de siete preguntas largas repartidas como
 * fichas de colores no se lee, se descifra.
 */
function Opcion({
  children,
  onClick,
  completa,
}: {
  children: React.ReactNode;
  onClick: () => void;
  completa?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[38px] rounded-full border border-marca-bordeSuave bg-white px-3.5 py-2 text-left text-[13.5px] font-medium leading-[1.35] text-marca-tinta transition-colors hover:border-marca-tinta ${
        completa ? "w-full rounded-[14px]" : ""
      }`}
    >
      {children}
    </button>
  );
}

/**
 * "¿Te ha servido?".
 *
 * Una vez respondido deja de ser un control y pasa a ser el registro de
 * lo que se contestó: sin esto, el alumno puede pulsar "no" tres veces y
 * recibir tres veces el mismo ofrecimiento de soporte.
 */
function Valoracion({
  util,
  onValorar,
}: {
  util: "si" | "no" | null;
  onValorar: (util: "si" | "no") => void;
}) {
  if (util !== null) {
    return (
      <p className="text-[12.5px] text-marca-grisSuave">
        {util === "si" ? "Marcaste que te ha servido." : "Marcaste que no te ha servido."}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[12.5px] text-marca-gris">¿Te ha servido?</span>
      <button
        type="button"
        onClick={() => onValorar("si")}
        className="min-h-[32px] rounded-full border border-marca-bordeSuave bg-white px-3.5 text-[13px] font-semibold text-marca-tinta transition-colors hover:border-marca-tinta"
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onValorar("no")}
        className="min-h-[32px] rounded-full border border-marca-bordeSuave bg-white px-3.5 text-[13px] font-semibold text-marca-tinta transition-colors hover:border-marca-tinta"
      >
        No
      </button>
    </div>
  );
}

function IconoAyuda({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={className} fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 9.6c0 3.4-3.1 6.1-7 6.1-.7 0-1.4-.1-2-.3L4 16.6l.9-2.5A5.8 5.8 0 0 1 3 9.6c0-3.4 3.1-6.1 7-6.1s7 2.7 7 6.1Z" stroke="currentColor" />
      <path d="M8.4 8.2a1.7 1.7 0 1 1 2.4 1.6c-.5.2-.8.7-.8 1.2" stroke="currentColor" />
      <path d="M10 13.1h.01" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconoWhatsApp({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.4l-.7-1.7c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.6 4c.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.1l-.4-.2Z" />
    </svg>
  );
}
