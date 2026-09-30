# 🏎️ ExciteBike EFL 3D — Carrera isométrica de verbos en inglés

Carrera multijugador en tiempo real (hasta 6 jugadores) en 3D low-poly,
con cámara isométrica fija al estilo "coche de radiocontrol" — circuitos
cerrados de varias vueltas, selección de pista y de carrito, marcador de
puntos, y sonido/música/voz generados en el propio navegador. Todo para
practicar formas verbales en inglés (A1 a C1) desde el móvil en clase.

## Qué hay en esta versión

- **Circuitos cerrados de verdad**, no una recta: 3 pistas (Óvalo
  Clásico, Curvas en Ese, Circuito Técnico) con curvas reales, 3 vueltas
  por carrera. El profesor elige la pista antes de cada carrera.
- **Cámara isométrica fija** (ortográfica, sin perspectiva): encuadra
  todo el circuito de una vez, como un coche de radiocontrol visto
  desde arriba — nunca sigue a nadie en particular.
- **Cada alumno elige su carrito** (5 modelos distintos) antes de unirse.
- **Dos roles separados**: el profesor crea la sala desde SU pantalla
  (portátil + proyector) — esa es la ÚNICA pantalla que carga gráficos
  3D, con un código QR para que la clase se una. Cada alumno juega desde
  su móvil, que actúa solo como mando (nombre, nivel, carrito, y los
  botones de las preguntas) — su móvil no descarga ni un byte de
  modelos 3D.
- **Marcador de puntos acumulado**: 10-8-6-4-2-1 según posición de
  llegada, que se SUMA si juegan varias carreras seguidas en la misma
  sala (botón "Nueva carrera": cambia de pista sin perder el marcador
  ni a los jugadores).
- **Sonido completo generado en el navegador** (sin archivos de audio):
  efectos de motor/turbo/choque/power-ups con la Web Audio API, música
  de fondo procedural, y la voz del conteo regresivo "3, 2, 1, ¡ya!"
  con la Web Speech API del propio navegador.
- **250 preguntas de gramática** (50 por nivel MCER), con obstáculos que
  se vuelven a activar en cada vuelta — y power-ups (Rayo ⚡, Escudo 🛡️,
  Comodín 50/50 🎯) que reaparecen solos a los 10 segundos de recogerse.

## Estructura del proyecto

```
excitebike-efl-3d/
├── package.json
├── render.yaml
├── server/
│   └── server.js          # Express + Socket.io: salas, roster, pista elegida, relé
└── public/
    ├── index.html
    ├── css/style.css
    ├── js/
    │   ├── semilla.js      # generador aleatorio determinista (solo para decoración)
    │   ├── preguntas.js      # banco de 250 preguntas
    │   ├── powerups.js        # metadatos de los 3 power-ups
    │   ├── pistas.js            # los 3 circuitos + toda la matemática de la ruta
    │   ├── paleta.js              # recolorea los karts a partir de variation-a.png
    │   ├── audio.js                 # efectos, música y voz (Web Audio / Web Speech)
    │   ├── red.js                     # cliente de Socket.io
    │   ├── juego3d.js                   # escena Three.js (único módulo ES)
    │   └── main.js                        # física, vueltas, preguntas, puntos, red
    └── assets/models/
        ├── roads/          # recta, curva, obstáculos, decoración (Kenney)
        └── karts/          # 5 karts + restos de choque, con tu paleta aplicada
```

## Probarlo / desplegarlo

Igual que antes — `npm install && npm start` en local, y en Render:
Build Command `npm install`, Start Command `node server/server.js`
(o Blueprint con `render.yaml`). Todos los detalles de despliegue en
GitHub/Render que ya conoces siguen siendo los mismos; no ha cambiado
nada de esa parte.

## Cómo se juega ahora

1. El profesor(a) elige **📺 Soy el profesor/a** → aparece el código y
   el QR. En la sala de espera elige una de las 3 pistas (se puede
   cambiar hasta el último momento).
2. Cada alumno escanea el QR o escribe el código, pone su nombre,
   nivel, y **elige su carrito** entre 5 modelos.
3. El profesor pulsa **🏁 Iniciar carrera** → cuenta atrás con voz
   "3, 2, 1, ¡ya!" sincronizada para todos.
4. Cada kart da **3 vueltas** al circuito elegido. Los conos/señales de
   obra lanzan una pregunta nueva CADA VEZ que se pasa por ellos (una
   vez por vuelta); acertar da turbo, fallar hace perder segundos. Los
   power-ups flotantes se recogen y reaparecen solos a los 10s.
5. Al llegar los 6 (o los que haya), la pantalla del profesor pasa sola
   a los resultados: posiciones de esta carrera + el marcador de puntos
   acumulado. Desde ahí, **🔁 Nueva carrera** deja elegir otra pista sin
   perder a nadie ni el marcador.

