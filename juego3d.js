/* ====================================================================
 * EXCITEBIKE EFL — juego3d.js  (único módulo ES; el resto son scripts
 * clásicos con "defer" para no complicar el resto del proyecto)
 * ====================================================================
 * Motor de renderizado 3D low-poly con Three.js. Este archivo SOLO
 * dibuja lo que main.js le indica cada frame: no conoce preguntas, ni
 * red, ni física de verdad — recibe {progreso, carril, estado} de
 * cada jugador y coloca los karts ahí. Esa separación (lógica en
 * main.js, dibujado aquí) es la que permite que este archivo sea
 * "solo" una capa de presentación reemplazable.
 *
 * Decisiones de rendimiento para que vaya fluido en móviles de aula:
 *  - Los tiles de carretera y las barreras del borde se dibujan con
 *    THREE.InstancedMesh (una única llamada de dibujo para cientos de
 *    piezas) en vez de cientos de objetos sueltos.
 *  - Solo se generan/mantienen los tiles dentro de una ventana
 *    alrededor de la cámara (reciclado tipo "endless runner"), nunca
 *    los 400 m completos de golpe.
 *  - Los obstáculos, power-ups y decoración son pocos (<100 en total)
 *    así que van como objetos normales; Three.js ya los descarta del
 *    dibujado cuando quedan fuera de cámara (frustum culling).
 * ==================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ---------------- Constantes de mundo y estética ---------------- */
const ANCHO_CARRIL = 1;             // metros por carril (coincide con el tile de 1×1 m)
const ROTACION_KART_BASE = 0;       // el eje +Z local del kart ya mira "hacia delante"
const ROTACION_TILE_CARRETERA = 0;  // ajustar aquí si el asfalto se ve girado 90°
const ROTACION_BARRERA_IZQ = 0;
const ROTACION_BARRERA_DER = Math.PI;

const DISTANCIA_VISION_ADELANTE = 55;
const DISTANCIA_BORRADO_ATRAS = 12;
const CAPACIDAD_TILES_CARRETERA = 6 * (DISTANCIA_VISION_ADELANTE + DISTANCIA_BORRADO_ATRAS + 4);
const CAPACIDAD_TILES_BARRERA = 2 * (DISTANCIA_VISION_ADELANTE + DISTANCIA_BORRADO_ATRAS + 4);

const CAMARA_ALTURA = 2.1;
const CAMARA_DISTANCIA_DETRAS = 3.3;
const CAMARA_MIRA_ALTURA = 0.55;
const CAMARA_MIRA_ADELANTE = 3.8;

const ALTURA_FLOTACION_PICKUP = 0.55;
const KART_FORMAS = ['kart-oobi', 'kart-oodi', 'kart-ooli', 'kart-oopi', 'kart-oozi'];
const CARRIL_HUES = [0, 60, 120, 180, 240, 300]; // grados de rotación de tono por carril

const COLOR_CIELO = 0x8fc7ff;
const COLOR_SUELO_AMBIENTE = 0x3d6b45;

const RUTA_ROADS = 'assets/models/roads/';
const RUTA_KARTS = 'assets/models/karts/';

/* ---------------- Estado interno del módulo ---------------- */
let canvas, escena, camara, renderer;
let luzDireccional, luzHemisferio;
let mallaCarretera = null, mallaBarrera = null, sueloAmbiente = null;
let texturasCarril = [];
const cache = { roads: {}, karts: {} };
const cargador = new GLTFLoader();

const configPista = { longitudPista: 0, numCarriles: 6 };
const kartsPorJugador = new Map();   // jugadorId -> {objeto, ruedas[], estela}
const pickupsPorId = new Map();      // idPickup -> {objeto, faseAnimacion}
const grupoObstaculos = new THREE.Group();
const grupoPickups = new THREE.Group();
const grupoDecoracion = new THREE.Group();
const efectosDebris = [];
let tiempoAcumulado = 0;

const matrizTemp = new THREE.Matrix4();
const posicionCamaraDeseada = new THREE.Vector3();
const miraCamaraDeseada = new THREE.Vector3();
const puntoMiraActual = new THREE.Vector3(0, CAMARA_MIRA_ALTURA, 0);
let camaraInicializada = false;

