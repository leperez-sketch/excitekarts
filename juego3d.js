/* ====================================================================
 * EXCITEBIKE EFL — juego3d.js  (v3: circuito cerrado + cámara isométrica)
 * ====================================================================
 * Motor de renderizado 3D low-poly con Three.js. Sigue sin conocer
 * preguntas, red ni física real: main.js le pasa {progreso, estado}
 * de cada jugador cada frame y este archivo solo dibuja.
 *
 * CAMBIOS grandes respecto a la v2 (recta de un solo sentido):
 *  - La pista es un CIRCUITO CERRADO con curvas de verdad (ver
 *    pistas.js para la matemática de la ruta). Como ahora el circuito
 *    completo es pequeño (18-24 tiles) y fijo, se construye ENTERO una
 *    sola vez — ya no hace falta reciclar tiles alrededor de una
 *    cámara que se mueve.
 *  - La cámara es ORTOGRÁFICA y FIJA: se calcula una vez, encuadrando
 *    todo el circuito desde un ángulo isométrico clásico, y no se
 *    vuelve a tocar durante la carrera (estilo "coche de radiocontrol
 *    visto desde arriba").
 *  - Los bordillos rojos/blancos de la pista NO usan el modelo de
 *    barrera de Kenney (su rotación exacta no se puede comprobar sin
 *    verlo renderizado): se generan con geometría simple a partir de
 *    la MISMA matemática de ruta que ya se verificó en Node, así se
 *    garantiza que quedan pegados a la pista pase lo que pase.
 *  - Cada jugador elige su carrito (forma) en el lobby; el color sigue
 *    saliendo de rotar el tono de variation-a.png, uno por jugador.
 * ==================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ---------------- Constantes de mundo y estética ---------------- */
const TAMANO_TILE = 1;
const KART_FORMAS = ['kart-oobi', 'kart-oodi', 'kart-ooli', 'kart-oopi', 'kart-oozi'];
const CARRIL_HUES = [0, 60, 120, 180, 240, 300];
const ALTURA_FLOTACION_PICKUP = 0.55;
const OFFSET_LATERAL_MAX = 0.14; // separación visual entre karts muy juntos (no afecta la física)

const COLOR_CIELO = 0x8fc7ff;
const COLOR_SUELO_AMBIENTE = 0x3d6b45;
const COLOR_BORDILLO_A = 0xd1362f;
const COLOR_BORDILLO_B = 0xf2f5fa;

const RUTA_ROADS = 'assets/models/roads/';
const RUTA_KARTS = 'assets/models/karts/';

// Cámara isométrica: ángulo clásico (45° en Y, ~40° de inclinación).
const CAMARA_ANGULO_Y = Math.PI / 4;
const CAMARA_INCLINACION = Math.PI / 3.1; // ~58° desde el plano horizontal
const CAMARA_MARGEN = 2.4; // metros extra alrededor de la pista

/* ---------------- Estado interno del módulo ---------------- */
let canvas, escena, camara, renderer;
let luzDireccional, luzHemisferio;
let sueloAmbiente = null;
let texturasCarril = [];
const cache = { roads: {}, karts: {} };
const cargador = new GLTFLoader();

let pistaActual = null; // { ...definición de pistas.js, ruta, numTiles }
const kartsPorJugador = new Map();   // jugadorId -> {objeto, ruedas[], estela, indiceOrden}
const pickupsPorId = new Map();
const grupoPista = new THREE.Group();
const grupoObstaculos = new THREE.Group();
const grupoPickups = new THREE.Group();
const grupoDecoracion = new THREE.Group();
const efectosDebris = [];
let tiempoAcumulado = 0;
let siguienteIndiceOrden = 0;

// Encuadre ortográfico calculado una vez por pista (ver configurarCamara)
let semiAnchoBase = 10;
const centroObjetivo = new THREE.Vector3();

const GEOMETRIAS_PICKUP = {
  rayo: new THREE.OctahedronGeometry(0.22, 0),
  escudo: new THREE.IcosahedronGeometry(0.22, 0),
  comodin: new THREE.TetrahedronGeometry(0.27, 0),
};
const GEOMETRIA_BORDILLO = new THREE.BoxGeometry(0.85, 0.12, 0.16);

