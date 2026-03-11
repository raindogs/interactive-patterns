const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d", { alpha: true });

const BASE_CONFIG = {
  followLerp: 0.12,
  spawnDistance: 14,
  lifeMs: 4500,
  fadeStartMs: 2800,
  maxClusters: 180,
  sinkSpeed: 0.018,
  trailAlpha: 0.28,
};

const REDUCED_CONFIG = {
  followLerp: 0.2,
  spawnDistance: 28,
  maxClusters: 90,
  trailAlpha: 0.4,
};

const PALETTE = [
  { h: 330, s: 86, l: 58 },
  { h: 302, s: 74, l: 54 },
  { h: 220, s: 84, l: 60 },
  { h: 198, s: 72, l: 55 },
  { h: 44, s: 92, l: 56 },
  { h: 18, s: 90, l: 57 },
];

const pointer = {
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.5,
  engaged: false,
};

const stalker = {
  x: pointer.x,
  y: pointer.y,
};

const state = {
  started: false,
  clusters: [],
  lastSpawnX: pointer.x,
  lastSpawnY: pointer.y,
  lastFrameTime: performance.now(),
};

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = motionQuery.matches;

function runtimeConfig() {
  return reducedMotion
    ? { ...BASE_CONFIG, ...REDUCED_CONFIG }
    : BASE_CONFIG;
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickColor() {
  const base = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    h: (base.h + random(-9, 9) + 360) % 360,
    s: clamp(base.s + random(-6, 7), 52, 96),
    l: clamp(base.l + random(-7, 7), 36, 74),
  };
}

function hsla(color, alpha) {
  return `hsla(${Math.round(color.h)} ${Math.round(color.s)}% ${Math.round(color.l)}% / ${alpha})`;
}

function lerpByFrame(baseLerp, dtMs) {
  const frameScale = dtMs / 16.6667;
  return 1 - Math.pow(1 - baseLerp, frameScale);
}

function createCluster(x, y) {
  const petals = [];
  const petalCount = Math.floor(random(5, 10));
  const coreRadius = random(10, 22);
  const baseRotation = random(0, Math.PI * 2);

  for (let i = 0; i < petalCount; i += 1) {
    const step = (Math.PI * 2 * i) / petalCount;
    petals.push({
      angle: step + random(-0.25, 0.25),
      distance: random(coreRadius * 0.35, coreRadius * 1.3),
      rx: random(8, 24),
      ry: random(5, 16),
      tilt: random(-0.7, 0.7),
      color: pickColor(),
    });
  }

  return {
    x,
    y,
    age: 0,
    life: BASE_CONFIG.lifeMs,
    fadeStart: BASE_CONFIG.fadeStartMs,
    driftX: random(-0.01, 0.01),
    driftY: BASE_CONFIG.sinkSpeed + random(0.008, 0.03),
    swirl: random(-0.00045, 0.00045),
    rotation: baseRotation,
    blur: random(10, 28),
    seed: Math.random() * 999,
    coreColor: pickColor(),
    coreRadius,
    petals,
  };
}

function spawnAtStalker() {
  const cfg = runtimeConfig();
  const distance = Math.hypot(stalker.x - state.lastSpawnX, stalker.y - state.lastSpawnY);

  if (distance < cfg.spawnDistance) {
    return;
  }

  state.clusters.push(createCluster(stalker.x, stalker.y));
  state.lastSpawnX = stalker.x;
  state.lastSpawnY = stalker.y;

  if (state.clusters.length > cfg.maxClusters) {
    state.clusters.splice(0, state.clusters.length - cfg.maxClusters);
  }
}

function updateClusters(dtMs) {
  for (let i = state.clusters.length - 1; i >= 0; i -= 1) {
    const cluster = state.clusters[i];
    cluster.age += dtMs;
    const ageRatio = cluster.age / cluster.life;

    cluster.x += cluster.driftX * dtMs;
    cluster.y += cluster.driftY * dtMs;
    cluster.rotation += cluster.swirl * dtMs;
    cluster.depth = clamp(ageRatio, 0, 1);

    if (cluster.age >= cluster.life) {
      state.clusters.splice(i, 1);
    }
  }
}

