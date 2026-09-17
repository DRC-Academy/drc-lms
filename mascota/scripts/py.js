// Lanza un script de mascota/scripts/ dentro del venv de mascota/.venv.
//   node mascota/scripts/py.js recortar.py --solo cabeza
//   (es lo que hacen npm run mascota:recortar, mascota:igualar y mascota:ojos)
//
// La primera vez crea el venv e instala rembg[cpu] + onnxruntime + numpy;
// las siguientes solo corre el script. Sin Python en la máquina, lo dice
// y para. "Activar el venv" es esto: llamar a su intérprete, que en
// Windows vive en Scripts/ y en el resto en bin/.
const { spawnSync } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

const MASCOTA = path.join(__dirname, "..");
const VENV = path.join(MASCOTA, ".venv");
const PYTHON_VENV = path.join(VENV, process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python");
const PAQUETES = ["rembg[cpu]", "onnxruntime", "pillow", "numpy"];

const [nombre, ...resto] = process.argv.slice(2);
if (!nombre || !existsSync(path.join(__dirname, nombre))) {
  console.error(`Uso: node mascota/scripts/py.js <script.py> [argumentos]. No existe mascota/scripts/${nombre ?? ""}`);
  process.exit(1);
}
const SCRIPT = path.join(__dirname, nombre);

// PYTHONUTF8: la consola de Windows arranca en cp1252 y el script imprime «✓».
const correr = (cmd, args, opciones = {}) =>
  spawnSync(cmd, args, { stdio: "inherit", cwd: MASCOTA, env: { ...process.env, PYTHONUTF8: "1" }, ...opciones });

/** Un Python del sistema para crear el venv: `py` en Windows, `python3`/`python` en el resto. */
function pythonDelSistema() {
  const candidatos = process.platform === "win32" ? [["py", ["-3"]], ["python", []]] : [["python3", []], ["python", []]];
  for (const [cmd, args] of candidatos) {
    const prueba = spawnSync(cmd, [...args, "-c", "import sys; print(sys.version_info[0])"], { encoding: "utf8" });
    if (prueba.status === 0 && prueba.stdout.trim() === "3") return [cmd, args];
  }
  return null;
}

if (!existsSync(PYTHON_VENV)) {
  const sistema = pythonDelSistema();
  if (!sistema) {
    console.error(
      "No hay Python 3 en la máquina. Instalalo (por ejemplo `winget install --scope user Python.Python.3.12`) y volvé a correr esto: el venv se crea solo en mascota/.venv."
    );
    process.exit(1);
  }
  const [cmd, args] = sistema;
  console.log("Creando mascota/.venv…");
  if (correr(cmd, [...args, "-m", "venv", VENV]).status !== 0) process.exit(1);
  console.log(`Instalando ${PAQUETES.join(", ")}…`);
  if (correr(PYTHON_VENV, ["-m", "pip", "install", "--quiet", "--upgrade", "pip"]).status !== 0) process.exit(1);
  if (correr(PYTHON_VENV, ["-m", "pip", "install", "--quiet", ...PAQUETES]).status !== 0) process.exit(1);
}

process.exit(correr(PYTHON_VENV, [SCRIPT, ...resto]).status ?? 1);
