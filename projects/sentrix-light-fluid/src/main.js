import "./styles/main.scss";
import WebGLFluid from "./vendor/webgl-fluid-sentrix.mjs";

const DESKTOP_MEDIA = "(min-width: 768px)";
const REDUCED_MOTION_MEDIA = "(prefers-reduced-motion: reduce)";
const THEME_STORAGE_KEY = "sentrix-study-theme";
const WHITE_FLUID_COLORS = {
  light: { r: 0.18, g: 0.22, b: 0.28 },
  dark: { r: 0.22, g: 0.24, b: 0.25 },
};
const LU_TWIYO_COLORS = [
  { name: "LU Yellow", hex: "#FAC800" },
  { name: "LU Blue", hex: "#003287" },
  { name: "LU Orange", hex: "#F06400" },
  { name: "LU Red", hex: "#E60014" },
  { name: "LU Deep Red", hex: "#BE0000" },
  { name: "LU Green", hex: "#2DA037" },
];
const TOGGLE_LABELS = {
  theme: { light: "Light", dark: "Dark" },
  colorMode: { white: "White", colorful: "Colorful" },
};
const TOGGLE_SEQUENCE = {
  theme: ["light", "dark"],
  colorMode: ["white", "colorful"],
};
const LEVEL_SEQUENCE = ["low", "mid", "high"];

const FLUID_OPTIONS = {
  TRIGGER: "hover",
  IMMEDIATE: false,
  AUTO: false,
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  CAPTURE_RESOLUTION: 512,
  DENSITY_DISSIPATION: 4.5,
  VELOCITY_DISSIPATION: 1,
  PRESSURE: 0.1,
  PRESSURE_ITERATIONS: 20,
  CURL: 3,
  SPLAT_RADIUS: 0.2,
  SPLAT_FORCE: 6000,
  SHADING: false,
  COLORFUL: false,
  COLOR_UPDATE_SPEED: 10,
  PAUSED: false,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  TRANSPARENT: true,
  BLOOM: false,
  BLOOM_ITERATIONS: 1,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: false,
  SUNRAYS_RESOLUTION: 196,
  SUNRAYS_WEIGHT: 1,
  ON_DEMAND: true,
  START_DELAY: 500,
  IDLE_TIMEOUT: 1000,
  INITIAL_IDLE_TIMEOUT: 600,
  STATIC_COLOR: WHITE_FLUID_COLORS.dark,
};

const PARAMETER_PRESETS = {
  radius: {
    option: "SPLAT_RADIUS",
    levels: { low: 0.06, mid: 0.24, high: 0.96 },
    format: (value) => value.toFixed(2),
  },
  force: {
    option: "SPLAT_FORCE",
    levels: { low: 2000, mid: 6500, high: 18000 },
    format: (value) => String(value),
  },
  density: {
    option: "DENSITY_DISSIPATION",
    levels: { low: 1.2, mid: 4.5, high: 14 },
    format: (value) => value.toFixed(1),
  },
  curl: {
    option: "CURL",
    levels: { low: 0.8, mid: 3, high: 16 },
    format: (value) => value.toFixed(1),
  },
};

const DEFAULT_CONTROL_STATE = {
  theme: "dark",
  colorMode: "white",
  radius: "mid",
  force: "mid",
  density: "mid",
  curl: "mid",
};

function updateMotionState(label, message) {
  if (label) {
    label.textContent = message;
  }
}

function hexToUnitRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;

  const number = Number.parseInt(value, 16);

  return {
    r: ((number >> 16) & 255) / 255,
    g: ((number >> 8) & 255) / 255,
    b: (number & 255) / 255,
  };
}

function scaleColor(color, intensity) {
  return {
    r: color.r * intensity,
    g: color.g * intensity,
    b: color.b * intensity,
  };
}

function getNextValue(sequence, currentValue) {
  const currentIndex = sequence.indexOf(currentValue);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  return sequence[(safeIndex + 1) % sequence.length];
}

function resolveTheme() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return "dark";
}

function applyTheme(mode) {
  const nextMode = mode === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme-mode", nextMode);
  window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
}

