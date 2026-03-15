(() => {
  "use strict";

  const canvas = document.getElementById("scene");
  const energyLabel = document.getElementById("energyLabel");
  const modeLabel = document.getElementById("modeLabel");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const pulseBtn = document.getElementById("pulseBtn");

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

  const PALETTES = [
    {
      name: "Savile Pop",
      atmosphere: ["rgba(253, 243, 224, 0.65)", "rgba(233, 222, 201, 0.8)"],
      glow: "rgba(255, 255, 255, 0.58)",
      stripes: [
        "#0f4c81",
        "#d1495b",
        "#edae49",
        "#00798c",
        "#9c2c77",
        "#2b4570",
        "#ef6f6c",
        "#5a9367",
        "#f18f01"
      ]
    },
    {
      name: "Gallery Noon",
      atmosphere: ["rgba(245, 234, 215, 0.62)", "rgba(237, 221, 204, 0.84)"],
      glow: "rgba(255, 248, 232, 0.52)",
      stripes: [
        "#1d3557",
        "#e63946",
        "#f4a261",
        "#2a9d8f",
        "#e9c46a",
        "#264653",
        "#c1121f",
        "#4895ef",
        "#bc6c25"
      ]
    },
    {
      name: "Evening Atelier",
      atmosphere: ["rgba(241, 226, 208, 0.64)", "rgba(227, 205, 190, 0.84)"],
      glow: "rgba(255, 241, 226, 0.46)",
      stripes: [
        "#003049",
        "#d62828",
        "#f77f00",
        "#fcbf49",
        "#007f5f",
        "#3a0ca3",
        "#2a6f97",
        "#e76f51",
        "#5f0f40"
      ]
    }
  ];

  const pointer = {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    vx: 0,
    vy: 0,
    momentum: 0,
    active: false,
    down: false,
    initialized: false,
    lastMove: 0
  };

  const modeState = {
    name: "glide",
    until: 0
  };

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    elapsed: 0,
    lastFrame: performance.now(),
    paletteIndex: 0,
    seed: 40231,
    stripes: [],
    bursts: [],
    motionScale: motionMedia.matches ? 0.45 : 1
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    const x = clamp(t, 0, 1);
    return 1 - Math.pow(1 - x, 3);
  }

  function hashRng(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function setMode(name, durationMs) {
    modeState.name = name;
    modeState.until = performance.now() + durationMs;
  }

  function setPointerFromEvent(event) {
    const now = performance.now();
    if (!pointer.initialized) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.lastX = pointer.x;
      pointer.lastY = pointer.y;
      pointer.initialized = true;
      pointer.active = true;
      pointer.lastMove = now;
      return;
    }

    const dt = Math.max(8, now - pointer.lastMove);
    pointer.vx = ((event.clientX - pointer.lastX) / dt) * 16.67;
    pointer.vy = ((event.clientY - pointer.lastY) / dt) * 16.67;
    pointer.momentum = clamp(Math.hypot(pointer.vx, pointer.vy) / 42, 0, 1.4);

    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.lastX = pointer.x;
    pointer.lastY = pointer.y;
    pointer.active = true;
    pointer.lastMove = now;
  }

  function spawnPulse(x, power) {
    const clampedPower = clamp(power, 0.4, 2.3);
    state.bursts.push({ x, power: clampedPower, age: 0 });
  }

  function updateBursts(dtSec) {
    for (let i = state.bursts.length - 1; i >= 0; i -= 1) {
      const burst = state.bursts[i];
      burst.age += dtSec;
      if (burst.age > 3.4) {
        state.bursts.splice(i, 1);
      }
    }
  }

  function burstForceAtX(x) {
    let force = 0;
    for (let i = 0; i < state.bursts.length; i += 1) {
      const burst = state.bursts[i];
      const dx = x - burst.x;
      const spread = 180 + burst.power * 220;
      const envelope = Math.exp(-(dx * dx) / (2 * spread * spread)) * Math.exp(-burst.age * 1.45);
      const wave = Math.sin(burst.age * (8.2 - burst.power * 0.7) - Math.abs(dx) * 0.021);
      force += wave * envelope * burst.power * 36 * state.motionScale;
    }
    return force;
  }

  function makeStripe(index, x, width, color, rand) {
    const mobileScale = state.width < 760 ? 0.74 : 1;
    const amp = lerp(10, 34, rand()) * state.motionScale * mobileScale;
    const speed = lerp(0.28, 0.84, rand());
    return {
      index,
      x,
      width,
      color,
      topShift: 0,
      bottomShift: 0,
      topVelocity: 0,
      bottomVelocity: 0,
      phase: rand() * Math.PI * 2,
      amp,
      speed,
      revealDelay: index * (state.motionScale < 0.6 ? 0.008 : 0.03),
      pinOpacity: lerp(0.08, 0.26, rand())
    };
  }

  function buildStripes() {
    const palette = PALETTES[state.paletteIndex];
    const rand = hashRng(state.seed + state.width + state.paletteIndex * 1009);

    const minW = clamp(state.width * 0.03, 22, 40);
    const maxW = clamp(state.width * 0.095, 48, 126);
    const overdraw = 180;

    let x = -overdraw;
    let index = 0;
    const stripes = [];

    while (x < state.width + overdraw) {
      const width = Math.round(lerp(minW, maxW, Math.pow(rand(), 0.78)));
      const color = palette.stripes[(index + Math.floor(rand() * palette.stripes.length)) % palette.stripes.length];
      stripes.push(makeStripe(index, x, width, color, rand));
      x += width;
      index += 1;
    }

    state.stripes = stripes;
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

    buildStripes();

    if (!pointer.initialized) {
      pointer.x = state.width * 0.66;
      pointer.y = state.height * 0.4;
      pointer.lastX = pointer.x;
      pointer.lastY = pointer.y;
      pointer.initialized = true;
    } else {
      pointer.x = clamp(pointer.x, 0, state.width);
      pointer.y = clamp(pointer.y, 0, state.height);
    }
  }

  function updateStripes(nowSec, dtNorm) {
    const radius = Math.max(state.width * 0.22, 260);
    const spring = lerp(0.08, 0.12, state.motionScale);

    for (let i = 0; i < state.stripes.length; i += 1) {
      const stripe = state.stripes[i];
      const centerX = stripe.x + stripe.width * 0.5;
      const dx = pointer.x - centerX;
      const distSq = dx * dx;

      const proximity = pointer.active ? Math.exp(-distSq / (2 * radius * radius)) : 0;
      const driftPush = pointer.active
        ? (pointer.vx * 9.4 + (pointer.down ? (centerX - pointer.x) * 0.08 : 0)) * proximity * state.motionScale
        : 0;
      const dragLift = pointer.active ? pointer.vy * 3.8 * proximity * state.motionScale : 0;

      const ambient = Math.sin(nowSec * stripe.speed + stripe.phase) * stripe.amp;
      const pulse = burstForceAtX(centerX);

      const targetTop = ambient + driftPush + pulse + dragLift * 0.2;
      const targetBottom = -ambient * 0.7 - driftPush * 0.66 - pulse * 0.34 - dragLift * 0.42;

      stripe.topVelocity += (targetTop - stripe.topShift) * spring * dtNorm;
      stripe.bottomVelocity += (targetBottom - stripe.bottomShift) * spring * dtNorm;

      stripe.topVelocity *= Math.pow(0.78, dtNorm);
      stripe.bottomVelocity *= Math.pow(0.79, dtNorm);

      stripe.topShift = clamp(stripe.topShift + stripe.topVelocity * dtNorm, -130, 130);
      stripe.bottomShift = clamp(stripe.bottomShift + stripe.bottomVelocity * dtNorm, -120, 120);
    }
  }

  function drawAtmosphere() {
    const palette = PALETTES[state.paletteIndex];

    const linear = ctx.createLinearGradient(0, 0, state.width, state.height);
    linear.addColorStop(0, palette.atmosphere[0]);
    linear.addColorStop(1, palette.atmosphere[1]);

    ctx.globalAlpha = 1;
    ctx.fillStyle = linear;
    ctx.fillRect(0, 0, state.width, state.height);

    const glowX = pointer.initialized ? pointer.x : state.width * 0.7;
    const glowY = pointer.initialized ? pointer.y : state.height * 0.3;
    const radius = Math.max(state.width, state.height) * 0.58;

    const radial = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, radius);
    radial.addColorStop(0, palette.glow);
    radial.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawStripe(stripe, reveal) {
    const top = stripe.topShift * reveal;
    const bottom = stripe.bottomShift * reveal;

    const x0 = stripe.x + top;
    const x1 = stripe.x + stripe.width + top * 0.6;
    const x2 = stripe.x + stripe.width + bottom;
    const x3 = stripe.x + bottom * 0.6;

    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x1, 0);
    ctx.lineTo(x2, state.height);
    ctx.lineTo(x3, state.height);
    ctx.closePath();

    ctx.fillStyle = stripe.color;
    ctx.fill();

    // 布地の立体感を出すため、帯ごとに淡い陰影を重ねる。
    const shade = ctx.createLinearGradient(x0, 0, x1, 0);
    shade.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    shade.addColorStop(0.45, "rgba(255, 255, 255, 0.03)");
    shade.addColorStop(1, "rgba(16, 20, 28, 0.17)");
    ctx.fillStyle = shade;
    ctx.fill();

    const pinXTop = stripe.x + stripe.width * 0.56 + top * 0.62;
    const pinXBottom = stripe.x + stripe.width * 0.56 + bottom * 0.62;

    ctx.beginPath();
    ctx.moveTo(pinXTop, 0);
    ctx.lineTo(pinXBottom, state.height);
    ctx.strokeStyle = `rgba(15, 23, 31, ${stripe.pinOpacity})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawStripes() {
    const motionIntroScale = state.motionScale < 0.6 ? 1 : 0.86;
    for (let i = 0; i < state.stripes.length; i += 1) {
      const stripe = state.stripes[i];
      const intro = easeOutCubic((state.elapsed - stripe.revealDelay) / motionIntroScale);
      drawStripe(stripe, intro);
    }
  }

  function updateHud() {
    if (performance.now() > modeState.until) {
      modeState.name = pointer.down ? "drag" : "glide";
    }

    energyLabel.textContent = `Energy: ${pointer.momentum.toFixed(2)}`;
    modeLabel.textContent = `Mode: ${modeState.name}`;
  }

  function tick(now) {
    const dtSec = clamp((now - state.lastFrame) / 1000, 1 / 140, 1 / 24);
    const dtNorm = dtSec * 60;

    state.lastFrame = now;
    state.elapsed += dtSec;

    if (!pointer.down) {
      pointer.vx *= Math.pow(0.92, dtNorm);
      pointer.vy *= Math.pow(0.92, dtNorm);
      pointer.momentum *= Math.pow(0.88, dtNorm);
    }

    if (now - pointer.lastMove > 1300) {
      pointer.active = false;
    }

    updateBursts(dtSec);
    updateStripes(now / 1000, dtNorm);

    ctx.clearRect(0, 0, state.width, state.height);
    drawAtmosphere();
    drawStripes();
    updateHud();

    requestAnimationFrame(tick);
  }

  function onPointerDown(event) {
    setPointerFromEvent(event);
    pointer.down = true;
    pointer.active = true;
    spawnPulse(pointer.x, 1.1 + pointer.momentum * 0.8);
    setMode("pulse", 1200);

    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event) {
    setPointerFromEvent(event);
    if (pointer.down) {
      setMode("drag", 220);
    }
  }

  function onPointerUp(event) {
    setPointerFromEvent(event);
    pointer.down = false;
    setMode("glide", 320);

    if (canvas.releasePointerCapture) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function onPointerCancel() {
    pointer.down = false;
    pointer.active = false;
  }

  function shufflePalette() {
    state.paletteIndex = (state.paletteIndex + 1) % PALETTES.length;
    state.seed = (state.seed + 0x9e3779b9) >>> 0;
    state.elapsed = 0;
    buildStripes();
    setMode("tone-shift", 1600);
  }

  function triggerCenterPulse() {
    const x = pointer.active ? pointer.x : state.width * 0.5;
    spawnPulse(x, 1.5);
    setMode("pulse", 1200);
  }

  function onKeyDown(event) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      triggerCenterPulse();
    }

    if (event.key.toLowerCase() === "s") {
      shufflePalette();
    }
  }

  motionMedia.addEventListener("change", (event) => {
    state.motionScale = event.matches ? 0.45 : 1;
    buildStripes();
  });

  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("pointerleave", () => {
    if (!pointer.down) {
      pointer.active = false;
    }
  });

  shuffleBtn.addEventListener("click", shufflePalette);
  pulseBtn.addEventListener("click", triggerCenterPulse);
  window.addEventListener("keydown", onKeyDown);

  resize();
  requestAnimationFrame(tick);
})();
