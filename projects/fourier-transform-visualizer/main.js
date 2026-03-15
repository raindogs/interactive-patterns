(() => {
  "use strict";

  const TAU = Math.PI * 2;

  const elements = {
    waveform: document.getElementById("waveform"),
    sampleCount: document.getElementById("sampleCount"),
    harmonics: document.getElementById("harmonics"),
    harmonicsValue: document.getElementById("harmonicsValue"),
    speed: document.getElementById("speed"),
    speedValue: document.getElementById("speedValue"),
    togglePlayback: document.getElementById("togglePlayback"),
    signalCanvas: document.getElementById("signalCanvas"),
    spectrumCanvas: document.getElementById("spectrumCanvas"),
    epicycleCanvas: document.getElementById("epicycleCanvas")
  };

  const contexts = {
    signal: elements.signalCanvas.getContext("2d"),
    spectrum: elements.spectrumCanvas.getContext("2d"),
    epicycle: elements.epicycleCanvas.getContext("2d")
  };

  if (!contexts.signal || !contexts.spectrum || !contexts.epicycle) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    waveform: elements.waveform.value,
    sampleCount: Number(elements.sampleCount.value),
    harmonicCount: Number(elements.harmonics.value),
    speed: Number(elements.speed.value),
    phase: 0,
    playing: !prefersReducedMotion,
    lastFrame: performance.now(),
    samples: new Float32Array(),
    reconstructed: new Float32Array(),
    spectrum: [],
    selectedHarmonics: [],
    signalAbsMax: 1
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function waveformAt(type, t) {
    if (type === "sine") {
      return Math.sin(TAU * t);
    }

    if (type === "square") {
      return Math.sin(TAU * t) >= 0 ? 1 : -1;
    }

    if (type === "sawtooth") {
      return 2 * (t - Math.floor(t + 0.5));
    }

    if (type === "triangle") {
      return 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1;
    }

    if (type === "pulse") {
      return t % 1 < 0.18 ? 1 : -1;
    }

    if (type === "chirp") {
      const sweep = 2 + 18 * t;
      return Math.sin(TAU * sweep * t);
    }

    return 0;
  }

  function syncControls() {
    const maxHarmonics = Math.min(64, Math.max(1, Math.floor(state.sampleCount / 2)));
    state.harmonicCount = clamp(state.harmonicCount, 1, maxHarmonics);
    elements.harmonics.max = String(maxHarmonics);
    elements.harmonics.value = String(state.harmonicCount);
    elements.harmonicsValue.textContent = String(state.harmonicCount);

    elements.speedValue.textContent = state.speed.toFixed(2);
    elements.togglePlayback.textContent = state.playing ? "Pause" : "Play";
    elements.togglePlayback.setAttribute("aria-pressed", state.playing ? "true" : "false");
  }

  function updateSelection() {
    const ranked = state.spectrum
      .slice(1)
      .sort((a, b) => b.pairAmplitude - a.pairAmplitude);

    state.selectedHarmonics = ranked.slice(0, state.harmonicCount);
  }

  function reconstructAt(t) {
    if (!state.spectrum.length) {
      return 0;
    }

    let value = state.spectrum[0].re;

    for (let i = 0; i < state.selectedHarmonics.length; i += 1) {
      const component = state.selectedHarmonics[i];
      value += component.pairAmplitude * Math.cos(TAU * component.k * t + component.phase);
    }

    return value;
  }

  function rebuildReconstruction() {
    const series = new Float32Array(state.sampleCount);
    let absMax = 1e-6;

    for (let i = 0; i < state.sampleCount; i += 1) {
      const t = i / state.sampleCount;
      const reconstructed = reconstructAt(t);
      series[i] = reconstructed;
      absMax = Math.max(absMax, Math.abs(reconstructed), Math.abs(state.samples[i] || 0));
    }

    state.reconstructed = series;
    state.signalAbsMax = absMax;
  }

  function computeDFT() {
    const sampleCount = state.sampleCount;
    const samples = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i += 1) {
      const t = i / sampleCount;
      samples[i] = waveformAt(state.waveform, t);
    }

    const nyquist = Math.floor(sampleCount / 2);
    const spectrum = [];

    for (let k = 0; k <= nyquist; k += 1) {
      let re = 0;
      let im = 0;

      for (let n = 0; n < sampleCount; n += 1) {
        const angle = (TAU * k * n) / sampleCount;
        re += samples[n] * Math.cos(angle);
        im -= samples[n] * Math.sin(angle);
      }

      re /= sampleCount;
      im /= sampleCount;

      const amplitude = Math.hypot(re, im);
      const isNyquist = sampleCount % 2 === 0 && k === nyquist;
      const pairAmplitude = k === 0 || isNyquist ? amplitude : amplitude * 2;

      spectrum.push({
        k,
        re,
        im,
        amplitude,
        pairAmplitude,
        phase: Math.atan2(im, re)
      });
    }

    state.samples = samples;
    state.spectrum = spectrum;
    updateSelection();
    rebuildReconstruction();
  }

  function resizeCanvas(canvas, context) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(2, Math.round(rect.width));
    const height = Math.max(2, Math.round(rect.height));
    const nextWidth = Math.round(width * state.dpr);
    const nextHeight = Math.round(height * state.dpr);

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }
  }

  function resizeAllCanvases() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    resizeCanvas(elements.signalCanvas, contexts.signal);
    resizeCanvas(elements.spectrumCanvas, contexts.spectrum);
    resizeCanvas(elements.epicycleCanvas, contexts.epicycle);
  }

  function canvasSize(canvas) {
    return {
      width: canvas.width / state.dpr,
      height: canvas.height / state.dpr
    };
  }

  function drawGrid(context, width, height, cols, rows) {
    context.save();
    context.strokeStyle = "rgba(34, 48, 41, 0.10)";
    context.lineWidth = 1;

    for (let i = 1; i < cols; i += 1) {
      const x = (i / cols) * width;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let j = 1; j < rows; j += 1) {
      const y = (j / rows) * height;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.restore();
  }

  function drawSignalPanel(cursorT) {
    const context = contexts.signal;
    const { width, height } = canvasSize(elements.signalCanvas);
    const padding = 18;
    const plotWidth = width - padding * 2;
    const centerY = height * 0.5;
    const yScale = (height * 0.36) / Math.max(0.2, state.signalAbsMax);

    context.clearRect(0, 0, width, height);
    drawGrid(context, width, height, 8, 6);

    context.strokeStyle = "rgba(29, 42, 35, 0.34)";
    context.beginPath();
    context.moveTo(padding, centerY);
    context.lineTo(width - padding, centerY);
    context.stroke();

    const sampleLength = state.samples.length;

    context.lineWidth = 2.2;
    context.strokeStyle = "#f6f4ef";
    context.beginPath();

    for (let i = 0; i < sampleLength; i += 1) {
      const x = padding + (i / (sampleLength - 1)) * plotWidth;
      const y = centerY - state.samples[i] * yScale;
      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.stroke();

    context.lineWidth = 2.2;
    context.strokeStyle = "#f06b2f";
    context.beginPath();

    for (let i = 0; i < sampleLength; i += 1) {
      const x = padding + (i / (sampleLength - 1)) * plotWidth;
      const y = centerY - state.reconstructed[i] * yScale;
      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.stroke();

    const cursorX = padding + cursorT * plotWidth;
    const originalY = centerY - waveformAt(state.waveform, cursorT) * yScale;
    const reconstructedY = centerY - reconstructAt(cursorT) * yScale;

    context.strokeStyle = "rgba(27, 84, 78, 0.8)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(cursorX, padding * 0.35);
    context.lineTo(cursorX, height - padding * 0.35);
    context.stroke();

    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(cursorX, originalY, 3.3, 0, TAU);
    context.fill();

    context.fillStyle = "#f06b2f";
    context.beginPath();
    context.arc(cursorX, reconstructedY, 3.3, 0, TAU);
    context.fill();
  }

  function drawSpectrumPanel() {
    const context = contexts.spectrum;
    const { width, height } = canvasSize(elements.spectrumCanvas);
    const padding = 16;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    const spectrum = state.spectrum;

    context.clearRect(0, 0, width, height);
    drawGrid(context, width, height, 10, 5);

    const maxAmplitude = spectrum.reduce((max, component) => {
      return Math.max(max, component.pairAmplitude);
    }, 1e-6);

    const selected = new Set(state.selectedHarmonics.map((component) => component.k));
    const barWidth = plotWidth / spectrum.length;

    for (let i = 0; i < spectrum.length; i += 1) {
      const component = spectrum[i];
      const ratio = component.pairAmplitude / maxAmplitude;
      const barHeight = ratio * plotHeight;
      const x = padding + i * barWidth + barWidth * 0.1;
      const y = height - padding - barHeight;
      const w = Math.max(1, barWidth * 0.8);

      const isActive = selected.has(component.k);
      const alpha = 0.25 + ratio * 0.7;

      context.fillStyle = isActive
        ? `rgba(240, 107, 47, ${0.45 + ratio * 0.55})`
        : `rgba(31, 122, 114, ${alpha})`;

      context.fillRect(x, y, w, barHeight);
    }

    context.strokeStyle = "rgba(25, 36, 31, 0.4)";
    context.beginPath();
    context.moveTo(padding, height - padding);
    context.lineTo(width - padding, height - padding);
    context.stroke();

    context.fillStyle = "rgba(25, 36, 31, 0.78)";
    context.font = '12px "Avenir Next", "Hiragino Sans", sans-serif';
    context.fillText("k = 0", padding, height - 4);
    context.fillText(
      `Nyquist = ${Math.floor(state.sampleCount / 2)}`,
      width - padding - 104,
      height - 4
    );

    const topLabels = state.selectedHarmonics.slice(0, 5);
    context.fillStyle = "rgba(240, 107, 47, 0.95)";
    context.font = '12px "Avenir Next", "Hiragino Sans", sans-serif';
    context.fillText(
      `Top: ${topLabels
        .map((component) => `${component.k}:${component.pairAmplitude.toFixed(2)}`)
        .join("  ")}`,
      padding,
      14
    );
  }

  function drawEpicyclePanel(cursorT) {
    const context = contexts.epicycle;
    const { width, height } = canvasSize(elements.epicycleCanvas);

    context.clearRect(0, 0, width, height);
    drawGrid(context, width, height, 12, 6);

    const split = width * 0.47;
    const rightX = split + 20;
    const rightWidth = width - rightX - 14;
    const centerY = height * 0.52;

    context.strokeStyle = "rgba(31, 44, 37, 0.24)";
    context.beginPath();
    context.moveTo(split, 12);
    context.lineTo(split, height - 12);
    context.stroke();

    const displayComponents = state.selectedHarmonics.slice(0, 24);
    const sumAmplitude = displayComponents.reduce((sum, component) => {
      return sum + Math.abs(component.pairAmplitude);
    }, 1e-6);

    const radiusScale = Math.min(split * 0.35, height * 0.42) / sumAmplitude;
    const waveScale = (height * 0.34) / Math.max(0.2, state.signalAbsMax);

    let x = split * 0.16;
    let y = centerY - state.spectrum[0].re * waveScale;

    context.lineWidth = 1.1;

    for (let i = 0; i < displayComponents.length; i += 1) {
      const component = displayComponents[i];
      const radius = component.pairAmplitude * radiusScale;
      const angle = TAU * component.k * cursorT + component.phase;

      const nextX = x + radius * Math.cos(angle);
      const nextY = y + radius * Math.sin(angle);

      context.strokeStyle = "rgba(28, 86, 79, 0.45)";
      context.beginPath();
      context.arc(x, y, Math.abs(radius), 0, TAU);
      context.stroke();

      context.strokeStyle = "rgba(240, 107, 47, 0.82)";
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(nextX, nextY);
      context.stroke();

      x = nextX;
      y = nextY;
    }

    context.fillStyle = "#f06b2f";
    context.beginPath();
    context.arc(x, y, 3.2, 0, TAU);
    context.fill();

    context.strokeStyle = "rgba(30, 50, 43, 0.5)";
    context.strokeRect(rightX, 12, rightWidth, height - 24);

    context.lineWidth = 1.9;
    context.strokeStyle = "#1f7a72";
    context.beginPath();

    for (let i = 0; i < state.reconstructed.length; i += 1) {
      const px = rightX + (i / (state.reconstructed.length - 1)) * rightWidth;
      const py = centerY - state.reconstructed[i] * waveScale;
      if (i === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    }

    context.stroke();

    const cursorX = rightX + cursorT * rightWidth;
    const cursorY = centerY - reconstructAt(cursorT) * waveScale;

    context.setLineDash([4, 4]);
    context.strokeStyle = "rgba(240, 107, 47, 0.6)";
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(cursorX, cursorY);
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = "rgba(31, 122, 114, 0.7)";
    context.beginPath();
    context.moveTo(cursorX, 12);
    context.lineTo(cursorX, height - 12);
    context.stroke();

    context.fillStyle = "#1f7a72";
    context.beginPath();
    context.arc(cursorX, cursorY, 3.1, 0, TAU);
    context.fill();

    context.fillStyle = "rgba(26, 38, 32, 0.84)";
    context.font = '12px "Avenir Next", "Hiragino Sans", sans-serif';
    context.fillText(`epicycles: ${displayComponents.length}`, 14, 18);
  }

  function render(now) {
    const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
    state.lastFrame = now;

    if (state.playing) {
      state.phase = (state.phase + dt * state.speed * TAU * 0.35) % TAU;
    }

    const cursorT = (state.phase / TAU + 1) % 1;

    drawSignalPanel(cursorT);
    drawSpectrumPanel();
    drawEpicyclePanel(cursorT);

    requestAnimationFrame(render);
  }

  function updateFromWaveform() {
    state.waveform = elements.waveform.value;
    computeDFT();
  }

  function updateFromSampleCount() {
    state.sampleCount = Number(elements.sampleCount.value);
    syncControls();
    computeDFT();
  }

  function updateFromHarmonics() {
    state.harmonicCount = Number(elements.harmonics.value);
    syncControls();
    updateSelection();
    rebuildReconstruction();
  }

  function updateFromSpeed() {
    state.speed = Number(elements.speed.value);
    syncControls();
  }

  function togglePlayback() {
    state.playing = !state.playing;
    syncControls();
  }

  function handleSignalScrub(event) {
    const rect = elements.signalCanvas.getBoundingClientRect();
    const t = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    state.phase = t * TAU;
  }

  elements.waveform.addEventListener("change", updateFromWaveform);
  elements.sampleCount.addEventListener("change", updateFromSampleCount);
  elements.harmonics.addEventListener("input", updateFromHarmonics);
  elements.speed.addEventListener("input", updateFromSpeed);
  elements.togglePlayback.addEventListener("click", togglePlayback);

  elements.signalCanvas.addEventListener("pointerdown", (event) => {
    state.playing = false;
    syncControls();
    handleSignalScrub(event);
    elements.signalCanvas.setPointerCapture(event.pointerId);
  });

  elements.signalCanvas.addEventListener("pointermove", (event) => {
    if ((event.buttons & 1) === 1) {
      handleSignalScrub(event);
    }
  });

  window.addEventListener("resize", resizeAllCanvases);

  syncControls();
  computeDFT();
  resizeAllCanvases();
  requestAnimationFrame(render);
})();
