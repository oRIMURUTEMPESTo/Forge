const CROP_PRESETS = {
  front: { aspect: 1.9, label: "frontal", width: 1200 },
  back: { aspect: 3.6, label: "trasera", width: 1200 }
};
const cropBackdrop = document.getElementById("crop-backdrop");
const cropStage = document.getElementById("crop-stage");
const cropViewport = document.getElementById("crop-viewport");
const cropImage = document.getElementById("crop-image");
const cropZoom = document.getElementById("crop-zoom");
let cropSession = null;

function readImage(file, side = "front") {
  if (!file.type.startsWith("image/")) { showToast("Elige un archivo de imagen válido."); return; }
  if (file.size > 5 * 1024 * 1024) { showToast("La imagen debe pesar menos de 5 MB."); return; }
  const reader = new FileReader();
  reader.onerror = () => showToast("No se pudo leer la imagen.");
  reader.onload = () => openCropper(reader.result, side);
  reader.readAsDataURL(file);
}
function openCropper(imageSource, side) {
  const image = new Image();
  image.onerror = () => showToast("No se pudo procesar la imagen.");
  image.onload = () => {
    const preset = CROP_PRESETS[side];
    cropBackdrop.hidden = false;
    const dialog = cropBackdrop.querySelector(".crop-dialog");
    const dialogStyle = getComputedStyle(dialog);
    const availableWidth = dialog.clientWidth - parseFloat(dialogStyle.paddingLeft) - parseFloat(dialogStyle.paddingRight) - 2;
    const stageWidth = Math.min(520, availableWidth);
    const width = stageWidth - 40;
    const height = width / preset.aspect;
    cropSession = {
      image, side, preset, width, height, stageWidth, stageHeight: height + 40, zoom: 1, offsetX: 0, offsetY: 0, pointer: null
    };
    cropStage.style.width = `${stageWidth}px`;
    cropStage.style.height = `${height + 40}px`;
    cropViewport.style.width = `${width}px`;
    cropViewport.style.height = `${height}px`;
    document.getElementById("crop-title").textContent = `Encuadra la ilustración ${preset.label}`;
    document.getElementById("crop-description").textContent = `${image.naturalWidth} × ${image.naturalHeight} px · arrastra para ajustar el encuadre.`;
    cropImage.src = imageSource;
    cropZoom.value = "1";
    document.getElementById("crop-zoom-value").textContent = "100 %";
    document.getElementById("crop-apply").focus();
    renderCropImage();
  };
  image.src = imageSource;
}
function renderCropImage() {
  if (!cropSession) return;
  const { image, width, height, zoom, offsetX, offsetY } = cropSession;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  const maxX = Math.max(0, (imageWidth - width) / 2);
  const maxY = Math.max(0, (imageHeight - height) / 2);
  cropSession.offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
  cropSession.offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
  cropImage.style.width = `${imageWidth}px`;
  cropImage.style.height = `${imageHeight}px`;
  cropImage.style.left = `${(cropSession.stageWidth - imageWidth) / 2 + cropSession.offsetX}px`;
  cropImage.style.top = `${(cropSession.stageHeight - imageHeight) / 2 + cropSession.offsetY}px`;
}
function closeCropper() {
  cropBackdrop.hidden = true;
  cropSession = null;
  cropImage.removeAttribute("src");
}
function fileAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo guardar el recorte."));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
document.getElementById("crop-zoom").addEventListener("input", event => {
  if (!cropSession) return;
  cropSession.zoom = Number(event.target.value);
  document.getElementById("crop-zoom-value").textContent = `${Math.round(cropSession.zoom * 100)} %`;
  renderCropImage();
});
cropViewport.addEventListener("pointerdown", event => {
  if (!cropSession) return;
  cropSession.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  cropViewport.setPointerCapture(event.pointerId);
  cropViewport.classList.add("is-dragging");
});
cropViewport.addEventListener("pointermove", event => {
  if (!cropSession?.pointer || cropSession.pointer.id !== event.pointerId) return;
  cropSession.offsetX += event.clientX - cropSession.pointer.x;
  cropSession.offsetY += event.clientY - cropSession.pointer.y;
  cropSession.pointer.x = event.clientX;
  cropSession.pointer.y = event.clientY;
  renderCropImage();
});
cropViewport.addEventListener("pointerup", event => {
  if (cropSession?.pointer?.id !== event.pointerId) return;
  cropSession.pointer = null;
  cropViewport.classList.remove("is-dragging");
});
cropViewport.addEventListener("pointercancel", () => {
  if (!cropSession) return;
  cropSession.pointer = null;
  cropViewport.classList.remove("is-dragging");
});
document.getElementById("crop-close").addEventListener("click", closeCropper);
document.getElementById("crop-cancel").addEventListener("click", closeCropper);
document.getElementById("crop-apply").addEventListener("click", async () => {
  if (!cropSession) return;
  const button = document.getElementById("crop-apply");
  button.disabled = true;
  try {
    const { image, width, height, zoom, offsetX, offsetY, side, preset } = cropSession;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    const sourceX = ((imageWidth - width) / 2 - offsetX) / scale;
    const sourceY = ((imageHeight - height) / 2 - offsetY) / scale;
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const canvas = document.createElement("canvas");
    canvas.width = preset.width;
    canvas.height = Math.round(preset.width / preset.aspect);
    canvas.getContext("2d").drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob) throw new Error("No se pudo generar el recorte.");
    activeCard()[side === "front" ? "image" : "backImage"] = await fileAsDataURL(blob);
    closeCropper();
    renderPreview(activeCard());
    persist();
    showToast(`Recorte ${preset.label} aplicado.`);
  } catch (error) {
    console.error("No se pudo aplicar el recorte:", error);
    showToast("No se pudo guardar el recorte. Inténtalo de nuevo.");
  } finally {
    button.disabled = false;
  }
});
document.getElementById("choose-art").addEventListener("click", () => document.getElementById("art-file").click());
document.getElementById("choose-art-again").addEventListener("click", () => document.getElementById("art-file").click());
document.getElementById("recrop-art").addEventListener("click", () => {
  if (activeCard().image) openCropper(activeCard().image, "front");
});
document.getElementById("art-file").addEventListener("change", event => {
  if (event.target.files[0]) readImage(event.target.files[0], "front");
  event.target.value = "";
});
function compressImage(file, maxDimension, mimeType, quality, exactSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("No se pudo abrir la imagen."));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        if (exactSize) {
          canvas.width = exactSize[0];
          canvas.height = exactSize[1];
          const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
          const width = Math.round(image.naturalWidth * scale);
          const height = Math.round(image.naturalHeight * scale);
          canvas.getContext("2d").drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        } else {
          const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        }
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error("No se pudo optimizar la imagen.")); return; }
          const compressed = new FileReader();
          compressed.onerror = () => reject(new Error("No se pudo guardar la imagen."));
          compressed.onload = () => resolve(compressed.result);
          compressed.readAsDataURL(blob);
        }, mimeType, quality);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
