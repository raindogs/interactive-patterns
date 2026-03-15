function createCoverRect(width, height, imageWidth, imageHeight) {
  const imageRatio = imageWidth / imageHeight;
  const viewportRatio = width / height;

  if (imageRatio > viewportRatio) {
    const drawHeight = height;
    const drawWidth = drawHeight * imageRatio;
    return {
      x: (width - drawWidth) * 0.5,
      y: 0,
      width: drawWidth,
      height: drawHeight,
    };
  }

  const drawWidth = width;
  const drawHeight = drawWidth / imageRatio;
  return {
    x: 0,
    y: (height - drawHeight) * 0.5,
    width: drawWidth,
    height: drawHeight,
  };
}

export function createBackgroundSystem({ viewState, body = document.body }) {
  const state = {
    width: 0,
    height: 0,
    image: new Image(),
    imageLoaded: false,
    coverRect: { x: 0, y: 0, width: 0, height: 0 },
  };

  state.image.decoding = "async";

  function applyDocumentState() {
    body.dataset.mode = viewState.mode;
    body.dataset.maskTexture = String(viewState.selectedMaskTextureId);
    body.style.setProperty("--mask-background-image", `url("${viewState.selectedMaskTexture.src}")`);
  }

  function refreshCoverRect() {
    if (!state.imageLoaded || !state.width || !state.height) {
      return;
    }

    state.coverRect = createCoverRect(
      state.width,
      state.height,
      state.image.naturalWidth,
      state.image.naturalHeight
    );
  }

  function handleImageLoad() {
    state.imageLoaded = true;
    refreshCoverRect();
  }

  function handleImageError() {
    state.imageLoaded = false;
  }

  function attach() {
    applyDocumentState();

    if (!viewState.isMaskMode) {
      return;
    }

    state.image.addEventListener("load", handleImageLoad);
    state.image.addEventListener("error", handleImageError);
    state.image.src = viewState.selectedMaskTexture.src;
  }

  function resize(width, height) {
    state.width = width;
    state.height = height;
    refreshCoverRect();
  }

  function isMaskReady() {
    return state.imageLoaded;
  }

  function drawMaskedCircle(ctx, drawPath, transform) {
    if (!state.imageLoaded) {
      return;
    }

    ctx.save();
    drawPath();
    ctx.clip();

    if (transform?.zoom && transform.zoom !== 1) {
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.zoom, transform.zoom);
      ctx.translate(-transform.x, -transform.y);
    }

    const { x, y, width, height } = state.coverRect;
    ctx.drawImage(state.image, x, y, width, height);
    ctx.restore();
  }

  function destroy() {
    state.image.removeEventListener("load", handleImageLoad);
    state.image.removeEventListener("error", handleImageError);
  }

  return {
    attach,
    resize,
    isMaskReady,
    drawMaskedCircle,
    destroy,
  };
}
