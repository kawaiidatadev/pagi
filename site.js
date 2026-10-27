/* PAGI · comportamiento compartido por todas las páginas:
   tema, pausa de animaciones, idioma, menú móvil, progreso de lectura, sección activa, revelado y preguntas frecuentes. */
(function () {
  'use strict';
  var root = document.documentElement, es = root.lang === 'es';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  var $ = function (id) { return document.getElementById(id); };

  /* Tema: dispositivo → claro → oscuro */
  var T = es
    ? { system: 'Tema: igual que tu dispositivo', light: 'Tema: claro', dark: 'Tema: oscuro', hint: '. Clic para cambiar' }
    : { system: 'Theme: same as your device', light: 'Theme: light', dark: 'Theme: dark', hint: '. Click to change' };
  var ICON = {
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
  };
  var themeBtn = $('theme-btn');
  function mode() { var t = get('pagi-theme'); return t === 'light' || t === 'dark' ? t : 'system'; }
  function paintTheme() {
    var m = mode();
    if (m === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
    if (themeBtn) { themeBtn.innerHTML = ICON[m]; themeBtn.setAttribute('aria-label', T[m] + T.hint); themeBtn.title = T[m]; }
  }
  if (themeBtn) themeBtn.addEventListener('click', function () { var n = { system: 'light', light: 'dark', dark: 'system' }[mode()]; set('pagi-theme', n === 'system' ? null : n); paintTheme(); });
  paintTheme();

  /* Pausar o reanudar animaciones (WCAG 2.2.2) */
  var M = es ? { on: 'Pausar animaciones', off: 'Reanudar animaciones' } : { on: 'Pause animations', off: 'Resume animations' };
  var motionBtn = $('motion-btn');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function motionOff() { return get('pagi-motion') === 'off' || (reduced && get('pagi-motion') !== 'on'); }
  function paintMotion() {
    var off = motionOff();
    root.classList.toggle('motion-off', off);
    if (motionBtn) {
      motionBtn.innerHTML = off ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
      motionBtn.setAttribute('aria-label', off ? M.off : M.on); motionBtn.title = off ? M.off : M.on; motionBtn.setAttribute('aria-pressed', off ? 'true' : 'false');
    }
    document.dispatchEvent(new CustomEvent('pagi:motion', { detail: { off: off } }));
  }
  if (motionBtn) motionBtn.addEventListener('click', function () { set('pagi-motion', motionOff() ? 'on' : 'off'); paintMotion(); });
  window.pagiMotionOff = motionOff;
  paintMotion();

  /* Sugerir el otro idioma si el navegador no coincide */
  var bar = $('langbar');
  var langs = (navigator.languages || [navigator.language || '']).join(',').toLowerCase();
  if (bar && !get('pagi-lang-ok') && /(^|,)es/.test(langs) !== es) bar.hidden = false;
  document.querySelectorAll('[data-lang-ok]').forEach(function (el) { el.addEventListener('click', function () { set('pagi-lang-ok', '1'); if (bar) bar.hidden = true; }); });

  /* Copiar el número de WhatsApp */
  var copy = $('copy');
  if (copy) copy.addEventListener('click', function () {
    var out = $('copied'), n = '+52 33 2439 3525';
    function select() { var r = document.createRange(); r.selectNodeContents($('phone')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); out.textContent = es ? 'Número seleccionado: cópialo con Ctrl+C' : 'Number selected: copy it with Ctrl+C'; }
    try { navigator.clipboard.writeText(n).then(function () { out.textContent = es ? 'Número copiado' : 'Number copied'; }, select); } catch (e) { select(); }
  });

  /* Menú móvil */
  var mb = $('menu-btn'), mm = $('mobile-menu');
  function closeMenu(focus) { if (!mm || mm.hidden) return; mm.hidden = true; mb.setAttribute('aria-expanded', 'false'); if (focus) mb.focus(); }
  if (mb && mm) {
    mb.addEventListener('click', function () { var open = mm.hidden; mm.hidden = !open; mb.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { var a = mm.querySelector('a'); if (a) a.focus(); } });
    mm.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(true); });
    document.addEventListener('click', function (e) { if (!mm.hidden && !e.target.closest('header.top')) closeMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1180) closeMenu(false); });
  }

  /* Encabezado compacto y barra de progreso */
  var header = document.querySelector('header.top'), prog = $('progress'), ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('scrolled', y > 8);
    if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  document.addEventListener('DOMContentLoaded', function () {
    /* Sección activa en la navegación */
    var links = [].slice.call(document.querySelectorAll('.links a[href^="#"], #mobile-menu a[href^="#"]'));
    var ids = links.map(function (a) { return a.getAttribute('href').slice(1); }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    var active = '';
    function mark(id) {
      active = id;
      links.forEach(function (a) { var on = a.getAttribute('href') === '#' + id; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }
    if ('IntersectionObserver' in window && ids.length) {
      var io = new IntersectionObserver(function (es2) { es2.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); }); }, { rootMargin: '-40% 0px -55% 0px' });
      ids.forEach(function (id) { var s = $(id); if (s) io.observe(s); });
    }
    /* Al cambiar de idioma se conserva la sección (el resto del estado vive en sessionStorage) */
    document.querySelectorAll('[data-lang-link]').forEach(function (a) {
      a.addEventListener('click', function () { if (active) a.setAttribute('href', a.getAttribute('href').split('#')[0] + '#' + active); });
    });

    /* Revelado de secciones al entrar en pantalla: sólo elementos fuera de la vista inicial */
    if (!motionOff() && 'IntersectionObserver' in window) {
      var ro = new IntersectionObserver(function (es3) {
        es3.forEach(function (e) { if (!e.isIntersecting) return; e.target.classList.remove('pre'); e.target.classList.add('shown'); ro.unobserve(e.target); });
      }, { rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('.reveal').forEach(function (el) { if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('pre'); ro.observe(el); } });
      document.addEventListener('pagi:motion', function (e) { if (e.detail.off) document.querySelectorAll('.pre').forEach(function (el) { el.classList.remove('pre'); ro.unobserve(el); }); });
    }

    /* Preguntas frecuentes con apertura animada */
    document.querySelectorAll('.faq details').forEach(function (d) {
      var s = d.querySelector('summary'), body = d.querySelector('.ans');
      s.addEventListener('click', function (e) {
        if (motionOff() || !body || !body.animate) return;
        e.preventDefault();
        if (!d.open) { d.open = true; var hh = body.scrollHeight; body.animate([{ height: '0px', opacity: 0 }, { height: hh + 'px', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
        else { var h0 = body.scrollHeight, a = body.animate([{ height: h0 + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: 'ease-in' }); a.onfinish = function () { d.open = false; }; }
      });
    });
  });
})();