/* ==================================================================
   UTILIDADES INTERNAS
   ================================================================== */
function encontrarPrimerMesh(objeto3d) {
  let encontrado = null;
  objeto3d.traverse((n) => { if (!encontrado && n.isMesh) encontrado = n; });
  return encontrado;
}

function clonarPrimerMesh(objeto3d) {
  const original = encontrarPrimerMesh(objeto3d);
  const copia = new THREE.Mesh(original.geometry, original.material);
  copia.castShadow = true;
  return copia;
}

function activarSombras(objeto3d) {
  objeto3d.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
}

function limpiarGrupo(grupo) {
  while (grupo.children.length) grupo.remove(grupo.children[0]);
}

function cargarGLB(ruta) {
  return new Promise((resolve, reject) => {
    cargador.load(ruta, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

/* ==================================================================
   1. INICIALIZACIÓN DE LA ESCENA
   ================================================================== */
function inicializar(elementoCanvas) {
  if (renderer) { canvas = elementoCanvas; redimensionar(); return; }

  canvas = elementoCanvas;
  escena = new THREE.Scene();
  escena.background = new THREE.Color(COLOR_CIELO);
  escena.fog = new THREE.Fog(COLOR_CIELO, 30, 90);

  camara = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  luzHemisferio = new THREE.HemisphereLight(0xbfe3ff, 0x3a2a1a, 1.0);
  escena.add(luzHemisferio);

  luzDireccional = new THREE.DirectionalLight(0xfff4e0, 1.6);
  luzDireccional.castShadow = true;
  luzDireccional.shadow.mapSize.set(1536, 1536);
  luzDireccional.shadow.camera.near = 1;
  luzDireccional.shadow.camera.far = 80;
  escena.add(luzDireccional, luzDireccional.target);

  escena.add(grupoPista, grupoObstaculos, grupoPickups, grupoDecoracion);

  window.addEventListener('resize', redimensionar);
  window.addEventListener('orientationchange', () => setTimeout(redimensionar, 250));
  redimensionar();
}

// Para una cámara ORTOGRÁFICA, "redimensionar" no es solo cambiar el
// tamaño del lienzo: hay que recalcular left/right/top/bottom según el
// aspecto actual mantendiendo el mismo semi-ancho de mundo ya calculado
// en configurarCamara(), o la pista se vería estirada/recortada.
function redimensionar() {
  if (!renderer || !canvas) return;
  const ancho = canvas.clientWidth || 1;
  const alto = canvas.clientHeight || 1;
  renderer.setSize(ancho, alto, false);

  const aspecto = ancho / alto;
  const semiAlto = semiAnchoBase / Math.max(aspecto, 0.001);
  if (aspecto >= 1) {
    camara.left = -semiAnchoBase; camara.right = semiAnchoBase;
    camara.top = semiAnchoBase / aspecto; camara.bottom = -semiAnchoBase / aspecto;
  } else {
    camara.top = semiAnchoBase; camara.bottom = -semiAnchoBase;
    camara.left = -semiAnchoBase * aspecto; camara.right = semiAnchoBase * aspecto;
  }
  void semiAlto;
  camara.updateProjectionMatrix();
}

/* ==================================================================
   2. CARGA DE ASSETS (una vez por sesión)
   ================================================================== */
async function cargarAssets(alProgreso) {
  const archivosRoad = ['road-straight', 'road-bend', 'construction-cone',
    'road-sign-object-warning', 'electricity-pole', 'light-square', 'road-sign-street', 'dumpster'];
  const archivosKart = KART_FORMAS;
  const archivosDebris = ['debris-bolt', 'debris-plate-small-a', 'debris-tire'];

  const total = archivosRoad.length + archivosKart.length + archivosDebris.length + 1;
  let hechos = 0;
  const avisar = () => { hechos++; if (alProgreso) alProgreso(hechos / total); };

  for (const nombre of archivosRoad) { cache.roads[nombre] = await cargarGLB(RUTA_ROADS + nombre + '.glb'); avisar(); }
  for (const nombre of archivosKart) { cache.karts[nombre] = await cargarGLB(RUTA_KARTS + nombre + '.glb'); avisar(); }
  for (const nombre of archivosDebris) { cache.karts[nombre] = await cargarGLB(RUTA_KARTS + nombre + '.glb'); avisar(); }

  const imagenPaleta = await window.PaletaUtils.cargarImagen(RUTA_KARTS + 'Textures/colormap.png');
  texturasCarril = CARRIL_HUES.map((grados) => {
    const lienzo = window.PaletaUtils.generarCanvasRotado(imagenPaleta, grados);
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.flipY = false;
    return textura;
  });
  avisar();
}

/* ==================================================================
   3. ORIENTACIÓN DE LAS PIEZAS DE CURVA
   ------------------------------------------------------------------
   road-bend.glb es una pieza de esquina (cuarto de círculo). Rotarla
   en pasos de 90° solo puede cubrir las 4 curvas de UNA quiralidad
   (todas "hacia la derecha" o todas "hacia la izquierda" según cómo
   esté modelada) — rotar un objeto nunca cambia su quiralidad. Por
   eso las curvas de la quiralidad contraria usan la MISMA pieza
   espejada (scale.x = -1): así se garantiza el giro correcto sin
   depender de adivinar cómo se modeló la pieza original.
   Si al probarlo alguna curva se ve girada al revés, este es el mapa
   a ajustar (basta con sumar/restar 90° al valor de ese par).
   ================================================================== */
const PARES_CW = { 'N,E': 0, 'E,S': 1, 'S,O': 2, 'O,N': 3 };
const PARES_CCW = { 'N,O': 0, 'O,S': 1, 'S,E': 2, 'E,N': 3 };

function orientarPiezaCurva(entrada, salida) {
  const clave = entrada + ',' + salida;
  if (clave in PARES_CW) return { rotY: PARES_CW[clave] * (-Math.PI / 2), espejo: false };
  if (clave in PARES_CCW) return { rotY: PARES_CCW[clave] * (-Math.PI / 2), espejo: true };
  return { rotY: 0, espejo: false };
}

function anguloDeRumbo(h) {
  const DIRS = { N: 0, E: Math.PI / 2, S: Math.PI, O: -Math.PI / 2 };
  return DIRS[h];
}

/* ==================================================================
   4. CONSTRUCCIÓN DE LA PISTA (una vez por carrera)
   ================================================================== */
function construirPista({ idPista, obstaculos, pickups }) {
  pistaActual = window.PISTAS.obtener(idPista);
  limpiarGrupo(grupoPista);
  limpiarGrupo(grupoObstaculos);
  limpiarGrupo(grupoPickups);
  limpiarGrupo(grupoDecoracion);
  pickupsPorId.clear();

  crearTilesYBordillos(pistaActual.ruta);
  crearSueloAmbiente(pistaActual.ruta);
  crearObstaculos3D(obstaculos, pistaActual.ruta);
  crearPickups3D(pickups, pistaActual.ruta);
  crearLineaMeta(pistaActual.ruta);
  crearDecoracion(idPista, pistaActual.ruta);
  configurarCamara(pistaActual.ruta);
}

function crearTilesYBordillos(ruta) {
  ruta.forEach((tile, indice) => {
    const esRecto = tile.entrada === tile.salida;
    const modelo = esRecto ? cache.roads['road-straight'] : cache.roads['road-bend'];
    const pieza = modelo.clone();
    activarSombras(pieza);
    pieza.position.set(tile.x * TAMANO_TILE, 0, tile.z * TAMANO_TILE);
    if (esRecto) {
      pieza.rotation.y = anguloDeRumbo(tile.salida);
    } else {
      const { rotY, espejo } = orientarPiezaCurva(tile.entrada, tile.salida);
      pieza.rotation.y = rotY;
      if (espejo) pieza.scale.x = -1;
    }
    grupoPista.add(pieza);

    // Bordillo rojo/blanco: se calcula con la MISMA función de
    // progresoAPosicion ya verificada, tomando dos puntos dentro del
    // tile y desplazándolos a ambos lados de la trayectoria.
    dibujarBordillosDeTile(indice);
  });
}

function dibujarBordillosDeTile(indice) {
  const muestras = 3;
  for (let m = 0; m < muestras; m++) {
    const f = (m + 0.5) / muestras;
    const p = window.PISTAS.progresoAPosicion(pistaActual.ruta, indice + f, TAMANO_TILE);
    const perp = { x: Math.cos(p.rotY), z: -Math.sin(p.rotY) };
    const color = (indice + m) % 2 === 0 ? COLOR_BORDILLO_A : COLOR_BORDILLO_B;
    [1, -1].forEach((lado) => {
      const bordillo = new THREE.Mesh(GEOMETRIA_BORDILLO, new THREE.MeshStandardMaterial({ color }));
      bordillo.position.set(p.x + perp.x * 0.58 * lado, 0.06, p.z + perp.z * 0.58 * lado);
      bordillo.rotation.y = p.rotY;
      bordillo.receiveShadow = true;
      grupoPista.add(bordillo);
    });
  }
}

function crearSueloAmbiente(ruta) {
  if (sueloAmbiente) escena.remove(sueloAmbiente);
  const xs = ruta.map((t) => t.x), zs = ruta.map((t) => t.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const geometria = new THREE.PlaneGeometry(120, 120);
  const material = new THREE.MeshStandardMaterial({ color: COLOR_SUELO_AMBIENTE, roughness: 1 });
  sueloAmbiente = new THREE.Mesh(geometria, material);
  sueloAmbiente.rotation.x = -Math.PI / 2;
  sueloAmbiente.position.set(cx, -0.04, cz);
  sueloAmbiente.receiveShadow = true;
  escena.add(sueloAmbiente);
}

function crearObstaculos3D(obstaculos, ruta) {
  obstaculos.forEach((indiceTile, i) => {
    const nombreModelo = i % 2 === 0 ? 'construction-cone' : 'road-sign-object-warning';
    const p = window.PISTAS.progresoAPosicion(ruta, indiceTile + 0.5, TAMANO_TILE);
    const pieza = cache.roads[nombreModelo].clone();
    activarSombras(pieza);
    pieza.position.set(p.x, 0, p.z);
    pieza.rotation.y = p.rotY;
    grupoObstaculos.add(pieza);
  });
}

function crearPickups3D(pickups, ruta) {
  pickups.forEach((indiceTile) => {
    const tipo = ['rayo', 'escudo', 'comodin'][indiceTile % 3];
    const info = window.POWERUPS.TIPOS[tipo];
    const p = window.PISTAS.progresoAPosicion(ruta, indiceTile + 0.5, TAMANO_TILE);
    const material = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.15 });
    const malla = new THREE.Mesh(GEOMETRIAS_PICKUP[tipo], material);
    malla.position.set(p.x, ALTURA_FLOTACION_PICKUP, p.z);
    malla.castShadow = true;
    grupoPickups.add(malla);
    pickupsPorId.set('pu' + indiceTile, { objeto: malla, faseAnimacion: Math.random() * Math.PI * 2 });
  });
}

function crearLineaMeta(ruta) {
  const lienzo = document.createElement('canvas');
  lienzo.width = 64; lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    ctx.fillStyle = (x + y) % 2 === 0 ? '#0D0E1A' : '#F2F5FA';
    ctx.fillRect(x * 8, y * 8, 8, 8);
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.magFilter = THREE.NearestFilter;
  const meta = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ map: textura }));
  meta.rotation.x = -Math.PI / 2;
  const tile0 = ruta[0];
  meta.rotation.z = -anguloDeRumbo(tile0.salida);
  meta.position.set(tile0.x * TAMANO_TILE, 0.02, tile0.z * TAMANO_TILE);
  grupoPista.add(meta);
}

