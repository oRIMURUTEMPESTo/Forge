const STORAGE_KEY = "fable-forge-data-v1";
const ICONS = ["✧", "⚔", "🛡", "🐉", "🌙", "☀", "🌿", "🔥", "❄", "🦉", "🗝", "💎", "🦊", "⚡", "🌹", "☠"];
const BUILTIN_THEMES = [
  { id: "verdant", name: "Esmeralda", frame: "#718154", bright: "#d8c78f", art1: "#49624a", art2: "#1e2b21" },
  { id: "ember", name: "Ascua", frame: "#9c5e3a", bright: "#d6a36f", art1: "#75412f", art2: "#2b1d1b" },
  { id: "arcane", name: "Arcano", frame: "#6a5386", bright: "#c0a3d8", art1: "#55416c", art2: "#201b31" },
  { id: "frost", name: "Escarcha", frame: "#527984", bright: "#a9cad0", art1: "#3d6570", art2: "#1b2a30" }
];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const BUILTIN_THEME_IDS = new Set(BUILTIN_THEMES.map(theme => theme.id));
const CARD_SIZES = {
  poker: { label: "Póker", width: 63.5, height: 88.9, columns: 4, cardsPerSheet: 8, page: "landscape", previewClass: "" },
  tarot: { label: "Tarot", width: 70, height: 120, columns: 2, cardsPerSheet: 4, page: "portrait", previewClass: "size-tarot" }
};
const ABILITIES = [
  ["strength", "FUE"], ["dexterity", "DES"], ["constitution", "CON"],
  ["intelligence", "INT"], ["wisdom", "SAB"], ["charisma", "CAR"]
];
const ABILITY_FIELDS = ABILITIES.flatMap(([key, short]) => [
  [key, `Puntuación ${short}`, "score"],
  [`${key}Modifier`, `Modificador ${short}`, "modifier", key]
]);
const MODES = {
  monster: {
    label: "Monstruo",
    fields: [
      ["creatureType", "Tamaño y tipo"], ["alignment", "Alineamiento"], ["armorClass", "Clase de armadura"],
      ["hitPoints", "Puntos de golpe"], ["speed", "Velocidad"], ["challenge", "Desafío (VD)"],
      ["proficiency", "Bonificador de competencia"], ...ABILITY_FIELDS,
      ["savingThrows", "Salvaciones"], ["skills", "Habilidades"], ["senses", "Sentidos"],
      ["languages", "Idiomas"], ["traits", "Rasgos", "textarea"], ["actions", "Acciones", "textarea"]
    ],
    meta: ["creatureType", "alignment", "challenge"],
    stats: [["CA", "armorClass"], ["PG", "hitPoints"], ["VD", "challenge"]],
    highlights: ["speed", "abilities", "traits", "actions"]
  },
  spell: {
    label: "Conjuro",
    fields: [
      ["level", "Nivel"], ["school", "Escuela"], ["castingTime", "Tiempo de lanzamiento"],
      ["range", "Alcance"], ["components", "Componentes"], ["duration", "Duración"],
      ["classes", "Clases"], ["concentration", "Concentración"]
    ],
    meta: ["level", "school", "castingTime"],
    stats: [["ALCANCE", "range"], ["DURACIÓN", "duration"]],
    highlights: ["components", "classes", "concentration"]
  },
  item: {
    label: "Objeto mágico",
    fields: [
      ["category", "Categoría"], ["rarity", "Rareza"], ["attunement", "Sintonización"],
      ["weight", "Peso"], ["value", "Valor"], ["properties", "Propiedades", "textarea"]
    ],
    meta: ["category", "rarity", "attunement"],
    stats: [["PESO", "weight"], ["VALOR", "value"]],
    highlights: ["properties"]
  },
  npc: {
    label: "PNJ",
    fields: [
      ["ancestry", "Especie"], ["role", "Ocupación o papel"], ["alignment", "Alineamiento"], ...ABILITY_FIELDS,
      ["armorClass", "Clase de armadura"], ["hitPoints", "Puntos de golpe"], ["personality", "Rasgo de personalidad", "textarea"],
      ["ideal", "Ideal"], ["bond", "Vínculo"], ["flaw", "Defecto"]
    ],
    meta: ["ancestry", "role", "alignment"],
    stats: [["CA", "armorClass"], ["PG", "hitPoints"]],
    highlights: ["personality", "ideal", "bond", "flaw"]
  },
  encounter: {
    label: "Encuentro",
    fields: [
      ["difficulty", "Dificultad"], ["party", "Grupo (nivel y número)"], ["location", "Localización"],
      ["opponents", "Oponentes"], ["objective", "Objetivo"], ["reward", "Recompensa"],
      ["complications", "Complicaciones", "textarea"]
    ],
    meta: ["difficulty", "party", "location"],
    stats: [["DIFICULTAD", "difficulty"], ["GRUPO", "party"]],
    highlights: ["opponents", "objective", "reward", "complications"]
  }
};
const DEFAULT_DETAILS = {
  monster: { creatureType: "", alignment: "", armorClass: "", hitPoints: "", speed: "", challenge: "", proficiency: "", strength: "", dexterity: "", constitution: "", intelligence: "", wisdom: "", charisma: "", savingThrows: "", skills: "", senses: "", languages: "", traits: "", actions: "" },
  spell: { level: "", school: "", castingTime: "", range: "", components: "", duration: "", classes: "", concentration: "" },
  item: { category: "", rarity: "", attunement: "", weight: "", value: "", properties: "" },
  npc: { ancestry: "", role: "", alignment: "", armorClass: "", hitPoints: "", strength: "", dexterity: "", constitution: "", intelligence: "", wisdom: "", charisma: "", personality: "", ideal: "", bond: "", flaw: "" },
  encounter: { difficulty: "", party: "", location: "", opponents: "", objective: "", reward: "", complications: "" }
};

