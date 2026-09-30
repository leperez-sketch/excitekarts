/* ====================================================================
 * EXCITEBIKE EFL — main.js  (v3: circuito, vueltas, puntos y audio)
 * ====================================================================
 * Misma separación de siempre (toda la lógica aquí; Juego3D solo
 * dibuja), con las piezas nuevas de esta versión:
 *  - El alumno elige su carrito al unirse.
 *  - El profesor elige la pista antes de cada carrera.
 *  - La carrera ahora son 3 VUELTAS a un circuito cerrado (ver
 *    pistas.js), no una recta de un solo sentido.
 *  - Hay una tabla de puntos que se ACUMULA si se juegan varias
 *    carreras seguidas en la misma sala ("Nueva carrera" cambia de
 *    pista sin perder el marcador ni a los jugadores).
 *  - Efectos de sonido, música y la voz del conteo regresivo (ver
 *    audio.js) enganchados en los mismos puntos donde antes solo
 *    pasaban cosas visuales.
 * ==================================================================== */

(function () {
  'use strict';

  /* ==================================================================
     1. CONFIGURACIÓN DE LA CARRERA
     ================================================================== */
  const NUM_VUELTAS = 3;
  const VELOCIDAD_BASE = 1.15;  // tiles/segundo en ritmo normal
  const DURACION_TURBO_MS = 1800;
  const INTERVALO_PUBLICACION_POS = 150;
  const PUNTOS_POR_POSICION = [10, 8, 6, 4, 2, 1];

  const CONFIG_NIVELES = {
    A1: { turboMultiplicador: 1.8, penalizacionSegundos: 2.6 },
    A2: { turboMultiplicador: 1.9, penalizacionSegundos: 2.3 },
    B1: { turboMultiplicador: 2.0, penalizacionSegundos: 2.0 },
    B2: { turboMultiplicador: 2.2, penalizacionSegundos: 1.7 },
    C1: { turboMultiplicador: 2.4, penalizacionSegundos: 1.4 },
  };

  const KART_OPCIONES = [
    { id: 'kart-oobi', emoji: '🏎️', nombre: 'Rayo' },
    { id: 'kart-oodi', emoji: '🚗', nombre: 'Trueno' },
    { id: 'kart-ooli', emoji: '🚙', nombre: 'Cometa' },
    { id: 'kart-oopi', emoji: '🛺', nombre: 'Chispa' },
    { id: 'kart-oozi', emoji: '🏁', nombre: 'Bólido' },
  ];

  /* ==================================================================
     2. ESTADO GLOBAL
     ================================================================== */
  const estado = {
    rol: null, sala: null, jugadorId: null, nombre: '', nivel: 'B1', formaKart: KART_OPCIONES[0].id,
    idPista: null,
    jugadores: new Map(),      // roster: id -> {nombre, nivel, formaKart, xAct,xAnt,tAct,tAnt,xRender,estadoMoto}
    puntosTotales: new Map(),  // id -> puntos acumulados en la sesión de esta sala
    resultados: [],            // de la carrera ACTUAL
    obstaculos: [], pickups: [],
    preguntasUsadas: new Set(),
    preguntaActivaIdx: null,
    pantallaActual: 'lobby',

    corriendo: false, enCuentaRegresiva: false, ultimoFrame: 0,
    horaInicioActual: null,

    miProgreso: 0, miVelocidad: 0, miEstadoMoto: 'normal', miLlegue: false, miVuelta: 0,
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

  function iconoEstado(estadoMoto) {
    if (estadoMoto === 'turbo') return '⚡';
    if (estadoMoto === 'choque') return '💥';
    if (estadoMoto === 'meta') return '🏁';
    if (estadoMoto === 'pregunta') return '❓';
    return '🏍️';
  }

  function clic() { window.SonidoJuego.reproducirClick(); }

  /* ==================================================================
     4. LOBBY: elección de rol + carrito + entrada a sala
     ================================================================== */
  function pintarSelectorKart() {
    const cont = $('#selector-kart');
    if (!cont) return;
    cont.innerHTML = KART_OPCIONES.map((k) => `
      <button type="button" class="kart-opcion${k.id === estado.formaKart ? ' kart-opcion--activa' : ''}" data-kart="${k.id}">
        <span class="kart-opcion__emoji">${k.emoji}</span>
        <span class="kart-opcion__nombre">${k.nombre}</span>
      </button>`).join('');
    cont.querySelectorAll('.kart-opcion').forEach((boton) => {
      boton.addEventListener('click', () => {
        clic();
        estado.formaKart = boton.dataset.kart;
        cont.querySelectorAll('.kart-opcion').forEach((b) => b.classList.remove('kart-opcion--activa'));
        boton.classList.add('kart-opcion--activa');
      });
    });
  }

  function elegirRolProfesor() {
    window.SonidoJuego.activar();
    clic();
    $('#eleccion-rol').classList.add('oculto');
    crearSalaComoEspectador();
  }

  function elegirRolAlumno() {
    window.SonidoJuego.activar();
    clic();
    $('#eleccion-rol').classList.add('oculto');
    $('#form-alumno').classList.remove('oculto');
    pintarSelectorKart();
  }

  function volverEleccion() {
    clic();
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
    pintarSelectorKart();
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
      const resp = await window.Red.unirseSala(codigo, nombre, estado.nivel, estado.formaKart);
      estado.rol = 'jugador';
      $('#app').dataset.rol = 'jugador';
      entrarEnSala(resp);
    } catch (err) { mostrarMensajeLobby(err.message, true); }
  }

  function entrarEnSala(resp) {
    estado.sala = resp.codigo;
    $('#codigo-sala-grande').textContent = estado.sala;

    if (estado.rol === 'jugador') {
      estado.jugadorId = resp.jugadorId;
    } else {
      generarQR(resp.codigo);
      prepararCargaAssets();
      pintarSelectorPistas();
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
     5. SELECCIÓN DE PISTA (solo espectador)
     ================================================================== */
  function pintarSelectorPistas() {
    const cont = $('#selector-pistas');
    if (!cont) return;
    if (!estado.idPista) estado.idPista = window.PISTAS.LISTA[0];
    cont.innerHTML = window.PISTAS.LISTA.map((id) => {
      const p = window.PISTAS.obtener(id);
      return `
        <button type="button" class="pista-opcion${id === estado.idPista ? ' pista-opcion--activa' : ''}" data-pista="${id}">
          <span class="pista-opcion__emoji">${p.emoji}</span>
          <span class="pista-opcion__nombre">${p.nombre}</span>
          <span class="pista-opcion__detalle">${p.numTiles} tiles · ${NUM_VUELTAS} vueltas</span>
        </button>`;
    }).join('');
    cont.querySelectorAll('.pista-opcion').forEach((boton) => {
      boton.addEventListener('click', () => {
        clic();
        estado.idPista = boton.dataset.pista;
        cont.querySelectorAll('.pista-opcion').forEach((b) => b.classList.remove('pista-opcion--activa'));
        boton.classList.add('pista-opcion--activa');
        window.Red.seleccionarPista(estado.idPista);
      });
    });
    window.Red.seleccionarPista(estado.idPista);
  }

  window.Red.on('pista_seleccionada', ({ idPista }) => { estado.idPista = idPista; });

  /* ==================================================================
     6. CARGA DE ASSETS 3D (solo espectador)
     ================================================================== */
  function prepararCargaAssets() {
    if (promesaAssets) return promesaAssets;
    const conTimeout = new Promise((_r, reject) => {
      setTimeout(() => reject(new Error('La carga de los gráficos 3D tardó demasiado (>25s). Revisa la conexión y recarga.')), 25000);
    });
    promesaAssets = Promise.race([window.Juego3D.cargarAssets((f) => actualizarBarraCarga(f)), conTimeout])
      .then(() => { estado.assetsListos = true; actualizarBarraCarga(1); })
      .catch((err) => {
        console.error('[Juego3D] Error cargando assets:', err);
        const mensaje = 'No se pudieron cargar los gráficos 3D: ' + err.message;
        mostrarMensajeLobby(mensaje, true);
        const etiqueta = document.querySelector('.barra-carga-etiqueta');
        if (etiqueta) { etiqueta.textContent = '⚠️ ' + mensaje; etiqueta.style.color = 'var(--color-choque)'; }
        throw err;
      });
    return promesaAssets;
  }

  function esperarAssetsListos() { return promesaAssets || Promise.resolve(); }

  function actualizarBarraCarga(fraccion) {
    const relleno = $('#barra-carga-relleno');
    if (relleno) relleno.style.width = Math.round(fraccion * 100) + '%';
  }

  /* ==================================================================
     7. ROSTER DE LA SALA
     ================================================================== */
  window.Red.on('roster', (roster) => {
    const idsNuevos = new Set(roster.map((j) => j.id));
    for (const id of Array.from(estado.jugadores.keys())) {
      if (!idsNuevos.has(id)) estado.jugadores.delete(id);
    }
    roster.forEach((j) => {
      const existente = estado.jugadores.get(j.id);
      const datos = {
        id: j.id, nombre: j.nombre, nivel: j.nivel, formaKart: j.formaKart,
        xAct: 0, xAnt: 0, tAct: 0, tAnt: 0, xRender: 0, estadoMoto: 'normal',
      };
      if (existente) Object.assign(existente, datos); else estado.jugadores.set(j.id, datos);
      if (!estado.puntosTotales.has(j.id)) estado.puntosTotales.set(j.id, 0);
    });

    actualizarListaJugadoresUI();
    if (estado.rol === 'espectador' && estado.pantallaActual === 'juego') {
      window.Juego3D.sincronizarJugadores(Array.from(estado.jugadores.values()).map((j) => ({ id: j.id, formaKart: j.formaKart })));
    }
  });

  function actualizarListaJugadoresUI() {
    const ul = $('#lista-jugadores');
    if (!ul) return;
    const ordenados = Array.from(estado.jugadores.values());
    ul.innerHTML = ordenados.map((j) => {
      const kart = KART_OPCIONES.find((k) => k.id === j.formaKart) || KART_OPCIONES[0];
      return `
      <li class="lista-jugadores__item">
        <span class="lista-jugadores__color">${kart.emoji}</span>
        <span class="lista-jugadores__nombre">${escaparHtml(j.nombre)}${j.id === estado.jugadorId ? ' (tú)' : ''}</span>
        <span class="lista-jugadores__insignia">${j.nivel}</span>
      </li>`;
    }).join('');
  }

  function iniciarCarrera() { clic(); window.Red.iniciarCarrera(); }

  /* ==================================================================
     8. SALIDA DE LA CARRERA
     ================================================================== */
  window.Red.on('carrera_iniciando', async ({ horaInicio, idPista }) => {
    if (estado.corriendo || (estado.enCuentaRegresiva && estado.horaInicioActual === horaInicio)) return;
    estado.enCuentaRegresiva = true;
    estado.horaInicioActual = horaInicio;
    estado.idPista = idPista;
    estado.resultados = [];

    const pista = window.PISTAS.obtener(idPista);
    estado.obstaculos = pista.obstaculos.map((indice) => ({ indice, ultimaVueltaResuelta: -1 }));
    estado.pickups = pista.pickups.map((indice) => ({
      indice, id: 'pu' + indice, tipo: window.POWERUPS.tipoParaIndice(indice), recogido: false,
    }));

    mostrarPantalla('juego');
    const overlay = $('#overlay-cuenta');
    overlay.classList.remove('oculto');
    overlay.classList.remove('overlay-cuenta--error');

    try {
      if (estado.rol === 'espectador') {
        overlay.textContent = 'Cargando…';
        window.Juego3D.inicializar($('#canvas-juego'));
        await esperarAssetsListos();
        window.Juego3D.construirPista({ idPista, obstaculos: pista.obstaculos, pickups: pista.pickups });
        window.Juego3D.sincronizarJugadores(Array.from(estado.jugadores.values()).map((j) => ({ id: j.id, formaKart: j.formaKart })));
      }
      iniciarCuentaRegresiva(horaInicio);
    } catch (err) {
      console.error('[carrera_iniciando] Fallo al arrancar la carrera:', err);
      overlay.textContent = '⚠️ Error al cargar. Revisa la consola (F12) y recarga la página.';
      overlay.classList.add('overlay-cuenta--error');
    }
  });

  function iniciarCuentaRegresiva(horaInicio) {
    const overlay = $('#overlay-cuenta');
    let ultimoNumeroDicho = null;
    function tick() {
      const restante = horaInicio - Date.now();
      const numero = Math.max(0, Math.ceil(restante / 1000));
      if (restante <= 0) {
        overlay.classList.add('oculto');
        window.SonidoJuego.iniciarMusica();
        if (estado.rol === 'jugador') comenzarCarreraJugador(); else comenzarCarreraEspectador();
        return;
      }
      overlay.textContent = String(numero);
      if (numero !== ultimoNumeroDicho && numero <= 3) { window.SonidoJuego.decirCuentaAtras(numero); ultimoNumeroDicho = numero; }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ==================================================================
     9A. BUCLE DEL JUGADOR (física, vueltas, preguntas, power-ups)
     ================================================================== */
  function comenzarCarreraJugador() {
    estado.miProgreso = 0;
    estado.miVelocidad = VELOCIDAD_BASE;
    estado.miEstadoMoto = 'normal';
    estado.miLlegue = false;
    estado.miVuelta = 0;
    estado.preguntasUsadas.clear();
    estado.obstaculos.forEach((o) => { o.ultimaVueltaResuelta = -1; });
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
      window.Red.enviarPosicion(Math.round(estado.miProgreso * 100) / 100, estado.miEstadoMoto);
    }, INTERVALO_PUBLICACION_POS);

    requestAnimationFrame(bucleJugador);
  }

  function bucleJugador(marcaTiempo) {
    if (!estado.corriendo) return;
    const dt = estado.ultimoFrame ? Math.min((marcaTiempo - estado.ultimoFrame) / 1000, 0.1) : 0;
    estado.ultimoFrame = marcaTiempo;

    actualizarFisicaLocal(dt);
    actualizarInterpolacionRemota();
    actualizarHUD();
    actualizarPanelJugador();

    requestAnimationFrame(bucleJugador);
  }

  function longitudPista() { return window.PISTAS.obtener(estado.idPista).numTiles; }

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

    estado.miProgreso += estado.miVelocidad * dt;
    const numTiles = longitudPista();
    const nuevaVuelta = Math.floor(estado.miProgreso / numTiles);
    if (nuevaVuelta > estado.miVuelta) {
      estado.miVuelta = nuevaVuelta;
      if (estado.miVuelta < NUM_VUELTAS) { window.SonidoJuego.reproducirVuelta(); agregarEventoTicker(`🏁 ${estado.nombre} — vuelta ${estado.miVuelta + 1}/${NUM_VUELTAS}`); }
    }
    if (estado.miVuelta >= NUM_VUELTAS) { manejarLlegadaPropia(); return; }

    comprobarObstaculos(numTiles);
    comprobarPickups(numTiles);
  }

  function comprobarObstaculos(numTiles) {
    const tileActual = window.PISTAS.indiceTileEnProgreso(numTiles, estado.miProgreso);
    for (const obs of estado.obstaculos) {
      if (obs.ultimaVueltaResuelta < estado.miVuelta && tileActual === obs.indice) {
        obs.ultimaVueltaResuelta = estado.miVuelta;
        activarModoPregunta();
        break;
      }
    }
  }

  function comprobarPickups(numTiles) {
    const tileActual = window.PISTAS.indiceTileEnProgreso(numTiles, estado.miProgreso);
    for (const p of estado.pickups) {
      if (p.recogido || p.indice !== tileActual) continue;
      p.recogido = true;
      aplicarPowerup(p.tipo);
      window.Red.enviarItemRecogido(p.id);
      window.Red.enviarEvento('powerup', { powerTipo: p.tipo, nombre: estado.nombre });
      window.SonidoJuego.reproducirPickup();
      const info = window.POWERUPS.TIPOS[p.tipo];
      agregarEventoTicker(`${info.emoji} ¡${estado.nombre} recogió ${info.nombre}!`);
      setTimeout(() => { p.recogido = false; }, window.POWERUPS.SEGUNDOS_REAPARICION * 1000);
    }
  }

  function actualizarPanelJugador() {
    const pct = Math.min(100, ((estado.miProgreso % longitudPista()) / longitudPista()) * 100);
    const barra = $('#jugador-barra-relleno');
    if (barra) barra.style.width = pct + '%';
    const icono = $('#jugador-icono');
    const texto = $('#jugador-estado-texto');
    if (!icono || !texto) return;
    icono.textContent = iconoEstado(estado.miEstadoMoto);
    texto.textContent = {
      pregunta: '¡Responde la pregunta!', turbo: '¡TURBO!', choque: 'Recuperándote…', meta: '¡Meta!',
    }[estado.miEstadoMoto] || '¡Avanzando!';
  }

  /* ==================================================================
     10. POWER-UPS
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
     11. MODO PREGUNTA
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
    if (!esCorrecta) botones.forEach((b) => { if (b.textContent === pregunta.o[pregunta.c]) b.classList.add('opciones-pregunta__boton--correcta'); });
    esCorrecta ? window.SonidoJuego.reproducirPreguntaCorrecta() : window.SonidoJuego.reproducirPreguntaIncorrecta();

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
    window.SonidoJuego.reproducirTurbo();
    window.Red.enviarEvento('turbo', { nombre: estado.nombre });
  }

  function activarChoque() {
    const cfg = CONFIG_NIVELES[estado.nivel];
    estado.miEstadoMoto = 'choque';
    estado.miVelocidad = 0;
    estado.tiempoChoqueRestante = cfg.penalizacionSegundos * 1000;
    mostrarFlash('¡CHOQUE!', 'var(--color-choque)');
    window.SonidoJuego.reproducirChoque();
    window.Juego3D.efectoChoque(estado.jugadorId);
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
     12. LLEGADA A META, PUNTOS Y RESULTADOS
     ================================================================== */
  function manejarLlegadaPropia() {
    estado.miLlegue = true;
    estado.miEstadoMoto = 'meta';
    estado.miVelocidad = 0;
    clearInterval(estado.intervaloPublicacion);
    window.Red.enviarPosicion(estado.miProgreso, 'meta');

    const tiempoMs = performance.now() - estado.tiempoInicio;
    estado.tiempoFinalSeg = tiempoMs / 1000;
    window.SonidoJuego.reproducirVictoria();
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

  function repartirPuntos() {
    estado.resultados.forEach((r, i) => {
      const puntos = PUNTOS_POR_POSICION[i] || 0;
      estado.puntosTotales.set(r.id, (estado.puntosTotales.get(r.id) || 0) + puntos);
    });
  }

  function renderResultadosUI() {
    repartirPuntos();
    const ol = $('#lista-resultados');
    if (estado.resultados.length === 0) { ol.innerHTML = '<li>Aún nadie ha llegado a la meta.</li>'; }
    else {
      ol.innerHTML = estado.resultados.map((r, i) => `
        <li>
          <span class="lista-resultados__puesto">${i + 1}º</span>
          <span>${escaparHtml(r.nombre)} · ${r.nivel}</span>
          <span class="lista-resultados__tiempo">+${PUNTOS_POR_POSICION[i] || 0} pts · ${formatearTiempo(r.tiempoMs)}</span>
        </li>`).join('');
    }

    const tabla = $('#tabla-puntos');
    if (tabla) {
      const ordenados = Array.from(estado.puntosTotales.entries()).sort((a, b) => b[1] - a[1]);
      tabla.innerHTML = ordenados.map(([id, pts]) => {
        const j = estado.jugadores.get(id);
        return `<li><span>${j ? escaparHtml(j.nombre) : '???'}</span><span class="tabla-puntos__valor">${pts} pts</span></li>`;
      }).join('');
    }

    const btnNueva = $('#btn-nueva-carrera');
    if (btnNueva) btnNueva.classList.toggle('boton--oculto', estado.rol !== 'espectador');
  }

  function comprobarTodosTerminaron() {
    if (estado.rol !== 'espectador' || !estado.corriendo) return;
    if (estado.jugadores.size > 0 && estado.resultados.length >= estado.jugadores.size) {
      window.SonidoJuego.detenerMusica();
      setTimeout(() => { estado.corriendo = false; renderResultadosUI(); mostrarPantalla('resultados'); }, 2500);
    }
  }

  function nuevaCarrera() {
    clic();
    estado.resultados = [];
    mostrarPantalla('espera');
    pintarSelectorPistas();
  }

  /* ==================================================================
     9B. BUCLE DEL ESPECTADOR (sin cámara que mover: es fija)
     ================================================================== */
  function comenzarCarreraEspectador() {
    estado.tiempoInicio = performance.now();
    estado.ultimoFrame = 0;
    estado.corriendo = true;
    estado.enCuentaRegresiva = false;
    requestAnimationFrame(bucleEspectador);
  }

  function bucleEspectador(marcaTiempo) {
    if (!estado.corriendo) return;
    const dt = estado.ultimoFrame ? Math.min((marcaTiempo - estado.ultimoFrame) / 1000, 0.1) : 0;
    estado.ultimoFrame = marcaTiempo;

    actualizarInterpolacionRemota();

    window.Juego3D.actualizarFrame({
      jugadores: Array.from(estado.jugadores.values()).map((j) => ({ id: j.id, progreso: j.xRender || 0, estadoMoto: j.estadoMoto || 'normal' })),
      dt,
    });

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
     13. EVENTOS DE RED
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

    if (datos.tipo === 'turbo') agregarEventoTicker(`⚡ ${datos.nombre} activó TURBO`);
    else if (datos.tipo === 'choque') { agregarEventoTicker(`💥 ${datos.nombre} chocó`); if (estado.rol === 'espectador') window.Juego3D.efectoChoque(datos.id); }
    else if (datos.tipo === 'powerup') { const info = window.POWERUPS.TIPOS[datos.powerTipo]; agregarEventoTicker(`${info.emoji} ${datos.nombre} recogió ${info.nombre}`); }
    else if (datos.tipo === 'escudo_usado') agregarEventoTicker(`🛡️ ${datos.nombre} se protegió con su escudo`);
    else if (datos.tipo === 'meta') {
      agregarEventoTicker(`🏁 ${datos.nombre} llegó a la meta`);
      registrarResultado(datos.id, datos.nombre, datos.nivel, datos.tiempoMs);
      comprobarTodosTerminaron();
    }
  });

  window.Red.on('item_recogido', ({ idItem, jugadorId }) => {
    if (estado.rol === 'jugador' && jugadorId === estado.jugadorId) return;
    const p = estado.pickups.find((x) => x.id === idItem);
    if (p) {
      p.recogido = true;
      setTimeout(() => { p.recogido = false; if (estado.rol === 'espectador') window.Juego3D.reactivarPickup(idItem); }, window.POWERUPS.SEGUNDOS_REAPARICION * 1000);
    }
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
      if (estado.rol === 'jugador' && id === estado.jugadorId) { j.xRender = estado.miProgreso; continue; }
      if (!j.tAct) { j.xRender = j.xRender || 0; continue; }
      const dtMuestras = j.tAct - j.tAnt;
      const velocidad = dtMuestras > 0 ? (j.xAct - j.xAnt) / dtMuestras : 0;
      const extrapMs = Math.min(Math.max(ahora - j.tAct, 0), 400);
      j.xRender = j.xAct + velocidad * extrapMs;
    }
  }

  /* ==================================================================
     14. HUD (jugador)
     ================================================================== */
  function actualizarHUD() {
    $('#hud-sala').textContent = estado.sala || '------';
    $('#hud-nivel').textContent = estado.nivel;
    const segundos = estado.miLlegue ? estado.tiempoFinalSeg : (performance.now() - estado.tiempoInicio) / 1000;
    $('#hud-tiempo').textContent = formatearReloj(segundos);
    $('#hud-vuelta').textContent = `${Math.min(estado.miVuelta + 1, NUM_VUELTAS)}/${NUM_VUELTAS}`;
    $('#hud-posicion').textContent = `${calcularPuestoPropio()}/${estado.jugadores.size}`;
  }

  function calcularPuestoPropio() {
    const lista = Array.from(estado.jugadores.entries())
      .map(([id, j]) => ({ id, x: id === estado.jugadorId ? estado.miProgreso : (j.xRender || 0) }))
      .sort((a, b) => b.x - a.x);
    return lista.findIndex((o) => o.id === estado.jugadorId) + 1;
  }

  /* ==================================================================
     15. TICKER DE EVENTOS
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
     16. NAVEGACIÓN Y ARRANQUE
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

  function alternarMute() {
    const silenciado = window.SonidoJuego.alternarMute();
    const boton = $('#btn-mute');
    if (boton) boton.textContent = silenciado ? '🔇' : '🔊';
  }

  function mostrarAvisoErrorGlobal(mensaje) {
    let aviso = document.getElementById('aviso-error-global');
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'aviso-error-global';
      aviso.className = 'aviso-error-global';
      document.body.appendChild(aviso);
    }
    aviso.textContent = '⚠️ ' + mensaje;
    aviso.classList.add('aviso-error-global--visible');
  }

  function inicializarEventosUI() {
    $('#btn-rol-profesor').addEventListener('click', elegirRolProfesor);
    $('#btn-rol-alumno').addEventListener('click', elegirRolAlumno);
    $('#btn-volver-eleccion').addEventListener('click', volverEleccion);
    $('#btn-unirse-sala').addEventListener('click', unirseSala);
    $('#btn-iniciar-carrera').addEventListener('click', iniciarCarrera);
    $('#btn-salir-espera').addEventListener('click', salirYReiniciar);
    $('#btn-volver-lobby').addEventListener('click', salirYReiniciar);
    $('#btn-nueva-carrera').addEventListener('click', nuevaCarrera);
    $('#btn-mute').addEventListener('click', alternarMute);
    $('#btn-ver-resultados').addEventListener('click', () => {
      estado.corriendo = false;
      $('#overlay-meta').classList.add('oculto');
      window.SonidoJuego.detenerMusica();
      renderResultadosUI();
      mostrarPantalla('resultados');
    });
    window.addEventListener('pagehide', () => window.Red.desconectar());

    window.addEventListener('error', (ev) => {
      console.error('[Error global]', ev.error || ev.message);
      mostrarAvisoErrorGlobal('Ha ocurrido un error inesperado. Revisa la consola (F12) para más detalle.');
    });
    window.addEventListener('unhandledrejection', (ev) => {
      console.error('[Promesa no gestionada]', ev.reason);
      mostrarAvisoErrorGlobal('Ha ocurrido un error inesperado. Revisa la consola (F12) para más detalle.');
    });

    comprobarParametroSala();
    window.Red.conectar();
  }

  document.addEventListener('DOMContentLoaded', inicializarEventosUI);
})();
