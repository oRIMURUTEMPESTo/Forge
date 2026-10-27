document.getElementById("choose-art").addEventListener("click", () => document.getElementById("art-file").click());
document.getElementById("art-file").addEventListener("change", event => {
  if (event.target.files[0]) readImage(event.target.files[0]);
  event.target.value = "";
});
function readImage(file) {
  if (!file.type.startsWith("image/")) { showToast("Elige un archivo de imagen válido."); return; }
  if (file.size > 5 * 1024 * 1024) { showToast("La imagen debe pesar menos de 5 MB."); return; }
  const reader = new FileReader();
  reader.onerror = () => showToast("No se pudo leer la imagen.");
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => showToast("No se pudo procesar la imagen.");
    image.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) { showToast("No se pudo procesar la imagen."); return; }
        const compressed = new FileReader();
        compressed.onerror = () => showToast("No se pudo guardar la imagen.");
        compressed.onload = () => {             activeCard().image = compressed.result; renderPreview(activeCard()); persist(); };
        compressed.readAsDataURL(blob);
      }, "image/webp", 0.82);
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}
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
document.getElementById("back-art-file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    showToast("La imagen debe ser válida y pesar menos de 5 MB.");
    event.target.value = "";
    return;
  }
  try {
    activeCard().backImage = await compressImage(file, 1200, "image/webp", 0.82);
    renderPreview(activeCard());
    persist();
    showToast("Imagen del reverso añadida.");
  } catch (error) {
    console.error("No se pudo procesar la imagen del reverso:", error);
    showToast("No se pudo procesar la imagen del reverso.");
  }
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
