import { MASK_TEXTURES } from "../background/mask-textures.js";

export const MODE_KEYS = Object.freeze(["normal", "gradation", "fine", "mask"]);

function resolveMode(requestedMode) {
  return MODE_KEYS.includes(requestedMode) ? requestedMode : "normal";
}

function resolveTextureId(textureParam) {
  const requestedTextureId = Number.parseInt(textureParam ?? "1", 10);
  if (!Number.isFinite(requestedTextureId)) {
    return 1;
  }

  return Math.min(MASK_TEXTURES.length, Math.max(1, requestedTextureId));
}

function buildModeRoutes(pathname, selectedMaskTextureId) {
  return {
    normal: pathname,
    gradation: `${pathname}?mode=gradation`,
    fine: `${pathname}?mode=fine`,
    mask: `${pathname}?mode=mask&texture=${selectedMaskTextureId}`,
  };
}

export function resolveViewState(search, pathname) {
  const searchParams = new URLSearchParams(search);
  const mode = resolveMode(searchParams.get("mode"));
  const selectedMaskTextureId = resolveTextureId(searchParams.get("texture"));
  const selectedMaskTexture = MASK_TEXTURES[selectedMaskTextureId - 1];

  return {
    pathname,
    mode,
    isGradationMode: mode === "gradation",
    isFineMode: mode === "fine",
    isMaskMode: mode === "mask",
    selectedMaskTextureId,
    selectedMaskTexture,
    modeRoutes: buildModeRoutes(pathname, selectedMaskTextureId),
  };
}
