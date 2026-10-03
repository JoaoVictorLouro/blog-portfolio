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
  const FOCUS_SHIFT = -0.2;
  const FOCUS = [
    { lat: -14.2, lon: -52 },
    { lat: 39.6, lon: -8 },
    { lat: 36.2, lon: 138.2 },
    { lat: 39.8, lon: -98.6 },
  ];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const limbPlane = 1 / CAMERA;

  function wrapAngle(angle) {
    const turn = Math.PI * 2;
    return ((angle % turn) + turn) % turn;
  }

  function projectFocus(lat, lon, aimYaw, aimPitch) {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const cosLat = Math.cos(latRad);
    const point = rotatePoint(
      cosLat * Math.sin(lonRad),
      Math.sin(latRad),
      cosLat * Math.cos(lonRad),
      Math.cos(aimYaw),
      Math.sin(aimYaw),
      Math.cos(aimPitch),
      Math.sin(aimPitch),
    );
    const scale = CAMERA / (CAMERA - point[2]);
    return [point[0] * scale, point[1] * scale];
  }

  function aimFocus(place) {
    const limb = Math.sqrt(1 - limbPlane * limbPlane) * (CAMERA / (CAMERA - limbPlane));
    const targetX = FOCUS_SHIFT * 2 * limb;
    let aimYaw = wrapAngle((-place.lon * Math.PI) / 180);
    let aimPitch = wrapAngle((place.lat * Math.PI) / 180 - TILT);
    const step = 1e-4;
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const [sx, sy] = projectFocus(place.lat, place.lon, aimYaw, aimPitch);
      const [sxYaw, syYaw] = projectFocus(place.lat, place.lon, aimYaw + step, aimPitch);
      const [sxPitch, syPitch] = projectFocus(place.lat, place.lon, aimYaw, aimPitch + step);
      const dsxDyaw = (sxYaw - sx) / step;
      const dsyDyaw = (syYaw - sy) / step;
      const dsxDpitch = (sxPitch - sx) / step;
      const dsyDpitch = (syPitch - sy) / step;
      const det = dsxDyaw * dsyDpitch - dsxDpitch * dsyDyaw;
      aimYaw += (dsyDpitch * (targetX - sx) - dsxDpitch * -sy) / det;
      aimPitch += (-dsyDyaw * (targetX - sx) + dsxDyaw * -sy) / det;
    }
    return [wrapAngle(aimYaw), wrapAngle(aimPitch)];
  }

  const focus = FOCUS[Math.floor(Math.random() * FOCUS.length)];
  const [initialYaw, initialPitch] = aimFocus(focus);
  let rings = [];
  let yaw = initialYaw;
  const pitch = initialPitch;
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

  function rotatePoint(x, y, z, yawCos, yawSin, pitchCos, pitchSin) {
    const x1 = x * yawCos + z * yawSin;
    const z1 = -x * yawSin + z * yawCos;
    const y2 = y * pitchCos - z1 * pitchSin;
    const z2 = y * pitchSin + z1 * pitchCos;
    return [x1, y2 * tiltCos - z2 * tiltSin, y2 * tiltSin + z2 * tiltCos];
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

  function draw() {
    if (!rings.length || !resize()) {
      return;
    }
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.42;
    const yawCos = Math.cos(yaw);
    const yawSin = Math.sin(yaw);
    const pitchCos = Math.cos(pitch);
    const pitchSin = Math.sin(pitch);
    const bands = [[], [], []];

    rings.forEach((ring) => {
      let previous = null;
      for (let index = 0; index < ring.length; index += 3) {
        const point = rotatePoint(
          ring[index],
          ring[index + 1],
          ring[index + 2],
          yawCos,
          yawSin,
          pitchCos,
          pitchSin,
        );
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
    yaw += (delta / TURN_MS) * Math.PI * 2;
    if (yaw > Math.PI * 2) {
      yaw -= Math.PI * 2;
    }
    draw();
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
      draw();
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  const resizeObserver = new ResizeObserver(() => {
    if (!running) {
      draw();
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
      draw();
      sync();
    })
    .catch(() => {});
})();
