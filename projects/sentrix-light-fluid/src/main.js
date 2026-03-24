import "./styles/main.scss";
import WebGLFluid from "./vendor/webgl-fluid-sentrix.mjs";

const DESKTOP_MEDIA = "(min-width: 768px)";
const REDUCED_MOTION_MEDIA = "(prefers-reduced-motion: reduce)";
const THEME_STORAGE_KEY = "sentrix-study-theme";

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
  COLORFUL: true,
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
  STATIC_COLOR: { r: 0.086, g: 0.0916, b: 0.092 },
};

function updateMotionState(label, message) {
  if (label) {
    label.textContent = message;
  }
}

function resolveTheme() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode) {
  const nextMode = mode === "dark" ? "dark" : "light";
  const toggles = Array.from(document.querySelectorAll(".dark-mode-toggle"));
  const labels = Array.from(document.querySelectorAll(".is-dark-mode-text"));

  document.documentElement.setAttribute("data-theme-mode", nextMode);
  window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);

  toggles.forEach((toggle) => {
    toggle.classList.toggle("is-toggle--active", nextMode === "dark");
    toggle.setAttribute("aria-pressed", String(nextMode === "dark"));
  });

  labels.forEach((label) => {
    label.classList.toggle("is-toggle--active", nextMode === "dark");
    label.textContent = nextMode === "dark" ? "DARK" : "LIGHT";
  });
}

function initializeThemeToggle() {
  const toggles = Array.from(document.querySelectorAll(".dark-mode-toggle"));
  const initialTheme = resolveTheme();

  applyTheme(initialTheme);

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme-mode");
      applyTheme(currentTheme === "dark" ? "light" : "dark");
    });
  });
}

function bootstrap() {
  initializeThemeToggle();

  const canvas = document.getElementById("p-front-bg-anim");
  const interactionSurface = document.getElementById("front-anim");
  const motionState = document.getElementById("motion-state");

  if (!(canvas instanceof HTMLCanvasElement) || !(interactionSurface instanceof HTMLElement)) {
    return;
  }

  const desktopQuery = window.matchMedia(DESKTOP_MEDIA);
  const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_MEDIA);
  const enableFluid = desktopQuery.matches && !reducedMotionQuery.matches;

  document.documentElement.classList.toggle("is-fluid-disabled", !enableFluid);

  if (!enableFluid) {
    updateMotionState(
      motionState,
      reducedMotionQuery.matches ? "Reduced motion fallback" : "Desktop only fallback",
    );
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  try {
    WebGLFluid(canvas, {
      ...FLUID_OPTIONS,
      EVENT_TARGET: interactionSurface,
    });
    updateMotionState(motionState, "Fluid enabled");
  } catch (error) {
    console.error("Failed to initialize fluid study", error);
    document.documentElement.classList.add("is-fluid-disabled");
    updateMotionState(motionState, "WebGL fallback");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