function crearDecoracion(idPista, ruta) {
  const aleatorio = window.crearGeneradorSembrado(idPista + '_decor');
  const tipos = ['electricity-pole', 'light-square', 'road-sign-street', 'dumpster'];
  for (let i = 0; i < ruta.length; i += 3) {
    if (aleatorio() < 0.4) continue;
    const p = window.PISTAS.progresoAPosicion(ruta, i + 0.5, TAMANO_TILE);
    const perp = { x: Math.cos(p.rotY), z: -Math.sin(p.rotY) };
    const lado = aleatorio() < 0.5 ? 1 : -1;
    const distancia = 1.6 + aleatorio() * 1.4;
    const modelo = cache.roads[tipos[Math.floor(aleatorio() * tipos.length)]].clone();
    activarSombras(modelo);
    modelo.position.set(p.x + perp.x * distancia * lado, 0, p.z + perp.z * distancia * lado);
    modelo.rotation.y = aleatorio() * Math.PI * 2;
    grupoDecoracion.add(modelo);
  }
}

/* ==================================================================
   5. CÁMARA ISOMÉTRICA FIJA (una vez por pista, no se toca más)
   ================================================================== */
function configurarCamara(ruta) {
  const xs = ruta.map((t) => t.x), zs = ruta.map((t) => t.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  centroObjetivo.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);

  const anchoPista = maxX - minX + 2; // +2: margen de bordillos/decoración
  const altoPista = maxZ - minZ + 2;
  // A 45°, el ancho de pantalla necesario es la suma de ambas extensiones
  // proyectada; se toma con margen generoso porque no se puede reajustar
  // a ojo con el navegador — mejor pista de más que pista recortada.
  semiAnchoBase = (anchoPista + altoPista) / 2 * 0.72 + CAMARA_MARGEN;

  const distancia = semiAnchoBase * 2.2;
  const dir = new THREE.Vector3(
    Math.sin(CAMARA_ANGULO_Y) * Math.cos(CAMARA_INCLINACION),
    Math.sin(CAMARA_INCLINACION),
    Math.cos(CAMARA_ANGULO_Y) * Math.cos(CAMARA_INCLINACION)
  );
  camara.position.copy(centroObjetivo).addScaledVector(dir, distancia);
  camara.lookAt(centroObjetivo);

  luzDireccional.position.copy(centroObjetivo).add(new THREE.Vector3(-15, 22, -10));
  luzDireccional.target.position.copy(centroObjetivo);
  luzDireccional.target.updateMatrixWorld();
  const alcance = semiAnchoBase * 1.3;
  luzDireccional.shadow.camera.left = -alcance; luzDireccional.shadow.camera.right = alcance;
  luzDireccional.shadow.camera.top = alcance; luzDireccional.shadow.camera.bottom = -alcance;
  luzDireccional.shadow.camera.updateProjectionMatrix();

  redimensionar();
}

