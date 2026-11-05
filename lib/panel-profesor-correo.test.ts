import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// LA INVITACIÓN: lleva a `/profes` y no abre nada por sí misma.

const enviados = vi.hoisted(() => [] as Record<string, string>[]);

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (correo: Record<string, string>) => {
        enviados.push(correo);
        return { error: null };
      },
    };
  },
}));

import { enviarEnlaceAcceso, enviarInvitacionProfesor } from "@/lib/correo";

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_prueba");
  vi.stubEnv("URL_BASE", "https://practica.drcacademy.com");
  enviados.length = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("enviarInvitacionProfesor", () => {
  it("enlaza a /profes sin ningún token", async () => {
    await expect(enviarInvitacionProfesor("ana@drcacademy.com", "Ana")).resolves.toBe(true);
    const [correo] = enviados;
    expect(correo.to).toBe("ana@drcacademy.com");
    expect(correo.html).toContain('href="https://practica.drcacademy.com/profes"');
    expect(`${correo.html}${correo.text}`).not.toMatch(/token=|\/entrar/);
  });

  it("no habla de fallos ni de pagos", async () => {
    await enviarInvitacionProfesor("ana@drcacademy.com", "Ana");
    expect(`${enviados[0].html}${enviados[0].text}`).not.toMatch(/fallos|vigil|pago|suscrip|garant/i);
  });

  it("escapa el nombre en el HTML", async () => {
    await enviarInvitacionProfesor("ana@drcacademy.com", "<b>Ana</b>");
    expect(enviados[0].html).not.toContain("<b>Ana</b>");
  });

  it("sin clave de Resend no sale, y lo dice", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(enviarInvitacionProfesor("ana@drcacademy.com", "Ana")).resolves.toBe(false);
  });
});

describe("enviarEnlaceAcceso", () => {
  it("el del alumno sigue igual", async () => {
    await enviarEnlaceAcceso("a@b.es", "tok");
    expect(enviados[0].subject).toBe("Tu acceso a la práctica de DRC Academy");
    expect(enviados[0].html).toContain("Entra en tu práctica");
  });

  it("el del profesor habla de su panel", async () => {
    await enviarEnlaceAcceso("ana@drcacademy.com", "tok", null, "profesor");
    expect(enviados[0].subject).toContain("panel de profesores");
    expect(enviados[0].html).toContain("Entrar en mi panel");
    expect(enviados[0].html).not.toContain("Entra en tu práctica");
  });
});
