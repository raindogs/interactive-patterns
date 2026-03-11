const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d", { alpha: true });

const BASE_CONFIG = {
  followLerp: 0.05,
  spawnDistance: 68,
  spawnCooldownMs: 220,
  lifeMs: 5200,
  fadeStartMs: 2900,
  maxClusters: 70,
  trailAlpha: 0.14,
};

const REDUCED_CONFIG = {
  followLerp: 0.085,
  spawnDistance: 94,
  spawnCooldownMs: 320,
  maxClusters: 32,
  trailAlpha: 0.24,
};

const BACKGROUND_CONFIG = {
  noiseTileSize: 128,
  noiseAlpha: 0.032,
};

const PALETTE = [
  { h: 22, s: 94, l: 43 },
  { h: 33, s: 95, l: 46 },
  { h: 184, s: 78, l: 38 },
  { h: 168, s: 76, l: 34 },
  { h: 54, s: 94, l: 48 },
  { h: 332, s: 82, l: 40 },
  { h: 302, s: 76, l: 38 },
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
  lastSpawnAt: 0,
  lastFrameTime: performance.now(),
  hazeCanvas: document.createElement("canvas"),
  hazeNoiseTile: document.createElement("canvas"),
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

  buildHazeLayer();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function createBackgroundNoiseTile() {
  const tileSize = BACKGROUND_CONFIG.noiseTileSize;
  const tile = state.hazeNoiseTile;
  tile.width = tileSize;
  tile.height = tileSize;
  const tctx = tile.getContext("2d", { alpha: true });
  const image = tctx.createImageData(tileSize, tileSize);
  const { data } = image;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.floor(random(120, 136));
    const alpha = Math.floor(random(16, 34));
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = alpha;
  }

  tctx.putImageData(image, 0, 0);
}

function buildHazeLayer() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  state.hazeCanvas.width = w;
  state.hazeCanvas.height = h;
  const hctx = state.hazeCanvas.getContext("2d", { alpha: true });

  hctx.clearRect(0, 0, w, h);
  hctx.fillStyle = "#000";
  hctx.fillRect(0, 0, w, h);

  const fields = [
    { x: w * 0.16, y: h * 0.24, radius: Math.max(w, h) * 0.78, hue: 355, sat: 86, light: 22, alpha: 0.24 },
    { x: w * 0.14, y: h * 0.76, radius: Math.max(w, h) * 0.6, hue: 226, sat: 58, light: 17, alpha: 0.2 },
    { x: w * 0.84, y: h * 0.34, radius: Math.max(w, h) * 0.58, hue: 298, sat: 31, light: 52, alpha: 0.22 },
    { x: w * 0.72, y: h * 0.46, radius: Math.max(w, h) * 0.5, hue: 286, sat: 25, light: 63, alpha: 0.15 },
  ];

  for (const field of fields) {
    const gradient = hctx.createRadialGradient(field.x, field.y, 0, field.x, field.y, field.radius);
    gradient.addColorStop(0, `hsla(${field.hue} ${field.sat}% ${field.light + 12}% / ${field.alpha * 0.96})`);
    gradient.addColorStop(0.22, `hsla(${field.hue} ${field.sat}% ${field.light + 8}% / ${field.alpha * 0.8})`);
    gradient.addColorStop(0.5, `hsla(${field.hue} ${field.sat}% ${field.light + 4}% / ${field.alpha * 0.56})`);
    gradient.addColorStop(0.78, `hsla(${field.hue} ${field.sat}% ${field.light}% / ${field.alpha * 0.24})`);
    gradient.addColorStop(1, "hsla(0 0% 0% / 0)");
    hctx.fillStyle = gradient;
    hctx.fillRect(0, 0, w, h);
  }

  createBackgroundNoiseTile();
  const tile = state.hazeNoiseTile;
  hctx.save();
  hctx.globalCompositeOperation = "source-over";
  hctx.globalAlpha = BACKGROUND_CONFIG.noiseAlpha;
  for (let y = 0; y < h; y += tile.height) {
    for (let x = 0; x < w; x += tile.width) {
      hctx.drawImage(tile, x, y);
    }
  }
  hctx.restore();
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
    h: (base.h + random(-8, 8) + 360) % 360,
    s: clamp(base.s + random(-7, 5), 52, 99),
    l: clamp(base.l + random(-10, 6), 20, 58),
  };
}