const makeId = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
function makeCard(mode = "monster", name) {
  return {
    id: makeId(), mode, name: name || `Nuevo ${MODES[mode].label.toLocaleLowerCase("es")}`,
    description: "", dmNote: "", details: { ...DEFAULT_DETAILS[mode] }, icon: "✧", theme: "verdant", image: "", backImage: ""
  };
}
function makeDeck(name) {
  const card = makeCard("monster", "Nueva criatura");
  return { id: makeId(), name, cards: [card], activeCardId: card.id, cardSize: "poker" };
}
function defaultData() {
  const deck = makeDeck("Bestiario de campaña");
  return { decks: [deck], activeDeckId: deck.id, themes: [], customIcons: [] };
}
function normalizeCard(card, validThemes, validIcons) {
  if (!card || typeof card !== "object") return makeCard();
  const mode = MODES[card.mode] ? card.mode : "monster";
  const details = { ...DEFAULT_DETAILS[mode], ...(card.details && typeof card.details === "object" ? card.details : {}) };
  if (typeof details.abilities === "string") {
    for (const [key, short] of ABILITIES) {
      const match = details.abilities.match(new RegExp(`${short}\\s+(\\d+)\\s*\\(([+-]?\\d+)\\)`));
      if (match) details[key] = match[1];
    }
    delete details.abilities;
  }
  if (!card.mode) {
    if (card.type) details.creatureType = card.type;
    if (card.defense !== undefined) details.armorClass = String(card.defense);
    if (card.health !== undefined) details.hitPoints = String(card.health);
    if (card.cost !== undefined) details.challenge = String(card.cost);
  }
  return {
    id: typeof card.id === "string" ? card.id : makeId(), mode, name: String(card.name || "Carta sin nombre"),
    description: String(card.description || ""), dmNote: String(card.dmNote ?? card.flavor ?? ""),
    details, icon: validIcons.has(card.icon) || ICONS.includes(card.icon) ? card.icon : "✧",
    theme: validThemes.has(card.theme) ? card.theme : "verdant",
    image: typeof card.image === "string" ? card.image : "",
    backImage: typeof card.backImage === "string" ? card.backImage : ""
  };
}
function normalizeData(data) {
  if (!data || !Array.isArray(data.decks) || data.decks.length === 0) return defaultData();
  const seenThemeIds = new Set(BUILTIN_THEME_IDS);
  const themes = Array.isArray(data.themes) ? data.themes.filter(theme => {
    if (!theme || typeof theme.id !== "string" || !/^custom-[a-z0-9-]+$/.test(theme.id) ||
      seenThemeIds.has(theme.id) || typeof theme.name !== "string" ||
      ![theme.frame, theme.bright, theme.art1, theme.art2].every(color => typeof color === "string" && HEX_COLOR.test(color))) return false;
    seenThemeIds.add(theme.id);
    return true;
  }).map(theme => ({
    id: theme.id, name: theme.name.slice(0, 24), frame: theme.frame, bright: theme.bright, art1: theme.art1, art2: theme.art2,
    frameImage: typeof theme.frameImage === "string" && /^data:image\/(?:png|webp);base64,/.test(theme.frameImage) ? theme.frameImage : ""
  })) : [];
  const customIcons = Array.isArray(data.customIcons) ? data.customIcons.filter(icon =>
    icon && typeof icon.id === "string" && /^icon-[a-z0-9-]+$/.test(icon.id) &&
    typeof icon.name === "string" && typeof icon.image === "string" && /^data:image\/webp;base64,/.test(icon.image)
  ).map(icon => ({ id: icon.id, name: icon.name.slice(0, 24), image: icon.image })) : [];
  const validThemes = new Set([...BUILTIN_THEME_IDS, ...themes.map(theme => theme.id)]);
  const validIcons = new Set(customIcons.map(icon => icon.id));
  const decks = data.decks.filter(deck => deck && typeof deck.name === "string" && Array.isArray(deck.cards))
    .map(deck => {
      const cards = deck.cards.map(card => normalizeCard(card, validThemes, validIcons));
      if (!cards.length) cards.push(makeCard());
      return {
        id: typeof deck.id === "string" ? deck.id : makeId(), name: deck.name, cards,
        activeCardId: cards.some(card => card.id === deck.activeCardId) ? deck.activeCardId : cards[0].id,
        cardSize: CARD_SIZES[deck.cardSize] ? deck.cardSize : "poker"
      };
    });
  if (!decks.length) return defaultData();
  return {
    decks,
    activeDeckId: decks.some(deck => deck.id === data.activeDeckId) ? data.activeDeckId : decks[0].id,
    themes, customIcons
  };
}
function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeData(JSON.parse(stored)) : defaultData();
  } catch (error) {
    console.error("No se pudieron leer los datos guardados:", error);
    return defaultData();
  }
}
