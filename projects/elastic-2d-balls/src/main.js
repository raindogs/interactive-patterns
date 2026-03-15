import "./styles/main.scss";
import { createBackgroundSystem } from "./background/background-system.js";
import { createElasticField } from "./elastic/elastic-field.js";
import { createHudController } from "./hud/hud-controller.js";
import { resolveViewState } from "./view/view-state.js";

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
    backgroundSystem,
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
