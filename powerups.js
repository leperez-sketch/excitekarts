/* ====================================================================
 * EXCITEBIKE EFL — powerups.js
 * ====================================================================
 * Metadatos de los power-ups. Antes este archivo también calculaba
 * DÓNDE aparecían (con un pseudoaleatorio, pensado para la recta de
 * un solo sentido); ahora que la pista es un circuito con tiles fijos,
 * cada pista en pistas.js ya dice directamente en qué tiles hay
 * power-ups, así que aquí solo queda la descripción de cada tipo.
 * ==================================================================== */

window.POWERUPS = (function () {
  const TIPOS = {
    rayo: { id: 'rayo', nombre: 'Rayo', emoji: '⚡', color: 0xffc107 },
    escudo: { id: 'escudo', nombre: 'Escudo', emoji: '🛡️', color: 0x22d3ee },
    comodin: { id: 'comodin', nombre: 'Comodín 50/50', emoji: '🎯', color: 0xa855f7 },
  };
  const ORDEN_TIPOS = ['rayo', 'escudo', 'comodin'];
  const DURACION_RAYO_MS = 1500;
  const SEGUNDOS_REAPARICION = 10; // cuánto tarda un power-up recogido en volver a aparecer

  function tipoParaIndice(indiceTile) { return ORDEN_TIPOS[indiceTile % ORDEN_TIPOS.length]; }

  return { TIPOS, ORDEN_TIPOS, DURACION_RAYO_MS, SEGUNDOS_REAPARICION, tipoParaIndice };
})();
