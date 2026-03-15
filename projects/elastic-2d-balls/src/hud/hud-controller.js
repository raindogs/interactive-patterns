function setLinkState(link, active) {
  if (active) {
    link.setAttribute("aria-current", "page");
    link.dataset.active = "true";
    return;
  }

  link.removeAttribute("aria-current");
  link.dataset.active = "false";
}

export function createHudController({ viewState, root = document }) {
  const interactionState = {
    hoverBoostMultiplier: 1,
  };

  const removers = [];
  const modeLinks = root.querySelectorAll("[data-mode-link]");
  const maskTextureLinks = root.querySelectorAll("[data-mask-texture]");
  const maskTextureMenu = root.getElementById("mask-texture-menu");
  const hoverBoostToggle = root.getElementById("hover-boost-toggle");

  function syncModeLinks() {
    for (let i = 0; i < modeLinks.length; i += 1) {
      const link = modeLinks[i];
      const key = link.dataset.modeLink;
      if (!key || !viewState.modeRoutes[key]) {
        continue;
      }

      link.href = viewState.modeRoutes[key];
      setLinkState(link, key === viewState.mode);
    }
  }

  function syncMaskTextureMenu() {
    if (maskTextureMenu) {
      maskTextureMenu.hidden = !viewState.isMaskMode;
      maskTextureMenu.style.display = viewState.isMaskMode ? "flex" : "none";
    }

    for (let i = 0; i < maskTextureLinks.length; i += 1) {
      const link = maskTextureLinks[i];
      const textureId = Number.parseInt(link.dataset.maskTexture || "", 10);
      if (!Number.isFinite(textureId)) {
        continue;
      }

      link.href = `${viewState.pathname}?mode=mask&texture=${textureId}`;
      setLinkState(link, viewState.isMaskMode && textureId === viewState.selectedMaskTextureId);
    }
  }

  function bindBoostToggle() {
    if (!(hoverBoostToggle instanceof HTMLInputElement)) {
      return;
    }

    hoverBoostToggle.checked = false;
    const handleChange = () => {
      interactionState.hoverBoostMultiplier = hoverBoostToggle.checked ? 2 : 1;
    };

    hoverBoostToggle.addEventListener("change", handleChange);
    removers.push(() => hoverBoostToggle.removeEventListener("change", handleChange));
  }

  function init() {
    syncModeLinks();
    syncMaskTextureMenu();
    bindBoostToggle();
  }

  function destroy() {
    for (let i = removers.length - 1; i >= 0; i -= 1) {
      removers[i]();
    }
    removers.length = 0;
  }

  init();

  return {
    interactionState,
    destroy,
  };
}
