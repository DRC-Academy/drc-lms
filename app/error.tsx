"use client";

// ---------------------------------------------------------------
// CUANDO ALGO SE ROMPE
//
// Hasta ahora no había ninguna: cualquier excepción de un componente de
// servidor —Supabase que no contesta, una variable de entorno que falta,
// un dato con una forma que nadie esperaba— acababa en la pantalla de
// error por defecto de Next. Sin logotipo, sin una frase que explicara
// nada y, lo peor, sin ninguna salida: el alumno se quedaba con el botón
// de atrás del navegador.
//
// Esto es la red. No arregla ningún fallo; hace que un fallo se parezca
// al producto y tenga puerta.
//
// QUÉ ATRAPA Y QUÉ NO, dicho para que nadie lo dé por más de lo que es:
//
//   · SÍ — lo que lance cualquier página o layout por debajo de la raíz,
//     que es todo el producto: ficha, curso, lección, práctica, progreso
//     y el panel del equipo.
//   · NO — lo que lance `app/layout.tsx`, la raíz. Para eso hace falta
//     un `global-error.tsx` con su propio <html>. Hoy esa raíz solo
//     pinta <html> y <body>, así que no hay nada ahí que pueda fallar;
//     el día que se le meta algo, esa red hay que ponerla.
//   · NO — las rutas de `/api`, que no tienen árbol de React. Cada una
//     responde su propio error, y `app/api/generar-bloque` además lo
//     hace dentro de su flujo.
//   · NO — el middleware. Si revienta ahí, la petición no llega.
//
// ES UN COMPONENTE DE CLIENTE por obligación: Next lo exige para poder
// ofrecer `reset()`, que vuelve a renderizar el trozo roto sin recargar
// la página entera.
// ---------------------------------------------------------------

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El `digest` es lo único que une lo que ve el alumno con la traza
    // del servidor: en producción Next NO manda el mensaje al navegador
    // —para no filtrar lo que haya dentro— y deja este hash en las dos
    // partes. Con el prefijo entre corchetes, como el resto del
    // proyecto, para poder filtrarlo en los registros.
    console.error(`[error] ${error.digest ?? "sin digest"}:`, error.message);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-marca-niebla px-4 py-12">
      <div className="w-full max-w-[520px] rounded-[20px] border border-marca-borde bg-white px-7 py-9 sm:px-9 sm:py-10">
        {/* Sin `next/image` a propósito. El optimizador es una ruta más
            del servidor, y esta pantalla existe precisamente para
            cuando el servidor está teniendo un mal momento: una página
            de error no debe depender de más maquinaria que la que hace
            falta para pintar un PNG. El archivo está fuera del matcher
            del middleware, así que se sirve sin sesión. */}
        <img
          src="/logo-drc.png"
          alt="DRC Academy"
          width={121}
          height={32}
          className="h-[26px] w-auto"
        />

        <h1 className="mt-7 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-marca-tinta">
          Algo se ha roto por aquí
        </h1>

        {/* Lo que el alumno necesita saber es que no ha hecho nada mal y
            que no ha perdido lo suyo: sus lecciones y sus bloques están
            guardados en el servidor, no en esta pantalla. */}
        <p className="mt-3 text-[15px] leading-[1.55] text-marca-tintaMedia">
          No es culpa tuya y no se ha perdido nada de lo que llevas hecho. Casi siempre se arregla
          volviendo a intentarlo.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="btn btn-verde min-h-[48px] w-full text-[15.5px]"
          >
            Volver a intentarlo
          </button>

          {/* A la raíz y no a `/alumno/{id}`: aquí no sabemos quién es
              —esto corre en el navegador y la sesión vive en una cookie
              httpOnly— pero la raíz sí. Manda al alumno a su ficha y al
              equipo al buscador, cada uno a donde le toca. */}
          <Link
            href="/"
            className="flex min-h-[48px] w-full items-center justify-center rounded-full border-[1.5px] border-marca-borde px-8 text-[15.5px] font-bold text-marca-tinta transition-colors hover:border-marca-grisTenue"
          >
            Ir a mi inicio
          </Link>
        </div>

        <p className="mt-5 text-[13.5px] leading-[1.5] text-marca-grisSuave">
          Si vuelve a pasar, escríbele a tu profesor
          {error.digest ? (
            <>
              {" "}
              y dile este código: <span className="font-mono text-marca-tinta">{error.digest}</span>
            </>
          ) : (
            " y lo miramos"
          )}
          .
        </p>
      </div>
    </main>
  );
}