function drawCluster(cluster) {
  const fadeWindow = cluster.life - cluster.fadeStart;
  const fadeProgress = fadeWindow <= 0 ? 1 : clamp((cluster.age - cluster.fadeStart) / fadeWindow, 0, 1);
  const alpha = 1 - fadeProgress;
  const depthScale = 1.08 - cluster.depth * 0.58;
  const sinkOffset = cluster.depth * 118;
  const driftOffset = Math.sin(cluster.age * 0.001 + cluster.seed) * 14 * (0.2 + cluster.depth);
  const originX = cluster.x + driftOffset;
  const originY = cluster.y + sinkOffset;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(cluster.rotation);
  ctx.scale(depthScale, depthScale);
  ctx.globalCompositeOperation = "lighter";

  const cloud = ctx.createRadialGradient(0, 0, 0, 0, 0, cluster.coreRadius * 2.9);
  cloud.addColorStop(0, hsla(cluster.coreColor, 0.18 * alpha));
  cloud.addColorStop(0.5, hsla(cluster.coreColor, 0.08 * alpha));
  cloud.addColorStop(1, hsla(cluster.coreColor, 0));
  ctx.fillStyle = cloud;
  ctx.beginPath();
  ctx.arc(0, 0, cluster.coreRadius * 2.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = cluster.blur * (1 - cluster.depth * 0.55);
  ctx.shadowColor = hsla(cluster.coreColor, 0.38 * alpha);

  for (const petal of cluster.petals) {
    const px = Math.cos(petal.angle) * petal.distance;
    const py = Math.sin(petal.angle) * petal.distance;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(petal.angle + petal.tilt);

    const gradient = ctx.createRadialGradient(0, 0, 0.8, 0, 0, petal.rx * 1.35);
    gradient.addColorStop(0, hsla(petal.color, 0.78 * alpha));
    gradient.addColorStop(0.55, hsla(petal.color, 0.42 * alpha));
    gradient.addColorStop(1, hsla(petal.color, 0));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, petal.rx, petal.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, cluster.coreRadius * 1.4);
  core.addColorStop(0, hsla(cluster.coreColor, 0.9 * alpha));
  core.addColorStop(0.7, hsla(cluster.coreColor, 0.2 * alpha));
  core.addColorStop(1, hsla(cluster.coreColor, 0));

  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, cluster.coreRadius * 1.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawStalkerGlow() {
  if (!state.started) {
    return;
  }

  const glow = ctx.createRadialGradient(stalker.x, stalker.y, 0, stalker.x, stalker.y, 34);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.26)");
  glow.addColorStop(0.3, "rgba(235, 176, 255, 0.11)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(stalker.x, stalker.y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animate(now) {
  const cfg = runtimeConfig();
  const dtMs = Math.min(34, now - state.lastFrameTime || 16.6667);
  state.lastFrameTime = now;

  const follow = lerpByFrame(cfg.followLerp, dtMs);
  stalker.x += (pointer.x - stalker.x) * follow;
  stalker.y += (pointer.y - stalker.y) * follow;

  if (state.started) {
    spawnAtStalker();
  }

  updateClusters(dtMs);

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(0, 0, 0, ${cfg.trailAlpha})`;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const drawOrder = state.clusters.slice().sort((a, b) => b.depth - a.depth);
  for (const cluster of drawOrder) {
    drawCluster(cluster);
  }

  drawStalkerGlow();
  requestAnimationFrame(animate);
}

function engagePointer(clientX, clientY) {
  pointer.x = clientX;
  pointer.y = clientY;

  if (!state.started) {
    state.started = true;
    stalker.x = clientX;
    stalker.y = clientY;
    state.lastSpawnX = clientX;
    state.lastSpawnY = clientY;
  }
}

canvas.addEventListener("pointerdown", (event) => {
  pointer.engaged = true;
  engagePointer(event.clientX, event.clientY);
  state.clusters.push(createCluster(event.clientX, event.clientY));
});

canvas.addEventListener("pointermove", (event) => {
  engagePointer(event.clientX, event.clientY);
});

canvas.addEventListener("pointerup", () => {
  pointer.engaged = false;
});

canvas.addEventListener("pointercancel", () => {
  pointer.engaged = false;
});

motionQuery.addEventListener("change", (event) => {
  reducedMotion = event.matches;
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
requestAnimationFrame(animate);
