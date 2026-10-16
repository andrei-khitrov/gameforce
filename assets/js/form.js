/* ФОРМЫ — честная отправка заявок. Без зависимостей: работает без GSAP и без core.js.
   Подключение: <script defer src="assets/js/form.js"></script> после core.js (если core.js есть).
   Экспорт: window.siteForm(el, opts) и site.form (если window.site существует).

   Что закрыто (аудит 17 сборок): форма «отправлялась» классом .sent и «Спасибо», а заявка не уходила
   никуда — опубликованный сайт молча терял клиентов. Здесь три честных исхода:
   · приёмник есть (data-endpoint) → POST JSON, «Спасибо» только после ответа 2xx и {ok:true};
   · приёмник ответил ошибкой / сеть упала → панель ошибки с запасным контактом, данные в полях остаются;
   · приёмника нет → панель «Отправка с сайта пока не подключена — напишите нам», ни одного запроса,
     текст заявки копируется в буфер. Изображать «Спасибо» без отправки нельзя: kit/gate это ловит.

   Разметка (рекомендуемая, целиком):

   <form class="form" data-form data-form-name="Заявка — первый экран"
         data-endpoint=""                       ← адрес приёмника из _src/site.json → forms.endpoint; пусто — честный fallback
         data-fallback="https://t.me/nick"      ← forms.fallback: https://t.me/…, tel:+7…, mailto:…
         method="post">                         ← без JS данные не лягут в адрес страницы (GET кладёт их в URL);
                                                  action = endpoint, если приёмник есть (worker отвечает HTML-страницей)
     <div data-form-body>
       <div class="field">
         <label for="f-name">Имя</label>
         <input id="f-name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="120">
         <p class="field__error" data-error-for="name" hidden></p>
       </div>
       <div class="field">
         <label for="f-phone">Телефон</label>
         <input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="+7 900 000-00-00">
         <p class="field__error" data-error-for="phone" hidden></p>
       </div>
       <div class="field">
         <label for="f-email">Почта <span class="t-muted">— необязательно</span></label>
         <input id="f-email" name="email" type="email" autocomplete="email" maxlength="160">
         <p class="field__error" data-error-for="email" hidden></p>
       </div>
       <div class="field">
         <label for="f-msg">Сообщение</label>
         <textarea id="f-msg" name="message" rows="4" maxlength="3000"></textarea>
       </div>
       <div class="form__consent">
         <input id="f-consent" name="consent" type="checkbox" value="yes" required>   ← НЕ отмечен заранее
         <label for="f-consent">Я даю <a href="soglasie.html" target="_blank">согласие на обработку персональных данных</a>
           и принимаю <a href="privacy.html" target="_blank">политику обработки персональных данных</a></label>
         <p class="field__error" data-error-for="consent" hidden></p>
       </div>
       <button class="btn" type="submit">Отправить заявку</button>
     </div>
     <div class="form__panel" data-form-success role="status" tabindex="-1" hidden>
       Спасибо! Заявка у нас — ответим в течение рабочего дня.</div>
     <div class="form__panel form__panel--error" data-form-error role="alert" hidden>
       Не получилось отправить. Данные в форме сохранены — попробуйте ещё раз или напишите нам: <a href="https://t.me/nick" target="_blank" rel="noopener">Telegram</a></div>
     <div class="form__panel" data-form-fallback role="status" tabindex="-1" hidden>
       Отправка с сайта пока не подключена — напишите нам: <a href="https://t.me/nick" target="_blank" rel="noopener">@nick в Telegram</a>
       <span data-form-copied hidden>Текст заявки уже в буфере обмена — вставьте его в сообщение.</span></div>
   </form>

   · data-cta ставится на кнопку/ссылку, ведущую К форме, а не на саму форму.
   · Имена полей — из списка приёмника (library/snippets/form-worker: name, phone, email, message, company,
     date, guests); другое имя приёмник выбросит — допиши его в FIELDS worker.js.
   · Слоты ошибок, ловушка для ботов (name="website") и недостающие панели создаются сами, если их нет.
   · Без JS панель fallback видна всегда (form.css: html:not(.form-js) [data-form-fallback]) — человек
     видит контакт, даже если скрипт не загрузился. Текст fallback при подключённом приёмнике — нейтральный:
     «Не отправляется? Напишите нам: …».

   События (всплывают от формы): form:sent, form:error {reason}, form:fallback {copied}.
   Цель Метрики: window.siteGoal('form-sent') — если consent.js подключил счётчик.
   opts (siteForm): { endpoint, fallback, name, timeout, messages: { required, email, tel, … } } */
