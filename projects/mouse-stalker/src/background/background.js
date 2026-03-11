const DEFAULT_BACKGROUND_CONFIG = {
  noiseTileSize: 128,
  noiseAlpha: 0.032,
  background: {
    fields: [
      { xRatio: 0.16, yRatio: 0.24, radiusScale: 0.8, hue: 354, sat: 96, light: 24, alpha: 0.3 },
      { xRatio: 0.13, yRatio: 0.76, radiusScale: 0.62, hue: 228, sat: 76, light: 20, alpha: 0.26 },
      { xRatio: 0.84, yRatio: 0.34, radiusScale: 0.62, hue: 308, sat: 72, light: 52, alpha: 0.3 },
      { xRatio: 0.74, yRatio: 0.46, radiusScale: 0.52, hue: 294, sat: 66, light: 62, alpha: 0.2 },
    ],
    stops: [0, 0.22, 0.5, 0.78, 1],
    lightBoosts: [16, 12, 8, 0],
    alphaScale: [0.98, 0.84, 0.6, 0.24],
  },
  backgroundNoise: {
    grayMin: 120,
    grayMax: 136,
    alphaMin: 16,
    alphaMax: 34,
  },
};

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function mergeBackgroundConfig(config = {}) {
  const base = DEFAULT_BACKGROUND_CONFIG;
  return {
    noiseTileSize: config.noiseTileSize ?? base.noiseTileSize,
    noiseAlpha: config.noiseAlpha ?? base.noiseAlpha,
    background: {
      fields: (config.background?.fields ?? base.background.fields).map((field) => ({ ...field })),
      stops: [...(config.background?.stops ?? base.background.stops)],
      lightBoosts: [...(config.background?.lightBoosts ?? base.background.lightBoosts)],
      alphaScale: [...(config.background?.alphaScale ?? base.background.alphaScale)],
    },
    backgroundNoise: {
      ...base.backgroundNoise,
      ...(config.backgroundNoise ?? {}),
    },
  };
}

export class BackgroundLayer {
  constructor(config = {}) {
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
    this.#buildHazeLayer();
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

  #createBackgroundNoiseTile() {
    const tileSize = this.config.noiseTileSize;
    const tile = this.noiseTile;
    tile.width = tileSize;
    tile.height = tileSize;
    const tctx = tile.getContext("2d", { alpha: true });
    const image = tctx.createImageData(tileSize, tileSize);
    const { data } = image;
    const noise = this.config.backgroundNoise;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor(random(noise.grayMin, noise.grayMax));
      const alpha = Math.floor(random(noise.alphaMin, noise.alphaMax));
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      data[i + 3] = alpha;
    }

    tctx.putImageData(image, 0, 0);
  }

  #buildHazeLayer() {
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
      alpha: field.alpha,
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

    this.#createBackgroundNoiseTile();
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
  }
}

export function createBackgroundLayer(config) {
  return new BackgroundLayer(config);
}
