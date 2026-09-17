// Lanza mascota/scripts/recortar.py dentro del venv de mascota/.venv.
//   npm run mascota:recortar
//   npm run mascota:recortar -- --solo cabeza --matting
//
// La primera vez crea el venv e instala rembg[cpu] + onnxruntime; las
// siguientes solo corre el script. Sin Python en la máquina, lo dice y
// para. "Activar el venv" es esto: llamar a su intérprete, que en
// Windows vive en Scripts/ y en el resto en bin/.
const { spawnSync } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

const MASCOTA = path.join(__dirname, "..");
const VENV = path.join(MASCOTA, ".venv");
const PYTHON_VENV = path.join(VENV, process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python");
const SCRIPT = path.join(__dirname, "recortar.py");
const PAQUETES = ["rembg[cpu]", "onnxruntime", "pillow"];

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

process.exit(correr(PYTHON_VENV, [SCRIPT, ...process.argv.slice(2)]).status ?? 1);
