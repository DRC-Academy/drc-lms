// Verifica que mascota/geckonoid.svg respete las reglas de la mascota.
// Uso: node mascota/check.js   (sale con código 1 si algo falla)
const fs = require("fs");
const path = require("path");

const ARCHIVO = path.join(__dirname, "geckonoid.svg");
const ORDEN = [
  "cola", "pie_izq", "pie_der", "cuerpo", "panza", "brazo_izq", "brazo_der",
  "oreja_izq", "oreja_der", "cabeza", "ojo_izq", "ojo_der", "ceja_izq", "ceja_der",
  "boca", "nariz",
];
// Piezas de expresión: van después de las 16 base, siempre con display:none en el archivo.
const EXPRESIONES = [
  "ojos_felices", "ojos_guino", "ojos_tristes", "ojos_brillantes",
  "cejas_altas", "cejas_duda", "cejas_tristes",
  "boca_abierta", "boca_o", "boca_triste", "sonrisa_lateral",
  "anteojos", "brazo_pulgar", "brazo_diploma", "signo_exclamacion", "gotita", "estrellas",
];
const PROHIBIDOS = ["linearGradient", "radialGradient", "filter", "mask", "clipPath", "text", "image"];
const COLORES = ["#3FA34D", "#1E5E2E", "#F5C518", "#FFFFFF", "#1A1A1A", "#E0473F", "#F58220", "#6EC1E4"];
const GRAFICOS = new Set(["path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "use", "image", "text", "g"]);
const ATTRS_COLOR = new Set(["fill", "stroke", "stop-color", "flood-color", "lighting-color", "color"]);

const src = fs.readFileSync(ARCHIVO, "utf8");
// Sin comentarios, declaración XML ni doctype: sólo el markup real.
const limpio = src
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<\?[\s\S]*?\?>/g, "")
  .replace(/<!DOCTYPE[^>]*>/gi, "");

// --- tokenizado mínimo de tags con seguimiento de profundidad ---
const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=\/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
const attrRe = /([^\s=\/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

const elementos = []; // { nombre, attrs, profundidad }  (profundidad 1 = hijo directo de <svg>)
const pila = [];
const erroresEstructura = [];
let m;
while ((m = tagRe.exec(limpio)) !== null) {
  const [, cierre, nombre, rawAttrs, autoCierre] = m;
  if (cierre) {
    const top = pila.pop();
    if (top !== nombre) erroresEstructura.push(`cierre </${nombre}> no coincide con <${top}>`);
    continue;
  }
  const attrs = {};
  let a;
  while ((a = attrRe.exec(rawAttrs)) !== null) attrs[a[1]] = a[2] ?? a[3] ?? a[4];
  elementos.push({ nombre, attrs, profundidad: pila.length });
  if (!autoCierre) pila.push(nombre);
}
if (pila.length) erroresEstructura.push(`tags sin cerrar: ${pila.join(", ")}`);

const resultados = [];
const check = (n, titulo, fallas, detalle) =>
  resultados.push({ n, titulo, ok: fallas.length === 0, fallas, detalle });

// 1. grupos de primer nivel y orden
{
  const fallas = [...erroresEstructura];
  const raiz = elementos.find((e) => e.profundidad === 0);
  if (!raiz || raiz.nombre !== "svg") fallas.push("la raíz no es <svg>");
  const topG = elementos.filter((e) => e.profundidad === 1 && e.nombre === "g");
  const ids = topG.map((e) => e.attrs.id ?? "(sin id)");
  const base = ids.slice(0, ORDEN.length);
  if (base.length < ORDEN.length) fallas.push(`hay ${base.length} <g> de primer nivel, se esperaban al menos ${ORDEN.length}`);
  ORDEN.forEach((id, i) => {
    if (base[i] !== id) fallas.push(`posición ${i + 1}: se esperaba "${id}", hay "${base[i] ?? "(nada)"}"`);
  });
  const todos = elementos.map((e) => e.attrs.id).filter(Boolean);
  const dup = todos.filter((id, i) => todos.indexOf(id) !== i);
  if (dup.length) fallas.push(`ids duplicados: ${[...new Set(dup)].join(", ")}`);
  check(1, `${ORDEN.length} <g id> base de primer nivel en orden`, fallas, base.join(", "));
}

// 2. elementos prohibidos
{
  const fallas = [];
  for (const tag of PROHIBIDOS) {
    const n = elementos.filter((e) => e.nombre === tag).length;
    if (n) fallas.push(`<${tag}> aparece ${n} vez/veces`);
  }
  check(2, `sin ${PROHIBIDOS.map((t) => `<${t}>`).join(" ")}`, fallas);
}

// 3. nada gráfico fuera de un <g id>
{
  const fallas = [];
  const avisos = [];
  for (const e of elementos.filter((e) => e.profundidad === 1)) {
    if (e.nombre === "g" && e.attrs.id) continue;
    if (GRAFICOS.has(e.nombre)) fallas.push(`<${e.nombre}${e.attrs.id ? ` id="${e.attrs.id}"` : ""}> directamente bajo <svg>`);
    else avisos.push(`<${e.nombre}> de primer nivel (no gráfico)`);
  }
  check(3, "ningún elemento gráfico fuera de un <g id>", fallas, avisos.join("; "));
}

// 4. stroke-width y colores
{
  const fallas = [];
  const permitidos = new Set(COLORES.map((c) => c.toUpperCase()));
  let strokes = 0;
  const usados = new Set();
  const probarColor = (valor, donde) => {
    const v = valor.trim();
    if (v === "none") return;
    if (!permitidos.has(v.toUpperCase())) fallas.push(`color no permitido "${v}" en ${donde}`);
    else usados.add(v.toUpperCase());
  };
  const probarStroke = (valor, donde) => {
    strokes++;
    if (Number(valor.trim()) !== 7) fallas.push(`stroke-width="${valor}" en ${donde}`);
  };
  elementos.forEach((e, i) => {
    const donde = `<${e.nombre}>${e.attrs.id ? `#${e.attrs.id}` : ""} (elemento ${i + 1})`;
    for (const [k, v] of Object.entries(e.attrs)) {
      if (k === "stroke-width") probarStroke(v, donde);
      else if (ATTRS_COLOR.has(k)) probarColor(v, `${k} de ${donde}`);
      else if (k === "style") {
        for (const decl of v.split(";")) {
          const [prop, ...resto] = decl.split(":");
          const val = resto.join(":");
          if (!prop || !val) continue;
          if (prop.trim() === "stroke-width") probarStroke(val, `style de ${donde}`);
          else if (ATTRS_COLOR.has(prop.trim())) probarColor(val, `style ${prop.trim()} de ${donde}`);
        }
      }
    }
  });
  // cualquier hex suelto en el markup (fuera de comentarios) también tiene que ser de la paleta
  for (const hex of limpio.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []) {
    if (!permitidos.has(hex.toUpperCase())) fallas.push(`hex fuera de paleta: ${hex}`);
  }
  check(4, `stroke-width siempre 7 y sólo colores ${COLORES.join(", ")}`, fallas,
    `${strokes} stroke-width; colores usados: ${[...usados].join(", ") || "ninguno"}`);
}

// 5. grupos de expresión: existen, van después de las base y están ocultos
{
  const fallas = [];
  const topG = elementos.filter((e) => e.profundidad === 1 && e.nombre === "g");
  const extra = topG.slice(ORDEN.length);
  const ocultos = [];
  const estiloDisplay = (e) => {
    const style = e.attrs.style ?? "";
    const decl = style.split(";").map((d) => d.split(":").map((x) => x.trim())).find(([k]) => k === "display");
    return decl ? decl[1] : null;
  };
  for (const id of EXPRESIONES) {
    const g = extra.find((e) => e.attrs.id === id);
    if (!g) {
      const enBase = topG.find((e) => e.attrs.id === id);
      fallas.push(enBase ? `"${id}" está entre los grupos base, tiene que ir después` : `falta el grupo "${id}"`);
      continue;
    }
    const d = estiloDisplay(g);
    if (d !== "none") fallas.push(`"${id}" sin display:none (style="${g.attrs.style ?? ""}")`);
    else ocultos.push(id);
  }
  for (const e of extra) {
    if (!EXPRESIONES.includes(e.attrs.id)) fallas.push(`grupo de primer nivel desconocido: "${e.attrs.id ?? "(sin id)"}"`);
  }
  for (const id of ORDEN) {
    const g = topG.find((e) => e.attrs.id === id);
    if (g && estiloDisplay(g) === "none") fallas.push(`el grupo base "${id}" está oculto`);
  }
  check(5, `${EXPRESIONES.length} grupos de expresión después de la base, con display:none`, fallas,
    `${ocultos.length}/${EXPRESIONES.length} ocultos`);
}

// --- salida ---
console.log(path.relative(process.cwd(), ARCHIVO));
let todoOk = true;
for (const r of resultados) {
  console.log(`${r.ok ? "[OK]   " : "[FALLA]"} ${r.n}. ${r.titulo}`);
  if (r.detalle) console.log(`         ${r.detalle}`);
  for (const f of r.fallas) console.log(`         - ${f}`);
  todoOk = todoOk && r.ok;
}
console.log(todoOk ? "TODO OK" : "HAY FALLAS");
process.exit(todoOk ? 0 : 1);
