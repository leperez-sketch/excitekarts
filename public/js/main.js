/* ====================================================================
 * EXCITEBIKE EFL — main.js
 * ====================================================================
 * Aquí vive TODA la lógica del juego (física local, preguntas,
 * power-ups, marcador). No sabe nada de Three.js: cada frame le pasa
 * a Juego3D un objeto plano con posiciones/estados y es juego3d.js
 * quien decide cómo dibujarlo. Esta separación es la misma que en la
 * versión 2D anterior (game.js), solo que ahora "dibujar" significa
 * "actualizar una escena 3D" en vez de "pintar un <canvas> 2D".
 * ==================================================================== */

(function () {
  'use strict';

  /* ==================================================================
     1. CONFIGURACIÓN DE LA CARRERA
     ================================================================== */
  const NUM_CARRILES = 6;
  const LONGITUD_PISTA = 400;   // metros — ritmo pensado para ~45-70s de carrera
  const NUM_OBSTACULOS = 5;
  const VELOCIDAD_BASE = 10;    // m/s en ritmo normal (~36 km/h)
  const DURACION_TURBO_MS = 1800;
  const INTERVALO_PUBLICACION_POS = 150; // ms entre publicaciones de posición

  // Hándicap por nivel (ver razonamiento detallado en la versión 2D):
  // los niveles altos fallan más preguntas (son más difíciles), así que
  // su turbo es algo mayor y su penalización de choque algo menor; a la
  // inversa en los niveles bajos, donde acertar es más frecuente.
  const CONFIG_NIVELES = {
    A1: { turboMultiplicador: 1.8, penalizacionSegundos: 2.6 },
    A2: { turboMultiplicador: 1.9, penalizacionSegundos: 2.3 },
    B1: { turboMultiplicador: 2.0, penalizacionSegundos: 2.0 },
    B2: { turboMultiplicador: 2.2, penalizacionSegundos: 1.7 },
    C1: { turboMultiplicador: 2.4, penalizacionSegundos: 1.4 },
  };

  // Paleta aproximada para el color de carril en la lista del lobby
  // (el color real del kart en 3D sale de rotar el tono de variation-a.png;
  // esto solo es una referencia visual consistente para el HTML plano).
  const COLOR_CARRIL_CSS = ['#FF5C7A', '#5CDB6B', '#FFD23D', '#4AA8FF', '#FF8A3D', '#B36BFF'];

  /* ==================================================================
     2. ESTADO GLOBAL
     ================================================================== */
  const estado = {
    sala: null, jugadorId: null, nombre: '', nivel: 'B1', carril: null,
    jugadores: new Map(),
    resultados: [],
    obstaculos: [], pickups: [],
    preguntasUsadas: new Set(),
    preguntaActivaIdx: null,
    pantallaActual: 'lobby',

    corriendo: false, enCuentaRegresiva: false, ultimoFrame: 0,
    horaInicioActual: null,

    miX: 0, miVelocidad: 0, miEstadoMoto: 'normal', miLlegue: false,
    tiempoInicio: 0, tiempoFinalSeg: 0,
    tiempoTurboRestante: 0, tiempoChoqueRestante: 0,
    tengoEscudo: false, tengoComodin: false,

    assetsListos: false,
    intervaloPublicacion: null,
  };

  let promesaAssets = null;

  /* ==================================================================
     3. UTILIDADES
     ================================================================== */
  function $(selector) { return document.querySelector(selector); }

  function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  function formatearReloj(segundos) {
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function formatearTiempo(ms) { return (ms / 1000).toFixed(1) + 's'; }

  function generarObstaculos(codigoSala) {
    const aleatorio = window.crearGeneradorSembrado(codigoSala + '_pista');
    const espacio = LONGITUD_PISTA / (NUM_OBSTACULOS + 1);
    const obstaculos = [];
    for (let i = 1; i <= NUM_OBSTACULOS; i++) {
      const jitter = (aleatorio() - 0.5) * espacio * 0.3;
      obstaculos.push({ id: i, x: Math.round((espacio * i + jitter) * 10) / 10, resuelto: false });
    }
    return obstaculos;
  }

  /* ==================================================================
     4. LOBBY: crear / unirse a sala (vía Socket.io, con promesas)
     ================================================================== */
  async function crearSala() {
    const nombre = $('#input-nombre').value.trim();
    if (!nombre) return mostrarMensajeLobby('Escribe tu nombre para continuar.', true);
    estado.nombre = nombre;
    estado.nivel = $('#select-nivel').value;
    mostrarMensajeLobby('Creando sala…', false);
    try {
      const resp = await window.Red.crearSala(nombre, estado.nivel);
      entrarEnSala(resp);
    } catch (err) { mostrarMensajeLobby(err.message, true); }
  }

  async function unirseSala() {
    const nombre = $('#input-nombre').value.trim();
    const codigo = $('#input-sala').value.trim().toUpperCase();
    if (!nombre) return mostrarMensajeLobby('Escribe tu nombre para continuar.', true);
    if (codigo.length < 4) return mostrarMensajeLobby('Escribe el código de sala.', true);
    estado.nombre = nombre;
    estado.nivel = $('#select-nivel').value;
    mostrarMensajeLobby('Uniéndote a la sala…', false);
    try {
      const resp = await window.Red.unirseSala(codigo, nombre, estado.nivel);
      entrarEnSala(resp);
    } catch (err) { mostrarMensajeLobby(err.message, true); }
  }

  function entrarEnSala(resp) {
    estado.sala = resp.codigo;
    estado.jugadorId = resp.jugadorId;
    estado.carril = resp.carril;
    estado.obstaculos = generarObstaculos(resp.codigo);
    estado.pickups = window.POWERUPS.generarPickups(resp.codigo, LONGITUD_PISTA, NUM_CARRILES, estado.obstaculos.map((o) => o.x));

    $('#codigo-sala-grande').textContent = estado.sala;
    mostrarPantalla('espera');
    prepararEscenaYCargarAssets(); // carga los modelos 3D en segundo plano mientras se espera
  }

  /* ==================================================================
     5. CARGA DE LA ESCENA 3D (en cuanto se entra a una sala)
     ================================================================== */
  function prepararEscenaYCargarAssets() {
    if (promesaAssets) return promesaAssets;
    window.Juego3D.inicializar($('#canvas-juego'));
    promesaAssets = window.Juego3D.cargarAssets((fraccion) => actualizarBarraCarga(fraccion))
      .then(() => { estado.assetsListos = true; actualizarBarraCarga(1); })
      .catch((err) => {
        console.error('[Juego3D] Error cargando assets:', err);
        mostrarMensajeLobby('No se pudieron cargar los gráficos 3D. Comprueba tu conexión y recarga la página.', true);
      });
    return promesaAssets;
  }

  function esperarAssetsListos() { return promesaAssets || Promise.resolve(); }

  function actualizarBarraCarga(fraccion) {
    const relleno = $('#barra-carga-relleno');
    if (relleno) relleno.style.width = Math.round(fraccion * 100) + '%';
  }

  /* ==================================================================
     6. ROSTER DE LA SALA (lo manda el servidor, siempre autoritativo)
     ================================================================== */
  window.Red.on('roster', (roster) => {
    const idsNuevos = new Set(roster.map((j) => j.id));
    for (const id of Array.from(estado.jugadores.keys())) {
      if (!idsNuevos.has(id)) estado.jugadores.delete(id);
    }
    roster.forEach((j) => {
      const existente = estado.jugadores.get(j.id);
      const datos = {
        id: j.id, nombre: j.nombre, nivel: j.nivel, carril: j.carril, esHost: j.esHost,
        xAct: 0, xAnt: 0, tAct: 0, tAnt: 0, xRender: 0, estadoMoto: 'normal',
      };
      if (existente) Object.assign(existente, datos); else estado.jugadores.set(j.id, datos);
    });

    actualizarListaJugadoresUI();
    if (estado.pantallaActual === 'juego') {
      window.Juego3D.sincronizarJugadores(Array.from(estado.jugadores.values()).map((j) => ({ id: j.id, carril: j.carril })));
    }
  });

  function actualizarListaJugadoresUI() {
    const ul = $('#lista-jugadores');
    if (!ul) return;
    const ordenados = Array.from(estado.jugadores.values()).sort((a, b) => a.carril - b.carril);

    ul.innerHTML = ordenados.map((j) => `
      <li class="lista-jugadores__item">
        <span class="lista-jugadores__color" style="background:${COLOR_CARRIL_CSS[j.carril % COLOR_CARRIL_CSS.length]}"></span>
        <span class="lista-jugadores__nombre">${escaparHtml(j.nombre)}${j.id === estado.jugadorId ? ' (tú)' : ''}</span>
        <span class="lista-jugadores__insignia${j.esHost ? ' lista-jugadores__insignia--host' : ''}">${j.esHost ? 'HOST' : j.nivel}</span>
      </li>`).join('');

    const yo = estado.jugadores.get(estado.jugadorId);
    const soyHost = yo ? yo.esHost : false;
    $('#btn-iniciar-carrera').classList.toggle('boton--oculto', !soyHost);
    $('#espera-mensaje').classList.toggle('oculto', soyHost);
  }

  function iniciarCarrera() {
    const yo = estado.jugadores.get(estado.jugadorId);
    if (yo && yo.esHost) window.Red.iniciarCarrera();
  }

  /* ==================================================================
     7. SALIDA DE LA CARRERA (cuenta atrás sincronizada por el servidor)
     ================================================================== */
  window.Red.on('carrera_iniciando', async ({ horaInicio }) => {
    if (estado.corriendo || (estado.enCuentaRegresiva && estado.horaInicioActual === horaInicio)) return;
    estado.enCuentaRegresiva = true;
    estado.horaInicioActual = horaInicio;

    mostrarPantalla('juego');
    const overlay = $('#overlay-cuenta');
    overlay.classList.remove('oculto');
    overlay.textContent = 'Cargando…';

    await esperarAssetsListos();

    window.Juego3D.construirPista({
      codigoSala: estado.sala, longitudPista: LONGITUD_PISTA, numCarriles: NUM_CARRILES,
      obstaculos: estado.obstaculos, pickups: estado.pickups,
    });
    window.Juego3D.sincronizarJugadores(Array.from(estado.jugadores.values()).map((j) => ({ id: j.id, carril: j.carril })));

    iniciarCuentaRegresiva(horaInicio);
  });

  function iniciarCuentaRegresiva(horaInicio) {
    const overlay = $('#overlay-cuenta');
    function tick() {
      const restante = horaInicio - Date.now();
      if (restante <= 0) { overlay.classList.add('oculto'); comenzarCarreraLocal(); return; }
      overlay.textContent = String(Math.ceil(restante / 1000));
      requestAnimationFrame(tick);
    }
    tick();
  }

  function comenzarCarreraLocal() {
    estado.miX = 0;
    estado.miVelocidad = VELOCIDAD_BASE;
    estado.miEstadoMoto = 'normal';
    estado.miLlegue = false;
    estado.preguntasUsadas.clear();
    estado.obstaculos.forEach((o) => { o.resuelto = false; });
    estado.pickups.forEach((p) => { p.recogido = false; });
    estado.tengoEscudo = false;
    estado.tengoComodin = false;
    actualizarIndicadoresPowerup();

    estado.tiempoInicio = performance.now();
    estado.ultimoFrame = 0;
    estado.corriendo = true;
    estado.enCuentaRegresiva = false;

    clearInterval(estado.intervaloPublicacion);
    estado.intervaloPublicacion = setInterval(() => {
      window.Red.enviarPosicion(Math.round(estado.miX * 10) / 10, estado.miEstadoMoto);
    }, INTERVALO_PUBLICACION_POS);

    requestAnimationFrame(bucleJuego);
  }

  /* ==================================================================
     8. BUCLE DE JUEGO
     ================================================================== */
  function bucleJuego(marcaTiempo) {
    if (!estado.corriendo) return;
    // dt limitado a 100ms: si la pestaña estuvo en segundo plano y el
    // rAF se reanuda tras un salto grande, evita un "teletransporte" físico.
    const dt = estado.ultimoFrame ? Math.min((marcaTiempo - estado.ultimoFrame) / 1000, 0.1) : 0;
    estado.ultimoFrame = marcaTiempo;

    actualizarFisicaLocal(dt);
    actualizarInterpolacionRemota();
    actualizarHUD();

    window.Juego3D.actualizarFrame({
      miId: estado.jugadorId,
      miProgreso: estado.miX,
      miCarril: estado.carril,
      miEstadoMoto: estado.miEstadoMoto,
      remotos: Array.from(estado.jugadores.values())
        .filter((j) => j.id !== estado.jugadorId)
        .map((j) => ({ id: j.id, xRender: j.xRender || 0, carril: j.carril, estadoMoto: j.estadoMoto || 'normal' })),
      dt,
    });

    requestAnimationFrame(bucleJuego);
  }

  function actualizarFisicaLocal(dt) {
    if (estado.miLlegue || estado.miEstadoMoto === 'pregunta') return;

    if (estado.miEstadoMoto === 'choque') {
      estado.tiempoChoqueRestante -= dt * 1000;
      if (estado.tiempoChoqueRestante <= 0) { estado.miEstadoMoto = 'normal'; estado.miVelocidad = VELOCIDAD_BASE; }
      return;
    }
    if (estado.miEstadoMoto === 'turbo') {
      estado.tiempoTurboRestante -= dt * 1000;
      if (estado.tiempoTurboRestante <= 0) { estado.miEstadoMoto = 'normal'; estado.miVelocidad = VELOCIDAD_BASE; }
    }

    estado.miX += estado.miVelocidad * dt;
    if (estado.miX >= LONGITUD_PISTA) { estado.miX = LONGITUD_PISTA; manejarLlegadaPropia(); return; }

    comprobarObstaculos();
    comprobarPickups();
  }

  function comprobarObstaculos() {
    for (const obs of estado.obstaculos) {
      if (!obs.resuelto && estado.miX >= obs.x - 0.6) { obs.resuelto = true; activarModoPregunta(); break; }
    }
  }

  function comprobarPickups() {
    for (const p of estado.pickups) {
      if (p.recogido || p.carril !== estado.carril) continue;
      if (Math.abs(estado.miX - p.x) <= 0.6) {
        p.recogido = true;
        aplicarPowerup(p.tipo);
        window.Juego3D.marcarPickupRecogido(p.id);
        window.Red.enviarItemRecogido(p.id);
        window.Red.enviarEvento('powerup', { powerTipo: p.tipo, nombre: estado.nombre });
        const info = window.POWERUPS.TIPOS[p.tipo];
        agregarEventoTicker(`${info.emoji} ¡${estado.nombre} recogió ${info.nombre}!`);
      }
    }
  }

  /* ==================================================================
     9. POWER-UPS
     ================================================================== */
  function aplicarPowerup(tipo) {
    if (tipo === 'rayo') {
      estado.miEstadoMoto = 'turbo';
      estado.miVelocidad = VELOCIDAD_BASE * CONFIG_NIVELES[estado.nivel].turboMultiplicador;
      estado.tiempoTurboRestante = window.POWERUPS.DURACION_RAYO_MS;
      mostrarFlash('¡RAYO!', 'var(--color-turbo)');
    } else if (tipo === 'escudo') {
      estado.tengoEscudo = true;
      mostrarFlash('ESCUDO LISTO', 'var(--color-escudo)');
    } else if (tipo === 'comodin') {
      estado.tengoComodin = true;
      mostrarFlash('COMODÍN 50/50', 'var(--color-comodin)');
    }
    actualizarIndicadoresPowerup();
  }

  function actualizarIndicadoresPowerup() {
    $('#hud-escudo').classList.toggle('oculto', !estado.tengoEscudo);
    $('#hud-comodin').classList.toggle('oculto', !estado.tengoComodin);
  }

  /* ==================================================================
     10. MODO PREGUNTA
     ================================================================== */
  function activarModoPregunta() {
    estado.miEstadoMoto = 'pregunta';
    estado.miVelocidad = 0;

    const banco = window.BANCO_PREGUNTAS[estado.nivel];
    let disponibles = banco.filter((_, i) => !estado.preguntasUsadas.has(i));
    if (disponibles.length === 0) { estado.preguntasUsadas.clear(); disponibles = banco; }
    const elegida = disponibles[Math.floor(Math.random() * disponibles.length)];
    const idx = banco.indexOf(elegida);
    estado.preguntasUsadas.add(idx);
    estado.preguntaActivaIdx = idx;

    $('#pregunta-tema').textContent = elegida.t;
    $('#pregunta-nivel-tag').textContent = estado.nivel;
    $('#pregunta-texto').textContent = elegida.p;

    let indices = [0, 1, 2, 3];
    if (estado.tengoComodin) {
      const incorrectas = indices.filter((i) => i !== elegida.c);
      for (let i = incorrectas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [incorrectas[i], incorrectas[j]] = [incorrectas[j], incorrectas[i]];
      }
      indices = [elegida.c, incorrectas[0]].sort((a, b) => a - b);
      estado.tengoComodin = false;
      actualizarIndicadoresPowerup();
      agregarEventoTicker('🎯 Usaste el comodín 50/50: 2 opciones eliminadas');
    }

    const cont = $('#opciones-pregunta');
    cont.innerHTML = '';
    indices.forEach((i) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'opciones-pregunta__boton';
      boton.textContent = elegida.o[i];
      boton.addEventListener('click', () => responderPregunta(i, boton, elegida));
      cont.appendChild(boton);
    });

    $('#overlay-pregunta').classList.remove('oculto');
  }

  function responderPregunta(indiceElegido, botonElegido, pregunta) {
    const esCorrecta = indiceElegido === pregunta.c;
    const botones = document.querySelectorAll('#opciones-pregunta .opciones-pregunta__boton');
    botones.forEach((b) => { b.disabled = true; });
    botonElegido.classList.add(esCorrecta ? 'opciones-pregunta__boton--correcta' : 'opciones-pregunta__boton--incorrecta');
    if (!esCorrecta) {
      botones.forEach((b) => { if (b.textContent === pregunta.o[pregunta.c]) b.classList.add('opciones-pregunta__boton--correcta'); });
    }

    setTimeout(() => {
      $('#overlay-pregunta').classList.add('oculto');
      if (esCorrecta) {
        activarTurbo();
      } else if (estado.tengoEscudo) {
        estado.tengoEscudo = false;
        actualizarIndicadoresPowerup();
        estado.miEstadoMoto = 'normal';
        estado.miVelocidad = VELOCIDAD_BASE;
        mostrarFlash('¡ESCUDO!', 'var(--color-escudo)');
        agregarEventoTicker('🛡️ Tu escudo absorbió el choque');
        window.Red.enviarEvento('escudo_usado', { nombre: estado.nombre });
      } else {
        activarChoque();
      }
    }, 900);
  }

  function activarTurbo() {
    const cfg = CONFIG_NIVELES[estado.nivel];
    estado.miEstadoMoto = 'turbo';
    estado.miVelocidad = VELOCIDAD_BASE * cfg.turboMultiplicador;
    estado.tiempoTurboRestante = DURACION_TURBO_MS;
    mostrarFlash('¡TURBO!', 'var(--color-turbo)');
    window.Red.enviarEvento('turbo', { nombre: estado.nombre });
  }

  function activarChoque() {
    const cfg = CONFIG_NIVELES[estado.nivel];
    estado.miEstadoMoto = 'choque';
    estado.miVelocidad = 0;
    estado.tiempoChoqueRestante = cfg.penalizacionSegundos * 1000;
    mostrarFlash('¡CHOQUE!', 'var(--color-choque)');
    window.Juego3D.efectoChoque(estado.jugadorId);
    window.Red.enviarEvento('choque', { nombre: estado.nombre });
  }

  function mostrarFlash(texto, color) {
    const el = $('#flash');
    el.textContent = texto;
    el.style.color = color;
    el.classList.remove('oculto');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    setTimeout(() => el.classList.add('oculto'), 900);
  }

  /* ==================================================================
     11. LLEGADA A META Y RESULTADOS
     ================================================================== */
  function manejarLlegadaPropia() {
    estado.miLlegue = true;
    estado.miEstadoMoto = 'meta';
    estado.miVelocidad = 0;
    clearInterval(estado.intervaloPublicacion);
    window.Red.enviarPosicion(estado.miX, 'meta');

    const tiempoMs = performance.now() - estado.tiempoInicio;
    estado.tiempoFinalSeg = tiempoMs / 1000;
    window.Red.enviarEvento('meta', { nombre: estado.nombre, nivel: estado.nivel, tiempoMs });
    registrarResultado(estado.jugadorId, estado.nombre, estado.nivel, tiempoMs);

    $('#overlay-meta-detalle').textContent = `Tu tiempo: ${formatearTiempo(tiempoMs)}`;
    $('#overlay-meta').classList.remove('oculto');
  }

  function registrarResultado(id, nombre, nivel, tiempoMs) {
    if (estado.resultados.some((r) => r.id === id)) return;
    estado.resultados.push({ id, nombre, nivel, tiempoMs });
    estado.resultados.sort((a, b) => a.tiempoMs - b.tiempoMs);
  }

  function renderResultadosUI() {
    const ol = $('#lista-resultados');
    if (estado.resultados.length === 0) { ol.innerHTML = '<li>Aún nadie ha llegado a la meta.</li>'; return; }
    ol.innerHTML = estado.resultados.map((r, i) => `
      <li>
        <span class="lista-resultados__puesto">${i + 1}º</span>
        <span>${escaparHtml(r.nombre)} · ${r.nivel}</span>
        <span class="lista-resultados__tiempo">${formatearTiempo(r.tiempoMs)}</span>
      </li>`).join('');
  }

  /* ==================================================================
     12. EVENTOS DE RED (jugadores remotos)
     ================================================================== */
  window.Red.on('pos', (datos) => {
    const j = estado.jugadores.get(datos.id);
    if (!j) return;
    j.xAnt = j.tAct ? j.xAct : datos.x;
    j.tAnt = j.tAct ? j.tAct : datos.t - INTERVALO_PUBLICACION_POS;
    j.xAct = datos.x; j.tAct = datos.t; j.estadoMoto = datos.e;
  });

  window.Red.on('evento', (datos) => {
    if (!datos || datos.id === estado.jugadorId) return;
    if (datos.tipo === 'turbo') {
      agregarEventoTicker(`⚡ ${datos.nombre} activó TURBO`);
    } else if (datos.tipo === 'choque') {
      agregarEventoTicker(`💥 ${datos.nombre} chocó`);
      window.Juego3D.efectoChoque(datos.id);
    } else if (datos.tipo === 'powerup') {
      const info = window.POWERUPS.TIPOS[datos.powerTipo];
      agregarEventoTicker(`${info.emoji} ${datos.nombre} recogió ${info.nombre}`);
    } else if (datos.tipo === 'escudo_usado') {
      agregarEventoTicker(`🛡️ ${datos.nombre} se protegió con su escudo`);
    } else if (datos.tipo === 'meta') {
      agregarEventoTicker(`🏁 ${datos.nombre} llegó a la meta`);
      registrarResultado(datos.id, datos.nombre, datos.nivel, datos.tiempoMs);
    }
  });

  window.Red.on('item_recogido', ({ idItem, jugadorId }) => {
    if (jugadorId === estado.jugadorId) return;
    const p = estado.pickups.find((x) => x.id === idItem);
    if (p) p.recogido = true;
    window.Juego3D.marcarPickupRecogido(idItem);
  });

  window.Red.on('conexion', actualizarEstadoConexionUI);

  function actualizarInterpolacionRemota() {
    const ahora = Date.now();
    for (const [id, j] of estado.jugadores) {
      if (id === estado.jugadorId) { j.xRender = estado.miX; continue; }
      if (!j.tAct) { j.xRender = 0; continue; }
      const dtMuestras = j.tAct - j.tAnt;
      const velocidad = dtMuestras > 0 ? (j.xAct - j.xAnt) / dtMuestras : 0;
      const extrapMs = Math.min(Math.max(ahora - j.tAct, 0), 400);
      j.xRender = j.xAct + velocidad * extrapMs;
    }
  }

  /* ==================================================================
     13. HUD
     ================================================================== */
  function actualizarHUD() {
    $('#hud-sala').textContent = estado.sala || '------';
    $('#hud-nivel').textContent = estado.nivel;
    const segundos = estado.miLlegue ? estado.tiempoFinalSeg : (performance.now() - estado.tiempoInicio) / 1000;
    $('#hud-tiempo').textContent = formatearReloj(segundos);
    $('#hud-posicion').textContent = `${calcularPuestoPropio()}/${estado.jugadores.size}`;
  }

  function calcularPuestoPropio() {
    const lista = Array.from(estado.jugadores.entries())
      .map(([id, j]) => ({ id, x: id === estado.jugadorId ? estado.miX : (j.xRender || 0) }))
      .sort((a, b) => b.x - a.x);
    return lista.findIndex((o) => o.id === estado.jugadorId) + 1;
  }

  /* ==================================================================
     14. NAVEGACIÓN Y ARRANQUE
     ================================================================== */
  function mostrarPantalla(nombre) {
    document.querySelectorAll('.pantalla').forEach((el) => el.classList.remove('pantalla--activa'));
    $(`[data-pantalla="${nombre}"]`).classList.add('pantalla--activa');
    estado.pantallaActual = nombre;
  }

  function mostrarMensajeLobby(mensaje, esError) {
    const el = $('#lobby-mensaje');
    el.textContent = mensaje;
    el.style.color = esError ? 'var(--color-choque)' : 'var(--color-texto-tenue)';
  }

  function actualizarEstadoConexionUI(valor) {
    const el = $('#estado-conexion');
    if (!el) return;
    el.classList.remove('estado-conexion--conectado', 'estado-conexion--conectando', 'estado-conexion--desconectado');
    el.classList.add('estado-conexion--' + valor);
    el.textContent = valor === 'conectado' ? 'Conectado' : 'Desconectado';
  }

  function salirYReiniciar() {
    window.Red.desconectar();
    setTimeout(() => location.reload(), 120);
  }

  function inicializarEventosUI() {
    $('#btn-crear-sala').addEventListener('click', crearSala);
    $('#btn-unirse-sala').addEventListener('click', unirseSala);
    $('#btn-iniciar-carrera').addEventListener('click', iniciarCarrera);
    $('#btn-salir-espera').addEventListener('click', salirYReiniciar);
    $('#btn-volver-lobby').addEventListener('click', salirYReiniciar);
    $('#btn-ver-resultados').addEventListener('click', () => {
      estado.corriendo = false;
      $('#overlay-meta').classList.add('oculto');
      renderResultadosUI();
      mostrarPantalla('resultados');
    });
    window.addEventListener('pagehide', () => window.Red.desconectar());

    window.Red.conectar(); // conecta pronto para mostrar el estado real en el lobby
  }

  document.addEventListener('DOMContentLoaded', inicializarEventosUI);
})();
