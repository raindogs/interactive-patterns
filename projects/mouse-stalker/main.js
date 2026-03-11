var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
(function() {
  "use strict";
  var _BackgroundLayer_instances, createBackgroundNoiseTile_fn, buildHazeLayer_fn;
  const DEFAULT_BACKGROUND_CONFIG = {
    noiseTileSize: 128,
    noiseAlpha: 0.032,
    background: {
      fields: [
        { xRatio: 0.16, yRatio: 0.24, radiusScale: 0.8, hue: 354, sat: 96, light: 24, alpha: 0.3 },
        { xRatio: 0.13, yRatio: 0.76, radiusScale: 0.62, hue: 228, sat: 76, light: 20, alpha: 0.26 },
        { xRatio: 0.84, yRatio: 0.34, radiusScale: 0.62, hue: 308, sat: 72, light: 52, alpha: 0.3 },
        { xRatio: 0.74, yRatio: 0.46, radiusScale: 0.52, hue: 294, sat: 66, light: 62, alpha: 0.2 }
      ],
      stops: [0, 0.22, 0.5, 0.78, 1],
      lightBoosts: [16, 12, 8, 0],
      alphaScale: [0.98, 0.84, 0.6, 0.24]
    },
    backgroundNoise: {
      grayMin: 120,
      grayMax: 136,
      alphaMin: 16,
      alphaMax: 34
    }
  };
  function random$1(min, max) {
    return Math.random() * (max - min) + min;
  }
  function mergeBackgroundConfig(config = {}) {
    var _a, _b, _c, _d;
    const base = DEFAULT_BACKGROUND_CONFIG;
    return {
      noiseTileSize: config.noiseTileSize ?? base.noiseTileSize,
      noiseAlpha: config.noiseAlpha ?? base.noiseAlpha,
      background: {
        fields: (((_a = config.background) == null ? void 0 : _a.fields) ?? base.background.fields).map((field) => ({ ...field })),
        stops: [...((_b = config.background) == null ? void 0 : _b.stops) ?? base.background.stops],
        lightBoosts: [...((_c = config.background) == null ? void 0 : _c.lightBoosts) ?? base.background.lightBoosts],
        alphaScale: [...((_d = config.background) == null ? void 0 : _d.alphaScale) ?? base.background.alphaScale]
      },
      backgroundNoise: {
        ...base.backgroundNoise,
        ...config.backgroundNoise ?? {}
      }
    };
  }
  class BackgroundLayer {
    constructor(config = {}) {
      __privateAdd(this, _BackgroundLayer_instances);
      this.config = mergeBackgroundConfig(config);
      this.hazeCanvas = document.createElement("canvas");
      this.noiseTile = document.createElement("canvas");
      this.width = 0;
      this.height = 0;
    }
    resize(width, height) {
      this.width = width;
      this.height = height;
      this.hazeCanvas.width = width;
      this.hazeCanvas.height = height;
      __privateMethod(this, _BackgroundLayer_instances, buildHazeLayer_fn).call(this);
    }
    draw(ctx) {
      if (!ctx) {
        return;
      }
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(this.hazeCanvas, 0, 0);
      ctx.restore();
    }
  }
  _BackgroundLayer_instances = new WeakSet();
  createBackgroundNoiseTile_fn = function() {
    const tileSize = this.config.noiseTileSize;
    const tile = this.noiseTile;
    tile.width = tileSize;
    tile.height = tileSize;
    const tctx = tile.getContext("2d", { alpha: true });
    const image = tctx.createImageData(tileSize, tileSize);
    const { data } = image;
    const noise = this.config.backgroundNoise;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor(random$1(noise.grayMin, noise.grayMax));
      const alpha = Math.floor(random$1(noise.alphaMin, noise.alphaMax));
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      data[i + 3] = alpha;
    }
    tctx.putImageData(image, 0, 0);
  };
  buildHazeLayer_fn = function() {
    const w = this.width;
    const h = this.height;
    if (!w || !h) {
      return;
    }
    const hctx = this.hazeCanvas.getContext("2d", { alpha: true });
    const bg = this.config.background;
    const maxSide = Math.max(w, h);
    hctx.clearRect(0, 0, w, h);
    hctx.fillStyle = "#000";
    hctx.fillRect(0, 0, w, h);
    const fields = bg.fields.map((field) => ({
      x: w * field.xRatio,
      y: h * field.yRatio,
      radius: maxSide * field.radiusScale,
      hue: field.hue,
      sat: field.sat,
      light: field.light,
      alpha: field.alpha
    }));
    for (const field of fields) {
      const gradient = hctx.createRadialGradient(field.x, field.y, 0, field.x, field.y, field.radius);
      gradient.addColorStop(
        bg.stops[0],
        `hsla(${field.hue} ${field.sat}% ${field.light + bg.lightBoosts[0]}% / ${field.alpha * bg.alphaScale[0]})`
      );
      gradient.addColorStop(
        bg.stops[1],
        `hsla(${field.hue} ${field.sat}% ${field.light + bg.lightBoosts[1]}% / ${field.alpha * bg.alphaScale[1]})`
      );
      gradient.addColorStop(
        bg.stops[2],
        `hsla(${field.hue} ${field.sat}% ${field.light + bg.lightBoosts[2]}% / ${field.alpha * bg.alphaScale[2]})`
      );
      gradient.addColorStop(
        bg.stops[3],
        `hsla(${field.hue} ${field.sat}% ${field.light}% / ${field.alpha * bg.alphaScale[3]})`
      );
      gradient.addColorStop(bg.stops[4], "hsla(0 0% 0% / 0)");
      hctx.fillStyle = gradient;
      hctx.fillRect(0, 0, w, h);
    }
    __privateMethod(this, _BackgroundLayer_instances, createBackgroundNoiseTile_fn).call(this);
    const tile = this.noiseTile;
    hctx.save();
    hctx.globalCompositeOperation = "source-over";
    hctx.globalAlpha = this.config.noiseAlpha;
    for (let y = 0; y < h; y += tile.height) {
      for (let x = 0; x < w; x += tile.width) {
        hctx.drawImage(tile, x, y);
      }
    }
    hctx.restore();
  };
  function createBackgroundLayer(config) {
    return new BackgroundLayer(config);
  }
  const BASE_CONFIG = {
    followLerp: 0.05,
    spawnDistance: 68,
    spawnCooldownMs: 220,
    lifeMs: 5200,
    fadeStartMs: 2900,
    maxClusters: 70,
    trailAlpha: 0.14
  };
  const REDUCED_CONFIG = {
    followLerp: 0.085,
    spawnDistance: 94,
    spawnCooldownMs: 320,
    maxClusters: 32,
    trailAlpha: 0.24
  };
  const DEFAULT_PALETTE = [
    { h: 22, s: 94, l: 43 },
    { h: 33, s: 95, l: 46 },
    { h: 184, s: 78, l: 38 },
    { h: 168, s: 76, l: 34 },
    { h: 54, s: 94, l: 48 },
    { h: 332, s: 82, l: 40 },
    { h: 302, s: 76, l: 38 }
  ];
  const DEFAULT_TUNING = {
    colorJitter: {
      hueMin: -8,
      hueMax: 8,
      satDeltaMin: -7,
      satDeltaMax: 5,
      lightDeltaMin: -10,
      lightDeltaMax: 6,
      satClampMin: 52,
      satClampMax: 99,
      lightClampMin: 20,
      lightClampMax: 58
    },
    bloomSpawn: {
      petalCountMin: 5,
      petalCountMax: 10,
      coreRadiusMin: 18,
      coreRadiusMax: 36,
      distanceMinScale: 0.45,
      distanceMaxScale: 1.35,
      petalRxMin: 12,
      petalRxMax: 36,
      petalRyMin: 8,
      petalRyMax: 24,
      tiltMin: -0.72,
      tiltMax: 0.72,
      vanishJitterRatio: 0.08,
      depthTravelMin: 56,
      depthTravelMax: 180,
      driftXMin: -7e-3,
      driftXMax: 7e-3,
      driftYMin: -4e-3,
      driftYMax: 4e-3,
      swirlMin: -35e-5,
      swirlMax: 35e-5
    },
    organicShape: {
      topRadiusMin: 0.82,
      topRadiusMax: 1.18,
      bottomRadiusMin: 0.96,
      bottomRadiusMax: 1.42,
      rightWidthMin: 0.84,
      rightWidthMax: 1.26,
      leftWidthMin: 0.8,
      leftWidthMax: 1.22,
      waistMin: 0.2,
      waistMax: 0.42,
      asymmetryScale: 0.12
    },
    bloomSprite: {
      sizeScale: 7,
      sizePadding: 80,
      cloudRadiusScale: 2.8,
      cloudAlphaInner: 0.11,
      cloudAlphaMid: 0.04,
      puffCount: 6,
      puffRadiusMinScale: 1.2,
      puffRadiusMaxScale: 2.2,
      puffPositionMinScale: 0.25,
      puffPositionMaxScale: 1.05,
      puffAlphaInner: 0.08,
      puffAlphaMid: 0.04,
      petalAlphaInner: 0.6,
      petalAlphaMid: 0.24,
      petalHazeAlphaInner: 0.18,
      petalHazeAlphaMid: 0.08,
      coreRadiusScale: 1.25,
      coreAlphaInner: 0.32,
      coreAlphaMid: 0.12
    },
    bloomDynamics: {
      emergencePhase: 0.2,
      alphaBase: 0.62,
      alphaDepthDecay: 0.24,
      focusCenter: 0.28,
      focusWidth: 0.12,
      scaleBase: 0.92,
      scaleDepthGain: 2.25,
      scaleFocusGain: 0.35,
      wanderBase: 2,
      wanderDepthGain: 12,
      xWaveSpeed: 52e-5,
      yWaveSpeed: 41e-5,
      yWaveSeedScale: 1.3,
      focusPivot: 0.24,
      blurStart: 8.4,
      blurPeakMin: 4.8,
      blurEnd: 12,
      saturationBase: 0.26,
      saturationFocusGain: 0.44,
      saturationDepthDecay: 0.3,
      saturationMin: 0.1,
      saturationMax: 0.74,
      brightnessBase: 0.2,
      brightnessFocusGain: 0.2,
      brightnessDepthDecay: 0.16,
      brightnessMin: 0.08,
      brightnessMax: 0.52,
      hazeBlurOffset: 3.6,
      hazeSaturationScale: 0.82,
      hazeBrightnessScale: 0.86,
      hazeSaturationMin: 0.08,
      hazeBrightnessMin: 0.06,
      hazeAlphaScale: 0.55
    },
    stalkerGlow: {
      radius: 24,
      stopMid: 0.32,
      alphaInner: 0.045,
      alphaMid: 0.02
    }
  };
  function random(min, max) {
    return Math.random() * (max - min) + min;
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function lerpByFrame(baseLerp, dtMs) {
    const frameScale = dtMs / 16.6667;
    return 1 - Math.pow(1 - baseLerp, frameScale);
  }
  function lerp(start, end, t) {
    return start + (end - start) * t;
  }
  function hsla(color, alpha) {
    return `hsla(${Math.round(color.h)} ${Math.round(color.s)}% ${Math.round(color.l)}% / ${alpha})`;
  }
  function mergeTuning(tuning = {}) {
    return {
      colorJitter: { ...DEFAULT_TUNING.colorJitter, ...tuning.colorJitter ?? {} },
      bloomSpawn: { ...DEFAULT_TUNING.bloomSpawn, ...tuning.bloomSpawn ?? {} },
      organicShape: { ...DEFAULT_TUNING.organicShape, ...tuning.organicShape ?? {} },
      bloomSprite: { ...DEFAULT_TUNING.bloomSprite, ...tuning.bloomSprite ?? {} },
      bloomDynamics: { ...DEFAULT_TUNING.bloomDynamics, ...tuning.bloomDynamics ?? {} },
      stalkerGlow: { ...DEFAULT_TUNING.stalkerGlow, ...tuning.stalkerGlow ?? {} }
    };
  }
  class StalkerLayer {
    constructor(options = {}) {
      this.baseConfig = { ...BASE_CONFIG, ...options.baseConfig ?? {} };
      this.reducedConfig = { ...REDUCED_CONFIG, ...options.reducedConfig ?? {} };
      this.tuning = mergeTuning(options.tuning ?? {});
      this.palette = (options.palette ?? DEFAULT_PALETTE).map((color) => ({ ...color }));
      const initialWidth = options.initialWidth ?? window.innerWidth;
      const initialHeight = options.initialHeight ?? window.innerHeight;
      this.viewport = {
        width: initialWidth,
        height: initialHeight
      };
      this.pointer = {
        x: initialWidth * 0.5,
        y: initialHeight * 0.5,
        engaged: false
      };
      this.stalker = {
        x: this.pointer.x,
        y: this.pointer.y
      };
      this.state = {
        started: false,
        clusters: [],
        lastSpawnX: this.pointer.x,
        lastSpawnY: this.pointer.y,
        lastSpawnAt: 0,
        lastFrameTime: performance.now()
      };
      this.motionQuery = options.motionQuery ?? window.matchMedia("(prefers-reduced-motion: reduce)");
      this.reducedMotion = this.motionQuery.matches;
      this.canvas = null;
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onPointerCancel = this.onPointerCancel.bind(this);
      this.onMotionChange = this.onMotionChange.bind(this);
      if (typeof this.motionQuery.addEventListener === "function") {
        this.motionQuery.addEventListener("change", this.onMotionChange);
        this.motionListenerType = "addEventListener";
      } else if (typeof this.motionQuery.addListener === "function") {
        this.motionQuery.addListener(this.onMotionChange);
        this.motionListenerType = "addListener";
      } else {
        this.motionListenerType = "none";
      }
    }
    runtimeConfig() {
      return this.reducedMotion ? { ...this.baseConfig, ...this.reducedConfig } : this.baseConfig;
    }
    attach(canvas) {
      if (this.canvas === canvas) {
        return;
      }
      this.detach();
      this.canvas = canvas;
      this.canvas.addEventListener("pointerdown", this.onPointerDown);
      this.canvas.addEventListener("pointermove", this.onPointerMove);
      this.canvas.addEventListener("pointerup", this.onPointerUp);
      this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    }
    detach() {
      if (!this.canvas) {
        return;
      }
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointermove", this.onPointerMove);
      this.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
      this.canvas = null;
    }
    dispose() {
      this.detach();
      if (this.motionListenerType === "addEventListener") {
        this.motionQuery.removeEventListener("change", this.onMotionChange);
      } else if (this.motionListenerType === "addListener") {
        this.motionQuery.removeListener(this.onMotionChange);
      }
    }
    resize(width, height) {
      this.viewport.width = width;
      this.viewport.height = height;
      if (!this.state.started) {
        this.pointer.x = width * 0.5;
        this.pointer.y = height * 0.5;
        this.stalker.x = this.pointer.x;
        this.stalker.y = this.pointer.y;
        this.state.lastSpawnX = this.pointer.x;
        this.state.lastSpawnY = this.pointer.y;
      }
    }
    onMotionChange(event) {
      this.reducedMotion = event.matches;
    }
    engagePointer(clientX, clientY) {
      this.pointer.x = clientX;
      this.pointer.y = clientY;
      if (!this.state.started) {
        this.state.started = true;
        this.stalker.x = clientX;
        this.stalker.y = clientY;
        this.state.lastSpawnX = clientX;
        this.state.lastSpawnY = clientY;
      }
    }
    onPointerDown(event) {
      this.pointer.engaged = true;
      this.engagePointer(event.clientX, event.clientY);
      this.spawnAtStalker(true);
    }
    onPointerMove(event) {
      if (event.pointerType === "touch" && !this.pointer.engaged) {
        return;
      }
      this.engagePointer(event.clientX, event.clientY);
    }
    onPointerUp() {
      this.pointer.engaged = false;
    }
    onPointerCancel() {
      this.pointer.engaged = false;
    }
    update(now) {
      const cfg = this.runtimeConfig();
      const dtMs = Math.min(34, now - this.state.lastFrameTime || 16.6667);
      this.state.lastFrameTime = now;
      const follow = lerpByFrame(cfg.followLerp, dtMs);
      this.stalker.x += (this.pointer.x - this.stalker.x) * follow;
      this.stalker.y += (this.pointer.y - this.stalker.y) * follow;
      if (this.state.started) {
        this.spawnAtStalker();
      }
      this.updateClusters(dtMs);
    }
    drawTrail(ctx) {
      const cfg = this.runtimeConfig();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(0, 0, 0, ${cfg.trailAlpha})`;
      ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
    }
    draw(ctx) {
      for (const cluster of this.state.clusters) {
        this.drawCluster(ctx, cluster);
      }
      this.drawStalkerGlow(ctx);
    }
    spawnAtStalker(force = false) {
      const cfg = this.runtimeConfig();
      const now = performance.now();
      const distance = Math.hypot(this.stalker.x - this.state.lastSpawnX, this.stalker.y - this.state.lastSpawnY);
      if (!force && distance < cfg.spawnDistance) {
        return;
      }
      if (!force && now - this.state.lastSpawnAt < cfg.spawnCooldownMs) {
        return;
      }
      this.state.clusters.push(this.createCluster(this.stalker.x, this.stalker.y));
      this.state.lastSpawnX = this.stalker.x;
      this.state.lastSpawnY = this.stalker.y;
      this.state.lastSpawnAt = now;
      if (this.state.clusters.length > cfg.maxClusters) {
        this.state.clusters.splice(0, this.state.clusters.length - cfg.maxClusters);
      }
    }
    updateClusters(dtMs) {
      for (let i = this.state.clusters.length - 1; i >= 0; i -= 1) {
        const cluster = this.state.clusters[i];
        cluster.age += dtMs;
        cluster.depth = clamp(cluster.age / cluster.life, 0, 1);
        cluster.x += cluster.driftX * dtMs;
        cluster.y += cluster.driftY * dtMs;
        cluster.rotation += cluster.swirl * dtMs;
        if (cluster.age >= cluster.life) {
          this.state.clusters.splice(i, 1);
        }
      }
    }
    pickColor() {
      const jitter = this.tuning.colorJitter;
      const base = this.palette[Math.floor(Math.random() * this.palette.length)];
      return {
        h: (base.h + random(jitter.hueMin, jitter.hueMax) + 360) % 360,
        s: clamp(base.s + random(jitter.satDeltaMin, jitter.satDeltaMax), jitter.satClampMin, jitter.satClampMax),
        l: clamp(
          base.l + random(jitter.lightDeltaMin, jitter.lightDeltaMax),
          jitter.lightClampMin,
          jitter.lightClampMax
        )
      };
    }
    drawOrganicPetalPath(context, petal) {
      const shape = this.tuning.organicShape;
      const topRadius = petal.ry * random(shape.topRadiusMin, shape.topRadiusMax);
      const bottomRadius = petal.ry * random(shape.bottomRadiusMin, shape.bottomRadiusMax);
      const rightWidth = petal.rx * random(shape.rightWidthMin, shape.rightWidthMax);
      const leftWidth = petal.rx * random(shape.leftWidthMin, shape.leftWidthMax);
      const waist = petal.rx * random(shape.waistMin, shape.waistMax);
      const asymmetry = random(-petal.rx * shape.asymmetryScale, petal.rx * shape.asymmetryScale);
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
      context.bezierCurveTo(waist * 0.3, bottomRadius * 1.12, -waist * 0.3, bottomRadius * 1.12, -waist, bottomRadius);
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
    createClusterSprite(coreRadius, petals, coreColor) {
      const spriteTuning = this.tuning.bloomSprite;
      const size = Math.ceil(coreRadius * spriteTuning.sizeScale + spriteTuning.sizePadding);
      const sprite = document.createElement("canvas");
      sprite.width = size;
      sprite.height = size;
      const sctx = sprite.getContext("2d", { alpha: true });
      const cx = size * 0.5;
      const cy = size * 0.5;
      sctx.save();
      sctx.translate(cx, cy);
      sctx.globalCompositeOperation = "screen";
      const cloudRadius = coreRadius * spriteTuning.cloudRadiusScale;
      const cloud = sctx.createRadialGradient(0, 0, 0, 0, 0, cloudRadius);
      cloud.addColorStop(0, hsla(coreColor, spriteTuning.cloudAlphaInner));
      cloud.addColorStop(0.55, hsla(coreColor, spriteTuning.cloudAlphaMid));
      cloud.addColorStop(1, hsla(coreColor, 0));
      sctx.fillStyle = cloud;
      sctx.beginPath();
      sctx.arc(0, 0, cloudRadius, 0, Math.PI * 2);
      sctx.fill();
      for (let i = 0; i < spriteTuning.puffCount; i += 1) {
        const puffColor = this.pickColor();
        const puffRadius = coreRadius * random(spriteTuning.puffRadiusMinScale, spriteTuning.puffRadiusMaxScale);
        const puffX = Math.cos(Math.PI * 2 * i / spriteTuning.puffCount + random(-0.6, 0.6)) * coreRadius * random(spriteTuning.puffPositionMinScale, spriteTuning.puffPositionMaxScale);
        const puffY = Math.sin(Math.PI * 2 * i / spriteTuning.puffCount + random(-0.6, 0.6)) * coreRadius * random(spriteTuning.puffPositionMinScale, spriteTuning.puffPositionMaxScale);
        const puff = sctx.createRadialGradient(puffX, puffY, 0, puffX, puffY, puffRadius);
        puff.addColorStop(0, hsla(puffColor, spriteTuning.puffAlphaInner));
        puff.addColorStop(0.65, hsla(puffColor, spriteTuning.puffAlphaMid));
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
        gradient.addColorStop(0, hsla(petal.color, spriteTuning.petalAlphaInner));
        gradient.addColorStop(0.58, hsla(petal.color, spriteTuning.petalAlphaMid));
        gradient.addColorStop(1, hsla(petal.color, 0));
        sctx.fillStyle = gradient;
        this.drawOrganicPetalPath(sctx, petal);
        sctx.fill();
        const haze = sctx.createRadialGradient(0, 0, petal.ry * 0.2, 0, 0, petal.rx * 1.7);
        haze.addColorStop(0, hsla(petal.color, spriteTuning.petalHazeAlphaInner));
        haze.addColorStop(0.6, hsla(petal.color, spriteTuning.petalHazeAlphaMid));
        haze.addColorStop(1, hsla(petal.color, 0));
        sctx.fillStyle = haze;
        this.drawOrganicPetalPath(sctx, petal);
        sctx.fill();
        sctx.restore();
      }
      const coreGradientRadius = coreRadius * spriteTuning.coreRadiusScale;
      const core = sctx.createRadialGradient(0, 0, 0, 0, 0, coreGradientRadius);
      core.addColorStop(0, hsla(coreColor, spriteTuning.coreAlphaInner));
      core.addColorStop(0.72, hsla(coreColor, spriteTuning.coreAlphaMid));
      core.addColorStop(1, hsla(coreColor, 0));
      sctx.fillStyle = core;
      sctx.beginPath();
      sctx.arc(0, 0, coreGradientRadius, 0, Math.PI * 2);
      sctx.fill();
      sctx.restore();
      return sprite;
    }
    createCluster(x, y) {
      const spawn = this.tuning.bloomSpawn;
      const petals = [];
      const petalCount = Math.floor(random(spawn.petalCountMin, spawn.petalCountMax));
      const coreRadius = random(spawn.coreRadiusMin, spawn.coreRadiusMax);
      for (let i = 0; i < petalCount; i += 1) {
        const step = Math.PI * 2 * i / petalCount;
        petals.push({
          angle: step + random(-0.24, 0.24),
          distance: random(coreRadius * spawn.distanceMinScale, coreRadius * spawn.distanceMaxScale),
          rx: random(spawn.petalRxMin, spawn.petalRxMax),
          ry: random(spawn.petalRyMin, spawn.petalRyMax),
          tilt: random(spawn.tiltMin, spawn.tiltMax),
          color: this.pickColor()
        });
      }
      const coreColor = this.pickColor();
      const sprite = this.createClusterSprite(coreRadius, petals, coreColor);
      const vanishX = this.viewport.width * 0.5 + random(-this.viewport.width * spawn.vanishJitterRatio, this.viewport.width * spawn.vanishJitterRatio);
      const vanishY = this.viewport.height * 0.5 + random(-this.viewport.height * spawn.vanishJitterRatio, this.viewport.height * spawn.vanishJitterRatio);
      const toVanishX = vanishX - x;
      const toVanishY = vanishY - y;
      const toVanishLength = Math.hypot(toVanishX, toVanishY) || 1;
      return {
        x,
        y,
        age: 0,
        life: this.baseConfig.lifeMs,
        fadeStart: this.baseConfig.fadeStartMs,
        driftX: random(spawn.driftXMin, spawn.driftXMax),
        driftY: random(spawn.driftYMin, spawn.driftYMax),
        swirl: random(spawn.swirlMin, spawn.swirlMax),
        rotation: random(0, Math.PI * 2),
        seed: Math.random() * 999,
        depthDirX: toVanishX / toVanishLength,
        depthDirY: toVanishY / toVanishLength,
        depthTravel: random(spawn.depthTravelMin, spawn.depthTravelMax),
        sprite,
        spriteSize: sprite.width,
        depth: 0
      };
    }
    drawCluster(ctx, cluster) {
      const dynamics = this.tuning.bloomDynamics;
      const fadeWindow = cluster.life - cluster.fadeStart;
      const fadeProgress = fadeWindow <= 0 ? 1 : clamp((cluster.age - cluster.fadeStart) / fadeWindow, 0, 1);
      const phase = cluster.depth;
      const depthEase = phase * phase;
      const emergence = clamp(phase / dynamics.emergencePhase, 0, 1);
      const alpha = clamp(
        (1 - fadeProgress) * (dynamics.alphaBase - depthEase * dynamics.alphaDepthDecay) * emergence,
        0,
        1
      );
      const focusGain = Math.exp(-Math.pow((phase - dynamics.focusCenter) / dynamics.focusWidth, 2));
      const depthScale = dynamics.scaleBase + depthEase * dynamics.scaleDepthGain + focusGain * dynamics.scaleFocusGain;
      const wanderRadius = dynamics.wanderBase + depthEase * dynamics.wanderDepthGain;
      const depthOffset = depthEase * cluster.depthTravel;
      const originX = cluster.x + cluster.depthDirX * depthOffset + Math.sin(cluster.seed + cluster.age * dynamics.xWaveSpeed) * wanderRadius;
      const originY = cluster.y + cluster.depthDirY * depthOffset + Math.cos(cluster.seed * dynamics.yWaveSeedScale + cluster.age * dynamics.yWaveSpeed) * wanderRadius;
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
        const focusPivot = dynamics.focusPivot;
        blur = phase <= focusPivot ? lerp(dynamics.blurStart, dynamics.blurPeakMin, phase / focusPivot) : lerp(dynamics.blurPeakMin, dynamics.blurEnd, (phase - focusPivot) / (1 - focusPivot));
        saturation = clamp(
          dynamics.saturationBase + focusGain * dynamics.saturationFocusGain - phase * dynamics.saturationDepthDecay,
          dynamics.saturationMin,
          dynamics.saturationMax
        );
        brightness = clamp(
          dynamics.brightnessBase + focusGain * dynamics.brightnessFocusGain - phase * dynamics.brightnessDepthDecay,
          dynamics.brightnessMin,
          dynamics.brightnessMax
        );
        ctx.filter = `blur(${blur}px) saturate(${saturation}) brightness(${brightness})`;
      }
      const size = cluster.spriteSize;
      ctx.drawImage(cluster.sprite, -size * 0.5, -size * 0.5);
      if ("filter" in ctx) {
        const hazeBlur = blur + dynamics.hazeBlurOffset;
        const hazeSaturation = Math.max(dynamics.hazeSaturationMin, saturation * dynamics.hazeSaturationScale);
        const hazeBrightness = Math.max(dynamics.hazeBrightnessMin, brightness * dynamics.hazeBrightnessScale);
        ctx.globalAlpha = alpha * dynamics.hazeAlphaScale;
        ctx.filter = `blur(${hazeBlur}px) saturate(${hazeSaturation}) brightness(${hazeBrightness})`;
        ctx.drawImage(cluster.sprite, -size * 0.5, -size * 0.5);
        ctx.filter = "none";
      }
      ctx.restore();
    }
    drawStalkerGlow(ctx) {
      if (!this.state.started) {
        return;
      }
      const glowTuning = this.tuning.stalkerGlow;
      const glow = ctx.createRadialGradient(
        this.stalker.x,
        this.stalker.y,
        0,
        this.stalker.x,
        this.stalker.y,
        glowTuning.radius
      );
      glow.addColorStop(0, `rgba(255, 180, 96, ${glowTuning.alphaInner})`);
      glow.addColorStop(glowTuning.stopMid, `rgba(255, 132, 48, ${glowTuning.alphaMid})`);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.stalker.x, this.stalker.y, glowTuning.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  function createStalkerLayer(options) {
    return new StalkerLayer(options);
  }
  function bootstrap() {
    const canvas = document.getElementById("scene");
    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      return;
    }
    const background = createBackgroundLayer();
    const stalker = createStalkerLayer();
    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      background.resize(window.innerWidth, window.innerHeight);
      stalker.resize(window.innerWidth, window.innerHeight);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      background.draw(ctx);
    }
    stalker.attach(canvas);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("beforeunload", () => {
      stalker.dispose();
    });
    resizeCanvas();
    function animate(now) {
      stalker.update(now);
      stalker.drawTrail(ctx);
      background.draw(ctx);
      stalker.draw(ctx);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
