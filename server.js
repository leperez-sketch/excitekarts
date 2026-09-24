/* ====================================================================
 * EXCITEBIKE EFL — server.js  (v2: rol espectador / jugador)
 * ====================================================================
 * Sirve /public y gestiona las salas por Socket.io.
 *
 * CAMBIO DE ARQUITECTURA respecto a la v1: quien CREA la sala ya no
 * es "el jugador con el carril más bajo", es un rol aparte que nunca
 * ocupa un carril ni corre: el ESPECTADOR. Su pantalla (el proyector
 * de la clase) muestra la carrera en 3D y el código QR para unirse;
 * cada alumno que se UNE con el código es un JUGADOR y su móvil actúa
 * solo como mando (pregunta + botones), sin cargar gráficos 3D.
 * ==================================================================== */

const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const servidorHttp = createServer(app);
const io = new Server(servidorHttp, {
  pingInterval: 15000,
  pingTimeout: 20000,
});

const PUERTO = process.env.PORT || 3000;
const MAX_JUGADORES = 6;
const NIVELES_VALIDOS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);
const TIEMPO_INACTIVIDAD_SALA_MS = 3 * 60 * 60 * 1000;

app.use(express.static(path.join(__dirname, '..', 'public')));

/* ------------------------------------------------------------------
   codigo → { espectadorId: string|null,
              jugadores: Map(socketId → {nombre, nivel, carril}),
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

function siguienteCarrilLibre(sala) {
  const ocupados = new Set(Array.from(sala.jugadores.values()).map((j) => j.carril));
  for (let c = 0; c < MAX_JUGADORES; c++) if (!ocupados.has(c)) return c;
  return -1;
}

function rosterPublico(sala) {
  return Array.from(sala.jugadores.entries())
    .map(([id, j]) => ({ id, nombre: j.nombre, nivel: j.nivel, carril: j.carril }))
    .sort((a, b) => a.carril - b.carril);
}

function difundirRoster(codigo) {
  const sala = salas.get(codigo);
  if (!sala) return;
  io.to(codigo).emit('jugadores_actualizados', rosterPublico(sala));
}

function eliminarSalaSiVacia(codigo) {
  const sala = salas.get(codigo);
  if (sala && !sala.espectadorId && sala.jugadores.size === 0) salas.delete(codigo);
}

io.on('connection', (socket) => {
  socket.data.sala = null;
  socket.data.rol = null;

  // El anfitrión (pantalla grande / proyector): crea la sala y NUNCA
  // ocupa un carril — solo lanza la salida y renderiza la carrera.
  socket.on('crear_sala', (_datos, callback) => {
    if (typeof callback !== 'function') return;
    const codigo = generarCodigoSala();
    const sala = { espectadorId: socket.id, jugadores: new Map(), estadoPartida: 'espera', horaInicio: null, ultimaActividad: Date.now() };
    salas.set(codigo, sala);

    socket.join(codigo);
    socket.data.sala = codigo;
    socket.data.rol = 'espectador';
    callback({ ok: true, codigo, rol: 'espectador' });
  });

  // Un alumno: se une con el código, entra en un carril y juega desde
  // su móvil (sin gráficos 3D).
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
    socket.data.rol = 'jugador';
    callback({ ok: true, codigo: codigoLimpio, carril, jugadorId: socket.id, rol: 'jugador' });
    difundirRoster(codigoLimpio);
  });

  // Solo el espectador (anfitrión) puede lanzar la salida.
  socket.on('iniciar_carrera', () => {
    const codigo = socket.data.sala;
    const sala = salas.get(codigo);
    if (!sala || sala.espectadorId !== socket.id) return;
    if (sala.estadoPartida === 'carrera') return;

    sala.estadoPartida = 'carrera';
    sala.horaInicio = Date.now() + 3000;
    sala.ultimaActividad = Date.now();
    io.to(codigo).emit('carrera_iniciando', { horaInicio: sala.horaInicio });
  });

  socket.on('pos', (datos) => {
    const codigo = socket.data.sala;
    if (!codigo || !salas.has(codigo)) return;
    socket.to(codigo).volatile.emit('pos', { id: socket.id, x: datos.x, e: datos.e, t: Date.now() });
  });

  socket.on('evento', (datos) => {
    const codigo = socket.data.sala;
    const sala = salas.get(codigo);
    if (!sala) return;
    sala.ultimaActividad = Date.now();
    socket.to(codigo).emit('evento', { id: socket.id, ...datos });
  });

  socket.on('item_recogido', ({ idItem }) => {
    const codigo = socket.data.sala;
    if (!codigo || !salas.has(codigo)) return;
    io.to(codigo).emit('item_recogido', { idItem, jugadorId: socket.id });
  });

  socket.on('disconnect', () => {
    const codigo = socket.data.sala;
    const sala = salas.get(codigo);
    if (!sala) return;

    if (socket.data.rol === 'espectador' && sala.espectadorId === socket.id) {
      sala.espectadorId = null;
      // La carrera ya en marcha sigue viva para los jugadores (cada uno
      // corre su propia física); solo se avisa de que la pantalla
      // grande se ha ido, por si el profesor quiere reconectar.
      socket.to(codigo).emit('anfitrion_desconectado');
    } else if (socket.data.rol === 'jugador') {
      sala.jugadores.delete(socket.id);
      difundirRoster(codigo);
    }

    sala.ultimaActividad = Date.now();
    eliminarSalaSiVacia(codigo);
  });
});

setInterval(() => {
  const ahora = Date.now();
  for (const [codigo, sala] of salas) {
    if (ahora - sala.ultimaActividad > TIEMPO_INACTIVIDAD_SALA_MS) salas.delete(codigo);
  }
}, 30 * 60 * 1000);

servidorHttp.listen(PUERTO, () => {
  console.log(`[ExciteBike EFL] Servidor escuchando en el puerto ${PUERTO}`);
});
