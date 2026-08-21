import type { AvisoFormulario } from "@/lib/modos";

/**
 * LA INVITACIÓN A CONTAR QUIÉN ERES.
 *
 * Estaba dentro de «TarjetasGeneracion», al pie de la pantalla, junto a
 * la tarjeta que ofrecía generar. Esa tarjeta ya no existe —generar es
 * ahora la última parada de la ruta— pero esto sí tenía que sobrevivir:
 * es lo ÚNICO que puede hacer un alumno del que todavía no sabemos
 * nada, y desde que el inicio cedió su columna derecha al diploma, esta
 * pantalla es el único sitio donde se le pide.
 *
 * DOS PIEZAS Y DOS SITUACIONES DISTINTAS:
 *
 *   · `InvitacionPerfil` sustituye a la ruta cuando no hay ninguna
 *     fuente —ni clase, ni perfil, ni examen—. Sin ella la pantalla se
 *     quedaría en blanco sin decir por qué.
 *
 *   · `LineaContexto` es una frase suelta para quien SÍ tiene ruta pero
 *     no nos ha contado a qué se dedica. Nunca es un candado ni un
 *     requisito: lo que ya recibe funciona, y esto lo mejora.
 *
 * Se renderizan en el servidor: no tienen estado.
 */

/**
 * Enlace al formulario, que vive en Gestión: el LMS no escribe ahí.
 *
 * `url` es null cuando el alumno no tiene un token utilizable, y
 * entonces no se pinta nada. Quien llama decide qué poner en su lugar.
 */
function EnlaceFormulario({ url, className }: { url: string | null; className: string }) {
  if (url === null) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      Completar mi perfil
    </a>
  );
}

/**
 * SIN ENLACE NO DESAPARECE LA TARJETA, solo el botón. Es lo único que
 * ese alumno tiene delante, así que en su lugar se cuenta de quién
 * depende y si ya se lo mandaron. El texto lo redacta el servidor —ver
 * `avisoFormulario()` en `lib/modos.ts`— para que esta pantalla y el
 * inicio digan exactamente lo mismo.
 */
export default function InvitacionPerfil({
  url,
  aviso,
}: {
  url: string | null;
  aviso: AvisoFormulario;
}) {
  return (
    <article className="flex flex-col rounded-[18px] border-[1.5px] border-dashed border-marca-perfilBorde bg-marca-perfil p-5 min-[900px]:rounded-[20px] min-[900px]:px-[30px] min-[900px]:py-[26px]">
      <p className="flex items-center gap-2">
        <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-marca-verde" />
        <span className="text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-marca-gris">
          Empieza por aquí
        </span>
      </p>

      <h2 className="mt-3 text-pretty font-display text-[22px] font-extrabold leading-[1.1] tracking-[-0.02em] text-marca-tinta min-[900px]:text-[26px]">
        {url === null ? aviso.titulo : "Cuéntanos un poco de ti"}
      </h2>

      {url === null ? (
        <p className="mt-2.5 max-w-[62ch] text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">
          {aviso.cuerpo}
        </p>
      ) : (
        <>
          <p className="mt-2.5 max-w-[62ch] text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">
            Con saber a qué te dedicas y qué quieres conseguir con el inglés, preparamos ejercicios
            con tus situaciones de verdad en lugar de frases de libro. Lo notas desde el primer
            bloque.
          </p>
          <EnlaceFormulario
            url={url}
            className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-full btn-verde px-8 text-[15.5px] font-bold min-[900px]:w-auto min-[900px]:self-start"
          />
        </>
      )}
    </article>
  );
}

/** La frase de quien ya tiene ruta pero todavía no tiene perfil. */
export function LineaContexto({ url }: { url: string | null }) {
  // Sin enlace no se pinta: una invitación que no lleva a ningún sitio
  // solo da envidia.
  if (url === null) return null;

  return (
    <p className="mt-4 px-1 text-[13.5px] leading-[1.5] text-marca-gris min-[900px]:mt-5 min-[900px]:text-[14px]">
      ¿Nos cuentas a qué te dedicas? Con eso ambientamos parte de tus ejercicios en tus situaciones
      del día a día.{" "}
      <EnlaceFormulario
        url={url}
        className="font-semibold text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
      />
    </p>
  );
}