document.getElementById("upload-icon").addEventListener("click", () => document.getElementById("custom-icon-file").click());
document.getElementById("custom-icon-file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  const nameInput = document.getElementById("custom-icon-name");
  const name = nameInput.value.trim() || file.name.replace(/\.[^.]+$/, "").slice(0, 24);
  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    showToast("El icono debe ser una imagen de menos de 5 MB.");
    event.target.value = "";
    return;
  }
  try {
    const image = await compressImage(file, 256, "image/webp", 0.9);
    const baseId = `icon-${slug(name)}`;
    let id = baseId, suffix = 2;
    while (state.customIcons.some(icon => icon.id === id)) id = `${baseId}-${suffix++}`;
    state.customIcons.push({ id, name: name.slice(0, 24), image });
    activeCard().icon = id;
    nameInput.value = "";
    event.target.value = "";
    renderPreview(activeCard());
    persist();
    showToast(`Icono «${name}» añadido.`);
  } catch (error) {
    console.error("No se pudo procesar el icono:", error);
    showToast("No se pudo procesar el icono.");
  }
});
document.getElementById("choose-back-art").addEventListener("click", () => document.getElementById("back-art-file").click());
document.getElementById("choose-back-art-again").addEventListener("click", () => document.getElementById("back-art-file").click());
document.getElementById("recrop-back-art").addEventListener("click", () => {
  if (activeCard().backImage) openCropper(activeCard().backImage, "back");
});
document.getElementById("back-art-file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    showToast("La imagen debe ser válida y pesar menos de 5 MB.");
    event.target.value = "";
    return;
  }
  readImage(file, "back");
  event.target.value = "";
});
document.getElementById("remove-back-art").addEventListener("click", () => {
  activeCard().backImage = "";
  renderPreview(activeCard());
  persist();
});
const uploadArea = document.getElementById("upload-area");
uploadArea.addEventListener("dragover", event => { event.preventDefault(); uploadArea.classList.add("dragging"); });
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragging"));
uploadArea.addEventListener("drop", event => {
  event.preventDefault();
  uploadArea.classList.remove("dragging");
  if (event.dataTransfer.files[0]) readImage(event.dataTransfer.files[0]);
});
document.getElementById("remove-art").addEventListener("click", () => {
  activeCard().image = "";
  renderPreview(activeCard());
  persist();
});