(function () {
  'use strict';

  var d = document, root = d.documentElement;
  var TIMEOUT = 12000;   // мс: дольше человек решает, что сайт сломан, и уходит
  var PII = /(name|fio|phone|tel|email|mail|имя|телефон|почт|фамил)/i;
  var SKIP_TYPES = /^(submit|button|reset|image|hidden|file)$/;
  var MSG = {
    required: 'Заполните это поле',
    choose: 'Выберите вариант',
    check: 'Отметьте это поле',
    consent: 'Без согласия на обработку персональных данных заявку отправить нельзя',
    email: 'Похоже, в адресе ошибка: нужен вид name@example.ru',
    tel: 'Нужен номер вида +7 900 000-00-00',
    url: 'Нужна ссылка вида https://…',
    short: 'Слишком коротко: нужно не меньше {n} знаков',
    long: 'Слишком длинно: не больше {n} знаков',
    pattern: 'Проверьте формат',
    min: 'Значение меньше допустимого ({n})',
    max: 'Значение больше допустимого ({n})',
    number: 'Нужно число',
    fallback: 'Отправка с сайта пока не подключена — напишите нам:',
    error: 'Не получилось отправить. Данные в форме сохранены — попробуйте ещё раз или напишите нам:',
    success: 'Спасибо! Заявка отправлена — мы свяжемся с вами.',
    copied: 'Текст заявки уже в буфере обмена — вставьте его в сообщение.'
  };

  var warned = {};
  function warn(key, msg) { if (!warned[key]) { warned[key] = 1; console.warn('[form] ' + msg); } }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function esc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }
  function fmt(s, n) { return String(s).replace('{n}', n); }
  function trim(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  var uid = 0;

  /* метка формы: html.form-js гасит «без JS видно» у панели fallback.
     Ставится в момент загрузки файла, а не по DOMContentLoaded — иначе мигнёт */
  root.classList.add('form-js');

  /* ── Запасной контакт: подпись ссылки по адресу (t.me/nick → @nick, tel:+7… → номер, mailto:x → x) ── */
  function contactLabel(url) {
    var m;
    if ((m = /^https?:\/\/(?:t\.me|telegram\.me)\/([\w+]+)/i.exec(url))) return (m[1].charAt(0) === '+' ? '' : '@') + m[1] + ' в Telegram';
    if ((m = /^tel:(.+)$/i.exec(url))) return decodeURIComponent(m[1]);
    if ((m = /^mailto:([^?]+)/i.exec(url))) return decodeURIComponent(m[1]);
    return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }
  function contactLink(url) {
    var a = d.createElement('a');
    a.href = url;
    a.textContent = contactLabel(url);
    /* навигация на tg:/mailto: в той же вкладке оставляет страницу «в ожидании перехода» — только новая вкладка для http */
    if (/^https?:/i.test(url)) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  function Form(form, opts) {
    this.el = form;
    this.opts = opts || {};
    this.msg = {};
    var k, own = this.opts.messages || {};
    for (k in MSG) this.msg[k] = own[k] || MSG[k];
    this.sending = false;
    this.init();
  }

  Form.prototype.cfg = function () {
    /* адрес читается в момент отправки: публикация/проверки могут подставить его позже инициализации */
    var f = this.el, o = this.opts, meta = d.querySelector('meta[name="form-endpoint"]');
    var action = f.getAttribute('action') || '';
    var endpoint = trim(o.endpoint || f.getAttribute('data-endpoint') || (/^https?:\/\//i.test(action) ? action : '') || (meta && meta.content) || '');
    return {
      endpoint: endpoint,
      fallback: trim(o.fallback || f.getAttribute('data-fallback') || ''),
      name: trim(o.name || f.getAttribute('data-form-name') || f.getAttribute('aria-label') || f.id || 'Заявка с сайта'),
      timeout: o.timeout || TIMEOUT
    };
  };

  Form.prototype.init = function () {
    var f = this.el, self = this;
    if (!f.id) f.id = 'form-' + (++uid);
    f.noValidate = true;   // свои сообщения на русском вместо всплывашек браузера
    this.honeypot();
    this.fields().forEach(function (el) { self.slot(el); if (el.type === 'tel' && !el.hasAttribute('inputmode')) el.setAttribute('inputmode', 'tel'); });
    this.checkConsent();

    f.addEventListener('submit', function (e) { e.preventDefault(); self.submit(); });
    /* ошибка снимается, как только человек начал править; на blur проверяем только то, во что уже что-то вводили —
       иначе Tab по пустой форме красит её целиком */
    f.addEventListener('input', function (e) { var el = e.target; if (!self.own(el)) return; el.__touched = true; self.setError(el, ''); });
    f.addEventListener('change', function (e) { var el = e.target; if (!self.own(el)) return; if (el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT') self.setError(el, ''); });
    f.addEventListener('focusout', function (e) {
      var el = e.target;
      if (!self.own(el) || !el.__touched || el.type === 'checkbox' || el.type === 'radio') return;
      self.setError(el, self.check(el));
    });
    f.__siteForm = this;
  };

  Form.prototype.own = function (el) { return el && el.form === this.el && el.name !== 'website' && !SKIP_TYPES.test(el.type || ''); };

  /* поля формы: без кнопок, скрытых, ловушки и выключенных */
  Form.prototype.fields = function () {
    var self = this;
    return Array.prototype.slice.call(this.el.elements).filter(function (el) {
      return /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !el.disabled && self.own(el);
    });
  };

  /* ── Ловушка для ботов: поле, которое человек не видит и не достаёт Tab-ом ── */
  Form.prototype.honeypot = function () {
    var f = this.el, hp = f.querySelector('[name="website"]');
    if (!hp) {
      var wrap = d.createElement('div');
      wrap.className = 'form__hp sr-only';
      wrap.setAttribute('aria-hidden', 'true');
      var lab = d.createElement('label');
      lab.textContent = 'Сайт';
      hp = d.createElement('input');
      hp.type = 'text';
      hp.name = 'website';
      lab.appendChild(hp);
      wrap.appendChild(lab);
      (f.querySelector('[data-form-body]') || f).appendChild(wrap);
    }
    hp.setAttribute('tabindex', '-1');
    hp.setAttribute('autocomplete', 'off');
    hp.setAttribute('aria-hidden', 'true');
    this.hp = hp;
  };

  /* ── 152-ФЗ: форма с ПДн обязана иметь неотмеченный чекбокс согласия ── */
  Form.prototype.collectsPII = function () {
    return this.fields().some(function (el) {
      var t = (el.type || '').toLowerCase();
      if (t === 'checkbox' || t === 'radio') return false;
      /* тот же набор признаков, что у kit/gate/law.mjs (piiFields): тип, name, id, autocomplete, placeholder */
      return t === 'email' || t === 'tel' || PII.test((el.name || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('autocomplete') || '') + ' ' + (el.getAttribute('placeholder') || ''));
    });
  };
  Form.prototype.consentBox = function () { return this.el.querySelector('input[type="checkbox"][name="consent"]'); };
  Form.prototype.checkConsent = function () {
    if (!this.collectsPII()) return;
    var box = this.consentBox();
    if (!box) { warn('consent-' + this.el.id, 'нет чекбокса согласия на обработку ПДн (#' + this.el.id + ') — форма не отправит данные'); return; }
    if (box.checked || box.hasAttribute('checked')) {
      /* согласие — активное действие человека; отмеченная заранее галочка его не доказывает */
      box.checked = false;
      box.removeAttribute('checked');
      warn('consent-checked-' + this.el.id, 'чекбокс согласия был отмечен заранее — снят (#' + this.el.id + ')');
    }
    if (!box.required) box.required = true;
  };

  /* ── Слот ошибки: [data-error-for="имя"], связан с полем через aria-describedby ── */
  Form.prototype.key = function (el) { return el.name || el.id; };
  Form.prototype.slot = function (el) {
    var key = this.key(el);
    if (!key) return null;
    var s = this.el.querySelector('[data-error-for="' + esc(key) + '"]');
    if (!s) {
      s = d.createElement('p');
      s.className = 'field__error';
      s.setAttribute('data-error-for', key);
      s.hidden = true;
      /* место: конец обёртки поля; если поле лежит прямо в форме — сразу после поля (у чекбокса — после его подписи) */
      var host = el.parentNode, after = el, set = el.type === 'radio' ? el.closest('fieldset, [role="radiogroup"]') : null;
      if (el.type === 'checkbox' || el.type === 'radio') {
        var lab = el.closest('label');
        if (lab) { after = lab; host = lab.parentNode; }
        else if (el.nextElementSibling && el.nextElementSibling.tagName === 'LABEL') after = el.nextElementSibling;
      }
      if (set) set.appendChild(s);   // группа радио: одна ошибка в конце группы
      else if (host === this.el || host.hasAttribute('data-form-body')) host.insertBefore(s, after.nextSibling);
      else host.appendChild(s);
    }
    if (!s.id) s.id = this.el.id + '-err-' + key.replace(/[^\w-]/g, '') + '-' + (++uid);
    var group = el.type === 'radio' ? $$('input[type="radio"][name="' + esc(el.name) + '"]', this.el) : [el];
    group.forEach(function (g) {
      var ids = (g.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (ids.indexOf(s.id) < 0) { ids.push(s.id); g.setAttribute('aria-describedby', ids.join(' ')); }
    });
    return s;
  };
  Form.prototype.setError = function (el, msg) {
    var s = this.slot(el);
    var group = el.type === 'radio' ? $$('input[type="radio"][name="' + esc(el.name) + '"]', this.el) : [el];
    group.forEach(function (g) { if (msg) g.setAttribute('aria-invalid', 'true'); else g.removeAttribute('aria-invalid'); });
    if (s) { s.textContent = msg || ''; s.hidden = !msg; }
    var wrap = el.closest('.field, .form__consent');
    if (wrap) wrap.classList.toggle('is-invalid', !!msg);
  };

  /* ── Проверка одного поля → текст ошибки или '' ── */
  function telOk(v) {
    if (/[^\d\s()+\-.]/.test(v)) return false;
    var digits = v.replace(/\D/g, '');
    if (v.charAt(0) === '+' && digits.charAt(0) !== '7') return digits.length >= 10 && digits.length <= 15;  // зарубежный номер в E.164
    if (digits.length === 11) return /^[78]/.test(digits);
    return digits.length === 10;
  }
  Form.prototype.check = function (el) {
    var m = this.msg, t = (el.type || '').toLowerCase(), v = trim(el.value), n;
    var custom = el.getAttribute('data-msg');
    if (t === 'checkbox') {
      if (el.required && !el.checked) return el.getAttribute('data-msg-required') || (el.name === 'consent' ? m.consent : m.check);
      return '';
    }
    if (t === 'radio') {
      if (!$$('input[type="radio"][name="' + esc(el.name) + '"]', this.el).some(function (r) { return r.required; })) return '';
      return $$('input[type="radio"][name="' + esc(el.name) + '"]', this.el).some(function (r) { return r.checked; }) ? '' : (el.getAttribute('data-msg-required') || m.choose);
    }
    if (!v) {
      if (el.required) return el.getAttribute('data-msg-required') || (el.tagName === 'SELECT' ? m.choose : m.required);
      return '';
    }
    if (t === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return custom || m.email;
    if (t === 'tel' && !telOk(v)) return custom || m.tel;
    if (t === 'url' && !/^https?:\/\/\S+\.\S+/.test(v)) return custom || m.url;
    if ((n = el.minLength) > 0 && v.length < n) return custom || fmt(m.short, n);
    if ((n = el.maxLength) > 0 && v.length > n) return custom || fmt(m.long, n);
    if (el.pattern) {
      var re = null;
      try { re = new RegExp('^(?:' + el.pattern + ')$', 'v'); } catch (_) { try { re = new RegExp('^(?:' + el.pattern + ')$'); } catch (__) { re = null; } }
      if (re && !re.test(v)) return custom || el.title || m.pattern;
    }
    if (t === 'number' || t === 'range') {
      if (!isFinite(+v.replace(',', '.'))) return custom || m.number;
      if (el.min !== '' && +v.replace(',', '.') < +el.min) return custom || fmt(m.min, el.min);
      if (el.max !== '' && +v.replace(',', '.') > +el.max) return custom || fmt(m.max, el.max);
    }
    if (/^(date|time|datetime-local|month|week)$/.test(t) && el.validity) {
      if (el.validity.rangeUnderflow) return custom || fmt(m.min, el.min);
      if (el.validity.rangeOverflow) return custom || fmt(m.max, el.max);
    }
    return '';
  };

  /* ── Вся форма: ошибки по полям, первое неверное — в фокус ── */
  Form.prototype.validate = function () {
    var self = this, first = null, seen = {};
    this.fields().forEach(function (el) {
      if (el.type === 'radio') { if (seen[el.name]) return; seen[el.name] = 1; }
      var msg = self.check(el);
      self.setError(el, msg);
      if (msg && !first) first = el;
    });
    if (first) this.focus(first);
    return !first;
  };
  Form.prototype.focus = function (el) {
    var target = el.closest('.field, .form__consent') || el;
    /* под Lenis нативный скролл фокуса дёргается и спорит с плавной прокруткой — едем через site.scrollTo */
    if (window.site && window.site.lenis && window.site.scrollTo) {
      window.site.scrollTo(target, { immediate: !!window.site.RM });
      try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
    } else {
      try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
      if (target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  };

  /* ── Данные: имя → значение; группы чекбоксов и select multiple — через запятую ── */
  Form.prototype.data = function () {
    var out = {};
    this.fields().forEach(function (el) {
      var k = el.name;
      if (!k || k === 'consent') return;
      var t = (el.type || '').toLowerCase(), v;
      if (t === 'radio' || t === 'checkbox') { if (!el.checked) return; v = el.value === 'on' ? 'да' : el.value; }
      else if (el.tagName === 'SELECT' && el.multiple) v = Array.prototype.filter.call(el.options, function (o) { return o.selected; }).map(function (o) { return o.value; }).join(', ');
      else v = trim(el.value);
      if (v === '') return;
      out[k] = out[k] ? out[k] + ', ' + v : v;
    });
    return out;
  };
  /* текст для буфера: подписи полей из <label>, звёздочки и «— необязательно» отрезаны */
  Form.prototype.compose = function (fields) {
    var f = this.el, lines = [this.cfg().name + ' — ' + location.hostname];
    Object.keys(fields).forEach(function (k) {
      var el = f.elements[k], lab = null, name = k;
      if (el && el.length && !el.tagName) el = el[0];
      if (el) lab = (el.id && f.querySelector('label[for="' + esc(el.id) + '"]')) || el.closest('label');
      if (lab) {
        var c = lab.cloneNode(true);
        $$('input, select, textarea, .t-muted, [aria-hidden="true"]', c).forEach(function (x) { x.remove(); });
        name = trim(c.textContent.replace(/[*:]+/g, '').replace(/\s+/g, ' ')) || k;
      }
      lines.push(name + ': ' + fields[k]);
    });
    return lines.join('\n');
  };

  /* ── Панели состояний: если панели нет в разметке, она создаётся (честный текст лучше тишины) ── */
  Form.prototype.panel = function (kind) {
    var f = this.el, p = f.querySelector('[data-form-' + kind + ']'), cfg = this.cfg(), m = this.msg;
    if (!p) {
      p = d.createElement('div');
      p.className = 'form__panel' + (kind === 'error' ? ' form__panel--error' : '');
      p.setAttribute('data-form-' + kind, '');
      p.hidden = true;
      if (kind === 'success') p.textContent = m.success;
      else p.textContent = (kind === 'error' ? m.error : m.fallback) + ' ';
      f.appendChild(p);
    }
    if (kind === 'success' || kind === 'fallback') { p.setAttribute('role', 'status'); p.setAttribute('tabindex', '-1'); }
    if (kind === 'error') p.setAttribute('role', 'alert');
    /* в ошибке и fallback обязана быть ссылка на запасной контакт; ссылка без href получает адрес из data-fallback */
    if (kind !== 'success' && cfg.fallback) {
      var links = $$('a', p);
      links.forEach(function (a) { if (!a.getAttribute('href')) { a.href = cfg.fallback; if (!trim(a.textContent)) a.textContent = contactLabel(cfg.fallback); } });
      if (!links.length) {
        var copied = p.querySelector('[data-form-copied]');
        var link = contactLink(cfg.fallback);
        if (copied) p.insertBefore(link, copied); else p.appendChild(link);
      }
    }
    if (kind !== 'success' && !p.querySelector('a[href]')) warn('nofb-' + f.id, 'у формы #' + f.id + ' нет запасного контакта (data-fallback) — человеку некуда написать');
    return p;
  };
  Form.prototype.show = function (kind, focus) {
    var self = this;
    ['success', 'error', 'fallback'].forEach(function (k) {
      var p = self.el.querySelector('[data-form-' + k + ']');
      if (p && k !== kind) p.hidden = true;
    });
    var p = kind ? this.panel(kind) : null;
    if (p) {
      p.hidden = false;
      if (focus) { try { p.focus({ preventScroll: true }); } catch (_) { p.focus(); } if (p.scrollIntoView && !this.inView(p)) p.scrollIntoView({ block: 'center' }); }
    }
    return p;
  };
  Form.prototype.inView = function (el) { var r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; };

  Form.prototype.busy = function (on) {
    var f = this.el;
    this.sending = on;
    f.classList.toggle('is-sending', on);
    if (on) f.setAttribute('aria-busy', 'true'); else f.removeAttribute('aria-busy');
    $$('button[type="submit"], button:not([type]), input[type="submit"]', f).forEach(function (b) { b.disabled = on; });
  };

  Form.prototype.emit = function (name, detail) {
    var ev;
    try { ev = new CustomEvent(name, { bubbles: true, detail: detail || {} }); }
    catch (_) { ev = d.createEvent('CustomEvent'); ev.initCustomEvent(name, true, false, detail || {}); }
    this.el.dispatchEvent(ev);
  };

  /* ── Отправка ── */
  Form.prototype.submit = function () {
    var self = this, f = this.el, cfg = this.cfg();
    if (this.sending) return Promise.resolve(false);   // двойной клик не шлёт две заявки
    this.show(null);

    /* бот заполнил невидимое поле: делаем вид, что всё прошло, ничего не отправляя */
    if (this.hp && trim(this.hp.value)) { this.succeed(true); return Promise.resolve(true); }
    if (!this.validate()) { this.emit('form:invalid'); return Promise.resolve(false); }

    var box = this.consentBox();
    if (this.collectsPII() && !box) {
      /* согласия нет в разметке — ПДн не отправляем; человек получает прямой контакт */
      return Promise.resolve(this.fallback());
    }
    if (box && !box.checked) { this.setError(box, this.msg.consent); this.focus(box); return Promise.resolve(false); }

    if (!cfg.endpoint) return Promise.resolve(this.fallback());

    var fields = this.data();
    var payload = { form: cfg.name, page: location.href, fields: fields, consent: true, website: '', ts: new Date().toISOString() };
    this.busy(true);

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer;
    var timeout = new Promise(function (_, reject) { timer = setTimeout(function () { if (ctrl) ctrl.abort(); reject(new Error('timeout')); }, cfg.timeout); });
    var req = fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined,
      credentials: 'omit',
      mode: 'cors'
    }).then(function (res) {
      return res.text().then(function (text) {
        var json = null;
        try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
        if (!res.ok) throw new Error('http-' + res.status);
        if (json && json.ok === false) throw new Error(json.error ? 'server-' + json.error : 'server');
        return json;
      });
    });

    return Promise.race([req, timeout]).then(function () {
      clearTimeout(timer);
      self.busy(false);
      self.succeed(false, fields);
      return true;
    }, function (err) {
      clearTimeout(timer);
      self.busy(false);
      /* TypeError у fetch — сеть или CORS (текст у браузеров разный), AbortError — наш таймаут */
      var reason = !err ? 'network' : err.name === 'AbortError' || err.message === 'timeout' ? 'timeout' : err.name === 'TypeError' ? 'network' : err.message || 'network';
      self.show('error', true);
      self.emit('form:error', { reason: reason });
      return false;
    });
  };

  Form.prototype.succeed = function (silent, fields) {
    var body = this.el.querySelector('[data-form-body]');
    if (body) body.hidden = true;
    this.el.classList.add('is-sent');
    this.show('success', true);
    if (silent) return;
    this.emit('form:sent', { name: this.cfg().name, fields: fields });
    try { if (typeof window.siteGoal === 'function') window.siteGoal('form-sent'); } catch (_) { /* счётчик не мешает заявке */ }
    /* данные человека не висят в DOM после отправки */
    try { this.el.reset(); } catch (_) { /* старый браузер */ }
  };

  /* ── Приёмника нет: честная панель с контактом и текст заявки в буфере. Ни одного запроса,
     ни одного перехода на tg:/mailto: — ссылку человек открывает сам ── */
  Form.prototype.fallback = function () {
    var self = this, p = this.show('fallback', true), text = this.compose(this.data());
    var note = p.querySelector('[data-form-copied]');
    if (note) note.hidden = true;
    var done = function (ok) {
      if (ok && note) note.hidden = false;
      self.emit('form:fallback', { copied: !!ok });
      return false;
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        return navigator.clipboard.writeText(text).then(function () { return done(true); }, function () { return done(false); });
      }
    } catch (_) { /* буфер недоступен — контакт виден и так */ }
    return done(false);
  };

  /* ── Вход ── */
  function siteForm(el, opts) {
    if (typeof el === 'string') el = d.querySelector(el);
    if (!el || el.tagName !== 'FORM') { warn('nf', 'siteForm: нужен элемент <form>'); return null; }
    if (el.__siteForm) {
      if (opts) { var fm = el.__siteForm, k; fm.opts = opts; for (k in MSG) fm.msg[k] = (opts.messages || {})[k] || MSG[k]; }
      return el.__siteForm;
    }
    return new Form(el, opts);
  }
  function autoInit() { $$('form[data-form]').forEach(function (f) { siteForm(f); }); }
  function expose() { if (window.site && !window.site.form) window.site.form = siteForm; }

  window.siteForm = siteForm;
  expose();
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function () { expose(); autoInit(); }, { once: true });
  else autoInit();
})();
