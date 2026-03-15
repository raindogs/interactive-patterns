import { buildCircleField } from "./circle-field.js";
import { createElasticConfig, ELASTIC_GEOMETRY } from "./elastic-config.js";
import { createElasticRenderer } from "./elastic-renderer.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function powDamping(base, dt) {
  return Math.pow(base, dt);
}

function angleToIndex(angle) {
  const normalized = angle < 0 ? angle + ELASTIC_GEOMETRY.tau : angle;
  return Math.round((normalized / ELASTIC_GEOMETRY.tau) * (ELASTIC_GEOMETRY.segmentCount - 1)) % ELASTIC_GEOMETRY.segmentCount;
}

export function createElasticField({ canvas, ctx, viewState, interactionState, backgroundSystem }) {
  if (!(canvas instanceof HTMLCanvasElement) || !ctx || !viewState || !backgroundSystem) {
    throw new Error("createElasticField requires canvas, ctx, viewState, and backgroundSystem.");
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const config = createElasticConfig({ mode: viewState.mode, reducedMotion });
  const renderer = createElasticRenderer({
    ctx,
    mode: viewState.mode,
    config,
    backgroundSystem,
  });

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    radius: 18,
    circles: [],
    neighbors: [],
    lastFrame: performance.now(),
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
    active: false,
  };

  const removers = [];
  let frameHandle = 0;

  function addListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    removers.push(() => target.removeEventListener(type, handler, options));
  }

  function getCurrentMaxScale() {
    return config.maxScale * (interactionState?.hoverBoostMultiplier ?? 1);
  }

  function rebuildField() {
    const field = buildCircleField({
      width: state.width,
      height: state.height,
      config,
      segmentCount: ELASTIC_GEOMETRY.segmentCount,
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
    const vx = ((clientX - pointer.x) / dtMs) * config.frameIntervalMs;
    const vy = ((clientY - pointer.y) / dtMs) * config.frameIntervalMs;

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
    circle.inflation = (positiveOffset / ELASTIC_GEOMETRY.segmentCount) * config.rimInflationRatio;
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
      const pullStrength =
        attractWeight *
        attractWeight *
        node.elasticInfluence *
        (config.attractBase + pointer.momentum * config.attractMomentumGain) *
        dt;

      node.vx += nx * pullStrength;
      node.vy += ny * pullStrength;
    }

    if (distanceToPointer < hoverRange) {
      const hoverRatio = 1 - distanceToPointer / hoverRange;
      const hoverBoost =
        hoverRatio *
        hoverRatio *
        config.hoverBoostBase *
        (config.hoverBoostOffset + pointer.momentum * config.hoverMomentumGain) *
        (interactionState?.hoverBoostMultiplier ?? 1);
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
        const elasticMix =
          config.collisionElasticBase +
          ((circleA.elasticInfluence + circleB.elasticInfluence) * 0.5) * config.collisionElasticGain;
        const impulse = overlap * config.collisionImpulseScale * elasticMix;

        circleA.x -= nx * correction;
        circleA.y -= ny * correction;
        circleB.x += nx * correction;
        circleB.y += ny * correction;

        circleA.vx -= nx * impulse;
        circleA.vy -= ny * impulse;
        circleB.vx += nx * impulse;
        circleB.vy += ny * impulse;

        const compressionAmount = (overlap / Math.max(minDist, 1)) * elasticMix;
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
    destroy,
  };
}