const GEOMETRIAS_PICKUP = {
  rayo: new THREE.OctahedronGeometry(0.22, 0),
  escudo: new THREE.IcosahedronGeometry(0.22, 0),
  comodin: new THREE.TetrahedronGeometry(0.27, 0),
};

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
  // Si ya existe un renderer (p. ej. se llama dos veces por error), no
  // lo recreamos: basta con recalcular el tamaño con las medidas reales.
  if (renderer) { canvas = elementoCanvas; redimensionar(); return; }

  canvas = elementoCanvas;
  escena = new THREE.Scene();
  escena.background = new THREE.Color(COLOR_CIELO);
  escena.fog = new THREE.Fog(COLOR_CIELO, 45, 140);

  camara = new THREE.PerspectiveCamera(62, 1, 0.1, 300);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  luzHemisferio = new THREE.HemisphereLight(0xbfe3ff, 0x3a2a1a, 1.0);
  escena.add(luzHemisferio);

  luzDireccional = new THREE.DirectionalLight(0xfff4e0, 1.6);
  luzDireccional.castShadow = true;
  luzDireccional.shadow.mapSize.set(1024, 1024);
  luzDireccional.shadow.camera.left = -18;
  luzDireccional.shadow.camera.right = 18;
  luzDireccional.shadow.camera.top = 18;
  luzDireccional.shadow.camera.bottom = -18;
  luzDireccional.shadow.camera.near = 1;
  luzDireccional.shadow.camera.far = 70;
  escena.add(luzDireccional);
  escena.add(luzDireccional.target);

  escena.add(grupoObstaculos, grupoPickups, grupoDecoracion);

  window.addEventListener('resize', redimensionar);
  // En móviles, el cambio de tamaño real tras "orientationchange" puede
  // llegar con retraso respecto al evento; un pequeño margen evita medir
  // el tamaño justo antes de que el navegador termine de re-maquetar.
  window.addEventListener('orientationchange', () => setTimeout(redimensionar, 250));
  redimensionar();
}

function redimensionar() {
  if (!renderer || !canvas) return;
  // IMPORTANTE: si el canvas está dentro de una pantalla con
  // display:none (p. ej. porque Juego3D.inicializar se llamó mientras
  // aún se estaba en la sala de espera), clientWidth/clientHeight
  // valen 0 y el renderer se quedaría fijado a un buffer de 1×1 px
  // estirado a toda la pantalla (se ve como un color sólido fijo). Por
  // eso main.js llama a redimensionar() justo DESPUÉS de mostrar la
  // pantalla de juego, cuando el canvas ya tiene medidas reales.
  const ancho = canvas.clientWidth || 1;
  const alto = canvas.clientHeight || 1;
  camara.aspect = ancho / alto;
  camara.updateProjectionMatrix();
  renderer.setSize(ancho, alto, false);
}

/* ==================================================================
   2. CARGA DE ASSETS (una vez por sesión)
   ================================================================== */
async function cargarAssets(alProgreso) {
  const archivosRoad = ['road-straight', 'road-straight-barrier', 'construction-cone',
    'road-sign-object-warning', 'electricity-pole', 'light-square', 'road-sign-street', 'dumpster'];
  const archivosKart = KART_FORMAS;
  const archivosDebris = ['debris-bolt', 'debris-plate-small-a', 'debris-tire'];

  const total = archivosRoad.length + archivosKart.length + archivosDebris.length + 1;
  let hechos = 0;
  const avisar = () => { hechos++; if (alProgreso) alProgreso(hechos / total); };

  for (const nombre of archivosRoad) { cache.roads[nombre] = await cargarGLB(RUTA_ROADS + nombre + '.glb'); avisar(); }
  for (const nombre of archivosKart) { cache.karts[nombre] = await cargarGLB(RUTA_KARTS + nombre + '.glb'); avisar(); }
  for (const nombre of archivosDebris) { cache.karts[nombre] = await cargarGLB(RUTA_KARTS + nombre + '.glb'); avisar(); }

  // Genera las 6 variantes de color de los karts a partir de variation-a.png
  // (ya colocada como Textures/colormap.png en la carpeta de karts).
  const imagenPaleta = await window.PaletaUtils.cargarImagen(RUTA_KARTS + 'Textures/colormap.png');
  texturasCarril = CARRIL_HUES.map((grados) => {
    const lienzo = window.PaletaUtils.generarCanvasRotado(imagenPaleta, grados);
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.flipY = false; // convención de UV de glTF (distinta de la textura "normal" de three.js)
    return textura;
  });
  avisar();

  crearMallasInstanciadas();
}

