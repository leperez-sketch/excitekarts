# 🏍️ ExciteBike EFL 3D — Carrera de verbos en inglés

Carrera multijugador en tiempo real (hasta 6 jugadores) en 3D low-poly,
inspirada en el Excitebike de NES, para practicar formas verbales en
inglés (A1 a C1) desde el móvil en clase.

- **Dos roles separados:** el profesor(a) crea la sala desde SU
  pantalla (portátil + proyector) y esa es la ÚNICA pantalla que
  descarga gráficos 3D y muestra la carrera, con un código QR para que
  la clase se una. Cada alumno se une con el código desde su propio
  móvil, que actúa solo como mando (nombre, nivel, y los botones de
  las preguntas) — su móvil no descarga ni un byte de modelos 3D.
- **Gráficos:** Three.js + modelos low-poly (karts y carretera), con la
  paleta de color `variation-a.png` que subiste aplicada a los karts.
- **Multijugador:** Node.js + Express + Socket.io (WebSockets). El
  servidor gestiona las salas; cada móvil simula su propio kart y solo
  publica su posición, así que la carrera va fluida aunque el servidor
  gratuito tenga algo de latencia.
- **Banco de preguntas:** 250 preguntas de gramática (50 por nivel MCER).
- **Power-ups:** Rayo ⚡, Escudo 🛡️ y Comodín 50/50 🎯, repartidos por
  la pista además de las preguntas de los obstáculos.

## Estructura del proyecto

```
excitebike-efl-3d/
├── package.json
├── render.yaml            # despliegue con un clic en Render (opcional)
├── server/
│   └── server.js          # Express + Socket.io: salas, roster, relé de eventos
└── public/                # todo lo que se sirve al navegador
    ├── index.html
    ├── css/style.css
    ├── js/
    │   ├── semilla.js      # generador aleatorio determinista (trazado/power-ups)
    │   ├── preguntas.js     # banco de 250 preguntas
    │   ├── powerups.js       # tipos de power-up y dónde aparecen
    │   ├── paleta.js          # recolorea los karts a partir de variation-a.png
    │   ├── red.js              # cliente de Socket.io
    │   ├── juego3d.js           # escena Three.js (único módulo ES del proyecto)
    │   └── main.js               # física, preguntas, power-ups, marcador
    └── assets/models/
        ├── roads/          # pista, barreras, obstáculos, decoración (Kenney)
        └── karts/          # 5 karts + restos de choque, con tu paleta aplicada
```

## Probarlo en tu ordenador

```bash
npm install
npm start
```

Abre `http://localhost:3000`. Abre una segunda pestaña (o usa el móvil
en la misma wifi con la IP de tu ordenador) para probar el multijugador.

## Subir a GitHub

```bash
git init
git add .
git commit -m "ExciteBike EFL 3D"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

`node_modules/` no se sube (está en `.gitignore`); Render lo instala
solo con `npm install` al desplegar.

## Desplegar en Render (gratis)

**Opción A — Blueprint (un clic):**
En Render → **New +** → **Blueprint** → conecta tu repositorio → Render
lee `render.yaml` y lo configura solo → **Apply**.

**Opción B — Manual:**
Render → **New +** → **Web Service** → conecta el repositorio →

| Campo | Valor |
|---|---|
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `node server/server.js` |
| Plan | Free |

En unos minutos tendrás una URL tipo `https://tu-juego.onrender.com`
— ese es el enlace que compartes con la clase.

> ⚠️ **El plan gratuito de Render "duerme" el servidor tras un rato sin
> uso.** El primer acceso tras la inactividad puede tardar 30-60s en
> despertar. Truco para clase: abre el enlace tú 5 minutos antes de
> empezar, así ya está despierto cuando lleguen los alumnos.

## Cómo se juega

1. El profesor(a) abre el enlace en su portátil/proyector, elige
   **📺 Soy el profesor/a** → aparece un código corto (ej. `ENG42`) y
   un **QR** en pantalla grande. Esa pantalla NO se juega: es la
   pantalla de la clase.
2. Cada alumno abre el enlace en su móvil (escaneando el QR, que le
   rellena el código automáticamente, o escribiéndolo a mano), elige
   **📱 Soy alumno/a**, pone su nombre y nivel — hasta 6 por sala, cada
   uno en su carril.
3. El profesor(a) ve el botón **🏁 Iniciar carrera** en cuanto quiera
   (no hace falta esperar a los 6); al pulsarlo, todos arrancan a la
   vez tras una cuenta atrás sincronizada.
4. Las 6 motos avanzan solas. Al llegar a un cono/señal de obra, el
   juego pausa SOLO el móvil de ese alumno y lanza una pregunta de
   opción múltiple de su nivel: acertar = turbo 🔥, fallar = choque y
   pierde segundos. Mientras tanto, la pantalla grande muestra la
   carrera en 3D siguiendo a quien va en cabeza en cada momento, con
   un marcador en vivo de las 6 posiciones.
5. Por la pista también hay power-ups flotantes: **Rayo** (turbo
   gratis), **Escudo** (perdona el próximo choque) y **Comodín 50/50**
   (quita 2 opciones incorrectas en la próxima pregunta).