## Decisiones técnicas (por si tocas el código)

- **La pista se define por esquinas, no por giros a mano.**
  `pistas.js` convierte una lista simple de esquinas de un polígono en
  la secuencia de tiles recta/curva automáticamente — inventar la
  secuencia de giros a mano es muy fácil de hacer mal (me pasó durante
  el desarrollo: lo detecté y corregí probando la lógica en Node antes
  de tocar Three.js, sin necesitar navegador para esa parte).
- **El movimiento por las curvas es un arco real**, no una diagonal:
  cada curva se recorre como un cuarto de círculo que conecta
  exactamente el borde de entrada con el de salida del tile. Esa misma
  función (`progresoAPosicion`) decide dónde va el kart Y dónde van los
  bordillos rojo/blanco, así que ambos coinciden siempre por
  construcción, no por casualidad.
- **Los bordillos son geometría propia, no el modelo de barrera de
  Kenney.** No hay forma de comprobar sin verlo renderizado con qué
  rotación exacta se modeló esa pieza; en vez de arriesgarme, genero
  los bordillos con cajas simples usando mi propia matemática de ruta
  (ya verificada), así quedan pegados a la pista siempre.
- **Las piezas de curva (`road-bend.glb`) sí se usan para el asfalto**,
  con un mapa de rotación/espejo que es mi mejor estimación (rotar un
  modelo nunca cambia su "lateralidad", así que los giros a la
  izquierda usan la pieza espejada en vez de adivinar mal una rotación
  para todos). Si alguna curva se ve desalineada, el mapa a tocar es
  `PARES_CW`/`PARES_CCW` en `juego3d.js`.
- **La cámara ortográfica se calcula una vez por pista** a partir del
  rectángulo que ocupa el circuito, con margen generoso — no hay forma
  de reajustarla a ojo sin navegador, así que preferí dejar pista de
  más a arriesgarme a recortarla.
- **Los power-ups reaparecen por temporizador (10s), no por vuelta.**
  Con varios jugadores en vueltas distintas a la vez, sincronizar
  "reaparece en la vuelta 2 de cada uno" es mucho más frágil que un
  simple `setTimeout` en cada cliente — la pequeña falta de sincronía
  exacta entre pantallas es un precio aceptable por la robustez.
- **Solo la pantalla del profesor carga Three.js.** El móvil del
  alumno corre exactamente la misma física (vueltas, preguntas,
  power-ups) pero nunca llama a `Juego3D` — pinta un panel de texto en
  vez de un `<canvas>` 3D.
- **El audio se activa en el primer clic real** (elegir rol), porque
  los navegadores bloquean el sonido hasta que hay una interacción del
  usuario — no hay forma de saltarse eso.

## Cosas a revisar tú (no las puedo comprobar sin navegador)

- **Si alguna curva del asfalto se ve girada/espejada al revés**: es
  el mapa `PARES_CW`/`PARES_CCW` en `juego3d.js` (sección 3) — sumar o
  restar 90° al par que falle suele arreglarlo.
- **Encuadre de la cámara**: si algún circuito se ve muy alejado o algo
  recortado, el número a tocar es `CAMARA_MARGEN` y el `0.72` dentro de
  `configurarCamara()` en `juego3d.js`.
- **Volumen y tono de los efectos/música**: están para que se noten
  sin ser molestos en una clase, pero el gusto es subjetivo — todos los
  volúmenes están como números sueltos y fáciles de bajar en `audio.js`.
- **Voz del conteo regresivo**: usa la voz en español que el propio
  navegador/dispositivo tenga instalada; la calidad varía bastante
  entre Android, iPhone y ordenador — es la Web Speech API del sistema,
  no algo que yo pueda afinar desde aquí.

## Licencia de los modelos 3D

Los modelos de karts y carretera tienen el estilo característico de
los packs low-poly de Kenney.nl (normalmente licencia CC0 / dominio
público), pero el .zip que subiste no incluía un archivo de licencia.
Antes de publicar el repositorio, confirma la licencia exacta de tu
fuente original y añade el crédito/licencia correspondiente si aplica.

## Próximos pasos posibles

- Un power-up de "aceite" que ralentice a otros jugadores al pasar por
  encima (la arquitectura de eventos ya lo soportaría).
- Reconexión de la pantalla del profesor si se recarga a mitad de
  carrera (hoy los alumnos siguen jugando, pero nadie proyecta nada
  hasta que el profesor vuelve a crear sala).
- Más pistas: cada una es solo una lista de esquinas + un par de
  índices de obstáculos/power-ups en `pistas.js`, no hace falta tocar
  nada de la lógica para añadir una cuarta o quinta.