/* ==================================================================
   6. KARTS DE LOS JUGADORES
   ================================================================== */
function crearInstanciaKart(formaKart, indiceHue) {
  const nombreForma = KART_FORMAS.includes(formaKart) ? formaKart : KART_FORMAS[0];
  const instancia = cache.karts[nombreForma].clone();

  const textura = texturasCarril[indiceHue % texturasCarril.length];
  instancia.traverse((nodo) => {
    if (nodo.isMesh) {
      nodo.castShadow = true;
      const materialNuevo = nodo.material.clone();
      materialNuevo.map = textura;
      materialNuevo.needsUpdate = true;
      nodo.material = materialNuevo;
    }
  });

  const estela = crearEstelaTurbo();
  instancia.add(estela);
  return { instancia, estela };
}

function crearEstelaTurbo() {
  const grupo = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xffc107, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 3; i++) {
    const franja = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5 + i * 0.18), material);
    franja.position.set((i - 1) * 0.16, 0.15, -0.9 - i * 0.12);
    grupo.add(franja);
  }
  grupo.visible = false;
  return grupo;
}

function sincronizarJugadores(lista) {
  const idsNuevos = new Set(lista.map((j) => j.id));
  for (const [id, datos] of kartsPorJugador) {
    if (!idsNuevos.has(id)) { escena.remove(datos.objeto); kartsPorJugador.delete(id); }
  }
  lista.forEach((j) => {
    if (kartsPorJugador.has(j.id)) return;
    const indiceHue = siguienteIndiceOrden % CARRIL_HUES.length;
    const { instancia, estela } = crearInstanciaKart(j.formaKart, indiceHue);
    const ruedas = ['wheel-back-right', 'wheel-front-left', 'wheel-front-right', 'wheel-back-left']
      .map((n) => instancia.getObjectByName(n)).filter(Boolean);
    escena.add(instancia);
    kartsPorJugador.set(j.id, { objeto: instancia, ruedas, estela, indiceOrden: siguienteIndiceOrden });
    siguienteIndiceOrden++;
  });
}