6. Gana quien primero llega a la meta; en cuanto todos terminan, la
   pantalla grande pasa sola a los resultados.

## Decisiones técnicas (por si tocas el código)

- **Anfitrión y jugadores son roles separados de verdad**, no solo una
  etiqueta: quien crea la sala (`crear_sala`) nunca ocupa un carril ni
  corre — es el único socket con permiso para `iniciar_carrera`
  (comprobado en el servidor, no solo escondiendo el botón en el
  cliente). Esto simplifica mucho respecto a "el jugador con el carril
  más bajo es el host": ahora el host siempre es quien creó la sala.
- **Solo el anfitrión carga Three.js y los modelos GLB.** El móvil de
  cada alumno (`main.js`, rol `'jugador'`) nunca llama a `Juego3D`:
  corre su física y sus preguntas igual que antes, pero pinta un panel
  de texto/icono en vez de un `<canvas>` 3D. Menos descarga, menos
  batería, menos cosas que puedan fallar en un móvil de gama baja.
- **Bug ya corregido, por si lo ves en un fork antiguo:** `Three.js`
  fija el tamaño de su lienzo de dibujo (no solo el CSS) la primera vez
  que se inicializa. Si eso pasa mientras la pantalla del juego todavía
  tiene `display:none` (p. ej. inicializar el renderer nada más entrar
  en la sala de espera, para "adelantar trabajo"), `canvas.clientWidth`
  vale 0 y el render se queda fijado a un buffer de 1×1 píxel estirado
  a toda la pantalla — se ve como un color sólido fijo y nada se mueve.
  Por eso `Juego3D.inicializar()` se llama justo DESPUÉS de mostrar la
  pantalla de juego (`main.js`, manejador de `carrera_iniciando`), no
  antes; la carga de los modelos (`cargarAssets`, que no necesita el
  `<canvas>`) sí se adelanta a la sala de espera para ir más rápido.
- **Cada jugador simula su propia física** y solo publica posición y
  estado; el servidor no mueve a nadie, solo retransmite. Así un pico
  de latencia del servidor gratuito no se nota como "teletransporte".
- **El trazado y los power-ups no viajan por la red**: se generan con
  un pseudoaleatorio sembrado con el código de sala (`semilla.js`), así
  que todos los dispositivos calculan exactamente el mismo mapa sin
  gastar ancho de banda en ello — incluida la pantalla del profesor,
  que así sabe dónde están los conos y los power-ups sin que nadie se
  lo diga por red.
- **La pantalla del profesor sigue a quien va en cabeza**: cada frame
  recalcula quién tiene más metros recorridos y usa esa posición como
  "cámara local" (reutilizando exactamente la misma función de dibujo
  que antes usaba la posición del propio jugador).
- **Los karts se recolorean en el navegador**: solo subiste una paleta
  (`variation-a.png`), así que `paleta.js` rota su tono 6 veces (0°,
  60°, 120°...) para dar un color distinto a cada carril a partir de
  esa misma imagen — el carril 0 usa tu paleta tal cual la subiste.
- **La carretera y las barreras usan `THREE.InstancedMesh`** (una sola
  llamada de dibujo para cientos de piezas) y solo se generan los
  tramos cercanos a la cámara, reciclándose como en un "endless
  runner" — necesario para que la pantalla del profesor vaya fluida
  con sombras activadas mientras seis móviles le mandan posiciones.

## Cosas a revisar tú (no las puedo probar sin navegador)

- **Orientación del asfalto**: si las líneas de la carretera se ven
  giradas 90°, cambia `ROTACION_TILE_CARRETERA` en `juego3d.js` (línea
  ~33) de `0` a `Math.PI/2`.
- **Orientación de las barreras del borde**: mismo archivo,
  `ROTACION_BARRERA_IZQ` / `ROTACION_BARRERA_DER`.
- **Duración total de la carrera**: `LONGITUD_PISTA` y `VELOCIDAD_BASE`
  en `main.js` (por defecto, ~400 m a 10 m/s ≈ 40s de conducción pura,
  más el tiempo de las 5 preguntas).

## Licencia de los modelos 3D

Los modelos de karts y carretera tienen el estilo característico de
los packs low-poly de Kenney.nl (normalmente licencia CC0 / dominio
público), pero el .zip que subiste no incluía un archivo de licencia.
Antes de publicar el repositorio, confirma la licencia exacta de tu
fuente original y añade el crédito/licencia correspondiente si aplica.

## Próximos pasos posibles

- **Reconexión del anfitrión**: si la pantalla del profesor se
  recarga a mitad de carrera, hoy los alumnos siguen jugando pero
  nadie proyecta nada (se avisa con un mensaje en su móvil). Se podría
  guardar el estado de la sala y dejar que la misma pantalla vuelva a
  "engancharse" con el código.
- Un power-up de "aceite" que ralentice a otros jugadores al pasar por
  encima (lo dejé fuera de esta versión para no arriesgar estabilidad,
  pero la arquitectura de eventos ya lo soportaría sin muchos cambios).
- Guardar resultados históricos (requeriría una base de datos; Render
  ofrece Postgres gratuito si se quiere ir por ahí).
