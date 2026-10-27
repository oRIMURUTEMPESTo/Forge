document.getElementById("backup-button").addEventListener("click", () => {
  downloadJSON(state, "fable-forge-copia-completa.json");
  showToast("Copia de seguridad completa descargada.");
});
document.getElementById("import-button").addEventListener("click", () => document.getElementById("import-file").click());
document.getElementById("import-file").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => showToast("No se pudo leer el archivo.");
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.decks) || !imported.decks.length || !imported.decks.every(deck => typeof deck.name === "string" && Array.isArray(deck.cards))) {
        throw new Error("Formato de copia no válido.");
      }
      state = normalizeData(imported);
      render();
      persist();
      showToast("Datos importados correctamente.");
    } catch (error) {
      console.error("Error al importar datos:", error);
      showToast("El archivo no contiene una copia completa válida de Fable Forge.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!modal.hidden) closeDeckModal();
    exportMenu.hidden = true;
    deckMenu.hidden = true;
    document.getElementById("print-backdrop").hidden = true;
  }
});