function buildColorModePatch(colorMode) {
  if (colorMode === "colorful") {
    return {
      COLORFUL: true,
      STATIC_COLOR: null,
      COLOR_PALETTE: LU_TWIYO_COLORS.map((entry) => scaleColor(hexToUnitRgb(entry.hex), 0.42)),
    };
  }

  return {
    COLORFUL: false,
    STATIC_COLOR: WHITE_FLUID_COLORS.dark,
    COLOR_PALETTE: null,
  };
}

function buildFluidPatch(state) {
  const patch = buildColorModePatch(state.colorMode);

  if (state.colorMode === "white") {
    patch.STATIC_COLOR = WHITE_FLUID_COLORS[state.theme];
  }

  Object.entries(PARAMETER_PRESETS).forEach(([key, config]) => {
    patch[config.option] = config.levels[state[key]];
  });

  return patch;
}

function syncHudState(state) {
  applyTheme(state.theme);
  document.documentElement.dataset.fluidColorMode = state.colorMode;

  Object.entries(TOGGLE_SEQUENCE).forEach(([key]) => {
    const button = document.querySelector(`[data-control-button="${key}"]`);
    const value = state[key];

    if (button instanceof HTMLButtonElement) {
      button.dataset.state = value;
      button.setAttribute("aria-pressed", "true");
    }

    const label = document.querySelector(`[data-control-value="${key}"]`);

    if (label instanceof HTMLElement) {
      label.textContent = TOGGLE_LABELS[key][value];
    }
  });

  Object.entries(PARAMETER_PRESETS).forEach(([key, config]) => {
    const label = document.getElementById(`value-${key}`);
    const level = state[key];
    const button = document.querySelector(`[data-control-button="${key}"]`);
    const levelLabel = document.querySelector(`[data-control-level="${key}"]`);

    if (label) {
      label.textContent = config.format(config.levels[level]);
    }

    if (button instanceof HTMLButtonElement) {
      button.dataset.state = level;
    }

    if (levelLabel instanceof HTMLElement) {
      levelLabel.textContent = level.toUpperCase();
    }
  });
}

function attachHudInteractions(state, controller) {
  const hud = document.querySelector(".hud");

  if (!(hud instanceof HTMLElement)) {
    return;
  }

  ["mousemove", "mousedown", "touchstart", "touchmove"].forEach((eventName) => {
    hud.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
  });

  hud.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const action = button.getAttribute("data-action");

    if (!action || !Object.hasOwn(state, action)) {
      return;
    }

    if (action in TOGGLE_SEQUENCE) {
      state[action] = getNextValue(TOGGLE_SEQUENCE[action], state[action]);
    } else if (action in PARAMETER_PRESETS) {
      state[action] = getNextValue(LEVEL_SEQUENCE, state[action]);
    } else {
      return;
    }

    syncHudState(state);

    if (controller) {
      controller.setOptions(buildFluidPatch(state));
    }
  });
}

function bootstrap() {
  const canvas = document.getElementById("p-front-bg-anim");
  const interactionSurface = document.getElementById("front-anim");
  const motionState = document.getElementById("motion-state");
  const state = {
    ...DEFAULT_CONTROL_STATE,
    theme: resolveTheme(),
  };

  syncHudState(state);

  if (!(canvas instanceof HTMLCanvasElement) || !(interactionSurface instanceof HTMLElement)) {
    return;
  }

  const desktopQuery = window.matchMedia(DESKTOP_MEDIA);
  const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_MEDIA);
  const enableFluid = desktopQuery.matches && !reducedMotionQuery.matches;

  document.documentElement.classList.toggle("is-fluid-disabled", !enableFluid);

  if (!enableFluid) {
    attachHudInteractions(state, null);
    updateMotionState(
      motionState,
      reducedMotionQuery.matches ? "Reduced motion fallback" : "Desktop only fallback",
    );
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  try {
    const controller = WebGLFluid(canvas, {
      ...FLUID_OPTIONS,
      ...buildFluidPatch(state),
      EVENT_TARGET: interactionSurface,
    });
    window.__sentrixFluidController = controller;

    attachHudInteractions(state, controller ?? null);
    updateMotionState(motionState, "Fluid enabled");
  } catch (error) {
    console.error("Failed to initialize fluid study", error);
    document.documentElement.classList.add("is-fluid-disabled");
    attachHudInteractions(state, null);
    updateMotionState(motionState, "WebGL fallback");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
