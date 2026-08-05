// ---------------------------------------------------------------
// ENLACES DE ACCESO Y COOKIE DE SESIÓN
//
// El LMS lee de DRC Gestión y no escribe en ninguna base, así que no
// hay dónde guardar un token. Todo lo que necesitamos saber viaja
// dentro del propio token, firmado con HMAC-SHA256 y codificado en
// base64url. Sin la firma correcta no se abre, y la firma solo se
// puede producir con SECRETO_SESION, que nunca sale del servidor.
//
// Hay tres sobres distintos y NO son intercambiables:
//
//   · enlace  — el del email. Dura 15 minutos. Solo lleva el email.
//   · sesion  — la cookie. Dura 30 días. Lleva email, rol y alumnoId.
//   · woo     — el del botón de WooCommerce. Dura 60 segundos y lo firma
//               WordPress, no el LMS.
//
// La firma incluye el propósito ("enlace.", "sesion." o "woo.") delante
// del cuerpo, así que un sobre no vale nunca en el sitio de otro.
//
// `woo` se firma además con OTRA clave, SECRETO_WOO, y esa es la única
// que sale de aquí: vive también en WordPress. Se separa a propósito.
// SECRETO_SESION firma las cookies de 30 días, así que si WordPress se
// viera comprometido con esa clave dentro, se podrían fabricar sesiones
// directamente —incluidas las de administrador—. Con la clave aparte,
// lo peor que se puede hacer desde WordPress es pedir la entrada, y
// `app/entrar/woo` solo abre sesiones de alumno.
//
// LIMITACIÓN CONOCIDA Y ACEPTADA PARA EL PILOTO: un token autocontenido
// no se puede revocar antes de que caduque. Si alguien intercepta el
// enlace tiene 15 minutos para usarlo, y se puede usar más de una vez.
// Los 15 minutos son lo que acota el riesgo. PENDIENTE: cuando el LMS
// tenga base propia, pasar a tokens de un solo uso guardados en tabla
// (marcar consumido al validar) y a una lista de sesiones revocables.
//
// Este módulo NO lleva `import "server-only"` a propósito: lo importa
// `middleware.ts`, que se compila para el runtime Edge y no recibe la
// condición de exportación `react-server`, así que ese import fallaría
// al ejecutarse. La clave sigue protegida porque SECRETO_SESION no
// lleva prefijo NEXT_PUBLIC_ y por tanto Next nunca la inyecta en el
// bundle del navegador.
// ---------------------------------------------------------------

export const NOMBRE_COOKIE = "drc_sesion";

/** Lo que dura el enlace del email. */
export const MINUTOS_ENLACE = 15;

/** Lo que dura la cookie una vez dentro. */
export const DIAS_SESION = 30;

/**
 * Lo que dura el sobre de WooCommerce. Es tan corto porque se gasta en
 * el mismo instante en que se pulsa el botón: no tiene que sobrevivir a
 * ningún buzón. Así apenas importa que viaje por la URL.
 */
const SEGUNDOS_WOO = 60;

const MS_ENLACE = MINUTOS_ENLACE * 60 * 1000;
const MS_SESION = DIAS_SESION * 24 * 60 * 60 * 1000;
const MS_WOO = SEGUNDOS_WOO * 1000;

/**
 * Margen para el desfase de reloj entre quien firma y quien valida.
 * Sin él, un servidor un segundo adelantado rechazaría su propio token
 * recién emitido por venir "del futuro".
 */
const MARGEN_RELOJ_MS = 60 * 1000;

export type Rol = "alumno" | "admin";

/**
 * Quién está dentro. Es una unión discriminada a propósito: un alumno
 * SIEMPRE tiene ficha (si no la tiene, no se le crea sesión) y un
 * administrador nunca entra por una ficha concreta. Así el tipo impide
 * escribir un guard que se olvide de uno de los dos casos.
 */
