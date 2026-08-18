import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * LA FRANJA DESTACADA DE LA APLICACIÓN. Una sola, para todas.
 *
 * Antes había cinco: el curso del inicio y la práctica en tinta oscura,
 * el plan del curso en su propio verde-negro, los ejercicios de la
 * lección en otro tono y la barra de continuar en un cuarto. Cinco
 * bloques que hacen lo mismo —etiqueta, titular, una acción y a veces
 * una cifra al lado— pintados de cuatro maneras. El alumno los leía como
 * cuatro cosas distintas.
 *
 * Ahora el fondo, el radio, la sombra y el botón viven en `.banner` y
 * `.banner-cta` (ver `globals.css`) y aquí solo se decide la forma.
 * NINGUNA PÁGINA VUELVE A DEFINIR SU PROPIO FONDO DE BANNER.
 *
 * EL BOTÓN ES AMARILLO, Y ES LA EXCEPCIÓN DE TODA LA APLICACIÓN. Fuera
 * de aquí las acciones son verdes y el amarillo es acento —etiquetas,
 * chips, sellos—. Dentro del verde se invierte: un botón verde sobre
 * fondo verde no es un botón, es un rectángulo. Por eso la regla se
 * enuncia al revés y no admite matices: amarillo solo dentro del verde,
 * verde en todo lo demás. Las tarjetas blancas y crema siguen con el
 * suyo.
 *
 * UN SOLO BOTÓN POR BANNER. La segunda acción, si hace falta, es un
 * enlace blanco subrayado —lo estiliza `globals.css`—, porque dos
 * botones amarillos en la misma franja no se ordenan.
 *
 * EL BANNER NO ES CLICABLE ENTERO. Lo accionable es el botón, y su
 * nombre accesible lleva de qué va ("Continuar Estilo indirecto"): una
 * pantalla con tres banners y tres botones que dicen "Continuar" no se
 * puede navegar con lector de pantalla. De eso se encarga `srSuffix`.
 */

export type BannerSize = "lg" | "md" | "bar";

export type BannerAction = {
  /** Lo que se lee en el botón. */
  label: string;
  /** Si lleva `href` es un enlace; si no, un botón con `onClick`. */
  href?: string;
  onClick?: () => void;
  /**
   * Lo que se añade al nombre accesible sin pintarse: "Continuar" +
   * " Estilo indirecto". Nunca repite lo que ya dice `label`.
   */
  srSuffix?: string;
};