function hsla(color, alpha) {
  return `hsla(${Math.round(color.h)} ${Math.round(color.s)}% ${Math.round(color.l)}% / ${alpha})`;
}

function lerpByFrame(baseLerp, dtMs) {
  const frameScale = dtMs / 16.6667;
  return 1 - Math.pow(1 - baseLerp, frameScale);
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function drawOrganicPetalPath(context, petal) {
  const topRadius = petal.ry * random(0.82, 1.18);
  const bottomRadius = petal.ry * random(0.96, 1.42);
  const rightWidth = petal.rx * random(0.84, 1.26);
  const leftWidth = petal.rx * random(0.8, 1.22);
  const waist = petal.rx * random(0.2, 0.42);
  const asymmetry = random(-petal.rx * 0.12, petal.rx * 0.12);

  context.beginPath();
  context.moveTo(0, -topRadius);
  context.bezierCurveTo(
    rightWidth * 0.92 + asymmetry,
    -topRadius * 0.64,
    rightWidth,
    bottomRadius * 0.12,
    waist,
    bottomRadius
  );
  context.bezierCurveTo(
    waist * 0.3,
    bottomRadius * 1.12,
    -waist * 0.3,
    bottomRadius * 1.12,
    -waist,
    bottomRadius
  );
  context.bezierCurveTo(
    -leftWidth,
    bottomRadius * 0.12,
    -leftWidth * 0.92 + asymmetry,
    -topRadius * 0.64,
    0,
    -topRadius
  );
  context.closePath();
}

function createClusterSprite(coreRadius, petals, coreColor) {
  const size = Math.ceil(coreRadius * 7 + 80);
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const sctx = sprite.getContext("2d", { alpha: true });
  const cx = size * 0.5;
  const cy = size * 0.5;

  sctx.save();
  sctx.translate(cx, cy);
  sctx.globalCompositeOperation = "screen";

  const cloud = sctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius * 2.8);
  cloud.addColorStop(0, hsla(coreColor, 0.11));
  cloud.addColorStop(0.55, hsla(coreColor, 0.04));
  cloud.addColorStop(1, hsla(coreColor, 0));
  sctx.fillStyle = cloud;
  sctx.beginPath();
  sctx.arc(0, 0, coreRadius * 2.8, 0, Math.PI * 2);
  sctx.fill();

  for (let i = 0; i < 6; i += 1) {
    const puffColor = pickColor();
    const puffRadius = coreRadius * random(1.2, 2.2);
    const puffX = Math.cos((Math.PI * 2 * i) / 6 + random(-0.6, 0.6)) * coreRadius * random(0.25, 1.05);
    const puffY = Math.sin((Math.PI * 2 * i) / 6 + random(-0.6, 0.6)) * coreRadius * random(0.25, 1.05);
    const puff = sctx.createRadialGradient(puffX, puffY, 0, puffX, puffY, puffRadius);
    puff.addColorStop(0, hsla(puffColor, 0.08));
    puff.addColorStop(0.65, hsla(puffColor, 0.04));
    puff.addColorStop(1, hsla(puffColor, 0));
    sctx.fillStyle = puff;
    sctx.beginPath();
    sctx.arc(puffX, puffY, puffRadius, 0, Math.PI * 2);
    sctx.fill();
  }

  for (const petal of petals) {
    const px = Math.cos(petal.angle) * petal.distance;
    const py = Math.sin(petal.angle) * petal.distance;

    sctx.save();
    sctx.translate(px, py);
    sctx.rotate(petal.angle + petal.tilt);

    const gradient = sctx.createRadialGradient(0, 0, 1, 0, 0, petal.rx * 1.4);
    gradient.addColorStop(0, hsla(petal.color, 0.6));
    gradient.addColorStop(0.58, hsla(petal.color, 0.24));
    gradient.addColorStop(1, hsla(petal.color, 0));

    sctx.fillStyle = gradient;
    drawOrganicPetalPath(sctx, petal);
    sctx.fill();

    const haze = sctx.createRadialGradient(0, 0, petal.ry * 0.2, 0, 0, petal.rx * 1.7);
    haze.addColorStop(0, hsla(petal.color, 0.18));
    haze.addColorStop(0.6, hsla(petal.color, 0.08));
    haze.addColorStop(1, hsla(petal.color, 0));
    sctx.fillStyle = haze;
    drawOrganicPetalPath(sctx, petal);
    sctx.fill();
    sctx.restore();
  }

  const core = sctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius * 1.25);
  core.addColorStop(0, hsla(coreColor, 0.32));
  core.addColorStop(0.72, hsla(coreColor, 0.12));
  core.addColorStop(1, hsla(coreColor, 0));

  sctx.fillStyle = core;
  sctx.beginPath();
  sctx.arc(0, 0, coreRadius * 1.25, 0, Math.PI * 2);
  sctx.fill();

  sctx.restore();

  return sprite;
}

