/* ====================================================================
 * EXCITEBIKE EFL — red.js
 * ====================================================================
 * Pequeña capa sobre el cliente de Socket.io para no ensuciar main.js
 * con el detalle de la librería. El script /socket.io/socket.io.js lo
 * sirve el propio servidor (no hace falta CDN: la versión del cliente
 * siempre coincide con la del servidor porque viene del mismo sitio).
 * ==================================================================== */

window.Red = (function () {
  let socket = null;
  const manejadores = {};

  function on(tipo, callback) {
    if (!manejadores[tipo]) manejadores[tipo] = [];
    manejadores[tipo].push(callback);
  }

  function emitirLocal(tipo, datos) {
    (manejadores[tipo] || []).forEach((cb) => cb(datos));
  }

  function conectar() {
    if (socket) return socket;
    socket = io({ transports: ['websocket', 'polling'] });

    socket.on('connect', () => emitirLocal('conexion', 'conectado'));
    socket.on('disconnect', () => emitirLocal('conexion', 'desconectado'));
    socket.on('connect_error', (err) => {
      console.error('[Socket.io] Error de conexión:', err.message);
      emitirLocal('conexion', 'desconectado');
    });

    socket.on('jugadores_actualizados', (roster) => emitirLocal('roster', roster));
    socket.on('carrera_iniciando', (datos) => emitirLocal('carrera_iniciando', datos));
    socket.on('pos', (datos) => emitirLocal('pos', datos));
    socket.on('evento', (datos) => emitirLocal('evento', datos));
    socket.on('item_recogido', (datos) => emitirLocal('item_recogido', datos));

    return socket;
  }

  function crearSala(nombre, nivel) {
    return new Promise((resolve, reject) => {
      conectar().emit('crear_sala', { nombre, nivel }, (resp) => {
        if (resp && resp.ok) resolve(resp); else reject(new Error((resp && resp.error) || 'Error al crear la sala.'));
      });
    });
  }

  function unirseSala(codigo, nombre, nivel) {
    return new Promise((resolve, reject) => {
      conectar().emit('unirse_sala', { codigo, nombre, nivel }, (resp) => {
        if (resp && resp.ok) resolve(resp); else reject(new Error((resp && resp.error) || 'Error al unirse a la sala.'));
      });
    });
  }

  function iniciarCarrera() { if (socket) socket.emit('iniciar_carrera'); }

  // Posición propia: se envía "volatile" en el servidor (a lo sumo una
  // vez, sin reintentos) porque solo importa el dato más reciente.
  function enviarPosicion(x, estadoMoto) {
    if (socket && socket.connected) socket.emit('pos', { x, e: estadoMoto });
  }

  function enviarEvento(tipo, datosExtra) {
    if (socket) socket.emit('evento', Object.assign({ tipo }, datosExtra || {}));
  }

  function enviarItemRecogido(idItem) {
    if (socket) socket.emit('item_recogido', { idItem });
  }

  function desconectar() {
    if (socket) { socket.disconnect(); socket = null; }
  }

  return { conectar, on, crearSala, unirseSala, iniciarCarrera, enviarPosicion, enviarEvento, enviarItemRecogido, desconectar };
})();
