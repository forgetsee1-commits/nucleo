/* ==========================================================
   1. ЖИВОЙ ФОН — ПЛОТНЫЙ ГРАФ ЗНАНИЙ
   ========================================================== */
(function(){
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;

  // Настройки графа — теперь плотнее
  var COUNT = 150;              // слов на экране
  var LINK_DIST = 340;          // максимальная длина линии
  var HIT_RADIUS = 55;          // радиус клика
  var MAX_LINKS_PER_NODE = 7;   // сколько линий у одного узла

  var COLORS = {
    html:    '224,138,92',
    css:     '137,166,216',
    js:      '201,184,82',
    git:     '201,136,162',
    general: '160,158,168'
  };

  var FALLBACK = [
    {w:'html', c:'224,138,92'}, {w:'css',  c:'137,166,216'},
    {w:'js',   c:'201,184,82'}, {w:'flex', c:'137,166,216'},
    {w:'map',  c:'201,184,82'}, {w:'let',  c:'201,184,82'},
    {w:'div',  c:'224,138,92'}, {w:'git',  c:'201,136,162'}
  ];

  function getWordSource(){
    if (typeof KB !== 'undefined' && KB.length){
      var out = [];
      for (var i = 0; i < KB.length; i++){
        var item = KB[i];
        if (!item.key || !item.cat) continue;
        var c = COLORS[item.cat] || COLORS.general;
        out.push({ w: item.key, c: c });
      }
      return out.length ? out : FALLBACK;
    }
    return FALLBACK;
  }

  var WORDS = [];
  var particles = [];
  var mouse = { x: -9999, y: -9999 };
  var hovered = null;

  function resize(){
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function createParticle(index, total){
    var item = WORDS[index % WORDS.length];
    var angle = Math.random() * Math.PI * 2;
    var speed = 0.10 + Math.random() * 0.20;

    // Равномерная раскладка по сетке
    var cols = Math.ceil(Math.sqrt(total * (W / H)));
    var rows = Math.ceil(total / cols);
    var cellW = W / cols;
    var cellH = H / rows;
    var col = index % cols;
    var row = Math.floor(index / cols);

    var x = col * cellW + cellW * (0.15 + Math.random() * 0.7);
    var y = row * cellH + cellH * (0.15 + Math.random() * 0.7);

    return {
      word: item.w,
      color: item.c,
      size: 13 + Math.random() * 5,
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 0.45 + Math.random() * 0.35,
      hovered: false
    };
  }

  function initParticles(){
    WORDS = getWordSource();
    particles = [];
    // Показываем много слов — повторяем источник, если он короче COUNT
    var count = COUNT;
    for (var i = 0; i < count; i++) particles.push(createParticle(i, count));
  }

  function dist2(a, b){
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function draw(){
    ctx.clearRect(0, 0, W, H);

       // Зона, где живёт заголовок и поиск — сюда слова не заплывают
    // Размер подобран так, чтобы покрыть центральный блок с запасом
    var zoneW = 620;   // ширина «мёртвой зоны»
    var zoneH = 320;   // высота
    var zoneX = (W - zoneW) / 2;   // левый край
    var zoneY = (H - zoneH) / 2 - 40; // верхний край (чуть выше центра)
    var zonePadding = 30; // мягкий отступ от зоны

    for (var i = 0; i < particles.length; i++){
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Отражение от краёв экрана
      if (p.x < 50) { p.x = 50; p.vx = Math.abs(p.vx); }
      if (p.x > W - 50) { p.x = W - 50; p.vx = -Math.abs(p.vx); }
      if (p.y < 25) { p.y = 25; p.vy = Math.abs(p.vy); }
      if (p.y > H - 25) { p.y = H - 25; p.vy = -Math.abs(p.vy); }

      // Отталкивание от «мёртвой зоны»
      // Проверяем, зашло ли слово в прямоугольник (с запасом)
      var zx1 = zoneX - zonePadding;
      var zy1 = zoneY - zonePadding;
      var zx2 = zoneX + zoneW + zonePadding;
      var zy2 = zoneY + zoneH + zonePadding;

      if (p.x > zx1 && p.x < zx2 && p.y > zy1 && p.y < zy2){
        // Считаем, какая сторона ближе — туда и выталкиваем
        var dLeft   = p.x - zx1;
        var dRight  = zx2 - p.x;
        var dTop    = p.y - zy1;
        var dBottom = zy2 - p.y;

        var minD = Math.min(dLeft, dRight, dTop, dBottom);

        if (minD === dLeft){
          p.x = zx1;
          p.vx = -Math.abs(p.vx);
        } else if (minD === dRight){
          p.x = zx2;
          p.vx = Math.abs(p.vx);
        } else if (minD === dTop){
          p.y = zy1;
          p.vy = -Math.abs(p.vy);
        } else {
          p.y = zy2;
          p.vy = Math.abs(p.vy);
        }
      }
    }

    // Связи
    var maxD2 = LINK_DIST * LINK_DIST;
    var links = [];
    for (var a = 0; a < particles.length; a++){
      var p1 = particles[a];
      var neighbours = [];
      for (var b = a + 1; b < particles.length; b++){
        var p2 = particles[b];
        var d2 = dist2(p1, p2);
        if (d2 < maxD2) neighbours.push({ idx: b, d2: d2 });
      }
      neighbours.sort(function(x, y){ return x.d2 - y.d2; });
      for (var n = 0; n < Math.min(neighbours.length, MAX_LINKS_PER_NODE); n++){
        links.push({ a: a, b: neighbours[n].idx, d2: neighbours[n].d2 });
      }
    }

    for (var k = 0; k < links.length; k++){
      var l = links[k];
      var pa = particles[l.a];
      var pb = particles[l.b];
      var d = Math.sqrt(l.d2);
      var alpha = (1 - d / LINK_DIST) * 0.5;
      if (alpha < 0.02) continue;
      if (pa.hovered || pb.hovered) alpha = Math.min(alpha * 2.5, 0.75);

      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = 'rgba(215, 220, 245, ' + alpha + ')';
      ctx.lineWidth = (pa.hovered || pb.hovered) ? 1.5 : 0.9;
      ctx.stroke();
    }

    for (var m = 0; m < particles.length; m++){
      var q = particles[m];

      if (q.hovered){
        var rad = q.size * 4;
        var grd = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rad);
        grd.addColorStop(0, 'rgba(' + q.color + ', 0.32)');
        grd.addColorStop(1, 'rgba(' + q.color + ', 0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(q.x, q.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = (q.hovered ? '700 ' : '500 ') + q.size + 'px "JetBrains Mono", monospace';
      ctx.fillStyle = q.hovered
        ? 'rgba(' + q.color + ', 1)'
        : 'rgba(' + q.color + ', ' + q.alpha + ')';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(q.word, q.x, q.y);
    }
  }

  function loop(){
    draw();
    requestAnimationFrame(loop);
  }

  function hitTest(mx, my){
    var best = null;
    var bestD2 = Infinity;
    for (var i = 0; i < particles.length; i++){
      var p = particles[i];
      ctx.font = '500 ' + p.size + 'px "JetBrains Mono", monospace';
      var w = ctx.measureText(p.word).width;
      var hw = w / 2 + 16;
      var hh = p.size / 2 + 14;
      if (mx > p.x - hw && mx < p.x + hw &&
          my > p.y - hh && my < p.y + hh){
        var d2 = (mx - p.x) * (mx - p.x) + (my - p.y) * (my - p.y);
        if (d2 < bestD2){ bestD2 = d2; best = p; }
      }
    }
    return best;
  }

  function updateHover(){
    var best = hitTest(mouse.x, mouse.y);
    if (hovered && hovered !== best) hovered.hovered = false;
    if (best) best.hovered = true;
    hovered = best;
    canvas.style.cursor = best ? 'pointer' : 'default';
  }

  window.addEventListener('mousemove', function(e){
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    updateHover();
  });

  window.addEventListener('mouseleave', function(){
    mouse.x = -9999; mouse.y = -9999;
    if (hovered) hovered.hovered = false;
    hovered = null;
    canvas.style.cursor = 'default';
  });

  var clickTimer = null;
  canvas.style.pointerEvents = 'auto';

  canvas.addEventListener('click', function(e){
    var hit = hitTest(e.clientX, e.clientY);
    if (!hit) return;
    if (clickTimer){ clearTimeout(clickTimer); clickTimer = null; }
    clickTimer = setTimeout(function(){
      clickTimer = null;
      var inp = document.getElementById('searchInput');
      if (inp){
        inp.value = hit.word;
        if (typeof doSearch === 'function') doSearch();
      }
    }, 20);
  });

  window.addEventListener('resize', function(){
    resize();
    initParticles();
  });

  resize();
  setTimeout(function(){
    initParticles();
    loop();
  }, 60);
})();


/* ==========================================================
   2. БАЗА ЗНАНИЙ
   ========================================================== */
var KB = [

  /* ============================================================
     HTML — СТРУКТУРА
     ============================================================ */
  {
    key: 'html',
    title: 'html',
    cat: 'html',
    sub: 'корневой тег страницы',
    what: 'html — самый внешний тег. Внутри него живёт вообще всё: и head, и body. Он говорит браузеру «вот здесь начинается документ».',
    analogy: 'Это как обложка тетради. Что бы ты ни писал — всё внутри неё.',
    code: [
      '<!DOCTYPE html>',
      '<html lang="ru">',
      '  ...',
      '</html>'
    ].join('\n'),
    note: 'lang в html указывает язык страницы. Для русской — ru.',
    course: [
      { title: 'открой тег', text: 'В начале файла после DOCTYPE напиши html.' },
      { title: 'добавь язык', text: 'Внутри атрибут lang="ru".' },
      { title: 'закрой', text: 'Закрывающий html — в самом конце.' }
    ],
    related: ['head', 'body'],
    keywords: ['html','документ','корень','страница']
  },

  {
    key: 'head',
    title: 'head',
    cat: 'html',
    sub: 'служебная часть страницы',
    what: 'head — часть, которую пользователь не видит. Внутри: заголовок вкладки, кодировка, подключённые стили и шрифты.',
    analogy: 'Это как этикетка на банке: снаружи написано, что внутри, но само содержимое — не здесь.',
    code: [
      '<head>',
      '  <meta charset="UTF-8">',
      '  <title>Мой сайт</title>',
      '  <link rel="stylesheet" href="style.css">',
      '</head>'
    ].join('\n'),
    note: 'head идёт до body. Всё, что подключаешь — стили, шрифты, иконка — сюда.',
    course: [
      { title: 'создай head', text: 'Внутри html сразу после открытия.' },
      { title: 'кодировка', text: 'meta charset="UTF-8".' },
      { title: 'имя', text: 'title — текст на вкладке.' }
    ],
    related: ['html', 'body', 'meta'],
    keywords: ['head','голова','служебный']
  },

  {
    key: 'body',
    title: 'body',
    cat: 'html',
    sub: 'видимое содержимое страницы',
    what: 'body — то, что видно в браузере. Заголовки, параграфы, картинки, кнопки, ссылки.',
    analogy: 'Это как сцена в театре. Зритель видит только то, что здесь.',
    code: [
      '<body>',
      '  <h1>Привет</h1>',
      '  <p>Первый параграф.</p>',
      '</body>'
    ].join('\n'),
    note: 'Один html — один body. Внутри может быть сколько угодно элементов.',
    course: [
      { title: 'открой', text: 'После head начинается body.' },
      { title: 'контент', text: 'h1, p, img — всё сюда.' },
      { title: 'закрой', text: 'Перед закрывающим html.' }
    ],
    related: ['html', 'head'],
    keywords: ['body','тело','контент','сцена']
  },

  {
    key: 'meta',
    title: 'meta',
    cat: 'html',
    sub: 'служебная информация о странице',
    what: 'meta — одиночный тег в head. Рассказывает браузеру: кодировка, масштаб на телефоне, описание страницы.',
    analogy: 'Это как паспорт страницы: пол, возраст, откуда.',
    code: [
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<meta name="description" content="Моя первая страница">'
    ].join('\n'),
    note: 'viewport — очень важный meta. Без него телефон покажет сайт как уменьшенный десктоп.',
    course: [
      { title: 'кодировка', text: 'charset="UTF-8" — первый meta.' },
      { title: 'viewport', text: 'Второй meta — для телефона.' },
      { title: 'описание', text: 'description — текст под ссылкой в поиске.' }
    ],
    related: ['head', 'html'],
    keywords: ['meta','кодировка','описание','паспорт']
  },

  {
    key: 'title',
    title: 'title',
    cat: 'html',
    sub: 'название вкладки браузера',
    what: 'title — текст на вкладке браузера и в закладках. Идёт внутри head. Один title на страницу.',
    analogy: 'Это как подпись на папке: видно сразу, о чём внутри.',
    code: [
      '<title>Мой первый сайт</title>'
    ].join('\n'),
    note: 'title показывается в результатах поиска. Пиши осмысленно: «Купить кофе с доставкой — Москва».',
    course: [
      { title: 'в head', text: 'title идёт внутри head.' },
      { title: 'текст', text: 'Между тегами — текст вкладки.' },
      { title: 'проверь', text: 'Обнови — название вкладки изменилось.' }
    ],
    related: ['head', 'meta'],
    keywords: ['title','заголовок','вкладка']
  },

  {
    key: 'link',
    title: 'link',
    cat: 'html',
    sub: 'подключение внешних файлов',
    what: 'link — одиночный тег в head. Через него подключают CSS-стили, шрифты, иконку сайта.',
    analogy: 'Это как удлинитель: сам не работает, но подключает к сети то, что нужно.',
    code: [
      '<link rel="stylesheet" href="style.css">',
      '<link rel="icon" href="favicon.png">'
    ].join('\n'),
    note: 'Для CSS rel="stylesheet". Для иконки — rel="icon". href — путь к файлу.',
    course: [
      { title: 'rel', text: 'Что подключаешь: stylesheet, icon.' },
      { title: 'href', text: 'Путь к файлу.' },
      { title: 'проверь', text: 'Обнови — стили должны примениться.' }
    ],
    related: ['head', 'css'],
    keywords: ['link','подключение','стили','stylesheet']
  },

  {
    key: 'script',
    title: 'script',
    cat: 'html',
    sub: 'подключение JavaScript',
    what: 'script — тег для подключения JavaScript. Либо код внутри, либо ссылка на отдельный файл.',
    analogy: 'Это как пульт для телевизора: снаружи не часть телевизора, но управляет им.',
    code: [
      '<script src="script.js"></script>'
    ].join('\n'),
    note: 'Скрипт ставится в конце body — чтобы HTML успел загрузиться до работы JS.',
    course: [
      { title: 'создай', text: 'Файл script.js рядом с index.html.' },
      { title: 'подключи', text: 'В конце body: script с src.' },
      { title: 'проверь', text: 'Открой консоль F12 — увидишь вывод.' }
    ],
    related: ['js', 'body'],
    keywords: ['script','js','скрипт','подключение']
  },

  /* ============================================================
     HTML — ЗАГОЛОВКИ И ТЕКСТ
     ============================================================ */
  {
    key: 'h1',
    title: 'h1',
    cat: 'html',
    sub: 'заголовок первого уровня',
    what: 'h1 — самый главный заголовок на странице. Как название главы в книге. Один h1 на страницу.',
    analogy: 'Это как название фильма в титрах.',
    code: ['<h1>Заголовок страницы</h1>'].join('\n'),
    note: 'Один h1 на страницу. Остальные — h2 и ниже.',
    course: [
      { title: 'напиши', text: 'h1 с текстом в body.' },
      { title: 'проверь', text: 'Обнови — крупный заголовок.' },
      { title: 'один', text: 'Не делай пять h1.' }
    ],
    related: ['h2', 'p'],
    keywords: ['h1','заголовок','главный']
  },

  {
    key: 'h2',
    title: 'h2',
    cat: 'html',
    sub: 'заголовок второго уровня',
    what: 'h2 — подзаголовок. Меньше h1, но крупнее текста. Разбивает страницу на разделы.',
    analogy: 'Это как название параграфа в книге.',
    code: ['<h2>Глава первая</h2>'].join('\n'),
    note: 'Всего уровней шесть: h1 — самый большой, h6 — мелкий. Не пропускай уровни.',
    course: [
      { title: 'после h1', text: 'h2 идёт после h1.' },
      { title: 'несколько', text: 'h2 может быть много.' },
      { title: 'структура', text: 'h1 → h2 → h3 — логика.' }
    ],
    related: ['h1', 'h3'],
    keywords: ['h2','заголовок','подзаголовок','раздел']
  },

  {
    key: 'h3',
    title: 'h3',
    cat: 'html',
    sub: 'заголовок третьего уровня',
    what: 'h3 — подраздел внутри h2.',
    analogy: 'Глава → параграф → подпункт.',
    code: ['<h3>Часть первая</h3>'].join('\n'),
    note: 'Дальше по аналогии h4, h5, h6. Больше h3 на практике не нужно.',
    course: [
      { title: 'внутри h2', text: 'h3 только внутри h2-раздела.' },
      { title: 'короче', text: 'Текст короче, чем у h2.' },
      { title: 'стиль', text: 'Размер можно менять через CSS.' }
    ],
    related: ['h2', 'p'],
    keywords: ['h3','подраздел','заголовок']
  },

  {
    key: 'p',
    title: 'p',
    cat: 'html',
    sub: 'параграф — блок текста',
    what: 'p — обычный абзац. Основной инструмент для текста. Один абзац — один p.',
    analogy: 'Это как абзац в книге. Одна мысль — один абзац.',
    code: [
      '<p>Первый абзац текста.</p>',
      '<p>Второй абзац текста.</p>'
    ].join('\n'),
    note: 'p нельзя вкладывать в p. Для переноса строки — br. Для нового абзаца — новый p.',
    course: [
      { title: 'напиши', text: 'p с текстом в body.' },
      { title: 'много', text: 'Сколько абзацев — столько p.' },
      { title: 'стилизуй', text: 'Через CSS — шрифт и отступы.' }
    ],
    related: ['h1', 'br'],
    keywords: ['p','параграф','абзац','текст']
  },

  {
    key: 'br',
    title: 'br',
    cat: 'html',
    sub: 'перенос строки',
    what: 'br — одиночный тег. Переносит строку внутри абзаца, не создавая новый параграф.',
    analogy: 'Это как Enter в блокноте: строка заканчивается, абзац тот же.',
    code: ['<p>Первая строка<br>Вторая строка</p>'].join('\n'),
    note: 'Не используй br для отступов между абзацами — для этого CSS margin.',
    course: [
      { title: 'внутри p', text: 'br там, где нужен разрыв.' },
      { title: 'одиночный', text: 'У br нет закрывающего.' },
      { title: 'не злоупотребляй', text: 'Три br подряд — плохо.' }
    ],
    related: ['p', 'hr'],
    keywords: ['br','перенос','строка','enter']
  },

  {
    key: 'hr',
    title: 'hr',
    cat: 'html',
    sub: 'горизонтальная линия',
    what: 'hr — одиночный тег. Рисует линию на всю ширину. Разделяет смысловые блоки.',
    analogy: 'Это как разделительная линия в тетради.',
    code: [
      '<p>Первый блок</p>',
      '<hr>',
      '<p>Второй блок</p>'
    ].join('\n'),
    note: 'Вид линии — через CSS: цвет, толщина, отступы.',
    course: [
      { title: 'между блоками', text: 'hr идёт между частями.' },
      { title: 'одиночный', text: 'Закрывающего нет.' },
      { title: 'стилизуй', text: 'Через CSS.' }
    ],
    related: ['br', 'p'],
    keywords: ['hr','линия','разделитель']
  },

  {
    key: 'strong',
    title: 'strong',
    cat: 'html',
    sub: 'важный текст',
    what: 'strong — выделяет текст как важный. Визуально жирный, но смысл глубже: «это важно по смыслу».',
    analogy: 'Это как красная ручка учителя: «сюда смотри».',
    code: ['<p>Прочитай <strong>обязательно</strong> это.</p>'].join('\n'),
    note: 'b — просто жирный, без смысла. strong — для важного.',
    course: [
      { title: 'оберни', text: 'Слова внутри p — в strong.' },
      { title: 'проверь', text: 'Обнови — слова жирные.' },
      { title: 'смысл', text: 'Читается с интонацией скринридером.' }
    ],
    related: ['em', 'p'],
    keywords: ['strong','жирный','важный']
  },

  {
    key: 'em',
    title: 'em',
    cat: 'html',
    sub: 'акцент на слове',
    what: 'em — смысловой акцент. Визуально курсив, но смысл: «слово с интонацией».',
    analogy: 'Это как выделить слово голосом при чтении.',
    code: ['<p>Я <em>очень</em> устал.</p>'].join('\n'),
    note: 'strong — «важно», em — «акцент». i — просто курсив без смысла.',
    course: [
      { title: 'оберни', text: 'Нужное слово — в em.' },
      { title: 'проверь', text: 'Обнови — слово курсивом.' },
      { title: 'смысл', text: 'Скринридер произносит с интонацией.' }
    ],
    related: ['strong', 'i'],
    keywords: ['em','курсив','акцент','интонация']
  },

  /* ============================================================
     HTML — ССЫЛКИ И МЕДИА
     ============================================================ */
  {
    key: 'a',
    title: 'a',
    cat: 'html',
    sub: 'ссылка',
    what: 'a — тег ссылки. Куда ведёт — в href. Может вести на другой сайт, страницу, файл или блок.',
    analogy: 'Это как дверь: куда ведёт — на табличке href.',
    code: [
      '<a href="https://google.com">Google</a>',
      '<a href="about.html">О нас</a>'
    ].join('\n'),
    note: 'Для ссылки в новой вкладке — target="_blank" и rel="noopener".',
    course: [
      { title: 'простая', text: 'a с href.' },
      { title: 'на свою', text: 'index.html и about.html.' },
      { title: 'вкладка', text: 'target="_blank".' },
      { title: 'якорь', text: 'href="#id".' }
    ],
    related: ['href', 'target'],
    keywords: ['a','ссылка','переход','линк']
  },

  {
    key: 'href',
    title: 'href',
    cat: 'html',
    sub: 'адрес ссылки',
    what: 'href — атрибут тега a. Куда ведёт ссылка.',
    analogy: 'Это как адрес на конверте.',
    code: [
      '<a href="https://google.com">Внешняя</a>',
      '<a href="about.html">Внутренняя</a>',
      '<a href="#top">Якорь</a>'
    ].join('\n'),
    note: 'Три типа: абсолютный, относительный, якорь.',
    course: [
      { title: 'абсолютный', text: 'Полный URL с https://' },
      { title: 'относительный', text: 'about.html, images/foto.jpg' },
      { title: 'якорь', text: '#section' }
    ],
    related: ['a', 'id'],
    keywords: ['href','ссылка','адрес']
  },

  {
    key: 'target',
    title: 'target',
    cat: 'html',
    sub: 'где открыть ссылку',
    what: 'target — атрибут a. Управляет, где откроется: в той же вкладке или новой.',
    analogy: 'Это как «открыть в новом окне» в браузере.',
    code: [
      '<a href="https://google.com" target="_blank" rel="noopener">В новой вкладке</a>'
    ].join('\n'),
    note: 'target="_blank" всегда с rel="noopener".',
    course: [
      { title: 'по умолчанию', text: 'Без target — в текущей вкладке.' },
      { title: '_blank', text: 'target="_blank" — в новой.' },
      { title: 'rel', text: 'Добавляй rel="noopener".' }
    ],
    related: ['a', 'href'],
    keywords: ['target','вкладка','_blank']
  },

  {
    key: 'img',
    title: 'img',
    cat: 'html',
    sub: 'изображение',
    what: 'img — одиночный тег. Вставляет картинку. Источник в src.',
    analogy: 'Это как рамка на стене: src — где взять фото, alt — что там.',
    code: ['<img src="foto.jpg" alt="Моё фото" width="400">'].join('\n'),
    note: 'alt обязателен. Показывается, если картинка не загрузилась, и читается вслух.',
    course: [
      { title: 'src', text: 'Путь к картинке.' },
      { title: 'alt', text: 'Описание: «кот спит».' },
      { title: 'размер', text: 'width и height.' }
    ],
    related: ['src', 'alt'],
    keywords: ['img','картинка','изображение','фото']
  },

  {
    key: 'src',
    title: 'src',
    cat: 'html',
    sub: 'источник файла',
    what: 'src — атрибут img, script, video, audio. Откуда брать файл.',
    analogy: 'Это как адрес склада: «товар брать отсюда».',
    code: ['<img src="foto.jpg" alt="Фото">'].join('\n'),
    note: 'Путь бывает относительный и абсолютный. Для своих файлов — относительный.',
    course: [
      { title: 'рядом', text: 'src="foto.jpg"' },
      { title: 'в подпапке', text: 'src="images/foto.jpg"' },
      { title: 'внешний', text: 'src="https://site.com/foto.jpg"' }
    ],
    related: ['img', 'link'],
    keywords: ['src','источник','файл','путь']
  },

  {
    key: 'alt',
    title: 'alt',
    cat: 'html',
    sub: 'описание картинки',
    what: 'alt — атрибут img. Показывается, если картинка не загрузилась. Читается программами для незрячих.',
    analogy: 'Это как подпись под фотографией.',
    code: ['<img src="cat.jpg" alt="Рыжий кот спит">'].join('\n'),
    note: 'alt не «картинка» и не «фото». Пиши, что именно видно.',
    course: [
      { title: 'опиши', text: 'Что на картинке.' },
      { title: 'без «картинка»', text: '«Рыжий кот спит», не «картинка кота».' },
      { title: 'пустой', text: 'Декоративная — alt="".' }
    ],
    related: ['img', 'src'],
    keywords: ['alt','описание','подпись']
  },

  {
    key: 'video',
    title: 'video',
    cat: 'html',
    sub: 'видео на странице',
    what: 'video — тег для видео. Внутри src, controls включает плеер.',
    analogy: 'Это как телевизор на стене.',
    code: ['<video src="clip.mp4" controls width="640"></video>'].join('\n'),
    note: 'Без controls видео не покажет кнопки.',
    course: [
      { title: 'src', text: 'Путь к видео.' },
      { title: 'controls', text: 'Кнопки управления.' },
      { title: 'размер', text: 'width и height.' }
    ],
    related: ['audio', 'img'],
    keywords: ['video','видео','плеер']
  },

  {
    key: 'audio',
    title: 'audio',
    cat: 'html',
    sub: 'звук на странице',
    what: 'audio — тег для звука. Как video, только для mp3.',
    analogy: 'Это как радио: звучит, но не показывается.',
    code: ['<audio src="track.mp3" controls></audio>'].join('\n'),
    note: 'Без controls не включить. Автовоспроизведение блокируется.',
    course: [
      { title: 'src', text: 'Путь к mp3.' },
      { title: 'controls', text: 'Кнопки.' },
      { title: 'loop', text: 'Для повтора.' }
    ],
    related: ['video', 'img'],
    keywords: ['audio','звук','музыка','плеер']
  },

  /* ============================================================
     HTML — СПИСКИ
     ============================================================ */
  {
    key: 'ul',
    title: 'ul',
    cat: 'html',
    sub: 'маркированный список',
    what: 'ul — список с точками. Внутри — пункты li.',
    analogy: 'Это как список покупок: порядок не важен.',
    code: [
      '<ul>',
      '  <li>Хлеб</li>',
      '  <li>Молоко</li>',
      '</ul>'
    ].join('\n'),
    note: 'Точки убираются через CSS list-style: none. Часто так делают меню.',
    course: [
      { title: 'открой ul', text: 'Начни список.' },
      { title: 'пункты', text: 'Каждый — li.' },
      { title: 'закрой', text: 'После последнего li.' }
    ],
    related: ['ol', 'li'],
    keywords: ['ul','список','точки']
  },

  {
    key: 'ol',
    title: 'ol',
    cat: 'html',
    sub: 'нумерованный список',
    what: 'ol — список с цифрами. Для шагов, где важен порядок.',
    analogy: 'Это как рецепт: шаг 1, 2, 3.',
    code: [
      '<ol>',
      '  <li>Первый шаг</li>',
      '  <li>Второй шаг</li>',
      '</ol>'
    ].join('\n'),
    note: 'Начать с другого числа: start="5".',
    course: [
      { title: 'открой ol', text: 'Цифры появятся сами.' },
      { title: 'пункты', text: 'li внутри.' },
      { title: 'начало', text: 'start="5".' }
    ],
    related: ['ul', 'li'],
    keywords: ['ol','список','цифры','порядок']
  },

  {
    key: 'li',
    title: 'li',
    cat: 'html',
    sub: 'пункт списка',
    what: 'li — отдельный пункт внутри ul или ol.',
    analogy: 'Это как один пункт в списке покупок.',
    code: [
      '<ul>',
      '  <li>Первый пункт</li>',
      '</ul>'
    ].join('\n'),
    note: 'li работает только внутри ul или ol.',
    course: [
      { title: 'внутри', text: 'li всегда в ul или ol.' },
      { title: 'содержимое', text: 'Текст, ссылка, картинка.' },
      { title: 'вложенность', text: 'Один список внутри другого.' }
    ],
    related: ['ul', 'ol'],
    keywords: ['li','пункт','элемент']
  },

  /* ============================================================
     HTML — ТАБЛИЦЫ
     ============================================================ */
  {
    key: 'table',
    title: 'table',
    cat: 'html',
    sub: 'таблица для данных',
    what: 'table — таблица. Для данных: расписание, прайс, статистика. Внутри — строки tr, в них — ячейки td.',
    analogy: 'Это как таблица в Excel.',
    code: [
      '<table>',
      '  <tr>',
      '    <td>Иван</td>',
      '    <td>20</td>',
      '  </tr>',
      '</table>'
    ].join('\n'),
    note: 'Раньше через таблицы верстали — это плохо. Сейчас только для данных.',
    course: [
      { title: 'открой', text: 'table.' },
      { title: 'строки', text: 'tr.' },
      { title: 'ячейки', text: 'td внутри tr.' },
      { title: 'шапка', text: 'th в первой строке.' }
    ],
    related: ['tr', 'td', 'th'],
    keywords: ['table','таблица','данные','excel']
  },

  {
    key: 'tr',
    title: 'tr',
    cat: 'html',
    sub: 'строка таблицы',
    what: 'tr — одна строка. Внутри — td или th.',
    analogy: 'Строчка в Excel.',
    code: [
      '<tr>',
      '  <td>Ячейка 1</td>',
      '  <td>Ячейка 2</td>',
      '</tr>'
    ].join('\n'),
    note: 'tr не может быть вне table.',
    course: [
      { title: 'внутри table', text: 'tr в table.' },
      { title: 'ячейки', text: 'td и th внутри.' },
      { title: 'одинаково', text: 'Во всех tr одно число ячеек.' }
    ],
    related: ['table', 'td'],
    keywords: ['tr','строка','таблица']
  },

  {
    key: 'td',
    title: 'td',
    cat: 'html',
    sub: 'ячейка с данными',
    what: 'td — обычная ячейка. Здесь данные.',
    analogy: 'Одна клетка в Excel.',
    code: ['<td>Иван</td>'].join('\n'),
    note: 'Для заголовков — th, не td.',
    course: [
      { title: 'внутри tr', text: 'td в tr.' },
      { title: 'содержимое', text: 'Текст, число, ссылка.' },
      { title: 'объединить', text: 'colspan, rowspan.' }
    ],
    related: ['tr', 'th'],
    keywords: ['td','ячейка','данные','клетка']
  },

  {
    key: 'th',
    title: 'th',
    cat: 'html',
    sub: 'ячейка-заголовок',
    what: 'th — ячейка-заголовок. Жирная, по центру. Первая строка таблицы.',
    analogy: 'Названия столбцов в Excel.',
    code: [
      '<tr>',
      '  <th>Имя</th>',
      '  <th>Возраст</th>',
      '</tr>'
    ].join('\n'),
    note: 'th автоматически жирный и по центру — это смысл, а не оформление.',
    course: [
      { title: 'первая строка', text: 'th — в первой строке.' },
      { title: 'остальное', text: 'В остальных — td.' },
      { title: 'проверь', text: 'Жирные и по центру.' }
    ],
    related: ['td', 'table'],
    keywords: ['th','заголовок','шапка']
  },

  /* ============================================================
     HTML — ФОРМЫ
     ============================================================ */
  {
    key: 'form',
    title: 'form',
    cat: 'html',
    sub: 'форма для ввода',
    what: 'form — контейнер для полей. Внутри собираются данные, отправляются на сервер.',
    analogy: 'Бланк в поликлинике: поля и кнопка «сдать».',
    code: [
      '<form>',
      '  <input type="text" placeholder="Имя">',
      '  <button>Отправить</button>',
      '</form>'
    ].join('\n'),
    note: 'По умолчанию перезагружает страницу. Остановить — через preventDefault() в JS.',
    course: [
      { title: 'открой', text: 'form.' },
      { title: 'поля', text: 'input, textarea, select.' },
      { title: 'кнопка', text: 'button type="submit".' }
    ],
    related: ['input', 'button'],
    keywords: ['form','форма','бланк','ввод']
  },

  {
    key: 'input',
    title: 'input',
    cat: 'html',
    sub: 'поле ввода',
    what: 'input — одиночный тег. Создаёт поле. Тип задаётся через type.',
    analogy: 'Строчка в анкете: пиши сюда.',
    code: [
      '<input type="text" placeholder="Имя">',
      '<input type="email">',
      '<input type="password">'
    ].join('\n'),
    note: 'type="email" проверит @. type="number" даст стрелки.',
    course: [
      { title: 'type', text: 'text, email, password, number.' },
      { title: 'placeholder', text: 'Подсказка внутри.' },
      { title: 'required', text: 'Обязательное поле.' }
    ],
    related: ['form', 'label'],
    keywords: ['input','поле','ввод','анкета']
  },

  {
    key: 'label',
    title: 'label',
    cat: 'html',
    sub: 'подпись к полю',
    what: 'label — подпись для поля. Связь через for и id. Клик по подписи активирует поле.',
    analogy: 'Это как ниточка между ярлыком и чемоданом.',
    code: [
      '<label for="name">Имя</label>',
      '<input type="text" id="name">'
    ].join('\n'),
    note: 'for в label = id у input.',
    course: [
      { title: 'label', text: 'Текст подписи.' },
      { title: 'свяжи', text: 'for = id.' },
      { title: 'проверь', text: 'Клик — курсор в поле.' }
    ],
    related: ['input', 'id'],
    keywords: ['label','подпись','ярлык']
  },

  {
    key: 'button',
    title: 'button',
    cat: 'html',
    sub: 'кнопка',
    what: 'button — кликабельная кнопка.',
    analogy: 'Кнопка звонка у двери.',
    code: ['<button>Нажми меня</button>'].join('\n'),
    note: 'Внутри формы по умолчанию работает как submit.',
    course: [
      { title: 'простой', text: 'button с текстом.' },
      { title: 'в форме', text: 'type="submit".' },
      { title: 'клик', text: 'В JS — addEventListener.' }
    ],
    related: ['form', 'input'],
    keywords: ['button','кнопка','клик']
  },

  {
    key: 'textarea',
    title: 'textarea',
    cat: 'html',
    sub: 'многострочное поле',
    what: 'textarea — поле для длинного текста.',
    analogy: 'Это как блокнот.',
    code: ['<textarea rows="5" placeholder="Сообщение"></textarea>'].join('\n'),
    note: 'У textarea есть закрывающий тег. Значение — между тегами.',
    course: [
      { title: 'открой', text: 'textarea и закрывающий.' },
      { title: 'размер', text: 'rows="5".' },
      { title: 'значение', text: 'Между тегами.' }
    ],
    related: ['input', 'form'],
    keywords: ['textarea','многострочный','сообщение']
  },

  {
    key: 'select',
    title: 'select',
    cat: 'html',
    sub: 'выпадающий список',
    what: 'select — список с вариантами option. Один выбор.',
    analogy: 'Меню в лифте.',
    code: [
      '<select>',
      '  <option>Москва</option>',
      '  <option>Питер</option>',
      '</select>'
    ].join('\n'),
    note: 'Предвыбранный — selected.',
    course: [
      { title: 'открой', text: 'select.' },
      { title: 'пункты', text: 'option внутри.' },
      { title: 'предвыбор', text: 'selected.' }
    ],
    related: ['option', 'form'],
    keywords: ['select','список','выпадающий']
  },

  {
    key: 'option',
    title: 'option',
    cat: 'html',
    sub: 'пункт списка select',
    what: 'option — вариант внутри select.',
    analogy: 'Этаж в меню лифта.',
    code: ['<option value="1">Москва</option>'].join('\n'),
    note: 'value — для сервера. Текст — для пользователя.',
    course: [
      { title: 'внутри select', text: 'option в select.' },
      { title: 'текст', text: 'Что видит пользователь.' },
      { title: 'value', text: 'Техническое значение.' }
    ],
    related: ['select', 'form'],
    keywords: ['option','вариант','пункт']
  },

  /* ============================================================
     HTML — СЕМАНТИКА
     ============================================================ */
  {
    key: 'div',
    title: 'div',
    cat: 'html',
    sub: 'коробка для группировки',
    what: 'div — невидимая коробка. Внутрь кладут элементы, чтобы оформить или управлять ими.',
    analogy: 'Контейнер на кухне.',
    code: [
      '<div class="card">',
      '  <h2>Заголовок</h2>',
      '  <p>Текст</p>',
      '</div>'
    ].join('\n'),
    note: 'div невидим. Если выглядит как блок — это CSS.',
    course: [
      { title: 'создай', text: 'div с закрывающим.' },
      { title: 'положи', text: 'Заголовок и параграф.' },
      { title: 'дай класс', text: 'class="card".' }
    ],
    related: ['span', 'section'],
    keywords: ['div','коробка','блок','контейнер']
  },

  {
    key: 'span',
    title: 'span',
    cat: 'html',
    sub: 'строчный контейнер',
    what: 'span — как div, но строчный. Не переносит строку.',
    analogy: 'Маркер: подчёркивает слово внутри абзаца.',
    code: ['<p>Цена: <span class="price">999 ₽</span></p>'].join('\n'),
    note: 'div — блочный, span — строчный.',
    course: [
      { title: 'внутри текста', text: 'span вставляй прямо в текст.' },
      { title: 'дай класс', text: 'class="price".' },
      { title: 'проверь', text: 'Строка не сломалась.' }
    ],
    related: ['div', 'p'],
    keywords: ['span','строчный','текст','маркер']
  },

  {
    key: 'header',
    title: 'header',
    cat: 'html',
    sub: 'шапка сайта',
    what: 'header — шапка. Логотип, меню, кнопки.',
    analogy: 'Шапка сайта в прямом смысле.',
    code: [
      '<header>',
      '  <h1>Мой сайт</h1>',
      '  <nav>...</nav>',
      '</header>'
    ].join('\n'),
    note: 'header даёт смысл, не заменяет div.',
    course: [
      { title: 'оберни', text: 'Верхнюю часть в header.' },
      { title: 'внутрь', text: 'Логотип, заголовок, меню.' },
      { title: 'стилизуй', text: 'Фон, отступы, sticky.' }
    ],
    related: ['nav', 'footer'],
    keywords: ['header','шапка','верх']
  },

  {
    key: 'nav',
    title: 'nav',
    cat: 'html',
    sub: 'навигация',
    what: 'nav — блок ссылок для навигации.',
    analogy: 'Указатели на перекрёстке.',
    code: [
      '<nav>',
      '  <a href="/">Главная</a>',
      '  <a href="/about">О нас</a>',
      '</nav>'
    ].join('\n'),
    note: 'nav только для основной навигации. Ссылки в тексте — просто a.',
    course: [
      { title: 'оберни', text: 'Меню в nav.' },
      { title: 'ссылки', text: 'a внутри.' },
      { title: 'семантика', text: 'Помогает программам чтения.' }
    ],
    related: ['a', 'header'],
    keywords: ['nav','навигация','меню']
  },

  {
    key: 'main',
    title: 'main',
    cat: 'html',
    sub: 'основное содержимое',
    what: 'main — главное содержимое. Один на страницу.',
    analogy: 'Главное блюдо на тарелке.',
    code: [
      '<main>',
      '  <h1>Статья</h1>',
      '  <p>Текст...</p>',
      '</main>'
    ].join('\n'),
    note: 'Один main. Не включает header и footer.',
    course: [
      { title: 'оберни', text: 'Главный контент в main.' },
      { title: 'один', text: 'Только один main.' },
      { title: 'внутри', text: 'section, article, aside.' }
    ],
    related: ['section', 'article'],
    keywords: ['main','основное','контент']
  },

  {
    key: 'section',
    title: 'section',
    cat: 'html',
    sub: 'смысловой раздел',
    what: 'section — раздел с темой. Обычно с заголовком.',
    analogy: 'Глава в книге.',
    code: [
      '<section>',
      '  <h2>О нас</h2>',
      '  <p>Мы делаем сайты.</p>',
      '</section>'
    ].join('\n'),
    note: 'section отличается от div смыслом. Если нет темы — это div.',
    course: [
      { title: 'оберни', text: 'Логический блок в section.' },
      { title: 'заголовок', text: 'h2 в начале.' },
      { title: 'много', text: 'Может быть много.' }
    ],
    related: ['article', 'div'],
    keywords: ['section','раздел','блок','глава']
  },

  {
    key: 'article',
    title: 'article',
    cat: 'html',
    sub: 'самостоятельная единица',
    what: 'article — самостоятельная единица: пост, статья, товар.',
    analogy: 'Отдельная статья в газете.',
    code: [
      '<article>',
      '  <h2>Заголовок статьи</h2>',
      '  <p>Текст...</p>',
      '</article>'
    ].join('\n'),
    note: 'article — для постов. section — для разделов.',
    course: [
      { title: 'оберни', text: 'Пост или товар в article.' },
      { title: 'заголовок', text: 'h2 или h3.' },
      { title: 'отличие', text: 'Можно вырезать и смысл сохранится.' }
    ],
    related: ['section', 'aside'],
    keywords: ['article','статья','пост','товар']
  },

  {
    key: 'aside',
    title: 'aside',
    cat: 'html',
    sub: 'боковой блок',
    what: 'aside — блок сбоку от основного. Реклама, ссылки, цитаты.',
    analogy: 'Сноска на полях книги.',
    code: [
      '<aside>',
      '  <p>Реклама</p>',
      '</aside>'
    ].join('\n'),
    note: 'aside обычно рядом с main.',
    course: [
      { title: 'оберни', text: 'Боковой блок в aside.' },
      { title: 'внутрь', text: 'Реклама, ссылки.' },
      { title: 'стилизуй', text: 'Колонкой сбоку.' }
    ],
    related: ['main', 'section'],
    keywords: ['aside','сбоку','реклама']
  },

  {
    key: 'footer',
    title: 'footer',
    cat: 'html',
    sub: 'подвал сайта',
    what: 'footer — нижняя часть. Копирайт, контакты, ссылки.',
    analogy: 'Титры в конце фильма.',
    code: [
      '<footer>',
      '  <p>© 2026 Мой сайт</p>',
      '</footer>'
    ].join('\n'),
    note: 'footer бывает у страницы или у статьи.',
    course: [
      { title: 'оберни', text: 'Нижнюю часть в footer.' },
      { title: 'внутрь', text: 'Копирайт, ссылки.' },
      { title: 'стилизуй', text: 'Тёмный фон.' }
    ],
    related: ['header', 'main'],
    keywords: ['footer','подвал','низ']
  },

  /* ============================================================
     HTML — ОБЩИЕ ТЕРМИНЫ
     ============================================================ */
  {
    key: 'тег',
    title: 'тег',
    cat: 'html',
    sub: 'команда в угловых скобках',
    what: 'Тег — команда браузеру. Что за элемент перед ним.',
    analogy: 'Знаки дорожного движения.',
    code: ['<p>Параграф</p>'].join('\n'),
    note: 'У большинства есть открывающая и закрывающая часть.',
    course: [
      { title: 'открывающий', text: 'Имя в скобках.' },
      { title: 'содержимое', text: 'Внутри — текст или теги.' },
      { title: 'закрывающий', text: 'Слэш и имя.' }
    ],
    related: ['html', 'атрибут'],
    keywords: ['тег','команда','скобки']
  },

  {
    key: 'атрибут',
    title: 'атрибут',
    cat: 'html',
    sub: 'настройка тега',
    what: 'Атрибут уточняет поведение тега. Имя="значение".',
    analogy: 'Опции при заказе пиццы.',
    code: ['<a href="https://site.com" target="_blank">Ссылка</a>'].join('\n'),
    note: 'Порядок не важен. Кавычки обязательны.',
    course: [
      { title: 'имя', text: 'href, src, class.' },
      { title: 'значение', text: 'В кавычках.' },
      { title: 'несколько', text: 'Через пробел.' }
    ],
    related: ['тег', 'html'],
    keywords: ['атрибут','свойство','class','id']
  },

  {
    key: 'class',
    title: 'class',
    cat: 'html',
    sub: 'метка для группы элементов',
    what: 'class — метка элемента. По ней оформляют через CSS или находят через JS.',
    analogy: 'Бейджик на одежде.',
    code: [
      '<p class="intro">Первый</p>',
      '<p class="intro">Второй</p>'
    ].join('\n'),
    note: 'Один класс — на много элементов. Несколько классов через пробел.',
    course: [
      { title: 'дай', text: 'class="intro".' },
      { title: 'в CSS', text: '.intro { ... }' },
      { title: 'в JS', text: 'querySelector(".intro").' }
    ],
    related: ['id', 'селектор'],
    keywords: ['class','класс','метка']
  },

  {
    key: 'id',
    title: 'id',
    cat: 'html',
    sub: 'уникальный идентификатор',
    what: 'id — уникальный идентификатор. Один на страницу.',
    analogy: 'Номер паспорта.',
    code: [
      '<div id="header">Шапка</div>',
      '<a href="#header">К шапке</a>'
    ].join('\n'),
    note: 'Уникален. Для групп — class.',
    course: [
      { title: 'дай', text: 'id="header".' },
      { title: 'в CSS', text: '#header.' },
      { title: 'якорь', text: 'href="#header".' }
    ],
    related: ['class', 'href'],
    keywords: ['id','идентификатор','уникальный']
  },

  {
    key: 'комментарий',
    title: 'комментарий',
    cat: 'html',
    sub: 'текст, невидимый на странице',
    what: 'Комментарий — заметка в коде, не видна пользователю.',
    analogy: 'Стикер на полях.',
    code: ['<!-- Заметка -->'].join('\n'),
    note: 'Видна в исходном коде. Не пиши туда секреты.',
    course: [
      { title: 'открой', text: 'Четыре символа в начале.' },
      { title: 'текст', text: 'Заметка внутри.' },
      { title: 'закрой', text: 'Три дефиса и скобка.' }
    ],
    related: ['html', 'тег'],
    keywords: ['комментарий','заметка']
  },

  {
    key: 'DOCTYPE',
    title: 'DOCTYPE',
    cat: 'html',
    sub: 'тип документа',
    what: 'DOCTYPE — первая строка HTML-файла. Говорит браузеру: это современный HTML.',
    analogy: 'Паспорт при въезде в страну.',
    code: ['<!DOCTYPE html>'].join('\n'),
    note: 'Пишут только коротко: DOCTYPE html.',
    course: [
      { title: 'первая строка', text: 'Всегда первая.' },
      { title: 'до html', text: 'До html.' },
      { title: 'забудь', text: 'Написал один раз — всё.' }
    ],
    related: ['html', 'head'],
    keywords: ['doctype','тип','документ']
  },

  /* ============================================================
     CSS — ОСНОВЫ
     ============================================================ */
  {
    key: 'css',
    title: 'css',
    cat: 'css',
    sub: 'язык стилей — внешность',
    what: 'CSS описывает, как выглядит HTML. Цвета, шрифты, отступы, размеры, тени.',
    analogy: 'HTML — человек в трусах. CSS — его одежда.',
    code: [
      'p {',
      '  color: #333;',
      '  font-size: 16px;',
      '}'
    ].join('\n'),
    note: 'Правило = селектор + фигурные скобки + свойства. Точка с запятой обязательна.',
    course: [
      { title: 'подключи', text: 'style.css и link в head.' },
      { title: 'правило', text: 'body { background: #f0f0f0; }.' },
      { title: 'по классу', text: '.intro { color: red; }.' },
      { title: 'hover', text: 'a:hover { color: orange; }.' }
    ],
    related: ['селектор', 'flex'],
    keywords: ['css','стили','оформление','цвет']
  },

  {
    key: 'селектор',
    title: 'селектор',
    cat: 'css',
    sub: 'кого оформляем',
    what: 'Селектор — первая часть CSS-правила. К каким элементам применить.',
    analogy: 'В классе: «все девочки», «Петя», «отличники».',
    code: [
      'p { }              /* все параграфы */',
      '.card { }          /* класс */',
      '#header { }        /* id */',
      'a:hover { }        /* при наведении */'
    ].join('\n'),
    note: 'Приоритет: id > класс > тег.',
    course: [
      { title: 'по тегу', text: 'p { color: gray; }.' },
      { title: 'по классу', text: '.intro { color: red; }.' },
      { title: 'по id', text: '#header { }.' }
    ],
    related: ['css', 'class'],
    keywords: ['селектор','класс','id','тег']
  },

  {
    key: 'flex',
    title: 'flex',
    cat: 'css',
    sub: 'ряд или колонка',
    what: 'Flex — элементы в один ряд. Ставится родителю, дети выстраиваются.',
    analogy: 'Пассажиры на скамейке.',
    code: [
      '.menu {',
      '  display: flex;',
      '  gap: 16px;',
      '  justify-content: center;',
      '}'
    ].join('\n'),
    note: 'display: flex — родителю. Прямые дети встают в ряд.',
    course: [
      { title: 'контейнер', text: 'display: flex.' },
      { title: 'выровняй', text: 'justify-content: center.' },
      { title: 'отступы', text: 'gap: 16px.' }
    ],
    related: ['css', 'justify-content'],
    keywords: ['flex','флекс','ряд','колонка']
  },

  {
    key: 'justify-content',
    title: 'justify-content',
    cat: 'css',
    sub: 'выравнивание по главной оси',
    what: 'justify-content — распределение по горизонтали (если flex-row).',
    analogy: 'Как расселись на скамейке.',
    code: [
      'justify-content: flex-start;',
      'justify-content: center;',
      'justify-content: space-between;'
    ].join('\n'),
    note: 'space-between — крайние по краям, остальные поровну. Частый паттерн.',
    course: [
      { title: 'влево', text: 'flex-start.' },
      { title: 'центр', text: 'center.' },
      { title: 'по краям', text: 'space-between.' }
    ],
    related: ['flex', 'align-items'],
    keywords: ['justify-content','выравнивание','горизонталь']
  },

  {
    key: 'align-items',
    title: 'align-items',
    cat: 'css',
    sub: 'выравнивание по поперечной оси',
    what: 'align-items — по вертикали (если flex-row).',
    analogy: 'Как выровнялись по росту.',
    code: [
      'align-items: flex-start;',
      'align-items: center;',
      'align-items: stretch;'
    ].join('\n'),
    note: 'center вместе с justify-content: center — идеальное центрирование.',
    course: [
      { title: 'по верху', text: 'flex-start.' },
      { title: 'центр', text: 'center.' },
      { title: 'растянуть', text: 'stretch.' }
    ],
    related: ['flex', 'justify-content'],
    keywords: ['align-items','вертикаль','выравнивание']
  },

  {
    key: 'gap',
    title: 'gap',
    cat: 'css',
    sub: 'расстояние между элементами',
    what: 'gap — отступ между детьми flex или grid.',
    analogy: 'Промежутки между стульями в ряду.',
    code: [
      '.menu {',
      '  display: flex;',
      '  gap: 20px;',
      '}'
    ].join('\n'),
    note: 'Заменяет margin между детьми. Работает только с flex и grid.',
    course: [
      { title: 'флекс', text: 'gap: 20px — везде между детьми.' },
      { title: 'разный', text: 'gap: 10px 20px — по вертикали и горизонтали.' },
      { title: 'grid', text: 'В grid тоже работает.' }
    ],
    related: ['flex', 'grid'],
    keywords: ['gap','отступ','расстояние']
  },

  {
    key: 'grid',
    title: 'grid',
    cat: 'css',
    sub: 'сетка из строк и колонок',
    what: 'grid — раскладывает элементы по строкам и столбцам. Мощнее flex.',
    analogy: 'Тетрадь в клетку.',
    code: [
      '.grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(3, 1fr);',
      '  gap: 20px;',
      '}'
    ].join('\n'),
    note: '1fr — одна доля. repeat(3, 1fr) — 3 равные колонки.',
    course: [
      { title: 'включи', text: 'display: grid.' },
      { title: 'колонки', text: 'grid-template-columns: 1fr 1fr.' },
      { title: 'отступы', text: 'gap: 20px.' }
    ],
    related: ['flex', 'grid-template-columns'],
    keywords: ['grid','сетка','колонки','строки']
  },

  {
    key: 'grid-template-columns',
    title: 'grid-template-columns',
    cat: 'css',
    sub: 'какие колонки в grid',
    what: 'grid-template-columns — сколько и какие колонки в сетке.',
    analogy: 'Сколько столбцов в тетради.',
    code: [
      'grid-template-columns: 200px 1fr;',
      'grid-template-columns: repeat(3, 1fr);',
      'grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));'
    ].join('\n'),
    note: 'Последний вариант — адаптив без media-запросов. Очень полезно.',
    course: [
      { title: 'два столбца', text: '200px 1fr — фиксированный + резиновый.' },
      { title: 'три равных', text: 'repeat(3, 1fr).' },
      { title: 'адаптив', text: 'repeat(auto-fill, minmax(250px, 1fr)).' }
    ],
    related: ['grid', 'gap'],
    keywords: ['grid-template-columns','колонки','сетка']
  },

  {
    key: 'position',
    title: 'position',
    cat: 'css',
    sub: 'положение элемента',
    what: 'position — как элемент расположен: обычно, относительно, по родителю, по окну, sticky.',
    analogy: 'relative — отойти в сторону. absolute — выпрыгнуть. fixed — приклеиться. sticky — прилипнуть.',
    code: [
      '.box { position: relative; }',
      '.box { position: absolute; }',
      '.box { position: fixed; }',
      '.box { position: sticky; }'
    ].join('\n'),
    note: 'absolute ищет родителя с position: relative.',
    course: [
      { title: 'relative', text: 'Сдвинуть, место оставить.' },
      { title: 'absolute', text: 'По родителю relative.' },
      { title: 'sticky', text: 'Прилипает при скролле.' }
    ],
    related: ['relative', 'absolute', 'fixed', 'sticky'],
    keywords: ['position','позиция','позиционирование']
  },

  {
    key: 'relative',
    title: 'relative',
    cat: 'css',
    sub: 'сдвинуть, не теряя место',
    what: 'position: relative — элемент остаётся в потоке, но можно сдвинуть через top/right/bottom/left.',
    analogy: 'Отойти на шаг, но место в очереди оставить.',
    code: [
      '.box {',
      '  position: relative;',
      '  top: 20px;',
      '  left: 10px;',
      '}'
    ].join('\n'),
    note: 'Часто используется как родитель для absolute-детей.',
    course: [
      { title: 'поставь', text: 'position: relative.' },
      { title: 'сдвинь', text: 'top: 20px.' },
      { title: 'родитель', text: 'Для absolute внутри.' }
    ],
    related: ['position', 'absolute'],
    keywords: ['relative','относительный','сдвиг']
  },

  {
    key: 'absolute',
    title: 'absolute',
    cat: 'css',
    sub: 'вырвать из потока',
    what: 'position: absolute — элемент позиционируется относительно ближайшего родителя с position: relative.',
    analogy: 'Выпрыгнуть из очереди и встать где скажешь.',
    code: [
      '.parent { position: relative; }',
      '.child {',
      '  position: absolute;',
      '  top: 10px;',
      '  right: 10px;',
      '}'
    ].join('\n'),
    note: 'Если родителя с relative нет — позиционируется по всей странице.',
    course: [
      { title: 'родителю relative', text: 'Чтобы был якорь.' },
      { title: 'ребёнку absolute', text: 'Вырвать из потока.' },
      { title: 'координаты', text: 'top, right, bottom, left.' }
    ],
    related: ['position', 'relative'],
    keywords: ['absolute','абсолютный','поверх']
  },

  {
    key: 'fixed',
    title: 'fixed',
    cat: 'css',
    sub: 'приклеен к окну',
    what: 'position: fixed — элемент прилипает к окну браузера, не двигается при прокрутке.',
    analogy: 'Приклеиться к окну.',
    code: [
      '.btn {',
      '  position: fixed;',
      '  bottom: 20px;',
      '  right: 20px;',
      '}'
    ].join('\n'),
    note: 'Классика — кнопка «наверх» в углу.',
    course: [
      { title: 'fixed', text: 'position: fixed.' },
      { title: 'координаты', text: 'bottom и right.' },
      { title: 'z-index', text: 'Чтобы был поверх.' }
    ],
    related: ['position', 'sticky'],
    keywords: ['fixed','фиксированный','приклеен']
  },

  {
    key: 'sticky',
    title: 'sticky',
    cat: 'css',
    sub: 'прилипание при скролле',
    what: 'position: sticky — элемент сначала обычный, а при прокрутке прилипает к краю.',
    analogy: 'Магнит на холодильнике: страница едет — магнит остаётся.',
    code: [
      'header {',
      '  position: sticky;',
      '  top: 0;',
      '  z-index: 100;',
      '  background: white;',
      '}'
    ].join('\n'),
    note: 'background обязателен, иначе контент просвечивает.',
    course: [
      { title: 'sticky', text: 'position: sticky.' },
      { title: 'top', text: 'top: 0 — прилипает к верху.' },
      { title: 'фон', text: 'background: white.' }
    ],
    related: ['position', 'fixed'],
    keywords: ['sticky','прилипание','шапка']
  },

  {
    key: 'z-index',
    title: 'z-index',
    cat: 'css',
    sub: 'порядок слоёв',
    what: 'z-index — кто выше в стопке. Больше — поверх.',
    analogy: 'Стопка бумаг: верхняя побеждает.',
    code: [
      '.modal {',
      '  position: fixed;',
      '  z-index: 1000;',
      '}'
    ].join('\n'),
    note: 'Работает только у позиционированных (не static).',
    course: [
      { title: 'поставь', text: 'z-index: 100.' },
      { title: 'позиция', text: 'Только с position.' },
      { title: 'больше = выше', text: '1000 поверх 100.' }
    ],
    related: ['position', 'fixed'],
    keywords: ['z-index','слои','поверх']
  },

  {
    key: 'margin',
    title: 'margin',
    cat: 'css',
    sub: 'внешний отступ',
    what: 'margin — расстояние от элемента до других.',
    analogy: 'Расстояние между коробками.',
    code: [
      '.card {',
      '  margin: 20px;',
      '  margin-bottom: 10px;',
      '  margin: 0 auto;',
      '}'
    ].join('\n'),
    note: 'margin: 0 auto центрирует блочный элемент по горизонтали.',
    course: [
      { title: 'все стороны', text: 'margin: 20px.' },
      { title: 'одна', text: 'margin-bottom: 10px.' },
      { title: 'центр', text: 'margin: 0 auto.' }
    ],
    related: ['padding', 'box-sizing'],
    keywords: ['margin','отступ','внешний']
  },

  {
    key: 'padding',
    title: 'padding',
    cat: 'css',
    sub: 'внутренний отступ',
    what: 'padding — отступ от содержимого до рамки.',
    analogy: 'Вата внутри коробки.',
    code: [
      '.card {',
      '  padding: 24px;',
      '  padding: 10px 20px;',
      '}'
    ].join('\n'),
    note: 'padding: 10px 20px — 10 сверху-снизу, 20 слева-справа.',
    course: [
      { title: 'все', text: 'padding: 24px.' },
      { title: 'оси', text: 'padding: 10px 20px.' },
      { title: 'одна', text: 'padding-top: 10px.' }
    ],
    related: ['margin', 'border'],
    keywords: ['padding','отступ','внутренний']
  },

  {
    key: 'border',
    title: 'border',
    cat: 'css',
    sub: 'рамка',
    what: 'border — рамка вокруг элемента. Толщина, стиль, цвет.',
    analogy: 'Рамка вокруг картины.',
    code: [
      '.card {',
      '  border: 1px solid #ddd;',
      '  border-top: 3px solid red;',
      '  border-radius: 12px;',
      '}'
    ].join('\n'),
    note: 'border: 1px solid #ddd — 1px, сплошная, серая. Частая запись.',
    course: [
      { title: 'рамка', text: 'border: 1px solid #ddd.' },
      { title: 'одна сторона', text: 'border-top.' },
      { title: 'скругление', text: 'border-radius: 12px.' }
    ],
    related: ['padding', 'border-radius'],
    keywords: ['border','рамка','граница']
  },

  {
    key: 'border-radius',
    title: 'border-radius',
    cat: 'css',
    sub: 'скругление углов',
    what: 'border-radius — скруглённые углы.',
    analogy: 'Мягкие углы у коробки.',
    code: [
      '.card { border-radius: 12px; }',
      '.circle { border-radius: 50%; }'
    ].join('\n'),
    note: '50% на квадрате — круг.',
    course: [
      { title: 'число', text: 'border-radius: 12px.' },
      { title: 'круг', text: 'border-radius: 50%.' },
      { title: 'угол', text: 'border-top-left-radius.' }
    ],
    related: ['border'],
    keywords: ['border-radius','скругление','углы']
  },

  {
    key: 'color',
    title: 'color',
    cat: 'css',
    sub: 'цвет текста',
    what: 'color — цвет текста.',
    analogy: 'Какой ручкой пишешь.',
    code: [
      'p { color: #333; }',
      'p { color: red; }',
      'p { color: rgb(51,51,51); }'
    ].join('\n'),
    note: 'HEX — самый популярный: #000000 чёрный, #ffffff белый.',
    course: [
      { title: 'по имени', text: 'red, blue, black.' },
      { title: 'HEX', text: '#333.' },
      { title: 'RGB', text: 'rgb(51, 51, 51).' }
    ],
    related: ['background', 'font-size'],
    keywords: ['color','цвет','текст']
  },

  {
    key: 'background',
    title: 'background',
    cat: 'css',
    sub: 'фон элемента',
    what: 'background — фон элемента: цвет, картинка, градиент.',
    analogy: 'Обои на стене.',
    code: [
      '.card { background: #f0f0f0; }',
      '.hero { background: linear-gradient(135deg, #667eea, #764ba2); }'
    ].join('\n'),
    note: 'Для цвета — background-color. Для картинки — background-image.',
    course: [
      { title: 'цвет', text: 'background: #f0f0f0.' },
      { title: 'градиент', text: 'linear-gradient(...).' },
      { title: 'картинка', text: 'background-image: url(...).' }
    ],
    related: ['color', 'border'],
    keywords: ['background','фон','градиент']
  },

  {
    key: 'font-size',
    title: 'font-size',
    cat: 'css',
    sub: 'размер шрифта',
    what: 'font-size — размер шрифта в px, em или rem.',
    analogy: 'Кегль в типографии.',
    code: [
      'p { font-size: 16px; }',
      'h1 { font-size: 2rem; }'
    ].join('\n'),
    note: 'rem — от размера шрифта корня. Часто удобнее, чем px.',
    course: [
      { title: 'px', text: 'font-size: 16px.' },
      { title: 'rem', text: 'font-size: 1.5rem.' },
      { title: 'базовый', text: 'body { font-size: 16px; }.' }
    ],
    related: ['font-family', 'font-weight'],
    keywords: ['font-size','размер','шрифт']
  },

  {
    key: 'font-family',
    title: 'font-family',
    cat: 'css',
    sub: 'какой шрифт',
    what: 'font-family — каким шрифтом писать.',
    analogy: 'Почерк.',
    code: [
      'body { font-family: Arial, sans-serif; }',
      'code { font-family: "JetBrains Mono", monospace; }'
    ].join('\n'),
    note: 'Всегда указывай запасной через запятую: Arial, sans-serif.',
    course: [
      { title: 'выбери', text: 'Arial, Georgia, Times.' },
      { title: 'запасной', text: 'sans-serif, serif, monospace.' },
      { title: 'своё', text: 'Через Google Fonts + link.' }
    ],
    related: ['font-size', 'font-weight'],
    keywords: ['font-family','шрифт','гарнитура']
  },

  {
    key: 'font-weight',
    title: 'font-weight',
    cat: 'css',
    sub: 'жирность шрифта',
    what: 'font-weight — толщина букв: от 100 (тонкие) до 900 (очень жирные).',
    analogy: 'Толщина ручки.',
    code: [
      'p { font-weight: 400; }',
      'strong { font-weight: 700; }'
    ].join('\n'),
    note: '400 — обычный. 700 — жирный. bold = 700, normal = 400.',
    course: [
      { title: 'обычный', text: 'font-weight: 400.' },
      { title: 'жирный', text: 'font-weight: 700.' },
      { title: 'по имени', text: 'normal или bold.' }
    ],
    related: ['font-size', 'font-family'],
    keywords: ['font-weight','жирность','толщина']
  },

  {
    key: 'text-align',
    title: 'text-align',
    cat: 'css',
    sub: 'выравнивание текста',
    what: 'text-align — как текст расположен внутри блока.',
    analogy: 'Как текст на странице книги.',
    code: [
      '.title { text-align: center; }',
      '.desc { text-align: left; }'
    ].join('\n'),
    note: 'center — по центру, left — по левому, right — по правому, justify — по ширине.',
    course: [
      { title: 'по центру', text: 'text-align: center.' },
      { title: 'влево', text: 'text-align: left.' },
      { title: 'по ширине', text: 'text-align: justify.' }
    ],
    related: ['color', 'font-size'],
    keywords: ['text-align','выравнивание','текст']
  },

  {
    key: 'display',
    title: 'display',
    cat: 'css',
    sub: 'как элемент отображается',
    what: 'display — как ведёт себя элемент: блочно, строчно, flex, grid, none.',
    analogy: 'Вид тары: коробка, пакет, контейнер.',
    code: [
      '.a { display: block; }',
      '.b { display: inline; }',
      '.c { display: flex; }',
      '.d { display: none; }'
    ].join('\n'),
    note: 'display: none полностью убирает элемент.',
    course: [
      { title: 'block', text: 'На всю ширину.' },
      { title: 'inline', text: 'В строке.' },
      { title: 'flex / grid', text: 'Для layout.' },
      { title: 'none', text: 'Спрятать.' }
    ],
    related: ['flex', 'grid'],
    keywords: ['display','отображение','блок']
  },

  {
    key: 'transition',
    title: 'transition',
    cat: 'css',
    sub: 'плавное изменение',
    what: 'transition — плавный переход между состояниями.',
    analogy: 'Плавный свет, а не щелчок.',
    code: [
      '.btn {',
      '  transition: background .3s ease;',
      '}',
      '.btn:hover {',
      '  background: blue;',
      '}'
    ].join('\n'),
    note: 'transition на базовое состояние, не на hover. Иначе резкий возврат.',
    course: [
      { title: 'свойство', text: 'transition: background .3s.' },
      { title: 'несколько', text: 'transition: background .3s, color .2s.' },
      { title: 'всё', text: 'transition: all .3s ease.' }
    ],
    related: ['hover', 'transform'],
    keywords: ['transition','плавно','переход']
  },

  {
    key: 'transform',
    title: 'transform',
    cat: 'css',
    sub: 'преобразование элемента',
    what: 'transform — сдвинуть, повернуть, масштабировать.',
    analogy: 'Превращение фигуры.',
    code: [
      '.box { transform: translateY(-4px); }',
      '.box { transform: scale(1.1); }',
      '.box { transform: rotate(45deg); }'
    ].join('\n'),
    note: 'transform не влияет на соседей — элемент «отрывается».',
    course: [
      { title: 'сдвиг', text: 'translateY(-4px).' },
      { title: 'масштаб', text: 'scale(1.1).' },
      { title: 'поворот', text: 'rotate(45deg).' }
    ],
    related: ['transition', 'hover'],
    keywords: ['transform','преобразование','сдвиг','поворот']
  },

  {
    key: 'hover',
    title: 'hover',
    cat: 'css',
    sub: 'при наведении курсора',
    what: ':hover — псевдокласс. Срабатывает при наведении.',
    analogy: 'Что происходит, когда трогаешь.',
    code: [
      'a:hover { color: orange; }',
      '.btn:hover { background: blue; }'
    ].join('\n'),
    note: 'Работает только с устройствами с мышью.',
    course: [
      { title: 'селектор', text: 'a:hover.' },
      { title: 'изменение', text: 'color, background, transform.' },
      { title: 'плавно', text: 'С transition.' }
    ],
    related: ['transition', 'transform'],
    keywords: ['hover','наведение','псевдокласс']
  },

  {
    key: '@media',
    title: '@media',
    cat: 'css',
    sub: 'медиа-запросы',
    what: '@media — стили только при определённой ширине экрана.',
    analogy: 'Если телефон — делай так, если компьютер — иначе.',
    code: [
      '@media (max-width: 768px) {',
      '  .menu { flex-direction: column; }',
      '}'
    ].join('\n'),
    note: 'Не забудь meta viewport в head.',
    course: [
      { title: 'max-width', text: 'Для маленьких экранов.' },
      { title: 'min-width', text: 'Для больших.' },
      { title: 'внутри', text: 'Обычные CSS-правила.' }
    ],
    related: ['display', 'flex'],
    keywords: ['media','медиа','адаптив','мобильный']
  },

  {
    key: 'box-sizing',
    title: 'box-sizing',
    cat: 'css',
    sub: 'как считать размеры',
    what: 'box-sizing: border-box — ширина включает padding и border.',
    analogy: 'Коробка 30 см = вся коробка, а не только дно.',
    code: [
      '* { box-sizing: border-box; }'
    ].join('\n'),
    note: 'Всегда ставь это правило первым в CSS.',
    course: [
      { title: 'звёздочка', text: '* — все элементы.' },
      { title: 'правило', text: 'box-sizing: border-box.' },
      { title: 'в начале', text: 'Первое правило в CSS.' }
    ],
    related: ['padding', 'border'],
    keywords: ['box-sizing','размеры','border-box']
  },

  {
    key: 'overflow',
    title: 'overflow',
    cat: 'css',
    sub: 'что делать с содержимым, не влезающим',
    what: 'overflow — что происходит, если содержимое больше контейнера.',
    analogy: 'Переполнение стакана.',
    code: [
      '.box { overflow: hidden; }',
      '.box { overflow: auto; }'
    ].join('\n'),
    note: 'hidden — обрезать. auto — скролл, если нужно. scroll — всегда скролл.',
    course: [
      { title: 'обрезать', text: 'overflow: hidden.' },
      { title: 'скролл', text: 'overflow: auto.' },
      { title: 'X или Y', text: 'overflow-x, overflow-y.' }
    ],
    related: ['width', 'height'],
    keywords: ['overflow','переполнение','скролл']
  }

];



/* ==========================================================
   2b. ДОПОЛНИТЕЛЬНЫЕ ТЕМЫ (JS / Git / CLI / общие)
   Склеиваются с основным массивом KB ниже.
   ========================================================== */
var KB_EXTRA = [

  /* ============================================================
     JS — ОСНОВЫ
     ============================================================ */
  {
    key: 'js',
    title: 'javascript',
    cat: 'js',
    sub: 'мозги сайта',
    what: 'JavaScript делает сайт живым. Реагирует на клики, меняет текст без перезагрузки, отправляет данные на сервер.',
    analogy: 'HTML — корпус машины, CSS — покраска, JavaScript — двигатель.',
    code: [
      'let name = "Иван";',
      'console.log(name);'
    ].join('\n'),
    note: 'Открывай консоль браузера клавишей F12 — там видно ошибки и вывод.',
    course: [
      { title: 'подключи', text: 'script.js и script с src в конце body.' },
      { title: 'выведи', text: 'console.log("Привет").' },
      { title: 'переменная', text: 'let name = "Иван".' },
      { title: 'событие', text: 'addEventListener("click", ...).' }
    ],
    related: ['let', 'console.log'],
    keywords: ['js','javascript','скрипт','логика','мозги']
  },

  {
    key: 'let',
    title: 'let',
    cat: 'js',
    sub: 'переменная, которую можно менять',
    what: 'let — создать переменную. Значение можно переприсвоить. Используй по умолчанию.',
    analogy: 'Это как доска с мелом: написал, потом стёр, написал другое.',
    code: [
      'let age = 20;',
      'age = 21; // можно',
      'console.log(age); // 21'
    ].join('\n'),
    note: 'По умолчанию всегда let. const — только когда значение точно не поменяется.',
    course: [
      { title: 'создай', text: 'let age = 20;' },
      { title: 'поменяй', text: 'age = 21;' },
      { title: 'проверь', text: 'console.log(age).' }
    ],
    related: ['const', 'var'],
    keywords: ['let','переменная','изменяемая']
  },

  {
    key: 'const',
    title: 'const',
    cat: 'js',
    sub: 'переменная, которую нельзя менять',
    what: 'const — создать константу. Значение нельзя переприсвоить. Используй для того, что точно не поменяется.',
    analogy: 'Это как высечено в камне — что написано, то и останется.',
    code: [
      'const PI = 3.14;',
      '// PI = 3; // ошибка',
      'console.log(PI); // 3.14'
    ].join('\n'),
    note: 'const не значит «значение неизменяемо», а значит «нельзя переприсвоить переменную». Внутри объекта поля можно менять.',
    course: [
      { title: 'создай', text: 'const PI = 3.14;' },
      { title: 'попробуй поменять', text: 'PI = 3; — будет ошибка.' },
      { title: 'используй', text: 'Для того, что не меняется.' }
    ],
    related: ['let', 'var'],
    keywords: ['const','константа','неизменяемая']
  },

  {
    key: 'var',
    title: 'var',
    cat: 'js',
    sub: 'старая переменная (не используй)',
    what: 'var — устаревший способ создания переменной. Работает, но ведёт себя странно. Не используй в новом коде.',
    analogy: 'Это как старый мобильник: работает, но у всех давно смартфоны.',
    code: [
      'var old = "не используй";',
      'let modern = "вот так правильно";'
    ].join('\n'),
    note: 'var виден за пределами блока, где объявлен, — это ломает логику. let и const так не делают.',
    course: [
      { title: 'знай', text: 'var существует, ты его увидишь в старом коде.' },
      { title: 'не пиши', text: 'В новом коде всегда let или const.' },
      { title: 'замени', text: 'var → let, если значение меняется.' }
    ],
    related: ['let', 'const'],
    keywords: ['var','устаревшее','старое']
  },

  {
    key: 'console.log',
    title: 'console.log',
    cat: 'js',
    sub: 'вывести что-то в консоль',
    what: 'console.log — команда, которая выводит значение в консоль браузера. Главный инструмент отладки.',
    analogy: 'Это как сказать вслух: «смотри, что тут у меня».',
    code: [
      'console.log("Привет");',
      'console.log(2 + 3); // 5',
      'console.log([1,2,3]);'
    ].join('\n'),
    note: 'Открывай консоль через F12 → вкладка Console. Держи её открытой, когда пишешь JS.',
    course: [
      { title: 'открой F12', text: 'Вкладка Console.' },
      { title: 'выведи строку', text: 'console.log("Привет").' },
      { title: 'выведи число', text: 'console.log(2 + 3).' },
      { title: 'выведи массив', text: 'console.log([1,2,3]).' }
    ],
    related: ['js', 'let'],
    keywords: ['console.log','лог','вывод','консоль']
  },

  {
    key: 'typeof',
    title: 'typeof',
    cat: 'js',
    sub: 'узнать тип значения',
    what: 'typeof — оператор, который возвращает тип значения в виде строки: "string", "number", "boolean" и т.д.',
    analogy: 'Это как спросить у вещи: «ты кто?»',
    code: [
      'typeof "текст"    // "string"',
      'typeof 42         // "number"',
      'typeof true       // "boolean"',
      'typeof undefined  // "undefined"'
    ].join('\n'),
    note: 'typeof null выдаёт "object" — это баг JS. Проверяй null отдельно: x === null.',
    course: [
      { title: 'строка', text: 'typeof "текст" → "string".' },
      { title: 'число', text: 'typeof 42 → "number".' },
      { title: 'булево', text: 'typeof true → "boolean".' }
    ],
    related: ['js', 'let'],
    keywords: ['typeof','тип','проверка']
  },

  {
    key: 'оператор',
    title: 'оператор',
    cat: 'js',
    sub: 'действие над значениями',
    what: 'Оператор — знак, который делает что-то со значениями: сложить, сравнить, объединить.',
    analogy: 'Это как знаки в математике: +, −, ×, ÷.',
    code: [
      '5 + 3     // 8',
      '10 % 3    // 1 (остаток)',
      '2 ** 8    // 256',
      '5 === 5   // true',
      '5 !== 3   // true'
    ].join('\n'),
    note: 'Для сравнения всегда используй === (три равно). Два равно == работают странно.',
    course: [
      { title: 'арифметика', text: '+, -, *, /.' },
      { title: 'сравнение', text: '===, !==, >, <.' },
      { title: 'логика', text: '&& (и), || (или), ! (не).' }
    ],
    related: ['js', 'let'],
    keywords: ['оператор','плюс','сравнение','равно']
  },

  {
    key: '===',
    title: '===',
    cat: 'js',
    sub: 'строгое равно',
    what: '=== проверяет, что два значения равны И по значению, И по типу. Правильный способ сравнения.',
    analogy: 'Это как спросить: «ты точно такой же?» — с придиркой к каждой детали.',
    code: [
      '5 === 5      // true',
      '5 === "5"    // false (число ≠ строка)',
      '"a" === "a"  // true'
    ].join('\n'),
    note: 'Всегда === вместо ==. == приводит типы и ведёт себя неожиданно: 5 == "5" даёт true.',
    course: [
      { title: 'числа', text: '5 === 5 → true.' },
      { title: 'типы', text: '5 === "5" → false.' },
      { title: 'не используй ==', text: 'Всегда ===.' }
    ],
    related: ['оператор', 'js'],
    keywords: ['===','равно','строгое','сравнение']
  },

  {
    key: 'if',
    title: 'if',
    cat: 'js',
    sub: 'если — условие',
    what: 'if — оператор условия. Если выражение в скобках истинно — выполни код в фигурных скобках.',
    analogy: 'Это как светофор: если зелёный — иди.',
    code: [
      'let age = 20;',
      'if (age >= 18) {',
      '  console.log("взрослый");',
      '}'
    ].join('\n'),
    note: 'Условие в круглых скобках, тело — в фигурных. Условие всегда возвращает true или false.',
    course: [
      { title: 'условие', text: 'if (age >= 18).' },
      { title: 'тело', text: 'Что делать — в { }.' },
      { title: 'проверь', text: 'Поменяй age — увидишь разное.' }
    ],
    related: ['else', 'js'],
    keywords: ['if','если','условие']
  },

  {
    key: 'else',
    title: 'else',
    cat: 'js',
    sub: 'иначе',
    what: 'else — блок, который выполнится, если условие в if оказалось ложным.',
    analogy: 'Если красный — стой, иначе — иди.',
    code: [
      'let age = 15;',
      'if (age >= 18) {',
      '  console.log("взрослый");',
      '} else {',
      '  console.log("ребёнок");',
      '}'
    ].join('\n'),
    note: 'else не имеет своего условия — он выполняется только когда if не сработал.',
    course: [
      { title: 'if', text: 'Первое условие.' },
      { title: 'else', text: 'Все остальные случаи.' },
      { title: 'проверь', text: 'Поменяй age.' }
    ],
    related: ['if', 'js'],
    keywords: ['else','иначе','иначе если']
  },

  {
    key: 'for',
    title: 'for',
    cat: 'js',
    sub: 'цикл — повторять N раз',
    what: 'for — цикл. Повторяет код заданное количество раз. Классика — пробежаться по числам или массиву.',
    analogy: 'Это как «отожмись 10 раз»: одно и то же действие по кругу.',
    code: [
      'for (let i = 0; i < 5; i++) {',
      '  console.log(i); // 0, 1, 2, 3, 4',
      '}'
    ].join('\n'),
    note: 'Три части в скобках: начало (let i = 0), условие (i < 5), шаг (i++). Читается как «пока i < 5, делай и увеличивай».',
    course: [
      { title: 'начало', text: 'let i = 0.' },
      { title: 'условие', text: 'i < 5 — пока true.' },
      { title: 'шаг', text: 'i++ — увеличить на 1.' },
      { title: 'тело', text: 'Что делать — в { }.' }
    ],
    related: ['while', 'js'],
    keywords: ['for','цикл','повтор','цикл for']
  },

  {
    key: 'while',
    title: 'while',
    cat: 'js',
    sub: 'цикл — пока условие true',
    what: 'while — цикл, который повторяется, пока условие истинно. Не знаешь, сколько раз — используй while.',
    analogy: 'Это как «пока не устану — бегу». Сколько раз — неизвестно.',
    code: [
      'let i = 0;',
      'while (i < 5) {',
      '  console.log(i);',
      '  i++;',
      '}'
    ].join('\n'),
    note: 'Легко сделать бесконечный цикл — если забыть увеличить i. Всегда проверяй, что условие станет ложным.',
    course: [
      { title: 'условие', text: 'while (i < 5).' },
      { title: 'тело', text: 'Что делать.' },
      { title: 'шаг', text: 'i++ — иначе бесконечность.' }
    ],
    related: ['for', 'js'],
    keywords: ['while','цикл','пока']
  },

  {
    key: 'function',
    title: 'function',
    cat: 'js',
    sub: 'функция — сохранённый кусок кода',
    what: 'Функция — блок кода с именем. Написал один раз — вызываешь когда нужно.',
    analogy: 'Это как рецепт: написал — готовишь по нему много раз.',
    code: [
      'function greet(name) {',
      '  return "Привет, " + name;',
      '}',
      '',
      'greet("Иван"); // "Привет, Иван"'
    ].join('\n'),
    note: 'return — выкинуть результат наружу. Без return функция вернёт undefined.',
    course: [
      { title: 'объяви', text: 'function greet(name) { }.' },
      { title: 'тело', text: 'Что делает — внутри.' },
      { title: 'return', text: 'Результат наружу.' },
      { title: 'вызови', text: 'greet("Иван").' }
    ],
    related: ['return', 'js'],
    keywords: ['function','функция','рецепт']
  },

  {
    key: 'return',
    title: 'return',
    cat: 'js',
    sub: 'отдаёт результат из функции',
    what: 'return завершает функцию и отдаёт наружу результат. Без return функция вернёт undefined.',
    analogy: 'Ты заказал кофе. Повар сварил и отдал — это return.',
    code: [
      'function sum(a, b) {',
      '  return a + b;',
      '}',
      '',
      'sum(2, 3); // 5'
    ].join('\n'),
    note: 'Частая ошибка: посчитать, но забыть return. Наружу ничего не выйдет.',
    course: [
      { title: 'функция', text: 'function sum(a, b).' },
      { title: 'return', text: 'return a + b.' },
      { title: 'вызов', text: 'sum(2, 3) → 5.' }
    ],
    related: ['function', 'js'],
    keywords: ['return','вернуть','результат']
  },

  {
    key: 'стрелочная функция',
    title: 'стрелочная функция',
    cat: 'js',
    sub: 'короткая запись функции',
    what: 'Стрелочная функция — короткая запись обычной. Один и тот же смысл, но компактнее.',
    analogy: 'То же самое, но записано скороговоркой.',
    code: [
      'const sum = (a, b) => a + b;',
      'const sqr = x => x * x;',
      'const log = () => console.log("hi");'
    ].join('\n'),
    note: 'Если тело — одна строка, return пишется сам. Если тело в { }, нужен явный return.',
    course: [
      { title: 'полная форма', text: 'function (a, b) { return a + b; }.' },
      { title: 'стрелка', text: '(a, b) => a + b.' },
      { title: 'в массив', text: 'nums.map(n => n * 2).' }
    ],
    related: ['function', 'map'],
    keywords: ['стрелочная','arrow','=>','функция']
  },

  {
    key: 'массив',
    title: 'массив',
    cat: 'js',
    sub: 'список значений',
    what: 'Массив — список. Одна переменная, много значений внутри.',
    analogy: 'Это как список покупок.',
    code: [
      'const nums = [1, 2, 3, 4];',
      'nums[0];        // 1',
      'nums.length;    // 4'
    ].join('\n'),
    note: 'Счёт с нуля. Первый элемент — индекс 0. Длина — через .length.',
    course: [
      { title: 'создай', text: 'const nums = [1, 2, 3];' },
      { title: 'обратись', text: 'nums[0] → 1.' },
      { title: 'длина', text: 'nums.length → 3.' }
    ],
    related: ['push', 'map'],
    keywords: ['массив','array','список']
  },

  {
    key: 'push',
    title: 'push',
    cat: 'js',
    sub: 'добавить в конец массива',
    what: 'push — метод массива. Добавляет элемент в конец.',
    analogy: 'Это как положить ещё одну вещь в конец списка.',
    code: [
      'const arr = [1, 2];',
      'arr.push(3);',
      'console.log(arr); // [1, 2, 3]'
    ].join('\n'),
    note: 'push меняет исходный массив. Возвращает новую длину.',
    course: [
      { title: 'массив', text: 'const arr = [1, 2].' },
      { title: 'push', text: 'arr.push(3).' },
      { title: 'проверь', text: '[1, 2, 3].' }
    ],
    related: ['массив', 'pop'],
    keywords: ['push','добавить','конец']
  },

  {
    key: 'pop',
    title: 'pop',
    cat: 'js',
    sub: 'удалить последний элемент',
    what: 'pop — метод массива. Удаляет последний элемент и возвращает его.',
    analogy: 'Это как снять верхнюю вещь со стопки.',
    code: [
      'const arr = [1, 2, 3];',
      'const last = arr.pop();',
      'console.log(last); // 3',
      'console.log(arr);  // [1, 2]'
    ].join('\n'),
    note: 'pop меняет исходный массив. Парный метод — push.',
    course: [
      { title: 'массив', text: 'const arr = [1, 2, 3].' },
      { title: 'pop', text: 'arr.pop().' },
      { title: 'проверь', text: 'Вернёт 3, массив станет [1,2].' }
    ],
    related: ['push', 'массив'],
    keywords: ['pop','удалить','последний']
  },

  {
    key: 'map',
    title: 'map',
    cat: 'js',
    sub: 'преобразует каждый элемент массива',
    what: 'map берёт массив, применяет к каждому элементу функцию и возвращает НОВЫЙ массив той же длины.',
    analogy: 'Конвейер: на входе 5 яблок, на выходе 5 помытых.',
    code: [
      '[1, 2, 3].map(n => n * 2);',
      '// [2, 4, 6]'
    ].join('\n'),
    note: 'map не фильтрует и не сортирует. Только преобразует каждый элемент.',
    course: [
      { title: 'базовый', text: '[1,2,3].map(n => n * 2).' },
      { title: 'объекты', text: 'users.map(u => u.name).' },
      { title: 'с filter', text: 'nums.filter(n => n > 2).map(n => n * 10).' }
    ],
    related: ['filter', 'reduce'],
    keywords: ['map','преобразовать','массив']
  },

  {
    key: 'filter',
    title: 'filter',
    cat: 'js',
    sub: 'оставить только подходящие',
    what: 'filter берёт массив и возвращает новый — только с теми элементами, для которых функция вернула true.',
    analogy: 'Сито: одни проходят, другие нет.',
    code: [
      '[1, 2, 3, 4].filter(n => n > 2);',
      '// [3, 4]'
    ].join('\n'),
    note: 'filter не меняет исходный массив. Возвращает новый.',
    course: [
      { title: 'условие', text: 'n => n > 2.' },
      { title: 'результат', text: '[3, 4].' },
      { title: 'с map', text: 'Сначала filter, потом map.' }
    ],
    related: ['map', 'reduce'],
    keywords: ['filter','фильтр','отобрать']
  },

  {
    key: 'reduce',
    title: 'reduce',
    cat: 'js',
    sub: 'свернуть массив в одно значение',
    what: 'reduce проходит по всем элементам и накапливает одно значение: сумму, максимум, объект.',
    analogy: 'Мясорубка: всё в один фарш.',
    code: [
      '[1, 2, 3].reduce((sum, n) => sum + n, 0);',
      '// 6'
    ].join('\n'),
    note: 'Второй аргумент — начальное значение. Без него reduce начнёт с первого элемента.',
    course: [
      { title: 'сумма', text: '(sum, n) => sum + n.' },
      { title: 'начало', text: 'Второй аргумент — 0.' },
      { title: 'результат', text: '6.' }
    ],
    related: ['map', 'filter'],
    keywords: ['reduce','свернуть','накопить','сумма']
  },

  {
    key: 'forEach',
    title: 'forEach',
    cat: 'js',
    sub: 'пройти по каждому элементу',
    what: 'forEach перебирает массив и делает что-то с каждым элементом. Ничего не возвращает.',
    analogy: 'Пройти по каждому и поздороваться.',
    code: [
      '[1, 2, 3].forEach(n => console.log(n));',
      '// 1, 2, 3'
    ].join('\n'),
    note: 'forEach возвращает undefined. Для преобразования используй map, для отбора — filter.',
    course: [
      { title: 'массив', text: '[1, 2, 3].' },
      { title: 'функция', text: 'n => console.log(n).' },
      { title: 'результат', text: 'Что-то делается с каждым.' }
    ],
    related: ['map', 'filter'],
    keywords: ['foreach','перебрать','обойти']
  },

  {
    key: 'find',
    title: 'find',
    cat: 'js',
    sub: 'найти первый подходящий',
    what: 'find возвращает первый элемент, для которого функция вернула true. Если ни один — undefined.',
    analogy: 'Найти первого подходящего в толпе.',
    code: [
      'const users = [{id:1,name:"Иван"}, {id:2,name:"Аня"}];',
      'users.find(u => u.id === 2);',
      '// { id: 2, name: "Аня" }'
    ].join('\n'),
    note: 'Не путать с filter — find возвращает один элемент, filter возвращает массив.',
    course: [
      { title: 'условие', text: 'u => u.id === 2.' },
      { title: 'результат', text: 'Один объект.' },
      { title: 'если нет', text: 'undefined.' }
    ],
    related: ['filter', 'indexOf'],
    keywords: ['find','найти','первый']
  },

  {
    key: 'объект',
    title: 'объект',
    cat: 'js',
    sub: 'набор ключ: значение',
    what: 'Объект — это набор пар «ключ: значение». Как анкета: имя, возраст, город.',
    analogy: 'Это как анкета с полями.',
    code: [
      'const user = {',
      '  name: "Иван",',
      '  age: 20',
      '};',
      'user.name;      // "Иван"',
      'user["age"];    // 20'
    ].join('\n'),
    note: 'Через точку — обычный доступ. Через скобки — если ключ в переменной или содержит пробел.',
    course: [
      { title: 'создай', text: 'const user = { name: "Иван" }.' },
      { title: 'обратись', text: 'user.name.' },
      { title: 'добавь', text: 'user.city = "Москва".' }
    ],
    related: ['массив', 'json'],
    keywords: ['объект','object','ключ','значение']
  },

  {
    key: 'json',
    title: 'json',
    cat: 'js',
    sub: 'формат данных',
    what: 'JSON — текстовый формат для данных. Похож на объект JS, но ключи в кавычках и без функций. Так данные ходят между сервером и браузером.',
    analogy: 'Это как анкета, завёрнутая в конверт — чтобы можно было переслать.',
    code: [
      '{',
      '  "name": "Иван",',
      '  "age": 20',
      '}',
      '',
      'JSON.parse(\'{"a":1}\')   // объект',
      'JSON.stringify({a:1})    // строка'
    ].join('\n'),
    note: 'parse — из строки в объект. stringify — из объекта в строку. Нужно при работе с fetch.',
    course: [
      { title: 'формат', text: 'Ключи в кавычках.' },
      { title: 'parse', text: 'JSON.parse(строка) → объект.' },
      { title: 'stringify', text: 'JSON.stringify(объект) → строка.' }
    ],
    related: ['объект', 'fetch'],
    keywords: ['json','формат','данные','parse','stringify']
  },

  {
    key: 'DOM',
    title: 'DOM',
    cat: 'js',
    sub: 'дерево элементов страницы',
    what: 'DOM — объектное представление HTML-страницы. Через него JS может находить, менять, удалять элементы.',
    analogy: 'Это как схема театральной сцены, доступная режиссёру.',
    code: [
      'document.querySelector(".card");',
      'document.getElementById("header");'
    ].join('\n'),
    note: 'document — точка входа. Он всегда доступен на странице.',
    course: [
      { title: 'поиск', text: 'querySelector.' },
      { title: 'изменение', text: 'textContent, style, classList.' },
      { title: 'создание', text: 'createElement.' }
    ],
    related: ['querySelector', 'addEventListener'],
    keywords: ['dom','дерево','элемент','document']
  },

  {
    key: 'querySelector',
    title: 'querySelector',
    cat: 'js',
    sub: 'найти элемент на странице',
    what: 'document.querySelector — находит первый элемент по CSS-селектору. Возвращает null, если ничего не нашёл.',
    analogy: 'Спросить у страницы: «дай мне первый элемент вот с таким признаком».',
    code: [
      'document.querySelector(".card");',
      'document.querySelector("#header");',
      'document.querySelector("p");'
    ].join('\n'),
    note: 'Селекторы как в CSS: .класс, #id, тег. Для всех элементов — querySelectorAll.',
    course: [
      { title: 'по классу', text: 'querySelector(".card").' },
      { title: 'по id', text: 'querySelector("#header").' },
      { title: 'по тегу', text: 'querySelector("p").' }
    ],
    related: ['DOM', 'addEventListener'],
    keywords: ['queryselector','найти','выбрать','селектор']
  },

  {
    key: 'querySelectorAll',
    title: 'querySelectorAll',
    cat: 'js',
    sub: 'найти все элементы',
    what: 'document.querySelectorAll — находит ВСЕ элементы по селектору. Возвращает NodeList.',
    analogy: 'Спросить: «дай все элементы с таким признаком».',
    code: [
      'const cards = document.querySelectorAll(".card");',
      'cards.forEach(c => c.classList.add("active"));'
    ].join('\n'),
    note: 'По NodeList можно идти forEach, но это не массив. Если нужен массив — Array.from(cards).',
    course: [
      { title: 'найди', text: 'querySelectorAll(".card").' },
      { title: 'перебери', text: 'forEach.' },
      { title: 'измени', text: 'classList.add.' }
    ],
    related: ['querySelector', 'DOM'],
    keywords: ['queryselectorall','все элементы']
  },

  {
    key: 'textContent',
    title: 'textContent',
    cat: 'js',
    sub: 'текст внутри элемента',
    what: 'textContent — свойство, через которое читают и меняют текст внутри элемента. Безопасно: HTML не выполняется.',
    analogy: 'Содержимое ящика: что там лежит.',
    code: [
      'const title = document.querySelector("h1");',
      'title.textContent = "Новый заголовок";'
    ].join('\n'),
    note: 'Есть ещё innerHTML — он выполняет HTML. textContent — безопаснее, используй для текста.',
    course: [
      { title: 'прочитай', text: 'title.textContent.' },
      { title: 'измени', text: 'title.textContent = "...".' },
      { title: 'безопасно', text: 'HTML не выполняется.' }
    ],
    related: ['querySelector', 'innerHTML'],
    keywords: ['textcontent','текст','содержимое']
  },

  {
    key: 'innerHTML',
    title: 'innerHTML',
    cat: 'js',
    sub: 'HTML внутри элемента',
    what: 'innerHTML — как textContent, но с HTML. Теги внутри строки станут настоящими элементами.',
    analogy: 'Содержимое ящика, где могут быть вложенные коробки.',
    code: [
      'el.innerHTML = "<b>Жирный</b> текст";'
    ].join('\n'),
    note: 'Опасно для пользовательского ввода — можно вставить вредоносный код. Для текста используй textContent.',
    course: [
      { title: 'вставь html', text: 'el.innerHTML = "<b>текст</b>".' },
      { title: 'безопасность', text: 'Не вставляй ввод пользователя.' },
      { title: 'для текста', text: 'textContent.' }
    ],
    related: ['textContent', 'DOM'],
    keywords: ['innerhtml','html','вставить']
  },

  {
    key: 'classList',
    title: 'classList',
    cat: 'js',
    sub: 'управление классами элемента',
    what: 'classList — свойство, через которое добавляют, убирают и переключают CSS-классы элемента.',
    analogy: 'Это как клеить и отклеивать ярлыки на элементе.',
    code: [
      'el.classList.add("active");',
      'el.classList.remove("active");',
      'el.classList.toggle("open");',
      'el.classList.contains("active"); // true/false'
    ].join('\n'),
    note: 'toggle удобен для кнопок: включил/выключил класс одним вызовом.',
    course: [
      { title: 'добавь', text: 'classList.add.' },
      { title: 'убери', text: 'classList.remove.' },
      { title: 'туда-сюда', text: 'classList.toggle.' }
    ],
    related: ['querySelector', 'DOM'],
    keywords: ['classlist','класс','toggle']
  },

  {
    key: 'style',
    title: 'style',
    cat: 'js',
    sub: 'стили элемента из JS',
    what: 'el.style — прямое изменение CSS-свойств элемента из JS.',
    analogy: 'Это как раскрашивать элемент вживую.',
    code: [
      'el.style.color = "red";',
      'el.style.fontSize = "20px";',
      'el.style.backgroundColor = "black";'
    ].join('\n'),
    note: 'Свойства пишутся через camelCase: font-size → fontSize, background-color → backgroundColor.',
    course: [
      { title: 'цвет', text: 'el.style.color = "red".' },
      { title: 'размер', text: 'el.style.fontSize = "20px".' },
      { title: 'camelCase', text: 'background-color → backgroundColor.' }
    ],
    related: ['classList', 'DOM'],
    keywords: ['style','стиль','css в js']
  },

  {
    key: 'addEventListener',
    title: 'addEventListener',
    cat: 'js',
    sub: 'подписаться на событие',
    what: 'addEventListener — метод, который «слушает» событие элемента: клик, ввод, отправку.',
    analogy: 'Это как повесить колокольчик: когда дёрнут — зазвенит.',
    code: [
      'btn.addEventListener("click", () => {',
      '  console.log("нажато");',
      '});'
    ].join('\n'),
    note: 'Первый аргумент — название события ("click", "input", "submit"). Второй — функция.',
    course: [
      { title: 'найди элемент', text: 'querySelector.' },
      { title: 'подпишись', text: 'addEventListener("click", ...).' },
      { title: 'сделай', text: 'Что-то в функции.' }
    ],
    related: ['click', 'input'],
    keywords: ['addeventlistener','событие','слушать']
  },

  {
    key: 'click',
    title: 'click',
    cat: 'js',
    sub: 'событие клика',
    what: '"click" — название события, которое срабатывает при клике на элемент.',
    analogy: 'Это как звонок в дверь: нажал — событие.',
    code: [
      'btn.addEventListener("click", () => {',
      '  alert("Хоп!");',
      '});'
    ].join('\n'),
    note: 'На мобильных click тоже работает — браузер эмулирует его после тапа.',
    course: [
      { title: 'элемент', text: 'Кнопка.' },
      { title: 'слушай', text: 'addEventListener("click", ...).' },
      { title: 'действие', text: 'Что-то в функции.' }
    ],
    related: ['addEventListener', 'input'],
    keywords: ['click','клик','нажатие']
  },

  {
    key: 'input',
    title: 'input (событие)',
    cat: 'js',
    sub: 'событие ввода в поле',
    what: '"input" — событие, срабатывающее при каждом изменении текста в поле ввода.',
    analogy: 'Это как микрофон: ловит каждое слово.',
    code: [
      'field.addEventListener("input", e => {',
      '  console.log(e.target.value);',
      '});'
    ].join('\n'),
    note: 'e.target.value — текущее значение поля. Событие change срабатывает только когда пользователь закончил.',
    course: [
      { title: 'поле', text: 'input type="text".' },
      { title: 'слушай', text: 'addEventListener("input", ...).' },
      { title: 'читай', text: 'e.target.value.' }
    ],
    related: ['addEventListener', 'click'],
    keywords: ['input','ввод','событие input']
  },

  {
    key: 'submit',
    title: 'submit',
    cat: 'js',
    sub: 'событие отправки формы',
    what: '"submit" — событие отправки формы. По умолчанию перезагружает страницу. Останавливают через e.preventDefault().',
    analogy: 'Это как нажать «отправить» на бланке.',
    code: [
      'form.addEventListener("submit", e => {',
      '  e.preventDefault();',
      '  console.log("форма отправлена");',
      '});'
    ].join('\n'),
    note: 'Без preventDefault() страница перезагрузится — и все твои данные потеряются.',
    course: [
      { title: 'форма', text: 'Тег form.' },
      { title: 'слушай', text: 'addEventListener("submit", ...).' },
      { title: 'стоп', text: 'e.preventDefault().' }
    ],
    related: ['addEventListener', 'form'],
    keywords: ['submit','отправка','форма']
  },

  {
    key: 'e.target',
    title: 'e.target',
    cat: 'js',
    sub: 'элемент, на котором произошло событие',
    what: 'Внутри обработчика события e.target — тот элемент, на который кликнули или в который ввели текст.',
    analogy: 'Это как «кто это сделал?» — ответ в e.target.',
    code: [
      'list.addEventListener("click", e => {',
      '  console.log(e.target);',
      '});'
    ].join('\n'),
    note: 'e — это событие. e.target — на чём произошло. e.target.value — значение для input.',
    course: [
      { title: 'слушай', text: 'addEventListener.' },
      { title: 'получи событие', text: 'e в параметрах.' },
      { title: 'найди цель', text: 'e.target.' }
    ],
    related: ['addEventListener', 'click'],
    keywords: ['target','цель','событие']
  },

  {
    key: 'async',
    title: 'async',
    cat: 'js',
    sub: 'асинхронная функция',
    what: 'async перед функцией делает её асинхронной — внутри можно использовать await.',
    analogy: 'Это как сказать: «пока готовится — я не блокируюсь, а делаю другое».',
    code: [
      'async function load() {',
      '  const res = await fetch("/api");',
      '}'
    ].join('\n'),
    note: 'async-функция всегда возвращает Promise — даже если внутри просто return 5.',
    course: [
      { title: 'поставь async', text: 'async function load() { }.' },
      { title: 'внутри await', text: 'await fetch(...).' },
      { title: 'вызови', text: 'load();' }
    ],
    related: ['await', 'fetch'],
    keywords: ['async','асинхронная','функция']
  },

  {
    key: 'await',
    title: 'await',
    cat: 'js',
    sub: 'подождать результат',
    what: 'await останавливает выполнение функции до получения результата. Работает только внутри async.',
    analogy: 'Это как ждать доставку пиццы — заказ сделан, пока не привезли, еду не начнёшь.',
    code: [
      'async function load() {',
      '  const res = await fetch("/api");',
      '  const data = await res.json();',
      '}'
    ].join('\n'),
    note: 'Два await: перед fetch и перед .json() — оба асинхронные.',
    course: [
      { title: 'async', text: 'await только внутри async.' },
      { title: 'fetch', text: 'const res = await fetch(url).' },
      { title: 'json', text: 'const data = await res.json().' }
    ],
    related: ['async', 'fetch'],
    keywords: ['await','подождать','асинхронно']
  },

  {
    key: 'fetch',
    title: 'fetch',
    cat: 'js',
    sub: 'загрузить данные с сервера',
    what: 'fetch — встроенная функция для запросов к серверу. Возвращает Promise.',
    analogy: 'Это как заказать пиццу: позвонил — ждёшь результат.',
    code: [
      'async function load() {',
      '  const res = await fetch("/api/data");',
      '  const data = await res.json();',
      '}'
    ].join('\n'),
    note: 'fetch асинхронный — нужен async и await. .json() тоже асинхронный.',
    course: [
      { title: 'async', text: 'async function load().' },
      { title: 'fetch', text: 'await fetch(url).' },
      { title: 'json', text: 'await res.json().' },
      { title: 'try/catch', text: 'Оберни на ошибки.' }
    ],
    related: ['await', 'json'],
    keywords: ['fetch','запрос','api','сервер']
  },

  {
    key: 'try',
    title: 'try',
    cat: 'js',
    sub: 'попробовать — обработка ошибок',
    what: 'try — блок, в котором может произойти ошибка. Если произойдёт — управление перейдёт в catch.',
    analogy: 'Это как подстраховка: «попробую, если не выйдет — сделаю иначе».',
    code: [
      'try {',
      '  const data = await fetch("/api");',
      '} catch (err) {',
      '  console.error(err);',
      '}'
    ].join('\n'),
    note: 'try без catch бессмысленен. catch — обязательный партнёр.',
    course: [
      { title: 'try', text: 'Опасный код внутрь.' },
      { title: 'catch', text: 'Что делать при ошибке.' },
      { title: 'error', text: 'err в параметрах.' }
    ],
    related: ['catch', 'fetch'],
    keywords: ['try','попробовать','ошибка']
  },

  {
    key: 'catch',
    title: 'catch',
    cat: 'js',
    sub: 'поймать ошибку',
    what: 'catch — блок, который выполнится, если в try произошла ошибка. Сюда приходит объект ошибки.',
    analogy: 'Это как поймать мяч, который не попал в цель.',
    code: [
      'try {',
      '  // что-то опасное',
      '} catch (err) {',
      '  console.error("Ошибка:", err);',
      '}'
    ].join('\n'),
    note: 'err.message содержит описание ошибки. err.name — тип.',
    course: [
      { title: 'try', text: 'Опасный код.' },
      { title: 'catch', text: 'catch (err) { }.' },
      { title: 'выведи', text: 'console.error(err).' }
    ],
    related: ['try', 'fetch'],
    keywords: ['catch','ошибка','поймать']
  },

  {
    key: 'Promise',
    title: 'Promise',
    cat: 'js',
    sub: 'обещание результата',
    what: 'Promise — объект, который даст значение когда-нибудь позже: или результат (resolve), или ошибку (reject).',
    analogy: 'Это как квитанция из химчистки: вещь будет готова позже.',
    code: [
      'const p = new Promise((resolve, reject) => {',
      '  if (ok) resolve(value);',
      '  else reject(err);',
      '});'
    ].join('\n'),
    note: 'fetch возвращает Promise. async/await — удобная запись работы с Promise.',
    course: [
      { title: 'создай', text: 'new Promise((resolve, reject) => { }).' },
      { title: 'resolve', text: 'Успех.' },
      { title: 'reject', text: 'Ошибка.' }
    ],
    related: ['async', 'await'],
    keywords: ['promise','обещание','асинхронность']
  },

  /* ============================================================
     GIT
     ============================================================ */
  {
    key: 'git',
    title: 'git',
    cat: 'git',
    sub: 'история изменений проекта',
    what: 'git сохраняет снимки проекта в разные моменты. Можно вернуться назад и посмотреть, что менялось.',
    analogy: 'Это как сохранение в игре.',
    code: [
      'git init',
      'git add .',
      'git commit -m "первый коммит"'
    ].join('\n'),
    note: 'Сообщение коммита пиши по делу.',
    course: [
      { title: 'init', text: 'git init в папке.' },
      { title: 'status', text: 'git status.' },
      { title: 'сохрани', text: 'git add . && git commit -m "..." .' }
    ],
    related: ['git commit', 'git push'],
    keywords: ['git','версия','история','сохранение']
  },

  {
    key: 'git commit',
    title: 'git commit',
    cat: 'git',
    sub: 'сохранить снимок проекта',
    what: 'git commit — сохраняет текущее состояние проекта в историю с сообщением.',
    analogy: 'Это как сделать скриншот и подписать его.',
    code: [
      'git add .',
      'git commit -m "feat: добавил меню"'
    ].join('\n'),
    note: 'Сначала add, потом commit. Иначе нечего сохранять.',
    course: [
      { title: 'add', text: 'git add .' },
      { title: 'commit', text: 'git commit -m "..."' },
      { title: 'log', text: 'git log — история.' }
    ],
    related: ['git', 'git push'],
    keywords: ['commit','коммит','сохранить']
  },

  {
    key: 'git push',
    title: 'git push',
    cat: 'git',
    sub: 'отправить на сервер',
    what: 'git push отправляет локальные коммиты на удалённый репозиторий (GitHub, GitLab).',
    analogy: 'Это как загрузить файлы в облако.',
    code: [
      'git push',
      'git push -u origin main'
    ].join('\n'),
    note: 'Первый раз — с -u origin main. Дальше просто git push.',
    course: [
      { title: 'коммит', text: 'Уже сделан.' },
      { title: 'push', text: 'git push.' },
      { title: 'проверь', text: 'На GitHub.' }
    ],
    related: ['git', 'git pull'],
    keywords: ['push','отправить','загрузить']
  },

  {
    key: 'git pull',
    title: 'git pull',
    cat: 'git',
    sub: 'забрать с сервера',
    what: 'git pull забирает изменения из удалённого репозитория и сливает с локальными.',
    analogy: 'Это как скачать свежие файлы из облака.',
    code: [
      'git pull'
    ].join('\n'),
    note: 'pull = fetch + merge. Может быть конфликт, если ты и другой разработчик изменили одно и то же место.',
    course: [
      { title: 'pull', text: 'git pull.' },
      { title: 'конфликт', text: 'Если что — git status подскажет.' },
      { title: 'разреши', text: 'Ручками в файле.' }
    ],
    related: ['git', 'git push'],
    keywords: ['pull','забрать','скачать']
  },

  {
    key: 'git clone',
    title: 'git clone',
    cat: 'git',
    sub: 'скопировать чужой репозиторий',
    what: 'git clone создаёт локальную копию удалённого репозитория со всей историей.',
    analogy: 'Это как скачать чужой проект целиком.',
    code: [
      'git clone https://github.com/user/repo.git'
    ].join('\n'),
    note: 'После clone можно сразу работать и делать push, если есть доступ.',
    course: [
      { title: 'адрес', text: 'Возьми с GitHub кнопкой Code.' },
      { title: 'clone', text: 'git clone <адрес>.' },
      { title: 'зайди', text: 'cd repo.' }
    ],
    related: ['git', 'git push'],
    keywords: ['clone','клонировать','скачать проект']
  },

  /* ============================================================
     ОБЩИЕ ТЕРМИНЫ
     ============================================================ */
  {
    key: 'IDE',
    title: 'IDE',
    cat: 'general',
    sub: 'среда разработки',
    what: 'IDE (Integrated Development Environment) — программа для написания кода. VS Code, WebStorm, Sublime.',
    analogy: 'Это как мастерская: все инструменты в одном месте.',
    code: [
      'VS Code, WebStorm, PyCharm, IntelliJ'
    ].join('\n'),
    note: 'Для веба чаще всего — VS Code. Бесплатный, расширяемый.',
    course: [
      { title: 'поставь', text: 'VS Code с code.visualstudio.com.' },
      { title: 'расширения', text: 'Prettier, Live Server.' },
      { title: 'горячие клавиши', text: 'Ctrl+P, Ctrl+Shift+P.' }
    ],
    related: ['компилятор', 'терминал'],
    keywords: ['ide','среда','редактор','vscode']
  },

  {
    key: 'терминал',
    title: 'терминал',
    cat: 'general',
    sub: 'командная строка',
    what: 'Терминал — окно, куда вводят текстовые команды для компьютера. Вместо кликов — команды.',
    analogy: 'Это как пульт управления: пишешь команду — компьютер делает.',
    code: [
      'cd project',
      'ls',
      'npm install'
    ].join('\n'),
    note: 'В VS Code терминал открывается через Ctrl+` — очень удобно.',
    course: [
      { title: 'открой', text: 'Ctrl+` в VS Code.' },
      { title: 'команды', text: 'cd, ls, mkdir.' },
      { title: 'git', text: 'Тоже через терминал.' }
    ],
    related: ['IDE', 'git'],
    keywords: ['терминал','консоль','командная строка','cmd']
  },

  {
    key: 'компилятор',
    title: 'компилятор',
    cat: 'general',
    sub: 'переводчик из кода в понятное машине',
    what: 'Компилятор переводит код, написанный человеком, в машинные инструкции. Для HTML/CSS/JS не нужен — браузер сам всё понимает.',
    analogy: 'Это как переводчик с одного языка на другой.',
    code: [
      '// C++, Java, Rust — компилируемые',
      '// HTML, CSS, JS — интерпретируемые'
    ].join('\n'),
    note: 'JS в браузере не компилируется — интерпретируется движком (V8, SpiderMonkey).',
    course: [
      { title: 'компилируемые', text: 'C++, Java, Rust.' },
      { title: 'интерпретируемые', text: 'HTML, CSS, JS.' },
      { title: 'для веба', text: 'Компилятор не нужен.' }
    ],
    related: ['IDE', 'терминал'],
    keywords: ['компилятор','трансляция','язык']
  },

  {
    key: 'баг',
    title: 'баг',
    cat: 'general',
    sub: 'ошибка в программе',
    what: 'Баг — ошибка в коде, из-за которой программа работает не так, как задумано.',
    analogy: 'Это как опечатка в рецепте — суп получится не тот.',
    code: [
      '// Ожидалось 5, получилось 4',
      'console.log(2 + 3); // тут всё ок',
      'console.log(2 - 3); // а вот тут баг'
    ].join('\n'),
    note: 'Баг — это нормально. Даже у сеньоров их куча. Главное — уметь их находить через консоль.',
    course: [
      { title: 'F12', text: 'Открой консоль.' },
      { title: 'красное', text: 'Там видно ошибки.' },
      { title: 'читай', text: 'Сообщение подскажет, где.' }
    ],
    related: ['терминал', 'IDE'],
    keywords: ['баг','ошибка','bug']
  },

  {
    key: 'деплой',
    title: 'деплой',
    cat: 'general',
    sub: 'публикация сайта',
    what: 'Деплой — заливка сайта на хостинг, чтобы он стал доступен в интернете.',
    analogy: 'Это как отправить готовое блюдо из кухни в зал.',
    code: [
      '// Netlify, Vercel — перетащил папку',
      '// GitHub Pages — включил в настройках'
    ].join('\n'),
    note: 'Для статических сайтов хватит Netlify или Vercel — бесплатно и за 2 минуты.',
    course: [
      { title: 'готовь', text: 'index.html + css + js.' },
      { title: 'хостинг', text: 'Netlify, Vercel, GitHub Pages.' },
      { title: 'перетащи', text: 'Папку в окно — сайт живой.' }
    ],
    related: ['git', 'терминал'],
    keywords: ['деплой','публикация','хостинг','netlify']
  }

];


/* Склеиваем основную базу и дополнительные темы в один массив */
KB = KB.concat(KB_EXTRA);


/* ==========================================================
   3. УТИЛИТЫ
   ========================================================== */
function $(id){ return document.getElementById(id); }

function esc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    if (c === '&') return '&amp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    if (c === '"') return '&quot;';
    return '&#39;';
  });
}


