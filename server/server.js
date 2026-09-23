/* ====================================================================
 * EXCITEBIKE EFL — server.js
 * ====================================================================
 * Servidor Express + Socket.io. Hace dos trabajos:
 *   1) Sirve los archivos estáticos de /public (HTML, CSS, JS, modelos).
 *   2) Es la sala de máquinas del multijugador: guarda en memoria qué
 *      sala existe, quién está en cada una y retransmite sus mensajes.
 *
 * Por qué Socket.io en vez del broker MQTT de la versión anterior:
 * ahora desplegamos en Render, que sí ofrece un proceso Node.js
 * persistente (a diferencia de GitHub Pages, que es solo archivos
 * estáticos). Con un servidor propio, la gestión de salas puede ser
 * AUTORITATIVA de verdad: el roster, el carril de cada jugador y quién
 * es el host los decide este proceso, en memoria, sin necesidad de los
 * trucos de "mensaje retenido" / "Last Will" que hacían falta con MQTT.
 *
 * La física de cada moto/kart la sigue simulando cada cliente por su
 * cuenta (igual que antes): este servidor solo RELEE posiciones y
 * eventos y los reenvía al resto de la sala; así el juego se siente
 * fluido aunque el servidor gratuito de Render tenga latencia variable.
 * ==================================================================== */

const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const servidorHttp = createServer(app);
const io = new Server(servidorHttp, {
  // Márgenes generosos: el free tier de Render puede tener latencia
  // alta tras "despertar" de la hibernación por inactividad.
  pingInterval: 15000,
  pingTimeout: 20000,
});

const PUERTO = process.env.PORT || 3000;
const MAX_JUGADORES = 6;
const NIVELES_VALIDOS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);
const TIEMPO_INACTIVIDAD_SALA_MS = 3 * 60 * 60 * 1000; // 3 horas

app.use(express.static(path.join(__dirname, '..', 'public')));

/* ------------------------------------------------------------------
   Estado en memoria de las salas activas.
   codigo → { jugadores: Map(socketId → {nombre, nivel, carril}),
              estadoPartida: 'espera' | 'carrera',
              horaInicio: number|null,
              ultimaActividad: number }
   ------------------------------------------------------------------ */
const salas = new Map();

function generarCodigoSala() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let codigo;
  do {
    codigo = Array.from({ length: 3 }, () => letras[Math.floor(Math.random() * letras.length)]).join('')
      + String(10 + Math.floor(Math.random() * 90));
  } while (salas.has(codigo));
  return codigo;
}

function limpiarTexto(texto, largoMax) {
  return String(texto || '').trim().slice(0, largoMax).replace(/[<>]/g, '');
}

function obtenerHostId(sala) {
  let idMenor = null;
  for (const [id, j] of sala.jugadores) {
    if (idMenor === null || j.carril < sala.jugadores.get(idMenor).carril) idMenor = id;
  }
  return idMenor;
}

function siguienteCarrilLibre(sala) {
  const ocupados = new Set(Array.from(sala.jugadores.values()).map((j) => j.carril));
  for (let c = 0; c < MAX_JUGADORES; c++) if (!ocupados.has(c)) return c;
  return -1;
}

function rosterPublico(sala) {
  const idHost = obtenerHostId(sala);
  return Array.from(sala.jugadores.entries())
    .map(([id, j]) => ({ id, nombre: j.nombre, nivel: j.nivel, carril: j.carril, esHost: id === idHost }))
    .sort((a, b) => a.carril - b.carril);
}

function difundirRoster(codigo) {
  const sala = salas.get(codigo);
  if (!sala) return;
  io.to(codigo).emit('jugadores_actualizados', rosterPublico(sala));
}