function actualizarKart(id, progreso, estadoMoto, dt) {
  const datos = kartsPorJugador.get(id);
  if (!datos || !pistaActual) return;

  const p = window.PISTAS.progresoAPosicion(pistaActual.ruta, progreso, TAMANO_TILE);
  const offset = (datos.indiceOrden - 2.5) * OFFSET_LATERAL_MAX;
  const perp = { x: Math.cos(p.rotY), z: -Math.sin(p.rotY) };

  datos.objeto.position.set(p.x + perp.x * offset, 0, p.z + perp.z * offset);

  const enChoque = estadoMoto === 'choque';
  const enTurbo = estadoMoto === 'turbo';
  datos.objeto.rotation.y = p.rotY + (enChoque ? Math.sin(performance.now() * 0.02) * 0.5 : 0);
  if (datos.estela) datos.estela.visible = enTurbo;

  const velocidadRueda = enChoque ? 0 : (enTurbo ? 15 : 8.5);
  datos.ruedas.forEach((r) => { r.rotation.x += velocidadRueda * dt; });
}

/* ==================================================================
   7. POWER-UPS Y EFECTOS (igual que antes)
   ================================================================== */
function animarPickups(dt) {
  tiempoAcumulado += dt;
  for (const [, datos] of pickupsPorId) {
    if (!datos.objeto.visible) continue;
    datos.objeto.rotation.y += dt * 1.6;
    datos.objeto.position.y = ALTURA_FLOTACION_PICKUP + Math.sin(tiempoAcumulado * 2 + datos.faseAnimacion) * 0.08;
  }
}

