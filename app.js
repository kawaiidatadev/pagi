/* PAGI · interfaz de la página principal. Textos en #i18n (uno por idioma); cálculos en logic.js. */
(function () {
  'use strict';
  var L = window.PAGILogic;
  var $ = function (id) { return document.getElementById(id); };
  var T = JSON.parse($('i18n').textContent);
  var LANG = document.documentElement.lang === 'es' ? 'es-MX' : 'en-US';
  var WA = 'https://wa.me/523324393525?text=';
  var money = new Intl.NumberFormat(LANG, { style: 'currency', currency: 'MXN', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });
  var money2 = new Intl.NumberFormat(LANG, { style: 'currency', currency: 'MXN', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var num = new Intl.NumberFormat(LANG, { maximumFractionDigits: 0 });
  var num1 = new Intl.NumberFormat(LANG, { maximumFractionDigits: 1 });
  function still() { return window.pagiMotionOff ? window.pagiMotionOff() : false; }
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function h(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function bump(el, cls) { el.classList.remove(cls || 'swap'); if (still()) return; void el.offsetWidth; el.classList.add(cls || 'swap'); }

  /* Estado que sobrevive al cambio de idioma (sessionStorage, sólo en este navegador) */
  var S = {};
  try { S = JSON.parse(sessionStorage.getItem('pagi-state') || '{}') || {}; } catch (e) { S = {}; }
  function save() { try { sessionStorage.setItem('pagi-state', JSON.stringify(S)); } catch (e) {} }

  /* Interpolación numérica breve */
  function tween(el, to, format, key) {
    var from = parseFloat(el.dataset.val || '0'); el.dataset.val = to;
    if (still() || !isFinite(from) || from === to) { el.textContent = format(to); return; }
    var t0 = performance.now(), id = (el._tw = (el._tw || 0) + 1);
    (function step(t) {
      if (el._tw !== id) return;
      var k = Math.min(1, (t - t0) / 420), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
      el.textContent = format(k < 1 ? v : to);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
    setTimeout(function () { if (el._tw === id) el.textContent = format(to); }, 520);
  }

  /* Altura animada para paneles que se abren y cierran */
  function slide(el, open) {
    if (still() || !el.animate) { el.hidden = !open; return; }
    if (open) { el.hidden = false; var hh = el.scrollHeight; el.animate([{ height: '0px', opacity: 0 }, { height: hh + 'px', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
    else { var h0 = el.scrollHeight; var a = el.animate([{ height: h0 + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: 'ease-in' }); a.onfinish = function () { el.hidden = true; }; }
  }

  /* ---------- 1. Fondo de nodos del encabezado principal (estático: se redibuja sólo al cambiar tamaño o tema) ---------- */
  (function net() {
    var cv = $('net'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), nodes = [], W = 0, H = 0, color = '37,99,235';
    function readColor() { var c = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim(); var m = c.match(/^#([0-9a-f]{6})$/i); if (m) { var n = parseInt(m[1], 16); color = [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); } }
    function size() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(38, Math.round(W * H / 26000)); nodes = [];
      var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      for (var i = 0; i < n; i++) nodes.push({ x: rnd() * W, y: rnd() * H });
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) { ctx.strokeStyle = 'rgba(' + color + ',' + (0.16 * (1 - d / 150)) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        ctx.fillStyle = 'rgba(' + color + ',.28)'; ctx.beginPath(); ctx.arc(a.x, a.y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    readColor(); size();
    window.addEventListener('resize', function () { clearTimeout(cv._r); cv._r = setTimeout(size, 150); });
    new MutationObserver(function () { readColor(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { readColor(); draw(); });
  })();

  /* ---------- 2. Comparador manual / automatizado ---------- */
  (function ficha() {
    var box = $('ficha'), flow = $('flow'), kpis = $('kpis');
    T.stages.forEach(function (s, i) {
      var li = h('li', { class: 'stage', style: '--i:' + i });
      li.innerHTML = '<span class="n">0' + (i + 1) + '</span><b>' + esc(s.t) + '</b><span class="how"></span><span class="chip"></span><span class="pk" aria-hidden="true"></span>';
      flow.appendChild(li);
    });
    function paint(mode, animate) {
      box.dataset.mode = mode; S.mode = mode; save();
      box.querySelectorAll('.seg button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === mode ? 'true' : 'false'); });
      [].forEach.call(flow.children, function (li, i) {
        var s = T.stages[i];
        li.querySelector('.how').textContent = mode === 'auto' ? s.a : s.m;
        var c = li.querySelector('.chip'); c.className = 'chip ' + mode; c.textContent = mode === 'auto' ? T.chipA : T.chipM;
        if (animate) { li.classList.add('changed'); setTimeout(function () { li.classList.remove('changed'); }, 300 + i * 70); }
      });
      var k = mode === 'auto' ? T.kpiA : T.kpiM;
      kpis.innerHTML = k.map(function (x) { return '<div><strong>' + esc(x[0]) + '</strong><small>' + esc(x[1]) + '</small></div>'; }).join('');
      if (animate) [].forEach.call(kpis.children, function (d) { bump(d); });
      if (animate) $('mode-say').textContent = T.modeSay[mode];
    }
    // Los paquetes recorren el flujo unos ciclos (CSS) al entrar en pantalla y al cambiar de modo; luego se detienen.
    function flowOnce() { flow.classList.remove('flowing'); void flow.offsetWidth; flow.classList.add('flowing'); }
    box.querySelectorAll('.seg button').forEach(function (b) { b.addEventListener('click', function () { paint(b.dataset.mode, true); flowOnce(); }); });
    paint(S.mode === 'auto' ? 'auto' : 'manual', false);
    if ('IntersectionObserver' in window) { var fo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { flowOnce(); fo.disconnect(); } }, { threshold: 0.4 }); fo.observe(flow); }
    else flowOnce();
  })();

  /* ---------- 3. Autodiagnóstico ---------- */
  var quiz = (function () {
    var form = $('quiz'), steps = $('qsteps'), dots = $('qdots'), Q = T.q, n = Q.length;
    var st = S.quiz || { answers: {}, step: 0 }; S.quiz = st;
    Q.forEach(function (q, i) {
      var fs = h('fieldset', { class: 'qstep', id: 'qs-' + i });
      fs.innerHTML = '<legend>' + esc(q.q) + '</legend><div class="opts">' + T.opts.map(function (o, v) {
        return '<label class="opt"><input type="radio" name="q-' + q.id + '" value="' + v + '"' + (st.answers[q.id] === v ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
      }).join('') + '</div>';
      steps.appendChild(fs);
      var d = h('button', { type: 'button' }, String(i + 1)); d.addEventListener('click', function () { go(i); }); dots.appendChild(d);
    });
    form.addEventListener('change', function (e) {
      var m = e.target.name && e.target.name.match(/^q-(.+)$/); if (!m) return;
      st.answers[m[1]] = +e.target.value; $('qerr').textContent = ''; save(); paint(); result();
    });
    function go(i) { st.step = Math.max(0, Math.min(n - 1, i)); $('qerr').textContent = ''; save(); paint(true); }
    function paint(focus) {
      var answered = Q.filter(function (q) { return st.answers[q.id] != null; }).length;
      [].forEach.call(steps.children, function (fs, i) { fs.hidden = i !== st.step; });
      if (focus) { var cur = steps.children[st.step]; bump(cur, 'qstep'); var inp = cur.querySelector('input:checked') || cur.querySelector('input'); if (inp) inp.focus({ preventScroll: true }); }
      $('qcount').textContent = T.qQuestion + ' ' + (st.step + 1) + ' ' + T.qOf + ' ' + n;
      var bar = $('qbar'); bar.setAttribute('aria-valuenow', answered); bar.firstElementChild.style.width = (answered / n * 100) + '%';
      [].forEach.call(dots.children, function (d, i) {
        var done = st.answers[Q[i].id] != null;
        d.classList.toggle('done', done);
        if (i === st.step) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
        d.setAttribute('aria-label', T.qGo + ' ' + (i + 1) + (done ? ' (' + T.qAnswered + ')' : ''));
      });
      $('qprev').disabled = st.step === 0;
      $('qnext').textContent = st.step === n - 1 ? T.qSee : T.qNext;
    }
    $('qprev').addEventListener('click', function () { go(st.step - 1); });
    $('qnext').addEventListener('click', function () {
      if (st.answers[Q[st.step].id] == null) { $('qerr').textContent = T.qNeed; return; }
      if (st.step < n - 1) { go(st.step + 1); return; }
      var r = L.evaluateQuiz(st.answers);
      if (!r.complete) { go(Q.map(function (q) { return q.id; }).indexOf(r.missing[0])); $('qerr').textContent = T.qNeed; return; }
      result(); $('qresult').scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'nearest' }); $('qout').focus && $('qout').focus();
    });
    function summary() {
      var r = L.evaluateQuiz(st.answers); if (!r.complete) return null;
      var lines = [T.waQuiz, T.waLevel + ': ' + T.lv[r.level] + ' (' + r.total + '/' + r.max + ')'];
      if (r.top.length) lines.push(T.waTop + ': ' + r.top.map(function (id) { return T.short[id]; }).join(', '));
      if (r.suggested) lines.push(T.waSugg + ': ' + r.suggested + ' · ' + T.svcName[r.suggested]);
      return lines.join('\n');
    }
    function result() {
      var r = L.evaluateQuiz(st.answers), out = $('qout');
      document.querySelectorAll('.svc.hi').forEach(function (s) { s.classList.remove('hi'); var t = s.querySelector('.tag.reco'); if (t) t.remove(); });
      var fq = $('f-quiz'); if (fq) { fq.disabled = !r.complete; $('l-quiz').classList.toggle('off', !r.complete); if (r.complete) $('l-quiz').querySelector('span').textContent = T.form.quizOn; }
      if (!r.complete) { out.hidden = true; $('qempty').hidden = false; return; }
      var recs = L.QUIZ.filter(function (q) { return st.answers[q.id] > 0; }).sort(function (a, b) { return st.answers[b.id] - st.answers[a.id]; });
      out.innerHTML =
        '<div class="level"><span class="badge ' + r.level + '">' + esc(T.rLevel) + ': ' + esc(T.lv[r.level]) + '</span><strong class="num">' + r.total + '/' + r.max + '</strong><span class="muted">' + esc(T.rPoints) + '</span></div>' +
        '<div class="meter"><span style="width:' + (r.total / r.max * 100) + '%"></span></div><p>' + esc(T.lvTxt[r.level]) + '</p>' +
        '<div><h4>' + esc(T.rTop) + '</h4>' + (r.top.length ? '<ul>' + r.top.map(function (id) { return '<li>' + esc(T.short[id]) + '</li>'; }).join('') + '</ul>' : '<p class="muted">' + esc(T.rNoTop) + '</p>') + '</div>' +
        (recs.length ? '<div><h4>' + esc(T.rRecs) + '</h4><ul class="recs">' + recs.map(function (q) { return '<li>' + esc(T.recs[q.id]) + '</li>'; }).join('') + '</ul></div>' : '') +
        (r.suggested ? '<div><h4>' + esc(T.rSugg) + '</h4><p><a href="#' + r.suggested + '">' + r.suggested + ' · ' + esc(T.svcName[r.suggested]) + '</a></p></div>' : '') +
        '<div><h4>' + esc(T.rNext) + '</h4><p>' + esc(r.next ? T.rNextS1 : T.rNextNone) + '</p></div>' +
        '<div class="row"><a class="btn primary small" target="_blank" rel="noopener" href="' + WA + encodeURIComponent(summary() + '\n' + T.waWant) + '">' + esc(T.rSend) + '</a>' +
        '<button type="button" class="btn ghost small" data-q="review">' + esc(T.rReview) + '</button><button type="button" class="btn ghost small" data-q="restart">' + esc(T.rRestart) + '</button></div>' +
        '<details class="how-calc"><summary>' + esc(T.rHow) + '</summary><p>' + esc(T.rHowTxt) + '</p></details><p class="muted" style="font-size:.85rem">' + esc(T.rNote) + '</p>';
      out.setAttribute('tabindex', '-1'); out.hidden = false; $('qempty').hidden = true; bump(out);
      ['S1', r.suggested].forEach(function (k) { var c = k && $(k); if (c) { c.classList.add('hi'); if (k === r.suggested) c.querySelector('.svc-top').insertAdjacentHTML('beforeend', '<span class="tag reco">' + esc(T.svcL.reco) + '</span>'); } });
      out.querySelector('[data-q="review"]').addEventListener('click', function () { go(0); form.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' }); });
      out.querySelector('[data-q="restart"]').addEventListener('click', function () { st.answers = {}; form.reset(); go(0); result(); paint(); });
    }
    return { init: function () { paint(false); result(); }, summary: summary };
  })();

  /* ---------- 4. Servicios ---------- */
  (function services() {
    var box = $('svcs'), L2 = T.svcL;
    T.services.forEach(function (s) {
      var a = h('article', { class: 'svc reveal' + (s.entry ? ' entry' : ''), id: s.id });
      a.innerHTML = '<div class="svc-top"><span class="code">' + s.id + '</span>' + (s.entry ? '<span class="tag">' + esc(L2.entry) + '</span>' : '') + '</div>' +
        '<h3>' + esc(s.name) + '</h3><p>' + esc(s.sum) + '</p>' +
        '<dl class="svc-meta"><dt>' + esc(L2.dur) + '</dt><dd>' + esc(s.dur) + '</dd><dt>' + esc(L2.price) + '</dt><dd>' + esc(s.price) + '</dd></dl>' +
        '<button type="button" class="more" aria-expanded="false" aria-controls="m-' + s.id + '">' + esc(L2.more) + '</button>' +
        '<div class="svc-more" id="m-' + s.id + '" hidden>' +
        '<div><h4>' + esc(L2.prob) + '</h4><p>' + esc(s.prob) + '</p></div><div><h4>' + esc(L2.when) + '</h4><p>' + esc(s.when) + '</p></div>' +
        '<div><h4>' + esc(L2.deliv) + '</h4><ul>' + s.deliv.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul></div>' +
        '<div><h4>' + esc(L2.need) + '</h4><p>' + esc(s.need) + '</p></div><div><h4>' + esc(L2.lim) + '</h4><p>' + esc(s.lim) + '</p></div>' +
        '<div><h4>' + esc(L2.next) + '</h4><p>' + esc(s.next) + '</p><p style="margin-top:8px"><a href="#contacto" data-ask="' + s.id + '">' + esc(L2.ask) + ' →</a></p></div></div>';
      box.appendChild(a);
      var btn = a.querySelector('.more'), panel = a.querySelector('.svc-more');
      btn.addEventListener('click', function () { var open = btn.getAttribute('aria-expanded') !== 'true'; btn.setAttribute('aria-expanded', open); btn.textContent = open ? L2.less : L2.more; slide(panel, open); });
      a.querySelector('[data-ask]').addEventListener('click', function () { var sel = $('f-tema'); if (sel) sel.value = s.id; });
    });
  })();

  /* ---------- 5. Calculadora ---------- */
  var calc = (function () {
    var KEYS = ['horas', 'personas', 'costoHora', 'semanas', 'inversion', 'recurrente', 'anios'];
    var DEF = { horas: '5', personas: '1', costoHora: '120', semanas: '48', reduccion: '60', inversion: '25000', recurrente: '0', anios: '3' };
    var cs = S.calc || { v: {}, touched: false }; S.calc = cs;
    var last = null;
    KEYS.concat('reduccion').forEach(function (k) { var el = $('c-' + k); if (cs.v[k] != null) el.value = cs.v[k]; el.addEventListener('input', function () { cs.v[k] = el.value; cs.touched = true; save(); update(); }); });
    $('calc').addEventListener('submit', function (e) { e.preventDefault(); });
    $('calc-reset').addEventListener('click', function () { for (var k in DEF) $('c-' + k).value = DEF[k]; cs.v = {}; cs.touched = false; save(); update(); });
    function months(m) { return num1.format(m) + ' ' + T.calc.months; }
    function payback(r) {
      if (r.inversion === 0) return T.calc.noInv;
      if (r.recuperacionMeses === null) return T.calc.none;
      return months(r.recuperacionMeses) + (r.recuperaDentroHorizonte ? '' : ' ' + T.calc.beyond);
    }
    function niceStep(range) { var raw = range / 4, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
    function shortMoney(v) { var a = Math.abs(v); return (v < 0 ? '−' : '') + '$' + (a >= 1e6 ? num1.format(a / 1e6) + 'M' : a >= 1e3 ? num1.format(a / 1e3) + 'k' : num.format(a)); }

    function annualChart(r) {
      var svg = $('svg-annual'), x0 = 118, w = 450, max = Math.max(r.costoActual, r.costoAutomatizado, 1), step = niceStep(max), top = Math.ceil(max / step) * step;
      var sx = function (v) { return v / top * w; }, g = '';
      for (var t = 0; t <= top + 1e-9; t += step) g += '<line x1="' + (x0 + sx(t)) + '" x2="' + (x0 + sx(t)) + '" y1="8" y2="118"/><text x="' + (x0 + sx(t)) + '" y="138" text-anchor="middle">' + shortMoney(t) + '</text>';
      var bars = [[T.calc.cur, r.costoActual, 0], [T.calc.aut, r.manualRestante, r.recurrente]];
      var html = '<g class="grid">' + g + '</g>';
      bars.forEach(function (b, i) {
        var y = 20 + i * 52;
        html += '<text x="' + (x0 - 10) + '" y="' + (y + 21) + '" text-anchor="end" style="fill:var(--ink)">' + esc(b[0]) + '</text>' +
          '<rect x="' + x0 + '" y="' + y + '" height="32" rx="3" width="' + sx(b[1]) + '" style="fill:var(--orange);transition:width .5s"><title>' + money.format(b[1]) + '</title></rect>' +
          (b[2] > 0 ? '<rect x="' + (x0 + sx(b[1])) + '" y="' + y + '" height="32" width="' + sx(b[2]) + '" style="fill:var(--blue)"><title>' + money.format(b[2]) + '</title></rect>' : '') +
          '<text x="' + Math.min(x0 + sx(b[1] + b[2]) + 6, 590) + '" y="' + (y + 21) + '" style="fill:var(--ink)">' + money.format(b[1] + b[2]) + '</text>';
      });
      svg.innerHTML = html;
      $('ch-annual-desc').textContent = fill(T.calc.descAnnual, { a: money.format(r.costoActual), b: money.format(r.costoAutomatizado), c: money.format(r.recurrente) });
    }

    function cumChart(sc, years) {
      var svg = $('svg-cum'), W = 600, H = 240, l = 64, rpad = 16, t = 12, b = 34, keys = ['conservador', 'intermedio', 'optimista'];
      var cls = { conservador: 's-cons', intermedio: 's-mid', optimista: 's-opt' };
      var all = []; keys.forEach(function (k) { all = all.concat(sc[k].serie); });
      var lo = Math.min(0, Math.min.apply(null, all)), hi = Math.max(0, Math.max.apply(null, all)); if (hi === lo) hi = lo + 1;
      var step = niceStep(hi - lo); lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
      var n = years * 12, sx = function (m) { return l + m / n * (W - l - rpad); }, sy = function (v) { return t + (hi - v) / (hi - lo) * (H - t - b); };
      var g = '<g class="grid">';
      for (var v = lo; v <= hi + 1e-9; v += step) g += '<line x1="' + l + '" x2="' + (W - rpad) + '" y1="' + sy(v) + '" y2="' + sy(v) + '"/><text x="' + (l - 8) + '" y="' + (sy(v) + 4) + '" text-anchor="end">' + shortMoney(v) + '</text>';
      for (var y = 0; y <= years; y++) g += '<text x="' + sx(y * 12) + '" y="' + (H - 12) + '" text-anchor="middle">' + (y === 0 ? '0' : y + ' ' + (y === 1 ? T.calc.year : T.calc.years)) + '</text>';
      g += '</g><line class="zero" x1="' + l + '" x2="' + (W - rpad) + '" y1="' + sy(0) + '" y2="' + sy(0) + '"/>';
      keys.forEach(function (k) {
        var d = sc[k].serie.map(function (v, m) { return (m ? 'L' : 'M') + sx(m).toFixed(1) + ' ' + sy(v).toFixed(1); }).join('');
        g += '<path class="' + cls[k] + ' ln" d="' + d + '" pathLength="1" fill="none" style="stroke:var(--s);stroke-width:' + (k === 'intermedio' ? 3 : 2) + ';stroke-dasharray:1;stroke-dashoffset:0"/>';
      });
      var mid = sc.intermedio;
      if (mid.recuperacionMeses !== null && mid.recuperacionMeses > 0 && mid.recuperaDentroHorizonte) g += '<circle cx="' + sx(mid.recuperacionMeses) + '" cy="' + sy(0) + '" r="5" style="fill:var(--surface);stroke:var(--blue);stroke-width:2.5"><title>' + payback(mid) + '</title></circle>';
      g += '<line id="cum-x" y1="' + t + '" y2="' + (H - b) + '" style="stroke:var(--muted);stroke-width:1" visibility="hidden"/><rect id="cum-hit" x="' + l + '" y="' + t + '" width="' + (W - l - rpad) + '" height="' + (H - t - b) + '" fill="transparent"/>';
      svg.innerHTML = g;
      if (!still() && !svg._drawn) { svg._drawn = true; svg.querySelectorAll('path.ln').forEach(function (p) { p.animate && p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 700, easing: 'ease-out' }); }); }
      $('ch-cum-desc').textContent = fill(T.calc.descCum, { n: n, c: money.format(sc.conservador.beneficioNeto), m: money.format(mid.beneficioNeto), o: money.format(sc.optimista.beneficioNeto), i: money.format(mid.inversion) });
      var tip = $('cum-tip') || $('ch-cum').appendChild(h('div', { class: 'tip', id: 'cum-tip', hidden: '' }));
      var hit = $('cum-hit'), xl = $('cum-x');
      function move(e) {
        var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, m = Math.round((px - l) / (W - l - rpad) * n);
        m = Math.max(0, Math.min(n, m)); xl.setAttribute('x1', sx(m)); xl.setAttribute('x2', sx(m)); xl.setAttribute('visibility', 'visible');
        tip.hidden = false; tip.innerHTML = T.calc.month + ' ' + m + '<br>' + T.calc.cons + ': ' + money.format(sc.conservador.serie[m]) + '<br>' + T.calc.mid + ': ' + money.format(mid.serie[m]) + '<br>' + T.calc.opt + ': ' + money.format(sc.optimista.serie[m]);
        var cr = $('ch-cum').getBoundingClientRect(); tip.style.left = Math.max(80, Math.min(cr.width - 80, e.clientX - cr.left)) + 'px'; tip.style.top = (e.clientY - cr.top) + 'px';
      }
      hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
      hit.addEventListener('pointerleave', function () { tip.hidden = true; xl.setAttribute('visibility', 'hidden'); });
    }

    function update() {
      var raw = {}; KEYS.forEach(function (k) { raw[k] = $('c-' + k).value; });
      raw.reduccion = (+$('c-reduccion').value) / 100;
      $('o-reduccion').textContent = $('c-reduccion').value + '%';
      $('calc-sim').hidden = cs.touched;
      var v = L.validateInputs(raw);
      KEYS.forEach(function (k) { var el = $('c-' + k), e = v.errors[k]; el.setAttribute('aria-invalid', e ? 'true' : 'false'); $('e-' + k).textContent = e ? T.calc[e] : ''; });
      $('calc-out').classList.toggle('stale', !v.ok);
      if (!v.ok) return;
      var p = v.values, sc = L.scenarios(p), r = sc.intermedio; last = { p: p, r: r };
      var set = function (k, val, f) { var el = document.querySelector('[data-k="' + k + '"]'); tween(el, val, f); return el; };
      set('horasAnuales', r.horasAnuales, function (x) { return num.format(x) + ' ' + T.calc.h; });
      set('costoActual', r.costoActual, function (x) { return money.format(x); });
      set('dias', r.horasAnuales / 8, function (x) { return num1.format(x) + ' ' + T.calc.days; });
      set('horasLiberadas', r.horasLiberadas, function (x) { return num.format(x) + ' ' + T.calc.h; });
      set('valorLiberado', r.valorLiberado, function (x) { return money.format(x); });
      set('costoAutomatizado', r.costoAutomatizado, function (x) { return money.format(x); });
      set('inversion', r.inversion, function (x) { return money.format(x); });
      set('beneficioNeto', r.beneficioNeto, function (x) { return money.format(x); }).parentNode.classList.toggle('neg', r.beneficioNeto < 0);
      var pb = document.querySelector('[data-k="recuperacion"]'); pb.textContent = payback(r); pb.parentNode.classList.toggle('neg', r.recuperacionMeses === null && r.inversion > 0);
      $('horizon-label').textContent = T.calc.horizon + ': ' + p.anios + ' ' + (p.anios === 1 ? T.calc.year : T.calc.years);
      // Calendario de días laborales
      var cal = $('cal'), cells = Math.round(p.semanas * 5), used = Math.round(r.horasAnuales / 8), freed = Math.round(r.horasLiberadas / 8);
      while (cal.children.length < cells) cal.appendChild(document.createElement('i'));
      while (cal.children.length > cells) cal.removeChild(cal.lastChild);
      var u = Math.min(cells, used), fr = Math.min(u, freed);
      [].forEach.call(cal.children, function (el, i) { el.className = i < u - fr ? 'on' : i < u ? 'free' : ''; });
      $('cal-cap').textContent = used > cells ? T.calc.calFull : T.calc.calCap;
      annualChart(r); cumChart(sc, p.anios);
      var lbl = { conservador: T.calc.cons, intermedio: T.calc.mid, optimista: T.calc.opt };
      $('scen-table').tBodies[0].innerHTML = Object.keys(sc).map(function (k) {
        var x = sc[k];
        return '<tr><td>' + esc(lbl[k]) + '</td><td class="n">' + Math.round(x.reduccion * 100) + '%</td><td class="n">' + num.format(x.horasLiberadas) + '</td><td class="n">' + money.format(x.valorLiberado) + '</td><td class="n">' + money.format(x.beneficioNeto) + '</td><td class="n">' + esc(payback(x)) + '</td><td class="n">' + (x.roi === null ? T.calc.na : num.format(x.roi) + '%') + '</td></tr>';
      }).join('');
      $('calc-cta').href = WA + encodeURIComponent(fill(T.calc.wa, { h: num1.format(p.horas), p: p.personas, c: money.format(r.costoActual) }));
    }
    return {
      init: update,
      summary: function () { if (!last) return null; var p = last.p, r = last.r; return fill(T.calc.sum, { h: num1.format(p.horas), p: p.personas, c: money.format(r.costoActual), n: money.format(r.beneficioNeto), y: p.anios, r: payback(r) }); }
    };
  })();

  /* ---------- 6. Simulador ETL ---------- */
  (function etl() {
    var E = T.etl, res = L.runETL(), es = S.etl || { ran: false, tab: 'before' }; S.etl = es;
    var rules = $('rules'), table = $('etl-table'), run = $('etl-run'), reset = $('etl-reset');
    E.rules.forEach(function (r) { rules.appendChild(h('li', { 'data-r': r[0] }, '<b>' + r[0] + ' · ' + esc(r[1]) + '</b><span>' + esc(E.ruleTip[r[0]]) + '</span>')); });
    var F = ['id', 'cliente', 'fecha', 'monto', 'sucursal'];
    function show(v) { return v === '' ? '<span class="muted">∅</span>' : esc(v).replace(/^ +| +$/g, function (m) { return '<span class="ws">' + m.replace(/ /g, '␣') + '</span>'; }).replace(/ {2,}/g, function (m) { return '<span class="ws">' + m.replace(/ /g, '␣') + '</span>'; }); }
    function before() {
      var html = '<p class="label" style="margin-bottom:8px">' + esc(E.legendBefore) + '</p><div class="table-wrap" tabindex="0" role="region" aria-label="' + esc(E.cols.slice(1).join(', ')) + '"><table><thead><tr>' + E.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      res.rows.forEach(function (r) {
        html += '<tr><td class="num">' + r.row + '</td>' + F.map(function (f) {
          var touched = r.changes.some(function (c) { return c.field === f && c.rule !== 'R1'; }) || r.issues.some(function (i) { return i.field === f && i.level !== 'duplicate'; });
          return '<td' + (touched ? ' class="bad"' : '') + '>' + show(r.original[f]) + '</td>';
        }).join('') + '</tr>';
      });
      table.innerHTML = html + '</tbody></table></div>';
    }
    function reason(i) { return fill(E.codes[i.code], { f: i.field, r: (res.rows.filter(function (x) { return x.issues.indexOf(i) >= 0; })[0] || {}).duplicateOf }); }
    function after() {
      var html = '<p class="label" style="margin-bottom:8px">' + esc(E.legendAfter) + '</p><div class="table-wrap" tabindex="0" role="region" aria-label="' + esc(E.cols.slice(1).join(', ')) + '"><table><thead><tr>' + E.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '<th>' + esc(E.status) + '</th><th><span class="sr-only">' + esc(E.detail) + '</span></th></tr></thead><tbody>';
      res.rows.forEach(function (r) {
        html += '<tr><td class="num">' + r.row + '</td>' + F.map(function (f) {
          var iss = r.issues.filter(function (i) { return i.field === f && i.level !== 'duplicate'; })[0];
          var cls = iss ? (iss.level === 'reject' ? 'bad' : 'warn') : r.changes.some(function (c) { return c.field === f; }) ? 'fixed' : '';
          return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + show(r.clean[f]) + '</td>';
        }).join('') + '<td><span class="st ' + r.status + '">' + esc(E.st[r.status]) + '</span></td>' +
          '<td><button type="button" class="rowbtn" aria-expanded="false" aria-controls="d-' + r.row + '">' + esc(E.show) + '</button></td></tr>' +
          '<tr class="detail" id="d-' + r.row + '" hidden><td colspan="8"><ul>' +
          (r.changes.length || r.issues.length ? r.changes.map(function (c) { return '<li>' + esc(fill(E.change, { rule: c.rule, f: c.field, a: c.from, b: c.to })) + '</li>'; }).join('') +
            r.issues.map(function (i) { return '<li>' + i.rule + ': ' + esc(reason(i)) + '</li>'; }).join('') : '<li>' + esc(E.noIssues) + '</li>') + '</ul></td></tr>';
      });
      table.innerHTML = html + '</tbody></table></div>';
      table.querySelectorAll('.rowbtn').forEach(function (b) {
        b.addEventListener('click', function () { var d = $(b.getAttribute('aria-controls')), open = d.hidden; d.hidden = !open; b.setAttribute('aria-expanded', open); b.textContent = open ? E.hide : E.show; });
      });
    }
    function cons() {
      var max = Math.max.apply(null, res.consolidated.map(function (c) { return c.total; }));
      table.innerHTML = '<div class="etl-out"><div style="display:grid;gap:12px"><h3 style="font-size:1rem">' + esc(E.consTitle) + '</h3><div class="bars" role="img" aria-label="' + esc(res.consolidated.map(function (c) { return c.sucursal + ' ' + money2.format(c.total); }).join(', ')) + '">' +
        res.consolidated.map(function (c) { return '<div class="b"><span>' + esc(c.sucursal) + '</span><span class="track"><span class="fill" data-w="' + (c.total / max * 100) + '"></span></span><span class="num">' + money2.format(c.total) + '</span></div>'; }).join('') + '</div>' +
        '<div class="table-wrap" tabindex="0" role="region" aria-label="' + esc(E.cols.slice(1).join(', ')) + '"><table><thead><tr><th>' + esc(E.cols[5]) + '</th><th class="n">' + esc(E.orders) + '</th><th class="n">total</th></tr></thead><tbody>' +
        res.consolidated.map(function (c) { return '<tr><td>' + esc(c.sucursal) + '</td><td class="n">' + c.pedidos + '</td><td class="n">' + money2.format(c.total) + '</td></tr>'; }).join('') + '</tbody></table></div><p class="muted" style="font-size:.85rem;color:var(--c-muted)">' + esc(E.consNote) + '</p></div>' +
        '<pre><code><span class="kw">SELECT</span> sucursal, <span class="kw">COUNT</span>(*) <span class="kw">AS</span> pedidos, <span class="kw">SUM</span>(monto) <span class="kw">AS</span> total\n<span class="kw">FROM</span> pedidos_limpios\n<span class="kw">WHERE</span> estado <span class="kw">IN</span> (\'valido\', \'corregido\')\n<span class="kw">GROUP BY</span> sucursal\n<span class="kw">ORDER BY</span> total <span class="kw">DESC</span>;</code></pre></div>';
      requestAnimationFrame(function () { table.querySelectorAll('.fill').forEach(function (f) { f.style.width = f.dataset.w + '%'; }); });
    }
    var tabs = { before: $('tab-before'), after: $('tab-after'), cons: $('tab-cons') }, views = { before: before, after: after, cons: cons };
    function tab(name, focus) {
      es.tab = name; save();
      Object.keys(tabs).forEach(function (k) { tabs[k].setAttribute('aria-selected', k === name); tabs[k].tabIndex = k === name ? 0 : -1; });
      table.setAttribute('aria-labelledby', tabs[name].id); views[name](); bump(table); if (focus) tabs[name].focus();
    }
    Object.keys(tabs).forEach(function (k, i, arr) {
      tabs[k].addEventListener('click', function () { tab(k); });
      tabs[k].addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        var on = arr.filter(function (x) { return !tabs[x].disabled; }), j = (on.indexOf(k) + d + on.length) % on.length; e.preventDefault(); tab(on[j], true);
      });
    });
    function summary() {
      var s = res.summary, box = $('etl-sum');
      box.innerHTML = Object.keys(E.sum).map(function (k) { return '<div><strong class="num" data-n="' + s[k] + '">0</strong><small>' + esc(E.sum[k]) + '</small></div>'; }).join('');
      box.hidden = false; box.querySelectorAll('[data-n]').forEach(function (el) { el.dataset.val = 0; tween(el, +el.dataset.n, function (x) { return String(Math.round(x)); }); });
      var q = $('etl-qbar'), col = { valido: 'var(--c-green)', corregido: 'var(--c-cyan)', revision: 'var(--c-orange)', rechazado: 'var(--c-red)', duplicado: 'var(--c-muted)' };
      q.innerHTML = Object.keys(col).map(function (k) { return '<span style="width:' + (s[k] / s.entrada * 100) + '%;background:' + col[k] + '" title="' + esc(E.st[k]) + ': ' + s[k] + '"></span>'; }).join('');
      q.setAttribute('aria-label', E.quality + ': ' + Object.keys(col).map(function (k) { return E.st[k] + ' ' + s[k]; }).join(', '));
      q.hidden = false;
    }
    function finish() {
      es.ran = true; save();
      rules.querySelectorAll('li').forEach(function (li) { li.classList.remove('run'); li.classList.add('done'); });
      $('etl-state').textContent = E.done; tabs.after.disabled = false; tabs.cons.disabled = false; reset.disabled = false; run.disabled = true;
      summary(); tab(es.tab === 'before' ? 'after' : es.tab);
    }
    run.addEventListener('click', function () {
      run.disabled = true; es.tab = 'after';
      if (still()) { finish(); return; }
      var lis = rules.querySelectorAll('li'), i = 0;
      (function next() {
        if (i > 0) { lis[i - 1].classList.remove('run'); lis[i - 1].classList.add('done'); }
        if (i === lis.length) { finish(); return; }
        lis[i].classList.add('run'); $('etl-state').textContent = fill(E.running, { r: lis[i].dataset.r }); i++; setTimeout(next, 260);
      })();
    });
    reset.addEventListener('click', function () {
      es.ran = false; es.tab = 'before'; save();
      rules.querySelectorAll('li').forEach(function (li) { li.className = ''; });
      $('etl-sum').hidden = true; $('etl-qbar').hidden = true; tabs.after.disabled = true; tabs.cons.disabled = true; reset.disabled = true; run.disabled = false;
      $('etl-state').textContent = E.orig; tab('before'); run.focus();
    });
    if (es.ran) finish(); else tab('before');
  })();

  /* ---------- 7. Laboratorio neuronal (simulación con pesos definidos a mano; cálculo en logic.js) ---------- */
  (function neural() {
    var box = $('nn'); if (!box) return;
    var N = T.nn, M = L.NN, svg = $('nn-svg'), NS = 'http://www.w3.org/2000/svg', DUR = 900;
    // Signo menos tipográfico (−) en lugar del guion que devuelve Intl.
    var f2 = new Intl.NumberFormat(LANG, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), fW = new Intl.NumberFormat(LANG, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    var dec2 = { format: function (v) { return f2.format(v).replace('-', '−'); } }, decW = { format: function (v) { return fW.format(v).replace('-', '−'); } };
    var pct = new Intl.NumberFormat(LANG, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
    var dflt = M.inputs.map(function (d) { return d.value; });
    var st = S.nn || {}; S.nn = st;
    if (!Array.isArray(st.v) || st.v.length !== 4 || st.v.some(function (v) { return !isFinite(v); })) st.v = dflt.slice();
    var res = L.neuralForward(st.v), edges = [], nodes = { in: [], hid: [], out: [] }, layout = '';
    var run = { raf: 0, t: 0, last: 0, on: false, paused: false, phase: -1 };
    var stateEl = $('nn-state'), runBtn = $('nn-run'), pauseBtn = $('nn-pause');

    function clampIn(i, v) { var d = M.inputs[i]; return Math.min(d.max, Math.max(d.min, v)); }
    function raw(i) { return num1.format(clampIn(i, st.v[i])) + ' ' + N.in[i][1]; }
    function w(v) { return v < 0 ? '(' + decW.format(v) + ')' : decW.format(v); }
    function say(t) { if (stateEl.textContent !== t) stateEl.textContent = t; }

    /* Controles: deslizador y campo numérico sincronizados */
    var fields = $('nn-fields'), rng = [], nbr = [];
    M.inputs.forEach(function (d, i) {
      var id = 'nn-' + d.id, lab = N.in[i], lim = ' min="' + d.min + '" max="' + d.max + '" step="' + d.step + '"';
      var row = h('div', { class: 'nn-field' }, '<label for="' + id + '">' + esc(lab[0]) + '</label>' +
        '<div class="nn-pair"><input type="range" id="' + id + '"' + lim + '>' +
        '<span class="nn-num"><input type="number" inputmode="decimal"' + lim + ' aria-label="' + esc(lab[0] + ' (' + lab[1] + ')') + '"><span aria-hidden="true">' + esc(lab[1]) + '</span></span></div>');
      fields.appendChild(row);
      var r = row.querySelector('[type=range]'), n = row.querySelector('[type=number]');
      rng.push(r); nbr.push(n);
      r.addEventListener('input', function () { st.v[i] = +r.value; n.value = r.value; changed(); });
      n.addEventListener('input', function () { var v = parseFloat(n.value); if (isFinite(v) && v >= d.min && v <= d.max) { st.v[i] = v; r.value = v; changed(); } });
      n.addEventListener('change', function () { var v = parseFloat(n.value); st.v[i] = clampIn(i, isFinite(v) ? v : st.v[i]); sync(); changed(); });
    });
    function sync() { st.v.forEach(function (v, i) { rng[i].value = v; nbr[i].value = v; rng[i].setAttribute('aria-valuetext', raw(i)); }); }

    /* Diagrama SVG: horizontal en pantallas anchas, vertical en angostas */
    function el(tag, a, parent) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
    function geo(vert) {
      var P = { in: [], hid: [], out: [] };
      if (vert) {
        [54, 138, 222, 306].forEach(function (x) { P.in.push([x, 100]); P.hid.push([x, 300]); });
        [80, 180, 280].forEach(function (x) { P.out.push([x, 480]); });
        return { w: 360, h: 540, P: P, titles: [[180, 24], [180, 250], [180, 430]] };
      }
      [76, 154, 232, 310].forEach(function (y) { P.in.push([170, y]); P.hid.push([350, y]); });
      [115, 193, 271].forEach(function (y) { P.out.push([520, y]); });
      return { w: 640, h: 340, P: P, titles: [[120, 24], [350, 24], [540, 24]] };
    }
    function build() {
      var vert = svg.parentNode.clientWidth < 520, key = vert ? 'v' : 'h';
      if (key === layout) return false;
      layout = key;
      var G = geo(vert), P = G.P;
      svg.setAttribute('viewBox', '0 0 ' + G.w + ' ' + G.h); svg.setAttribute('class', vert ? 'vert' : '');
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      G.titles.forEach(function (t, i) { el('text', { x: t[0], y: t[1], class: 'nn-title', 'text-anchor': 'middle' }, svg).textContent = N.layer[i]; });
      var ge = el('g', { class: 'edges' }, svg), gp = el('g', { class: 'pulses', 'aria-hidden': 'true' }, svg), gn = el('g', { class: 'nodes' }, svg);
      edges = []; nodes = { in: [], hid: [], out: [] };
      function edge(l, from, to, wt, a, b) {
        // Los pesos en cero no se dibujan: esa entrada no influye en la neurona.
        if (!wt) return;
        var line = el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'e ' + (wt > 0 ? 'pos' : 'neg'), 'stroke-width': (0.8 + Math.abs(wt) * 1.5).toFixed(2) }, ge);
        edges.push({ l: l, from: from, to: to, w: wt, a: a, b: b, line: line, dot: el('circle', { r: 3.5, class: 'pulse ' + (wt > 0 ? 'pos' : 'neg') }, gp) });
      }
      M.W1.forEach(function (row, j) { row.forEach(function (wt, i) { edge(1, i, j, wt, P.in[i], P.hid[j]); }); });
      M.W2.forEach(function (row, k) { row.forEach(function (wt, j) { edge(2, j, k, wt, P.hid[j], P.out[k]); }); });
      function node(kind, i, at, name) {
        var g = el('g', { class: 'node ' + kind, transform: 'translate(' + at[0] + ' ' + at[1] + ')', tabindex: '0', role: 'button' }, gn);
        el('circle', { r: 20, class: 'bg' }, g);
        var f = el('circle', { r: 20, class: 'fillc' }, g);
        el('circle', { r: 20, class: 'ring' }, g);
        var v = el('text', { class: 'val', 'text-anchor': 'middle', y: 4 }, g), lab, sub = null;
        if (kind === 'in') {
          lab = vert ? el('text', { class: 'lab', 'text-anchor': 'middle', y: -44 }, g) : el('text', { class: 'lab', 'text-anchor': 'end', x: -30, y: -3 }, g);
          sub = vert ? el('text', { class: 'sub', 'text-anchor': 'middle', y: -30 }, g) : el('text', { class: 'sub', 'text-anchor': 'end', x: -30, y: 12 }, g);
        } else if (kind === 'hid') lab = vert ? el('text', { class: 'lab', 'text-anchor': 'middle', y: 36 }, g) : el('text', { class: 'lab', 'text-anchor': 'middle', y: -27 }, g);
        else lab = vert ? el('text', { class: 'lab', 'text-anchor': 'middle', y: 36 }, g) : el('text', { class: 'lab', 'text-anchor': 'start', x: 28, y: 4 }, g);
        lab.textContent = name;
        function pick() { st.sel = [kind, i]; save(); explain(); mark(); }
        g.addEventListener('click', pick);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        var n = { g: g, f: f, v: v, sub: sub };
        nodes[kind].push(n); return n;
      }
      P.in.forEach(function (at, i) { node('in', i, at, N.in[i][2]); });
      P.hid.forEach(function (at, j) { node('hid', j, at, N.hid[j][1]); });
      P.out.forEach(function (at, k) { node('out', k, at, N.out[k][1]); });
      mark();
      return true;
    }
    function sel() { return st.sel || ['out', res.best]; }
    function mark() { var s = sel(); ['in', 'hid', 'out'].forEach(function (k) { nodes[k].forEach(function (n, i) { n.g.classList.toggle('sel', k === s[0] && i === s[1]); }); }); }

    /* p1 y p2 (0 a 1): avance de la señal en cada capa. Sólo cambian opacidades y posiciones de los pulsos. */
    function paint(p1, p2) {
      edges.forEach(function (e) {
        var src = e.l === 1 ? res.x[e.from] : res.h[e.from], flow = Math.min(1, Math.abs(e.w * src)), p = e.l === 1 ? p1 : p2;
        e.line.style.opacity = (0.16 + 0.84 * flow * p).toFixed(3);
      });
      nodes.in.forEach(function (n, i) {
        n.f.style.opacity = res.x[i].toFixed(3); n.v.textContent = dec2.format(res.x[i]); n.sub.textContent = raw(i);
        n.g.setAttribute('aria-label', N.inNode + ': ' + N.in[i][0] + ', ' + raw(i) + ', ' + N.norm.toLowerCase() + ' ' + dec2.format(res.x[i]));
      });
      nodes.hid.forEach(function (n, j) {
        var on = p1 >= 1;
        n.f.style.opacity = (Math.min(1, res.h[j]) * p1).toFixed(3); n.v.textContent = on ? dec2.format(res.h[j]) : '…';
        n.g.setAttribute('aria-label', N.hidNode + ': ' + N.hid[j][0] + (on ? ', ' + N.act + ' ' + dec2.format(res.h[j]) : ''));
      });
      nodes.out.forEach(function (n, k) {
        var on = p2 >= 1;
        n.f.style.opacity = (res.p[k] * p2).toFixed(3); n.v.textContent = on ? Math.round(res.p[k] * 100) + '%' : '…';
        n.g.classList.toggle('best', on && k === res.best);
        n.g.setAttribute('aria-label', N.outNode + ': ' + N.out[k][0] + (on ? ', ' + N.prob.toLowerCase() + ' ' + pct.format(res.p[k]) : ''));
      });
    }
    function pulses(t) {
      edges.forEach(function (e) {
        var k = e.l === 1 ? t : t - 1, src = e.l === 1 ? res.x[e.from] : res.h[e.from];
        if (k <= 0 || k >= 1 || Math.abs(e.w * src) < 0.05) { e.dot.style.opacity = 0; return; }
        var q = ease(k);
        e.dot.setAttribute('cx', (e.a[0] + (e.b[0] - e.a[0]) * q).toFixed(1));
        e.dot.setAttribute('cy', (e.a[1] + (e.b[1] - e.a[1]) * q).toFixed(1));
        e.dot.style.opacity = Math.sin(Math.PI * k).toFixed(3);
      });
    }
    function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

    /* Salidas, interpretación, explicación del cálculo y tabla */
    var outBox = $('nn-out'), bars = N.out.map(function (o, k) {
      var b = h('div', { class: 'nn-bar' }, '<span class="nm">' + esc(o[0]) + '</span><span class="pv"></span><span class="track"><i></i></span>');
      outBox.appendChild(b); return b;
    });
    function side() {
      bars.forEach(function (b, k) { b.classList.toggle('best', k === res.best); b.querySelector('.pv').textContent = pct.format(res.p[k]); b.querySelector('i').style.transform = 'scaleX(' + res.p[k] + ')'; });
      var it = $('nn-interp'); it.textContent = N.interp[res.best]; it.className = 'nn-interp k' + res.best;
      $('nn-desc').textContent = fill(N.desc, { r: N.out[res.best][0], p: pct.format(res.p[res.best]) });
      var rows = [];
      M.inputs.forEach(function (d, i) { rows.push([N.in[i][0], raw(i), dec2.format(res.x[i])]); });
      M.hidden.forEach(function (d, j) { rows.push([N.hid[j][0], 'z = ' + dec2.format(res.z1[j]), dec2.format(res.h[j])]); });
      M.outputs.forEach(function (d, k) { rows.push([N.out[k][0], 'z = ' + dec2.format(res.z2[k]), pct.format(res.p[k])]); });
      $('nn-tbl').innerHTML = '<thead><tr>' + N.col.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td class="num">' + esc(r[1]) + '</td><td class="num">' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody>';
      explain(); mark();
    }
    function explain() {
      var s = sel(), i = s[1], html;
      if (s[0] === 'in') {
        var d = M.inputs[i];
        html = '<h4>' + esc(N.inNode + ' · ' + N.in[i][0]) + '</h4><p>' + esc(N.norm) + '</p><code>(' + esc(num1.format(clampIn(i, st.v[i]))) + ' − ' + num.format(d.min) + ') ÷ (' + num.format(d.max) + ' − ' + num.format(d.min) + ') = <b>' + dec2.format(res.x[i]) + '</b></code>';
      } else if (s[0] === 'hid') {
        var t1 = M.W1[i].map(function (wt, k) { return wt ? w(wt) + '×' + dec2.format(res.x[k]) : null; }).filter(Boolean);
        html = '<h4>' + esc(N.hidNode + ' · ' + N.hid[i][0]) + '</h4><p>' + esc(N.sum) + '</p><code>z = ' + t1.join(' + ') + ' + ' + w(M.b1[i]) + ' = <b>' + dec2.format(res.z1[i]) + '</b></code>' +
          '<p>' + esc(N.act) + '</p><code>max(0, ' + dec2.format(res.z1[i]) + ') = <b>' + dec2.format(res.h[i]) + '</b></code>';
      } else {
        var t2 = M.W2[i].map(function (wt, j) { return w(wt) + '×' + dec2.format(res.h[j]); });
        html = '<h4>' + esc(N.outNode + ' · ' + N.out[i][0]) + '</h4><p>' + esc(N.sum) + '</p><code>z = ' + t2.join(' + ') + ' + ' + w(M.b2[i]) + ' = <b>' + dec2.format(res.z2[i]) + '</b></code>' +
          '<p>' + esc(N.soft) + '</p><code>' + esc(N.prob) + ' = <b>' + pct.format(res.p[i]) + '</b></code>';
      }
      $('nn-explain').innerHTML = html;
    }

    /* Ejecución por capas: requestAnimationFrame sólo mientras corre; pausar cancela el cuadro pendiente */
    function stop() { if (run.raf) cancelAnimationFrame(run.raf); run.raf = 0; }
    function controls() { pauseBtn.disabled = !run.on; pauseBtn.setAttribute('aria-pressed', run.paused ? 'true' : 'false'); pauseBtn.textContent = run.paused ? N.resume : N.pause; box.classList.toggle('pending', run.on); }
    function frame(now) {
      run.raf = 0;
      run.t += Math.min(64, now - run.last); run.last = now;
      var t = run.t / DUR, ph = t < 1 ? 0 : 1;
      if (ph !== run.phase) { run.phase = ph; say(ph ? N.run2 : N.run1); }
      paint(ease(Math.min(1, t)), ease(Math.max(0, Math.min(1, t - 1)))); pulses(t);
      if (t >= 2) { finish(true); return; }
      run.raf = requestAnimationFrame(frame);
    }
    function start() {
      stop(); res = L.neuralForward(st.v);
      if (still()) { finish(true); return; }
      run.on = true; run.paused = false; run.t = 0; run.phase = -1; run.last = performance.now();
      controls(); paint(0, 0); run.raf = requestAnimationFrame(frame);
    }
    function finish(done) {
      stop(); run.on = false; run.paused = false; controls();
      pulses(-1); paint(1, 1); side(); if (done) say(N.done);
    }
    function changed() {
      // Un cambio de valor detiene cualquier propagación en curso y muestra el resultado al instante.
      stop(); run.on = false; run.paused = false; controls(); pulses(-1);
      res = L.neuralForward(st.v); save(); paint(1, 1); side(); say(N.done);
      rng.forEach(function (r, i) { r.setAttribute('aria-valuetext', raw(i)); });
    }

    runBtn.addEventListener('click', start);
    pauseBtn.addEventListener('click', function () {
      if (!run.on) return;
      if (run.paused) { run.paused = false; run.last = performance.now(); run.raf = requestAnimationFrame(frame); say(run.phase ? N.run2 : N.run1); }
      else { stop(); run.paused = true; say(N.paused); }
      controls();
    });
    $('nn-reset').addEventListener('click', function () { stop(); run.on = false; st.v = dflt.slice(); delete st.sel; save(); res = L.neuralForward(st.v); sync(); finish(false); say(N.ready); });
    box.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () { st.v = M.presets[b.dataset.preset].slice(); delete st.sel; save(); sync(); start(); });
    });
    document.addEventListener('pagi:motion', function (e) { if (e.detail.off && run.on) finish(true); });
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (build() && !run.on) paint(1, 1); }).observe(svg.parentNode);
    sync(); build(); paint(1, 1); side(); controls(); say(N.ready);
  })();

  /* ---------- 8. Metodología ---------- */
  (function method() {
    var box = $('steps'), panel = $('mpanel'), M = T.method, ML = T.mL, cur = S.method || 0, btns = [];
    M.forEach(function (m, i) {
      var b = h('button', { role: 'tab', id: 'mt-' + i, 'aria-controls': 'mpanel', type: 'button' }, '<span class="dot">0' + (i + 1) + '</span><span class="t">' + esc(m.t) + '</span>');
      b.addEventListener('click', function () { show(i); });
      b.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (d) { e.preventDefault(); show((cur + d + M.length) % M.length); btns[cur].focus(); } });
      box.appendChild(b); btns.push(b);
    });
    function list(a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
    function show(i) {
      cur = i; S.method = i; save();
      btns.forEach(function (b, k) { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; b.classList.toggle('past', k < i); });
      $('rail').style.width = (i / (M.length - 1) * 80) + '%';
      var m = M[i];
      panel.setAttribute('aria-labelledby', 'mt-' + i);
      panel.innerHTML = '<div class="full"><span class="label">' + esc(ML.stage) + ' ' + (i + 1) + ' / ' + M.length + '</span><h3>' + esc(m.t) + '</h3><p class="lead" style="font-size:1.05rem"><b>' + esc(ML.obj) + ':</b> ' + esc(m.obj) + '</p></div>' +
        '<div><h4>' + esc(ML.act) + '</h4>' + list(m.act) + '</div><div><h4>' + esc(ML.in) + '</h4>' + list(m.in) + '</div><div><h4>' + esc(ML.out) + '</h4>' + list(m.out) + '</div>' +
        '<div class="full"><h4>' + esc(ML.ok) + '</h4>' + list(m.ok) + '</div>' +
        '<p class="gate"><b>' + esc(ML.gate) + ':</b> <span>' + esc(m.gate) + '</span></p>' +
        '<div class="pnav"><button type="button" class="btn ghost small" data-d="-1"' + (i === 0 ? ' disabled' : '') + '>' + esc(ML.prev) + '</button><button type="button" class="btn blue small" data-d="1"' + (i === M.length - 1 ? ' disabled' : '') + '>' + esc(ML.next) + '</button></div>';
      panel.querySelectorAll('[data-d]').forEach(function (b) { b.addEventListener('click', function () { show(cur + +b.dataset.d); }); });
      bump(panel);
    }
    show(Math.min(cur, M.length - 1));
  })();

  /* ---------- 9. Formulario de contacto (arma un mensaje de WhatsApp) ---------- */
  (function contact() {
    var f = $('cform'), F = T.form, msg = $('f-msg');
    msg.addEventListener('input', function () { $('f-count').textContent = msg.value.length + '/600'; });
    function err(id, text) { var el = $('f-' + id); el.setAttribute('aria-invalid', text ? 'true' : 'false'); $('fe-' + id).textContent = text || ''; return !text; }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('f-nombre').value.trim(), text = msg.value.trim(), st = $('f-status');
      var ok1 = err('nombre', name.replace(/[^\p{L}]/gu, '').length >= 2 ? '' : F.nombre), ok2 = err('msg', text.length >= 10 ? '' : F.msg);
      if (!ok1 || !ok2) { st.className = 'status bad'; st.textContent = F.fix; st.hidden = false; (ok1 ? msg : $('f-nombre')).focus(); return; }
      var org = $('f-empresa').value.trim(), tema = $('f-tema').value;
      var lines = [F.hi + ' ' + name + (org ? ' ' + F.from + ' ' + org : '') + '.', F.topic + ': ' + T.svcName[tema] + '.', F.process + ': ' + text];
      if ($('f-quiz').checked && !$('f-quiz').disabled) { var q = quiz.summary(); if (q) lines.push('', q.split('\n').slice(1).join('\n')); }
      if ($('f-calc').checked) { var c = calc.summary(); if (c) lines.push('', c); }
      var url = WA + encodeURIComponent(lines.join('\n'));
      // Con "noopener" el navegador no informa si la pestaña se abrió; por eso siempre damos también el enlace directo.
      window.open(url, '_blank', 'noopener');
      st.hidden = false;
      st.className = 'status ok';
      st.innerHTML = esc(F.opened) + ' <a href="' + url + '" target="_blank" rel="noopener">' + esc(F.openLink) + '</a>';
    });
  })();

  quiz.init(); calc.init();
  document.dispatchEvent(new CustomEvent('pagi:ready'));
})();