io.on('connection', (socket) => {
  // A qué sala pertenece este socket (si pertenece a alguna)
  socket.data.sala = null;

  socket.on('crear_sala', ({ nombre, nivel }, callback) => {
    if (typeof callback !== 'function') return;
    const nombreLimpio = limpiarTexto(nombre, 16);
    if (!nombreLimpio) return callback({ ok: false, error: 'Escribe tu nombre.' });
    if (!NIVELES_VALIDOS.has(nivel)) return callback({ ok: false, error: 'Nivel no válido.' });

    const codigo = generarCodigoSala();
    const sala = { jugadores: new Map(), estadoPartida: 'espera', horaInicio: null, ultimaActividad: Date.now() };
    sala.jugadores.set(socket.id, { nombre: nombreLimpio, nivel, carril: 0 });
    salas.set(codigo, sala);

    socket.join(codigo);
    socket.data.sala = codigo;
    callback({ ok: true, codigo, carril: 0, jugadorId: socket.id });
    difundirRoster(codigo);
  });

  socket.on('unirse_sala', ({ codigo, nombre, nivel }, callback) => {
    if (typeof callback !== 'function') return;
    const codigoLimpio = limpiarTexto(codigo, 8).toUpperCase();
    const sala = salas.get(codigoLimpio);
    if (!sala) return callback({ ok: false, error: 'Esa sala no existe (revisa el código).' });
    if (sala.estadoPartida !== 'espera') return callback({ ok: false, error: 'Esa carrera ya ha empezado.' });

    const nombreLimpio = limpiarTexto(nombre, 16);
    if (!nombreLimpio) return callback({ ok: false, error: 'Escribe tu nombre.' });
    if (!NIVELES_VALIDOS.has(nivel)) return callback({ ok: false, error: 'Nivel no válido.' });

    const carril = siguienteCarrilLibre(sala);
    if (carril === -1) return callback({ ok: false, error: 'Esa sala ya tiene 6 jugadores (máximo).' });

    sala.jugadores.set(socket.id, { nombre: nombreLimpio, nivel, carril });
    sala.ultimaActividad = Date.now();
    socket.join(codigoLimpio);
    socket.data.sala = codigoLimpio;
    callback({ ok: true, codigo: codigoLimpio, carril, jugadorId: socket.id });
    difundirRoster(codigoLimpio);
  });

  socket.on('iniciar_carrera', () => {
    const codigo = socket.data.sala;
    const sala = salas.get(codigo);
    if (!sala) return;
    if (obtenerHostId(sala) !== socket.id) return; // solo el host puede lanzar la salida
    if (sala.estadoPartida === 'carrera') return;

    sala.estadoPartida = 'carrera';
    // Marca de tiempo absoluta: cada móvil descuenta su propia cuenta
    // atrás hasta ese instante, así todos arrancan a la vez pese a la
    // latencia de red distinta de cada uno.
    sala.horaInicio = Date.now() + 3000;
    sala.ultimaActividad = Date.now();
    io.to(codigo).emit('carrera_iniciando', { horaInicio: sala.horaInicio });
  });

  // Posición propia: payload ligero, reenviado tal cual al resto de la sala.
  socket.on('pos', (datos) => {
    const codigo = socket.data.sala;
    if (!codigo || !salas.has(codigo)) return;
    socket.to(codigo).volatile.emit('pos', { id: socket.id, x: datos.x, e: datos.e, t: Date.now() });
  });

  // Eventos puntuales: turbo, choque, power-up, llegada a meta…
  socket.on('evento', (datos) => {
    const codigo = socket.data.sala;
    const sala = salas.get(codigo);
    if (!sala) return;
    sala.ultimaActividad = Date.now();
    socket.to(codigo).emit('evento', { id: socket.id, ...datos });
  });

  // Un power-up recogido de la pista: se avisa a todos para que
  // desaparezca también en sus pantallas (es de un solo uso).
  socket.on('item_recogido', ({ idItem }) => {
    const codigo = socket.data.sala;
    if (!codigo || !salas.has(codigo)) return;
    io.to(codigo).emit('item_recogido', { idItem, jugadorId: socket.id });
  });

  socket.on('disconnect', () => {
    const codigo = socket.data.sala;
    const sala = salas.get(codigo);
    if (!sala) return;
    sala.jugadores.delete(socket.id);
    if (sala.jugadores.size === 0) {
      salas.delete(codigo);
    } else {
      sala.ultimaActividad = Date.now();
      difundirRoster(codigo);
    }
  });
});

// Limpieza periódica de salas abandonadas (higiene de memoria en un
// proceso de larga duración).
setInterval(() => {
  const ahora = Date.now();
  for (const [codigo, sala] of salas) {
    if (ahora - sala.ultimaActividad > TIEMPO_INACTIVIDAD_SALA_MS) salas.delete(codigo);
  }
}, 30 * 60 * 1000);

servidorHttp.listen(PUERTO, () => {
  console.log(`[ExciteBike EFL] Servidor escuchando en el puerto ${PUERTO}`);
});
