(function () {
  const canvas = document.querySelector('[data-np-hero-globe]');
  if (!canvas) {
    return;
  }
  const hero = canvas.closest('.np-hero');
  const src = canvas.dataset.npHeroGlobeSrc;
  if (!hero || !src) {
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const TURN_MS = 90000;
  const CAMERA = 4.2;
  const TILT = (60 * Math.PI) / 180;
  const tiltCos = Math.cos(TILT);
  const tiltSin = Math.sin(TILT);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const limbPlane = 1 / CAMERA;

  let rings = [];
  let angle = 0.35;
  let frameId = 0;
  let running = false;
  let onScreen = false;
  let lastTime = 0;
  let light = false;
  let stroke = '#00f2ff';
  let glow = 'rgba(0, 242, 255, 0.4)';

  function readColors() {
    const style = getComputedStyle(document.documentElement);
    light = document.documentElement.getAttribute('data-theme') === 'light';
    if (light) {
      stroke = '#000000';
      glow = '#00f2ff';
      return;
    }
    stroke = style.getPropertyValue('--np-neon-teal').trim() || '#00f2ff';
    glow = style.getPropertyValue('--np-glow-cyan').trim() || 'rgba(0, 242, 255, 0.4)';
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return rect.width > 0 && rect.height > 0;
  }

  function rotatePoint(x, y, z, cos, sin) {
    const xr = x * cos + z * sin;
    const yr = y;
    const zr = -x * sin + z * cos;
    return [xr, yr * tiltCos - zr * tiltSin, yr * tiltSin + zr * tiltCos];
  }

  function clipFront(start, end) {
    const startFront = start[2] >= limbPlane;
    const endFront = end[2] >= limbPlane;
    if (startFront && endFront) {
      return [start, end];
    }
    if (!startFront && !endFront) {
      return null;
    }
    const t = (start[2] - limbPlane) / (start[2] - end[2]);
    const hit = [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t, limbPlane];
    if (startFront) {
      return [start, hit];
    }
    return [hit, end];
  }

  function project(point, radius) {
    const scale = CAMERA / (CAMERA - point[2]);
    return [point[0] * scale * radius, point[1] * scale * radius, point[2]];
  }

  function draw(rotation) {
    if (!rings.length || !resize()) {
      return;
    }
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.42;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const bands = [[], [], []];

    rings.forEach((ring) => {
      let previous = null;
      for (let index = 0; index < ring.length; index += 3) {
        const point = rotatePoint(ring[index], ring[index + 1], ring[index + 2], cos, sin);
        if (previous) {
          const segment = clipFront(previous, point);
          if (segment) {
            const from = project(segment[0], radius);
            const to = project(segment[1], radius);
            const depth = (segment[0][2] + segment[1][2]) / 2;
            const band = depth > 0.72 ? 2 : depth > 0.45 ? 1 : 0;
            bands[band].push(from[0], from[1], to[0], to[1]);
          }
        }
        previous = point;
      }
    });

    context.clearRect(0, 0, width, height);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = stroke;
    context.shadowColor = glow;

    const limbRadius =
      Math.sqrt(1 - limbPlane * limbPlane) * (CAMERA / (CAMERA - limbPlane)) * radius;
    context.beginPath();
    context.arc(cx, cy, limbRadius, 0, Math.PI * 2);
    context.globalAlpha = light ? 1 : 0.55;
    context.lineWidth = Math.max(1, radius * 0.006) * 1.25;
    context.shadowBlur = radius * (light ? 0.14 : 0.07);
    context.stroke();

    context.beginPath();
    bands.forEach((band) => {
      for (let index = 0; index < band.length; index += 4) {
        context.moveTo(cx + band[index], cy - band[index + 1]);
        context.lineTo(cx + band[index + 2], cy - band[index + 3]);
      }
    });
    context.globalAlpha = light ? 1 : 0.9;
    context.lineWidth = Math.max(1, radius * 0.005) * 1.25;
    context.shadowBlur = radius * (light ? 0.11 : 0.055);
    context.stroke();

    context.shadowBlur = 0;
    const alphas = [0.5, 0.78, 1];
    bands.forEach((band, bandIndex) => {
      if (!band.length) {
        return;
      }
      context.beginPath();
      for (let index = 0; index < band.length; index += 4) {
        context.moveTo(cx + band[index], cy - band[index + 1]);
        context.lineTo(cx + band[index + 2], cy - band[index + 3]);
      }
      context.globalAlpha = alphas[bandIndex];
      context.lineWidth = Math.max(1, radius * (0.004 + bandIndex * 0.0012)) * 1.25;
      context.stroke();
    });
    context.globalAlpha = 1;
  }

  function shouldRun() {
    if (reducedMotion || document.hidden || !onScreen) {
      return false;
    }
    return !hero.classList.contains('np-fx-paused');
  }

  function frame(now) {
    frameId = 0;
    if (!shouldRun()) {
      running = false;
      lastTime = 0;
      return;
    }
    if (!lastTime) {
      lastTime = now;
    }
    const delta = Math.min(now - lastTime, 48);
    lastTime = now;
    angle += (delta / TURN_MS) * Math.PI * 2;
    if (angle > Math.PI * 2) {
      angle -= Math.PI * 2;
    }
    draw(angle);
    frameId = window.requestAnimationFrame(frame);
  }

  function sync() {
    if (!shouldRun()) {
      running = false;
      lastTime = 0;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      return;
    }
    if (running) {
      return;
    }
    running = true;
    frameId = window.requestAnimationFrame(frame);
  }

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      sync();
    },
    { threshold: 0 },
  );
  visibilityObserver.observe(hero);

  const pauseObserver = new MutationObserver(() => {
    sync();
  });
  pauseObserver.observe(hero, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', sync);

  const themeObserver = new MutationObserver(() => {
    readColors();
    if (!running) {
      draw(angle);
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  const resizeObserver = new ResizeObserver(() => {
    if (!running) {
      draw(angle);
    }
  });
  resizeObserver.observe(canvas);

  readColors();
  fetch(src)
    .then((response) => {
      if (!response.ok) {
        throw new Error('countries');
      }
      return response.json();
    })
    .then((lines) => {
      rings = lines.map((line) => {
        const points = new Float32Array(line.length * 3);
        line.forEach((pair, index) => {
          const lon = (pair[0] * Math.PI) / 180;
          const lat = (pair[1] * Math.PI) / 180;
          const cosLat = Math.cos(lat);
          points[index * 3] = cosLat * Math.sin(lon);
          points[index * 3 + 1] = Math.sin(lat);
          points[index * 3 + 2] = cosLat * Math.cos(lon);
        });
        return points;
      });
      draw(angle);
      sync();
    })
    .catch(() => {});
})();