export default function Banner({
  size = "lg",
  eyebrow,
  title,
  subtitle,
  meta,
  action,
  secondaryText,
  aside,
  asideWidth = "210px",
  children,
}: {
  size?: BannerSize;
  /** Etiqueta corta en mayúsculas, con punto delante. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** La frase que explica el titular. */
  subtitle?: ReactNode;
  /** Línea secundaria fina: posición, categoría, recuento. */
  meta?: ReactNode;
  /** El botón amarillo. Sin él, el banner solo informa. */
  action?: BannerAction;
  /** Texto de apoyo junto al botón ("Lo dejaste a medias"). */
  secondaryText?: ReactNode;
  /** Columna derecha de `lg`: la cifra, el progreso, lo que pida la pantalla. */
  aside?: ReactNode;
  /**
   * Ancho de esa columna. 210px es la medida de la cifra con su barra;
   * el plan del curso la ensancha porque mete dentro la rejilla de
   * meses, que a 210 no se distingue de una mancha.
   */
  asideWidth?: string;
  /** Lo que va a ancho completo debajo de las dos columnas, si algo va. */
  children?: ReactNode;
}) {
  const esBarra = size === "bar";

  const boton = action ? <BotonBanner action={action} size={size} /> : null;

  // ------------------------------ BARRA ------------------------------
  // Fija abajo, del mismo ancho que el contenido de la página. El
  // envoltorio no recibe clics para no comerse el scroll de lo que hay
  // detrás; el banner sí.
  //
  // `bottom` no es 0 en móvil: ahí abajo está la navegación de secciones
  // —`nav[data-nav-inferior]`, fija y con más z— y una barra a ras del
  // suelo se le mete debajo. Se sube por encima de ella, y en escritorio,
  // donde esa navegación no existe, baja a su sitio.
  if (esBarra) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[86px] z-30 px-4 lg:bottom-6 lg:px-9">
        <div className="mx-auto w-full max-w-contenido">
          <div className="banner pointer-events-auto flex items-center gap-4 rounded-[14px] py-4 pl-5 pr-4 min-[900px]:pl-[26px] min-[900px]:pr-5">
            <div className="min-w-0 flex-1">
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              <p className="mt-1.5 truncate font-display text-[15px] font-extrabold tracking-[-0.02em] text-white min-[900px]:text-[17px]">
                {title}
              </p>
            </div>
            {boton}
          </div>
        </div>
      </div>
    );
  }

  const contenido = (
    <>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}

      <h2
        className={`text-pretty font-display font-extrabold leading-[1.15] tracking-[-0.02em] text-white ${
          size === "lg" ? "text-[26px] min-[900px]:text-[34px]" : "text-[24px] min-[900px]:text-[28px]"
        } ${eyebrow ? "mt-3" : ""}`}
      >
        {title}
      </h2>

      {meta && <p className="mt-2 text-[14px] leading-[1.45] text-white/[0.82]">{meta}</p>}

      {subtitle && (
        <p className="mt-2.5 max-w-[560px] text-pretty text-[15px] leading-[1.55] text-white/90">
          {subtitle}
        </p>
      )}
    </>
  );

  // ---------------------------- PROMOCIONAL ----------------------------
  // Texto a la izquierda, botón a la derecha centrado. En móvil el botón
  // baja a ancho completo, que es donde llega el pulgar.
  if (size === "md") {
    return (
      <section className="banner rounded-[16px] px-6 py-6 min-[900px]:flex min-[900px]:items-center min-[900px]:gap-8 min-[900px]:px-8 min-[900px]:py-7">
        <div className="min-w-0 min-[900px]:flex-1">{contenido}</div>

        {(boton || secondaryText) && (
          <div className="mt-5 min-[900px]:mt-0 min-[900px]:shrink-0 min-[900px]:text-center">
            {boton}
            {secondaryText && <TextoApoyo>{secondaryText}</TextoApoyo>}
          </div>
        )}
      </section>
    );
  }

  // ----------------------------- DESTACADO -----------------------------
  // Dos calles separadas por una línea al 25%: el contenido y la cifra.
  // Por debajo de 900 la línea pasa a horizontal y la cifra baja, que a
  // esa anchura dos columnas dejan el titular en cuatro palabras por
  // línea.
  return (
    <section className="banner rounded-[16px] px-6 py-6 min-[900px]:px-8 min-[900px]:py-[30px]">
      <div
        className={`grid gap-5 ${
          aside ? "min-[900px]:grid-cols-[minmax(0,1fr)_var(--banner-aside)] min-[900px]:gap-10" : ""
        }`}
        style={aside ? ({ "--banner-aside": asideWidth } as CSSProperties) : undefined}
      >
        <div className="flex min-w-0 flex-col">
          {contenido}

          {(boton || secondaryText) && (
            <div className="mt-6 min-[900px]:mt-auto min-[900px]:flex min-[900px]:items-center min-[900px]:gap-[18px] min-[900px]:pt-7">
              {boton}
              {secondaryText && <TextoApoyo enLinea>{secondaryText}</TextoApoyo>}
            </div>
          )}
        </div>

        {aside && (
          <div className="mt-5 border-t border-white/25 pt-5 min-[900px]:mt-0 min-[900px]:border-l min-[900px]:border-t-0 min-[900px]:pl-7 min-[900px]:pt-0">
            {aside}
          </div>
        )}
      </div>

      {children}
    </section>
  );
}

/** El punto y la etiqueta. Siempre juntos: el punto solo no dice nada. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2">
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-banner-ambar" />
      <span className="text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-banner-ambar">
        {children}
      </span>
    </p>
  );
}

function TextoApoyo({ children, enLinea }: { children: ReactNode; enLinea?: boolean }) {
  return (
    <span
      className={`mt-3 block text-[14px] leading-[1.45] text-white/[0.82] ${
        enLinea ? "min-[900px]:mt-0 min-[900px]:inline" : "min-[900px]:mt-2.5"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Enlace o botón según lleve `href`, nunca un `div` con un `onClick`.
 * A ancho completo en móvil y con 44px de alto mínimo: es el destino de
 * la franja y tiene que poder pulsarse con el pulgar.
 */
function BotonBanner({ action, size }: { action: BannerAction; size: BannerSize }) {
  const clases = `banner-cta inline-flex items-center justify-center rounded-full font-bold transition-colors ${
    size === "bar"
      ? "min-h-[44px] shrink-0 px-[30px] py-[13px] text-[15px]"
      : "min-h-[44px] w-full px-8 py-3.5 text-[15px] min-[900px]:w-auto min-[900px]:text-[16px]"
  }`;

  const dentro = (
    <>
      {action.label}
      {action.srSuffix && <span className="sr-only"> {action.srSuffix}</span>}
    </>
  );

  if (action.href) {
    return (
      <Link href={action.href} className={clases}>
        {dentro}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={clases}>
      {dentro}
    </button>
  );
}
