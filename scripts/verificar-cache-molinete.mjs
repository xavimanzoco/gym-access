// Verificación de la lógica de cache/reintento de molineteController, sin
// hardware ni runner de tests. Replica la máquina de estados del módulo y
// comprueba los cuatro casos que importan.

let detecciones = 0;
let puertoCacheado;
let puertoFisico;      // qué COM responde hoy (undefined = Pico desenchufado)
let enviosOk = 0, enviosFallidos = 0;

function detectar() { detecciones++; return puertoFisico; }
function resolver() { puertoCacheado ??= detectar(); return puertoCacheado; }
function olvidar() { puertoCacheado = undefined; }

async function intentarAbrir() {
  const puerto = resolver();
  if (!puerto) return false;                       // simulado
  if (puerto !== puertoFisico) { enviosFallidos++; throw new Error(`sin respuesta en ${puerto}`); }
  enviosOk++;
  return true;
}

async function abrirMolinete() {
  try {
    if (!(await intentarAbrir())) olvidar();
    return;
  } catch { olvidar(); }
  try { await intentarAbrir(); } catch { /* log */ }
}

function chequear(nombre, real, esperado) {
  const ok = real === esperado;
  console.log(`${ok ? "PASS" : "FALLA"}  ${nombre}  (esperado ${esperado}, dio ${real})`);
  return ok;
}

const resultados = [];

// 1. Pico presente: 5 aperturas deben detectar UNA sola vez. Es el fix.
detecciones = 0; puertoCacheado = undefined; puertoFisico = "COM3"; enviosOk = 0;
for (let i = 0; i < 5; i++) await abrirMolinete();
resultados.push(chequear("5 aperturas, 1 sola deteccion", detecciones, 1));
resultados.push(chequear("5 aperturas, 5 envios ok", enviosOk, 5));

// 2. Hot-replug: el Pico pasa a otro COM. La MISMA apertura debe recuperarse.
detecciones = 0; enviosOk = 0; enviosFallidos = 0;
puertoFisico = "COM7";                              // se reenchufo en otro puerto
await abrirMolinete();
resultados.push(chequear("replug: reintento acierta", enviosOk, 1));
resultados.push(chequear("replug: 1 envio fallido", enviosFallidos, 1));
resultados.push(chequear("replug: puerto nuevo cacheado", puertoCacheado, "COM7"));

// 3. Tras el replug vuelve a ser 1 deteccion por vida, no por apertura.
detecciones = 0; enviosOk = 0;
for (let i = 0; i < 3; i++) await abrirMolinete();
resultados.push(chequear("post-replug: 0 detecciones extra", detecciones, 0));
resultados.push(chequear("post-replug: 3 envios ok", enviosOk, 3));

// 4. Sin Pico: no debe quedar pegado en simulado; cada apertura reintenta.
detecciones = 0; puertoCacheado = undefined; puertoFisico = undefined;
for (let i = 0; i < 3; i++) await abrirMolinete();
resultados.push(chequear("sin Pico: reintenta cada vez", detecciones, 3));

// 5. Se enchufa el Pico con la app andando: debe engancharlo sin reiniciar.
detecciones = 0; enviosOk = 0; puertoFisico = "COM4";
await abrirMolinete();
resultados.push(chequear("Pico aparece en caliente", enviosOk, 1));

const fallas = resultados.filter((r) => !r).length;
console.log(fallas === 0 ? "\nTODO OK" : `\n${fallas} FALLAS`);
process.exit(fallas === 0 ? 0 : 1);
