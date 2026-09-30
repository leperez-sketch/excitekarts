/* ====================================================================
 * EXCITEBIKE EFL — pistas.js
 * ====================================================================
 * Define los circuitos cerrados (ahora es una carrera de varias vueltas
 * en un circuito, no una recta de un solo sentido) y toda la matemática
 * para convertir "cuántos metros ha recorrido un jugador" en una
 * posición y rotación reales sobre el trazado. La usan tanto main.js
 * (física de cada jugador, sin dibujar nada) como juego3d.js (dibujar
 * la pista y mover los karts) — un único sitio con la verdad del mapa.
 *
 * CÓMO SE DEFINE UN CIRCUITO: en vez de escribir a mano la secuencia de
 * giros (fácil de equivocarse — probado y descartado durante el
 * desarrollo), cada pista se define como una lista de ESQUINAS de un
 * polígono rectilíneo simple, recorrido en un sentido consistente.
 * `poligonoASecuencia()` calcula sola qué tramos son rectos y en qué
 * esquinas hay que girar (y hacia qué lado), y de ahí sale la lista de
 * tiles. Es mucho más fiable que inventar la secuencia de giros a mano.
 *
 * Cada tile mide 1×1 "unidad de mundo" (coincide con las piezas de
 * carretera de 1m de Kenney). Una "vuelta" = recorrer todos los tiles
 * del circuito y volver al 0. El progreso de cada jugador es un número
 * continuo (p.ej. 47.3 = tile 47, 30% de camino dentro de ese tile).
 * ==================================================================== */

