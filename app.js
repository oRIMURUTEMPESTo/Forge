let state = loadData();
let toastTimer;
let previewSide = "front";
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const allThemes = () => [...BUILTIN_THEMES, ...state.themes];
const getTheme = id => allThemes().find(theme => theme.id === id) || BUILTIN_THEMES[0];
function themeVariables(theme) {
  return `--frame:${theme.frame};--bright:${theme.bright};--art1:${theme.art1};--art2:${theme.art2}`;
}
function darkenHex(color, amount = .55) {
  return `#${[1, 3, 5].map(index => Math.round(parseInt(color.slice(index, index + 2), 16) * (1 - amount)).toString(16).padStart(2, "0")).join("")}`;
}
function abilityModifier(score) {
  if (score === "" || score === undefined || score === null || !Number.isFinite(Number(score))) return "—";
  const modifier = Math.floor((Number(score) - 10) / 2);
  return modifier >= 0 ? `+${modifier}` : String(modifier);
}
const activeDeck = () => state.decks.find(deck => deck.id === state.activeDeckId) || state.decks[0];
function activeCard() {
  const deck = activeDeck();
  return deck?.cards.find(card => card.id === deck.activeCardId) || deck?.cards[0];
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.querySelector(".save-state").innerHTML = '<span class="save-dot"></span> Guardado';
  } catch (error) {
    console.error("No se pudieron guardar los datos:", error);
    document.querySelector(".save-state").textContent = "Error al guardar";
    showToast("No hay espacio suficiente para guardar. Prueba quitando una ilustración.");
  }
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function render() {
  const deck = activeDeck();
  if (!deck) return;
  document.getElementById("deck-title").textContent = deck.name;
  document.getElementById("deck-list").innerHTML = state.decks.map(item =>
    `<button class="deck-item ${item.id === deck.id ? "active" : ""}" data-deck="${escapeHTML(item.id)}"><span class="deck-symbol">▧</span><span>${escapeHTML(item.name)}</span><small>${item.cards.length}</small></button>`
  ).join("");
  renderCard();
}
function renderModeFields(card) {
  const fields = MODES[card.mode].fields;
  let html = "";
  for (let index = 0; index < fields.length; index += 2) {
    const pair = fields.slice(index, index + 2);
    html += `<div class="field-row mode-field-row">${pair.map(([key, label, kind = "text", baseKey]) =>
      `<label class="field ${kind === "textarea" ? "field-wide" : ""} ${kind === "score" || kind === "modifier" ? "ability-field" : ""}">${label}${kind === "textarea"
        ? `<textarea data-detail="${key}" rows="3" maxlength="800" placeholder="Añade ${label.toLocaleLowerCase("es")}...">${escapeHTML(card.details[key] || "")}</textarea>`
        : kind === "modifier"
          ? `<output class="modifier-output" data-modifier-for="${baseKey}">${abilityModifier(card.details[baseKey])}</output>`
          : `<input data-detail="${key}" ${kind === "score" ? 'type="number" min="1" max="30" inputmode="numeric"' : ""} maxlength="${kind === "score" ? "2" : "100"}" value="${escapeHTML(card.details[key] || "")}" placeholder="${kind === "score" ? "—" : `Añade ${label.toLocaleLowerCase("es")}...`}" />`}</label>`
    ).join("")}</div>`;
  }
  document.getElementById("mode-fields").innerHTML = html;
}
function labelFor(mode, key) {
  return MODES[mode].fields.find(field => field[0] === key)?.[1] || ABILITIES.find(([ability]) => `${ability}Modifier` === key)?.[1].replace("Puntuación", "Modificador") || key;
}
function renderPreview(card) {
  const mode = MODES[card.mode];
  const primary = mode.stats.map(([label, key]) => [label, card.details[key]]).filter(([, value]) => value);
  const metadata = mode.meta.map(key => card.details[key]).filter(Boolean);
  const highlights = mode.highlights.map(key => [labelFor(card.mode, key), card.details[key]]).filter(([, value]) => value);
  const badge = {
    monster: [card.details.challenge || "—", "VD"],
    spell: [card.details.level || "—", "NIV"],
    item: [(card.details.rarity || "—").slice(0, 3).toLocaleUpperCase("es"), "RAR"],
    npc: ["PNJ", ""],
    encounter: [card.details.difficulty || "—", "DIF"]
  }[card.mode];
  const cardSize = CARD_SIZES[activeDeck().cardSize] || CARD_SIZES.poker;
  document.getElementById("preview-type").textContent = mode.label.toLocaleUpperCase("es");
  document.getElementById("preview-cost").textContent = badge[0];
  document.getElementById("preview-cost-unit").textContent = badge[1];
  document.getElementById("preview-name").textContent = card.name || "Carta sin nombre";
  document.getElementById("preview-meta").innerHTML = metadata.slice(0, 3).map(value => `<span>${escapeHTML(value)}</span>`).join("");
  document.getElementById("preview-description").textContent = card.description || "Añade una descripción o notas para esta ficha.";
  document.getElementById("preview-highlights").innerHTML = highlights.slice(0, 3).map(([label, value]) => `<p><b>${escapeHTML(label)}.</b> ${escapeHTML(value)}</p>`).join("");
  document.getElementById("preview-flavor").textContent = card.dmNote ? `DM · ${card.dmNote}` : "";
  document.getElementById("preview-stats").innerHTML = primary.map(([label, value]) => `<span>${escapeHTML(label)} <b>${escapeHTML(value)}</b></span>`).join("");
  const customIcon = state.customIcons.find(icon => icon.id === card.icon);
  const iconImage = document.getElementById("preview-custom-icon");
  iconImage.hidden = !customIcon;
  iconImage.src = customIcon?.image || "";
  document.getElementById("preview-icon").hidden = Boolean(customIcon);
  document.getElementById("preview-icon").textContent = customIcon ? "" : card.icon || "✧";
  const previewImage = document.getElementById("preview-image");
  previewImage.hidden = !card.image;
  previewImage.src = card.image || "";
  document.getElementById("preview-back").hidden = previewSide !== "back";
  document.getElementById("preview-front").hidden = previewSide !== "front";
  document.querySelectorAll(".side-toggle-button").forEach(button => button.classList.toggle("active", button.dataset.side === previewSide));
  const theme = getTheme(card.theme);
  const previewCard = document.getElementById("preview-card");
  previewCard.className = `playing-card theme-${theme.id} mode-${card.mode} ${cardSize.previewClass} ${previewSide === "back" ? "show-back" : ""}`;
  previewCard.style.cssText = themeVariables(theme);
  document.getElementById("preview-size").textContent = `${cardSize.label} · ${cardSize.width.toLocaleString("es")} × ${cardSize.height.toLocaleString("es")} mm`;
  document.getElementById("deck-card-size").value = activeDeck().cardSize;
  const frameOverlay = document.getElementById("preview-frame-overlay");
  frameOverlay.hidden = !theme.frameImage;
  frameOverlay.src = theme.frameImage || "";
  renderThemeGrid(card.theme);
  document.getElementById("back-mode").textContent = `${mode.label.toLocaleUpperCase("es")} · REVERSO`;
  document.getElementById("back-name").textContent = card.name || "Carta sin nombre";
  document.getElementById("back-description").textContent = card.description || "Sin descripción.";
  document.getElementById("back-dm-note").textContent = card.dmNote ? `Nota del DM: ${card.dmNote}` : "";
  document.getElementById("back-abilities").innerHTML = ABILITIES
    .filter(([key]) => ["monster", "npc"].includes(card.mode) && card.details[key] !== "")
    .map(([key, short]) => `<div class="ability-chip"><b>${short}</b><span>${abilityModifier(card.details[key])}</span><small>${escapeHTML(card.details[key])}</small></div>`).join("");
  document.getElementById("back-details").innerHTML = mode.fields
    .filter(([key, , kind]) => kind !== "score" && kind !== "modifier")
    .map(([key, label]) => [label, card.details[key]])
    .filter(([, value]) => value)
    .map(([label, value]) => `<p><b>${escapeHTML(label)}.</b> ${escapeHTML(value)}</p>`).join("");
  const backImage = document.getElementById("preview-back-image");
  backImage.hidden = !card.backImage;
  backImage.src = card.backImage || "";
  document.getElementById("back-image-controls").hidden = !card.backImage;
  document.getElementById("upload-area").hidden = Boolean(card.image);
  document.getElementById("image-controls").hidden = !card.image;
  document.getElementById("image-thumb").style.backgroundImage = card.image ? `url("${card.image}")` : "";
  document.getElementById("icon-picker").innerHTML = [
    ...ICONS.map(icon => `<button class="icon-choice ${icon === card.icon ? "active" : ""}" data-icon="${escapeHTML(icon)}" aria-label="Elegir icono ${escapeHTML(icon)}">${icon}</button>`),
    ...state.customIcons.map(icon => `<button class="icon-choice image-icon-choice ${icon.id === card.icon ? "active" : ""}" data-icon="${escapeHTML(icon.id)}" aria-label="Elegir icono ${escapeHTML(icon.name)}" title="${escapeHTML(icon.name)}"><img src="${icon.image}" alt="" /></button>`)
  ].join("");
  const deck = activeDeck();
  document.getElementById("card-strip").innerHTML = deck.cards.map(item =>
    `<button class="mini-card ${item.id === card.id ? "active" : ""}" style="--theme-frame:${getTheme(item.theme).frame};--theme-art:${getTheme(item.theme).art1}" data-card="${escapeHTML(item.id)}" aria-label="${escapeHTML(item.name)}">${escapeHTML(item.icon || "✧")}<span>${escapeHTML(item.name || "Sin nombre")}</span><small>${escapeHTML(MODES[item.mode].label)}</small></button>`
  ).join("");
  document.getElementById("card-count").innerHTML = `${String(deck.cards.indexOf(card) + 1).padStart(2, "0")} <span>/ ${String(deck.cards.length).padStart(2, "0")}</span>`;
}
document.querySelectorAll(".side-toggle-button").forEach(button => button.addEventListener("click", () => {
  previewSide = button.dataset.side;
  renderPreview(activeCard());
}));
function renderThemeGrid(selectedTheme) {
  document.getElementById("theme-grid").innerHTML = allThemes().map(theme =>
    `<button class="theme-option ${theme.id === selectedTheme ? "active" : ""}" data-theme="${theme.id}">
      <span class="theme-swatch" style="--theme-frame:${theme.frame};--theme-accent:${theme.bright};--theme-art:${theme.art1}"></span>
      <span>${escapeHTML(theme.name)}</span>
    </button>`
  ).join("");
}
function renderCard() {
  const card = activeCard();
  if (!card) return;
  activeDeck().activeCardId = card.id;
  document.getElementById("card-mode").value = card.mode;
  document.getElementById("card-name").value = card.name;
  document.getElementById("card-description").value = card.description;
  document.getElementById("card-flavor").value = card.dmNote;
    document.getElementById("deck-card-size").value = activeDeck().cardSize;
  renderModeFields(card);
  renderPreview(card);
}
function updateCard(key, value) {
  const card = activeCard();
  if (!card) return;
  card[key] = value;
  renderPreview(card);
  persist();
}
document.getElementById("card-mode").addEventListener("change", event => {
  const card = activeCard();
  card.mode = event.target.value;
  card.details = { ...DEFAULT_DETAILS[card.mode], ...card.details };
  if (!card.name || /^(Nuevo|Nueva) /.test(card.name)) card.name = `Nuevo ${MODES[card.mode].label.toLocaleLowerCase("es")}`;
  renderCard();
  persist();
});
document.getElementById("card-name").addEventListener("input", event => updateCard("name", event.target.value));
document.getElementById("card-description").addEventListener("input", event => updateCard("description", event.target.value));
document.getElementById("card-flavor").addEventListener("input", event => updateCard("dmNote", event.target.value));
document.getElementById("mode-fields").addEventListener("input", event => {
  const input = event.target.closest("[data-detail]");
  if (!input) return;
  activeCard().details[input.dataset.detail] = input.value;
  document.querySelectorAll("[data-modifier-for]").forEach(output => {
    output.textContent = abilityModifier(activeCard().details[output.dataset.modifierFor]);
  });
  renderPreview(activeCard());
  persist();
});
document.querySelectorAll(".editor-tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".editor-tab").forEach(item => item.classList.toggle("active", item === tab));
  document.querySelectorAll(".tab-panel").forEach(panel => {
    const selected = panel.id === `tab-${tab.dataset.tab}`;
    panel.hidden = !selected;
    panel.classList.toggle("active", selected);
  });
}));
document.getElementById("deck-list").addEventListener("click", event => {
  const button = event.target.closest("[data-deck]");
  if (!button) return;
  state.activeDeckId = button.dataset.deck;
  render();
  persist();
});
document.getElementById("card-strip").addEventListener("click", event => {
  const button = event.target.closest("[data-card]");
  if (!button) return;
  activeDeck().activeCardId = button.dataset.card;
  renderCard();
  persist();
});
document.getElementById("icon-picker").addEventListener("click", event => {
  const button = event.target.closest("[data-icon]");
  if (!button) return;
  activeCard().icon = button.dataset.icon;
  renderPreview(activeCard());
  persist();
});
document.getElementById("theme-grid").addEventListener("click", event => {
  const button = event.target.closest("[data-theme]");
  if (!button) return;
  activeCard().theme = button.dataset.theme;
  renderPreview(activeCard());
  persist();
});
document.getElementById("deck-card-size").addEventListener("change", event => {
  const size = CARD_SIZES[event.target.value] ? event.target.value : "poker";
  activeDeck().cardSize = size;
  renderPreview(activeCard());
  persist();
});
document.getElementById("create-theme").addEventListener("click", async () => {
  const nameInput = document.getElementById("theme-name");
  const name = nameInput.value.trim();
  if (!name) {
    showToast("Escribe un nombre para el tema.");
    nameInput.focus();
    return;
  }
  const frame = document.getElementById("theme-frame").value;
  const bright = document.getElementById("theme-accent").value;
  const art1 = document.getElementById("theme-art").value;
  if (![frame, bright, art1].every(color => HEX_COLOR.test(color))) {
    showToast("Elige colores válidos para crear el tema.");
    return;
  }
  const baseId = `custom-${slug(name)}`;
  let id = baseId;
  let suffix = 2;
  while (allThemes().some(theme => theme.id === id)) id = `${baseId}-${suffix++}`;
  const frameFile = document.getElementById("theme-frame-file").files[0];
  if (frameFile && (frameFile.size > 5 * 1024 * 1024 || !["image/png", "image/webp"].includes(frameFile.type))) {
    showToast("El marco debe ser PNG/WebP y pesar menos de 5 MB.");
    return;
  }
  let frameImage = "";
  if (frameFile) {
    try { frameImage = await compressImage(frameFile, 800, "image/png", 1, [800, 1120]); }
    catch (error) { console.error("No se pudo procesar el marco:", error); showToast("No se pudo procesar el marco de carta."); return; }
  }
  const theme = { id, name: name.slice(0, 24), frame, bright, art1, art2: darkenHex(art1), frameImage };
  state.themes.push(theme);
  activeCard().theme = theme.id;
  nameInput.value = "";
  document.getElementById("theme-frame-file").value = "";
  document.querySelector(".theme-creator").open = false;
  renderPreview(activeCard());
  persist();
  showToast(`Tema «${theme.name}» guardado y aplicado.`);
});