function createCluster(x, y) {
  const petals = [];
  const petalCount = Math.floor(random(5, 10));
  const coreRadius = random(18, 36);

  for (let i = 0; i < petalCount; i += 1) {
    const step = (Math.PI * 2 * i) / petalCount;
    petals.push({
      angle: step + random(-0.24, 0.24),
      distance: random(coreRadius * 0.45, coreRadius * 1.35),
      rx: random(12, 36),
      ry: random(8, 24),
      tilt: random(-0.72, 0.72),
      color: pickColor(),
    });
  }

  const coreColor = pickColor();
  const sprite = createClusterSprite(coreRadius, petals, coreColor);
  const vanishX = window.innerWidth * 0.5 + random(-window.innerWidth * 0.08, window.innerWidth * 0.08);
  const vanishY = window.innerHeight * 0.5 + random(-window.innerHeight * 0.08, window.innerHeight * 0.08);
  const toVanishX = vanishX - x;
  const toVanishY = vanishY - y;
  const toVanishLength = Math.hypot(toVanishX, toVanishY) || 1;

  return {
    x,
    y,
    age: 0,
    life: BASE_CONFIG.lifeMs,
    fadeStart: BASE_CONFIG.fadeStartMs,
    driftX: random(-0.007, 0.007),
    driftY: random(-0.004, 0.004),
    swirl: random(-0.00035, 0.00035),
    rotation: random(0, Math.PI * 2),
    seed: Math.random() * 999,
    depthDirX: toVanishX / toVanishLength,
    depthDirY: toVanishY / toVanishLength,
    depthTravel: random(56, 180),
    sprite,
    spriteSize: sprite.width,
    depth: 0,
  };
}

function spawnAtStalker(force = false) {
  const cfg = runtimeConfig();
  const now = performance.now();
  const distance = Math.hypot(stalker.x - state.lastSpawnX, stalker.y - state.lastSpawnY);

  if (!force && distance < cfg.spawnDistance) {
    return;
  }

  if (!force && now - state.lastSpawnAt < cfg.spawnCooldownMs) {
    return;
  }

  state.clusters.push(createCluster(stalker.x, stalker.y));
  state.lastSpawnX = stalker.x;
  state.lastSpawnY = stalker.y;
  state.lastSpawnAt = now;

  if (state.clusters.length > cfg.maxClusters) {
    state.clusters.splice(0, state.clusters.length - cfg.maxClusters);
  }
}

function updateClusters(dtMs) {
  for (let i = state.clusters.length - 1; i >= 0; i -= 1) {
    const cluster = state.clusters[i];
    cluster.age += dtMs;
    cluster.depth = clamp(cluster.age / cluster.life, 0, 1);

    cluster.x += cluster.driftX * dtMs;
    cluster.y += cluster.driftY * dtMs;
    cluster.rotation += cluster.swirl * dtMs;

    if (cluster.age >= cluster.life) {
      state.clusters.splice(i, 1);
    }
  }
}

