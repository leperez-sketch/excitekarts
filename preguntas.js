/* ====================================================================
 * EXCITEBIKE EFL — preguntas.js
 * ====================================================================
 * Banco de preguntas de gramática inglesa (formas verbales), 50 por
 * nivel del MCER (A1 a C1) = 250 preguntas en total. 10 categorías
 * gramaticales por nivel, 5 preguntas por categoría, con contextos
 * variados (colegio, familia, viajes, comida, tecnología…) para que
 * no se note mecánico jugando varias rondas seguidas.
 *
 * Esquema de cada pregunta (claves cortas para que el archivo pese
 * poco en móviles):
 *   p = pregunta (con ___ marcando el hueco)
 *   o = opciones (4 alternativas)
 *   c = índice (0-3) de la opción correcta dentro de "o"
 *   t = tema gramatical, se muestra en la interfaz
 *
 * Se expone en window.BANCO_PREGUNTAS para que game3d.js/main.js lo
 * usen sin necesidad de módulos ES ni bundlers.
 * ==================================================================== */

window.BANCO_PREGUNTAS = {

  /* ================= A1 · PRINCIPIANTE ================= */
  A1: [
    // — Verbo To Be (afirmativo) —
    { p: 'I ___ a student.', o: ['am', 'is', 'are', 'be'], c: 0, t: 'Verbo To Be' },
    { p: 'He ___ my brother.', o: ['am', 'is', 'are', 'be'], c: 1, t: 'Verbo To Be' },
    { p: 'They ___ from Mexico.', o: ['am', 'is', 'are', 'be'], c: 2, t: 'Verbo To Be' },
    { p: 'It ___ a big dog.', o: ['am', 'is', 'are', 'be'], c: 1, t: 'Verbo To Be' },
    { p: 'We ___ happy today.', o: ['am', 'is', 'are', 'be'], c: 2, t: 'Verbo To Be' },
    // — Verbo To Be (negativo) —
    { p: "I ___ not hungry.", o: ['am', 'is', 'are', 'be'], c: 0, t: 'To Be negativo' },
    { p: 'You ___ not late.', o: ['am', 'is', 'are', 'be'], c: 2, t: 'To Be negativo' },
    { p: 'It ___ not cold today.', o: ['am', 'is', 'are', 'be'], c: 1, t: 'To Be negativo' },
    { p: 'We ___ not tired.', o: ['am', 'is', 'are', 'be'], c: 2, t: 'To Be negativo' },
    { p: 'He ___ not a teacher.', o: ['am', 'is', 'are', 'be'], c: 1, t: 'To Be negativo' },
    // — Presente simple (3ª persona) —
    { p: 'My mother ___ coffee every morning.', o: ['drink', 'drinks', 'drinking', 'drank'], c: 1, t: 'Presente simple' },
    { p: 'The shop ___ at nine.', o: ['open', 'opens', 'opening', 'opened'], c: 1, t: 'Presente simple' },
    { p: 'My dog ___ a lot.', o: ['bark', 'barks', 'barking', 'barked'], c: 1, t: 'Presente simple' },
    { p: 'He ___ English very well.', o: ['speak', 'speaks', 'speaking', 'spoke'], c: 1, t: 'Presente simple' },
    { p: 'The train ___ from platform two.', o: ['leave', 'leaves', 'leaving', 'left'], c: 1, t: 'Presente simple' },
    // — Presente simple negativo —
    { p: 'I ___ like fish.', o: ["don't", "doesn't", "isn't", 'not'], c: 0, t: 'Presente simple negativo' },
    { p: 'She ___ eat meat.', o: ["don't", "doesn't", "isn't", 'not'], c: 1, t: 'Presente simple negativo' },
    { p: 'We ___ live here.', o: ["don't", "doesn't", "isn't", 'not'], c: 0, t: 'Presente simple negativo' },
    { p: 'My brother ___ play tennis.', o: ["don't", "doesn't", "isn't", 'not'], c: 1, t: 'Presente simple negativo' },
    { p: 'They ___ speak French.', o: ["don't", "doesn't", "isn't", 'not'], c: 0, t: 'Presente simple negativo' },
    // — Can (habilidad) —
    { p: 'My sister ___ play the piano.', o: ['can', 'cans', 'canning', 'could'], c: 0, t: 'Can (habilidad)' },
    { p: 'Fish ___ swim.', o: ['can', 'cans', 'canning', 'could'], c: 0, t: 'Can (habilidad)' },
    { p: 'I ___ ride a bike.', o: ['can', 'cans', 'canning', 'could'], c: 0, t: 'Can (habilidad)' },
    { p: '___ you speak Italian?', o: ['Can', 'Cans', 'Do', 'Does'], c: 0, t: 'Can (habilidad)' },
    { p: 'Birds ___ fly.', o: ['can', 'cans', 'canning', 'could'], c: 0, t: 'Can (habilidad)' },
    // — Have/Has got —
    { p: 'I ___ two brothers.', o: ['have got', 'has got', 'haves got', 'having got'], c: 0, t: 'Have / Has got' },
    { p: 'She ___ a new phone.', o: ['have got', 'has got', 'haves got', 'having got'], c: 1, t: 'Have / Has got' },
    { p: 'They ___ a big house.', o: ['have got', 'has got', 'haves got', 'having got'], c: 0, t: 'Have / Has got' },
    { p: 'He ___ blue eyes.', o: ['have got', 'has got', 'haves got', 'having got'], c: 1, t: 'Have / Has got' },
    { p: 'We ___ a lot of homework.', o: ['have got', 'has got', 'haves got', 'having got'], c: 0, t: 'Have / Has got' },
    // — Imperativos —
    { p: '___ quiet in the library!', o: ['Be', 'Are', 'Is', 'Being'], c: 0, t: 'Imperativos' },
    { p: '___ your hands before dinner.', o: ['Wash', 'Washes', 'Washing', 'Washed'], c: 0, t: 'Imperativos' },
    { p: '___ the window, please.', o: ['Open', 'Opens', 'Opening', 'Opened'], c: 0, t: 'Imperativos' },
    { p: "Don't ___ late for class!", o: ['be', 'is', 'are', 'being'], c: 0, t: 'Imperativos' },
    { p: '___ me your notebook.', o: ['Give', 'Gives', 'Giving', 'Gave'], c: 0, t: 'Imperativos' },
    // — There is / There are —
    { p: '___ a cat in the garden.', o: ['There is', 'There are', 'There be', 'There am'], c: 0, t: 'There is / There are' },
    { p: '___ five students in the room.', o: ['There is', 'There are', 'There be', 'There am'], c: 1, t: 'There is / There are' },
    { p: '___ some milk in the fridge.', o: ['There is', 'There are', 'There be', 'There am'], c: 0, t: 'There is / There are' },
    { p: '___ many books on the shelf.', o: ['There is', 'There are', 'There be', 'There am'], c: 1, t: 'There is / There are' },
    { p: '___ a park near my house.', o: ['There is', 'There are', 'There be', 'There am'], c: 0, t: 'There is / There are' },
    // — Preguntas con To Be / Do-Does —
    { p: '___ your parents at home?', o: ['Is', 'Are', 'Do', 'Does'], c: 1, t: 'Preguntas: To Be / Do' },
    { p: '___ she like pizza?', o: ['Is', 'Are', 'Do', 'Does'], c: 3, t: 'Preguntas: To Be / Do' },
    { p: '___ you a football fan?', o: ['Is', 'Are', 'Do', 'Does'], c: 1, t: 'Preguntas: To Be / Do' },
    { p: '___ your brother work here?', o: ['Is', 'Are', 'Do', 'Does'], c: 3, t: 'Preguntas: To Be / Do' },
    { p: '___ this your bag?', o: ['Is', 'Are', 'Do', 'Does'], c: 0, t: 'Preguntas: To Be / Do' },
    // — Presente continuo —
    { p: 'Look! The baby ___.', o: ['sleep', 'sleeps', 'is sleeping', 'slept'], c: 2, t: 'Presente continuo' },
    { p: 'I ___ my homework right now.', o: ['do', 'does', 'am doing', 'did'], c: 2, t: 'Presente continuo' },
    { p: 'They ___ football at the moment.', o: ['play', 'plays', 'are playing', 'played'], c: 2, t: 'Presente continuo' },
    { p: 'She ___ a letter now.', o: ['write', 'writes', 'is writing', 'wrote'], c: 2, t: 'Presente continuo' },
    { p: 'We ___ lunch at the moment.', o: ['have', 'has', 'are having', 'had'], c: 2, t: 'Presente continuo' },
  ],

  /* ================= A2 · BÁSICO ================= */
  A2: [
    // — Pasado simple (regular) —
    { p: 'I ___ my homework last night.', o: ['finish', 'finished', 'finishing', 'finishes'], c: 1, t: 'Pasado simple regular' },
    { p: 'We ___ the film yesterday.', o: ['watch', 'watched', 'watching', 'watches'], c: 1, t: 'Pasado simple regular' },
    { p: 'She ___ her room last weekend.', o: ['clean', 'cleaned', 'cleaning', 'cleans'], c: 1, t: 'Pasado simple regular' },
    { p: 'They ___ football after school.', o: ['play', 'played', 'playing', 'plays'], c: 1, t: 'Pasado simple regular' },
    { p: 'He ___ to Madrid last year.', o: ['travel', 'travelled', 'travelling', 'travels'], c: 1, t: 'Pasado simple regular' },
    // — Pasado simple (irregular) —
    { p: 'I ___ to the cinema yesterday.', o: ['go', 'goes', 'went', 'gone'], c: 2, t: 'Pasado simple irregular' },
    { p: 'She ___ a beautiful picture.', o: ['draw', 'draws', 'drew', 'drawn'], c: 2, t: 'Pasado simple irregular' },
    { p: 'We ___ pizza for dinner.', o: ['eat', 'eats', 'ate', 'eaten'], c: 2, t: 'Pasado simple irregular' },
    { p: 'He ___ his keys this morning.', o: ['lose', 'loses', 'lost', 'losing'], c: 2, t: 'Pasado simple irregular' },
    { p: 'They ___ to the party last night.', o: ['come', 'comes', 'came', 'coming'], c: 2, t: 'Pasado simple irregular' },
    // — Pasado continuo —
    { p: 'I ___ TV when you called.', o: ['watch', 'watched', 'was watching', 'am watching'], c: 2, t: 'Pasado continuo' },
    { p: 'She ___ when the accident happened.', o: ['drive', 'drove', 'was driving', 'is driving'], c: 2, t: 'Pasado continuo' },
    { p: 'We ___ dinner at eight.', o: ['have', 'had', 'were having', 'are having'], c: 2, t: 'Pasado continuo' },
    { p: 'They ___ in the park when it started to rain.', o: ['walk', 'walked', 'were walking', 'are walking'], c: 2, t: 'Pasado continuo' },
    { p: 'He ___ a shower when the phone rang.', o: ['take', 'took', 'was taking', 'is taking'], c: 2, t: 'Pasado continuo' },
    // — Futuro: going to —
    { p: 'I ___ visit my grandmother tomorrow.', o: ['go to', 'going to', 'am going to', 'went to'], c: 2, t: 'Futuro: going to' },
    { p: "It's cloudy — I think it ___ rain.", o: ['go to', 'going to', 'is going to', 'went to'], c: 2, t: 'Futuro: going to' },
    { p: 'We ___ study for the exam this weekend.', o: ['go to', 'going to', 'are going to', 'went to'], c: 2, t: 'Futuro: going to' },
    { p: 'She ___ buy a new car next month.', o: ['go to', 'going to', 'is going to', 'went to'], c: 2, t: 'Futuro: going to' },
    { p: 'They ___ move to a new house.', o: ['go to', 'going to', 'are going to', 'went to'], c: 2, t: 'Futuro: going to' },
    // — Futuro: will —
    { p: 'I think it ___ be sunny tomorrow.', o: ['will', 'would', 'shall', 'going'], c: 0, t: 'Futuro: will' },
    { p: "Don't worry, I ___ help you.", o: ['will', 'would', 'shall', 'going'], c: 0, t: 'Futuro: will' },
    { p: '___ you open the window, please?', o: ['Will', 'Would', 'Shall', 'Going'], c: 0, t: 'Futuro: will' },
    { p: "I'm sure she ___ pass the exam.", o: ['will', 'would', 'shall', 'going'], c: 0, t: 'Futuro: will' },
    { p: 'They ___ probably arrive late.', o: ['will', 'would', 'shall', 'going'], c: 0, t: 'Futuro: will' },
    // — Have to / Must (obligación) —
    { p: 'You ___ wear a seatbelt in the car.', o: ['have to', 'has to', 'having to', 'had'], c: 0, t: 'Obligación: have to / must' },
    { p: 'She ___ finish her project by Friday.', o: ['have to', 'has to', 'having to', 'had'], c: 1, t: 'Obligación: have to / must' },
    { p: 'We ___ be quiet in the museum.', o: ['must', 'musts', 'musting', "mustn't"], c: 0, t: 'Obligación: have to / must' },
    { p: 'Students ___ do their homework every day.', o: ['have to', 'has to', 'having to', 'had'], c: 0, t: 'Obligación: have to / must' },
    { p: "You ___ smoke here — it's forbidden.", o: ['must', "mustn't", 'have to', "don't have to"], c: 1, t: 'Obligación: have to / must' },
    // — Should (consejo) —
    { p: 'You ___ study more for the test.', o: ['should', 'shoulds', 'shoulding', 'must'], c: 0, t: 'Should (consejo)' },
    { p: 'She ___ see a doctor.', o: ['should', 'shoulds', 'shoulding', 'must'], c: 0, t: 'Should (consejo)' },
    { p: 'You ___ not eat so much sugar.', o: ['should', 'shoulds', 'shoulding', 'must'], c: 0, t: 'Should (consejo)' },
    { p: 'We ___ leave early to avoid traffic.', o: ['should', 'shoulds', 'shoulding', 'must'], c: 0, t: 'Should (consejo)' },
    { p: '___ I take an umbrella?', o: ['Should', 'Shoulds', 'Musting', 'Must'], c: 0, t: 'Should (consejo)' },
    // — Presente perfecto básico —
    { p: 'I ___ never been to Japan.', o: ['have', 'has', 'had', 'having'], c: 0, t: 'Presente perfecto básico' },
    { p: 'She ___ just finished her homework.', o: ['have', 'has', 'had', 'having'], c: 1, t: 'Presente perfecto básico' },
    { p: 'We ___ already seen that movie.', o: ['have', 'has', 'had', 'having'], c: 0, t: 'Presente perfecto básico' },
    { p: 'He ___ never tried sushi.', o: ['have', 'has', 'had', 'having'], c: 1, t: 'Presente perfecto básico' },
    { p: '___ you ever visited London?', o: ['Have', 'Has', 'Had', 'Having'], c: 0, t: 'Presente perfecto básico' },
    // — Would like to —
    { p: 'I ___ like to visit Italy.', o: ['would', 'will', 'should', 'must'], c: 0, t: 'Would like to' },
    { p: 'She ___ like to be a doctor.', o: ['would', 'will', 'should', 'must'], c: 0, t: 'Would like to' },
    { p: '___ you like to come with us?', o: ['Would', 'Will', 'Should', 'Must'], c: 0, t: 'Would like to' },
    { p: 'We ___ like to order now, please.', o: ['would', 'will', 'should', 'must'], c: 0, t: 'Would like to' },
    { p: 'They ___ like to learn Japanese.', o: ['would', 'will', 'should', 'must'], c: 0, t: 'Would like to' },
    // — Enjoy/like + -ing —
    { p: 'I enjoy ___ music.', o: ['listen', 'listens', 'listening', 'listened'], c: 2, t: 'Enjoy / like + -ing' },
    { p: 'She likes ___ in the park.', o: ['run', 'runs', 'running', 'ran'], c: 2, t: 'Enjoy / like + -ing' },
    { p: 'We love ___ new places.', o: ['visit', 'visits', 'visiting', 'visited'], c: 2, t: 'Enjoy / like + -ing' },
    { p: 'He hates ___ up early.', o: ['get', 'gets', 'getting', 'got'], c: 2, t: 'Enjoy / like + -ing' },
    { p: 'They enjoy ___ video games.', o: ['play', 'plays', 'playing', 'played'], c: 2, t: 'Enjoy / like + -ing' },
  ],

  /* ================= B1 · INTERMEDIO ================= */
  B1: [
    // — Presente perfecto vs pasado simple —
    { p: "I ___ my keys. I can't find them anywhere.", o: ['lost', 'have lost', 'losing', 'lose'], c: 1, t: 'Presente perfecto vs pasado' },
    { p: 'She ___ to Paris in 2019.', o: ['went', 'has gone', 'go', 'goes'], c: 0, t: 'Presente perfecto vs pasado' },
    { p: '___ you ever seen a shark?', o: ['Did', 'Have', 'Do', 'Are'], c: 1, t: 'Presente perfecto vs pasado' },
    { p: 'He ___ his car last week.', o: ['sold', 'has sold', 'sell', 'sells'], c: 0, t: 'Presente perfecto vs pasado' },
    { p: 'We ___ here since 2015.', o: ['lived', 'have lived', 'live', 'lives'], c: 1, t: 'Presente perfecto vs pasado' },
    // — Presente perfecto continuo —
    { p: 'I ___ for two hours.', o: ['study', 'studied', 'have been studying', 'am studying'], c: 2, t: 'Presente perfecto continuo' },
    { p: "She ___ all day — she's exhausted.", o: ['work', 'worked', 'has been working', 'is working'], c: 2, t: 'Presente perfecto continuo' },
    { p: 'How long ___ you been learning English?', o: ['did', 'have', 'do', 'are'], c: 1, t: 'Presente perfecto continuo' },
    { p: 'It ___ raining since this morning.', o: ['rain', 'rained', 'has been raining', 'is raining'], c: 2, t: 'Presente perfecto continuo' },
    { p: "They ___ for hours; they're tired.", o: ['walk', 'walked', 'have been walking', 'are walking'], c: 2, t: 'Presente perfecto continuo' },
    // — Primer condicional —
    { p: 'If I have time, I ___ call you.', o: ['call', 'will call', 'called', 'would call'], c: 1, t: 'Primer condicional' },
    { p: 'If she studies hard, she ___ pass.', o: ['pass', 'will pass', 'passed', 'would pass'], c: 1, t: 'Primer condicional' },
    { p: 'If it rains, we ___ stay home.', o: ['stay', 'will stay', 'stayed', 'would stay'], c: 1, t: 'Primer condicional' },
    { p: "You'll be late if you ___ leave now.", o: ["don't", "won't", "didn't", "wouldn't"], c: 0, t: 'Primer condicional' },
    { p: 'If they arrive early, we ___ start on time.', o: ['start', 'will start', 'started', 'would start'], c: 1, t: 'Primer condicional' },
    // — Segundo condicional —
    { p: 'If I ___ more money, I would travel more.', o: ['have', 'had', 'has', 'having'], c: 1, t: 'Segundo condicional' },
    { p: 'If she ___ him, she would say hello.', o: ['see', 'saw', 'sees', 'seeing'], c: 1, t: 'Segundo condicional' },
    { p: 'What would you do if you ___ a lion?', o: ['meet', 'met', 'meets', 'meeting'], c: 1, t: 'Segundo condicional' },
    { p: 'If I were you, I ___ apologize.', o: ['will', 'would', 'should', 'must'], c: 1, t: 'Segundo condicional' },
    { p: 'We would go camping if the weather ___ better.', o: ['is', 'was', 'were', 'be'], c: 2, t: 'Segundo condicional' },
    // — Used to / would (hábitos pasados) —
    { p: 'I ___ play outside every day when I was young.', o: ['use to', 'used to', 'uses to', 'using to'], c: 1, t: 'Used to / would' },
    { p: 'She ___ have long hair, but she cut it.', o: ['use to', 'used to', 'uses to', 'using to'], c: 1, t: 'Used to / would' },
    { p: 'We ___ live in the countryside.', o: ['use to', 'used to', 'uses to', 'using to'], c: 1, t: 'Used to / would' },
    { p: 'Did you ___ collect stamps?', o: ['use to', 'used to', 'uses to', 'using to'], c: 0, t: 'Used to / would' },
    { p: 'He ___ walk to school every morning.', o: ['use to', 'used to', 'uses to', 'using to'], c: 1, t: 'Used to / would' },
    // — Modales de obligación (repaso) —
    { p: "You ___ wear a helmet — it's the law.", o: ['must', "mustn't", "needn't", 'should'], c: 0, t: 'Modales de obligación' },
    { p: "You ___ tell anyone — it's a secret.", o: ['must', "mustn't", "needn't", 'should'], c: 1, t: 'Modales de obligación' },
    { p: "You ___ bring your passport, I've got it.", o: ['must', "mustn't", "needn't", 'should'], c: 2, t: 'Modales de obligación' },
    { p: 'Employees ___ arrive on time.', o: ['must', "mustn't", "needn't", 'would'], c: 0, t: 'Modales de obligación' },
    { p: 'We ___ hurry — we have plenty of time.', o: ['must', "mustn't", "needn't", 'should'], c: 2, t: 'Modales de obligación' },
    // — Voz pasiva (presente y pasado simple) —
    { p: 'This cheese ___ in France.', o: ['make', 'makes', 'is made', 'was made'], c: 2, t: 'Voz pasiva' },
    { p: 'The letter ___ yesterday.', o: ['send', 'sent', 'is sent', 'was sent'], c: 3, t: 'Voz pasiva' },
    { p: 'English ___ in many countries.', o: ['speak', 'speaks', 'is spoken', 'was spoken'], c: 2, t: 'Voz pasiva' },
    { p: 'The window ___ by the storm last night.', o: ['break', 'broke', 'is broken', 'was broken'], c: 3, t: 'Voz pasiva' },
    { p: 'Rice ___ in Asia.', o: ['grow', 'grows', 'is grown', 'was grown'], c: 2, t: 'Voz pasiva' },
    // — Estilo indirecto (afirmaciones) —
    { p: 'She said she ___ tired.', o: ['is', 'was', 'be', 'been'], c: 1, t: 'Estilo indirecto' },
    { p: 'He told me he ___ in London.', o: ['live', 'lives', 'lived', 'living'], c: 2, t: 'Estilo indirecto' },
    { p: 'They said they ___ the movie already.', o: ['see', 'saw', 'had seen', 'seeing'], c: 2, t: 'Estilo indirecto' },
    { p: 'She said she ___ come to the party.', o: ['will', 'would', 'shall', 'can'], c: 1, t: 'Estilo indirecto' },
    { p: 'He told me he ___ hungry.', o: ['is', 'was', 'be', 'been'], c: 1, t: 'Estilo indirecto' },
    // — Gerundios tras verbos —
    { p: 'I enjoy ___ to music.', o: ['listen', 'listens', 'listening', 'listened'], c: 2, t: 'Gerundios tras verbos' },
    { p: 'Would you mind ___ the door?', o: ['close', 'closes', 'closing', 'closed'], c: 2, t: 'Gerundios tras verbos' },
    { p: 'She suggested ___ a taxi.', o: ['take', 'takes', 'taking', 'took'], c: 2, t: 'Gerundios tras verbos' },
    { p: 'We finished ___ the report.', o: ['write', 'writes', 'writing', 'wrote'], c: 2, t: 'Gerundios tras verbos' },
    { p: 'He avoids ___ junk food.', o: ['eat', 'eats', 'eating', 'ate'], c: 2, t: 'Gerundios tras verbos' },
    // — Infinitivos tras verbos/adjetivos —
    { p: 'I decided ___ a new language.', o: ['learn', 'learns', 'learning', 'to learn'], c: 3, t: 'Infinitivos tras verbos' },
    { p: 'She wants ___ a doctor.', o: ['be', 'is', 'being', 'to be'], c: 3, t: 'Infinitivos tras verbos' },
    { p: 'We need ___ now.', o: ['leave', 'leaves', 'leaving', 'to leave'], c: 3, t: 'Infinitivos tras verbos' },
    { p: 'I hope ___ you soon.', o: ['see', 'sees', 'seeing', 'to see'], c: 3, t: 'Infinitivos tras verbos' },
    { p: 'They agreed ___ the plan.', o: ['follow', 'follows', 'following', 'to follow'], c: 3, t: 'Infinitivos tras verbos' },
  ],

  /* ================= B2 · INTERMEDIO ALTO ================= */
  B2: [
    // — Tercer condicional —
    { p: 'If I had known, I ___ called you.', o: ['would', 'would have', 'will', 'will have'], c: 1, t: 'Tercer condicional' },
    { p: 'If she had studied, she ___ passed the exam.', o: ['would', 'would have', 'will', 'will have'], c: 1, t: 'Tercer condicional' },
    { p: "We wouldn't have missed the train if we ___ earlier.", o: ['leave', 'left', 'had left', 'would leave'], c: 2, t: 'Tercer condicional' },
    { p: "If it hadn't rained, we ___ gone to the beach.", o: ['would', 'would have', 'will', 'will have'], c: 1, t: 'Tercer condicional' },
    { p: 'I would have helped you if you ___ me.', o: ['ask', 'asked', 'had asked', 'would ask'], c: 2, t: 'Tercer condicional' },
    // — Condicionales mixtos —
    { p: 'If I had studied medicine, I ___ a doctor now.', o: ['would be', 'would have been', 'will be', 'am'], c: 0, t: 'Condicionales mixtos' },
    { p: "If she hadn't missed the bus, she ___ here now.", o: ['would be', 'would have been', 'will be', 'is'], c: 0, t: 'Condicionales mixtos' },
    { p: 'If we had bought that house, we ___ richer today.', o: ['would be', 'would have been', 'will be', 'are'], c: 0, t: 'Condicionales mixtos' },
    { p: "If he hadn't broken his leg, he ___ in the race now.", o: ['would be', 'would have been', 'will be', 'is'], c: 0, t: 'Condicionales mixtos' },
    { p: "If I hadn't lost my job, I ___ happier now.", o: ['would be', 'would have been', 'will be', 'am'], c: 0, t: 'Condicionales mixtos' },
    // — Voz pasiva (todos los tiempos) —
    { p: 'The report ___ by tomorrow.', o: ['will finish', 'will be finished', 'finishes', 'finished'], c: 1, t: 'Voz pasiva avanzada' },
    { p: 'The bridge ___ since March.', o: ['has repaired', 'has been repaired', 'is repairing', 'repairs'], c: 1, t: 'Voz pasiva avanzada' },
    { p: 'A new hospital ___ next year.', o: ['will build', 'will be built', 'builds', 'built'], c: 1, t: 'Voz pasiva avanzada' },
    { p: 'The documents ___ right now.', o: ['are signing', 'are being signed', 'sign', 'signed'], c: 1, t: 'Voz pasiva avanzada' },
    { p: 'The results ___ by the committee.', o: ['are reviewing', 'are being reviewed', 'review', 'reviewed'], c: 1, t: 'Voz pasiva avanzada' },
    // — Modales de deducción —
    { p: "She's not answering — she ___ be busy.", o: ['must', "mustn't", "needn't", 'should'], c: 0, t: 'Modales de deducción' },
    { p: "He isn't at his desk — he ___ have gone home.", o: ['must', 'might', "mustn't", 'should'], c: 1, t: 'Modales de deducción' },
    { p: "That ___ be true — I saw it myself!", o: ["can't", 'must', 'might', 'should'], c: 1, t: 'Modales de deducción' },
    { p: "She's wearing a ring — she ___ be married.", o: ['might', "can't", 'must', 'should'], c: 2, t: 'Modales de deducción' },
    { p: 'He ___ have been asleep — he did not answer.', o: ['must', "mustn't", "can't", 'should'], c: 0, t: 'Modales de deducción' },
    // — Should have / Shouldn't have —
    { p: 'You ___ have told me — I was so worried!', o: ['should', "shouldn't", 'must', "mustn't"], c: 0, t: 'Should have / Shouldn\'t have' },
    { p: 'I ___ have eaten so much — I feel sick now.', o: ['should', "shouldn't", 'must', "mustn't"], c: 1, t: 'Should have / Shouldn\'t have' },
    { p: 'She ___ have studied harder; she failed the exam.', o: ['should', "shouldn't", 'must', "mustn't"], c: 0, t: 'Should have / Shouldn\'t have' },
    { p: 'We ___ have left so late — we missed the flight.', o: ['should', "shouldn't", 'must', "mustn't"], c: 1, t: 'Should have / Shouldn\'t have' },
    { p: 'You ___ have called before visiting.', o: ['should', "shouldn't", 'must', "mustn't"], c: 0, t: 'Should have / Shouldn\'t have' },
    // — Estilo indirecto (preguntas y órdenes) —
    { p: 'She asked me what time it ___.', o: ['is', 'was', 'be', 'been'], c: 1, t: 'Estilo indirecto avanzado' },
    { p: 'He asked me where I ___.', o: ['live', 'lived', 'living', 'lives'], c: 1, t: 'Estilo indirecto avanzado' },
    { p: 'She told me ___ the door.', o: ['close', 'to close', 'closing', 'closed'], c: 1, t: 'Estilo indirecto avanzado' },
    { p: 'He asked her if she ___ coffee.', o: ['like', 'likes', 'liked', 'liking'], c: 2, t: 'Estilo indirecto avanzado' },
    { p: 'The teacher told us ___ late.', o: ['not to be', 'to not be', 'not being', "don't be"], c: 0, t: 'Estilo indirecto avanzado' },
    // — Gerundio vs infinitivo (cambio de significado) —
    { p: 'I remember ___ that email — I sent it yesterday.', o: ['send', 'sending', 'to send', 'sent'], c: 1, t: 'Gerundio vs infinitivo' },
    { p: 'Please remember ___ the lights off.', o: ['turn', 'turning', 'to turn', 'turned'], c: 2, t: 'Gerundio vs infinitivo' },
    { p: 'He stopped ___ a cigarette.', o: ['smoke', 'smoking', 'to smoke', 'smoked'], c: 1, t: 'Gerundio vs infinitivo' },
    { p: 'We stopped ___ photos of the sunset.', o: ['take', 'taking', 'to take', 'took'], c: 2, t: 'Gerundio vs infinitivo' },
    { p: "I'll never forget ___ that mountain.", o: ['see', 'seeing', 'to see', 'saw'], c: 1, t: 'Gerundio vs infinitivo' },
    // — Futuro perfecto / futuro continuo —
    { p: 'By 2030, she ___ her studies.', o: ['will finish', 'will have finished', 'finishes', 'finished'], c: 1, t: 'Futuro perfecto / continuo' },
    { p: 'This time tomorrow, we ___ on a plane.', o: ['will fly', 'will be flying', 'fly', 'flew'], c: 1, t: 'Futuro perfecto / continuo' },
    { p: 'By next year, they ___ here for a decade.', o: ['will live', 'will have lived', 'live', 'lived'], c: 1, t: 'Futuro perfecto / continuo' },
    { p: 'At 8pm tonight, I ___ dinner.', o: ['will cook', 'will be cooking', 'cook', 'cooked'], c: 1, t: 'Futuro perfecto / continuo' },
    { p: 'By the time you arrive, we ___.', o: ['will leave', 'will have left', 'leave', 'left'], c: 1, t: 'Futuro perfecto / continuo' },
    // — Causativo (have/get something done) —
    { p: 'I ___ my hair cut yesterday.', o: ['have', 'had', 'has', 'having'], c: 1, t: 'Causativo: have something done' },
    { p: "She's going to ___ her car repaired.", o: ['have', 'had', 'has', 'having'], c: 0, t: 'Causativo: have something done' },
    { p: 'We ___ our house painted last summer.', o: ['have', 'had', 'has', 'having'], c: 1, t: 'Causativo: have something done' },
    { p: 'He needs to ___ his phone fixed.', o: ['have', 'had', 'has', 'having'], c: 0, t: 'Causativo: have something done' },
    { p: 'They ___ the windows cleaned every month.', o: ['have', 'had', 'has', 'having'], c: 0, t: 'Causativo: have something done' },
    // — Wish / If only —
    { p: 'I wish I ___ more time to study.', o: ['have', 'had', 'has', 'having'], c: 1, t: 'Wish / If only' },
    { p: 'If only I ___ the answer!', o: ['know', 'knew', 'knows', 'knowing'], c: 1, t: 'Wish / If only' },
    { p: 'She wishes she ___ taller.', o: ['is', 'was', 'were', 'be'], c: 2, t: 'Wish / If only' },
    { p: 'I wish you ___ so much noise.', o: ["don't make", "didn't make", "won't make", "wouldn't make"], c: 1, t: 'Wish / If only' },
    { p: 'If only I ___ that mistake.', o: ["don't make", "didn't make", "hadn't made", "wouldn't make"], c: 2, t: 'Wish / If only' },
  ],

  /* ================= C1 · AVANZADO ================= */
  C1: [
    // — Inversión enfática —
    { p: 'Never ___ such a mess.', o: ['I have seen', 'have I seen', 'I saw', 'did I saw'], c: 1, t: 'Inversión enfática' },
    { p: 'Rarely ___ such dedication.', o: ['we have seen', 'have we seen', 'we saw', 'did we saw'], c: 1, t: 'Inversión enfática' },
    { p: 'Not until later ___ the truth.', o: ['she realized', 'did she realize', 'she did realize', 'realized she'], c: 1, t: 'Inversión enfática' },
    { p: 'Seldom ___ such a beautiful view.', o: ['I have seen', 'have I seen', 'I saw', 'did I saw'], c: 1, t: 'Inversión enfática' },
    { p: 'Only after the meeting ___ what had happened.', o: ['he understood', 'did he understand', 'he did understand', 'understood he'], c: 1, t: 'Inversión enfática' },
    // — Oraciones hendidas (cleft sentences) —
    { p: 'It was in 1969 ___ humans first walked on the moon.', o: ['who', 'which', 'what', 'that'], c: 3, t: 'Oraciones hendidas' },
    { p: "What I need ___ a good night's sleep.", o: ['is', 'are', 'was', 'were'], c: 0, t: 'Oraciones hendidas' },
    { p: 'It was the manager ___ made the final decision.', o: ['who', 'which', 'what', 'that'], c: 0, t: 'Oraciones hendidas' },
    { p: "It wasn't until Friday ___ we got the results.", o: ['who', 'which', 'what', 'that'], c: 3, t: 'Oraciones hendidas' },
    { p: 'What surprised me most ___ his honesty.', o: ['is', 'are', 'was', 'were'], c: 0, t: 'Oraciones hendidas' },
    // — Modales avanzados (matices) —
    { p: 'He ___ have forgotten — he never forgets anything.', o: ["can't", 'must', "needn't", 'should'], c: 0, t: 'Modales avanzados' },
    { p: "You ___ have worried — everything was fine.", o: ["needn't", "mustn't", "can't", "shouldn't"], c: 0, t: 'Modales avanzados' },
    { p: "She ___ have missed the train; she's always early.", o: ["can't", 'must', "needn't", 'should'], c: 0, t: 'Modales avanzados' },
    { p: 'They ___ have left already — their car is still here.', o: ["can't", 'must', "needn't", 'should'], c: 0, t: 'Modales avanzados' },
    { p: 'He ___ have known about the surprise — he acted so shocked.', o: ["can't", "mustn't", "needn't", "couldn't"], c: 0, t: 'Modales avanzados' },
    // — Condicionales avanzados / invertidos —
    { p: '___ I known, I would have acted differently.', o: ['Had', 'If', 'Were', 'Should'], c: 0, t: 'Condicionales invertidos' },
    { p: '___ you need anything, just call me.', o: ['Had', 'Should', 'Were', 'If only'], c: 1, t: 'Condicionales invertidos' },
    { p: '___ I in your position, I would resign.', o: ['Had', 'If', 'Were', 'Should'], c: 2, t: 'Condicionales invertidos' },
    { p: '___ it not been for your help, we would have failed.', o: ['Had', 'Were', 'Should', 'If only'], c: 0, t: 'Condicionales invertidos' },
    { p: '___ she to apologize, would you forgive her?', o: ['Had', 'If', 'Were', 'Should'], c: 2, t: 'Condicionales invertidos' },
    // — Subjuntivo —
    { p: 'The doctor suggested that he ___ more rest.', o: ['gets', 'get', 'got', 'getting'], c: 1, t: 'Subjuntivo' },
    { p: "It's essential that she ___ informed immediately.", o: ['is', 'be', 'was', 'being'], c: 1, t: 'Subjuntivo' },
    { p: 'They insisted that he ___ present at the meeting.', o: ['is', 'be', 'was', 'being'], c: 1, t: 'Subjuntivo' },
    { p: 'I recommend that the report ___ revised.', o: ['is', 'be', 'was', 'being'], c: 1, t: 'Subjuntivo' },
    { p: 'The manager demanded that the work ___ finished by Friday.', o: ['is', 'be', 'was', 'being'], c: 1, t: 'Subjuntivo' },
    // — Gerundio / infinitivo avanzado —
    { p: 'He went on ___ his speech despite the interruption.', o: ['give', 'giving', 'to give', 'gave'], c: 1, t: 'Gerundio/infinitivo avanzado' },
    { p: 'After the break, she went on ___ about her trip.', o: ['talk', 'talking', 'to talk', 'talked'], c: 1, t: 'Gerundio/infinitivo avanzado' },
    { p: 'I stopped ___ directions from a stranger.', o: ['ask', 'asking', 'to ask', 'asked'], c: 2, t: 'Gerundio/infinitivo avanzado' },
    { p: "Try ___ the door — maybe it's unlocked.", o: ['open', 'opening', 'to open', 'opened'], c: 2, t: 'Gerundio/infinitivo avanzado' },
    { p: "She tried ___ the radio to fall asleep, but it didn't work.", o: ['play', 'playing', 'to play', 'played'], c: 1, t: 'Gerundio/infinitivo avanzado' },
    // — Voz pasiva con verbos de reporte —
    { p: 'He ___ to have left the country.', o: ['is said', 'says', 'said', 'is saying'], c: 0, t: 'Pasiva con verbos de reporte' },
    { p: 'The suspect ___ to be hiding nearby.', o: ['is believed', 'believes', 'believed', 'is believing'], c: 0, t: 'Pasiva con verbos de reporte' },
    { p: 'It ___ that the economy will improve.', o: ['is expected', 'expects', 'expected', 'is expecting'], c: 0, t: 'Pasiva con verbos de reporte' },
    { p: 'She ___ to have won several awards.', o: ['is reported', 'reports', 'reported', 'is reporting'], c: 0, t: 'Pasiva con verbos de reporte' },
    { p: 'The building ___ to be haunted.', o: ['is rumoured', 'rumours', 'rumoured', 'is rumouring'], c: 0, t: 'Pasiva con verbos de reporte' },
    // — Cláusulas de participio —
    { p: '___ his homework, he went out to play.', o: ['Finish', 'Finished', 'Having finished', 'To finish'], c: 2, t: 'Cláusulas de participio' },
    { p: '___ what to say, she remained silent.', o: ['Not know', 'Not knowing', 'Not known', 'Not to know'], c: 1, t: 'Cláusulas de participio' },
    { p: '___ by the noise, the baby woke up.', o: ['Startle', 'Startled', 'Startling', 'To startle'], c: 1, t: 'Cláusulas de participio' },
    { p: '___ the letter, he felt relieved.', o: ['Read', 'Reading', 'Having read', 'To read'], c: 2, t: 'Cláusulas de participio' },
    { p: '___ his final exam, he felt a huge sense of relief.', o: ['Finish', 'Finishing', 'Having finished', 'To finish'], c: 2, t: 'Cláusulas de participio' },
    // — Futuro en el pasado —
    { p: 'I ___ call you, but I forgot.', o: ['was going to', 'will', 'would', 'am going to'], c: 0, t: 'Futuro en el pasado' },
    { p: 'She said she ___ call me later.', o: ['will', 'would', 'is going to', 'was going to'], c: 1, t: 'Futuro en el pasado' },
    { p: 'We ___ to visit them, but something came up.', o: ['was going to', 'were going to', 'will', 'would'], c: 1, t: 'Futuro en el pasado' },
    { p: 'He thought it ___ rain, so he took an umbrella.', o: ['will', 'would', 'is going to', 'was going to'], c: 1, t: 'Futuro en el pasado' },
    { p: 'I knew she ___ be upset about the news.', o: ['will', 'would', 'is going to', 'was going to'], c: 1, t: 'Futuro en el pasado' },
    // — Estructuras enfáticas con do/does/did —
    { p: 'I ___ enjoy the concert last night!', o: ['do', 'does', 'did', 'done'], c: 2, t: 'Énfasis con do/does/did' },
    { p: 'She ___ work hard — you have to admit that.', o: ['do', 'does', 'did', 'done'], c: 1, t: 'Énfasis con do/does/did' },
    { p: 'We ___ try our best, even though we lost.', o: ['do', 'does', 'did', 'done'], c: 2, t: 'Énfasis con do/does/did' },
    { p: 'He ___ love his job, despite the long hours.', o: ['do', 'does', 'did', 'done'], c: 1, t: 'Énfasis con do/does/did' },
    { p: "They ___ warn us, but we didn't listen.", o: ['do', 'does', 'did', 'done'], c: 2, t: 'Énfasis con do/does/did' },
  ],
};