function crearMallasInstanciadas() {
  if (mallaCarretera) return;

  const meshCarretera = encontrarPrimerMesh(cache.roads['road-straight']);
  mallaCarretera = new THREE.InstancedMesh(meshCarretera.geometry, meshCarretera.material, CAPACIDAD_TILES_CARRETERA);
  mallaCarretera.receiveShadow = true;
  mallaCarretera.count = 0;
  escena.add(mallaCarretera);

  const meshBarrera = encontrarPrimerMesh(cache.roads['road-straight-barrier']);
  mallaBarrera = new THREE.InstancedMesh(meshBarrera.geometry, meshBarrera.material, CAPACIDAD_TILES_BARRERA);
  mallaBarrera.receiveShadow = true;
  mallaBarrera.castShadow = true;
  mallaBarrera.count = 0;
  escena.add(mallaBarrera);
}

/* ==================================================================
   3. CONSTRUCCIÓN DE LA PISTA (una vez por carrera)
   ================================================================== */
function construirPista({ codigoSala, longitudPista, numCarriles, obstaculos, pickups }) {
  configPista.longitudPista = longitudPista;
  configPista.numCarriles = numCarriles;

  crearSueloAmbiente(numCarriles);
  crearObstaculos3D(obstaculos);
  crearPickups3D(pickups);
  crearDecoracion(codigoSala, longitudPista, numCarriles);
  crearLineaMeta(longitudPista, numCarriles);

  puntoMiraActual.set((numCarriles - 1) * ANCHO_CARRIL / 2, CAMARA_MIRA_ALTURA, 0);
  camara.position.set((numCarriles - 1) * ANCHO_CARRIL / 2, CAMARA_ALTURA, -CAMARA_DISTANCIA_DETRAS);
  camaraInicializada = true;
}

function crearSueloAmbiente(numCarriles) {
  if (sueloAmbiente) escena.remove(sueloAmbiente);
  const geometria = new THREE.PlaneGeometry(260, 260);
  const material = new THREE.MeshStandardMaterial({ color: COLOR_SUELO_AMBIENTE, roughness: 1 });
  sueloAmbiente = new THREE.Mesh(geometria, material);
  sueloAmbiente.rotation.x = -Math.PI / 2;
  sueloAmbiente.position.set((numCarriles - 1) * ANCHO_CARRIL / 2, -0.04, 0);
  sueloAmbiente.receiveShadow = true;
  escena.add(sueloAmbiente);
}

function crearObstaculos3D(obstaculos) {
  limpiarGrupo(grupoObstaculos);
  obstaculos.forEach((obs, indice) => {
    const nombreModelo = indice % 2 === 0 ? 'construction-cone' : 'road-sign-object-warning';
    for (let carril = 0; carril < configPista.numCarriles; carril++) {
      const pieza = cache.roads[nombreModelo].clone();
      activarSombras(pieza);
      pieza.position.set(carril * ANCHO_CARRIL, 0, obs.x);
      pieza.rotation.y = Math.random() * Math.PI * 2;
      grupoObstaculos.add(pieza);
    }
  });
}

function crearPickups3D(pickups) {
  limpiarGrupo(grupoPickups);
  pickupsPorId.clear();
  pickups.forEach((p) => {
    const info = window.POWERUPS.TIPOS[p.tipo];
    const material = new THREE.MeshStandardMaterial({
      color: info.color, emissive: info.color, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.15,
    });
    const malla = new THREE.Mesh(GEOMETRIAS_PICKUP[p.tipo], material);
    malla.position.set(p.carril * ANCHO_CARRIL, ALTURA_FLOTACION_PICKUP, p.x);
    malla.castShadow = true;
    grupoPickups.add(malla);
    pickupsPorId.set(p.id, { objeto: malla, faseAnimacion: Math.random() * Math.PI * 2 });
  });
}

