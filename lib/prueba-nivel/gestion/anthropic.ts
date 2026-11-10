// ---------------------------------------------------------------
// ESTE ARCHIVO NO ES UNA COPIA: es el `askClaudeJson` de Gestión
// (lib/anthropic.ts) reescrito para el LMS, que no tiene el SDK de Anthropic
// y llama a la API con `fetch`, igual que `lib/revisor.ts`.
//
// Lo que tiene que ser IDÉNTICO para que la redacción se corrija igual, y lo
// es:
//   · el modelo que pide `evaluateWriting` (claude-haiku-4-5) y, si la API
//     rechaza la petición con un 400 que no es de saldo, una repetición con el
//     modelo por defecto de Gestión (`ANTHROPIC_MODEL` o claude-opus-4-8);
//   · el system: el de la llamada + "\n\n" + NO_DASH_RULES, en un bloque con
//     `cache_control: ephemeral`;
//   · `output_config.format` con el esquema JSON (el de `evaluateWriting` no
//     lleva ninguno de los parámetros que Gestión quita antes de enviar);
//   · `max_tokens`, sin `thinking`;
//   · los cortes: rechazo, `max_tokens`, sin texto o JSON inválido son error;
//   · la respuesta pasa por `cleanAiDeep` antes de devolverse.
//
// Lo que cambia y no toca la nota: los reintentos de red (el SDK reintenta 2
// veces los 408/409/429/5xx y los cortes; aquí igual, con una espera corta) y
// que sin saldo no se manda el aviso al admin de Gestión.
//
// SOLO SERVIDOR: lleva la clave de la API.
// ---------------------------------------------------------------

import "server-only";
import { NO_DASH_RULES, cleanAiDeep } from "./textCleanup";

const URL_API = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 120_000;
const REINTENTOS = 2;

/** El modelo por defecto de Gestión: al que se cae si el pedido rechaza la petición. */
const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export type AiStatus = "ready" | "skipped" | "error";

export interface AiResult<T> {
  data: T | null;
  status: AiStatus;
  error?: string;
}

export interface AskClaudeJsonOptions {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  label: string;
  model?: string;
}

/** Igual que `isCreditExhaustedError` de Gestión (lib/aiCreditAlert.ts). */
function sinSaldo(mensaje: string): boolean {
  return /credit balance is too low|billing_error|insufficient[_ ]credit|usage limits?/i.test(mensaje);
}

function reintentable(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Bloque = { type: string; text?: string };
type Mensaje = { model?: string; stop_reason?: string; content?: Bloque[] };

function leer<T>(mensaje: Mensaje, opts: AskClaudeJsonOptions): AiResult<T> {
  if (mensaje.stop_reason === "refusal") {
    console.error(`[ai:${opts.label}] Claude rechazó la petición.`);
    return { data: null, status: "error", error: "La IA rechazó la petición." };
  }
  if (mensaje.stop_reason === "max_tokens") {
    console.error(`[ai:${opts.label}] Respuesta truncada por max_tokens (${opts.maxTokens}).`);
    return { data: null, status: "error", error: "La respuesta de la IA quedó incompleta." };
  }

  const texto = (mensaje.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();

  if (!texto) {
    console.error(`[ai:${opts.label}] Respuesta sin texto utilizable.`);
    return { data: null, status: "error", error: "La IA no devolvió contenido." };
  }

  try {
    return { data: cleanAiDeep(JSON.parse(texto) as T), status: "ready" };
  } catch (error) {
    const msg = `La IA devolvió un JSON inválido: ${(error as Error).message}`;
    console.error(`[ai:${opts.label}] ${msg}`);
    return { data: null, status: "error", error: msg };
  }
}

export async function askClaudeJson<T>(opts: AskClaudeJsonOptions): Promise<AiResult<T>> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return { data: null, status: "skipped", error: "Falta ANTHROPIC_API_KEY" };

  const modelo = opts.model ?? AI_MODEL;
  const cuerpo = JSON.stringify({
    model: modelo,
    max_tokens: opts.maxTokens,
    system: [{ type: "text", text: `${opts.system}\n\n${NO_DASH_RULES}`, cache_control: { type: "ephemeral" } }],
    output_config: { format: { type: "json_schema", schema: opts.schema } },
    messages: [{ role: "user", content: opts.prompt }],
  });

  let ultimo = "";
  for (let intento = 0; intento <= REINTENTOS; intento++) {
    if (intento > 0) await esperar(500 * 2 ** (intento - 1));

    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), TIMEOUT_MS);
    try {
      const respuesta = await fetch(URL_API, {
        method: "POST",
        signal: control.signal,
        headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
        body: cuerpo,
      });

      if (respuesta.ok) return leer<T>((await respuesta.json()) as Mensaje, opts);

      const detalle = (await respuesta.text()).slice(0, 500);
      ultimo = `Error ${respuesta.status} de la API: ${detalle}`;

      // La red de Gestión: un 400 con un modelo que no es el de por defecto se
      // repite UNA vez con el de por defecto. Nunca si es por falta de saldo.
      if (respuesta.status === 400 && opts.model && opts.model !== AI_MODEL && !sinSaldo(detalle)) {
        console.error(`[ai:${opts.label}] ${opts.model} rechazó la petición (${ultimo}). Se repite con ${AI_MODEL}.`);
        return askClaudeJson<T>({ ...opts, model: AI_MODEL });
      }
      if (!reintentable(respuesta.status)) break;
    } catch (error) {
      ultimo = (error as Error).name === "AbortError" ? "La IA tardó demasiado en responder." : (error as Error).message;
    } finally {
      clearTimeout(corte);
    }
  }

  console.error(`[ai:${opts.label}] Falló la llamada a Claude: ${ultimo}`);
  return { data: null, status: "error", error: ultimo };
}
