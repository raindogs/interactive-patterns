import { ELASTIC_GEOMETRY } from "./elastic-config.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const COS_TABLE = new Float32Array(ELASTIC_GEOMETRY.segmentCount);
const SIN_TABLE = new Float32Array(ELASTIC_GEOMETRY.segmentCount);

for (let i = 0; i < ELASTIC_GEOMETRY.segmentCount; i += 1) {
  const angle = (i / ELASTIC_GEOMETRY.segmentCount) * ELASTIC_GEOMETRY.tau;
  COS_TABLE[i] = Math.cos(angle);
  SIN_TABLE[i] = Math.sin(angle);
}

export function createElasticRenderer({ ctx, mode, config, backgroundSystem }) {
  function traceCirclePath(circle, baseRadius) {
    ctx.beginPath();
    for (let i = 0; i < ELASTIC_GEOMETRY.segmentCount; i += 1) {
      const radial = clamp(
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
    const influenceStrength = clamp(
      (circle.elasticInfluence - config.minElasticInfluence) / (1 - config.minElasticInfluence),
      0,
      1
    );
    const influenceZoom =
      influenceStrength > config.maskInfluenceGate ? influenceStrength * config.maskInfluenceZoomGain : 0;
    const zoom =
      1 +
      Math.max(0, circle.scale - 1) * config.maskZoomGain +
      inflationRatio * config.maskInflationZoomGain +
      influenceZoom;

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
    render,
  };
}
