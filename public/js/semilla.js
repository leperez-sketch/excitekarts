/* ====================================================================
 * EXCITEBIKE EFL — semilla.js
 * ====================================================================
 * Generador pseudoaleatorio determinista (mulberry32) sembrado con un
 * texto. Con la misma semilla siempre da la misma secuencia: así el
 * trazado, los power-ups y la decoración de la pista salen IDÉNTICOS
 * en el móvil de cada jugador sin necesidad de mandar esos datos por
 * la red. Lo usan powerups.js, main.js (obstáculos) y juego3d.js
 * (decoración del borde de la pista) — un único sitio, sin duplicar.
 * ==================================================================== */

window.crearGeneradorSembrado = function crearGeneradorSembrado(semilla) {
  let a = 0;
  for (let i = 0; i < semilla.length; i++) a = (a * 31 + semilla.charCodeAt(i)) >>> 0;
  return function siguiente() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
