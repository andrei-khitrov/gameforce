/* GAMEFORCE — блоки по паспортам CASTING.md. Цифры механики — twitchrivals.com буквально
   (data/twitchrivals.com/_next/static/chunks/app/page-735015446402e80e.js), кривые и длительности — site.T. */
(function () {
  'use strict';
  var site = window.site;
  if (!site) return;

  site.boot(function (site) {
    var $ = site.$, $$ = site.$$, T = site.T, G = window.gsap, ST = window.ScrollTrigger;
    var STATIC = site.STATIC, RM = site.RM;
    var sig1 = T.sig(1), sig2 = T.sig(2), sig3 = T.sig(3);
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
    var map = function (v, a, b, c, d) { return c + (d - c) * clamp((v - a) / (b - a), 0, 1); };

    /* ── 00 · портал загрузки (astranova.world, _app-db4900d410b13240.js:329299, функция eS) ──
       Вход буквально: таймлайн delay .5; линии scaleY/scaleX 0→1 за 1.2 с с .2 (left — от верха, right — от низа, mid — от центра);
       текст yPercent 100→0 за .7 с .4; круг scale .5→1 + проявление за 1.2 с .4; логотип за 1.5 с .8; знаки кольца
       (две половины одновременно) opacity → 1 за 1 с, stagger .065, с 1.2 и заливка в акцент за 1.8 с; дуги 0→100 % за 1.8 с с 1.3;
       по окончании — смена текста (старый вверх за .7, новый снизу за .7 с задержкой .5). Кривая expo.out — подпись --sig-3.
       Выход как у донора по клику: кольцо, пунктир, средняя линия гаснут за .5; с .55 — фон круга прозрачный и круг гаснет
       за .75, фон портала прозрачный за 1, боковые линии гаснут за .5, шапка 0 → 1 за .5; первый экран въезжает y 4rem → 0
       за 1 с, stagger .035. Отличие от донора: вход сам через .8 с после «READY» (клик, клавиша, колесо — сразу);
       щит в центре на выходе растёт и тает — передаёт место 3D-щиту, который как раз начинает въезд. */
    var portal = $('[data-portal]'), portalDone = null, PORTAL = false;
    if (portal) {
      window.__gfPortalRun = true;
      if (STATIC) { portal.parentNode.removeChild(portal); document.documentElement.classList.remove('is-portal'); }
      else { PORTAL = true; portalDone = runPortal(); }
    }
    function runPortal() {
      var root = document.documentElement, q = function (sel) { return $(sel, portal); }, qa = function (sel) { return $$(sel, portal); };
      var E = sig3.ease, k = sig3.dur / 1.2, eOut = T.ease('--e-out');   // k = 1: длительности донора в долях подписи 1.2 с
      var inner = q('[data-portal-in]'), lineL = q('.portal__line--l'), lineR = q('.portal__line--r'), lineM = q('.portal__line--m');
      var cast = q('.portal__cast'), ready = q('.portal__ready'), circle = q('.portal__circle'), logo = q('.portal__logo');
      var ring = q('.portal__ring'), dash = q('.portal__dash'), tr = qa('.portal__ch.is-tr'), bl = qa('.portal__ch.is-bl');
      var accent = getComputedStyle(root).getPropertyValue('--c-accent-text').trim();
      var head = $('[data-head]');
      var heroItems = $$('.hero__top, .hero__slogan, .hero__lead, .hero__acts, .hero__sub');
      // первый экран под порталом уже нарисован (LCP не ждёт портала); его появление — донорское, после выхода
      $$('.hero [data-in]').forEach(function (el) { el.__in = 2; el.classList.add('is-in'); });
      G.set(inner, { autoAlpha: 0 });
      return new Promise(function (resolve) {
        var entered = false, autoT = 0;
        var skip = function () { enter(); };
        var evs = ['click', 'keydown', 'wheel', 'touchstart'];
        evs.forEach(function (e) { addEventListener(e, skip, { passive: true }); });
        // вход — когда ядро объявит готовность (его потолок 5 с: «READY» к этому моменту уже в кадре) или раньше, по клику
        site.ready(function () { enter(); });
        var tl = G.timeline({ paused: true, delay: 0.5, onComplete: function () {   // seams:ok донор: delay .5
          G.fromTo(cast, { yPercent: 0 }, { autoAlpha: 1, yPercent: -100, duration: 0.7 * k, ease: E });                    // seams:ok донор .7
          G.fromTo(ready, { autoAlpha: 0, yPercent: 100 }, { autoAlpha: 1, yPercent: 0, duration: 0.7 * k, ease: E, delay: 0.5 });   // seams:ok донор .7 / .5
          autoT = setTimeout(enter, 1000);                                                                                 // seams:ok «READY» почти въехал (.5 + .5 из .7) — вход
        } });
        tl.to(inner, { autoAlpha: 1, duration: 0.5, ease: eOut }, 0)                                                         // seams:ok донор .5 power1
          .fromTo(lineL, { scaleY: 0 }, { scaleY: 1, duration: 1.2 * k, ease: E, transformOrigin: '50% 0%' }, 0.2)              // seams:ok донор
          .fromTo(lineR, { scaleY: 0 }, { scaleY: 1, duration: 1.2 * k, ease: E, transformOrigin: '50% 100%' }, 0.2)            // seams:ok донор
          .fromTo(lineM, { scaleX: 0 }, { scaleX: 1, duration: 1.2 * k, ease: E, transformOrigin: '50% 50%' }, 0.2)             // seams:ok донор
          .fromTo(cast, { yPercent: 100 }, { autoAlpha: 1, yPercent: 0, duration: 0.7 * k, ease: E }, 0.4)                     // seams:ok донор
          .fromTo(circle, { scale: 0.5, autoAlpha: 0 }, { autoAlpha: 1, scale: 1, duration: 1.2 * k, ease: E }, 0.4)           // seams:ok донор
          .fromTo(logo, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.5 * k, ease: E }, 0.8)                                   // seams:ok донор
          .to(tr, { opacity: 1, duration: 1 * k, ease: E, stagger: 0.065 }, 1.2)                                               // seams:ok донор .065
          .to(tr, { fill: accent, duration: 1.8 * k, ease: E }, 1.2)                                                           // seams:ok донор 1.8
          .to(bl, { opacity: 1, duration: 1 * k, ease: E, stagger: 0.065 }, 1.2)                                               // seams:ok донор .065
          .to(bl, { fill: accent, duration: 1.8 * k, ease: E }, 1.2);                                                          // seams:ok донор 1.8
        qa('.portal__arc').forEach(function (arc) { tl.add(site.draw(arc, { dur: 1.8 * k, ease: E }), 1.3); });                // seams:ok донор drawSVG 0→100 % за 1.8 с 1.3
        tl.play();

        function enter() {
          if (entered) return;
          entered = true;
          clearTimeout(autoT);
          evs.forEach(function (e) { removeEventListener(e, skip); });
          portal.style.pointerEvents = 'none';
          tl.kill(); G.killTweensOf([cast, ready]);
          // слоган H2-буквами и печать вордмарка стартуют с готовностью страницы — сразу за порталом
          $$('.hero__slogan .ch').forEach(function (c) { G.set(c, { scaleY: 0, transformOrigin: '50% 100%' }); });
          G.timeline({ onComplete: function () {
            if (portal.parentNode) portal.parentNode.removeChild(portal);
            root.classList.remove('is-portal');
            G.set(head, { clearProps: 'opacity' });
          } })
            .to([ring, dash, lineM, cast], { autoAlpha: 0, duration: 0.5, ease: eOut }, 0)                                    // seams:ok донор .5 power1
            .to(ready, { autoAlpha: 0, yPercent: -100, duration: 0.5, ease: eOut }, 0)                                        // seams:ok донор
            .to(qa('.portal__arcs'), { autoAlpha: 0, duration: 0.75, ease: E }, 0.55)                                         // seams:ok донор .75 с .55
            .set(circle, { backgroundColor: 'transparent' }, 0.55)
            .to(circle, { autoAlpha: 0, duration: 0.75, ease: E }, 0.55)                                                     // seams:ok донор
            .to(logo, { scale: 3, autoAlpha: 0, duration: 0.75, ease: E }, 0.55)                                              // seams:ok своё: щит передаёт место 3D
            .to(portal, { backgroundColor: 'transparent', duration: 1, ease: eOut }, 0.55)                                    // seams:ok донор 1 power1.out
            .to([lineL, lineR], { autoAlpha: 0, duration: 0.5, ease: eOut }, 0.55)                                            // seams:ok донор
            .fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: eOut }, 0.55)                                    // seams:ok донор .site-head (без visibility — шапка кликабельна сразу)
            .fromTo(heroItems, { opacity: 0, y: '4rem' }, { opacity: 1, y: 0, duration: 1, stagger: 0.035, ease: E,           // seams:ok донор y 4rem, stagger .035
              clearProps: 'opacity,transform' }, 0.55);
          resolve();
        }
      });
    }

    /* ── шапка: фон после первого экрана ── */
    var head = $('[data-head]'), hero = $('#top');
    if (head && hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { head.classList.toggle('is-solid', !es[0].isIntersecting); },
        { rootMargin: '-' + head.offsetHeight + 'px 0px 0px 0px' }).observe($('.hero__copy') || hero);
    }

    /* ── вордмарк H1 во всю колонку: кегль = текущий × ширина колонки / ширина текста (ось ширины задаёт CSS) ── */
    var mark = $('.hero__mark');
    if (mark) {
      var fit = function () {
        mark.style.fontSize = '';
        var r = document.createRange(); r.selectNodeContents(mark);
        var tw = r.getBoundingClientRect().width, cw = mark.parentElement.clientWidth;
        if (tw > 0 && cw > 0) mark.style.fontSize = (parseFloat(getComputedStyle(mark).fontSize) * cw / tw * 0.995).toFixed(2) + 'px';
      };
      fit();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); site.refresh(); });
      site.onResize(fit);
    }

    /* ── E: печать по букве с курсором «_» (донор: шаг speed мс, старт 200 мс, курсор opacity [0,1,1,0] за .4 с) ── */
    $$('[data-type]').forEach(function (el) {
      var chars = site.splitWords(el, { chars: true }).chars;
      el.classList.add('is-split');
      if (STATIC || !chars.length) return;
      var step = +el.getAttribute('data-type-step') || 50;          // донор: speed по умолчанию 50, у FAQs 100
      var cur = document.createElement('span');
      cur.className = 'type-cursor'; cur.setAttribute('aria-hidden', 'true'); cur.textContent = '_';
      el.appendChild(cur);
      var u = -1, timer = 0;
      function show(n) {
        u = n;
        chars.forEach(function (c, i) { c.style.opacity = i <= u ? '' : '0'; });
        var nx = chars[u + 1];
        if (!nx) { if (cur.getAnimations) cur.getAnimations().forEach(function (a) { a.cancel(); }); cur.style.opacity = '0'; return; }
        cur.style.left = nx.offsetLeft + 'px'; cur.style.top = nx.offsetTop + 'px';
        cur.style.opacity = '';
        if (cur.animate) cur.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });   // seams:ok донор E: duration .4, times [0,.2,.8,1]
      }
      function run() {
        clearTimeout(timer); show(-1);
        timer = setTimeout(function tick() { show(u + 1); if (u < chars.length - 1) timer = setTimeout(tick, step); }, 200);   // seams:ok донор E: старт через 200 мс
      }
      function reset() { clearTimeout(timer); show(-1); cur.style.opacity = '0'; }
      if (!PORTAL || !el.closest('.hero')) reset(); else cur.style.opacity = '0';
      site.ready(function () {
        new IntersectionObserver(function (es) { if (es[0].isIntersecting) run(); else reset(); },
          { rootMargin: '-100px 0px' }).observe(el);                // донор: useInView margin -100px, once: false
      });
    });

    /* ── Y: буквы заголовка растут scaleY 0→1 от низа, задержка .025·i (донор), туда и обратно ── */
    $$('[data-y]').forEach(function (el) {
      var chars = site.splitWords(el, { chars: true }).chars;
      el.classList.add('is-split');
      if (STATIC || !chars.length) return;
      if (!PORTAL || !el.closest('.hero')) G.set(chars, { scaleY: 0, transformOrigin: '50% 100%' });
      site.ready(function () {
        new IntersectionObserver(function (es) {
          var on = es[0].isIntersecting;
          G.to(chars, { scaleY: on ? 1 : 0, duration: sig2.dur, ease: sig2.ease, stagger: on ? 0.025 : 0, overwrite: true });   // донор Y: delay .025·i
        }, { rootMargin: '-100px 0px' }).observe(el);
      });
    });

    /* ── X: карта зала — клетка c загорается на отрезке прогресса [c/N, (c+1)/N], порядок случайный (донор),
          прогресс «start end → end center» ── */
    var grid = $('.seats__grid');
    if (grid && !STATIC && ST) {
      var cells = $$('.seat', grid), N = cells.length, seed = 47;
      var order = cells.map(function (_, i) { return i; });
      var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };   // постоянный порядок между заходами
      for (var i = N - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
      var paint = function (p) { cells.forEach(function (c, k) { c.style.opacity = String(clamp(p * N - order[k], 0, 1)); }); };
      paint(0);
      var stX = ST.create({ trigger: grid, start: 'top bottom', end: 'bottom center', onUpdate: function (s) { paint(s.progress); }, onRefresh: function (s) { paint(s.progress); } });
      paint(stX.progress);
    }

    /* ── et: лента зон — пин 400vh (300vh прокрутки), x ленты через пружину stiffness 150, damping 50, restDelta .001;
          ярлыки x 20→−20 px на своих отрезках прогресса ── */
    var zony = $('#zony');
    if (zony) {
      var track = $('[data-track]', zony), tags = $$('[data-tag]', zony);
      var spans = [[0, 0.4], [0.25, 0.65], [0.45, 0.85], [0.6, 1]];   // донор: [0,.4] [.3,.7] [.6,1] на три ярлыка; четвёртый вставлен равным шагом
      var dist = 0, x = 0, v = 0, target = 0, raf = 0, prevT = 0;
      var measure = function () { dist = Math.max(0, track.scrollWidth - innerWidth); };
      var put = function () { track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)'; };
      var spring = function (now) {
        var dt = Math.min(0.05, prevT ? (now - prevT) / 1000 : 0.016); prevT = now;
        var steps = Math.ceil(dt / 0.004), h = dt / steps;
        for (var k = 0; k < steps; k++) { var a = -150 * (x - target) - 50 * v; v += a * h; x += v * h; }   // донор: useSpring 150 / 50
        if (Math.abs(x - target) < 0.001 && Math.abs(v) < 0.001) { x = target; v = 0; put(); raf = 0; prevT = 0; return; }   // restDelta .001
        put(); raf = requestAnimationFrame(spring);
      };
      var kick = function () { if (!raf) raf = requestAnimationFrame(spring); };
      site.pin(zony, {
        panels: '[data-panel]',
        minHeight: 560,                                              // карточка 30vw (≤ 430px) помещается и в окно 560px — ноутбуки 1366×768 и 1440×900 с панелями получают ленту
        end: function () { measure(); return '+=' + Math.round(innerHeight * 3); },
        st: {
          onUpdate: function (s) {
            target = -dist * s.progress; kick();
            tags.forEach(function (tg, k) { var r = spans[k] || spans[spans.length - 1]; tg.style.translate = map(s.progress, r[0], r[1], 20, -20).toFixed(1) + 'px 0'; });
          },
          onRefresh: function (s) { measure(); target = -dist * s.progress; x = target; v = 0; put(); }
        },
        cleanup: function () { if (raf) cancelAnimationFrame(raf); raf = 0; x = v = target = 0; track.style.transform = ''; tags.forEach(function (tg) { tg.style.translate = ''; }); }
      });
      // Tab по ленте: ядро прокручивает к панели, а пружина догоняла бы ~2 с — ставим ленту сразу
      zony.addEventListener('focusin', function () { requestAnimationFrame(function () { x = target; v = 0; put(); }); });
    }

    /* ── Z: коллаж турниров — слой едет y = N → V по прогрессу секции «start start → end start»;
          кадр: x dx→0, y 0→dy, гаснет у линии заголовка на fade px; только ≥ 1024 и с движением ── */
    var tur = $('[data-collage]');
    if (tur && ST) {
      var live = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)');
      var sticky = $('[data-collage-sticky]', tur), layer = $('[data-collage-layer]', tur), box = $('[data-collage-box]', tur);
      var headEl = $('[data-collage-head]', tur), title = $('[data-collage-title]', tur), spacer = $('[data-collage-spacer]', tur);
      var items = $$('.collage__i', tur).map(function (f) {
        return { el: f, top: parseFloat(f.style.getPropertyValue('--t')) || 0, dx: +f.getAttribute('data-dx'), dy: +f.getAttribute('data-dy'), fade: +f.getAttribute('data-fade') };
      });
      var Z = { N: 0, V: 0, v: 0, W: 1000, st: null };
      var measureZ = function () {
        var p = sticky.getBoundingClientRect(), f = title.getBoundingClientRect();
        Z.v = f.top - p.top;                                         // донор: v = верх заголовка внутри sticky
        Z.N = Math.max(0, headEl.offsetHeight + 200);                // донор: N = max(0, высота шапки + 200)
        Z.V = Z.v - box.offsetHeight + 200;                          // донор: V = v − высота коллажа + 200
        Z.W = box.offsetWidth;
        spacer.style.height = Math.max(0, Z.N - Z.V) + 'px';         // донор: распорка k = max(0, N − V)
      };
      var applyZ = function (H) {
        var M = Z.N + (Z.V - Z.N) * H;
        layer.style.transform = 'translate3d(0,' + M.toFixed(1) + 'px,0)';
        items.forEach(function (it) {
          var i = M + it.top / 100 * Z.W, r = Z.v + it.fade, n = Z.v;
          var o = i >= r ? 1 : i <= n ? 0 : (i - n) / (r - n);
          it.el.style.opacity = o.toFixed(3);
          it.el.style.transform = 'translate3d(' + (it.dx * (1 - H)).toFixed(1) + 'px,' + (it.dy * H).toFixed(1) + 'px,0)';
        });
      };
      var setupZ = function () {
        if (Z.st) { Z.st.kill(); Z.st = null; }
        var on = live.matches && !STATIC;
        tur.classList.toggle('is-live', on);
        // низкое окно: карточка не влезает в липкий экран (overflow: clip срежет ссылки) — статичная версия донора
        if (on && headEl.getBoundingClientRect().bottom > sticky.getBoundingClientRect().bottom) { on = false; tur.classList.remove('is-live'); }
        if (!on) { spacer.style.height = ''; layer.style.transform = ''; items.forEach(function (it) { it.el.style.opacity = it.el.style.transform = ''; }); return; }
        measureZ();
        Z.st = ST.create({ trigger: tur, start: 'top top', end: 'bottom top', invalidateOnRefresh: true,
          onRefresh: function (s) { applyZ(s.progress); }, onUpdate: function (s) { applyZ(s.progress); } });
        applyZ(Z.st.progress);
      };
      setupZ();
      ST.addEventListener('refreshInit', function () { if (Z.st) measureZ(); });   // распорка меняет высоту — до расчёта позиций всех триггеров
      site.onResize(setupZ);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setupZ(); site.refresh(); });
      if (live.addEventListener) live.addEventListener('change', function () { setupZ(); site.refresh(); });
    }

    /* ── en: вопросы — ширина ряда i: (100 − i/n·50) % → 100 % на прогрессе [0, .9]; один открытый; кадры слева
          проявляются на [0,.1], [.2,.3], [.4,.5] ── */
    var faq = $('[data-faq]');
    if (faq) {
      var rows = $$('[data-qa]', faq), n = rows.length, imgs = $$('.faq__img', faq);
      var wide = matchMedia('(min-width: 768px)');
      var stairs = function (p) {
        rows.forEach(function (r, i) {
          if (!wide.matches) { r.style.width = ''; return; }
          var w0 = 100 - i / n * 50;
          r.style.width = (STATIC ? 100 - i / n * 25 : map(p, 0, 0.9, w0, 100)).toFixed(2) + '%';   // донор: reduced — 100 − i/n·25
        });
        if (!STATIC) [[0, 0.1], [0.2, 0.3], [0.4, 0.5]].forEach(function (r, k) { if (imgs[k]) imgs[k].style.opacity = map(p, r[0], r[1], 0, 1).toFixed(3); });
      };
      stairs(0);
      if (ST && !STATIC) {
        var stF = ST.create({ trigger: faq, start: 'top top', end: 'bottom top', onUpdate: function (s) { stairs(s.progress); }, onRefresh: function (s) { stairs(s.progress); } });
        stairs(stF.progress);
      }
      if (wide.addEventListener) wide.addEventListener('change', function () { stairs(0); site.refresh(); });

      var openRow = null;
      var setOpen = function (row, on) {
        var q = $('[data-faq-q]', row), a = $('[data-faq-a]', row), s = $('.qa__s', row);
        if (G) G.killTweensOf(a);                                    // быстрое «закрыть → открыть»: хвост закрытия не прячет новый ответ
        q.setAttribute('aria-expanded', on ? 'true' : 'false');
        row.classList.toggle('is-open', on);
        s.textContent = on ? '−' : '+';
        if (on) {
          a.hidden = false;
          if (!STATIC) G.fromTo(a, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: T.dur('--d-1'), ease: T.ease('--e-out'), clearProps: 'height,opacity', onComplete: site.refresh });
          else site.refresh();
        } else if (!STATIC) {
          G.to(a, { height: 0, opacity: 0, duration: T.dur('--d-1'), ease: T.ease('--e-out'), onComplete: function () { if (!row.classList.contains('is-open')) a.hidden = true; G.set(a, { clearProps: 'height,opacity' }); site.refresh(); } });
        } else { a.hidden = true; site.refresh(); }
      };
      rows.forEach(function (row) {
        var q = $('[data-faq-q]', row), a = $('[data-faq-a]', row);
        var id = 'qa-' + rows.indexOf(row);
        a.id = id; q.setAttribute('aria-controls', id);
        a.hidden = true;                                             // без JS ответы открыты (в разметке hidden нет)
        q.addEventListener('click', function () {
          var on = row !== openRow;
          if (openRow) setOpen(openRow, false);
          openRow = on ? row : null;
          if (on) setOpen(row, true);
        });
      });
    }

    /* ── бар: на телефоне группы меню свёрнуты, кроме первой ── */
    if (matchMedia('(max-width: 767px)').matches) $$('.bar__g').forEach(function (d, i) { if (i) d.open = false; });
    $$('.bar__g').forEach(function (d) { d.addEventListener('toggle', site.debounce(site.refresh, 120)); });

    /* ── ep: бегущая строка подвала — x 0 → −50 % за 40 с, линейно, по кругу; идёт, когда прокрутка > .99 (≥ 1024) или > .9 ── */
    var ticker = $('[data-ticker]');
    if (ticker) {
      var tTrack = $('.ticker__track', ticker), link = $('.ticker__link', ticker);
      var proto = link.cloneNode(true), loop = null;
      var buildT = function () {
        tTrack.innerHTML = ''; tTrack.appendChild(proto.cloneNode(true));
        var one = tTrack.firstElementChild.offsetWidth || 1;
        var copies = Math.max(2, Math.ceil(innerWidth / one) + 1);
        for (var c = 1; c < copies; c++) tTrack.appendChild(proto.cloneNode(true));
        var half = tTrack.innerHTML; tTrack.innerHTML = half + half;    // донор: [...ex, ...ex], x до −50 %
        if (loop) { loop.kill(); G.set(tTrack, { xPercent: 0 }); }
        if (!STATIC) loop = G.fromTo(tTrack, { xPercent: 0 }, { xPercent: -50, duration: 40, ease: 'none', repeat: -1, paused: true });   // seams:ok донор ep: duration 40, linear
      };
      buildT();
      if (!STATIC) {
        var wideT = matchMedia('(min-width: 1024px)');
        var onScroll = function () {
          var max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? scrollY / max : 0;
          if (p > (wideT.matches ? 0.99 : 0.9)) { if (loop.paused()) loop.play(); } else if (!loop.paused()) { loop.pause(0); }
        };
        addEventListener('scroll', onScroll, { passive: true });
        site.ready(onScroll);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { buildT(); onScroll(); });
        site.onResize(function () { buildT(); onScroll(); });
      }
    }

    /* ── якоря на ленту и коллаж: к началу пина без отступа шапки — секции сами отступают под неё ── */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href="#zony"], a[href="#turniry"]');
      if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      e.preventDefault();
      var ov = a.closest('[data-overlay]');
      if (ov && ov.__overlay && ov.__overlay.isOpen()) ov.__overlay.close({ restoreFocus: false });
      site.scrollTo(el, { offset: 0 });
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
    }, true);

    /* ── появление текста и медиа: F — blur 10px → 0 и opacity, линия −100px, шаг .05 ≈ 5 знаков × 10 мс донора ── */
    site.reveal({
      text: { from: { filter: 'blur(10px)' }, to: { filter: 'blur(0px)' }, dur: sig1.dur, ease: sig1.ease, stagger: 0.05, start: 0.89 },
      media: { from: { filter: 'blur(10px)' }, to: { filter: 'blur(0px)' }, dur: sig1.dur, ease: sig1.ease, stagger: 0.05, start: 0.89 }
    });

    /* ── 3D: после готовности страницы, лениво; без WebGL и при сбое — статичный контур svg ── */
    site.ready(function () {
      var cvHero = $('[data-gl="shield"]'), cvRep = $('[data-gl="shield-reprise"]'), cvProps = $$('[data-gl]').filter(function (c) { return /monitor|keycard|gamepad|can/.test(c.getAttribute('data-gl')); });
      if (!('IntersectionObserver' in window)) return;
      var load = function () { return import('./scene3d.js'); };
      var once = function (el, margin, fn) {
        if (!el) return;
        var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: margin });
        io.observe(el);
      };
      var root = document.documentElement;
      once(cvHero, '0px', function () {
        load().then(function (m) {
          m.shield(cvHero, { anchor: $('[data-anchor]'), onReady: function () { root.classList.add('gl-shield'); }, onLost: function () { root.classList.remove('gl-shield'); } });
        }).catch(function (e) { console.warn('[gameforce] 3D недоступно:', e && e.message); });
      });
      once(cvRep, '50% 0px', function () {
        load().then(function (m) {
          m.shield(cvRep, { reprise: true, onReady: function () { root.classList.add('gl-reprise'); }, onLost: function () { root.classList.remove('gl-reprise'); } });
        }).catch(function () {});
      });
      once(zony, '100% 0px', function () {
        load().then(function (m) { cvProps.forEach(function (cv) { m.prop(cv, cv.getAttribute('data-gl')); }); }).catch(function () {});
      });
    });

    return portalDone;
  });
})();
