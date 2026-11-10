# De dónde sale la prueba de nivel del LMS

Es **la misma prueba de nivel de DRC Gestión**, copiada para quien tiene Black Pass y no tiene plan con profesor (no está en Gestión ni en los calendarios). Tiene las mismas preguntas, la misma lógica adaptativa, la misma puntuación y la misma corrección de la redacción con IA, sin cambios ni mejoras.

El resultado se guarda en la base del LMS (`pruebas_nivel`, ver `supabase/lms-prueba-nivel.sql`). **El LMS nunca escribe en Gestión.**

## Copiado de

- Repo: `DRC-Academy/academy-scheduler` (Gestión), rama `main`.
- Commit: **`9ff68fe`** (10/11/2026). Los archivos de la prueba no cambian desde `fc0ee81` (29/09/2026).
- Banco: tabla `level_test_questions` de la base de Gestión, preguntas activas, exportado el **10/11/2026**.
  - 102 preguntas: 36 de completar oraciones, 30 de textos, 30 de emails y 6 redacciones.
  - sha256 de `banco.json`: `265050f4d2f00fa0d23749c49c5d2c0f590b11b899d1a07b16e2888559051d86`.
  - Cada intento guarda esta huella en `pruebas_nivel.banco`.

## Qué hay en cada archivo

| Archivo del LMS | Origen en Gestión | Cambios |
|---|---|---|
| `gestion/types.ts` | `lib/levelTest/types.ts` | Ninguno |
| `gestion/constants.ts` | `lib/levelTest/constants.ts` | Ninguno |
| `gestion/adaptive.ts` | `lib/levelTest/adaptive.ts` | Ninguno |
| `gestion/scoring.ts` | `lib/levelTest/scoring.ts` | Ninguno |
| `gestion/finalResult.ts` | `lib/levelTest/finalResult.ts` | Ninguno |
| `gestion/attemptValidity.ts` | `lib/levelTest/attemptValidity.ts` | Ninguno |
| `gestion/textCleanup.ts` | `lib/textCleanup.ts` | Ninguno |
| `gestion/evaluateWriting.ts` | `lib/evaluateWriting.ts` | Solo las tres rutas de `import` |
| `gestion/server.ts` | `lib/levelTest/server.ts` | Extracto: los tipos, `toPublic` y `pickNext`, sin tocar. Lo que lee la base lo hace `servidor.ts` |
| `gestion/*.test.ts` | `lib/levelTest/*.test.ts` | Ninguno (adaptive, attemptValidity, constants, scoring y server) |
| `gestion/anthropic.ts` | `lib/anthropic.ts` (`askClaudeJson`) | **Reescrito**: el LMS no tiene el SDK y llama con `fetch`. Ver abajo |
| `banco.json` | `level_test_questions` (activas) | Tal cual, CRLF incluidos |
| `motor.ts` | Las rutas `answer` y `submit` | La misma secuencia, sin base, con las funciones copiadas |
| `servidor.ts` | Las mismas rutas, contra la base | Contra `pruebas_nivel` en vez de `level_test_*` |

### La llamada a la IA (`gestion/anthropic.ts`)

Es idéntico en todo lo que decide la nota:

- **Modelo:** `claude-haiku-4-5`. Con un 400 que no sea de saldo, una repetición con `ANTHROPIC_MODEL` o `claude-opus-4-8`.
- **System:** el de la llamada + `NO_DASH_RULES`, con `cache_control`.
- **Formato:** `output_config.format` con el esquema JSON.
- **Límites:** `max_tokens` 1500 y sin `thinking`.
- **Cortes:** rechazo, `max_tokens`, sin texto o JSON inválido son error.
- **Limpieza:** `cleanAiDeep` sobre la respuesta.

Diferencias que no tocan la nota: los reintentos de red los hace el propio código (2, como el SDK), y sin saldo no se manda el aviso al admin de Gestión.

### Lo que el LMS añade o cambia

- **El curso recomendado.** El general de su nivel, con la regla de siempre del LMS (`nivelDeCurso`): A1 va al A2, C2 al C1. La prueba no recomienda cursos de examen.
- **Un intento por fila y una sola en curso por alumno.** Repetir crea una fila nueva.
- **Una respuesta solo se acepta para la pregunta que toca.** Una pestaña vieja recibe la actual. En Gestión se aceptaba cualquier pregunta sin responder; para quien responde de verdad, no cambia nada.
- **El resultado sale en la misma petición que la última respuesta.** En Gestión, una llamada aparte (`submit`). La regla es la misma: sin las 17 respuestas distintas no hay nivel.
- **La pantalla no dice si se acertó.** El servidor no lo manda.
- **No hay caducidad.** La prueba de un alumno de Gestión tampoco caduca.

## Cómo comparar en el futuro

```
node scripts/comparar-prueba-nivel.mjs "C:/…/academy-scheduler" [commit]
node scripts/banco-prueba-nivel.mjs   "C:/…/academy-scheduler" --comparar
```

El primero compara el código copiado. El segundo, el banco (solo lee la base de Gestión). Los dos salen con código 1 si algo difiere.

Para volver a copiar el banco, el segundo comando sin `--comparar`, y después actualizar la huella de arriba.