function addCard() {
  const card = makeCard(document.getElementById("card-mode").value);
  activeDeck().cards.push(card);
  activeDeck().activeCardId = card.id;
  render();
  persist();
  document.querySelector('.editor-tab[data-tab="details"]').click();
  document.getElementById("card-name").focus();
  document.getElementById("card-name").select();
}
document.getElementById("new-card").addEventListener("click", addCard);
document.getElementById("strip-add").addEventListener("click", addCard);

const modal = document.getElementById("modal-backdrop");
let deckModalMode = "create";
function openDeckModal() {
  deckModalMode = "create";
  document.getElementById("modal-eyebrow").textContent = "NUEVO MAZO";
  document.getElementById("modal-title").textContent = "Abre un nuevo capítulo.";
  document.getElementById("modal-create").textContent = "Crear mazo";
  document.getElementById("deck-name-input").value = "";
  modal.hidden = false;
  document.getElementById("deck-name-input").focus();
}
function renameDeck() {
  deckModalMode = "rename";
  document.getElementById("modal-eyebrow").textContent = "EDITAR MAZO";
  document.getElementById("modal-title").textContent = "Cambia el nombre del mazo.";
  document.getElementById("modal-create").textContent = "Guardar nombre";
  document.getElementById("deck-name-input").value = activeDeck().name;
  modal.hidden = false;
  document.getElementById("deck-name-input").focus();
  document.getElementById("deck-name-input").select();
}
function closeDeckModal() { modal.hidden = true; }
const deckMenu = document.getElementById("deck-menu");
document.getElementById("deck-menu-toggle").addEventListener("click", () => {
  deckMenu.hidden = !deckMenu.hidden;
  document.getElementById("deck-menu-toggle").setAttribute("aria-expanded", String(!deckMenu.hidden));
});
deckMenu.addEventListener("click", event => {
  const action = event.target.closest("[data-deck-action]")?.dataset.deckAction;
  if (!action) return;
  deckMenu.hidden = true;
  document.getElementById("deck-menu-toggle").setAttribute("aria-expanded", "false");
  if (action === "rename") renameDeck();
  if (action === "duplicate") {
    const source = activeDeck();
    const activeIndex = source.cards.findIndex(card => card.id === source.activeCardId);
    const copy = {
      id: makeId(), name: `${source.name} (copia)`,
      cards: source.cards.map(card => ({ ...JSON.parse(JSON.stringify(card)), id: makeId() })),
      cardSize: source.cardSize
    };
    copy.activeCardId = copy.cards[Math.max(0, activeIndex)].id;
    state.decks.push(copy);
    state.activeDeckId = copy.id;
    render();
    persist();
    showToast("Mazo duplicado; el original no se modificó.");
  }
  if (action === "delete") {
    const deletedName = activeDeck().name;
    if (!window.confirm(`¿Eliminar el mazo «${deletedName}» y todas sus cartas? Esta acción no se puede deshacer.`)) return;
    state.decks = state.decks.filter(deck => deck.id !== state.activeDeckId);
    if (!state.decks.length) {
      const card = makeCard();
      const replacement = { id: makeId(), name: "Nuevo mazo", cards: [card], activeCardId: card.id, cardSize: "poker" };
      state.decks.push(replacement);
    }
    state.activeDeckId = state.decks[0].id;
    render();
    persist();
    showToast("Mazo eliminado.");
  }
});
document.getElementById("add-deck").addEventListener("click", openDeckModal);
document.getElementById("modal-close").addEventListener("click", closeDeckModal);
document.getElementById("modal-cancel").addEventListener("click", closeDeckModal);
modal.addEventListener("click", event => { if (event.target === modal) closeDeckModal(); });
document.getElementById("modal-create").addEventListener("click", () => {
  const name = document.getElementById("deck-name-input").value.trim();
  if (!name) { document.getElementById("deck-name-input").focus(); return; }
  if (deckModalMode === "rename") {
    activeDeck().name = name;
    closeDeckModal();
    render();
    persist();
    showToast("Nombre del mazo actualizado.");
    return;
  }
  const firstCard = makeCard();
  const deck = { id: makeId(), name, cards: [firstCard], activeCardId: firstCard.id };
  state.decks.push(deck);
  state.activeDeckId = deck.id;
  closeDeckModal();
  render();
  persist();
});
document.getElementById("deck-name-input").addEventListener("keydown", event => {
  if (event.key === "Enter") document.getElementById("modal-create").click();
});
document.getElementById("delete-card").addEventListener("click", () => {
  const deck = activeDeck();
  if (deck.cards.length === 1) { showToast("Cada mazo debe tener al menos una carta."); return; }
  const index = deck.cards.findIndex(card => card.id === deck.activeCardId);
  deck.cards.splice(index, 1);
  deck.activeCardId = deck.cards[Math.max(0, index - 1)].id;
  render();
  persist();
  showToast("Carta eliminada.");
});