function crearDecoracion(codigoSala, longitudPista, numCarriles) {
  limpiarGrupo(grupoDecoracion);
  const aleatorio = window.crearGeneradorSembrado(codigoSala + '_decor');
  const tipos = ['electricity-pole', 'light-square', 'road-sign-street', 'dumpster'];
  const anchoTotal = (numCarriles - 1) * ANCHO_CARRIL;

  let z = 8;
  while (z < longitudPista - 8) {
    const lado = aleatorio() < 0.5 ? -1 : 1;
    const tipo = tipos[Math.floor(aleatorio() * tipos.length)];
    const offsetLateral = 1.6 + aleatorio() * 1.3;
    const modelo = cache.roads[tipo].clone();
    activarSombras(modelo);
    modelo.position.set(lado < 0 ? -offsetLateral : anchoTotal + offsetLateral, 0, z);
    modelo.rotation.y = aleatorio() * Math.PI * 2;
    grupoDecoracion.add(modelo);
    z += 14 + aleatorio() * 10;
  }
}

function crearLineaMeta(longitudPista, numCarriles) {
  const lienzo = document.createElement('canvas');
  lienzo.width = 64; lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#0D0E1A' : '#F2F5FA';
      ctx.fillRect(x * 8, y * 8, 8, 8);
    }
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.magFilter = THREE.NearestFilter;
  const ancho = numCarriles * ANCHO_CARRIL;
  const meta = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, 1.4),
    new THREE.MeshBasicMaterial({ map: textura })
  );
  meta.rotation.x = -Math.PI / 2;
  meta.position.set((numCarriles - 1) * ANCHO_CARRIL / 2, 0.02, longitudPista);
  escena.add(meta);
}

/* ==================================================================
   4. KARTS DE LOS JUGADORES
   ================================================================== */
function crearInstanciaKart(carril) {
  const nombreForma = KART_FORMAS[carril % KART_FORMAS.length];
  const instancia = cache.karts[nombreForma].clone();
  instancia.rotation.y = ROTACION_KART_BASE;

  const textura = texturasCarril[carril % texturasCarril.length];
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
    if (!idsNuevos.has(id)) {
      escena.remove(datos.objeto);
      kartsPorJugador.delete(id);
    }
  }

  lista.forEach((j) => {
    if (kartsPorJugador.has(j.id)) return;
    const { instancia, estela } = crearInstanciaKart(j.carril);
    const ruedas = ['wheel-back-right', 'wheel-front-left', 'wheel-front-right', 'wheel-back-left']
      .map((n) => instancia.getObjectByName(n))
      .filter(Boolean);
    instancia.position.set(j.carril * ANCHO_CARRIL, 0, 0);
    escena.add(instancia);
    kartsPorJugador.set(j.id, { objeto: instancia, ruedas, estela, carril: j.carril });
  });
}

function actualizarKart(id, progreso, carril, estadoMoto, dt) {
  const datos = kartsPorJugador.get(id);
  if (!datos) return;

  datos.objeto.position.set(carril * ANCHO_CARRIL, 0, progreso);

  const enChoque = estadoMoto === 'choque';
  const enTurbo = estadoMoto === 'turbo';
  datos.objeto.rotation.y = ROTACION_KART_BASE + (enChoque ? Math.sin(performance.now() * 0.02) * 0.5 : 0);
  datos.objeto.rotation.x = enTurbo ? -0.06 : 0;
  if (datos.estela) datos.estela.visible = enTurbo;

  const velocidadRueda = enChoque ? 0 : (enTurbo ? 15 : 8.5);
  datos.ruedas.forEach((r) => { r.rotation.x += velocidadRueda * dt; });
}

/* ==================================================================
   5. RECICLADO DE PISTA (InstancedMesh alrededor de la cámara)
   ================================================================== */
function actualizarCarreteraInstanciada(progreso) {
  const zMin = Math.max(0, Math.floor(progreso - DISTANCIA_BORRADO_ATRAS));
  const zMax = Math.min(Math.ceil(configPista.longitudPista), Math.floor(progreso + DISTANCIA_VISION_ADELANTE));
  let indice = 0;
  for (let z = zMin; z <= zMax && indice < CAPACIDAD_TILES_CARRETERA; z++) {
    for (let carril = 0; carril < configPista.numCarriles && indice < CAPACIDAD_TILES_CARRETERA; carril++) {
      matrizTemp.makeRotationY(ROTACION_TILE_CARRETERA);
      matrizTemp.setPosition(carril * ANCHO_CARRIL, 0, z);
      mallaCarretera.setMatrixAt(indice, matrizTemp);
      indice++;
    }
  }
  mallaCarretera.count = indice;
  mallaCarretera.instanceMatrix.needsUpdate = true;
}

