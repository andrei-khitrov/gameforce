/* GL — заготовка WebGL-блока без облика: ни шейдера, ни цвета здесь нет. Подключается ТОЛЬКО если
   в паспортах есть WebGL-блок, после core.js:  <script defer src="assets/js/gl.js"></script>

   var scene = site.gl(canvas, {
     frag: '…',                      // фрагментный шейдер донора (GLSL ES 1.00)
     vert: '…',                      // по умолчанию — треугольник на весь холст, varying vec2 vUv
     uniforms: { uTint: [1, 1, 1] }, // начальные значения; uTime (с) и uRes (px) ядро ведёт само, если они есть в шейдере
     frame: function (scene, t, dt) {},   // перед каждым кадром: scene.set('uName', v)
     draw: function (scene, t) {},        // своя геометрия вместо треугольника
     dprMax: 1.75, lazy: true, context: 'webgl', attrs: {}, staticTime: 0, onFail: function () {}
   });
   scene.set(name, value) · scene.texture(источник, { flipY, repeat, nearest, premultiply, format, width, height })
   scene.once(t) → [r, g, b, a] центра · scene.start() · scene.stop() · scene.destroy() · scene.gl · scene.program

   Что закрыто:
   · контекст не создался или шейдер не собрался — лог с номерами строк, canvas[hidden], html.no-webgl, onFail:
     рядом с холстом держать постер-фолбэк (img), сайт без WebGL остаётся целым;
   · scene.set() предупреждает о юниформе, которого нет в программе: uniform*(null, …) молчит, сцена просто пустая
     (uVp вместо uVP — ни ошибки в консоли, ни gl.getError());
   · pixelStorei — глобальное состояние контекста: FLIP_Y, PREMULTIPLY и UNPACK_ALIGNMENT=1 выставляются перед
     КАЖДОЙ загрузкой текстуры (атлас приходил перевёрнутым после картинки; LUMINANCE шириной не кратной 4 ломался на 390);
   · DPR ≤ 1.75; размер — по ResizeObserver; вне кадра и в скрытой вкладке кадры не рисуются; lazy — контекст
     и компиляция только на подходе к секции;
   · once(t) рисует кадр синхронно и читает пиксель: проверка шейдера не зависит от rAF (скрытая вкладка, Browser pane);
   · reduced-motion — один статичный кадр (staticTime), перерисовка только на ресайз;
   · потеря контекста — пересборка программы и текстур.
   О картинке судить только в headful: headless Chrome рисует SwiftShader'ом, полосы и затенение там ложные. */
