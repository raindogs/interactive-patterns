import "./styles/main.scss";
import { createBackgroundLayer } from "./background/background.js";
import { createStalkerLayer } from "./stalker/stalker.js";

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
