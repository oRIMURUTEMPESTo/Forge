function exportCardJSON(card) {
  const details = Object.fromEntries(MODES[card.mode].fields.map(([key, , kind, baseKey]) => [
    key, kind === "modifier" ? abilityModifier(card.details[baseKey]) : card.details[key] || ""
  ]));
  const theme = getTheme(card.theme);
  const customIcon = state.customIcons.find(icon => icon.id === card.icon);
  const result = {
    name: card.name, type: card.mode, description: card.description,
    cardSize: activeDeck().cardSize,
    dmNote: card.dmNote, details, icon: customIcon ? { name: customIcon.name, image: customIcon.image } : card.icon,
    theme: {
      name: theme.name,
      colors: { frame: theme.frame, accent: theme.bright, illustration: theme.art1 },
      frameImage: theme.frameImage || ""
    }
  };
  if (card.image) result.artwork = card.image;
  if (card.backImage) result.backArtwork = card.backImage;
  return result;
}
function downloadJSON(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function slug(value) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "fable-forge";
}
function exportCardJSONFile() {
  const card = activeCard();
  downloadJSON({ format: "fable-forge-dnd5e-card", version: 1, card: exportCardJSON(card) }, `${slug(card.name)}.json`);
  showToast("JSON de carta exportado.");
}
function exportDeckJSON() {
  const deck = activeDeck();
  downloadJSON({
    format: "fable-forge-dnd5e-deck", version: 1,
    deck: { name: deck.name, cardSize: deck.cardSize, cards: deck.cards.map(exportCardJSON) }
  }, `${slug(deck.name)}.json`);
  showToast("JSON del mazo exportado.");
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text).split(/\s+/);
  let line = "", lines = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
      if (++lines >= maxLines) break;
    } else line = next;
  }
  if (lines < maxLines && line) ctx.fillText(line, x, y);
}
async function exportWebP() {
  const card = activeCard();
  const theme = getTheme(card.theme);
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 560;
  const ctx = canvas.getContext("2d");
  const palette = [theme.frame, theme.bright, theme.art1, theme.art2];
  ctx.fillStyle = palette[0]; ctx.fillRect(0, 0, 400, 560);
  ctx.fillStyle = "#141b16"; ctx.fillRect(12, 12, 376, 536);
  ctx.strokeStyle = palette[1]; ctx.lineWidth = 3; ctx.strokeRect(17, 17, 366, 526);
  ctx.fillStyle = "#d5d8c7"; ctx.font = "bold 13px sans-serif";
  ctx.fillText(MODES[card.mode].label.toLocaleUpperCase("es"), 32, 42);
  ctx.fillStyle = palette[1]; ctx.font = "bold 14px sans-serif";
  ctx.fillText((card.details.challenge || card.details.level || card.details.rarity || card.details.difficulty || "").slice(0, 16), 300, 42);
  const x = 30, y = 57, w = 340, h = Math.round(340 / CROP_PRESETS.front.aspect);
  const artGradient = ctx.createLinearGradient(x, y, x + w, y + h);
  artGradient.addColorStop(0, palette[2]); artGradient.addColorStop(1, palette[3]);
  ctx.fillStyle = artGradient; ctx.fillRect(x, y, w, h);
  if (card.image) {
    const image = new Image();
    image.src = card.image;
    try { await image.decode(); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(image, x, y, w, h); ctx.restore(); }
    catch (error) { console.error("No se pudo dibujar la imagen de la carta:", error); }
  } else {
    const customIcon = state.customIcons.find(icon => icon.id === card.icon);
    if (customIcon) {
      const image = new Image();
      image.src = customIcon.image;
      try { await image.decode(); ctx.drawImage(image, 125, 112, 150, 150); }
      catch (error) { console.error("No se pudo dibujar el icono personalizado:", error); }
    } else {
    ctx.fillStyle = palette[1]; ctx.textAlign = "center"; ctx.font = "100px Georgia";
    ctx.fillText(card.icon || "✧", 200, 220); ctx.textAlign = "left";
    }
  }
  ctx.strokeStyle = palette[1]; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#f0e9d8"; ctx.font = "22px Georgia"; ctx.fillText(card.name.slice(0, 27), 32, 332);
  ctx.strokeStyle = `${palette[1]}aa`; ctx.beginPath(); ctx.moveTo(32, 345); ctx.lineTo(368, 345); ctx.stroke();
  ctx.fillStyle = "#c5c6b8"; ctx.font = "13px sans-serif";
  wrapText(ctx, card.description || "Sin descripción.", 36, 370, 328, 18, 3);
  let yPos = 435;
  for (const [key] of MODES[card.mode].fields) {
    const value = card.details[key];
    if (!value || yPos > 500) continue;
    const label = labelFor(card.mode, key);
    ctx.fillStyle = palette[1]; ctx.font = "bold 10px sans-serif"; ctx.fillText(`${label}:`, 36, yPos);
    ctx.fillStyle = "#c5c6b8"; ctx.font = "10px sans-serif"; wrapText(ctx, value, 137, yPos, 225, 12, 1);
    yPos += 17;
  }
  ctx.fillStyle = "#af9d70"; ctx.font = "italic 10px Georgia";
  if (card.dmNote) wrapText(ctx, `DM: ${card.dmNote}`, 36, 520, 325, 13, 1);
  if (theme.frameImage) {
    const frame = new Image();
    frame.src = theme.frameImage;
    try { await frame.decode(); ctx.drawImage(frame, 0, 0, 400, 560); }
    catch (error) { console.error("No se pudo dibujar el marco personalizado:", error); showToast("No se pudo dibujar el marco personalizado en WebP."); }
  }
  canvas.toBlob(blob => {
    if (!blob) { showToast("No se pudo exportar la carta."); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${slug(card.name)}.webp`; link.click();
    URL.revokeObjectURL(url);
    showToast("Carta exportada como WebP (400 × 560 px).");
  }, "image/webp", 0.92);
}

function printCardHTML(card, side = "front") {
  const mode = MODES[card.mode];
  const theme = getTheme(card.theme);
  const meta = mode.meta.map(key => card.details[key]).filter(Boolean);
  const stats = mode.stats.map(([label, key]) => card.details[key] && `<span><b>${escapeHTML(label)}</b> ${escapeHTML(card.details[key])}</span>`).filter(Boolean).join("");
  const image = card.image ? `<img class="art-image" src="${escapeHTML(card.image)}" alt="" />` : state.customIcons.some(icon => icon.id === card.icon)
    ? `<img class="art-image icon-art" src="${escapeHTML(state.customIcons.find(icon => icon.id === card.icon).image)}" alt="" />`
    : `<div class="art-icon">${escapeHTML(card.icon || "✧")}</div>`;
  const frame = theme.frameImage ? `<img class="frame-overlay" src="${escapeHTML(theme.frameImage)}" alt="" />` : "";
  const scoreKeys = new Set(ABILITIES.map(([key]) => key));
  const rank = {
    monster: ["VD", card.details.challenge],
    spell: ["NIV", card.details.level],
    item: ["RAR", (card.details.rarity || "").slice(0, 3).toLocaleUpperCase("es")],
    npc: ["", "PNJ"],
    encounter: ["DIF", card.details.difficulty]
  }[card.mode];
  const abilityGrid = ["monster", "npc"].includes(card.mode)
    ? `<div class="abilities-grid">${ABILITIES.map(([key, short]) => `<span><b>${short}</b><strong>${abilityModifier(card.details[key])}</strong><small>${escapeHTML(card.details[key] || "—")}</small></span>`).join("")}</div>`
    : "";
  const details = mode.fields.map(([key, label, kind, baseKey]) => {
    if (kind === "score" || kind === "modifier" || scoreKeys.has(key)) return "";
    const value = kind === "modifier" ? abilityModifier(card.details[baseKey]) : card.details[key];
    return value ? `<p><b>${escapeHTML(label)}.</b> ${escapeHTML(value)}</p>` : "";
  }).filter(Boolean).join("");
  const cardContent = side === "front"
    ? `<header><span>${escapeHTML(mode.label.toLocaleUpperCase("es"))}</span><span class="card-rank">${rank[0] ? `<small>${escapeHTML(rank[0])}</small>` : ""}<b>${escapeHTML(rank[1] || "—")}</b></span></header>
       <div class="art">${image}</div><h2>${escapeHTML(card.name)}</h2><p class="meta">${escapeHTML(meta.join(" · "))}</p>
       <p class="description">${escapeHTML(card.description)}</p>
       <section class="front-highlights">${mode.highlights.map(key => card.details[key] && `<p><b>${escapeHTML(labelFor(card.mode, key))}.</b> ${escapeHTML(card.details[key])}</p>`).filter(Boolean).slice(0, 3).join("")}</section>
       <footer>${stats || `<span>${escapeHTML(mode.label)}</span>`}</footer>`
    : `<header><span>${escapeHTML(mode.label.toLocaleUpperCase("es"))} · REVERSO</span><b>FABLE FORGE</b></header>
       <h2>${escapeHTML(card.name)}</h2>${card.backImage ? `<img class="back-art" src="${escapeHTML(card.backImage)}" alt="" />` : ""}
       ${card.description ? `<p class="description back-description">${escapeHTML(card.description)}</p>` : ""}
       ${abilityGrid}<section class="details">${details}</section>
       ${card.dmNote ? `<p class="note"><b>DM:</b> ${escapeHTML(card.dmNote)}</p>` : ""}
       <footer><span>${escapeHTML(meta.join(" · ") || mode.label)}</span><span>REVERSO</span></footer>`;
  return `<article class="print-card ${side}-print-card" style="${themeVariables(theme)}">${cardContent}${frame}</article>`;
}
function printHTML(cards, title, deckMode, sizeId) {
  const size = CARD_SIZES[sizeId] || CARD_SIZES.poker;
  const pages = [];
  const chunkSize = deckMode ? size.cardsPerSheet : 1;
  for (let index = 0; index < cards.length; index += chunkSize) {
    const group = cards.slice(index, index + chunkSize);
    for (const side of ["front", "back"]) {
      pages.push(`<section class="sheet ${deckMode ? "" : "single"} ${side}-sheet">${group.map(card => printCardHTML(card, side)).join("")}</section>`);
    }
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHTML(title)}</title>
  <style>
    @page { size: A4 ${size.page}; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #24231f; font: 8pt Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width: ${size.page === "landscape" ? "281mm" : "194mm"}; min-height: ${size.page === "landscape" ? "194mm" : "281mm"}; display: grid; grid-template-columns: repeat(${size.columns}, ${size.width}mm); grid-auto-rows: ${size.height}mm; justify-content: center; align-content: start; gap: 4mm; page-break-after: always; break-after: page; }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .sheet.single { grid-template-columns: ${size.width}mm; align-items: center; }
    .print-card { --frame: #718154; --bright: #b7a16b; --art1:#49624a; --art2:#1e2b21; position:relative; width: ${size.width}mm; height: ${size.height}mm; overflow: hidden; display: flex; flex-direction: column; padding: 2mm; border: 1.2mm solid var(--frame); border-radius: 2mm; background: #f5f0e1; color: #25271f; }
    .print-card header { display:flex; justify-content:space-between; align-items:flex-start; gap:2mm; min-height:5mm; font-size:6pt; font-weight:bold; text-transform:uppercase; }
    .print-card header > span:first-child { overflow:hidden; }
    .print-card .card-rank { display:flex; align-items:center; gap:1.5mm; flex:0 0 auto; color:var(--frame); }
    .print-card .card-rank small { font-size:5pt; }
    .print-card .card-rank b { color:var(--frame); text-align:right; font-size:7pt; }
    .art { position:relative; width:100%; aspect-ratio:1.9; height:auto; flex:0 0 auto; overflow:hidden; display:grid; place-items:center; background:linear-gradient(145deg,var(--art1),var(--art2)); border: .6mm solid var(--bright); }
    .art-image { width:100%; height:100%; object-fit:cover; }.art-icon { color:#eee0af; font:36pt Georgia,serif; }
    .icon-art { object-fit:contain; padding:7mm; background:linear-gradient(145deg,var(--art1),var(--art2)); }
    .print-card h2 { font: bold 10pt Georgia,serif; margin:1.5mm 0 .5mm; }
    .meta { margin:0 0 1mm; color:var(--frame); font-size:6pt; font-style:italic; }
    .description { margin:0 0 1mm; font-size:6.5pt; line-height:1.2; }
    .details { overflow:hidden; flex:1; border-top:.3mm solid var(--bright); padding-top:1mm; font-size:5.7pt; line-height:1.18; }
    .details p { margin:0 0 .7mm; white-space:pre-wrap; overflow-wrap:anywhere; }
    .note { margin:0; color:#644d34; font-size:5.5pt; font-style:italic; max-height:5mm; overflow:hidden; }
    .print-card footer { min-height:5mm; display:flex; justify-content:space-around; align-items:center; gap:1mm; border-top:.3mm solid var(--bright); color:#463f30; font-size:5.5pt; }
    .print-card footer span { text-align:center; }
    .front-highlights { overflow:hidden; flex:1; font-size:5.7pt; line-height:1.15; }.front-highlights p { margin:0 0 .7mm; }
    .back-print-card h2 { font-size:8pt; margin:1mm 0; }.back-description { max-height:16mm; overflow:hidden; }
    .back-art { width:100%; aspect-ratio:3.6; height:auto; object-fit:cover; margin:0 0 1mm; }
    .abilities-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:.5mm; margin:1mm 0; text-align:center; }
    .abilities-grid span { display:grid; justify-items:center; padding:.7mm 0; background:#e9e2d0; }
    .abilities-grid b { font-size:5pt; }.abilities-grid strong { color:var(--frame); font-size:9pt; line-height:1.1; }.abilities-grid small { color:#555; font-size:4.5pt; }
    .back-print-card .details { min-height:0; }.frame-overlay { position:absolute; inset:0; z-index:2; width:100%; height:100%; pointer-events:none; }
    @media screen { body { background:#ddd; padding:8mm; }.sheet { margin:0 auto 10mm; background:white; box-shadow:0 2mm 7mm #0003; } }
    @media print { .sheet { margin:0; box-shadow:none; } }
  </style></head><body>${pages.join("")}</body></html>`;
}
function printPDF(deckMode) {
  const deck = activeDeck();
  const cards = deckMode ? deck.cards : [activeCard()];
  const title = deckMode ? deck.name : activeCard().name;
  const size = CARD_SIZES[deck.cardSize] || CARD_SIZES.poker;
  document.getElementById("print-title").textContent = `${title} · ${cards.length} ${cards.length === 1 ? "carta" : "cartas"}`;
  const dimensions = `${size.width.toLocaleString("es")} × ${size.height.toLocaleString("es")} mm`;
  document.getElementById("print-subtitle").textContent = `${deckMode ? `Doble cara · ${size.cardsPerSheet} cartas por hoja A4 ${size.page}` : "2 páginas"} · ${size.label} ${dimensions}`;
  document.getElementById("print-frame").srcdoc = printHTML(cards, title, deckMode, deck.cardSize);
  document.getElementById("print-backdrop").hidden = false;
}
document.getElementById("print-close").addEventListener("click", () => { document.getElementById("print-backdrop").hidden = true; });
document.getElementById("print-action").addEventListener("click", () => {
  const frame = document.getElementById("print-frame");
  frame.contentWindow.focus();
  frame.contentWindow.print();
});
const exportMenu = document.getElementById("export-menu");
document.getElementById("export-button").addEventListener("click", () => {
  exportMenu.hidden = !exportMenu.hidden;
  document.getElementById("export-button").setAttribute("aria-expanded", String(!exportMenu.hidden));
});
exportMenu.addEventListener("click", event => {
  const button = event.target.closest("[data-export]");
  if (!button) return;
  exportMenu.hidden = true;
  document.getElementById("export-button").setAttribute("aria-expanded", "false");
  switch (button.dataset.export) {
    case "json-card": exportCardJSONFile(); break;
    case "json-deck": exportDeckJSON(); break;
    case "webp": exportWebP(); break;
    case "pdf-card": printPDF(false); break;
    case "pdf-deck": printPDF(true); break;
  }
});
document.addEventListener("click", event => {
  if (!event.target.closest(".export-wrap")) {
    exportMenu.hidden = true;
    document.getElementById("export-button").setAttribute("aria-expanded", "false");
  }
  if (!event.target.closest(".deck-menu-wrap")) {
    deckMenu.hidden = true;
    document.getElementById("deck-menu-toggle").setAttribute("aria-expanded", "false");
  }
});