export type Sesion =
  | { rol: "alumno"; email: string; alumnoId: string }
  | { rol: "admin"; email: string; alumnoId: null };

// ---------------------------------------------------------------
// EMAIL
// ---------------------------------------------------------------

/** Minúsculas y sin espacios. Es la forma canónica en todo el flujo. */
export function normalizarEmail(valor: unknown): string {
  return typeof valor === "string" ? valor.trim().toLowerCase() : "";
}

/**
 * Comprobación deliberadamente laxa: aquí no validamos direcciones,
 * solo descartamos lo que no puede ser un email para no gastar una
 * consulta. Quien decide si existe es la vista de Gestión.
 */
export function esEmailPlausible(email: string): boolean {
  return email.length >= 5 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Los administradores del piloto. Son emails del equipo, listados en
 * EMAILS_ADMIN separados por comas, y no tienen por qué existir en
 * `vista_perfil_alumno`.
 *
 * Si un email está en la lista Y además es alumno, gana administrador:
 * es el caso del profesor que quiere revisar el producto entero.
 */
export function esAdministrador(email: string): boolean {
  const lista = process.env.EMAILS_ADMIN ?? "";
  return lista
    .split(",")
    .map((entrada) => normalizarEmail(entrada))
    .filter((entrada) => entrada !== "")
    .includes(email);
}

// ---------------------------------------------------------------
// BASE64URL Y BYTES
//
// Sin `Buffer`: este módulo corre también en Edge. `atob`/`btoa` y
// TextEncoder están en los dos runtimes.
//
// Desde TypeScript 5.7 `Uint8Array` es genérico sobre su buffer, y Web
// Crypto solo acepta el respaldado por un `ArrayBuffer` de verdad, no
// por un `SharedArrayBuffer`. Por eso `deBase64Url` y `aBytes` no
// llevan anotación de retorno: escribir `Uint8Array` a secas lo
// ensancharía a `ArrayBufferLike` y `subtle.sign` dejaría de aceptarlo.
// El tipo inferido ya es el estrecho.
// ---------------------------------------------------------------

function aBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string) {
  const normalizado = texto.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = normalizado + "=".repeat((4 - (normalizado.length % 4)) % 4);

  try {
    const binario = atob(relleno);
    const bytes = new Uint8Array(new ArrayBuffer(binario.length));
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function aBytes(texto: string) {
  const origen = new TextEncoder().encode(texto);
  const bytes = new Uint8Array(new ArrayBuffer(origen.length));
  bytes.set(origen);
  return bytes;
}

// ---------------------------------------------------------------
// FIRMA
// ---------------------------------------------------------------

type Proposito = "enlace" | "sesion" | "woo";

/** Qué clave firma cada sobre. Ver la cabecera del módulo. */
function nombreDelSecreto(proposito: Proposito): "SECRETO_SESION" | "SECRETO_WOO" {
  return proposito === "woo" ? "SECRETO_WOO" : "SECRETO_SESION";
}

const claves = new Map<string, CryptoKey>();

/**
 * La clave se importa una vez por instancia. Se valida al usarla y no
 * al cargar el módulo: si comprobáramos el entorno en el ámbito del
 * módulo, `next build` reventaría al recolectar rutas sin credenciales,
 * que es el mismo motivo por el que `lib/supabase-server.ts` crea su
 * cliente en diferido.
 */
async function claveHmac(proposito: Proposito): Promise<CryptoKey> {
  const nombre = nombreDelSecreto(proposito);

  const cacheada = claves.get(nombre);
  if (cacheada) return cacheada;

  const secreto = process.env[nombre];
  if (!secreto || secreto.length < 32) {
    throw new Error(
      `Falta ${nombre} en el entorno, o es demasiado corto. Hacen falta al menos 32 caracteres aleatorios para firmar.`
    );
  }

  const clave = await globalThis.crypto.subtle.importKey(
    "raw",
    aBytes(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  claves.set(nombre, clave);
  return clave;
}

/** `<cuerpo en base64url>.<firma en base64url>` */
async function cerrar(proposito: Proposito, datos: unknown): Promise<string> {
  const cuerpo = aBase64Url(aBytes(JSON.stringify(datos)));
  const clave = await claveHmac(proposito);
  const firma = await globalThis.crypto.subtle.sign(
    "HMAC",
    clave,
    aBytes(`${proposito}.${cuerpo}`)
  );
  return `${cuerpo}.${aBase64Url(new Uint8Array(firma))}`;
}

/**
 * Devuelve el contenido solo si la firma cuadra con este propósito.
 *
 * La comparación la hace `subtle.verify`, que es de tiempo constante:
 * comparar las firmas nosotros con `===` filtraría por temporización
 * cuántos bytes iniciales ha acertado quien esté probando.
 */
async function abrir(proposito: Proposito, sobre: string): Promise<unknown | null> {
  const partes = sobre.split(".");
  if (partes.length !== 2) return null;

  const [cuerpo, firma] = partes;
  const bytesFirma = deBase64Url(firma);
  if (!bytesFirma) return null;

  const clave = await claveHmac(proposito);
  const valida = await globalThis.crypto.subtle.verify(
    "HMAC",
    clave,
    bytesFirma,
    aBytes(`${proposito}.${cuerpo}`)
  );
  if (!valida) return null;

  const bytesCuerpo = deBase64Url(cuerpo);
  if (!bytesCuerpo) return null;

  try {
    return JSON.parse(new TextDecoder().decode(bytesCuerpo)) as unknown;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// EL ENLACE DEL EMAIL (Y EL BOTÓN DE WOOCOMMERCE)
//
// Claves cortas (`e`, `t`, `n`) porque el sobre entero acaba en una
// URL que hay que poder pegar en un cliente de correo.
//
// Esta forma es CONTRATO con WordPress: `wordpress/drc-acceso-lms.php`
// construye el sobre `woo` con estos mismos tres campos. Si cambian
// aquí, hay que cambiarlos allí el mismo día o el botón deja de entrar.
// ---------------------------------------------------------------

type SobreEnlace = {
  /** email normalizado */
  e: string;
  /** emitido en (ms) */
  t: number;
  /** nonce */
  n: string;
};

/**
 * El nonce no aporta seguridad por sí solo —el token no se guarda en
 * ningún sitio contra el que compararlo— pero garantiza que dos
 * peticiones seguidas del mismo email producen enlaces distintos, así
 * que un enlace antiguo que ande por un buzón no es idéntico al nuevo
 * y se distinguen en los logs.
 */
function nonce(): string {
  return aBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(12)));
}

export function crearTokenEnlace(email: string): Promise<string> {
  const sobre: SobreEnlace = { e: email, t: Date.now(), n: nonce() };
  return cerrar("enlace", sobre);
}

/**
 * El email de un sobre `{ e, t, n }`, o null si la firma no cuadra o el
 * sobre está fuera de su ventana. Lo comparten el enlace del email y el
 * botón de WooCommerce: misma forma, distinta clave y distinta duración.
 */
async function abrirSobreConEmail(
  proposito: "enlace" | "woo",
  token: string,
  ventanaMs: number
): Promise<string | null> {
  if (token === "") return null;

  const datos = await abrir(proposito, token);
  if (typeof datos !== "object" || datos === null) return null;

  const { e, t } = datos as { e?: unknown; t?: unknown };
  if (typeof e !== "string" || typeof t !== "number" || !Number.isFinite(t)) return null;

  const ahora = Date.now();
  // Se rechaza también lo emitido "en el futuro": un sobre con fecha
  // adelantada duraría más de lo que le toca.
  if (t > ahora + MARGEN_RELOJ_MS) return null;
  if (ahora - t > ventanaMs) return null;

  const email = normalizarEmail(e);
  return esEmailPlausible(email) ? email : null;
}

/** El email del enlace del correo, o null si no vale. */
export function abrirTokenEnlace(token: string): Promise<string | null> {
  return abrirSobreConEmail("enlace", token, MS_ENLACE);
}

/**
 * El email del sobre que firma WordPress al pulsar el botón, o null.
 *
 * A diferencia de los otros dos, aquí se atrapa el fallo de
 * configuración en vez de dejarlo subir. Si falta SECRETO_WOO, el resto
 * del LMS funciona: solo se rompe este atajo, y al alumno le sale «pide
 * uno nuevo» y entra por el correo, que sí va. Un 500 lo dejaría
 * plantado sin salida. Quien tiene que enterarse es el log.
 */
export async function abrirTokenWoo(token: string): Promise<string | null> {
  try {
    return await abrirSobreConEmail("woo", token, MS_WOO);
  } catch (error) {
    console.error("[sesion] No se pudo verificar el sobre de WooCommerce:", error);
    return null;
  }
}

// ---------------------------------------------------------------
// LA COOKIE
// ---------------------------------------------------------------

type SobreSesion = {
  /** email normalizado */
  e: string;
  /** rol */
  r: Rol;
  /** alumnoId, o null si es administrador */
  a: string | null;
  /** expira en (ms) */
  x: number;
};

/**
 * El contenido va firmado, nunca en claro y nunca un booleano: si la
 * cookie fuese `sesion=true`, cualquiera se la pondría desde las
 * devtools y entraría. Aquí, cambiar un solo carácter invalida la firma.
 *
 * El alumnoId viaja dentro para no tener que resolver el email contra
 * Gestión en cada petición. A cambio, si en Gestión cambiara el id de
 * un alumno, su sesión dejaría de valer hasta que pidiera otro enlace.
 * Con ids estables es un intercambio que sale a cuenta.
 */
export function crearCookieSesion(sesion: Sesion): Promise<string> {
  const sobre: SobreSesion = {
    e: sesion.email,
    r: sesion.rol,
    a: sesion.alumnoId,
    x: Date.now() + MS_SESION,
  };
  return cerrar("sesion", sobre);
}

/** Quién es, o null si no hay cookie, está manipulada o ha caducado. */
export async function abrirSesion(valor: string | undefined): Promise<Sesion | null> {
  if (!valor) return null;

  const datos = await abrir("sesion", valor);
  if (typeof datos !== "object" || datos === null) return null;

  const { e, r, a, x } = datos as { e?: unknown; r?: unknown; a?: unknown; x?: unknown };
  if (typeof e !== "string" || typeof x !== "number" || !Number.isFinite(x)) return null;

  // La caducidad se comprueba aquí y no se delega en el `maxAge` de la
  // cookie: el navegador la borra cuando toca, pero el valor firmado
  // podría reenviarse a mano y sin esto seguiría valiendo.
  if (Date.now() >= x) return null;

  const email = normalizarEmail(e);
  if (!esEmailPlausible(email)) return null;

  if (r === "admin") return { rol: "admin", email, alumnoId: null };
  if (r === "alumno" && typeof a === "string" && a !== "") {
    return { rol: "alumno", email, alumnoId: a };
  }

  return null;
}

/**
 * Opciones de la cookie de sesión.
 *
 *   httpOnly — el JavaScript de la página no puede leerla, así que un
 *              XSS no se lleva la sesión.
 *   secure   — solo viaja por HTTPS. En local se desactiva porque
 *              `next dev` sirve por HTTP y si no, no habría sesión.
 *   sameSite lax — no se manda en peticiones cruzadas salvo navegación
 *              de nivel superior, que es justo lo que hace el enlace
 *              del email al abrirse desde el cliente de correo.
 */
export const OPCIONES_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: MS_SESION / 1000,
} as const;
