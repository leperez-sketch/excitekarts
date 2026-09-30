/* ====================================================================
 * EXCITEBIKE EFL — audio.js
 * ====================================================================
 * Todo el sonido del juego generado en el propio navegador con la Web
 * Audio API (osciladores/ruido) y la Web Speech API (voz del sistema
 * para el conteo regresivo) — no hace falta ni un solo archivo .mp3.
 *
 * Los navegadores bloquean el audio hasta que el usuario interactúa
 * con la página (política "autoplay"): por eso `activar()` se llama
 * desde el primer clic real (elegir rol / unirse), no antes.
 * ==================================================================== */

window.SonidoJuego = (function () {
  let ctx = null;
  let ganMaestro = null;
  let silenciado = false;
  let osciladoresMusica = [];
  let temporizadorMusica = null;

  function activar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // navegador muy antiguo sin Web Audio: el juego sigue sin sonido
    ctx = new AC();
    ganMaestro = ctx.createGain();
    ganMaestro.gain.value = silenciado ? 0 : 0.5;
    ganMaestro.connect(ctx.destination);
  }

  function alternarMute() {
    silenciado = !silenciado;
    if (ganMaestro) ganMaestro.gain.setTargetAtTime(silenciado ? 0 : 0.5, ctx.currentTime, 0.05);
    return silenciado;
  }
  function estaSilenciado() { return silenciado; }

  /* ---------------- Fábricas de sonido básicas ---------------- */
  function tono({ frecInicial, frecFinal, duracion, tipo = 'sine', volumen = 0.3, retardo = 0 }) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.type = tipo;
    const t0 = ctx.currentTime + retardo;
    osc.frequency.setValueAtTime(frecInicial, t0);
    if (frecFinal !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(frecFinal, 1), t0 + duracion);
    gan.gain.setValueAtTime(volumen, t0);
    gan.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);
    osc.connect(gan).connect(ganMaestro);
    osc.start(t0);
    osc.stop(t0 + duracion + 0.02);
  }

  function ruidoBlanco({ duracion, volumen = 0.3, retardo = 0, frecFiltro = 800 }) {
    if (!ctx) return;
    const muestras = Math.floor(ctx.sampleRate * duracion);
    const buffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / muestras);
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = frecFiltro;
    const gan = ctx.createGain();
    gan.gain.value = volumen;
    fuente.connect(filtro).connect(gan).connect(ganMaestro);
    fuente.start(ctx.currentTime + retardo);
  }

  /* ---------------- Efectos concretos del juego ---------------- */
  function reproducirClick() { tono({ frecInicial: 700, duracion: 0.06, tipo: 'square', volumen: 0.15 }); }

  function reproducirTurbo() {
    tono({ frecInicial: 180, frecFinal: 900, duracion: 0.35, tipo: 'sawtooth', volumen: 0.28 });
    tono({ frecInicial: 260, frecFinal: 1100, duracion: 0.3, tipo: 'triangle', volumen: 0.18, retardo: 0.03 });
  }

  function reproducirChoque() {
    ruidoBlanco({ duracion: 0.35, volumen: 0.35, frecFiltro: 500 });
    tono({ frecInicial: 140, frecFinal: 40, duracion: 0.3, tipo: 'square', volumen: 0.25 });
  }

  function reproducirPickup() {
    tono({ frecInicial: 500, frecFinal: 1200, duracion: 0.18, tipo: 'sine', volumen: 0.22 });
    tono({ frecInicial: 900, frecFinal: 1600, duracion: 0.14, tipo: 'sine', volumen: 0.15, retardo: 0.06 });
  }

  function reproducirPreguntaCorrecta() {
    [523, 659, 784].forEach((f, i) => tono({ frecInicial: f, duracion: 0.16, tipo: 'triangle', volumen: 0.22, retardo: i * 0.09 }));
  }

  function reproducirPreguntaIncorrecta() {
    tono({ frecInicial: 220, frecFinal: 130, duracion: 0.28, tipo: 'sawtooth', volumen: 0.22 });
  }

  function reproducirVuelta() {
    [660, 880].forEach((f, i) => tono({ frecInicial: f, duracion: 0.2, tipo: 'sine', volumen: 0.25, retardo: i * 0.1 }));
  }

  function reproducirVictoria() {
    [523, 659, 784, 1047].forEach((f, i) => tono({ frecInicial: f, duracion: 0.3, tipo: 'triangle', volumen: 0.26, retardo: i * 0.14 }));
  }

  function reproducirBeepCuenta(esFinal) {
    tono({ frecInicial: esFinal ? 880 : 440, duracion: esFinal ? 0.4 : 0.15, tipo: 'square', volumen: 0.3 });
  }

  /* ---------------- Voz del conteo regresivo (Web Speech API) ---------------- */
  let vozEspanolCache = null;
  function obtenerVozEspanol() {
    if (!window.speechSynthesis) return null;
    if (vozEspanolCache) return vozEspanolCache;
    const voces = window.speechSynthesis.getVoices();
    vozEspanolCache = voces.find((v) => v.lang && v.lang.toLowerCase().startsWith('es')) || voces[0] || null;
    return vozEspanolCache;
  }
  // Algunos navegadores cargan la lista de voces de forma asíncrona.
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => { vozEspanolCache = null; };
  }

  function decir(texto) {
    if (!window.speechSynthesis || silenciado) return;
    try {
      window.speechSynthesis.cancel(); // no acumular frases si se solapan
      const u = new SpeechSynthesisUtterance(texto);
      const voz = obtenerVozEspanol();
      if (voz) u.voice = voz;
      u.lang = (voz && voz.lang) || 'es-ES';
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch (e) { console.warn('[SonidoJuego] Voz no disponible:', e); }
  }

  function decirCuentaAtras(numero) {
    reproducirBeepCuenta(numero === 0);
    decir(numero > 0 ? String(numero) : '¡Ya!');
  }

  /* ---------------- Música de fondo (loop procedural sencillo) ---------------- */
  const NOTAS_BAJO = [130.81, 130.81, 164.81, 146.83]; // C3,C3,E3,D3 — línea de bajo corta y discreta
  function programarCompas(tiempoInicio) {
    if (!ctx) return;
    NOTAS_BAJO.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gan = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t0 = tiempoInicio + i * 0.4;
      gan.gain.setValueAtTime(0.001, t0);
      gan.gain.linearRampToValueAtTime(0.09, t0 + 0.03);
      gan.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
      osc.connect(gan).connect(ganMaestro);
      osc.start(t0); osc.stop(t0 + 0.4);
      osciladoresMusica.push(osc);
    });
  }

  function iniciarMusica() {
    if (!ctx || temporizadorMusica) return;
    const DURACION_COMPAS_MS = NOTAS_BAJO.length * 400;
    function ciclo() {
      programarCompas(ctx.currentTime + 0.05);
      temporizadorMusica = setTimeout(ciclo, DURACION_COMPAS_MS);
    }
    ciclo();
  }

  function detenerMusica() {
    if (temporizadorMusica) { clearTimeout(temporizadorMusica); temporizadorMusica = null; }
    osciladoresMusica = [];
  }

  return {
    activar, alternarMute, estaSilenciado,
    reproducirClick, reproducirTurbo, reproducirChoque, reproducirPickup,
    reproducirPreguntaCorrecta, reproducirPreguntaIncorrecta, reproducirVuelta, reproducirVictoria,
    decirCuentaAtras, iniciarMusica, detenerMusica,
  };
})();
