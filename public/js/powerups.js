/* ====================================================================
 * EXCITEBIKE EFL — powerups.js
 * ====================================================================
 * Define los power-ups recogibles en la pista y dónde aparecen.
 * Igual que los obstáculos, las posiciones se generan con un
 * pseudoaleatorio sembrado con el código de sala: así, sin mandar ni
 * un solo byte por la red, todos los jugadores calculan exactamente
 * el mismo mapa de power-ups en local.
 *
 * Efecto de cada tipo (la lógica de aplicarlo vive en main.js, aquí
 * solo se describe qué es cada uno):
 *   - rayo:    turbo inmediato de unos segundos, sin necesidad de
 *              acertar ninguna pregunta.
 *   - escudo:  protege del próximo choque: si fallas una pregunta con
 *              el escudo activo, no te caes, simplemente lo consumes.
 *   - comodin: en la siguiente pregunta, elimina 2 de las 3 opciones
 *              incorrectas (comodín 50/50), como red de seguridad en
 *              una pregunta difícil.
 * ==================================================================== */

window.POWERUPS = (function () {

  const TIPOS = {
    rayo:    { id: 'rayo',    nombre: 'Rayo',        emoji: '⚡', color: 0xffc107, colorClaro: '#FFC107' },
    escudo:  { id: 'escudo',  nombre: 'Escudo',      emoji: '🛡️', color: 0x22d3ee, colorClaro: '#22D3EE' },
    comodin: { id: 'comodin', nombre: 'Comodín 50/50', emoji: '🎯', color: 0xa855f7, colorClaro: '#A855F7' },
  };
  const ORDEN_TIPOS = ['rayo', 'escudo', 'comodin'];
  const NUM_PICKUPS = 9;
  const DURACION_RAYO_MS = 1500;
  const MARGEN_OBSTACULO = 9;        // separación mínima de un power-up a un obstáculo (metros)
  const MARGEN_ENTRE_PICKUPS = 18;   // separación mínima entre dos power-ups del mismo carril (metros)
  const MARGEN_SALIDA_META = 15;     // ni justo al salir ni justo en meta (metros)

  function generarPickups(codigoSala, longitudPista, numCarriles, posicionesObstaculo) {
    // window.crearGeneradorSembrado viene de semilla.js (cargado antes que este archivo)
    const aleatorio = window.crearGeneradorSembrado(codigoSala + '_powerups');
    const pickups = [];
    let intentos = 0;

    while (pickups.length < NUM_PICKUPS && intentos < NUM_PICKUPS * 40) {
      intentos++;
      const x = Math.round(MARGEN_SALIDA_META + aleatorio() * (longitudPista - MARGEN_SALIDA_META * 2));
      const carril = Math.floor(aleatorio() * numCarriles);

      const cercaDeObstaculo = posicionesObstaculo.some((ox) => Math.abs(ox - x) < MARGEN_OBSTACULO);
      const cercaDeOtroPickup = pickups.some((p) => p.carril === carril && Math.abs(p.x - x) < MARGEN_ENTRE_PICKUPS);
      if (cercaDeObstaculo || cercaDeOtroPickup) continue;

      const tipo = ORDEN_TIPOS[Math.floor(aleatorio() * ORDEN_TIPOS.length)];
      pickups.push({ id: `pu${pickups.length}`, x, carril, tipo, recogido: false });
    }
    return pickups.sort((a, b) => a.x - b.x);
  }

  return { TIPOS, ORDEN_TIPOS, NUM_PICKUPS, DURACION_RAYO_MS, generarPickups };
})();
