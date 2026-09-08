"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cookieDeIdioma, elOtro, IDIOMA_POR_DEFECTO, type Idioma } from "@/lib/idioma";
import { TEXTOS, type Textos } from "@/lib/textos";

/**
 * EL IDIOMA, PARA LOS COMPONENTES DE CLIENTE.
 *
 * El servidor ya sabe el idioma antes de pintar —lo lee de la cookie en
 * `lib/idioma-servidor.ts`— y lo baja hasta aquí. Los componentes de
 * cliente lo leen de este contexto y NO de la cookie directamente, que
 * es lo que garantiza que pinten lo mismo que pintó el servidor: si cada
 * uno fuera a mirar por su cuenta, el primer render del navegador podría
 * no coincidir con el HTML que llegó y React tiraría la hidratación.
 *
 * ---------------------------------------------------------------
 * AL CAMBIAR PASAN TRES COSAS, Y LAS TRES HACEN FALTA
 *
 *   1. EL ESTADO LOCAL, para que la pantalla responda AL INSTANTE. Todo
 *      lo que es de cliente —el visor, la ruta, el chat de ayuda— cambia
 *      en el mismo frame en que se pulsa.
 *
 *   2. LA COOKIE, para que el servidor lo sepa a partir de ahora. Sin
 *      ella, la siguiente página volvería al idioma de antes.
 *
 *   3. `router.refresh()`, para que lo que YA está pintado por el
 *      servidor en esta misma página se vuelva a pedir traducido. Sin
 *      esto, pulsar en una lección cambiaría los botones del ejercicio y
 *      dejaría el texto de la lección —que es de servidor— en el idioma
 *      anterior hasta navegar a otro sitio.
 *
 * El orden importa: primero el estado, que es lo que se ve; la cookie y
 * el refresco van detrás y el alumno no los espera.
 * ---------------------------------------------------------------
 */

type Contexto = {
  idioma: Idioma;
  t: Textos;
  alternar: () => void;
};

const ContextoIdioma = createContext<Contexto | null>(null);

export default function ProveedorIdioma({
  idioma: inicial,
  children,
}: {
  /** Lo que leyó el servidor de la cookie. Es la semilla, no el estado. */
  idioma: Idioma;
  children: ReactNode;
}) {
  const router = useRouter();
  const [idioma, setIdioma] = useState<Idioma>(inicial);

  const alternar = useCallback(() => {
    setIdioma((actual) => {
      const nuevo = elOtro(actual);
      try {
        document.cookie = cookieDeIdioma(nuevo);
      } catch {
        // Cookies bloqueadas. El cambio vale para esta pantalla aunque
        // no se pueda recordar: no poder guardar una preferencia no
        // puede impedir cambiarla.
      }
      // Fuera del `setIdioma` no valdría: necesita el valor nuevo, y
      // este callback es el único sitio donde se conoce sin volver a
      // calcularlo.
      router.refresh();
      return nuevo;
    });
  }, [router]);

  return (
    <ContextoIdioma.Provider value={{ idioma, t: TEXTOS[idioma], alternar }}>
      {children}
    </ContextoIdioma.Provider>
  );
}

/**
 * El idioma y los textos, en un componente de cliente.
 *
 * Fuera del proveedor devuelve el idioma por defecto en vez de reventar.
 * Es a propósito: un componente que se renderice suelto —una prueba, una
 * pantalla de error por encima del layout— tiene que poder pintarse, y
 * pintarse en el idioma por defecto es un resultado correcto.
 */
export function usarIdioma(): Contexto {
  const contexto = useContext(ContextoIdioma);
  if (contexto) return contexto;

  return {
    idioma: IDIOMA_POR_DEFECTO,
    t: TEXTOS[IDIOMA_POR_DEFECTO],
    alternar: () => {},
  };
}
