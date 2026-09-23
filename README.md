# 🏍️ ExciteBike EFL 3D — Carrera de verbos en inglés

Carrera multijugador en tiempo real (hasta 6 jugadores) en 3D low-poly,
inspirada en el Excitebike de NES, para practicar formas verbales en
inglés (A1 a C1) desde el móvil en clase.

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

1. El profesor(a) (o el primer alumno) entra, pone su nombre y nivel, y
   pulsa **Crear sala nueva** → aparece un código corto (ej. `ENG42`).
2. El resto de la clase entra con ese código y su propio nivel — hasta
   6 jugadores por sala, cada uno en su carril.
3. Quien creó la sala ve el botón **🏁 Iniciar carrera**; al pulsarlo,
   todos arrancan a la vez tras una cuenta atrás sincronizada.
4. Las 6 motos avanzan solas. Al llegar a un cono/señal de obra, el
   juego pausa SOLO tu moto y lanza una pregunta de opción múltiple de
   tu nivel: acertar = turbo 🔥, fallar = choque y pierdes segundos.
5. Por la pista también hay power-ups flotantes: **Rayo** (turbo
   gratis), **Escudo** (perdona el próximo choque) y **Comodín 50/50**
   (quita 2 opciones incorrectas en la próxima pregunta).
6. Gana quien primero llega a la meta; la pantalla de resultados se va
   llenando en directo según van llegando los demás.

## Decisiones técnicas (por si tocas el código)

- **Cada jugador simula su propia física** y solo publica posición y
  estado; el servidor no mueve a nadie, solo retransmite. Así un pico
  de latencia del servidor gratuito no se nota como "teletransporte".
- **El host es, en todo momento, quien tiene el carril más bajo
  conectado** (lo calcula el servidor). Si el host se va, el siguiente
  jugador hereda el botón de inicio sin necesidad de ningún mensaje
  extra — lo verás probado en vivo si miras los logs del servidor.
- **El trazado y los power-ups no viajan por la red**: se generan con
  un pseudoaleatorio sembrado con el código de sala (`semilla.js`), así
  que todos los móviles calculan exactamente el mismo mapa sin gastar
  ancho de banda en ello.
- **Los karts se recolorean en el navegador**: solo subiste una paleta
  (`variation-a.png`), así que `paleta.js` rota su tono 6 veces (0°,
  60°, 120°...) para dar un color distinto a cada carril a partir de
  esa misma imagen — el carril 0 usa tu paleta tal cual la subiste.
- **La carretera y las barreras usan `THREE.InstancedMesh`** (una sola
  llamada de dibujo para cientos de piezas) y solo se generan los
  tramos cercanos a la cámara, reciclándose como en un "endless
  runner" — necesario para que 6 móviles de aula vayan fluidos a la
  vez con sombras activadas.

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

- Un power-up de "aceite" que ralentice a otros jugadores al pasar por
  encima (lo dejé fuera de esta versión para no arriesgar estabilidad
  con la fecha de entrega, pero la arquitectura de eventos ya lo
  soportaría sin muchos cambios).
- Un modo "profesor": pantalla de solo lectura con el progreso de toda
  la clase, para proyectar en la pizarra.
- Guardar resultados históricos (requeriría una base de datos; Render
  ofrece Postgres gratuito si se quiere ir por ahí).
