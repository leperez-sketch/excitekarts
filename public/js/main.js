/* ====================================================================
 * EXCITEBIKE EFL — main.js  (v2: rol espectador / jugador)
 * ====================================================================
 * Dos experiencias totalmente distintas comparten este archivo:
 *
 *  - ESPECTADOR (la pantalla grande / proyector del profesor): crea la
 *    sala, muestra el QR, y cuando arranca la carrera es la ÚNICA
 *    pantalla que carga Three.js y dibuja el circuito en 3D. Sigue con
 *    la cámara a quien vaya líder en cada momento (todas las motos le
 *    llegan por red, no tiene "mi propio" jugador).
 *
 *  - JUGADOR (el móvil de cada alumno): se une con el código, y su
 *    física/preguntas/power-ups funcionan exactamente igual que antes,
 *    pero JAMÁS toca Juego3D ni carga modelos 3D — su pantalla es un
 *    panel plano con un icono de estado y una barra de progreso. Así
 *    el móvil del alumno no descarga ni un byte de gráficos 3D.
 * ==================================================================== */

(function () {
  'use strict';

  /* ==================================================================
     1. CONFIGURACIÓN DE LA CARRERA
     ================================================================== */
  const NUM_CARRILES = 6;
  const LONGITUD_PISTA = 400;
  const NUM_OBSTACULOS = 5;
  const VELOCIDAD_BASE = 10;
  const DURACION_TURBO_MS = 1800;
  const INTERVALO_PUBLICACION_POS = 150;

  const CONFIG_NIVELES = {
    A1: { turboMultiplicador: 1.8, penalizacionSegundos: 2.6 },
    A2: { turboMultiplicador: 1.9, penalizacionSegundos: 2.3 },
    B1: { turboMultiplicador: 2.0, penalizacionSegundos: 2.0 },
    B2: { turboMultiplicador: 2.2, penalizacionSegundos: 1.7 },
    C1: { turboMultiplicador: 2.4, penalizacionSegundos: 1.4 },
  };

  const COLOR_CARRIL_CSS = ['#FF5C7A', '#5CDB6B', '#FFD23D', '#4AA8FF', '#FF8A3D', '#B36BFF'];

  /* ==================================================================
     2. ESTADO GLOBAL
     ================================================================== */
  const estado = {
    rol: null, // 'espectador' | 'jugador'
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
    ultimaActualizacionUIEspectador: 0,
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

  function iconoEstado(estadoMoto) {
    if (estadoMoto === 'turbo') return '⚡';
    if (estadoMoto === 'choque') return '💥';
    if (estadoMoto === 'meta') return '🏁';
    if (estadoMoto === 'pregunta') return '❓';
    return '🏍️';
  }

  /* ==================================================================
     4. LOBBY: elección de rol + entrada a sala
     ================================================================== */
  function elegirRolProfesor() {
    $('#eleccion-rol').classList.add('oculto');
    crearSalaComoEspectador();
  }

  function elegirRolAlumno() {
    $('#eleccion-rol').classList.add('oculto');
    $('#form-alumno').classList.remove('oculto');
  }

  function volverEleccion() {
    $('#form-alumno').classList.add('oculto');
    $('#eleccion-rol').classList.remove('oculto');
    mostrarMensajeLobby('', false);
  }

  function comprobarParametroSala() {
    const codigo = new URLSearchParams(location.search).get('sala');
    if (!codigo) return;
    $('#eleccion-rol').classList.add('oculto');
    $('#form-alumno').classList.remove('oculto');
    $('#input-sala').value = codigo.toUpperCase();
    $('#input-nombre').focus();
  }

  async function crearSalaComoEspectador() {
    mostrarMensajeLobby('Creando sala…', false);
    try {
      const resp = await window.Red.crearSala();
      estado.rol = 'espectador';
      $('#app').dataset.rol = 'espectador';
      entrarEnSala(resp);
    } catch (err) {
      mostrarMensajeLobby(err.message, true);
      $('#eleccion-rol').classList.remove('oculto');
    }
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
      estado.rol = 'jugador';
      $('#app').dataset.rol = 'jugador';
      entrarEnSala(resp);
    } catch (err) { mostrarMensajeLobby(err.message, true); }
  }

  function entrarEnSala(resp) {
    estado.sala = resp.codigo;
    estado.obstaculos = generarObstaculos(resp.codigo);
    estado.pickups = window.POWERUPS.generarPickups(resp.codigo, LONGITUD_PISTA, NUM_CARRILES, estado.obstaculos.map((o) => o.x));
    $('#codigo-sala-grande').textContent = estado.sala;

    if (estado.rol === 'jugador') {
      estado.jugadorId = resp.jugadorId;
      estado.carril = resp.carril;
    } else {
      generarQR(resp.codigo);
      prepararCargaAssets(); // solo el espectador descarga Three.js/GLB
    }

    mostrarPantalla('espera');
  }

  function generarQR(codigo) {
    const contenedor = $('#qr-contenedor');
    if (!contenedor || typeof QRCode === 'undefined') return;
    contenedor.innerHTML = '';
    const url = `${location.origin}${location.pathname}?sala=${codigo}`;
    // eslint-disable-next-line no-undef
    new QRCode(contenedor, { text: url, width: 150, height: 150, colorDark: '#0B0E1A', colorLight: '#ffffff' });
  }

  /* ==================================================================
     5. CARGA DE ASSETS 3D (solo espectador)
     ================================================================== */
  function prepararCargaAssets() {
    if (promesaAssets) return promesaAssets;
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
     6. ROSTER DE LA SALA
     ================================================================== */
  window.Red.on('roster', (roster) => {
    const idsNuevos = new Set(roster.map((j) => j.id));
    for (const id of Array.from(estado.jugadores.keys())) {
      if (!idsNuevos.has(id)) estado.jugadores.delete(id);
    }
    roster.forEach((j) => {
      const existente = estado.jugadores.get(j.id);
      const datos = {
        id: j.id, nombre: j.nombre, nivel: j.nivel, carril: j.carril,
        xAct: 0, xAnt: 0, tAct: 0, tAnt: 0, xRender: 0, estadoMoto: 'normal',
      };
      if (existente) Object.assign(existente, datos); else estado.jugadores.set(j.id, datos);
    });

    actualizarListaJugadoresUI();
    if (estado.rol === 'espectador' && estado.pantallaActual === 'juego') {
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
        <span class="lista-jugadores__insignia">${j.nivel}</span>
      </li>`).join('');
  }

  function iniciarCarrera() { window.Red.iniciarCarrera(); }

  /* ==================================================================
     7. SALIDA DE LA CARRERA
     ================================================================== */
  window.Red.on('carrera_iniciando', async ({ horaInicio }) => {
    if (estado.corriendo || (estado.enCuentaRegresiva && estado.horaInicioActual === horaInicio)) return;
    estado.enCuentaRegresiva = true;
    estado.horaInicioActual = horaInicio;

    mostrarPantalla('juego');

    if (estado.rol === 'espectador') {
      const overlay = $('#overlay-cuenta');
      overlay.classList.remove('oculto');
      overlay.textContent = 'Cargando…';

      // El renderer se crea AQUÍ, con el canvas ya visible (mostrarPantalla
      // ya puso display:flex): así toma las medidas reales del contenedor
      // en vez de quedarse fijado a un buffer de 1×1 píxel.
      window.Juego3D.inicializar($('#canvas-juego'));
      await esperarAssetsListos();

      window.Juego3D.construirPista({
        codigoSala: estado.sala, longitudPista: LONGITUD_PISTA, numCarriles: NUM_CARRILES,
        obstaculos: estado.obstaculos, pickups: estado.pickups,
      });
      window.Juego3D.sincronizarJugadores(Array.from(estado.jugadores.values()).map((j) => ({ id: j.id, carril: j.carril })));
    }

    iniciarCuentaRegresiva(horaInicio);
  });

  function iniciarCuentaRegresiva(horaInicio) {
    const overlay = $('#overlay-cuenta');
    function tick() {
      const restante = horaInicio - Date.now();
      if (restante <= 0) {
        overlay.classList.add('oculto');
        if (estado.rol === 'jugador') comenzarCarreraJugador(); else comenzarCarreraEspectador();
        return;
      }
      overlay.textContent = String(Math.ceil(restante / 1000));
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ==================================================================
     8A. BUCLE DEL JUGADOR (física, preguntas, power-ups — sin 3D)
     ================================================================== */
  function comenzarCarreraJugador() {
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

    requestAnimationFrame(bucleJugador);
  }

  function bucleJugador(marcaTiempo) {
    if (!estado.corriendo) return;
    const dt = estado.ultimoFrame ? Math.min((marcaTiempo - estado.ultimoFrame) / 1000, 0.1) : 0;
    estado.ultimoFrame = marcaTiempo;

    actualizarFisicaLocal(dt);
    actualizarInterpolacionRemota(); // para el indicador "Pos X/6"
    actualizarHUD();
    actualizarPanelJugador();

    requestAnimationFrame(bucleJugador);
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
        window.Red.enviarItemRecogido(p.id);
        window.Red.enviarEvento('powerup', { powerTipo: p.tipo, nombre: estado.nombre });
        const info = window.POWERUPS.TIPOS[p.tipo];
        agregarEventoTicker(`${info.emoji} ¡${estado.nombre} recogió ${info.nombre}!`);
      }
    }
  }

  function actualizarPanelJugador() {
    const pct = Math.min(100, (estado.miX / LONGITUD_PISTA) * 100);
    const barra = $('#jugador-barra-relleno');
    if (barra) barra.style.width = pct + '%';

    const icono = $('#jugador-icono');
    const texto = $('#jugador-estado-texto');
    if (!icono || !texto) return;
    icono.textContent = iconoEstado(estado.miEstadoMoto);
    texto.textContent = {
      pregunta: '¡Responde la pregunta!',
      turbo: '¡TURBO!',
      choque: 'Recuperándote…',
      meta: '¡Has llegado a la meta!',
    }[estado.miEstadoMoto] || '¡Avanzando!';
  }

  /* ==================================================================
     9. POWER-UPS (jugador)
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
    const escudo = $('#hud-escudo'), comodin = $('#hud-comodin');
    if (escudo) escudo.classList.toggle('oculto', !estado.tengoEscudo);
    if (comodin) comodin.classList.toggle('oculto', !estado.tengoComodin);
  }

  /* ==================================================================
     10. MODO PREGUNTA (jugador)
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
    window.Red.enviarEvento('choque', { nombre: estado.nombre });
  }

  function mostrarFlash(texto, color) {
    const el = $('#flash');
    if (!el) return;
    el.textContent = texto;
    el.style.color = color;
    el.classList.remove('oculto');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    setTimeout(() => el.classList.add('oculto'), 900);
  }

  /* ==================================================================
     11. LLEGADA A META Y RESULTADOS (jugador registra, ambos los ven)
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

  function comprobarTodosTerminaron() {
    if (estado.rol !== 'espectador' || !estado.corriendo) return;
    if (estado.jugadores.size > 0 && estado.resultados.length >= estado.jugadores.size) {
      setTimeout(() => {
        estado.corriendo = false;
        renderResultadosUI();
        mostrarPantalla('resultados');
      }, 2500);
    }
  }

  /* ==================================================================
     8B. BUCLE DEL ESPECTADOR (sigue al líder, dibuja el 3D)
     ================================================================== */
  function comenzarCarreraEspectador() {
    estado.tiempoInicio = performance.now();
    estado.ultimoFrame = 0;
    estado.corriendo = true;
    estado.enCuentaRegresiva = false;
    requestAnimationFrame(bucleEspectador);
  }

  function calcularLiderId() {
    let mejorId = null, mejorX = -Infinity;
    for (const [id, j] of estado.jugadores) {
      const x = j.xRender || 0;
      if (x > mejorX) { mejorX = x; mejorId = id; }
    }
    return mejorId;
  }

  function bucleEspectador(marcaTiempo) {
    if (!estado.corriendo) return;
    const dt = estado.ultimoFrame ? Math.min((marcaTiempo - estado.ultimoFrame) / 1000, 0.1) : 0;
    estado.ultimoFrame = marcaTiempo;

    actualizarInterpolacionRemota(); // aquí interpola a TODOS: no hay "yo" local

    const liderId = calcularLiderId();
    const lider = estado.jugadores.get(liderId);
    if (lider) {
      window.Juego3D.actualizarFrame({
        miId: liderId,
        miProgreso: lider.xRender || 0,
        miCarril: lider.carril,
        miEstadoMoto: lider.estadoMoto || 'normal',
        remotos: Array.from(estado.jugadores.values())
          .filter((j) => j.id !== liderId)
          .map((j) => ({ id: j.id, xRender: j.xRender || 0, carril: j.carril, estadoMoto: j.estadoMoto || 'normal' })),
        dt,
      });
    }

    if (marcaTiempo - estado.ultimaActualizacionUIEspectador > 200) {
      estado.ultimaActualizacionUIEspectador = marcaTiempo;
      actualizarHUDEspectador();
      actualizarLeaderboardEspectador();
    }

    requestAnimationFrame(bucleEspectador);
  }

  function actualizarHUDEspectador() {
    $('#hud-sala').textContent = estado.sala || '------';
    $('#hud-tiempo').textContent = formatearReloj((performance.now() - estado.tiempoInicio) / 1000);
  }

  function actualizarLeaderboardEspectador() {
    const ol = $('#leaderboard-espectador');
    if (!ol) return;
    const ordenados = Array.from(estado.jugadores.values()).sort((a, b) => (b.xRender || 0) - (a.xRender || 0));
    ol.innerHTML = ordenados.map((j, i) => `
      <li><span class="lb-puesto">${i + 1}º</span><span class="lb-icono">${iconoEstado(j.estadoMoto)}</span><span>${escaparHtml(j.nombre)}</span></li>
    `).join('');
  }

  /* ==================================================================
     12. EVENTOS DE RED
     ================================================================== */
  window.Red.on('pos', (datos) => {
    const j = estado.jugadores.get(datos.id);
    if (!j) return;
    j.xAnt = j.tAct ? j.xAct : datos.x;
    j.tAnt = j.tAct ? j.tAct : datos.t - INTERVALO_PUBLICACION_POS;
    j.xAct = datos.x; j.tAct = datos.t; j.estadoMoto = datos.e;
  });

  window.Red.on('evento', (datos) => {
    if (!datos) return;
    if (estado.rol === 'jugador' && datos.id === estado.jugadorId) return;

    if (datos.tipo === 'turbo') {
      agregarEventoTicker(`⚡ ${datos.nombre} activó TURBO`);
    } else if (datos.tipo === 'choque') {
      agregarEventoTicker(`💥 ${datos.nombre} chocó`);
      if (estado.rol === 'espectador') window.Juego3D.efectoChoque(datos.id);
    } else if (datos.tipo === 'powerup') {
      const info = window.POWERUPS.TIPOS[datos.powerTipo];
      agregarEventoTicker(`${info.emoji} ${datos.nombre} recogió ${info.nombre}`);
    } else if (datos.tipo === 'escudo_usado') {
      agregarEventoTicker(`🛡️ ${datos.nombre} se protegió con su escudo`);
    } else if (datos.tipo === 'meta') {
      agregarEventoTicker(`🏁 ${datos.nombre} llegó a la meta`);
      registrarResultado(datos.id, datos.nombre, datos.nivel, datos.tiempoMs);
      comprobarTodosTerminaron();
    }
  });

  window.Red.on('item_recogido', ({ idItem, jugadorId }) => {
    if (estado.rol === 'jugador' && jugadorId === estado.jugadorId) return;
    const p = estado.pickups.find((x) => x.id === idItem);
    if (p) p.recogido = true;
    if (estado.rol === 'espectador') window.Juego3D.marcarPickupRecogido(idItem);
  });

  window.Red.on('anfitrion_desconectado', () => {
    if (estado.rol !== 'jugador') return;
    const aviso = $('#aviso-anfitrion-perdido');
    if (!aviso) return;
    aviso.classList.remove('oculto');
    setTimeout(() => aviso.classList.add('oculto'), 6000);
  });

  window.Red.on('conexion', actualizarEstadoConexionUI);

  function actualizarInterpolacionRemota() {
    const ahora = Date.now();
    for (const [id, j] of estado.jugadores) {
      if (estado.rol === 'jugador' && id === estado.jugadorId) { j.xRender = estado.miX; continue; }
      if (!j.tAct) { j.xRender = j.xRender || 0; continue; }
      const dtMuestras = j.tAct - j.tAnt;
      const velocidad = dtMuestras > 0 ? (j.xAct - j.xAnt) / dtMuestras : 0;
      const extrapMs = Math.min(Math.max(ahora - j.tAct, 0), 400);
      j.xRender = j.xAct + velocidad * extrapMs;
    }
  }

  /* ==================================================================
     13. HUD (jugador)
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
     14. TICKER DE EVENTOS
     ================================================================== */
  function agregarEventoTicker(texto) {
    const ul = $('#ticker-eventos');
    if (!ul) return;
    const li = document.createElement('li');
    li.textContent = texto;
    ul.appendChild(li);
    while (ul.children.length > 4) ul.removeChild(ul.firstChild);
    setTimeout(() => { if (li.parentNode) li.parentNode.removeChild(li); }, 6000);
  }

  /* ==================================================================
     15. NAVEGACIÓN Y ARRANQUE
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
    $('#btn-rol-profesor').addEventListener('click', elegirRolProfesor);
    $('#btn-rol-alumno').addEventListener('click', elegirRolAlumno);
    $('#btn-volver-eleccion').addEventListener('click', volverEleccion);
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

    comprobarParametroSala();
    window.Red.conectar();
  }

  document.addEventListener('DOMContentLoaded', inicializarEventosUI);
})();
