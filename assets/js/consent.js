/* МЕТРИКА И COOKIE — Яндекс Метрика по согласию. Без зависимостей.
   По умолчанию выключено: без <meta name="metrika"> файл не рисует баннер и не делает ни одного запроса.
   Мету ставит только боевая сборка (publish) из _src/site.json → analytics:

   <meta name="metrika" content="12345678" data-mode="consent" data-privacy="privacy.html">
     data-mode="consent" — счётчик грузится только после «Принять» (по умолчанию; так безопаснее);
     data-mode="notice"  — счётчик сразу, внизу уведомление со ссылкой на политику и кнопкой «Понятно».
     data-privacy        — адрес политики, по умолчанию privacy.html.

   Подключение: <link rel="stylesheet" href="assets/css/consent.css"> и
                <script defer src="assets/js/consent.js"></script> (до form.js — цель form-sent попадёт в очередь в любом случае).
   Экспорт: window.siteGoal(name, params) → ym(id, 'reachGoal', name, params) после загрузки счётчика,
            до загрузки — в очередь; без меты или после «Отказаться» — пустая функция.
            window.siteConsent = { state(), open(), reset() }; кнопка [data-consent-open] в подвале снова показывает баннер.

   Что закрыто: счётчик и cookie без уведомления на сайте с формами (152-ФЗ, Метрика — это ПДн посетителя);
   отказ, который не запоминается (баннер на каждой странице); вебвизор, записывающий ввод в формы (выключен). */
(function () {
  'use strict';

  var d = document, w = window;
  var KEY = 'site-consent-metrika';
  var TTL = 365 * 24 * 3600 * 1000;   // через год спрашиваем снова: согласие не вечное
  var TAG = 'https://mc.yandex.ru/metrika/tag.js';
  var meta = d.querySelector('meta[name="metrika"]');
  var queue = [], loaded = false, refused = false, id = 0, bar = null;

  w.siteGoal = function (name, params) {
    if (refused || !id) return;
    if (loaded && typeof w.ym === 'function') w.ym(id, 'reachGoal', name, params);
    else if (queue.length < 50) queue.push([name, params]);
  };
  w.siteConsent = { state: function () { return read(); }, open: function () { show(); }, reset: function () { save(null); refused = false; show(); } };

  if (!meta) return;
  var raw = String(meta.getAttribute('content') || '').trim();
  if (!/^\d{4,12}$/.test(raw)) { console.warn('[site] Метрика: номер счётчика «' + raw + '» — не число, счётчик не подключён'); return; }
  id = +raw;
  var mode = meta.getAttribute('data-mode') === 'notice' ? 'notice' : 'consent';
  var privacy = meta.getAttribute('data-privacy') || 'privacy.html';

  /* localStorage падает в приватном окне Safari и при запрете cookie — выбор тогда живёт до перезагрузки */
  function read() {
    try {
      var v = JSON.parse(w.localStorage.getItem(KEY) || 'null');
      if (!v || !v.at || Date.now() - v.at > TTL) return null;
      return v.v;
    } catch (_) { return null; }
  }
  function save(v) {
    try { if (v === null) w.localStorage.removeItem(KEY); else w.localStorage.setItem(KEY, JSON.stringify({ v: v, at: Date.now() })); } catch (_) { /* хранилище недоступно */ }
  }

  /* стандартный тег Метрики, переписанный читаемо: очередь ym до загрузки, повторная вставка исключена */
  function load() {
    if (loaded) return;
    loaded = true;
    w.ym = w.ym || function () { (w.ym.a = w.ym.a || []).push(arguments); };
    w.ym.l = +new Date();
    var has = Array.prototype.some.call(d.scripts, function (s) { return s.src === TAG; });
    if (!has) {
      var s = d.createElement('script');
      s.async = true;
      s.src = TAG;
      (d.head || d.documentElement).appendChild(s);
    }
    w.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
    while (queue.length) { var g = queue.shift(); w.ym(id, 'reachGoal', g[0], g[1]); }
  }

  function hide() {
    if (!bar) return;
    var had = bar.contains(d.activeElement);
    bar.hidden = true;
    /* фокус не теряется в body: возвращаем его в начало содержимого */
    if (had) { var m = d.getElementById('main'); if (m) { try { m.focus({ preventScroll: true }); } catch (_) { /* старый браузер */ } } }
  }
  function btn(text, cls, on) {
    var b = d.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', on);
    return b;
  }
  function build() {
    bar = d.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', mode === 'consent' ? 'Согласие на cookie и статистику' : 'Уведомление о cookie');
    bar.setAttribute('data-consent', mode);
    var p = d.createElement('p');
    p.className = 'cookie-bar__text';
    var a = d.createElement('a');
    a.href = privacy;
    a.textContent = 'политике обработки персональных данных';
    p.appendChild(d.createTextNode(mode === 'consent'
      ? 'Мы хотим подключить Яндекс Метрику: она ставит cookie и помогает понять, как люди пользуются сайтом. Без вашего согласия статистика не собирается. Подробнее — в '
      : 'Сайт использует cookie и Яндекс Метрику, чтобы понимать, как люди им пользуются. Продолжая пользоваться сайтом, вы соглашаетесь с этим. Подробнее — в '));
    p.appendChild(a);
    p.appendChild(d.createTextNode('.'));
    var row = d.createElement('div');
    row.className = 'cookie-bar__actions';
    if (mode === 'consent') {
      row.appendChild(btn('Принять', 'btn cookie-bar__btn', function () { save('yes'); refused = false; hide(); load(); }));
      row.appendChild(btn('Отказаться', 'btn btn--line cookie-bar__btn', function () { save('no'); refused = true; queue.length = 0; hide(); }));
    } else {
      row.appendChild(btn('Понятно', 'btn cookie-bar__btn', function () { save('seen'); hide(); }));
    }
    bar.appendChild(p);
    bar.appendChild(row);
    d.body.appendChild(bar);
  }
  function show() {
    if (!id) return;
    if (!bar) build();
    bar.hidden = false;
  }

  function start() {
    var v = read();
    if (mode === 'notice') { load(); if (v !== 'seen') show(); }
    else if (v === 'yes') load();
    else if (v === 'no') { refused = true; }
    else show();
    d.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-consent-open]') : null;
      if (!t) return;
      e.preventDefault();
      refused = false;
      show();
      var first = bar && bar.querySelector('button');
      if (first) first.focus();
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