/* ==========================================================
   4. ПОИСК
   ========================================================== */
function find(query){
  var q = query.toLowerCase().trim();
  if (!q) return null;
  var i, k;

  for (i = 0; i < KB.length; i++){
    if (KB[i].key === q) return KB[i];
  }
  for (i = 0; i < KB.length; i++){
    if (KB[i].keywords && KB[i].keywords.indexOf(q) !== -1) return KB[i];
  }
  for (i = 0; i < KB.length; i++){
    if (KB[i].key.indexOf(q) !== -1 || q.indexOf(KB[i].key) !== -1) return KB[i];
  }
  for (i = 0; i < KB.length; i++){
    if (KB[i].keywords){
      for (k = 0; k < KB[i].keywords.length; k++){
        var kw = KB[i].keywords[k];
        if (kw.indexOf(q) !== -1 || q.indexOf(kw) !== -1) return KB[i];
      }
    }
  }
  return null;
}


/* ==========================================================
   5. РЕНДЕР
   ========================================================== */
function renderResult(entry){
  var catNames = { html:'HTML', css:'CSS', js:'JavaScript', git:'Git', general:'Общее' };
  var catName = catNames[entry.cat] || 'Общее';

  var html = '<div class="panel">';

  // Заголовок
  html += '<div class="panel-head">';
  html +=   '<div>';
  html +=     '<div class="panel-cat ' + entry.cat + '">' + catName + '</div>';
  html +=     '<div class="panel-title">' + esc(entry.title) + '</div>';
  html +=     '<div class="panel-sub">' + esc(entry.sub || '') + '</div>';
  html +=   '</div>';
  html +=   '<button class="close-btn" id="closeBtn">закрыть</button>';
  html += '</div>';

  // Что это
  html += '<div class="block">';
  html +=   '<div class="block-label">что это</div>';
  html +=   '<div class="block-text">' + esc(entry.what) + '</div>';
  html += '</div>';

  // Синтаксис (если есть)
  if (entry.syntax){
    html += '<div class="block">';
    html +=   '<div class="block-label">синтаксис</div>';
    html +=   '<pre class="code">' + esc(entry.syntax) + '</pre>';
    html += '</div>';
  }

  // Пример (если есть)
  if (entry.code){
    html += '<div class="block">';
    html +=   '<div class="block-label">пример</div>';
    html +=   '<pre class="code">' + esc(entry.code) + '</pre>';
    html += '</div>';
  }

  // Когда использовать (список ситуаций)
  if (entry.when && entry.when.length){
    html += '<div class="block">';
    html +=   '<div class="block-label">когда использовать</div>';
    html +=   '<ul class="when-list">';
    for (var w = 0; w < entry.when.length; w++){
      html += '<li>' + esc(entry.when[w]) + '</li>';
    }
    html +=   '</ul>';
    html += '</div>';
  }

  // Аналогия
  if (entry.analogy){
    html += '<div class="block">';
    html +=   '<div class="block-label">аналогия</div>';
    html +=   '<div class="analogy">' + esc(entry.analogy) + '</div>';
    html += '</div>';
  }

  // Совет
  if (entry.note){
    html += '<div class="block">';
    html +=   '<div class="block-label">важно</div>';
    html +=   '<div class="note">' + esc(entry.note) + '</div>';
    html += '</div>';
  }

  // Мини-курс (если есть — теперь редко)
  if (entry.course && entry.course.length){
    html += '<div class="block">';
    html +=   '<div class="block-label">мини-курс</div>';
    html +=   '<div class="steps">';
    for (var i = 0; i < entry.course.length; i++){
      var s = entry.course[i];
      html += '<div class="step">';
      html +=   '<div class="step-num">шаг ' + (i + 1) + '</div>';
      html +=   '<div class="step-title">' + esc(s.title) + '</div>';
      html +=   '<div class="step-text">' + esc(s.text) + '</div>';
      html += '</div>';
    }
    html +=   '</div>';
    html += '</div>';
  }

  // Связанные
  if (entry.related && entry.related.length){
    html += '<div class="block">';
    html +=   '<div class="block-label">рядом по теме</div>';
    html +=   '<div class="related">';
    for (var j = 0; j < entry.related.length; j++){
      html += '<button class="related-tag" data-q="' + esc(entry.related[j]) + '">' + esc(entry.related[j]) + '</button>';
    }
    html +=   '</div>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}


/* ==========================================================
   6. ПОКАЗ
   ========================================================== */
var hero = $('hero');
var results = $('results');
var searchInput = $('searchInput');

function bindClose(){
  var btn = $('closeBtn');
  if (btn) btn.addEventListener('click', closeResult);

  var tags = results.querySelectorAll('.related-tag');
  for (var i = 0; i < tags.length; i++){
    tags[i].addEventListener('click', function(){
      searchInput.value = this.dataset.q;
      doSearch();
    });
  }
}

function showResult(entry){
  hero.classList.add('shrunk');
  results.classList.add('show');
  results.innerHTML = renderResult(entry);
  bindClose();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showNotFound(){
  hero.classList.add('shrunk');
  results.classList.add('show');
  results.innerHTML = renderNotFound();
  bindClose();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeResult(){
  hero.classList.remove('shrunk');
  results.classList.remove('show');
  results.innerHTML = '';
  searchInput.value = '';
  searchInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function doSearch(){
  var q = searchInput.value.trim();
  if (!q) return;
  var entry = find(q);
  if (entry) showResult(entry);
  else showNotFound();
}


/* ==========================================================
   7. СОБЫТИЯ + АВТОКОМПЛИТ
   ========================================================== */
$('searchBtn').addEventListener('click', doSearch);

var suggestBox = $('searchSuggest');
var sugActive = -1;          // активная подсказка (клавиатура)
var sugResults = [];         // текущий список
var sugClosedByBlur = false; // защита от клика по подсказке при blur

/* --- Поиск подходящих слов из KB --- */
function findSuggestions(query){
  var q = query.toLowerCase().trim();
  if (!q) return [];

  var out = [];
  for (var i = 0; i < KB.length; i++){
    var item = KB[i];
    if (!item.key) continue;

    var key = item.key.toLowerCase();
    var title = (item.title || '').toLowerCase();
    var keywords = item.keywords || [];

    var score = 0;
    // Начинается с запроса — самое релевантное
    if (key.indexOf(q) === 0) score = 100;
    else if (key.indexOf(q) > -1) score = 70;
    else if (title.indexOf(q) === 0) score = 60;
    else if (title.indexOf(q) > -1) score = 50;
    else {
      for (var k = 0; k < keywords.length; k++){
        var kw = keywords[k].toLowerCase();
        if (kw.indexOf(q) === 0){ score = 40; break; }
        if (kw.indexOf(q) > -1){ score = 25; break; }
      }
    }
    if (score > 0){
      out.push({ entry: item, score: score });
    }
  }

  // Сортируем по релевантности и обрезаем
  out.sort(function(a, b){ return b.score - a.score; });
  return out.slice(0, 8);
}

/* --- Отрисовка подсказок --- */
function renderSuggestions(query){
  sugActive = -1;
  var items = findSuggestions(query);

  if (!query.trim() || items.length === 0){
    hideSuggestions();
    return;
  }

  sugResults = items;
  var html = '';
  for (var i = 0; i < items.length; i++){
    var e = items[i].entry;
    var cat = e.cat || 'general';
    var catName = { html:'HTML', css:'CSS', js:'JS', git:'Git', general:'∞' }[cat] || cat;

    // Подсветка совпадающей части
    var key = e.key;
    var lowerKey = key.toLowerCase();
    var idx = lowerKey.indexOf(query.toLowerCase());
    var highlighted;
    if (idx > -1){
      highlighted =
        '<b>' + esc(key.slice(0, idx)) + '</b>' +
        '<u style="text-decoration:none;background:rgba(140,160,255,.25);padding:0 2px;border-radius:3px;">' +
        esc(key.slice(idx, idx + query.length)) + '</u>' +
        esc(key.slice(idx + query.length));
    } else {
      highlighted = '<b>' + esc(key) + '</b>';
    }

    var subtitle = e.sub ? '<span> — ' + esc(e.sub) + '</span>' : '';

    html += '<button class="sug-item" data-key="' + esc(e.key) + '" data-i="' + i + '">';
    html +=   '<span class="sug-key">' + highlighted + subtitle + '</span>';
    html +=   '<span class="sug-cat ' + cat + '">' + catName + '</span>';
    html += '</button>';
  }

  suggestBox.innerHTML = html;
  suggestBox.classList.add('show');

  // Клик по подсказке
  var btns = suggestBox.querySelectorAll('.sug-item');
  for (var b = 0; b < btns.length; b++){
    (function(btn){
      btn.addEventListener('mousedown', function(e){
        // mousedown, а не click — чтобы не сработал blur у input
        e.preventDefault();
        searchInput.value = btn.dataset.key;
        hideSuggestions();
        doSearch();
      });
    })(btns[b]);
  }
}

function hideSuggestions(){
  suggestBox.classList.remove('show');
  suggestBox.innerHTML = '';
  sugResults = [];
  sugActive = -1;
}

function setActiveSuggestion(i){
  var btns = suggestBox.querySelectorAll('.sug-item');
  if (!btns.length) return;
  if (i < 0) i = btns.length - 1;
  if (i >= btns.length) i = 0;

  for (var j = 0; j < btns.length; j++){
    btns[j].classList.toggle('active', j === i);
  }
  sugActive = i;

  // Прокрутить в видимую зону
  var active = btns[i];
  var boxRect = suggestBox.getBoundingClientRect();
  var btnRect = active.getBoundingClientRect();
  if (btnRect.bottom > boxRect.bottom){
    suggestBox.scrollTop += btnRect.bottom - boxRect.bottom + 6;
  }
  if (btnRect.top < boxRect.top){
    suggestBox.scrollTop -= boxRect.top - btnRect.top + 6;
  }
}

/* --- Ввод в поле --- */
searchInput.addEventListener('input', function(){
  renderSuggestions(searchInput.value);
});

/* --- Клавиатура --- */
searchInput.addEventListener('keydown', function(e){
  var suggestOpen = suggestBox.classList.contains('show');

  if (e.key === 'ArrowDown' && suggestOpen){
    e.preventDefault();
    setActiveSuggestion(sugActive + 1);
    return;
  }
  if (e.key === 'ArrowUp' && suggestOpen){
    e.preventDefault();
    setActiveSuggestion(sugActive - 1);
    return;
  }
  if (e.key === 'Enter'){
    if (suggestOpen && sugActive >= 0 && sugResults[sugActive]){
      e.preventDefault();
      searchInput.value = sugResults[sugActive].entry.key;
      hideSuggestions();
      doSearch();
      return;
    }
    hideSuggestions();
    doSearch();
    return;
  }
  if (e.key === 'Escape'){
    if (suggestOpen){
      hideSuggestions();
      return;
    }
    closeResult();
    return;
  }
  if (e.key === 'Tab' && suggestOpen && sugResults.length){
    e.preventDefault();
    setActiveSuggestion(sugActive + 1);
  }
});

/* --- Скрытие подсказок при клике вне --- */
document.addEventListener('click', function(e){
  if (!e.target.closest('.search-wrap')){
    hideSuggestions();
  }
});

/* --- При фокусе — показать подсказки, если есть что показать --- */
searchInput.addEventListener('focus', function(){
  if (searchInput.value.trim()){
    renderSuggestions(searchInput.value);
  }
});

/* --- Подсказки-чипы под полем --- */
var hints = document.querySelectorAll('.hint');
for (var i = 0; i < hints.length; i++){
  hints[i].addEventListener('click', function(){
    searchInput.value = this.dataset.q;
    hideSuggestions();
    doSearch();
  });
}

/* --- Открытие из карточки (related-tag) тоже скрывает подсказки --- */
var origDoSearch = doSearch;
doSearch = function(){
  hideSuggestions();
  origDoSearch();
};


/* ==========================================================
   8. ИНТРО-ЗАСТАВКА + ZOOM-IN
   ========================================================== */
(function(){
  var intro = document.getElementById('intro');
  var app = document.querySelector('.app');

  if (!intro){
    if (app) app.classList.add('zoom-in');
    return;
  }

  var introTime = 3400;

  setTimeout(function(){
    intro.classList.add('hide');

    setTimeout(function(){
      if (app) app.classList.add('zoom-in');
    }, 300);

    setTimeout(function(){
      if (intro.parentNode) intro.parentNode.removeChild(intro);
    }, 900);
  }, introTime);
})();



/* ==========================================================
   2c. ЕЩЁ БОЛЬШЕ ТЕМ (HTML / CSS / JS)
   У каждой — syntax (как писать) и when (когда использовать).
   ========================================================== */
var KB_MORE = [

  /* ============================================================
     HTML — ДОПОЛНИТЕЛЬНЫЕ ТЕГИ
     ============================================================ */
  {
    key: 'b',
    title: 'b',
    cat: 'html',
    sub: 'жирный без смысла',
    what: 'b — делает текст жирным, но не говорит «это важно». Просто визуальное выделение.',
    analogy: 'Как обвести слово карандашом: заметно, но смысла не добавило.',
    syntax: '<b>текст</b>',
    code: '<p>Обычный <b>жирный</b> текст.</p>',
    when: [
      'Когда нужно визуально выделить слово без смыслового акцента',
      'В дизайне, где жирный — часть оформления, а не содержания',
      'Названия в тексте, ключевые слова в интерфейсе'
    ],
    note: 'Для смыслового выделения используй strong. b — только внешний вид.',
    related: ['strong', 'i'],
    keywords: ['b','жирный','bold','выделение']
  },

  {
    key: 'i',
    title: 'i',
    cat: 'html',
    sub: 'курсив без смысла',
    what: 'i — курсив без смысловой нагрузки. Парный к em, но em — про акцент, i — про внешний вид.',
    analogy: 'Как наклонить буквы линейкой: красиво, но смысл не поменялся.',
    syntax: '<i>текст</i>',
    code: '<p>Обычный <i>курсивный</i> текст.</p>',
    when: [
      'Термины, названия, иностранные слова в тексте',
      'Иконки (раньше часто использовали i для иконок)',
      'Визуальный курсив без смыслового акцента'
    ],
    note: 'Для смыслового акцента — em. Для иконок сейчас лучше svg.',
    related: ['em', 'b'],
    keywords: ['i','курсив','italic']
  },

  {
    key: 'u',
    title: 'u',
    cat: 'html',
    sub: 'подчёркнутый текст',
    what: 'u — подчёркивает текст. Обычно используется для стилизации, реже — для смысла.',
    analogy: 'Как красная линия под словом в тетради.',
    syntax: '<u>текст</u>',
    code: '<p>Это <u>подчёркнутый</u> текст.</p>',
    when: [
      'Обозначение орфографических ошибок (как в редакторах)',
      'Стилизация ссылок, когда нужна нестандартная подача',
      'Китайские имена собственные (там u — стандарт)'
    ],
    note: 'Подчёркивание часто путают со ссылкой. Для ссылок — text-decoration: underline через CSS.',
    related: ['a', 's'],
    keywords: ['u','подчёркнутый','underline']
  },

  {
    key: 'small',
    title: 'small',
    cat: 'html',
    sub: 'мелкий текст',
    what: 'small — делает текст меньше. Обычно для сносок, приписок, копирайта.',
    analogy: 'Как мелкий шрифт в договоре — там где основное не главное.',
    syntax: '<small>текст</small>',
    code: '<p>Основной текст. <small>Мелкая сноска.</small></p>',
    when: [
      'Сноски, примечания',
      'Копирайт в подвале',
      'Юридические предупреждения'
    ],
    note: 'Размер можно переопределить через CSS. Смысл — «мелкое дополнение».',
    related: ['p', 'footer'],
    keywords: ['small','мелкий','сноска']
  },

  {
    key: 'code',
    title: 'code',
    cat: 'html',
    sub: 'код внутри текста',
    what: 'code — выделяет код внутри обычного текста. Обычно моноширинным шрифтом.',
    analogy: 'Как вставка кода в книгу: другой шрифт, чтобы отличалось.',
    syntax: '<code>код</code>',
    code: '<p>Используй <code>console.log()</code> для отладки.</p>',
    when: [
      'Названия функций, переменных, свойств в тексте',
      'Короткие команды в документации',
      'Ссылки на теги и атрибуты'
    ],
    note: 'Для больших блоков кода — pre + code вместе. code внутри p — для одного-двух слов.',
    related: ['pre', 'samp'],
    keywords: ['code','код','моноширинный']
  },

  {
    key: 'pre',
    title: 'pre',
    cat: 'html',
    sub: 'сохранённое форматирование',
    what: 'pre — показывает текст как есть, с пробелами и переносами. Без сжатия.',
    analogy: 'Как блокнот: сколько пробелов написал — столько и осталось.',
    syntax: '<pre>текст</pre>',
    code: '<pre>\nfunction hello() {\n  console.log("hi");\n}\n</pre>',
    when: [
      'Большие блоки кода',
      'ASCII-арт',
      'Текст, где важны отступы'
    ],
    note: 'pre сохраняет и пробелы, и переносы. Обычно ставят вместе с code: pre внутри содержит code.',
    related: ['code', 'br'],
    keywords: ['pre','форматирование','блок кода']
  },

  {
    key: 'blockquote',
    title: 'blockquote',
    cat: 'html',
    sub: 'цитата',
    what: 'blockquote — цитата. Обычно с отступом слева.',
    analogy: 'Как вынести слова другого человека отдельным абзацем.',
    syntax: '<blockquote>цитата</blockquote>',
    code: '<blockquote>\n  <p>Программирование — это искусство.</p>\n</blockquote>',
    when: [
      'Цитаты авторов, философов',
      'Высказывания в интервью',
      'Отзывы пользователей'
    ],
    note: 'Внутри blockquote обычно p. Атрибут cite — ссылка на источник.',
    related: ['q', 'p'],
    keywords: ['blockquote','цитата','отступ']
  },

  {
    key: 'iframe',
    title: 'iframe',
    cat: 'html',
    sub: 'встроенное окно на странице',
    what: 'iframe — тег, который встраивает другую страницу внутрь твоей. YouTube-плеер, карта, форма.',
    analogy: 'Как окно в стену: ты видишь, что за ней, но стена своя.',
    syntax: '<iframe src="адрес" width="..." height="..."></iframe>',
    code: '<iframe src="https://www.youtube.com/embed/VIDEO_ID"\n        width="560" height="315"></iframe>',
    when: [
      'Вставить видео с YouTube',
      'Показать карту с Google Maps',
      'Встроить форму оплаты или виджет'
    ],
    note: 'iframe грузит чужую страницу — может тормозить сайт. Не ставь много сразу. Атрибут sandbox ограничивает возможности содержимого.',
    related: ['video', 'embed'],
    keywords: ['iframe','встроить','youtube','карта']
  },

  {
    key: 'details',
    title: 'details',
    cat: 'html',
    sub: 'раскрывающийся блок',
    what: 'details — контейнер, который раскрывается по клику. Внутри — summary (заголовок) и содержимое.',
    analogy: 'Как папка с файлами: щёлкнул — открылась.',
    syntax: '<details>\n  <summary>Заголовок</summary>\n  Содержимое\n</details>',
    code: '<details>\n  <summary>Что такое HTML?</summary>\n  <p>Это язык разметки.</p>\n</details>',
    when: [
      'FAQ — частые вопросы',
      'Дополнительная информация, спрятанная по умолчанию',
      'Технические детали, которые не всем нужны'
    ],
    note: 'Работает без JS и без CSS. Атрибут open — раскрыт по умолчанию.',
    related: ['summary', 'section'],
    keywords: ['details','раскрывающийся','аккордеон','faq']
  },

  {
    key: 'summary',
    title: 'summary',
    cat: 'html',
    sub: 'заголовок details',
    what: 'summary — видимый заголовок раскрывающегося блока. Клик по нему открывает содержимое.',
    analogy: 'Как заголовок папки в проводнике.',
    syntax: '<details>\n  <summary>Кликни меня</summary>\n  ...\n</details>',
    code: '<details>\n  <summary>Показать ответ</summary>\n  <p>Ответ...</p>\n</details>',
    when: [
      'Всегда — внутри details',
      'Когда нужен заголовок-переключатель'
    ],
    note: 'Без summary details покажет дефолтный «Details».',
    related: ['details'],
    keywords: ['summary','заголовок','details']
  },

  {
    key: 'figure',
    title: 'figure',
    cat: 'html',
    sub: 'иллюстрация с подписью',
    what: 'figure — контейнер для картинки, схемы, кода, которые идут с подписью.',
    analogy: 'Как рамка с фотографией и подписью под ней.',
    syntax: '<figure>\n  <img src="...">\n  <figcaption>Подпись</figcaption>\n</figure>',
    code: '<figure>\n  <img src="cat.jpg" alt="кот">\n  <figcaption>Рыжий кот спит</figcaption>\n</figure>',
    when: [
      'Картинка с подписью',
      'Диаграмма с пояснением',
      'Блок кода с описанием'
    ],
    note: 'figcaption — подпись. Идёт первым или последним внутри figure.',
    related: ['figcaption', 'img'],
    keywords: ['figure','иллюстрация','подпись']
  },

  {
    key: 'figcaption',
    title: 'figcaption',
    cat: 'html',
    sub: 'подпись к figure',
    what: 'figcaption — текстовая подпись внутри figure. Обычно под картинкой.',
    analogy: 'Как подпись под фотографией в газете.',
    syntax: '<figcaption>Подпись</figcaption>',
    code: '<figure>\n  <img src="x.jpg" alt="...">\n  <figcaption>Схема работы</figcaption>\n</figure>',
    when: [
      'Всегда внутри figure',
      'Когда нужно объяснить, что на картинке'
    ],
    note: 'Может быть до или после img. Разницы нет, но обычно после.',
    related: ['figure'],
    keywords: ['figcaption','подпись','figure']
  },

  {
    key: 'time',
    title: 'time',
    cat: 'html',
    sub: 'дата или время',
    what: 'time — тег для даты и времени. Помогает поисковикам и календарям понять, что это дата.',
    analogy: 'Как ярлык на письме: «отправлено 15 марта».',
    syntax: '<time datetime="2026-03-15">15 марта 2026</time>',
    code: '<p>Опубликовано <time datetime="2026-03-15">15 марта</time></p>',
    when: [
      'Даты публикации статей',
      'Расписания и события',
      'Любая дата в тексте'
    ],
    note: 'datetime в формате YYYY-MM-DD. Видимый текст может быть любым.',
    related: ['p', 'article'],
    keywords: ['time','дата','время']
  },

  /* ============================================================
     CSS — ДОПОЛНИТЕЛЬНЫЕ СВОЙСТВА
     ============================================================ */
  {
    key: 'width',
    title: 'width',
    cat: 'css',
    sub: 'ширина элемента',
    what: 'width — задаёт ширину элемента. В px, %, rem, vw.',
    analogy: 'Ширина коробки.',
    syntax: '.box { width: 300px; }',
    code: '.card {\n  width: 100%;\n  max-width: 400px;\n}',
    when: [
      'Фиксированная ширина блока',
      'Резиновая ширина через %',
      'Ограничение через max-width'
    ],
    note: 'По умолчанию блок занимает всю ширину родителя. width явно уменьшает.',
    related: ['height', 'max-width'],
    keywords: ['width','ширина','размер']
  },

  {
    key: 'height',
    title: 'height',
    cat: 'css',
    sub: 'высота элемента',
    what: 'height — задаёт высоту. Обычно не ставят — пусть подстраивается под содержимое.',
    analogy: 'Высота коробки.',
    syntax: '.box { height: 200px; }',
    code: '.hero {\n  height: 100vh;\n}',
    when: [
      'Hero-блоки на всю высоту экрана',
      'Карточки с фиксированной высотой',
      'Изображения'
    ],
    note: 'Фиксированная height часто ломает вёрстку — контент может не помещаться. Используй min-height.',
    related: ['width', 'min-height'],
    keywords: ['height','высота','размер']
  },

  {
    key: 'max-width',
    title: 'max-width',
    cat: 'css',
    sub: 'максимальная ширина',
    what: 'max-width — ограничивает ширину сверху. На узких экранах элемент станет меньше.',
    analogy: 'Как ремень: растягивается, но не больше заданного.',
    syntax: '.container { max-width: 1200px; }',
    code: '.container {\n  max-width: 1200px;\n  margin: 0 auto;\n}',
    when: [
      'Центрирование контента на широких экранах',
      'Адаптивная вёрстка без media-запросов',
      'Ограничение ширины текста для чтения'
    ],
    note: 'max-width + margin: 0 auto — классика центрирования блока.',
    related: ['width', 'margin'],
    keywords: ['max-width','максимум','ограничение']
  },

  {
    key: 'cursor',
    title: 'cursor',
    cat: 'css',
    sub: 'вид курсора над элементом',
    what: 'cursor — какой курсор показывать при наведении.',
    analogy: 'Какую иконку показывает мышь: стрелку, руку, палочку.',
    syntax: 'cursor: pointer;',
    code: '.btn {\n  cursor: pointer;\n}',
    when: [
      'Кнопки — pointer (рука)',
      'Текст — text (палочка)',
      'Запрещённые действия — not-allowed'
    ],
    note: 'pointer — самый частый. Ставь на всё кликабельное, иначе пользователь не поймёт.',
    related: ['hover', 'button'],
    keywords: ['cursor','курсор','pointer']
  },

  {
    key: 'opacity',
    title: 'opacity',
    cat: 'css',
    sub: 'прозрачность элемента',
    what: 'opacity — прозрачность от 0 (невидимо) до 1 (полностью видно).',
    analogy: 'Как прозрачность стекла: 0 — нет стекла, 1 — плотное.',
    syntax: 'opacity: 0.5;',
    code: '.overlay {\n  opacity: 0.7;\n}',
    when: [
      'Полупрозрачные подложки',
      'Анимации появления',
      'Состояние disabled'
    ],
    note: 'opacity влияет на весь элемент — и на текст, и на фон. Для прозрачного только фона — rgba().',
    related: ['rgba', 'hover'],
    keywords: ['opacity','прозрачность','альфа']
  },

  {
    key: 'visibility',
    title: 'visibility',
    cat: 'css',
    sub: 'видимость (скрыть, оставив место)',
    what: 'visibility: hidden — элемент невидим, но место занимает.',
    analogy: 'Как призрак: не видно, но место в очереди занято.',
    syntax: 'visibility: hidden;',
    code: '.hidden {\n  visibility: hidden;\n}',
    when: [
      'Скрыть элемент, но оставить его место в вёрстке',
      'Плавные появления через transition'
    ],
    note: 'Разница с display: none — display убирает и место. visibility оставляет.',
    related: ['display', 'opacity'],
    keywords: ['visibility','невидимость','скрыть']
  },

  {
    key: 'letter-spacing',
    title: 'letter-spacing',
    cat: 'css',
    sub: 'расстояние между буквами',
    what: 'letter-spacing — увеличивает или уменьшает пробел между буквами.',
    analogy: 'Как воздух между буквами в заголовке.',
    syntax: 'letter-spacing: 2px;',
    code: '.title {\n  letter-spacing: 0.05em;\n}',
    when: [
      'Разреженные заголовки',
      'Стилизация логотипа',
      'Улучшение читаемости строчных букв'
    ],
    note: 'В отрицательных значениях буквы слипаются — полезно для крупных заголовков.',
    related: ['text-transform', 'font-size'],
    keywords: ['letter-spacing','буквы','трекинг']
  },

  {
    key: 'text-decoration',
    title: 'text-decoration',
    cat: 'css',
    sub: 'подчёркивание и прочее',
    what: 'text-decoration — оформление текста линиями: подчёркивание, зачёркивание, надчёркивание.',
    analogy: 'Как линии под или через текст.',
    syntax: 'text-decoration: underline;',
    code: '.link {\n  text-decoration: none;\n}\n.strike {\n  text-decoration: line-through;\n}',
    when: [
      'Убрать подчёркивание у ссылок',
      'Зачёркнутый текст (цена со скидкой)',
      'Выделение'
    ],
    note: 'text-decoration: none убирает подчёркивание ссылок. line-through — зачёркивание.',
    related: ['color', 'hover'],
    keywords: ['text-decoration','подчёркивание','underline','line-through']
  },

  {
    key: 'text-transform',
    title: 'text-transform',
    cat: 'css',
    sub: 'регистр букв',
    what: 'text-transform — меняет регистр: всё заглавными, всё строчными, каждое слово с большой.',
    analogy: 'Как переключатель «Caps Lock» для элемента.',
    syntax: 'text-transform: uppercase;',
    code: '.label {\n  text-transform: uppercase;\n  letter-spacing: 0.1em;\n}',
    when: [
      'Метки и подписи — uppercase',
      'Кнопки, где текст всегда заглавный',
      'Имена и заголовки — capitalize'
    ],
    note: 'Только визуально. В HTML текст остаётся как написан.',
    related: ['letter-spacing', 'font-weight'],
    keywords: ['text-transform','uppercase','регистр','caps']
  },

  {
    key: 'line-height',
    title: 'line-height',
    cat: 'css',
    sub: 'высота строки',
    what: 'line-height — расстояние между строками текста. Обычно без единиц: множитель.',
    analogy: 'Как межстрочный интервал в тетради.',
    syntax: 'line-height: 1.5;',
    code: 'p {\n  line-height: 1.6;\n}',
    when: [
      'Улучшение читаемости текста',
      'Заголовки — меньше, 1.1–1.2',
      'Параграфы — 1.5–1.7'
    ],
    note: 'Без единиц — множитель от размера шрифта. Это правильнее, чем px.',
    related: ['font-size', 'text-align'],
    keywords: ['line-height','межстрочный','интерлиньяж']
  },

  {
    key: 'flex-direction',
    title: 'flex-direction',
    cat: 'css',
    sub: 'ряд или колонка во flex',
    what: 'flex-direction — меняет направление flex: строка или колонка.',
    analogy: 'Как расставить стулья: в ряд или друг за другом.',
    syntax: 'flex-direction: row | column;',
    code: '.menu {\n  display: flex;\n  flex-direction: column;\n}',
    when: [
      'Меню на телефоне — колонка',
      'Меню на компьютере — строка',
      'Форма с полями друг под другом'
    ],
    note: 'По умолчанию row. При column — justify-content работает по вертикали.',
    related: ['flex', 'justify-content'],
    keywords: ['flex-direction','направление','колонка']
  },

  {
    key: 'flex-wrap',
    title: 'flex-wrap',
    cat: 'css',
    sub: 'перенос элементов',
    what: 'flex-wrap — разрешает элементам переноситься на новую строку, если не влезают.',
    analogy: 'Как слова в тексте: не влезло — перейди на новую строку.',
    syntax: 'flex-wrap: wrap;',
    code: '.tags {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n}',
    when: [
      'Теги, которые не влезают в одну строку',
      'Карточки товаров',
      'Адаптив без media-запросов'
    ],
    note: 'По умолчанию nowrap — элементы сжимаются. wrap разрешает перенос.',
    related: ['flex', 'gap'],
    keywords: ['flex-wrap','перенос','wrap']
  },

  {
    key: 'align-self',
    title: 'align-self',
    cat: 'css',
    sub: 'выравнивание одного элемента',
    what: 'align-self — выравнивает конкретный элемент во flex, переопределяя align-items родителя.',
    analogy: 'Один пассажир решил сесть не как все.',
    syntax: 'align-self: center;',
    code: '.item {\n  align-self: flex-end;\n}',
    when: [
      'Один элемент выбивается из общего ряда',
      'Прижать конкретную кнопку к низу',
      'Уникальное поведение в flex-контейнере'
    ],
    note: 'Работает только внутри flex-контейнера, на самом ребёнке.',
    related: ['align-items', 'flex'],
    keywords: ['align-self','выравнивание','элемент']
  },

  {
    key: 'order',
    title: 'order',
    cat: 'css',
    sub: 'порядок элемента во flex',
    what: 'order — меняет порядок отображения элементов во flex, не меняя HTML.',
    analogy: 'Как переставить книги на полке, не переписывая названия.',
    syntax: 'order: 2;',
    code: '.item {\n  order: -1;\n}',
    when: [
      'Переставить элемент вперёд или назад',
      'На телефоне показать один блок выше другого',
      'Приоритетный элемент в меню'
    ],
    note: 'По умолчанию order: 0. Меньше — раньше, больше — позже. Не меняет HTML — важно для доступности.',
    related: ['flex', 'flex-direction'],
    keywords: ['order','порядок','очередь']
  },

  {
    key: 'animation',
    title: 'animation',
    cat: 'css',
    sub: 'анимация по ключевым кадрам',
    what: 'animation — запускает анимацию, описанную в @keyframes. Работает сама, без действий пользователя.',
    analogy: 'Как мультик: кадры сменяют друг друга по расписанию.',
    syntax: 'animation: имя_анимации 2s ease infinite;',
    code: '@keyframes pulse {\n  0%, 100% { transform: scale(1); }\n  50% { transform: scale(1.1); }\n}\n.dot {\n  animation: pulse 2s infinite;\n}',
    when: [
      'Пульсирующие индикаторы',
      'Плавное появление элементов',
      'Бесконечные анимации'
    ],
    note: 'transition — реакция на событие. animation — работает сама. Не путай.',
    related: ['@keyframes', 'transition'],
    keywords: ['animation','анимация','ключевые кадры']
  },

  {
    key: '@keyframes',
    title: '@keyframes',
    cat: 'css',
    sub: 'описание анимации',
    what: '@keyframes — блок, где описываются шаги анимации: от 0% до 100%.',
    analogy: 'Раскадровка мультфильма: что в начале, что в середине, что в конце.',
    syntax: '@keyframes имя {\n  0% { }\n  100% { }\n}',
    code: '@keyframes fadeIn {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}',
    when: [
      'Любая сложная анимация',
      'Появление, исчезновение, вращение',
      'Всё, что длиннее одного перехода'
    ],
    note: 'from = 0%, to = 100%. Можно использовать промежуточные проценты.',
    related: ['animation', 'transform'],
    keywords: ['keyframes','кадры','анимация']
  },

  {
    key: 'place-items',
    title: 'place-items',
    cat: 'css',
    sub: 'центрирование в grid',
    what: 'place-items — сокращение для align-items + justify-items. Центрирует содержимое в grid.',
    analogy: 'Как посадить гостя ровно в центр стула.',
    syntax: 'place-items: center;',
    code: '.hero {\n  display: grid;\n  place-items: center;\n  min-height: 100vh;\n}',
    when: [
      'Центрирование одного элемента по обеим осям',
      'Hero-блоки',
      'Обёртки для иконок'
    ],
    note: 'Одна строка вместо двух. Работает и в grid, и в flex (в новых браузерах).',
    related: ['grid', 'align-items'],
    keywords: ['place-items','центр','grid']
  },

  {
    key: 'object-fit',
    title: 'object-fit',
    cat: 'css',
    sub: 'как вписать картинку',
    what: 'object-fit — как картинка вписывается в заданные width/height: обрезать, растянуть, вписать.',
    analogy: 'Как вставить фото в рамку: обрезать по краям или вписать целиком.',
    syntax: 'object-fit: cover;',
    code: '.avatar {\n  width: 100px;\n  height: 100px;\n  object-fit: cover;\n  border-radius: 50%;\n}',
    when: [
      'Аватары одинакового размера',
      'Карточки с превью',
      'Галереи'
    ],
    note: 'cover — заполнить с обрезкой. contain — вписать целиком с пустотами. fill — растянуть.',
    related: ['img', 'width'],
    keywords: ['object-fit','картинка','cover']
  },

  {
    key: 'grid-column',
    title: 'grid-column',
    cat: 'css',
    sub: 'растянуть по колонкам',
    what: 'grid-column — сколько колонок займёт элемент в grid.',
    analogy: 'Как объединить ячейки в таблице.',
    syntax: 'grid-column: 1 / 3;',
    code: '.item {\n  grid-column: span 2;\n}',
    when: [
      'Заголовок на всю ширину сетки',
      'Элемент, который занимает 2 колонки',
      'Сложные раскладки'
    ],
    note: 'span 2 — занять 2 колонки. 1 / 3 — от первой до третьей линии.',
    related: ['grid', 'grid-row'],
    keywords: ['grid-column','колонка','span']
  },

  {
    key: 'grid-row',
    title: 'grid-row',
    cat: 'css',
    sub: 'растянуть по строкам',
    what: 'grid-row — сколько строк займёт элемент в grid.',
    analogy: 'Как объединить ячейки по вертикали.',
    syntax: 'grid-row: span 2;',
    code: '.item {\n  grid-row: span 2;\n}',
    when: [
      'Высокий элемент в сетке',
      'Баннер сбоку',
      'Сложные layouts'
    ],
    note: 'Парный к grid-column. Вместе дают полный контроль над ячейкой.',
    related: ['grid', 'grid-column'],
    keywords: ['grid-row','строка','span']
  },

  /* ============================================================
     JS — ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ И СВОЙСТВА
     ============================================================ */
  {
    key: 'slice',
    title: 'slice',
    cat: 'js',
    sub: 'взять часть строки или массива',
    what: 'slice — вырезает кусок из строки или массива и возвращает новый. Исходное не меняет.',
    analogy: 'Как отрезать кусок пиццы, не тронув остальное.',
    syntax: 'arr.slice(от, до)',
    code: 'const s = "JavaScript";\ns.slice(0, 4);   // "Java"\ns.slice(4);      // "Script"\ns.slice(-6);     // "Script"',
    when: [
      'Получить первые N символов',
      'Обрезать строку с конца',
      'Скопировать часть массива'
    ],
    note: 'Второй индекс не включается. Отрицательные — с конца. Исходное не меняется.',
    related: ['splice', 'substring'],
    keywords: ['slice','отрезать','часть','кусок']
  },

  {
    key: 'splice',
    title: 'splice',
    cat: 'js',
    sub: 'вставить или удалить в массиве',
    what: 'splice — вставляет, удаляет или заменяет элементы массива. Меняет исходный массив.',
    analogy: 'Как редактор списка: удалить строчку, вставить новую.',
    syntax: 'arr.splice(от, сколько_удалить, что_вставить)',
    code: 'const arr = [1, 2, 3, 4];\narr.splice(1, 2);      // [1, 4]\narr.splice(1, 0, 9);   // вставит 9',
    when: [
      'Удалить элемент из массива по индексу',
      'Вставить новый в середину',
      'Заменить сразу несколько'
    ],
    note: 'В отличие от slice — меняет исходный массив. Возвращает массив удалённых.',
    related: ['slice', 'pop'],
    keywords: ['splice','удалить','вставить','массив']
  },

  {
    key: 'split',
    title: 'split',
    cat: 'js',
    sub: 'разбить строку на массив',
    what: 'split — разбивает строку по разделителю и возвращает массив частей.',
    analogy: 'Как порезать строку ножницами по запятым.',
    syntax: 'str.split(разделитель)',
    code: '"a,b,c".split(",");     // ["a","b","c"]\n"hello".split("");       // ["h","e","l","l","o"]',
    when: [
      'Разобрать CSV-строку',
      'Разбить текст на слова',
      'Разбить строку по символу'
    ],
    note: 'split + join — классическая пара для замены частей строки.',
    related: ['join', 'slice'],
    keywords: ['split','разбить','строка']
  },

  {
    key: 'join',
    title: 'join',
    cat: 'js',
    sub: 'склеить массив в строку',
    what: 'join — склеивает элементы массива в строку через разделитель.',
    analogy: 'Как собрать бусины на нитку.',
    syntax: 'arr.join(разделитель)',
    code: '["a","b","c"].join(", ");   // "a, b, c"\n["a","b"].join("");        // "ab"',
    when: [
      'Собрать строку из массива',
      'Показать список через запятую',
      'Собрать HTML-разметку из массива'
    ],
    note: 'По умолчанию разделитель — запятая. join("") склеит без него.',
    related: ['split', 'map'],
    keywords: ['join','склеить','массив','строка']
  },

  {
    key: 'includes',
    title: 'includes',
    cat: 'js',
    sub: 'есть ли элемент',
    what: 'includes — проверяет, есть ли в массиве или строке нужный элемент. Возвращает true/false.',
    analogy: 'Как спросить: «а этот есть в списке?»',
    syntax: 'arr.includes(значение)',
    code: '["a","b"].includes("a");     // true\n"hello".includes("ll");    // true',
    when: [
      'Проверить наличие элемента',
      'Проверить подстроку',
      'Условие в if'
    ],
    note: 'includes работает и для массивов, и для строк. Возвращает булево.',
    related: ['indexOf', 'find'],
    keywords: ['includes','наличие','содержит','есть ли']
  },

  {
    key: 'indexOf',
    title: 'indexOf',
    cat: 'js',
    sub: 'найти позицию элемента',
    what: 'indexOf — возвращает индекс первого вхождения. Если нет — вернёт -1.',
    analogy: 'Как узнать, на какой полке лежит книга.',
    syntax: 'arr.indexOf(значение)',
    code: '["a","b","c"].indexOf("b");   // 1\n["a","b"].indexOf("z");       // -1',
    when: [
      'Найти позицию элемента',
      'Проверить наличие через -1',
      'Найти индекс для дальнейшей работы'
    ],
    note: 'Если -1 — элемента нет. Для поиска объекта используй findIndex.',
    related: ['includes', 'find'],
    keywords: ['indexof','позиция','индекс','найти']
  },

  {
    key: 'Math.random',
    title: 'Math.random',
    cat: 'js',
    sub: 'случайное число от 0 до 1',
    what: 'Math.random — возвращает случайное число от 0 (включительно) до 1 (не включительно).',
    analogy: 'Как бросок кубика, только результат — дробное число.',
    syntax: 'Math.random()',
    code: 'Math.random();                    // 0.7231...\nMath.floor(Math.random() * 10);   // 0..9\nMath.floor(Math.random() * 100) + 1; // 1..100',
    when: [
      'Случайный выбор из массива',
      'Игры, лотереи',
      'Случайные цвета, шутки, факты'
    ],
    note: 'Чтобы получить целое в диапазоне — Math.floor(Math.random() * N). Для от 1 до N — +1 в конце.',
    related: ['Math.floor', 'массив'],
    keywords: ['random','случайный','Math','рандом']
  },

  {
    key: 'Math.floor',
    title: 'Math.floor',
    cat: 'js',
    sub: 'округлить вниз',
    what: 'Math.floor — округляет число вниз до ближайшего целого.',
    analogy: 'Как обрезать копейки: 5.9 → 5.',
    syntax: 'Math.floor(число)',
    code: 'Math.floor(4.9);   // 4\nMath.floor(-1.5);  // -2',
    when: [
      'Получить целое из дробного',
      'Случайные целые',
      'Индексы массивов'
    ],
    note: 'Math.round округляет к ближайшему. Math.ceil — вверх. Math.floor — вниз.',
    related: ['Math.random', 'Math.round'],
    keywords: ['floor','округлить','вниз','Math']
  },

  {
    key: 'parseInt',
    title: 'parseInt',
    cat: 'js',
    sub: 'превратить строку в целое',
    what: 'parseInt — превращает строку в целое число. Отбрасывает всё после первого нечислового символа.',
    analogy: 'Как выжать из строки только цифры.',
    syntax: 'parseInt("42")',
    code: 'parseInt("42");       // 42\nparseInt("42px");     // 42\nparseInt("abc");      // NaN',
    when: [
      'Получить число из поля ввода',
      'Работа с параметрами в URL',
      'Преобразование строк в числа'
    ],
    note: 'Если строка не число — вернёт NaN. Для дробных — parseFloat.',
    related: ['Number', 'toString'],
    keywords: ['parseint','строка','число','преобразовать']
  },

  {
    key: 'toString',
    title: 'toString',
    cat: 'js',
    sub: 'превратить в строку',
    what: 'toString — превращает число или объект в строку.',
    analogy: 'Как переодеть число в форму строки.',
    syntax: 'число.toString()',
    code: '(42).toString();     // "42"\n(3.14).toString();   // "3.14"',
    when: [
      'Сцепить число со строкой',
      'Сохранить в localStorage',
      'Вывести в textContent'
    ],
    note: 'Проще использовать String(число) — работает так же.',
    related: ['parseInt', 'String'],
    keywords: ['tostring','строка','преобразовать']
  },

  {
    key: 'toFixed',
    title: 'toFixed',
    cat: 'js',
    sub: 'оставить N знаков после точки',
    what: 'toFixed — округляет число до N знаков после запятой. Возвращает строку.',
    analogy: 'Как обрезать лишние нули в цене: 99.9 → 99.90.',
    syntax: 'число.toFixed(2)',
    code: '(3.14159).toFixed(2);   // "3.14"\n(5).toFixed(2);         // "5.00"',
    when: [
      'Показ цен, курсов, процентов',
      'Округление для отображения',
      'Единообразный вывод чисел'
    ],
    note: 'Возвращает строку, не число. Если нужно число — Number(x.toFixed(2)).',
    related: ['Math.round', 'toString'],
    keywords: ['tofixed','знаки','округление','дробь']
  },

  {
    key: 'JSON.parse',
    title: 'JSON.parse',
    cat: 'js',
    sub: 'из строки в объект',
    what: 'JSON.parse — превращает JSON-строку в объект или массив.',
    analogy: 'Как распаковать посылку: была строка — стал объект.',
    syntax: 'JSON.parse(строка)',
    code: 'const obj = JSON.parse(\'{"name":"Иван"}\');\nobj.name; // "Иван"',
    when: [
      'Прочитать данные из localStorage',
      'Обработать ответ API',
      'Распарсить конфиг'
    ],
    note: 'Если строка невалидный JSON — будет ошибка. Оборачивай в try/catch.',
    related: ['JSON.stringify', 'localStorage'],
    keywords: ['json.parse','распарсить','объект']
  },

  {
    key: 'JSON.stringify',
    title: 'JSON.stringify',
    cat: 'js',
    sub: 'из объекта в строку',
    what: 'JSON.stringify — превращает объект или массив в JSON-строку.',
    analogy: 'Как упаковать вещи в коробку для отправки.',
    syntax: 'JSON.stringify(объект)',
    code: 'JSON.stringify({name:"Иван"});\n// \'{"name":"Иван"}\'',
    when: [
      'Сохранить объект в localStorage',
      'Отправить данные на сервер через fetch',
      'Сделать копию через строку'
    ],
    note: 'Функции и undefined теряются. Циклические ссылки вызовут ошибку.',
    related: ['JSON.parse', 'localStorage'],
    keywords: ['json.stringify','объект','строка']
  },

  {
    key: 'localStorage',
    title: 'localStorage',
    cat: 'js',
    sub: 'хранилище в браузере',
    what: 'localStorage — встроенное в браузер хранилище. Данные сохраняются между сессиями, но остаются только на этом устройстве.',
    analogy: 'Как личный ящик стола: только ты туда положишь и достанешь.',
    syntax: 'localStorage.setItem("ключ", "значение")',
    code: 'localStorage.setItem("name", "Иван");\nlocalStorage.getItem("name");     // "Иван"\nlocalStorage.removeItem("name");\nlocalStorage.clear();',
    when: [
      'Сохранить прогресс, настройки, черновики',
      'Локальная авторизация',
      'Запомнить выбор пользователя'
    ],
    note: 'Хранит только строки. Для объектов — JSON.stringify / JSON.parse. Лимит ~5MB.',
    related: ['JSON.stringify', 'JSON.parse'],
    keywords: ['localstorage','хранилище','память','сохранить']
  },

  {
    key: 'setTimeout',
    title: 'setTimeout',
    cat: 'js',
    sub: 'выполнить один раз через N мс',
    what: 'setTimeout — выполняет функцию один раз через указанное количество миллисекунд.',
    analogy: 'Как будильник: поставь на 5 секунд — зазвенит через 5 секунд.',
    syntax: 'setTimeout(функция, миллисекунды)',
    code: 'setTimeout(() => {\n  console.log("через 2 секунды");\n}, 2000);',
    when: [
      'Задержка перед действием',
      'Автоскрытие уведомлений',
      'Отложенная отрисовка'
    ],
    note: '1000 мс = 1 секунда. Возвращает id, можно отменить через clearTimeout.',
    related: ['setInterval', 'clearTimeout'],
    keywords: ['settimeout','задержка','таймаут','пауза']
  },

  {
    key: 'setInterval',
    title: 'setInterval',
    cat: 'js',
    sub: 'выполнять каждые N мс',
    what: 'setInterval — запускает функцию регулярно через равные промежутки времени.',
    analogy: 'Как метроном: тикает каждую секунду, и так бесконечно.',
    syntax: 'setInterval(функция, миллисекунды)',
    code: 'const id = setInterval(() => {\n  console.log("каждые 2 сек");\n}, 2000);\n\nclearInterval(id); // остановить',
    when: [
      'Часы, таймеры',
      'Обновление данных раз в N секунд',
      'Пульсация, анимация'
    ],
    note: 'Всегда сохраняй id и очищай через clearInterval, когда не нужен — иначе утечка памяти.',
    related: ['setTimeout', 'clearInterval'],
    keywords: ['setinterval','интервал','повторять','периодически']
  },

  {
    key: 'Array.from',
    title: 'Array.from',
    cat: 'js',
    sub: 'сделать массив из чего угодно',
    what: 'Array.from — превращает что угодно в массив: строку, NodeList, объект с длиной.',
    analogy: 'Как универсальный переходник: что угодно — в массив.',
    syntax: 'Array.from(что_угодно)',
    code: 'Array.from("abc");             // ["a","b","c"]\nArray.from(document.querySelectorAll("p")); // массив',
    when: [
      'NodeList → массив (чтобы был forEach/map)',
      'Строка → массив символов',
      'Создать массив из диапазона'
    ],
    note: 'querySelectorAll возвращает NodeList — по нему можно forEach, но не map. Array.from решает.',
    related: ['querySelectorAll', 'массив'],
    keywords: ['array.from','массив','преобразовать']
  },

  {
    key: 'Object.keys',
    title: 'Object.keys',
    cat: 'js',
    sub: 'все ключи объекта',
    what: 'Object.keys — возвращает массив ключей объекта.',
    analogy: 'Как список фамилий в журнале.',
    syntax: 'Object.keys(объект)',
    code: 'const user = { name:"Иван", age:20 };\nObject.keys(user);  // ["name","age"]',
    when: [
      'Перебрать все ключи',
      'Посчитать количество свойств',
      'Проверить, что объект не пустой'
    ],
    note: 'Парные: Object.values (значения), Object.entries (пары ключ-значение).',
    related: ['Object.values', 'объект'],
    keywords: ['object.keys','ключи','объект']
  },

  {
    key: 'Object.values',
    title: 'Object.values',
    cat: 'js',
    sub: 'все значения объекта',
    what: 'Object.values — возвращает массив значений объекта.',
    analogy: 'Как список оценок без фамилий.',
    syntax: 'Object.values(объект)',
    code: 'Object.values({a:1, b:2});   // [1, 2]',
    when: [
      'Сумма всех значений',
      'Перебрать только значения',
      'Найти максимум'
    ],
    note: 'Парные: Object.keys, Object.entries.',
    related: ['Object.keys', 'объект'],
    keywords: ['object.values','значения','объект']
  },

  {
    key: 'Object.entries',
    title: 'Object.entries',
    cat: 'js',
    sub: 'пары ключ-значение',
    what: 'Object.entries — возвращает массив пар [ключ, значение].',
    analogy: 'Как журнал целиком: имя и оценка рядом.',
    syntax: 'Object.entries(объект)',
    code: 'Object.entries({a:1, b:2});\n// [["a",1], ["b",2]]',
    when: [
      'Перебрать объект с ключами и значениями',
      'Преобразовать объект в массив',
      'Сортировка по значениям'
    ],
    note: 'Часто используют с forEach или map: Object.entries(obj).forEach(([k,v]) => ...).',
    related: ['Object.keys', 'объект'],
    keywords: ['object.entries','пары','объект']
  },

  {
    key: 'класс',
    title: 'класс',
    cat: 'js',
    sub: 'шаблон для объектов',
    what: 'Класс — шаблон, по которому создаются объекты с одинаковой структурой и методами.',
    analogy: 'Как чертёж: по одному чертежу делаешь много одинаковых деталей.',
    syntax: 'class Имя {\n  constructor() { }\n  метод() { }\n}',
    code: 'class User {\n  constructor(name) {\n    this.name = name;\n  }\n  hi() {\n    return "Привет, " + this.name;\n  }\n}\n\nconst u = new User("Иван");\nu.hi(); // "Привет, Иван"',
    when: [
      'Много объектов с одинаковой структурой',
      'Игровые персонажи, товары, посты',
      'Работа с состоянием и методами'
    ],
    note: 'this внутри класса — сам объект. new — создать экземпляр. Наследование — extends.',
    related: ['объект', 'this'],
    keywords: ['класс','class','шаблон','чертёж']
  },

  {
    key: 'this',
    title: 'this',
    cat: 'js',
    sub: 'ссылка на текущий объект',
    what: 'this — ключевое слово, которое указывает на объект, в контексте которого выполняется код.',
    analogy: 'Как «я» в разговоре — зависит от того, кто говорит.',
    syntax: 'this.свойство',
    code: 'const user = {\n  name: "Иван",\n  hi() {\n    return "Привет, " + this.name;\n  }\n};\nuser.hi(); // "Привет, Иван"',
    when: [
      'Внутри методов объекта',
      'Внутри классов',
      'В обработчиках событий (осторожно)'
    ],
    note: 'В стрелочных функциях this берётся из внешнего контекста. В обычных — из того, как вызвана функция.',
    related: ['класс', 'объект'],
    keywords: ['this','контекст','объект','это']
  },

  {
    key: 'оператор spread',
    title: 'spread ...',
    cat: 'js',
    sub: 'развернуть массив или объект',
    what: 'spread — три точки перед массивом или объектом. Разворачивает его в отдельные элементы.',
    analogy: 'Как высыпать содержимое коробки на стол.',
    syntax: '[...массив]   { ...объект }',
    code: 'const a = [1, 2];\nconst b = [...a, 3, 4];   // [1, 2, 3, 4]\n\nconst u = { name:"Иван" };\nconst v = { ...u, age: 20 };',
    when: [
      'Скопировать массив или объект',
      'Добавить элементы',
      'Объединить несколько массивов'
    ],
    note: 'Копия поверхностная. Вложенные объекты не копируются — используй structuredClone.',
    related: ['оператор rest', 'массив', 'объект'],
    keywords: ['spread','...','развернуть','копия']
  },

  {
    key: 'оператор rest',
    title: 'rest ...',
    cat: 'js',
    sub: 'собрать оставшееся',
    what: 'rest — те же три точки, но в параметрах функции. Собирает все аргументы в массив.',
    analogy: 'Как собрать всё, что осталось на столе, в одну коробку.',
    syntax: 'function f(...args) { }',
    code: 'function sum(...nums) {\n  return nums.reduce((s, n) => s + n, 0);\n}\nsum(1, 2, 3); // 6',
    when: [
      'Функция принимает сколько угодно аргументов',
      'Собрать оставшиеся поля объекта',
      'Обёртки вокруг функций'
    ],
    note: 'В параметрах — rest (собирает). При вызове — spread (разворачивает). Один символ, разные роли.',
    related: ['оператор spread', 'function'],
    keywords: ['rest','...','собрать','аргументы']
  },

  {
    key: 'деструктуризация',
    title: 'деструктуризация',
    cat: 'js',
    sub: 'разобрать на переменные',
    what: 'Деструктуризация — способ вытащить значения из массива или объекта в отдельные переменные одной строкой.',
    analogy: 'Как разобрать сумку: достать ключи, кошелёк и телефон сразу.',
    syntax: 'const { a, b } = объект;\nconst [x, y] = массив;',
    code: 'const user = { name:"Иван", age: 20 };\nconst { name, age } = user;\n\nconst [first, second] = [1, 2, 3];',
    when: [
      'Получить несколько полей из объекта',
      'Взять первые элементы массива',
      'В параметрах функции'
    ],
    note: 'Работает и с массивами, и с объектами. Можно переименовать: const { name: n } = user.',
    related: ['объект', 'массив'],
    keywords: ['деструктуризация','разобрать','вытащить']
  }

];


/* Присоединяем к основной базе */
KB = KB.concat(KB_MORE);