function drawHaze() {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(state.hazeCanvas, 0, 0);
  ctx.restore();
}

function drawCluster(cluster) {
  const fadeWindow = cluster.life - cluster.fadeStart;
  const fadeProgress = fadeWindow <= 0 ? 1 : clamp((cluster.age - cluster.fadeStart) / fadeWindow, 0, 1);
  const phase = cluster.depth;
  const depthEase = phase * phase;
  const emergence = clamp(phase / 0.2, 0, 1);
  const alpha = clamp((1 - fadeProgress) * (0.62 - depthEase * 0.24) * emergence, 0, 1);
  const focusGain = Math.exp(-Math.pow((phase - 0.28) / 0.12, 2));

  const depthScale = 0.92 + depthEase * 2.25 + focusGain * 0.35;
  const wanderRadius = 2 + depthEase * 12;
  const depthOffset = depthEase * cluster.depthTravel;
  const originX =
    cluster.x +
    cluster.depthDirX * depthOffset +
    Math.sin(cluster.seed + cluster.age * 0.00052) * wanderRadius;
  const originY =
    cluster.y +
    cluster.depthDirY * depthOffset +
    Math.cos(cluster.seed * 1.3 + cluster.age * 0.00041) * wanderRadius;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(cluster.rotation);
  ctx.scale(depthScale, depthScale);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = alpha;

  let blur = 0;
  let saturation = 1;
  let brightness = 1;
  if ("filter" in ctx) {
    const focusPivot = 0.24;
    blur =
      phase <= focusPivot
        ? lerp(8.4, 4.8, phase / focusPivot)
        : lerp(4.8, 12.0, (phase - focusPivot) / (1 - focusPivot));
    saturation = clamp(0.26 + focusGain * 0.44 - phase * 0.3, 0.1, 0.74);
    brightness = clamp(0.2 + focusGain * 0.2 - phase * 0.16, 0.08, 0.52);
    ctx.filter = `blur(${blur}px) saturate(${saturation}) brightness(${brightness})`;
  }

  const size = cluster.spriteSize;
  ctx.drawImage(cluster.sprite, -size * 0.5, -size * 0.5);

  if ("filter" in ctx) {
    const hazeBlur = blur + 3.6;
    const hazeSaturation = Math.max(0.08, saturation * 0.82);
    const hazeBrightness = Math.max(0.06, brightness * 0.86);
    ctx.globalAlpha = alpha * 0.55;
    ctx.filter = `blur(${hazeBlur}px) saturate(${hazeSaturation}) brightness(${hazeBrightness})`;
    ctx.drawImage(cluster.sprite, -size * 0.5, -size * 0.5);
    ctx.filter = "none";
  }

  ctx.restore();
}

function drawStalkerGlow() {
  if (!state.started) {
    return;
  }

  const glow = ctx.createRadialGradient(stalker.x, stalker.y, 0, stalker.x, stalker.y, 24);
  glow.addColorStop(0, "rgba(255, 180, 96, 0.045)");
  glow.addColorStop(0.32, "rgba(255, 132, 48, 0.02)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(stalker.x, stalker.y, 24, 0, Math.PI * 2);
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

  drawHaze();

  for (const cluster of state.clusters) {
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
  spawnAtStalker(true);
});

canvas.addEventListener("pointermove", (event) => {
  // Touch devices spawn only while actively pressing to avoid over-generation.
  if (event.pointerType === "touch" && !pointer.engaged) {
    return;
  }

  engagePointer(event.clientX, event.clientY);
});

canvas.addEventListener("pointerup", () => {
  pointer.engaged = false;
});

canvas.addEventListener("pointercancel", () => {
  pointer.engaged = false;
});

if (typeof motionQuery.addEventListener === "function") {
  motionQuery.addEventListener("change", (event) => {
    reducedMotion = event.matches;
  });
} else if (typeof motionQuery.addListener === "function") {
  motionQuery.addListener((event) => {
    reducedMotion = event.matches;
  });
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
requestAnimationFrame(animate);
