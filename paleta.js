/* ====================================================================
 * EXCITEBIKE EFL — paleta.js
 * ====================================================================
 * Solo tenemos UNA paleta de color para los karts (variation-a.png),
 * pero necesitamos 6 karts visualmente distintos (uno por carril).
 * En vez de pedir 6 imágenes, generamos las 6 variantes en el propio
 * navegador: se rota el tono (hue) de la imagen original en pasos de
 * 60°, así que cada carril obtiene una recoloración distinta de la
 * MISMA paleta (coherentes entre sí, pero reconocibles a simple
 * vista). Es un truco clásico de arte low-poly: como el modelo usa
 * colores planos por UV, rotar el tono de la textura recolorea el
 * kart entero sin tocar la geometría.
 *
 * No depende de Three.js: solo produce un <canvas>; quien lo use
 * decide qué hacer con él (en nuestro caso, envolverlo en un
 * THREE.CanvasTexture desde juego3d.js).
 * ==================================================================== */

window.PaletaUtils = (function () {

  function cargarImagen(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  function rgbAHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s; const l = (max + min) / 2;
    if (max === min) { h = 0; s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslARgb(h, s, l) {
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
  }

  // Devuelve un <canvas> con la misma imagen pero el tono (hue)
  // desplazado "gradosRotacion" grados (0-360). Los píxeles totalmente
  // transparentes se saltan para no gastar tiempo de más.
  function generarCanvasRotado(imagen, gradosRotacion) {
    const canvas = document.createElement('canvas');
    canvas.width = imagen.naturalWidth || imagen.width;
    canvas.height = imagen.naturalHeight || imagen.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imagen, 0, 0);

    if (gradosRotacion % 360 === 0) return canvas; // sin cambios: la original ya sirve

    const datosImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = datosImg.data;
    const desplazamiento = (gradosRotacion % 360) / 360;

    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue; // píxel transparente, no tocar
      const [h, s, l] = rgbAHsl(px[i], px[i + 1], px[i + 2]);
      const [r2, g2, b2] = hslARgb((h + desplazamiento) % 1, s, l);
      px[i] = r2; px[i + 1] = g2; px[i + 2] = b2;
    }
    ctx.putImageData(datosImg, 0, 0);
    return canvas;
  }

  return { cargarImagen, generarCanvasRotado };
})();
