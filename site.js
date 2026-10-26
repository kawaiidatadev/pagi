/* PAGI · comportamiento compartido: tema, movimiento, aviso de idioma y copiar teléfono. */
(function () {
  var root = document.documentElement;
  var es = root.lang === 'es';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }

  /* Tema: sistema → claro → oscuro */
  var T = es
    ? { system: 'Tema: igual que tu dispositivo', light: 'Tema: claro', dark: 'Tema: oscuro', hint: '. Clic para cambiar' }
    : { system: 'Theme: same as your device', light: 'Theme: light', dark: 'Theme: dark', hint: '. Click to change' };
  var ICON = {
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
  };
  var themeBtn = document.getElementById('theme-btn');
  function mode() { var t = get('pagi-theme'); return t === 'light' || t === 'dark' ? t : 'system'; }
  function paintTheme() {
    var m = mode();
    if (m === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
    if (themeBtn) { themeBtn.innerHTML = ICON[m]; themeBtn.setAttribute('aria-label', T[m] + T.hint); themeBtn.title = T[m]; }
  }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = { system: 'light', light: 'dark', dark: 'system' }[mode()];
    set('pagi-theme', next === 'system' ? null : next);
    paintTheme();
  });
  paintTheme();

  /* Pausar o reanudar animaciones (WCAG 2.2.2) */
  var M = es ? { on: 'Pausar animaciones', off: 'Reanudar animaciones' } : { on: 'Pause animations', off: 'Resume animations' };
  var motionBtn = document.getElementById('motion-btn');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function motionOff() { return get('pagi-motion') === 'off' || (reduced && get('pagi-motion') !== 'on'); }
  function paintMotion() {
    var off = motionOff();
    root.classList.toggle('motion-off', off);
    document.querySelectorAll('svg[data-anim]').forEach(function (s) { try { off ? s.pauseAnimations() : s.unpauseAnimations(); } catch (e) {} });
    if (motionBtn) {
      motionBtn.innerHTML = off
        ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
      motionBtn.setAttribute('aria-label', off ? M.off : M.on); motionBtn.title = off ? M.off : M.on;
      motionBtn.setAttribute('aria-pressed', off ? 'true' : 'false');
    }
    document.dispatchEvent(new CustomEvent('pagi:motion', { detail: { off: off } }));
  }
  if (motionBtn) motionBtn.addEventListener('click', function () { set('pagi-motion', motionOff() ? 'on' : 'off'); paintMotion(); });
  window.pagiMotionOff = motionOff;
  paintMotion();

  /* Sugerir el otro idioma si el navegador no coincide */
  var bar = document.getElementById('langbar');
  var langs = (navigator.languages || [navigator.language || '']).join(',').toLowerCase();
  var prefersEs = /(^|,)es/.test(langs);
  if (bar && !get('pagi-lang-ok') && prefersEs !== es) bar.hidden = false;
  document.querySelectorAll('[data-lang-ok]').forEach(function (el) {
    el.addEventListener('click', function () { set('pagi-lang-ok', '1'); if (bar) bar.hidden = true; });
  });

  /* Copiar el número de WhatsApp */
  var copy = document.getElementById('copy');
  if (copy) copy.addEventListener('click', function () {
    var out = document.getElementById('copied'), num = '+52 33 2439 3525';
    function select() {
      var r = document.createRange(); r.selectNodeContents(document.getElementById('phone'));
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      out.textContent = es ? 'Número seleccionado: cópialo con Ctrl+C' : 'Number selected: copy it with Ctrl+C';
    }
    try { navigator.clipboard.writeText(num).then(function () { out.textContent = es ? 'Número copiado' : 'Number copied'; }, select); } catch (e) { select(); }
  });
})();
