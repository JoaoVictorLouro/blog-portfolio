(function () {
  const PLAYED_KEY = 'np-redirect-effect-played';
  const LOCALES = [
    { prefix: 'en', path: '/en-us/' },
    { prefix: 'ja', path: '/ja-jp/' },
    { prefix: 'pt', path: '/pt-br/' },
    { prefix: 'es', path: '/es-la/' },
  ];
  const NAME_TEXT = 'João Victor';
  const BRAND_TEXT = 'kono gaijin';
  const TLD_TEXT = '.com';
  const DISCLAIMERS = {
    'en-us': 'I have rebranded...',
    'ja-jp': 'リブランディングしました...',
    'pt-br': 'Eu mudei de marca...',
    'es-la': 'He cambiado de marca...',
  };
  const GLITCH_MS = 450;
  const EXIT_GLITCH_MS = 450;
  const HOLD_MS = 2000;
  const TYPE_MS = 70;
  const ARROWS_PAUSE_MS = 180;

  function isGhostAdmin() {
    return /^\/ghost(\/|$)/.test(window.location.pathname);
  }

  function isAllowedHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return true;
    }
    return host === 'konogaijin.com' || host.endsWith('.konogaijin.com');
  }

  function hasRedirectFlag() {
    try {
      return new URLSearchParams(window.location.search).get('redirect_effect') === '1';
    } catch {
      return false;
    }
  }

  function alreadyPlayed() {
    try {
      return sessionStorage.getItem(PLAYED_KEY) === '1';
    } catch {
      return false;
    }
  }

  function markPlayed() {
    try {
      sessionStorage.setItem(PLAYED_KEY, '1');
    } catch {
      // Ignore private-mode storage failures.
    }
  }

  function siteBase() {
    const raw = window.__npSiteUrl || window.location.origin;
    return String(raw).replace(/\/$/, '');
  }

  function isSiteUrlThisOrigin() {
    try {
      return new URL(siteBase(), window.location.href).origin === window.location.origin;
    } catch {
      return true;
    }
  }

  function shouldPlay() {
    if (isGhostAdmin()) {
      return false;
    }
    if (hasRedirectFlag()) {
      return true;
    }
    if (isAllowedHost(window.location.hostname)) {
      return false;
    }
    return !(alreadyPlayed() && isSiteUrlThisOrigin());
  }

  function handleLocaleDetectFallback() {
    const path = window.location.pathname;
    if (path !== '/' && path !== '') {
      return;
    }
    window.location.replace(siteBase() + detectLocalePath());
  }

  function detectLocalePath() {
    const pathMatch = window.location.pathname.match(/^\/(en-us|ja-jp|pt-br|es-la)(\/|$)/);
    if (pathMatch) {
      return `/${pathMatch[1]}/`;
    }

    const languages =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language || 'en-US'];

    for (let i = 0; i < languages.length; i += 1) {
      const lang = String(languages[i] || '').toLowerCase();
      for (let j = 0; j < LOCALES.length; j += 1) {
        if (lang.indexOf(LOCALES[j].prefix) === 0) {
          return LOCALES[j].path;
        }
      }
    }

    return '/en-us/';
  }

  function detectLocaleCode() {
    return detectLocalePath().replace(/\//g, '') || 'en-us';
  }

  function disclaimerText() {
    return DISCLAIMERS[detectLocaleCode()] || DISCLAIMERS['en-us'];
  }

  function destinationUrl() {
    return siteBase() + detectLocalePath();
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function redirectNow() {
    markPlayed();
    const nextUrl = destinationUrl();
    try {
      const next = new URL(nextUrl, window.location.href);
      const current = new URL(window.location.href);
      if (
        next.origin === current.origin &&
        next.pathname === current.pathname &&
        next.search === current.search
      ) {
        return;
      }
    } catch {
      // Fall through to replace if URL parsing fails.
    }
    window.location.replace(nextUrl);
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function typeText(el, text, msPerChar) {
    return new Promise((resolve) => {
      el.textContent = '';
      let index = 0;

      function tick() {
        if (index >= text.length) {
          resolve();
          return;
        }
        el.textContent += text.charAt(index);
        index += 1;
        window.setTimeout(tick, msPerChar);
      }

      tick();
    });
  }

  function replayGlitch(overlay) {
    overlay.classList.remove('is-glitching');
    void overlay.offsetWidth;
    overlay.classList.add('is-glitching');
  }

  function injectOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'np-redirect-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="np-redirect-glitch"></div>' +
      '<p class="np-redirect-disclaimer" data-np-redirect-disclaimer></p>' +
      '<div class="np-redirect-stage">' +
      '<div class="np-redirect-line">' +
      '<span class="np-redirect-name is-caret" data-np-redirect-name></span>' +
      '<span class="np-redirect-arrows" data-np-redirect-arrows hidden>&gt;&gt;</span>' +
      '</div>' +
      '<div class="np-redirect-brand-line">' +
      '<span class="np-redirect-brand" data-np-redirect-brand></span>' +
      '<span class="np-redirect-tld" data-np-redirect-tld></span>' +
      '</div>' +
      '</div>';
    overlay.querySelector('[data-np-redirect-disclaimer]').textContent = disclaimerText();

    (document.body || document.documentElement).appendChild(overlay);
    return overlay;
  }

  function fillStaticCopy(overlay) {
    const nameEl = overlay.querySelector('[data-np-redirect-name]');
    const arrowsEl = overlay.querySelector('[data-np-redirect-arrows]');
    const brandEl = overlay.querySelector('[data-np-redirect-brand]');
    const tldEl = overlay.querySelector('[data-np-redirect-tld]');
    nameEl.textContent = NAME_TEXT;
    nameEl.classList.remove('is-caret');
    arrowsEl.hidden = false;
    arrowsEl.classList.add('is-flashing');
    brandEl.textContent = BRAND_TEXT;
    tldEl.textContent = TLD_TEXT;
  }

  async function playSequence(overlay) {
    overlay.classList.add('is-fading', 'is-typed');

    if (prefersReducedMotion()) {
      fillStaticCopy(overlay);
      await wait(HOLD_MS);
      redirectNow();
      return;
    }

    overlay.classList.add('is-glitching');
    await wait(GLITCH_MS);
    overlay.classList.remove('is-glitching');

    const nameEl = overlay.querySelector('[data-np-redirect-name]');
    const arrowsEl = overlay.querySelector('[data-np-redirect-arrows]');
    const brandEl = overlay.querySelector('[data-np-redirect-brand]');
    const tldEl = overlay.querySelector('[data-np-redirect-tld]');

    await typeText(nameEl, NAME_TEXT, TYPE_MS);
    nameEl.classList.remove('is-caret');

    arrowsEl.hidden = false;
    arrowsEl.classList.add('is-flashing');
    await wait(ARROWS_PAUSE_MS);

    brandEl.classList.add('is-caret');
    await typeText(brandEl, BRAND_TEXT, TYPE_MS);
    brandEl.classList.remove('is-caret');

    tldEl.classList.add('is-caret');
    await typeText(tldEl, TLD_TEXT, TYPE_MS);
    tldEl.classList.remove('is-caret');

    await wait(HOLD_MS);
    replayGlitch(overlay);
    await wait(EXIT_GLITCH_MS);
    redirectNow();
  }

  function start() {
    const overlay = injectOverlay();
    playSequence(overlay);
  }

  function bootWhenReady() {
    if (document.body || document.readyState !== 'loading') {
      start();
      return;
    }
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }

  if (!shouldPlay()) {
    handleLocaleDetectFallback();
    return;
  }

  window.__npRedirectEffect = true;
  document.documentElement.classList.add('np-redirect-effect');
  bootWhenReady();
})();
