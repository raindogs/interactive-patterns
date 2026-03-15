function clamp(value, min, max) {
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
    radius,
  };
}

function chooseRadius(width, height, config) {
  if (typeof config.fixedRadius === "number") {
    return config.fixedRadius;
  }

  const shortest = Math.min(width, height);
  const rawRadius = shortest * config.baseRadiusRatio;
  const responsiveScale = width < 720 ? config.mobileRadiusScale : 1;
  return clamp(rawRadius * responsiveScale, config.minRadius, config.maxRadius);
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

export function buildCircleField({ width, height, config, segmentCount }) {
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
    neighbors: buildNeighbors(circles, radius, config.neighborDistanceScale),
  };
}