window.PISTAS = (function () {

  const DIRS = { N: { x: 0, z: 1 }, E: { x: 1, z: 0 }, S: { x: 0, z: -1 }, O: { x: -1, z: 0 } };
  const ORDEN_CW = ['N', 'E', 'S', 'O'];
  function rotarCW(h) { return ORDEN_CW[(ORDEN_CW.indexOf(h) + 1) % 4]; }
  function rotarCCW(h) { return ORDEN_CW[(ORDEN_CW.indexOf(h) + 3) % 4]; }
  // Ángulo "brújula" del rumbo: N=0°, E=90°, S=180°, O=270° (en radianes).
  // Sirve tanto para orientar el kart como para las matemáticas del arco.
  function anguloDeRumbo(h) { return Math.atan2(DIRS[h].x, DIRS[h].z); }

  function poligonoASecuencia(esquinas) {
    const n = esquinas.length;
    const seq = [];
    for (let i = 0; i < n; i++) {
      const actual = esquinas[i], siguiente = esquinas[(i + 1) % n], anterior = esquinas[(i - 1 + n) % n];
      const dirEntrada = { x: Math.sign(actual.x - anterior.x), z: Math.sign(actual.z - anterior.z) };
      const dirSalida = { x: Math.sign(siguiente.x - actual.x), z: Math.sign(siguiente.z - actual.z) };
      const largo = Math.abs(siguiente.x - actual.x) + Math.abs(siguiente.z - actual.z);
      const cruz = dirEntrada.x * dirSalida.z - dirEntrada.z * dirSalida.x;
      if (cruz > 0) seq.push('D'); else if (cruz < 0) seq.push('I');
      for (let k = 0; k < largo - 1; k++) seq.push('R');
    }
    return seq;
  }

  // Convierte la secuencia R/D/I en la lista de tiles con su posición de
  // rejilla y sus rumbos de entrada/salida. Lanza un error claro (visible
  // gracias a la red de seguridad de errores de main.js) si la secuencia
  // no cierra en bucle — mejor eso que una pista rota en silencio.
  function construirRuta(secuencia) {
    let pos = { x: 0, z: 0 };
    let heading = 'N';
    const tiles = [];
    for (const cmd of secuencia) {
      const entrada = heading; // rumbo con el que se ENTRA a este tile
      if (cmd === 'D') heading = rotarCW(heading);
      else if (cmd === 'I') heading = rotarCCW(heading);
      tiles.push({ x: pos.x, z: pos.z, entrada, salida: heading }); // salida = rumbo tras el giro (igual que entrada si es recto)
      const v = DIRS[heading]; // avanza usando el rumbo YA actualizado
      pos = { x: pos.x + v.x, z: pos.z + v.z };
    }
    if (!(pos.x === 0 && pos.z === 0 && heading === 'N')) {
      throw new Error('La secuencia de esta pista no cierra en bucle (revisa las esquinas en pistas.js).');
    }
    return tiles;
  }

  // Gira la lista de tiles para que el tile 0 (salida/meta) caiga en mitad
  // de la recta más larga del circuito, en vez de en una esquina. Solo
  // cambia dónde empieza a contarse; las posiciones del mapa no se tocan.
  function alinearSalidaEnRecta(ruta) {
    const n = ruta.length;
    const esRecto = (t) => t.entrada === t.salida;
    let mejorInicio = 0, mejorLargo = 0;
    for (let i = 0; i < n; i++) {
      if (!esRecto(ruta[i]) || esRecto(ruta[(i - 1 + n) % n])) continue; // solo inicios de racha
      let largo = 0;
      while (largo < n && esRecto(ruta[(i + largo) % n])) largo++;
      if (largo > mejorLargo) { mejorLargo = largo; mejorInicio = i; }
    }
    const medio = (mejorInicio + Math.floor(mejorLargo / 2)) % n;
    return ruta.slice(medio).concat(ruta.slice(0, medio));
  }

  // Posición y rotación (radianes) en el mundo para un progreso continuo
  // dado (en "tiles recorridos"). tileSize son metros por tile (1 aquí).
  function progresoAPosicion(ruta, progreso, tileSize) {
    const n = ruta.length;
    const prog = ((progreso % n) + n) % n; // siempre positivo
    const indice = Math.floor(prog);
    const f = prog - indice;
    const tile = ruta[indice];
    const centro = { x: tile.x * tileSize, z: tile.z * tileSize };

    if (tile.entrada === tile.salida) {
      const v = DIRS[tile.salida];
      const entryP = { x: centro.x - v.x * tileSize / 2, z: centro.z - v.z * tileSize / 2 };
      const exitP = { x: centro.x + v.x * tileSize / 2, z: centro.z + v.z * tileSize / 2 };
      return {
        x: entryP.x + (exitP.x - entryP.x) * f,
        z: entryP.z + (exitP.z - entryP.z) * f,
        rotY: anguloDeRumbo(tile.salida),
      };
    }

    const vEnt = DIRS[tile.entrada], vSal = DIRS[tile.salida];
    const entryP = { x: centro.x - vEnt.x * tileSize / 2, z: centro.z - vEnt.z * tileSize / 2 };
    const exitP = { x: centro.x + vSal.x * tileSize / 2, z: centro.z + vSal.z * tileSize / 2 };
    const centroArco = { x: centro.x + (vSal.x - vEnt.x) * tileSize / 2, z: centro.z + (vSal.z - vEnt.z) * tileSize / 2 };
    const radio = tileSize / 2;
    const a0 = Math.atan2(entryP.z - centroArco.z, entryP.x - centroArco.x);
    let a1 = Math.atan2(exitP.z - centroArco.z, exitP.x - centroArco.x);
    let delta = a1 - a0;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const a = a0 + delta * f;
    const signoGiro = Math.sign(delta) || 1;
    // La orientación del kart es tangente al arco (perpendicular al radio).
    // Tangente al arco en la direccion de avance: signo * (-sin a, cos a) en (x, z).
    // Se convierte a angulo con atan2(x, z), igual que en las rectas (anguloDeRumbo).
    const rotY = Math.atan2(-signoGiro * Math.sin(a), signoGiro * Math.cos(a));
    return { x: centroArco.x + radio * Math.cos(a), z: centroArco.z + radio * Math.sin(a), rotY };
  }

  function indiceTileEnProgreso(numTiles, progreso) {
    return Math.floor((((progreso % numTiles) + numTiles) % numTiles));
  }

  /* ================= DEFINICIÓN DE LAS 3 PISTAS ================= */
  const definiciones = {
    ovalo: {
      id: 'ovalo', nombre: 'Óvalo Clásico', emoji: '🏟️',
      esquinas: [{ x: 0, z: 0 }, { x: 0, z: 5 }, { x: 4, z: 5 }, { x: 4, z: 0 }],
      obstaculos: [3, 8, 13],
      pickups: [1, 6, 10, 15],
    },
    ese: {
      id: 'ese', nombre: 'Curvas en Ese', emoji: '🌀',
      esquinas: [{ x: 0, z: 0 }, { x: 0, z: 3 }, { x: 4, z: 3 }, { x: 4, z: 5 }, { x: 7, z: 5 }, { x: 7, z: 1 }, { x: 3, z: 1 }, { x: 3, z: 0 }],
      obstaculos: [3, 9, 15, 20],
      pickups: [1, 6, 12, 17, 22],
    },
    tecnico: {
      id: 'tecnico', nombre: 'Circuito Técnico', emoji: '🏁',
      esquinas: [{ x: 0, z: 0 }, { x: 0, z: 2 }, { x: 2, z: 2 }, { x: 2, z: 4 }, { x: 5, z: 4 }, { x: 5, z: 1 }, { x: 2, z: 1 }, { x: 2, z: 0 }],
      obstaculos: [3, 8, 13],
      pickups: [1, 6, 10, 15],
    },
  };

  // Construye (y cachea) la ruta completa de cada pista una sola vez.
  const cache = {};
  function obtener(idPista) {
    if (cache[idPista]) return cache[idPista];
    const def = definiciones[idPista];
    if (!def) throw new Error('Pista desconocida: ' + idPista);
    const secuencia = poligonoASecuencia(def.esquinas);
    const ruta = alinearSalidaEnRecta(construirRuta(secuencia));
    const resultado = { ...def, ruta, numTiles: ruta.length };
    cache[idPista] = resultado;
    return resultado;
  }

  return {
    LISTA: Object.keys(definiciones),
    obtener,
    progresoAPosicion,
    indiceTileEnProgreso,
    // expuestas por si se necesitan en pruebas o en otros módulos
    poligonoASecuencia, construirRuta,
  };
})();
