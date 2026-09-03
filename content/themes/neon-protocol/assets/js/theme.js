(function () {
  const root = document.documentElement;
  const storageKey = 'np-theme';

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function setTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Ignore private-mode storage failures.
    }
    document.querySelectorAll('[data-np-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
      button.setAttribute(
        'aria-label',
        next === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
      );
    });
    syncGhostCommentsTheme(next);
  }

  const COMMENTS_TOKENS = {
    dark: {
      surface: '#1b1c1d',
      surfaceLow: '#1b1c1d',
      surfaceHigh: '#292a2b',
      onSurface: '#e3e2e3',
      onSurfaceVariant: '#b9cacb',
      outline: '#849495',
      outlineVariant: '#3a494b',
      charcoal: '#0d0e10',
      neonTeal: '#00f2ff',
      lanternAmber: '#ffb800',
      cyberMagenta: '#ff00c8',
      error: '#ffb4ab',
      glowCyan: 'rgba(0, 242, 255, 0.4)',
    },
    light: {
      surface: '#ffffff',
      surfaceLow: '#f7f8fa',
      surfaceHigh: '#eceef1',
      onSurface: '#121315',
      onSurfaceVariant: '#4b5560',
      outline: '#8a9399',
      outlineVariant: '#d5d8dc',
      charcoal: '#ffffff',
      neonTeal: '#00f2ff',
      lanternAmber: '#ffb800',
      cyberMagenta: '#ff00c8',
      error: '#ffb4ab',
      glowCyan: 'rgba(0, 242, 255, 0.35)',
    },
  };

  let commentsOverridesCss = '';
  let commentsOverridesPromise = null;

  function loadCommentsOverrides() {
    if (commentsOverridesCss) {
      return Promise.resolve(commentsOverridesCss);
    }
    if (commentsOverridesPromise) {
      return commentsOverridesPromise;
    }
    const url = window.__npGhostAssetUrls?.commentsOverrides;
    if (!url) {
      return Promise.resolve('');
    }
    commentsOverridesPromise = fetch(url)
      .then((response) => (response.ok ? response.text() : ''))
      .then((text) => {
        commentsOverridesCss = text;
        return text;
      })
      .catch(() => '');
    return commentsOverridesPromise;
  }

  function commentsSurfaceBg(theme) {
    const tokens = COMMENTS_TOKENS[theme === 'light' ? 'light' : 'dark'];
    const wrapper = document.querySelector('.np-bbs-body--comments');
    if (wrapper) {
      const bg = getComputedStyle(wrapper).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)') {
        return bg;
      }
    }
    return tokens.surface;
  }

  function commentsTokenCss(mode, bg) {
    const t = COMMENTS_TOKENS[mode === 'light' ? 'light' : 'dark'];
    return [
      ':root {',
      `--np-surface:${bg};`,
      `--np-surface-low:${t.surfaceLow};`,
      `--np-surface-high:${t.surfaceHigh};`,
      `--np-on-surface:${t.onSurface};`,
      `--np-on-surface-variant:${t.onSurfaceVariant};`,
      `--np-outline:${t.outline};`,
      `--np-outline-variant:${t.outlineVariant};`,
      `--np-charcoal:${t.charcoal};`,
      `--np-neon-teal:${t.neonTeal};`,
      `--np-lantern-amber:${t.lanternAmber};`,
      `--np-cyber-magenta:${t.cyberMagenta};`,
      `--np-error:${t.error};`,
      `--np-glow-cyan:${t.glowCyan};`,
      '}',
    ].join('');
  }

  function commentsThemeCss(mode, bg, overrides) {
    return [commentsTokenCss(mode, bg), overrides || ''].join('\n');
  }

  function openParentMembersPanel(action) {
    const panel = action === 'signin' ? 'signin' : 'subscribe';
    const parentDoc = window.parent.document;
    const trigger =
      parentDoc.querySelector(`.np-portal-trigger[data-np-members="${panel}"]`) ||
      parentDoc.querySelector(`[data-np-members="${panel}"]`);
    trigger?.click();
  }

  function ensureCommentsAuthBridge(doc) {
    const root = doc.documentElement;
    if (root.dataset.npAuthBridge === '1') {
      return;
    }
    root.dataset.npAuthBridge = '1';

    doc.addEventListener(
      'click',
      (event) => {
        const signinBtn = event.target.closest('[data-testid="signin-button"]');
        const signupBtn = event.target.closest('[data-testid="signup-button"]');
        if (!signinBtn && !signupBtn) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        openParentMembersPanel(signinBtn ? 'signin' : 'subscribe');
      },
      true,
    );
  }

  function observeCommentsIframe(iframe, applyMode) {
    if (iframe.dataset.npCommentsObserved === '1') {
      return;
    }
    iframe.dataset.npCommentsObserved = '1';
    const start = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) {
        return;
      }
      applyMode();
      const observer = new MutationObserver(() => {
        applyMode();
      });
      observer.observe(doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-loaded'],
      });
      let ticks = 0;
      const interval = window.setInterval(() => {
        applyMode();
        ticks += 1;
        if (ticks >= 24) {
          window.clearInterval(interval);
        }
      }, 250);
    };
    if (iframe.contentDocument?.body) {
      start();
    } else {
      iframe.addEventListener('load', start, { once: true });
    }
  }

  function syncGhostCommentsTheme(theme) {
    const mode = theme === 'light' ? 'light' : 'dark';
    const bg = commentsSurfaceBg(mode);
    document.querySelectorAll('script[data-ghost-comments]').forEach((script) => {
      if (script.dataset.colorScheme !== mode) {
        script.dataset.colorScheme = mode;
      }
      if (script.dataset.accentColor !== '#00f2ff') {
        script.dataset.accentColor = '#00f2ff';
      }
    });
    loadCommentsOverrides().then((overrides) => {
      document
        .querySelectorAll('#ghost-comments-root iframe[title="comments-frame"]')
        .forEach((iframe) => {
          iframe.style.backgroundColor = bg;
          const applyMode = () => {
            const doc = iframe.contentDocument;
            if (!doc) {
              return;
            }
            const section = doc.querySelector('section.ghost-display');
            if (section) {
              section.classList.toggle('dark', mode === 'dark');
            }
            doc.documentElement.style.colorScheme = mode;
            doc.documentElement.style.backgroundColor = bg;
            doc.body.style.backgroundColor = bg;
            let style = doc.getElementById('np-comments-theme');
            if (!style) {
              style = doc.createElement('style');
              style.id = 'np-comments-theme';
              doc.head.appendChild(style);
            }
            style.textContent = commentsThemeCss(mode, bg, overrides);
            ensureCommentsAuthBridge(doc);
          };
          if (iframe.contentDocument?.readyState === 'complete') {
            applyMode();
            observeCommentsIframe(iframe, applyMode);
          } else {
            iframe.addEventListener(
              'load',
              () => {
                applyMode();
                observeCommentsIframe(iframe, applyMode);
              },
              { once: true },
            );
          }
        });
    });
  }

  function rewriteCommentsScript(script) {
    const urls = window.__npGhostAssetUrls || {};
    if (!script?.dataset?.ghostComments) {
      return;
    }
    if (urls.comments && script.src && script.src.indexOf('comments-ui') !== -1) {
      if (script.src !== urls.comments) {
        script.src = urls.comments;
      }
    }
    script.dataset.accentColor = '#00f2ff';
    const mode = currentTheme();
    if (script.dataset.colorScheme !== mode) {
      script.dataset.colorScheme = mode;
    }
  }

  function initGhostCommentsThemeSync() {
    document.querySelectorAll('script[data-ghost-comments]').forEach(rewriteCommentsScript);
    syncGhostCommentsTheme(currentTheme());
    const observer = new MutationObserver(() => {
      document.querySelectorAll('script[data-ghost-comments]').forEach(rewriteCommentsScript);
      if (document.getElementById('ghost-comments-root')) {
        syncGhostCommentsTheme(currentTheme());
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function syncAnnouncementLayout() {
    window.cancelAnimationFrame(syncAnnouncementLayout._frame);
    syncAnnouncementLayout._frame = window.requestAnimationFrame(() => {
      const nav = document.querySelector('.np-nav');
      if (nav) {
        root.style.setProperty('--np-nav-height', `${nav.getBoundingClientRect().height}px`);
      }

      const bar = document.querySelector('#announcement-bar-root .gh-announcement-bar');
      if (bar) {
        ensureAnnouncementStyleOverrides();
        root.style.setProperty(
          '--np-announcement-height',
          `${bar.getBoundingClientRect().height}px`,
        );
      } else {
        root.style.removeProperty('--np-announcement-height');
      }
    });
  }

  function ensureAnnouncementStyleOverrides() {
    let style = document.getElementById('np-announcement-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'np-announcement-styles';
      style.textContent = [
        '#announcement-bar-root .gh-announcement-bar-content,',
        '#announcement-bar-root .gh-announcement-bar-content *:not(path) {',
        '  color: var(--np-charcoal) !important;',
        '}',
        '#announcement-bar-root .gh-announcement-bar-content a {',
        '  color: var(--np-charcoal) !important;',
        '  text-decoration: underline;',
        '}',
        '#announcement-bar-root .gh-announcement-bar button {',
        '  color: var(--np-charcoal) !important;',
        '}',
      ].join('\n');
      document.head.appendChild(style);
      return;
    }

    document.head.appendChild(style);
  }

  function initAnnouncementLayout() {
    syncAnnouncementLayout();

    const resizeObserver = new ResizeObserver(() => {
      syncAnnouncementLayout();
    });

    const nav = document.querySelector('.np-nav');
    if (nav) {
      resizeObserver.observe(nav);
    }

    const mountObserver = new MutationObserver(() => {
      const announcementRoot = document.getElementById('announcement-bar-root');
      if (!announcementRoot) {
        return;
      }

      const bar = announcementRoot.querySelector('.gh-announcement-bar');
      if (bar && bar.dataset.npAnnouncementObserved !== '1') {
        bar.dataset.npAnnouncementObserved = '1';
        resizeObserver.observe(bar);
      }

      syncAnnouncementLayout();
    });

    mountObserver.observe(document.body, { childList: true, subtree: true });
  }

  function handleThemeToggle() {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  }

  function runDataStream() {
    const bar = document.getElementById('np-data-stream');
    if (!bar) {
      return;
    }
    bar.classList.add('is-loading');
    window.setTimeout(() => {
      bar.classList.add('is-done');
    }, 400);
  }

  function syncTabVisibility() {
    root.classList.toggle('np-tab-hidden', document.hidden);
  }

  function elementIsVisible(el) {
    if (typeof el.checkVisibility !== 'function') {
      return true;
    }
    return el.checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true,
      contentVisibilityAuto: true,
    });
  }

  function handleFxIntersection(entries) {
    entries.forEach((entry) => {
      const visible = entry.isIntersecting && elementIsVisible(entry.target);
      entry.target.classList.toggle('np-fx-paused', !visible);
    });
  }

  function markFxLayers() {
    document.querySelectorAll('.kg-embed-card iframe').forEach((iframe) => {
      iframe.classList.add('np-fx-layer');
    });
  }

  const FX_VISIBILITY_SELECTOR =
    '.np-hero, .np-article-hero, .np-map, .np-live, .np-subscribe, .kg-embed-card';

  function observeFxTargets(observer) {
    document.querySelectorAll(FX_VISIBILITY_SELECTOR).forEach((el) => {
      if (el.dataset.npFxObserved === '1') {
        return;
      }
      el.dataset.npFxObserved = '1';
      observer.observe(el);
    });
  }

  function initFxVisibility() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    markFxLayers();

    if (!initFxVisibility._observer) {
      initFxVisibility._observer = new IntersectionObserver(handleFxIntersection, {
        threshold: 0,
        rootMargin: '0px 0px -20% 0px',
      });
      initFxVisibility._layerObserver = new MutationObserver(() => {
        markFxLayers();
        observeFxTargets(initFxVisibility._observer);
      });
      initFxVisibility._layerObserver.observe(document.body, { childList: true, subtree: true });
    }

    observeFxTargets(initFxVisibility._observer);
  }

  function normalizeNavPath(pathname) {
    if (!pathname || pathname === '/') {
      return '/';
    }
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  }

  function isNavLinkActive(linkPath, currentPath) {
    if (linkPath === currentPath) {
      return true;
    }
    if (linkPath.endsWith('/articles/') && currentPath.startsWith(linkPath)) {
      return true;
    }
    return false;
  }

  function syncNavActiveState() {
    const currentPath = normalizeNavPath(window.location.pathname);

    document.querySelectorAll('.np-nav-links a, .np-dock a').forEach((link) => {
      let linkPath = '/';
      try {
        linkPath = normalizeNavPath(new URL(link.href, window.location.origin).pathname);
      } catch {
        linkPath = '/';
      }

      const isActive = isNavLinkActive(linkPath, currentPath);
      link.classList.toggle('is-active', isActive);
      link.classList.remove('is-active-parent');
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function handleCopyLink(event) {
    const button = event.target.closest('[data-np-copy]');
    if (!button) {
      return;
    }
    const url = button.getAttribute('data-np-copy');
    if (!url || !navigator.clipboard) {
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      button.classList.add('is-copied');
      window.setTimeout(() => button.classList.remove('is-copied'), 1600);
    });
  }

  function handlePortfolioFilter(event) {
    const button = event.target.closest('[data-np-filter]');
    if (!button) {
      return;
    }
    const filter = button.getAttribute('data-np-filter') || 'all';
    document.querySelectorAll('[data-np-filter]').forEach((item) => {
      item.classList.toggle('is-active', item === button);
    });
    document.querySelectorAll('[data-np-tags]').forEach((item) => {
      const tags = (item.getAttribute('data-np-tags') || '').toLowerCase();
      const show = filter === 'all' || tags.split(/\s+/).includes(filter);
      item.hidden = !show;
    });
  }

  function initPortfolioLightbox() {
    const dialog = document.querySelector('[data-np-lightbox-dialog]');
    if (!dialog || typeof dialog.showModal !== 'function') {
      return;
    }

    const image = dialog.querySelector('[data-np-lightbox-image]');
    const counter = dialog.querySelector('[data-np-lightbox-counter]');
    const caption = dialog.querySelector('[data-np-lightbox-caption]');
    if (!image) {
      return;
    }

    let currentIndex = 0;

    function visibleItems() {
      return Array.from(document.querySelectorAll('[data-np-lightbox]')).filter((item) => {
        if (item.hidden) {
          return false;
        }
        const project = item.closest('[data-np-tags]');
        return !project || !project.hidden;
      });
    }

    function showAt(index) {
      const items = visibleItems();
      if (items.length === 0) {
        return;
      }
      currentIndex = ((index % items.length) + items.length) % items.length;
      const item = items[currentIndex];
      const src = item.getAttribute('data-np-src') || '';
      const label = item.getAttribute('data-np-caption') || item.querySelector('img')?.alt || '';
      image.src = src;
      image.alt = label;
      if (caption) {
        caption.textContent = label;
      }
      if (counter) {
        counter.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      }
    }

    function openFrom(trigger) {
      const items = visibleItems();
      const index = items.indexOf(trigger);
      if (index < 0) {
        return;
      }
      showAt(index);
      document.documentElement.classList.add('np-lightbox-open');
      dialog.showModal();
    }

    function closeLightbox() {
      if (!dialog.open) {
        return;
      }
      dialog.close();
    }

    function handleLightboxClick(event) {
      const trigger = event.target.closest('[data-np-lightbox]');
      if (trigger && dialog.contains(trigger) === false) {
        event.preventDefault();
        openFrom(trigger);
        return;
      }
      if (event.target.closest('[data-np-lightbox-close]')) {
        closeLightbox();
        return;
      }
      if (event.target.closest('[data-np-lightbox-prev]')) {
        showAt(currentIndex - 1);
        return;
      }
      if (event.target.closest('[data-np-lightbox-next]')) {
        showAt(currentIndex + 1);
      }
    }

    function handleLightboxKeydown(event) {
      if (!dialog.open) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showAt(currentIndex - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        showAt(currentIndex + 1);
      }
    }

    document.addEventListener('click', handleLightboxClick);
    document.addEventListener('keydown', handleLightboxKeydown);
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('np-lightbox-open');
      image.removeAttribute('src');
      image.alt = '';
      if (caption) {
        caption.textContent = '';
      }
      if (counter) {
        counter.textContent = '';
      }
    });
  }

  function handleMailto(event) {
    const form = event.target.closest('[data-np-mailto]');
    if (!form || event.target !== form) {
      return;
    }
    event.preventDefault();
    const email = form.getAttribute('data-np-mailto');
    const address = form.querySelector('[name="email"]')?.value?.trim() ?? '';
    const payload = form.querySelector('[name="message"]')?.value?.trim() ?? '';
    if (!email) {
      return;
    }
    const subject = encodeURIComponent('ESTABLISH_CONNECTION');
    const body = encodeURIComponent(`From: ${address}\n\n${payload}`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  const EARTH_RADIUS_3857 = 20037508.342789244;
  const OSM_TILE_SIZE = 256;
  const NODE_ZOOM_MIN = 11;
  const NODE_ZOOM_MAX = 15;
  const DEFAULT_NODE_LAT = 35.6528;
  const DEFAULT_NODE_LNG = 139.8394;
  const DEFAULT_NODE_ZOOM = 13;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function projectMercator(lat, lng) {
    const x = (lng * EARTH_RADIUS_3857) / 180;
    const clampedLat = clamp(lat, -85.05112878, 85.05112878);
    const latRad = (clampedLat * Math.PI) / 180;
    const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2)) * (EARTH_RADIUS_3857 / Math.PI);
    return { x, y };
  }

  function formatNodeCoords(lat, lng) {
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
  }

  function parseNodeMapConfig(container) {
    const lat = Number.parseFloat(container.getAttribute('data-lat') || '');
    const lng = Number.parseFloat(container.getAttribute('data-lng') || '');
    const zoomRaw = Number.parseFloat(container.getAttribute('data-zoom') || '');
    return {
      lat: clamp(Number.isFinite(lat) ? lat : DEFAULT_NODE_LAT, -90, 90),
      lng: clamp(Number.isFinite(lng) ? lng : DEFAULT_NODE_LNG, -180, 180),
      zoom: clamp(
        Number.isFinite(zoomRaw) ? Math.round(zoomRaw) : DEFAULT_NODE_ZOOM,
        NODE_ZOOM_MIN,
        NODE_ZOOM_MAX,
      ),
    };
  }

  function buildNodeMapUrl(lat, lng, zoom, cssWidth, cssHeight) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    const { x, y } = projectMercator(lat, lng);
    const resolution = (2 * EARTH_RADIUS_3857) / (OSM_TILE_SIZE * 2 ** zoom);
    const halfW = (cssWidth / 2) * resolution;
    const halfH = (cssHeight / 2) * resolution;
    const url = new URL('https://ows.terrestris.de/osm/service');
    url.searchParams.set('SERVICE', 'WMS');
    url.searchParams.set('VERSION', '1.1.1');
    url.searchParams.set('REQUEST', 'GetMap');
    url.searchParams.set('LAYERS', 'OSM-WMS');
    url.searchParams.set('STYLES', '');
    url.searchParams.set('FORMAT', 'image/png');
    url.searchParams.set('TRANSPARENT', 'false');
    url.searchParams.set('SRS', 'EPSG:3857');
    url.searchParams.set('BBOX', `${x - halfW},${y - halfH},${x + halfW},${y + halfH}`);
    url.searchParams.set('WIDTH', String(width));
    url.searchParams.set('HEIGHT', String(height));
    return url.toString();
  }

  function renderNodeMap(container) {
    const config = parseNodeMapConfig(container);
    const img = container.querySelector('.np-map-image');
    if (!img) {
      return;
    }
    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;
    if (cssWidth < 2 || cssHeight < 2) {
      return;
    }
    const nextSrc = buildNodeMapUrl(config.lat, config.lng, config.zoom, cssWidth, cssHeight);
    if (img.getAttribute('src') === nextSrc) {
      return;
    }
    img.hidden = false;
    img.src = nextSrc;
  }

  function initNodeMap() {
    document.querySelectorAll('[data-np-map]').forEach((container) => {
      const config = parseNodeMapConfig(container);
      const coordsEl = container.parentElement?.querySelector('[data-np-map-coords]');
      if (coordsEl) {
        coordsEl.textContent = formatNodeCoords(config.lat, config.lng);
      }

      let started = false;
      let frame = 0;

      const startMap = () => {
        if (started) {
          return;
        }
        started = true;
        if (!document.querySelector('link[data-np-map-preconnect]')) {
          const link = document.createElement('link');
          link.rel = 'preconnect';
          link.href = 'https://ows.terrestris.de';
          link.dataset.npMapPreconnect = '1';
          document.head.appendChild(link);
        }
        renderNodeMap(container);
        const observer = new ResizeObserver(() => {
          window.cancelAnimationFrame(frame);
          frame = window.requestAnimationFrame(() => {
            renderNodeMap(container);
          });
        });
        observer.observe(container);
      };

      if ('IntersectionObserver' in window) {
        const visibilityObserver = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              startMap();
              visibilityObserver.disconnect();
            }
          },
          { rootMargin: '200px 0px' },
        );
        visibilityObserver.observe(container);
      } else {
        startMap();
      }
    });
  }

  const PAGE_GLITCH_MS = 340;
  let pageGlitchPending = false;

  function shouldInterceptNav(event, link) {
    if (event.defaultPrevented || event.button !== 0) {
      return false;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }
    if (link.hasAttribute('download') || link.getAttribute('target') === '_blank') {
      return false;
    }
    if (
      link.closest('[data-ghost-search], [data-np-theme-toggle], [data-np-filter], [data-np-copy]')
    ) {
      return false;
    }
    const href = link.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      return false;
    }
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return false;
    }
    if (url.origin !== window.location.origin) {
      return false;
    }
    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search &&
      url.hash !== ''
    ) {
      return false;
    }
    if (url.href === window.location.href) {
      return false;
    }
    return true;
  }

  function kickDataStream() {
    const bar = document.getElementById('np-data-stream');
    if (!bar) {
      return;
    }
    bar.classList.remove('is-done', 'is-loading');
    void bar.offsetWidth;
    bar.classList.add('is-loading');
  }

  function resetPageGlitch() {
    pageGlitchPending = false;
    root.classList.remove('np-page-glitching', 'np-page-entering');
    const bar = document.getElementById('np-data-stream');
    if (bar) {
      bar.classList.remove('is-loading', 'is-done');
    }
  }

  function handlePageGlitchNav(event) {
    if (pageGlitchPending) {
      event.preventDefault();
      return;
    }
    const link = event.target.closest('a[href]');
    if (!link || !shouldInterceptNav(event, link)) {
      return;
    }
    event.preventDefault();
    pageGlitchPending = true;
    const nextUrl = link.href;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.location.assign(nextUrl);
      return;
    }
    root.classList.add('np-page-glitching');
    kickDataStream();
    try {
      sessionStorage.setItem('np-page-enter', '1');
    } catch {
      // Ignore private-mode storage failures.
    }
    window.setTimeout(() => {
      window.location.assign(nextUrl);
    }, PAGE_GLITCH_MS);
  }

  function handlePageShow(event) {
    if (!event.persisted) {
      return;
    }
    resetPageGlitch();
    initFxVisibility();
  }

  function bootstrapFxVisibility() {
    if (!root.classList.contains('np-page-entering')) {
      initFxVisibility();
      return;
    }
    // Wait for main fade-in: opacity:0 makes checkVisibility mark heroes as paused forever.
    window.setTimeout(() => {
      root.classList.remove('np-page-entering');
      window.requestAnimationFrame(() => {
        initFxVisibility();
      });
    }, PAGE_GLITCH_MS);
  }

  function parseTiltMax(el) {
    const raw = getComputedStyle(el).getPropertyValue('--np-tilt-max').trim();
    const value = Number.parseFloat(raw);
    if (Number.isFinite(value)) {
      return value;
    }
    return el.getAttribute('data-np-tilt') === 'subtle' ? 2 : 6;
  }

  function initTilt() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }
    const targets = document.querySelectorAll('[data-np-tilt]');
    if (!targets.length) {
      return;
    }
    targets.forEach((el) => {
      const maxDeg = parseTiltMax(el);

      function handlePointerMove(event) {
        if (event.pointerType !== 'mouse') {
          return;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return;
        }
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 2 * maxDeg;
        const rotateX = (0.5 - py) * 2 * maxDeg;
        el.classList.add('is-tilting');
        el.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      }

      function handlePointerLeave(event) {
        if (event.pointerType && event.pointerType !== 'mouse') {
          return;
        }
        el.classList.remove('is-tilting');
        el.style.transform = '';
      }

      el.addEventListener('pointermove', handlePointerMove);
      el.addEventListener('pointerleave', handlePointerLeave);
    });
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-np-theme-toggle]')) {
      handleThemeToggle();
    }
    handleCopyLink(event);
    handlePortfolioFilter(event);
    handlePageGlitchNav(event);
  });

  initPortfolioLightbox();

  document.addEventListener('submit', handleMailto);

  document.addEventListener('visibilitychange', syncTabVisibility);
  window.addEventListener('pagehide', resetPageGlitch);
  window.addEventListener('pageshow', handlePageShow);

  function initPortalTriggerFold() {
    const trigger = document.querySelector('.np-portal-trigger');
    if (!trigger) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function showPortalTrigger() {
      if (trigger.classList.contains('is-visible') && !trigger.classList.contains('is-hiding')) {
        return;
      }
      trigger.classList.remove('is-hiding');
      trigger.classList.add('is-visible');
    }

    function hidePortalTrigger() {
      if (!trigger.classList.contains('is-visible') || trigger.classList.contains('is-hiding')) {
        return;
      }
      if (reducedMotion) {
        trigger.classList.remove('is-visible');
        return;
      }
      trigger.classList.add('is-hiding');
    }

    function handlePortalTriggerAnimationEnd(event) {
      if (event.target !== trigger || event.animationName !== 'np-portal-glitch-out') {
        return;
      }
      trigger.classList.remove('is-visible', 'is-hiding');
    }

    trigger.addEventListener('animationend', handlePortalTriggerAnimationEnd);

    const heroCta = document.querySelector('[data-np-hero-cta]');
    if (!heroCta) {
      showPortalTrigger();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const heroVisible = entries.some((entry) => entry.isIntersecting);
        if (heroVisible) {
          hidePortalTrigger();
        } else {
          showPortalTrigger();
        }
      },
      { threshold: 0 },
    );
    observer.observe(heroCta);
  }

  function initMembersDialog() {
    const dialog = document.querySelector('[data-np-members-dialog]');
    if (!dialog) {
      return;
    }

    const titleEl = dialog.querySelector('#np-members-title');
    const panels = Array.from(dialog.querySelectorAll('[data-np-members-panel]'));
    const hashPrefix = '#/np-members/';
    let lastFocus = null;

    function panelNames() {
      return panels.map((panel) => panel.getAttribute('data-np-members-panel')).filter(Boolean);
    }

    function resolvePanel(name) {
      const available = panelNames();
      if (name && available.includes(name)) {
        return name;
      }
      if (available.includes('account')) {
        return 'account';
      }
      return available.includes('subscribe') ? 'subscribe' : available[0];
    }

    function setPanel(name) {
      const next = resolvePanel(name);
      panels.forEach((panel) => {
        const active = panel.getAttribute('data-np-members-panel') === next;
        panel.hidden = !active;
      });
      const activePanel = panels.find(
        (panel) => panel.getAttribute('data-np-members-panel') === next,
      );
      if (titleEl && activePanel) {
        const title = activePanel.getAttribute('data-np-members-title');
        if (title) {
          titleEl.textContent = title;
        }
      }
      return next;
    }

    function focusPanelField(name) {
      const panel = panels.find((el) => el.getAttribute('data-np-members-panel') === name);
      if (!panel) {
        return;
      }
      const focusable = panel.querySelector(
        'input, button:not([disabled]), [href], textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable && typeof focusable.focus === 'function') {
        focusable.focus();
      }
    }

    function syncHash(name, open) {
      try {
        if (!open) {
          if (window.location.hash.startsWith(hashPrefix)) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          return;
        }
        const nextHash = `${hashPrefix}${name}`;
        if (window.location.hash !== nextHash) {
          history.replaceState(null, '', nextHash);
        }
      } catch {
        // Ignore history failures.
      }
    }

    function openMembers(name) {
      const panel = setPanel(name);
      lastFocus = document.activeElement;
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else {
        dialog.setAttribute('open', '');
      }
      document.documentElement.classList.add('np-members-open');
      syncHash(panel, true);
      window.requestAnimationFrame(() => focusPanelField(panel));
    }

    function closeMembers() {
      if (typeof dialog.close === 'function') {
        if (dialog.open) {
          dialog.close();
        }
      } else {
        dialog.removeAttribute('open');
      }
      document.documentElement.classList.remove('np-members-open');
      syncHash('', false);
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
      lastFocus = null;
    }

    function panelFromHash() {
      const hash = window.location.hash || '';
      if (!hash.startsWith(hashPrefix)) {
        return null;
      }
      return resolvePanel(hash.slice(hashPrefix.length));
    }

    document.addEventListener('click', (event) => {
      const openTrigger = event.target.closest('[data-np-members]');
      if (openTrigger) {
        event.preventDefault();
        openMembers(openTrigger.getAttribute('data-np-members'));
        return;
      }
      if (event.target.closest('[data-np-members-close]')) {
        event.preventDefault();
        closeMembers();
      }
    });

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeMembers();
    });

    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('np-members-open');
      syncHash('', false);
    });

    window.addEventListener('hashchange', () => {
      const panel = panelFromHash();
      if (panel) {
        openMembers(panel);
      } else if (dialog.open) {
        closeMembers();
      }
    });

    const initial = panelFromHash();
    if (initial) {
      openMembers(initial);
    }
  }

  function applyScriptAttributes(script, attrs) {
    Object.entries(attrs).forEach(([name, value]) => {
      if (name === 'defer') {
        script.defer = true;
        return;
      }
      if (name === 'async') {
        script.async = true;
        return;
      }
      if (name === 'src') {
        script.src = value;
        return;
      }
      script.setAttribute(name, value);
    });
  }

  function loadGhostScript(kind) {
    const deferred = window.__npGhostDeferred || [];
    const entry = deferred.find((item) => item.kind === kind);
    if (!entry) {
      return Promise.resolve();
    }

    window.__npGhostLoaders = window.__npGhostLoaders || {};
    if (window.__npGhostLoaders[kind]) {
      return window.__npGhostLoaders[kind];
    }

    window.__npGhostLoaders[kind] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const attrs = entry.attrs || (entry.src ? { src: entry.src } : null);
      if (!attrs?.src) {
        reject(new Error(`Missing Ghost ${kind} script src`));
        return;
      }
      applyScriptAttributes(script, attrs);
      script.onload = () => {
        window.__npGhostLoaded = window.__npGhostLoaded || {};
        window.__npGhostLoaded[kind] = true;
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load Ghost ${kind} script`));
      document.head.appendChild(script);
    });

    return window.__npGhostLoaders[kind];
  }

  function initDeferredGhostScripts() {
    loadGhostScript('announcement')
      .then(() => {
        syncAnnouncementLayout();
      })
      .catch(() => {
        // Ignore announcement prefetch failures.
      });

    loadGhostScript('search').catch(() => {
      // Ignore search prefetch failures; first click retries.
    });

    document.addEventListener(
      'click',
      (event) => {
        const searchTrigger = event.target.closest('[data-ghost-search]');
        if (!searchTrigger || window.__npGhostLoaded?.search) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        loadGhostScript('search').then(() => {
          searchTrigger.click();
        });
      },
      true,
    );

    document.addEventListener(
      'click',
      (event) => {
        if (event.target.closest('[data-np-members], [data-members-signout]')) {
          loadGhostScript('portal').catch(() => {
            // Portal opens on next attempt if the first load fails.
          });
        }
      },
      true,
    );

    document.addEventListener(
      'focusin',
      (event) => {
        if (event.target.closest('[data-members-form], [data-members-email]')) {
          loadGhostScript('portal').catch(() => {
            // Ignore prefetch failures; submit handler retries.
          });
        }
      },
      true,
    );

    document.addEventListener(
      'submit',
      (event) => {
        const form = event.target.closest('[data-members-form]');
        if (!form || window.__npGhostLoaders?.portal) {
          return;
        }
        event.preventDefault();
        form.classList.add('loading');
        loadGhostScript('portal')
          .then(() => {
            form.classList.remove('loading');
            if (typeof form.requestSubmit === 'function') {
              form.requestSubmit();
            } else {
              form.submit();
            }
          })
          .catch(() => {
            form.classList.remove('loading');
          });
      },
      true,
    );
  }

  let articleTranslationsMapPromise = null;

  function loadArticleTranslationsMap() {
    if (!articleTranslationsMapPromise) {
      const translationsUrl =
        window.__npArticleTranslationsUrl ||
        `${window.__npSiteUrl || ''}/contentapi/i18n/article-translations.json`;
      articleTranslationsMapPromise = fetch(translationsUrl, { cache: 'no-store' }).then(
        (response) => {
          if (!response.ok) {
            throw new Error(`Translation map HTTP ${response.status}`);
          }
          return response.json();
        },
      );
    }
    return articleTranslationsMapPromise;
  }

  function resolveTranslatedPostPath(map, postUrl, nextLocale) {
    if (!map || !postUrl || !nextLocale) {
      return null;
    }
    const groupId = map.by_url?.[postUrl];
    const entry = groupId ? map.groups?.[groupId]?.[nextLocale] : null;
    return entry?.url ?? null;
  }

  function fallbackLocalePath(pathname, nextLocale) {
    if (/\/articles(?:\/|$)/.test(pathname)) {
      return `/${nextLocale}/articles/`;
    }
    return `/${nextLocale}/`;
  }

  function initLanguagePicker() {
    const select = document.querySelector('[data-np-lang-select]');
    if (!select) {
      return;
    }

    const localePattern = /^\/(en-us|ja-jp|pt-br|es-la)(\/|$)/;
    const pathname = window.location.pathname;
    const match = pathname.match(localePattern);
    const currentLocale = match?.[1] ?? window.__npLocale ?? 'en-us';
    select.value = currentLocale;
    const postUrl = document
      .querySelector('[data-np-translation-switcher][data-np-post-url]')
      ?.getAttribute('data-np-post-url');

    select.addEventListener('change', () => {
      const nextLocale = select.value;
      if (!nextLocale || nextLocale === currentLocale) {
        return;
      }

      const navigate = (nextPath) => {
        window.location.href = `${window.__npSiteUrl || ''}${nextPath}${window.location.search}${window.location.hash}`;
      };

      const prefixSwapPath = match
        ? pathname.replace(localePattern, `/${nextLocale}$2`)
        : `/${nextLocale}/`;

      if (!postUrl) {
        navigate(prefixSwapPath);
        return;
      }

      loadArticleTranslationsMap()
        .then((map) => {
          const translatedPath = resolveTranslatedPostPath(map, postUrl, nextLocale);
          navigate(translatedPath || fallbackLocalePath(pathname, nextLocale));
        })
        .catch(() => {
          navigate(fallbackLocalePath(pathname, nextLocale));
        });
    });
  }

  function initTranslationSwitcher() {
    const widget = document.querySelector('[data-np-translation-switcher]');
    if (!widget) {
      return;
    }

    const postUrl = widget.getAttribute('data-np-post-url');
    const linksRoot = widget.querySelector('[data-np-translation-links]');
    const emptyState = widget.querySelector('[data-np-translation-empty]');
    const localeLabels = {
      'en-us': 'English',
      'ja-jp': '日本語',
      'pt-br': 'Português',
      'es-la': 'Español',
    };

    loadArticleTranslationsMap()
      .then((map) => {
        if (!postUrl || !linksRoot) {
          return;
        }
        const groupId = map?.by_url?.[postUrl];
        const group = groupId ? map?.groups?.[groupId] : null;
        if (!group) {
          return;
        }

        const currentPath = new URL(postUrl).pathname;
        const entries = Object.entries(group).filter(([, entry]) => entry.url !== currentPath);
        if (entries.length === 0) {
          return;
        }

        widget.hidden = false;
        linksRoot.replaceChildren(
          ...entries.map(([locale, entry]) => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'np-btn np-btn-ghost';
            link.href = `${window.__npSiteUrl || ''}${entry.url}`;
            link.textContent = localeLabels[locale] ?? locale;
            link.setAttribute('lang', locale);
            link.title = entry.title;
            item.appendChild(link);
            return item;
          }),
        );
      })
      .catch(() => {
        if (emptyState) {
          emptyState.hidden = false;
        }
      });
  }

  function initNewsletterLocale() {
    const forms = document.querySelectorAll('[data-np-newsletter-form]');
    if (forms.length === 0) {
      return;
    }

    const base = window.__npI18nBase || `${window.__npSiteUrl || ''}/i18n/`;
    const locale = window.__npLocale || 'en-us';

    fetch(`${base}np-newsletters.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Newsletter map HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        const newsletterId = payload?.newsletters?.[locale];
        if (!newsletterId) {
          return;
        }
        forms.forEach((form) => {
          form.setAttribute('data-members-newsletter', newsletterId);
        });
      })
      .catch(() => {
        // Newsletter map is optional until bootstrap runs.
      });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initYouTubeFeed() {
    const mount = document.querySelector('[data-np-youtube-feed]');
    if (!mount) {
      return;
    }

    const videosUrl =
      window.__npYouTubeVideosUrl || `${window.__npSiteUrl || ''}/contentapi/youtube/videos.json`;

    fetch(videosUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`YouTube videos HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        const videos = Array.isArray(payload?.videos) ? payload.videos.slice(0, 4) : [];
        if (videos.length === 0) {
          return;
        }

        mount.innerHTML = videos
          .map((video) => {
            const href = escapeHtml(video.url || '#');
            const title = escapeHtml(video.title || '');
            const thumb = escapeHtml(video.thumbnail_url || '');
            return (
              `<a class="np-glass np-card np-youtube-item" href="${href}" target="_blank" rel="noopener noreferrer">` +
              `<img class="np-youtube-thumb" src="${thumb}" alt="" loading="lazy" width="96" height="54" />` +
              `<h3 class="np-heading np-youtube-item-title">${title}</h3>` +
              `</a>`
            );
          })
          .join('');
        mount.hidden = false;
      })
      .catch(() => {
        // YouTube strip is optional when content-api cache is cold.
      });
  }

  function boot() {
    setTheme(currentTheme());
    initDeferredGhostScripts();
    initGhostCommentsThemeSync();
    initAnnouncementLayout();
    runDataStream();
    syncTabVisibility();
    syncNavActiveState();
    initNodeMap();
    initTilt();
    initPortalTriggerFold();
    initMembersDialog();
    bootstrapFxVisibility();
    initLanguagePicker();
    initTranslationSwitcher();
    initNewsletterLocale();
    initYouTubeFeed();
    initServiceWorker();
  }

  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