function actualizarBarrerasInstanciadas(progreso) {
  const zMin = Math.max(0, Math.floor(progreso - DISTANCIA_BORRADO_ATRAS));
  const zMax = Math.min(Math.ceil(configPista.longitudPista), Math.floor(progreso + DISTANCIA_VISION_ADELANTE));
  const anchoTotal = (configPista.numCarriles - 1) * ANCHO_CARRIL;
  let indice = 0;
  for (let z = zMin; z <= zMax && indice < CAPACIDAD_TILES_BARRERA; z++) {
    matrizTemp.makeRotationY(ROTACION_BARRERA_IZQ);
    matrizTemp.setPosition(-ANCHO_CARRIL, 0, z);
    mallaBarrera.setMatrixAt(indice++, matrizTemp);

    if (indice < CAPACIDAD_TILES_BARRERA) {
      matrizTemp.makeRotationY(ROTACION_BARRERA_DER);
      matrizTemp.setPosition(anchoTotal + ANCHO_CARRIL, 0, z);
      mallaBarrera.setMatrixAt(indice++, matrizTemp);
    }
  }
  mallaBarrera.count = indice;
  mallaBarrera.instanceMatrix.needsUpdate = true;
}

/* ==================================================================
   6. POWER-UPS Y EFECTOS
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
      edadMs: 0,
      vidaMs: 800,
    });
  });
}

function animarDebris(dt) {
  for (let i = efectosDebris.length - 1; i >= 0; i--) {
    const e = efectosDebris[i];
    e.edadMs += dt * 1000;
    e.velocidad.y -= 9.8 * dt;
    e.objeto.position.addScaledVector(e.velocidad, dt);
    e.objeto.rotation.x += dt * 6;
    e.objeto.rotation.z += dt * 4;
    const vidaRestante = Math.max(0, 1 - e.edadMs / e.vidaMs);
    e.objeto.scale.setScalar(vidaRestante);
    if (e.edadMs >= e.vidaMs) { escena.remove(e.objeto); efectosDebris.splice(i, 1); }
  }
}

/* ==================================================================
   7. CÁMARA Y LUZ SIGUIENDO AL JUGADOR LOCAL
   ================================================================== */
function actualizarCamaraYLuz(progreso, carril, dt) {
  const x = carril * ANCHO_CARRIL;
  posicionCamaraDeseada.set(x, CAMARA_ALTURA, progreso - CAMARA_DISTANCIA_DETRAS);
  miraCamaraDeseada.set(x, CAMARA_MIRA_ALTURA, progreso + CAMARA_MIRA_ADELANTE);

  const factor = camaraInicializada ? 1 - Math.pow(0.0001, Math.min(dt, 0.1)) : 1;
  camara.position.lerp(posicionCamaraDeseada, factor);
  puntoMiraActual.lerp(miraCamaraDeseada, factor);
  camara.lookAt(puntoMiraActual);

  luzDireccional.position.set(x - 18, 28, progreso - 12);
  luzDireccional.target.position.set(x, 0, progreso);
  luzDireccional.target.updateMatrixWorld();
}

/* ==================================================================
   8. BUCLE DE ACTUALIZACIÓN (llamado cada frame desde main.js)
   ================================================================== */
function actualizarFrame({ miId, miProgreso, miCarril, miEstadoMoto, remotos, dt }) {
  if (!mallaCarretera) return;

  actualizarCarreteraInstanciada(miProgreso);
  actualizarBarrerasInstanciadas(miProgreso);
  if (sueloAmbiente) sueloAmbiente.position.z = miProgreso;

  actualizarKart(miId, miProgreso, miCarril, miEstadoMoto, dt);
  remotos.forEach((r) => actualizarKart(r.id, r.xRender, r.carril, r.estadoMoto, dt));

  animarPickups(dt);
  animarDebris(dt);
  actualizarCamaraYLuz(miProgreso, miCarril, dt);

  renderer.render(escena, camara);
}

/* ==================================================================
   API pública — ver comentario de cabecera de este archivo
   ================================================================== */
window.Juego3D = {
  inicializar,
  cargarAssets,
  construirPista,
  sincronizarJugadores,
  actualizarFrame,
  marcarPickupRecogido,
  efectoChoque,
  redimensionar,
};
