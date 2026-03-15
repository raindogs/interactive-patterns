(function() {
  "use strict";
  function createCoverRect(width, height, imageWidth, imageHeight) {
    const imageRatio = imageWidth / imageHeight;
    const viewportRatio = width / height;
    if (imageRatio > viewportRatio) {
      const drawHeight2 = height;
      const drawWidth2 = drawHeight2 * imageRatio;
      return {
        x: (width - drawWidth2) * 0.5,
        y: 0,
        width: drawWidth2,
        height: drawHeight2
      };
    }
    const drawWidth = width;
    const drawHeight = drawWidth / imageRatio;
    return {
      x: 0,
      y: (height - drawHeight) * 0.5,
      width: drawWidth,
      height: drawHeight
    };
  }
  function createBackgroundSystem({ viewState, body = document.body }) {
    const state = {
      width: 0,
      height: 0,
      image: new Image(),
      imageLoaded: false,
      coverRect: { x: 0, y: 0, width: 0, height: 0 }
    };
    state.image.decoding = "async";
    function applyDocumentState() {
      body.dataset.mode = viewState.mode;
      body.dataset.maskTexture = String(viewState.selectedMaskTextureId);
      body.style.setProperty("--mask-background-image", `url("${viewState.selectedMaskTexture.src}")`);
    }
    function refreshCoverRect() {
      if (!state.imageLoaded || !state.width || !state.height) {
        return;
      }
      state.coverRect = createCoverRect(
        state.width,
        state.height,
        state.image.naturalWidth,
        state.image.naturalHeight
      );
    }
    function handleImageLoad() {
      state.imageLoaded = true;
      refreshCoverRect();
    }
    function handleImageError() {
      state.imageLoaded = false;
    }
    function attach() {
      applyDocumentState();
      if (!viewState.isMaskMode) {
        return;
      }
      state.image.addEventListener("load", handleImageLoad);
      state.image.addEventListener("error", handleImageError);
      state.image.src = viewState.selectedMaskTexture.src;
    }
    function resize(width, height) {
      state.width = width;
      state.height = height;
      refreshCoverRect();
    }
    function isMaskReady() {
      return state.imageLoaded;
    }
    function drawMaskedCircle(ctx, drawPath, transform) {
      if (!state.imageLoaded) {
        return;
      }
      ctx.save();
      drawPath();
      ctx.clip();
      if ((transform == null ? void 0 : transform.zoom) && transform.zoom !== 1) {
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.zoom, transform.zoom);
        ctx.translate(-transform.x, -transform.y);
      }
      const { x, y, width, height } = state.coverRect;
      ctx.drawImage(state.image, x, y, width, height);
      ctx.restore();
    }
    function destroy() {
      state.image.removeEventListener("load", handleImageLoad);
      state.image.removeEventListener("error", handleImageError);
    }
    return {
      attach,
      resize,
      isMaskReady,
      drawMaskedCircle,
      destroy
    };
  }
  function clamp$2(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function createCircle(id, x, y, radius, segmentCount) {
    return {
      id,
      baseX: x,
      baseY: y,
      x,
      y,
      vx: 0,
      vy: 0,
      scale: 1,
      scaleVelocity: 0,
      targetScale: 1,
      compression: 0,
      inflation: 0,
      elasticInfluence: 0,
      tone: 0,
      toneTarget: 0,
      snapCooldown: 0,
      rimOffset: new Float32Array(segmentCount),
      rimVelocity: new Float32Array(segmentCount),
      radius
    };
  }
  function chooseRadius(width, height, config) {
    if (typeof config.fixedRadius === "number") {
      return config.fixedRadius;
    }
    const shortest = Math.min(width, height);
    const rawRadius = shortest * config.baseRadiusRatio;
    const responsiveScale = width < 720 ? config.mobileRadiusScale : 1;
    return clamp$2(rawRadius * responsiveScale, config.minRadius, config.maxRadius);
  }
  function buildNeighbors(circles, radius, neighborDistanceScale) {
    const neighbors = new Array(circles.length);
    const threshold = radius * neighborDistanceScale;
    const thresholdSq = threshold * threshold;
    for (let i = 0; i < circles.length; i += 1) {
      neighbors[i] = [];
    }
    for (let i = 0; i < circles.length; i += 1) {
      const circleA = circles[i];
      for (let j = i + 1; j < circles.length; j += 1) {
        const circleB = circles[j];
        const dx = circleB.baseX - circleA.baseX;
        const dy = circleB.baseY - circleA.baseY;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq > thresholdSq) {
          continue;
        }
        neighbors[i].push(j);
        neighbors[j].push(i);
      }
    }
    return neighbors;
  }
  function buildCircleField({ width, height, config, segmentCount }) {
    const radius = chooseRadius(width, height, config);
    const circles = [];
    let stepX = radius * 2 + config.circleGap;
    let stepY = Math.sqrt(3) * radius;
    if (config.circleGap > 0) {
      stepY = Math.sqrt(3) * 0.5 * stepX;
    }
    let row = 0;
    let id = 0;
    for (let y = -radius; y <= height + radius; y += stepY) {
      const xShift = row % 2 === 0 ? 0 : radius;
      for (let x = -radius + xShift; x <= width + radius; x += stepX) {
        circles.push(createCircle(id, x, y, radius, segmentCount));
        id += 1;
      }
      row += 1;
    }
    return {
      radius,
      circles,
      neighbors: buildNeighbors(circles, radius, config.neighborDistanceScale)
    };
  }
  const ELASTIC_GEOMETRY = Object.freeze({
    tau: Math.PI * 2,
    segmentCount: 28
  });
  const BASE_TUNING = Object.freeze({
    frameIntervalMs: 16.67,
    frameDtMinMs: 8,
    frameDtMaxMs: 34,
    toneVisibilityThreshold: 1e-3,
    pointerIdleThreshold: 0.015,
    pointerIdleWindowMs: 80,
    pointerMomentumDivisor: 35,
    pointerDecayActive: 0.94,
    pointerDecayIdle: 0.86,
    centerSpring: 0.032,
    centerDamping: 0.82,
    scaleSpring: 0.087,
    scaleDamping: 0.78,
    rimSpring: 0.24,
    rimSmooth: 0.18,
    rimDamping: 0.74,
    rimImpulseSpread: 3,
    rimInflationRatio: 0.45,
    rimRadiusMinScale: 0.5,
    rimRadiusMaxScale: 1.9,
    baseRadiusRatio: 0.038,
    minRadius: 24,
    maxRadius: 60,
    mobileRadiusScale: 0.86,
    fixedRadius: null,
    circleGap: 0,
    minScale: 0.62,
    maxScale: 2.46,
    hoverRangeScale: 2.15,
    hoverBoostBase: 1.12,
    hoverBoostOffset: 0.72,
    hoverMomentumGain: 1.7,
    compressionToScale: 0.28,
    compressionMaxScaleLoss: 0.42,
    neighborDistanceScale: 2.28,
    collisionImpulseScale: 0.12,
    collisionElasticBase: 0.2,
    collisionElasticGain: 0.8,
    edgeBandScale: 0.38,
    edgeImpulseBase: 0.65,
    edgeImpulseMomentumGain: 2.1,
    snapThresholdScale: 0.24,
    snapThresholdMomentumGain: 0.08,
    snapReleaseBase: 1.45,
    snapReleaseMomentumGain: 3.2,
    snapLaunchBase: 1.4,
    snapLaunchMomentumGain: 4.8,
    snapScaleVelocityGain: 0.09,
    snapScaleVelocityBase: 1,
    snapCooldown: 16,
    snapSpread: 4,
    snapSpreadDivisor: 5,
    maxRimPullScale: 0.42,
    maxRimPushScale: -0.24,
    attractRangeScale: 5.8,
    attractBase: 0.22,
    attractMomentumGain: 0.5,
    elasticFalloffRangeScale: 9.2,
    minElasticInfluence: 0.07,
    farSpringBoost: 1.75,
    farDampingBoost: 0.11,
    centerDampingClampMin: 0.62,
    centerDampingClampMax: 0.95,
    gradationMaxGray: 221,
    gradationEase: 0.06,
    gradationInfluenceGate: 0.08,
    gradationPropagationGain: 0.95,
    gradationToneBase: 0.9,
    gradationToneMomentumGain: 0.35,
    maskZoomGain: 0.92,
    maskInflationZoomGain: 0.26,
    maskInfluenceZoomGain: 0.34,
    maskNeighborScaleGain: 0.24,
    maskInfluenceGate: 0.08
  });
  const REDUCED_MOTION_OVERRIDES = Object.freeze({
    centerSpring: 0.046,
    centerDamping: 0.78,
    scaleSpring: 0.11,
    scaleDamping: 0.72,
    rimSpring: 0.3,
    rimSmooth: 0.22,
    rimDamping: 0.68,
    baseRadiusRatio: 0.042,
    hoverBoostBase: 0.76,
    hoverMomentumGain: 1.2,
    attractBase: 0.16,
    attractMomentumGain: 0.28,
    gradationEase: 0.09
  });
  const MODE_TUNING = Object.freeze({
    normal: Object.freeze({
      fixedRadius: null,
      circleGap: 0
    }),
    gradation: Object.freeze({
      fixedRadius: null,
      circleGap: 0
    }),
    fine: Object.freeze({
      fixedRadius: 10,
      circleGap: 8
    }),
    mask: Object.freeze({
      fixedRadius: null,
      circleGap: 0
    })
  });
  function createElasticConfig({ mode, reducedMotion }) {
    return {
      ...BASE_TUNING,
      ...reducedMotion ? REDUCED_MOTION_OVERRIDES : {},
      ...MODE_TUNING[mode] ?? MODE_TUNING.normal
    };
  }
  function clamp$1(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  const COS_TABLE = new Float32Array(ELASTIC_GEOMETRY.segmentCount);
  const SIN_TABLE = new Float32Array(ELASTIC_GEOMETRY.segmentCount);
  for (let i = 0; i < ELASTIC_GEOMETRY.segmentCount; i += 1) {
    const angle = i / ELASTIC_GEOMETRY.segmentCount * ELASTIC_GEOMETRY.tau;
    COS_TABLE[i] = Math.cos(angle);
    SIN_TABLE[i] = Math.sin(angle);
  }
  function createElasticRenderer({ ctx, mode, config, backgroundSystem }) {
    function traceCirclePath(circle, baseRadius) {
      ctx.beginPath();
      for (let i = 0; i < ELASTIC_GEOMETRY.segmentCount; i += 1) {
        const radial = clamp$1(
          baseRadius + circle.rimOffset[i],
          baseRadius * config.rimRadiusMinScale,
          baseRadius * config.rimRadiusMaxScale
        );
        const x = circle.x + COS_TABLE[i] * radial;
        const y = circle.y + SIN_TABLE[i] * radial;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
    }
    function drawSolidCircle(circle, radius) {
      traceCirclePath(circle, radius * circle.scale);
      ctx.fill();
    }
    function drawMaskCircle(circle, radius) {
      const inflationRatio = Math.max(0, circle.inflation / Math.max(1, radius));
      const influenceStrength = clamp$1(
        (circle.elasticInfluence - config.minElasticInfluence) / (1 - config.minElasticInfluence),
        0,
        1
      );
      const influenceZoom = influenceStrength > config.maskInfluenceGate ? influenceStrength * config.maskInfluenceZoomGain : 0;
      const zoom = 1 + Math.max(0, circle.scale - 1) * config.maskZoomGain + inflationRatio * config.maskInflationZoomGain + influenceZoom;
      backgroundSystem.drawMaskedCircle(
        ctx,
        () => {
          traceCirclePath(circle, radius * circle.scale);
        },
        { x: circle.x, y: circle.y, zoom }
      );
    }
    function renderNormal({ width, height, circles, radius }) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#000";
      for (let i = 0; i < circles.length; i += 1) {
        drawSolidCircle(circles[i], radius);
      }
    }
    function renderGradation({ width, height, circles, radius }) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      let activeShade = "";
      for (let i = 0; i < circles.length; i += 1) {
        const circle = circles[i];
        if (circle.tone <= config.toneVisibilityThreshold) {
          continue;
        }
        const gray = Math.round(255 - circle.tone * (255 - config.gradationMaxGray));
        const shade = `rgb(${gray}, ${gray}, ${gray})`;
        if (shade !== activeShade) {
          ctx.fillStyle = shade;
          activeShade = shade;
        }
        drawSolidCircle(circle, radius);
      }
    }
    function renderMask({ width, height, circles, radius }) {
      ctx.clearRect(0, 0, width, height);
      if (!backgroundSystem.isMaskReady()) {
        return;
      }
      for (let i = 0; i < circles.length; i += 1) {
        drawMaskCircle(circles[i], radius);
      }
    }
    function render(fieldState) {
      if (mode === "mask") {
        renderMask(fieldState);
        return;
      }
      if (mode === "gradation") {
        renderGradation(fieldState);
        return;
      }
      renderNormal(fieldState);
    }
    return {
      render
    };
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function powDamping(base, dt) {
    return Math.pow(base, dt);
  }
  function angleToIndex(angle) {
    const normalized = angle < 0 ? angle + ELASTIC_GEOMETRY.tau : angle;
    return Math.round(normalized / ELASTIC_GEOMETRY.tau * (ELASTIC_GEOMETRY.segmentCount - 1)) % ELASTIC_GEOMETRY.segmentCount;
  }
  function createElasticField({ canvas, ctx, viewState, interactionState, backgroundSystem }) {
    if (!(canvas instanceof HTMLCanvasElement) || !ctx || !viewState || !backgroundSystem) {
      throw new Error("createElasticField requires canvas, ctx, viewState, and backgroundSystem.");
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const config = createElasticConfig({ mode: viewState.mode, reducedMotion });
    const renderer = createElasticRenderer({
      ctx,
      mode: viewState.mode,
      config,
      backgroundSystem
    });
    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      radius: 18,
      circles: [],
      neighbors: [],
      lastFrame: performance.now()
    };
    const pointer = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      momentum: 0,
      lastMove: 0,
      initialized: false,
      active: false
    };
    const removers = [];
    let frameHandle = 0;
    function addListener(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      removers.push(() => target.removeEventListener(type, handler, options));
    }
    function getCurrentMaxScale() {
      return config.maxScale * ((interactionState == null ? void 0 : interactionState.hoverBoostMultiplier) ?? 1);
    }
    function rebuildField() {
      const field = buildCircleField({
        width: state.width,
        height: state.height,
        config,
        segmentCount: ELASTIC_GEOMETRY.segmentCount
      });
      state.radius = field.radius;
      state.circles = field.circles;
      state.neighbors = field.neighbors;
    }
    function resize() {
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(state.width * state.dpr);
      canvas.height = Math.round(state.height * state.dpr);
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      backgroundSystem.resize(state.width, state.height);
      rebuildField();
      if (!pointer.initialized) {
        pointer.x = state.width * 0.5;
        pointer.y = state.height * 0.5;
        pointer.initialized = true;
        pointer.lastMove = performance.now();
      }
    }
    function updatePointerPosition(clientX, clientY, now) {
      if (!pointer.initialized) {
        pointer.x = clientX;
        pointer.y = clientY;
        pointer.initialized = true;
        pointer.lastMove = now;
        pointer.active = true;
        return;
      }
      const dtMs = pointer.lastMove > 0 ? Math.max(config.frameDtMinMs, now - pointer.lastMove) : config.frameIntervalMs;
      const vx = (clientX - pointer.x) / dtMs * config.frameIntervalMs;
      const vy = (clientY - pointer.y) / dtMs * config.frameIntervalMs;
      pointer.x = clientX;
      pointer.y = clientY;
      pointer.vx = vx;
      pointer.vy = vy;
      pointer.speed = Math.hypot(vx, vy);
      pointer.momentum = clamp(pointer.speed / config.pointerMomentumDivisor, 0, 1);
      pointer.lastMove = now;
      pointer.active = true;
    }
    function computeRimInflation(circle) {
      let positiveOffset = 0;
      for (let i = 0; i < ELASTIC_GEOMETRY.segmentCount; i += 1) {
        positiveOffset += Math.max(0, circle.rimOffset[i]);
      }
      circle.inflation = positiveOffset / ELASTIC_GEOMETRY.segmentCount * config.rimInflationRatio;
    }
    function applyRimImpulse(circle, angle, strength) {
      const centerIndex = angleToIndex(angle);
      for (let offset = -config.rimImpulseSpread; offset <= config.rimImpulseSpread; offset += 1) {
        const idx = (centerIndex + offset + ELASTIC_GEOMETRY.segmentCount) % ELASTIC_GEOMETRY.segmentCount;
        const weight = Math.max(0, 1 - Math.abs(offset) / (config.rimImpulseSpread + 1));
        circle.rimVelocity[idx] += strength * weight;
      }
    }
    function triggerSnap(circle, angle, distanceToPointer) {
      const centerIndex = angleToIndex(angle);
      const release = config.snapReleaseBase + pointer.momentum * config.snapReleaseMomentumGain;
      for (let offset = -config.snapSpread; offset <= config.snapSpread; offset += 1) {
        const idx = (centerIndex + offset + ELASTIC_GEOMETRY.segmentCount) % ELASTIC_GEOMETRY.segmentCount;
        const weight = Math.max(0, 1 - Math.abs(offset) / config.snapSpreadDivisor);
        circle.rimVelocity[idx] -= release * weight;
      }
      const invDistance = distanceToPointer > 1e-5 ? 1 / distanceToPointer : 0;
      const awayX = distanceToPointer > 1e-5 ? (circle.x - pointer.x) * invDistance : Math.cos(angle + Math.PI);
      const awayY = distanceToPointer > 1e-5 ? (circle.y - pointer.y) * invDistance : Math.sin(angle + Math.PI);
      const launch = config.snapLaunchBase + pointer.momentum * config.snapLaunchMomentumGain;
      circle.vx += awayX * launch;
      circle.vy += awayY * launch;
      circle.scaleVelocity -= config.snapScaleVelocityGain * (config.snapScaleVelocityBase + pointer.momentum);
      circle.snapCooldown = config.snapCooldown;
    }
    function updateRim(circle, dt) {
      const minOffset = state.radius * config.maxRimPushScale;
      const maxOffset = state.radius * config.maxRimPullScale;
      for (let i = 0; i < ELASTIC_GEOMETRY.segmentCount; i += 1) {
        const prev = circle.rimOffset[(i - 1 + ELASTIC_GEOMETRY.segmentCount) % ELASTIC_GEOMETRY.segmentCount];
        const next = circle.rimOffset[(i + 1) % ELASTIC_GEOMETRY.segmentCount];
        const offset = circle.rimOffset[i];
        const smoothForce = ((prev + next) * 0.5 - offset) * config.rimSmooth;
        const springForce = -offset * config.rimSpring;
        circle.rimVelocity[i] += (smoothForce + springForce) * dt;
        circle.rimVelocity[i] *= powDamping(config.rimDamping, dt);
        circle.rimOffset[i] += circle.rimVelocity[i] * dt;
        if (circle.rimOffset[i] < minOffset) {
          circle.rimOffset[i] = minOffset;
          circle.rimVelocity[i] *= 0.5;
        } else if (circle.rimOffset[i] > maxOffset) {
          circle.rimOffset[i] = maxOffset;
          circle.rimVelocity[i] *= 0.5;
        }
      }
    }
    function applyPointerInfluence(dt) {
      const circles = state.circles;
      for (let i = 0; i < circles.length; i += 1) {
        const circle = circles[i];
        circle.targetScale = 1;
        circle.compression = 0;
        circle.elasticInfluence = config.minElasticInfluence;
        circle.toneTarget = 0;
        computeRimInflation(circle);
      }
      if (!pointer.initialized) {
        return;
      }
      if (!pointer.active && pointer.momentum < config.pointerIdleThreshold) {
        return;
      }
      let hoveredIndex = -1;
      let minDistSq = Infinity;
      for (let i = 0; i < circles.length; i += 1) {
        const circle = circles[i];
        const dx = pointer.x - circle.x;
        const dy = pointer.y - circle.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          hoveredIndex = i;
        }
      }
      if (hoveredIndex === -1) {
        return;
      }
      const hoveredCircle = circles[hoveredIndex];
      const distanceToPointer = Math.sqrt(minDistSq);
      const hoverRange = state.radius * config.hoverRangeScale;
      const falloffRange = state.radius * config.elasticFalloffRangeScale;
      const attractRange = state.radius * config.attractRangeScale;
      const hoverStrength = distanceToPointer < hoverRange ? 1 - distanceToPointer / hoverRange : 0;
      let sourceTone = 0;
      for (let i = 0; i < circles.length; i += 1) {
        const node = circles[i];
        const fromHoveredX = node.x - hoveredCircle.x;
        const fromHoveredY = node.y - hoveredCircle.y;
        const distanceFromHovered = Math.hypot(fromHoveredX, fromHoveredY);
        const distanceWeight = clamp(1 - distanceFromHovered / falloffRange, 0, 1);
        node.elasticInfluence = Math.max(config.minElasticInfluence, distanceWeight);
        const influenceStrength = clamp(
          (node.elasticInfluence - config.minElasticInfluence) / (1 - config.minElasticInfluence),
          0,
          1
        );
        if (viewState.isMaskMode && i !== hoveredIndex && hoverStrength > 0 && influenceStrength > config.maskInfluenceGate) {
          const neighborBoost = hoverStrength * influenceStrength * config.maskNeighborScaleGain;
          node.targetScale = Math.max(node.targetScale, 1 + neighborBoost);
        }
        const toPointerX = pointer.x - node.x;
        const toPointerY = pointer.y - node.y;
        const distanceToNodePointer = Math.hypot(toPointerX, toPointerY);
        if (distanceToNodePointer <= 1e-5 || distanceToNodePointer >= attractRange) {
          continue;
        }
        const nx = toPointerX / distanceToNodePointer;
        const ny = toPointerY / distanceToNodePointer;
        const attractWeight = 1 - distanceToNodePointer / attractRange;
        const pullStrength = attractWeight * attractWeight * node.elasticInfluence * (config.attractBase + pointer.momentum * config.attractMomentumGain) * dt;
        node.vx += nx * pullStrength;
        node.vy += ny * pullStrength;
      }
      if (distanceToPointer < hoverRange) {
        const hoverRatio = 1 - distanceToPointer / hoverRange;
        const hoverBoost = hoverRatio * hoverRatio * config.hoverBoostBase * (config.hoverBoostOffset + pointer.momentum * config.hoverMomentumGain) * ((interactionState == null ? void 0 : interactionState.hoverBoostMultiplier) ?? 1);
        hoveredCircle.targetScale = clamp(1 + hoverBoost, config.minScale, getCurrentMaxScale());
        if (viewState.isGradationMode) {
          sourceTone = clamp(
            hoverRatio * (config.gradationToneBase + pointer.momentum * config.gradationToneMomentumGain),
            0,
            1
          );
          hoveredCircle.toneTarget = Math.max(hoveredCircle.toneTarget, sourceTone);
        }
      }
      if (viewState.isGradationMode && sourceTone > 0) {
        for (let i = 0; i < circles.length; i += 1) {
          if (i === hoveredIndex) {
            continue;
          }
          const node = circles[i];
          const dx = node.x - hoveredCircle.x;
          const dy = node.y - hoveredCircle.y;
          const distance = Math.hypot(dx, dy);
          if (distance >= falloffRange) {
            continue;
          }
          const influenceStrength = clamp(
            (node.elasticInfluence - config.minElasticInfluence) / (1 - config.minElasticInfluence),
            0,
            1
          );
          if (influenceStrength <= config.gradationInfluenceGate) {
            continue;
          }
          node.toneTarget = Math.max(node.toneTarget, sourceTone * influenceStrength * config.gradationPropagationGain);
        }
      }
      const radiusNow = state.radius * hoveredCircle.scale;
      const rimDistance = Math.abs(distanceToPointer - radiusNow);
      const edgeBand = state.radius * config.edgeBandScale;
      if (rimDistance >= edgeBand) {
        return;
      }
      const edgeInfluence = 1 - rimDistance / edgeBand;
      const angle = Math.atan2(pointer.y - hoveredCircle.y, pointer.x - hoveredCircle.x);
      const impulse = edgeInfluence * (config.edgeImpulseBase + pointer.momentum * config.edgeImpulseMomentumGain) * dt;
      applyRimImpulse(hoveredCircle, angle, impulse);
      const stretchIndex = angleToIndex(angle);
      const stretchThreshold = state.radius * (config.snapThresholdScale + pointer.momentum * config.snapThresholdMomentumGain);
      if (hoveredCircle.rimOffset[stretchIndex] > stretchThreshold && hoveredCircle.snapCooldown <= 0) {
        triggerSnap(hoveredCircle, angle, distanceToPointer);
      }
    }
    function resolveCollisions() {
      const circles = state.circles;
      for (let i = 0; i < circles.length; i += 1) {
        const circleA = circles[i];
        const linked = state.neighbors[i];
        for (let n = 0; n < linked.length; n += 1) {
          const j = linked[n];
          if (j <= i) {
            continue;
          }
          const circleB = circles[j];
          const dx = circleB.x - circleA.x;
          const dy = circleB.y - circleA.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 1e-8) {
            continue;
          }
          const dist = Math.sqrt(distSq);
          const radiusA = state.radius * circleA.scale + circleA.inflation;
          const radiusB = state.radius * circleB.scale + circleB.inflation;
          const minDist = radiusA + radiusB;
          if (dist >= minDist) {
            continue;
          }
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const correction = overlap * 0.5;
          const elasticMix = config.collisionElasticBase + (circleA.elasticInfluence + circleB.elasticInfluence) * 0.5 * config.collisionElasticGain;
          const impulse = overlap * config.collisionImpulseScale * elasticMix;
          circleA.x -= nx * correction;
          circleA.y -= ny * correction;
          circleB.x += nx * correction;
          circleB.y += ny * correction;
          circleA.vx -= nx * impulse;
          circleA.vy -= ny * impulse;
          circleB.vx += nx * impulse;
          circleB.vy += ny * impulse;
          const compressionAmount = overlap / Math.max(minDist, 1) * elasticMix;
          circleA.compression += compressionAmount;
          circleB.compression += compressionAmount;
        }
      }
    }
    function integrate(dt) {
      const circles = state.circles;
      for (let i = 0; i < circles.length; i += 1) {
        const circle = circles[i];
        const maxScale = getCurrentMaxScale();
        const compressionShrink = clamp(
          circle.compression * config.compressionToScale,
          0,
          config.compressionMaxScaleLoss
        );
        circle.targetScale = clamp(circle.targetScale - compressionShrink, config.minScale, maxScale);
        const centerSpring = config.centerSpring * (1 + (1 - circle.elasticInfluence) * config.farSpringBoost);
        const centerDamping = clamp(
          config.centerDamping - (1 - circle.elasticInfluence) * config.farDampingBoost,
          config.centerDampingClampMin,
          config.centerDampingClampMax
        );
        circle.vx += (circle.baseX - circle.x) * centerSpring * dt;
        circle.vy += (circle.baseY - circle.y) * centerSpring * dt;
        circle.vx *= powDamping(centerDamping, dt);
        circle.vy *= powDamping(centerDamping, dt);
        circle.x += circle.vx * dt;
        circle.y += circle.vy * dt;
        circle.scaleVelocity += (circle.targetScale - circle.scale) * config.scaleSpring * dt;
        circle.scaleVelocity *= powDamping(config.scaleDamping, dt);
        circle.scale += circle.scaleVelocity * dt;
        circle.scale = clamp(circle.scale, config.minScale, maxScale);
        if (circle.snapCooldown > 0) {
          circle.snapCooldown -= dt;
        }
        updateRim(circle, dt);
        circle.tone += (circle.toneTarget - circle.tone) * config.gradationEase * dt;
        circle.tone = clamp(circle.tone, 0, 1);
      }
    }
    function render() {
      renderer.render(state);
    }
    function tick(now) {
      const dtMs = Math.min(config.frameDtMaxMs, Math.max(config.frameDtMinMs, now - state.lastFrame));
      const dt = dtMs / config.frameIntervalMs;
      state.lastFrame = now;
      const idleMs = now - pointer.lastMove;
      const decayBase = pointer.active && idleMs < config.pointerIdleWindowMs ? config.pointerDecayActive : config.pointerDecayIdle;
      pointer.momentum *= powDamping(decayBase, dt);
      applyPointerInfluence(dt);
      resolveCollisions();
      integrate(dt);
      render();
      frameHandle = requestAnimationFrame(tick);
    }
    function start() {
      addListener(window, "resize", resize, { passive: true });
      addListener(
        window,
        "pointermove",
        (event) => {
          updatePointerPosition(event.clientX, event.clientY, performance.now());
        },
        { passive: true }
      );
      addListener(
        window,
        "pointerdown",
        (event) => {
          updatePointerPosition(event.clientX, event.clientY, performance.now());
        },
        { passive: true }
      );
      addListener(
        window,
        "pointerleave",
        () => {
          pointer.active = false;
        },
        { passive: true }
      );
      addListener(
        window,
        "pointercancel",
        () => {
          pointer.active = false;
        },
        { passive: true }
      );
      addListener(
        window,
        "blur",
        () => {
          pointer.active = false;
          pointer.momentum = 0;
        },
        { passive: true }
      );
      resize();
      frameHandle = requestAnimationFrame((timestamp) => {
        state.lastFrame = timestamp;
        frameHandle = requestAnimationFrame(tick);
      });
    }
    function destroy() {
      for (let i = removers.length - 1; i >= 0; i -= 1) {
        removers[i]();
      }
      removers.length = 0;
      if (frameHandle) {
        cancelAnimationFrame(frameHandle);
        frameHandle = 0;
      }
    }
    return {
      start,
      destroy
    };
  }
  function setLinkState(link, active) {
    if (active) {
      link.setAttribute("aria-current", "page");
      link.dataset.active = "true";
      return;
    }
    link.removeAttribute("aria-current");
    link.dataset.active = "false";
  }
  function createHudController({ viewState, root = document }) {
    const interactionState = {
      hoverBoostMultiplier: 1
    };
    const removers = [];
    const modeLinks = root.querySelectorAll("[data-mode-link]");
    const maskTextureLinks = root.querySelectorAll("[data-mask-texture]");
    const maskTextureMenu = root.getElementById("mask-texture-menu");
    const hoverBoostToggle = root.getElementById("hover-boost-toggle");
    function syncModeLinks() {
      for (let i = 0; i < modeLinks.length; i += 1) {
        const link = modeLinks[i];
        const key = link.dataset.modeLink;
        if (!key || !viewState.modeRoutes[key]) {
          continue;
        }
        link.href = viewState.modeRoutes[key];
        setLinkState(link, key === viewState.mode);
      }
    }
    function syncMaskTextureMenu() {
      if (maskTextureMenu) {
        maskTextureMenu.hidden = !viewState.isMaskMode;
        maskTextureMenu.style.display = viewState.isMaskMode ? "flex" : "none";
      }
      for (let i = 0; i < maskTextureLinks.length; i += 1) {
        const link = maskTextureLinks[i];
        const textureId = Number.parseInt(link.dataset.maskTexture || "", 10);
        if (!Number.isFinite(textureId)) {
          continue;
        }
        link.href = `${viewState.pathname}?mode=mask&texture=${textureId}`;
        setLinkState(link, viewState.isMaskMode && textureId === viewState.selectedMaskTextureId);
      }
    }
    function bindBoostToggle() {
      if (!(hoverBoostToggle instanceof HTMLInputElement)) {
        return;
      }
      hoverBoostToggle.checked = false;
      const handleChange = () => {
        interactionState.hoverBoostMultiplier = hoverBoostToggle.checked ? 2 : 1;
      };
      hoverBoostToggle.addEventListener("change", handleChange);
      removers.push(() => hoverBoostToggle.removeEventListener("change", handleChange));
    }
    function init() {
      syncModeLinks();
      syncMaskTextureMenu();
      bindBoostToggle();
    }
    function destroy() {
      for (let i = removers.length - 1; i >= 0; i -= 1) {
        removers[i]();
      }
      removers.length = 0;
    }
    init();
    return {
      interactionState,
      destroy
    };
  }
  const MASK_TEXTURES = Object.freeze([
    { id: 1, label: "01", src: "./sources/images/20260311_mask-background_01.jpg" },
    { id: 2, label: "02", src: "./sources/images/20260312_mask-candidate_02.jpg" },
    { id: 3, label: "03", src: "./sources/images/20260312_mask-candidate_03.jpg" }
  ]);
  const MODE_KEYS = Object.freeze(["normal", "gradation", "fine", "mask"]);
  function resolveMode(requestedMode) {
    return MODE_KEYS.includes(requestedMode) ? requestedMode : "normal";
  }
  function resolveTextureId(textureParam) {
    const requestedTextureId = Number.parseInt(textureParam ?? "1", 10);
    if (!Number.isFinite(requestedTextureId)) {
      return 1;
    }
    return Math.min(MASK_TEXTURES.length, Math.max(1, requestedTextureId));
  }
  function buildModeRoutes(pathname, selectedMaskTextureId) {
    return {
      normal: pathname,
      gradation: `${pathname}?mode=gradation`,
      fine: `${pathname}?mode=fine`,
      mask: `${pathname}?mode=mask&texture=${selectedMaskTextureId}`
    };
  }
  function resolveViewState(search, pathname) {
    const searchParams = new URLSearchParams(search);
    const mode = resolveMode(searchParams.get("mode"));
    const selectedMaskTextureId = resolveTextureId(searchParams.get("texture"));
    const selectedMaskTexture = MASK_TEXTURES[selectedMaskTextureId - 1];
    return {
      pathname,
      mode,
      isGradationMode: mode === "gradation",
      isFineMode: mode === "fine",
      isMaskMode: mode === "mask",
      selectedMaskTextureId,
      selectedMaskTexture,
      modeRoutes: buildModeRoutes(pathname, selectedMaskTextureId)
    };
  }
  function bootstrap() {
    const canvas = document.getElementById("scene");
    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const viewState = resolveViewState(window.location.search, window.location.pathname);
    const backgroundSystem = createBackgroundSystem({ viewState });
    const hudController = createHudController({ viewState });
    const elasticField = createElasticField({
      canvas,
      ctx,
      viewState,
      interactionState: hudController.interactionState,
      backgroundSystem
    });
    backgroundSystem.attach();
    elasticField.start();
    window.addEventListener(
      "beforeunload",
      () => {
        elasticField.destroy();
        hudController.destroy();
        backgroundSystem.destroy();
      },
      { once: true }
    );
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