function marcarPickupRecogido(idPickup) {
  const datos = pickupsPorId.get(idPickup);
  if (datos) datos.objeto.visible = false;
}

function reactivarPickup(idPickup) {
  const datos = pickupsPorId.get(idPickup);
  if (datos) datos.objeto.visible = true;
}

function efectoChoque(jugadorId) {
  const datos = kartsPorJugador.get(jugadorId);
  if (!datos) return;
  const base = datos.objeto.position.clone();
  base.y += 0.35;
  ['debris-bolt', 'debris-plate-small-a', 'debris-tire'].forEach((nombre) => {
    const pieza = clonarPrimerMesh(cache.karts[nombre]);
    pieza.position.copy(base);
    escena.add(pieza);
    efectosDebris.push({
      objeto: pieza,
      velocidad: new THREE.Vector3((Math.random() - 0.5) * 2.6, 2.3 + Math.random() * 1.6, (Math.random() - 0.5) * 2.6),
      edadMs: 0, vidaMs: 800,
    });
  });
}

function animarDebris(dt) {
  for (let i = efectosDebris.length - 1; i >= 0; i--) {
    const e = efectosDebris[i];
    e.edadMs += dt * 1000;
    e.velocidad.y -= 9.8 * dt;
    e.objeto.position.addScaledVector(e.velocidad, dt);
    e.objeto.rotation.x += dt * 6; e.objeto.rotation.z += dt * 4;
    const vidaRestante = Math.max(0, 1 - e.edadMs / e.vidaMs);
    e.objeto.scale.setScalar(vidaRestante);
    if (e.edadMs >= e.vidaMs) { escena.remove(e.objeto); efectosDebris.splice(i, 1); }
  }
}

/* ==================================================================
   8. BUCLE DE ACTUALIZACIÓN — la cámara NO se toca aquí (fija)
   ================================================================== */
function actualizarFrame({ jugadores, dt }) {
  if (!pistaActual) return;
  jugadores.forEach((j) => actualizarKart(j.id, j.progreso, j.estadoMoto, dt));
  animarPickups(dt);
  animarDebris(dt);
  renderer.render(escena, camara);
}

window.Juego3D = {
  inicializar,
  cargarAssets,
  construirPista,
  sincronizarJugadores,
  actualizarFrame,
  marcarPickupRecogido,
  reactivarPickup,
  efectoChoque,
  redimensionar,
};
