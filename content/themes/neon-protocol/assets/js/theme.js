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

  function initFxVisibility() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const targets = document.querySelectorAll(
      '.np-hero, .np-article-hero, .np-map, .np-live, .np-subscribe',
    );
    if (!targets.length) {
      return;
    }
    const observer = new IntersectionObserver(handleFxIntersection, { threshold: 0 });
    targets.forEach((el) => observer.observe(el));
  }

  function syncNavAriaCurrent() {
    document.querySelectorAll('.np-nav-links a, .np-dock a').forEach((link) => {
      if (link.classList.contains('is-active')) {
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
      renderNodeMap(container);
      let frame = 0;
      const observer = new ResizeObserver(() => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          renderNodeMap(container);
        });
      });
      observer.observe(container);
    });
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-np-theme-toggle]')) {
      handleThemeToggle();
    }
    handleCopyLink(event);
    handlePortfolioFilter(event);
  });

  document.addEventListener('submit', handleMailto);

  document.addEventListener('visibilitychange', syncTabVisibility);

  setTheme(currentTheme());
  runDataStream();
  syncTabVisibility();
  syncNavAriaCurrent();
  initNodeMap();
  initFxVisibility();
})();