(function () {
  'use strict';
  var site = window.site;
  if (!site) { console.error('[gl] core.js не подключён: gl.js грузится после него'); return; }

  var VERT = 'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}';
  var warned = {};
  function warn(key, msg) { if (!warned[key]) { warned[key] = 1; console.warn('[gl] ' + msg); } }

  function createScene(canvas, opts) {
    opts = opts || {};
    var gl = null, program = null, uniforms = {}, values = {}, textures = [], nextUnit = 0;
    var running = false, shown = false, inited = false, failed = false, destroyed = false;
    var raf = 0, clock = 0, last = 0, offVisible = null, ro = null;
    var dprMax = opts.dprMax || 1.75;

    function fail(msg) {
      failed = true;
      console.error('[gl] ' + msg);
      canvas.hidden = true;
      document.documentElement.classList.add('no-webgl');
      if (opts.onFail) opts.onFail();
    }
    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(sh);
        var numbered = src.split('\n').map(function (l, i) { return (i + 1) + ': ' + l; }).join('\n');
        gl.deleteShader(sh);
        throw new Error((type === gl.VERTEX_SHADER ? 'вершинный' : 'фрагментный') + ' шейдер не собрался:\n' + log + '\n' + numbered);
      }
      return sh;
    }
    function build() {
      var p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, opts.vert || VERT));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, opts.frag));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('программа не слинковалась: ' + gl.getProgramInfoLog(p));
      gl.useProgram(p);
      program = p; uniforms = {};
      var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, info, name;
      for (i = 0; i < n; i++) {
        info = gl.getActiveUniform(p, i); name = info.name.replace(/\[0\]$/, '');
        uniforms[name] = { loc: gl.getUniformLocation(p, info.name), type: info.type };
      }
      if (!opts.draw) {
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var at = gl.getAttribLocation(p, 'aPos');
        if (at < 0) warn('aPos', 'в вершинном шейдере нет attribute aPos — треугольник по умолчанию не нарисуется');
        else { gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0); }
      }
    }
    function apply(name, v) {
      var u = uniforms[name];
      if (!u) { warn('u-' + name, 'юниформа «' + name + '» нет в программе (регистр имени? шейдер её не использует?)'); return; }
      var t = u.type, l = u.loc;
      if (t === gl.FLOAT) gl.uniform1f(l, v);
      else if (t === gl.FLOAT_VEC2) gl.uniform2fv(l, v);
      else if (t === gl.FLOAT_VEC3) gl.uniform3fv(l, v);
      else if (t === gl.FLOAT_VEC4) gl.uniform4fv(l, v);
      else if (t === gl.FLOAT_MAT3) gl.uniformMatrix3fv(l, false, v);
      else if (t === gl.FLOAT_MAT4) gl.uniformMatrix4fv(l, false, v);
      else if (t === gl.INT_VEC2) gl.uniform2iv(l, v);
      else if (t === gl.INT_VEC3) gl.uniform3iv(l, v);
      else if (t === gl.INT_VEC4) gl.uniform4iv(l, v);
      else gl.uniform1i(l, v);   // int, bool, sampler
    }
    function set(name, v) {
      values[name] = v;
      if (inited && !failed) apply(name, v);
      return scene;
    }
    function upload(t) {
      var o = t.opts, fmt = gl[o.format || 'RGBA'];
      gl.activeTexture(gl.TEXTURE0 + t.unit);
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, o.flipY !== false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !!o.premultiply);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      if (ArrayBuffer.isView(t.source)) gl.texImage2D(gl.TEXTURE_2D, 0, fmt, o.width, o.height, 0, fmt, gl.UNSIGNED_BYTE, t.source);
      else gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, t.source);
      /* REPEAT — атласу, чьи UV в шейдере уходят ниже нуля; в WebGL1 только для размеров — степеней двойки */
      var wrap = o.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE, filter = o.nearest ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    }
    /* источник: img | canvas | video | ImageBitmap | Uint8Array (тогда нужны width и height).
       Возвращает { unit, update(источник) }; номер юнита передаётся сэмплеру: scene.set('uTex', t.unit) */
    function texture(source, o) {
      var t = { source: source, opts: o || {}, unit: (o && o.unit != null) ? o.unit : nextUnit++, tex: null };
      textures.push(t);
      if (inited && !failed) { t.tex = gl.createTexture(); upload(t); }
      return { unit: t.unit, update: function (src) { if (src) t.source = src; if (inited && !failed) upload(t); if (!running) render(); } };
    }
    function resize() {
      if (!inited || failed) return;
      var dpr = Math.min(window.devicePixelRatio || 1, dprMax);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      if (uniforms.uRes) apply('uRes', [w, h]);
    }
    function render(dt) {
      if (!inited || failed) return;
      if (uniforms.uTime) apply('uTime', clock);
      if (opts.frame) opts.frame(scene, clock, dt || 0);
      if (opts.draw) opts.draw(scene, clock); else gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function tick(now) {
      if (!running) return;
      var dt = Math.min(0.1, (now - last) / 1000);   // после паузы время не прыгает
      last = now; clock += dt;
      render(dt);
      raf = requestAnimationFrame(tick);
    }
    function sync() {
      var want = inited && !failed && !destroyed && shown && !document.hidden && !site.RM;
      if (want && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
      else if (!want && running) { running = false; cancelAnimationFrame(raf); }
    }
    function restore() {
      try {
        build();
        textures.forEach(function (t) { t.tex = gl.createTexture(); upload(t); });
        Object.keys(values).forEach(function (k) { apply(k, values[k]); });
        resize();
      } catch (err) { fail(err.message); }
    }
    function init() {
      if (inited || failed || destroyed) return;
      try {
        gl = canvas.getContext(opts.context || 'webgl', Object.assign({ alpha: true, antialias: false, premultipliedAlpha: true }, opts.attrs || {}));
      } catch (err) { gl = null; }
      if (!gl) { fail('WebGL-контекст не создан'); return; }
      scene.gl = gl;
      inited = true;
      restore();
      if (failed) return;
      scene.program = program;
      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; cancelAnimationFrame(raf); });
      canvas.addEventListener('webglcontextrestored', function () { restore(); scene.program = program; if (site.RM) render(); sync(); });
      if ('ResizeObserver' in window) { ro = new ResizeObserver(function () { resize(); if (!running) render(); }); ro.observe(canvas); }
      if (site.RM) { clock = opts.staticTime || 0; render(); }
    }

    var scene = {
      gl: null, program: null, canvas: canvas,
      set: set, texture: texture,
      /* синхронный кадр для проверок: рисует сейчас, без rAF, и возвращает пиксель центра */
      once: function (t) {
        init(); if (failed) return null;
        if (t != null) clock = t;
        resize(); render(0);
        var px = new Uint8Array(4);
        gl.readPixels(canvas.width >> 1, canvas.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return Array.prototype.slice.call(px);
      },
      start: function () { init(); shown = true; sync(); },
      stop: function () { shown = false; sync(); },
      destroy: function () {
        destroyed = true; sync();
        if (offVisible) offVisible(); if (ro) ro.disconnect();
        document.removeEventListener('visibilitychange', sync);
        var ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      },
      get failed() { return failed; }, get running() { return running; }
    };

    Object.keys(opts.uniforms || {}).forEach(function (k) { values[k] = opts.uniforms[k]; });
    document.addEventListener('visibilitychange', sync);
    /* ленивый старт: контекст и компиляция — на подходе к секции (полэкрана запаса), кадры — только в кадре */
    if (opts.lazy === false) init();
    var offNear = site.visible(canvas, function (v) { if (v) { offNear(); init(); } }, { margin: '50% 0px' });
    offVisible = site.visible(canvas, function (v) { shown = v; if (v) init(); sync(); });
    return scene;
  }

  site.gl = createScene;
})();
