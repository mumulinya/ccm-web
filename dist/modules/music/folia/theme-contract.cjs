var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// integrations/folia-host/theme-contract.mjs
var theme_contract_exports = {};
__export(theme_contract_exports, {
  THEME_JSON_SCHEMA: () => THEME_JSON_SCHEMA,
  buildThemeSourcePrompt: () => buildThemeSourcePrompt,
  buildThemeSystemPrompt: () => buildThemeSystemPrompt,
  geminiThemeSchema: () => geminiThemeSchema,
  sanitizeDualTheme: () => sanitizeDualTheme
});
module.exports = __toCommonJS(theme_contract_exports);

// integrations/folia/shared/themeSanitizer.mjs
var HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
var FALLBACK_LIGHT_THEME = {
  name: "AI Light",
  backgroundColor: "#ffffff",
  primaryColor: "#111827",
  accentColor: "#2563eb",
  secondaryColor: "#475569",
  fontStyle: "sans",
  animationIntensity: "normal",
  wordColors: [],
  lyricsIcons: [],
  provider: "AI"
};
var FALLBACK_DARK_THEME = {
  name: "AI Dark",
  backgroundColor: "#0f172a",
  primaryColor: "#f8fafc",
  accentColor: "#7dd3fc",
  secondaryColor: "#cbd5e1",
  fontStyle: "sans",
  animationIntensity: "normal",
  wordColors: [],
  lyricsIcons: [],
  provider: "AI"
};
var FALLBACK_AI_DUAL_THEME = {
  light: FALLBACK_LIGHT_THEME,
  dark: FALLBACK_DARK_THEME
};
var isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var normalizeHexColorCandidate = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return null;
  }
  const hex = trimmed.slice(1).toLowerCase();
  if (hex.length === 3) {
    return `#${hex.split("").map((char) => `${char}${char}`).join("")}`;
  }
  return `#${hex}`;
};
var normalizeThemeHexColor = (value, fallback, hardFallback = "#ffffff") => normalizeHexColorCandidate(value) ?? normalizeHexColorCandidate(fallback) ?? hardFallback;
var normalizeFontStyle = (value, fallback) => value === "serif" || value === "mono" || value === "sans" ? value : fallback;
var normalizeAnimationIntensity = (value, fallback) => value === "calm" || value === "chaotic" || value === "normal" ? value : fallback;
var normalizeWordColors = (value, fallbackColor) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const word = typeof entry.word === "string" ? entry.word.trim() : "";
    if (!word) {
      return [];
    }
    const color = normalizeThemeHexColor(entry.color, fallbackColor);
    return [{ word, color }];
  });
};
var normalizeLyricsIcons = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((icon) => typeof icon === "string").map((icon) => icon.trim()).filter(Boolean).slice(0, 12);
};
var sanitizeTheme = (value, fallbackTheme) => {
  const source = isRecord(value) ? value : {};
  const accentColor = normalizeThemeHexColor(source.accentColor, fallbackTheme.accentColor);
  return {
    ...fallbackTheme,
    name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : fallbackTheme.name,
    description: typeof source.description === "string" ? source.description.trim() : fallbackTheme.description,
    backgroundColor: normalizeThemeHexColor(source.backgroundColor, fallbackTheme.backgroundColor),
    primaryColor: normalizeThemeHexColor(source.primaryColor, fallbackTheme.primaryColor),
    accentColor,
    secondaryColor: normalizeThemeHexColor(source.secondaryColor, fallbackTheme.secondaryColor),
    fontStyle: normalizeFontStyle(source.fontStyle, fallbackTheme.fontStyle),
    animationIntensity: normalizeAnimationIntensity(source.animationIntensity, fallbackTheme.animationIntensity),
    wordColors: normalizeWordColors(source.wordColors, accentColor),
    lyricsIcons: normalizeLyricsIcons(source.lyricsIcons),
    provider: typeof source.provider === "string" && source.provider.trim() ? source.provider.trim() : fallbackTheme.provider
  };
};
var sanitizeDualTheme = (value, fallbackTheme = FALLBACK_AI_DUAL_THEME) => {
  const source = isRecord(value) ? value : {};
  return {
    light: sanitizeTheme(source.light, fallbackTheme.light),
    dark: sanitizeTheme(source.dark, fallbackTheme.dark)
  };
};

// integrations/folia/api/generate-theme_openai.js
var THEME_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    light: {
      type: "object",
      additionalProperties: false,
      description: "Theme optimized for light/daylight mode",
      properties: {
        name: { type: "string", description: "A creative name for this light theme in Chinese, strictly limited to 10 characters or less" },
        description: { type: "string", description: "A creative 1-sentence description of the mood or visual concept in Chinese, strictly limited to 15 to 30 Chinese characters" },
        backgroundColor: { type: "string", description: "Hex code for light background" },
        primaryColor: { type: "string", description: "Hex code for main text (dark)" },
        accentColor: { type: "string", description: "Hex code for highlighted text/effects" },
        secondaryColor: { type: "string", description: "Hex code for secondary elements" },
        wordColors: {
          type: "array",
          description: "List of exact emotional standalone words from the source text and their specific colors; Latin-script words must not contain punctuation or spaces",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              word: { type: "string" },
              color: { type: "string" }
            },
            required: ["word", "color"]
          }
        },
        lyricsIcons: {
          type: "array",
          description: "List of Lucide icon names related to the source text",
          items: { type: "string" }
        }
      },
      required: ["name", "description", "backgroundColor", "primaryColor", "accentColor", "secondaryColor", "wordColors", "lyricsIcons"]
    },
    dark: {
      type: "object",
      additionalProperties: false,
      description: "Theme optimized for dark/midnight mode",
      properties: {
        name: { type: "string", description: "A creative name for this dark theme in Chinese, strictly limited to 10 characters or less" },
        description: { type: "string", description: "A creative 1-sentence description of the mood or visual concept in Chinese, strictly limited to 15 to 30 Chinese characters" },
        backgroundColor: { type: "string", description: "Hex code for dark background" },
        primaryColor: { type: "string", description: "Hex code for main text (light)" },
        accentColor: { type: "string", description: "Hex code for highlighted text/effects" },
        secondaryColor: { type: "string", description: "Hex code for secondary elements" },
        wordColors: {
          type: "array",
          description: "List of exact emotional standalone words from the source text and their specific colors; Latin-script words must not contain punctuation or spaces",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              word: { type: "string" },
              color: { type: "string" }
            },
            required: ["word", "color"]
          }
        },
        lyricsIcons: {
          type: "array",
          description: "List of Lucide icon names related to the source text",
          items: { type: "string" }
        }
      },
      required: ["name", "description", "backgroundColor", "primaryColor", "accentColor", "secondaryColor", "wordColors", "lyricsIcons"]
    }
  },
  required: ["light", "dark"]
};
var buildThemeSystemPrompt = (includeSchemaText = false) => {
  const instructionPrompt = `Analyze the mood of the provided song source text and generate TWO visual theme configurations for a music player - one for LIGHT mode and one for DARK mode.

DUAL THEME REQUIREMENTS:
1. Generate TWO complete themes: one optimized for LIGHT/DAYLIGHT mode, one for DARK/MIDNIGHT mode.
2. Both themes should capture the SAME emotional essence of the source text, but with appropriate color palettes for their respective modes.
3. The theme names must be in Chinese and strictly limited to 10 characters or less. They should reflect both the mood AND the mode (e.g., "\u5FE7\u90C1\u7834\u6653" for light, "\u5FE7\u90C1\u5B50\u591C" for dark).
4. The theme description must be a brief, emotional sentence in Chinese (strictly limited to 15 to 30 Chinese characters) reflecting a stream-of-consciousness style with youth and literary characteristics, capturing a listener's immediate emotional reaction to this song. Do not write formal analytical text. Must be written from a first-person listener perspective.
   GUIDELINES FOR THE EXPRESSIVE STYLE:
   - Stream of Consciousness & Literary Vibe: Emphasize poetic, reflective, or introspective thoughts (e.g., emotional connection, existential thoughts, quiet solitude).
   - Youth & Nostalgia: Associate the mood with nostalgic memories of youth, dreams, seasons, or romantic longing.
   - Spatial & Situational Synesthesia: Translate the music's vibe into a vivid situation, atmosphere, weather, or imagery (e.g., summer breeze, starry sky, quiet room).
   Examples for reference: "\u6234\u4E0A\u8033\u673A\u7684\u90A3\u4E00\u523B\uFF0C\u55A7\u56A3\u7684\u4E16\u754C\u77AC\u95F4\u6D88\u5931\u4E86\u3002", "\u7136\u540E\uFF0C\u8FD9\u4EFD\u7231\u7F16\u7EC7\u4E86\u592A\u9633\u548C\u6240\u6709\u661F\u661F", "\u4F60\u7684\u4E16\u754C\uFF0C\u4E5F\u5305\u62EC\u6211\u5728\u5185\u5417\uFF1F", "\u5FAE\u91BA\u7684\u590F\u591C\u5439\u62C2\u8FC7\u4E00\u9635\u6D77\u98CE\u3002", "\u9752\u6625\u662F\u4E00\u79CD\u773A\u671B\u7684\u59FF\u6001\uFF01", "\u4EFF\u4F5B\u56DE\u5230\u4E86\u90A3\u4E2A\u6EE1\u662F\u6C7D\u6C34\u5473\u548C\u5355\u8F66\u540E\u5EA7\u7684\u590F\u5929\u3002"\u3002

SOURCE MODE:
1. If 'Pure instrumental' is yes, the source text below is the song title of a pure instrumental track, not lyrics.
2. If 'Pure instrumental' is no, the source text below is a lyrics snippet.
3. Base your mood inference only on the provided source text.

COLOR & THEME GENERATION WORKFLOW:
1. First, identify 10-20 key emotional standalone words from the source text that represent the core mood and atmosphere of the song.
2. Assign a specific, representative color to each of these key emotional standalone words under 'wordColors'.
3. Based on the emotional direction and colors of these identified words, construct the overall color palettes (backgroundColor, primaryColor, secondaryColor, accentColor) for the light and dark themes.
4. Coordinated Colors: The colors assigned in 'wordColors' must be designed in coordination and harmony with the overall color schemes of the themes.

LIGHT THEME RULES:
- Use LIGHT backgrounds. Avoid defaulting to pure white background for every light theme. Generate diverse and rich light-colored backgrounds (e.g., warm creams, soft pastel blues, pale sage greens, gentle peach, warm sands, pale lavenders) that directly match the song's mood.
- Ensure text/icons are dark enough for contrast, but avoid defaulting to pure black (#000000). Generate a very dark tone that coordinates with the background color's hue (e.g., deep navy, dark charcoal, dark plum).
- 'accentColor' must be visible against the light background.

DARK THEME RULES:
- Use DARK backgrounds. Avoid generic pure black backgrounds; use rich, diverse dark colors (e.g., deep midnight blue, dark forest green, charcoal gray, dark plum, deep chocolate, burgundy) matching the song's mood.
- Ensure text/icons are light enough for contrast, but avoid defaulting to pure white (#ffffff). Generate a very bright, soft tone that coordinates with the background color's hue (e.g., soft sky blue, pale mint green, light warm cream).
- 'accentColor' must contrast with the dark background and should be creatively derived from the song's specific mood (e.g., soft blues, mint greens, warm corals, lavender, pale gold) rather than defaulting to generic bright yellow.

SHARED RULES FOR BOTH THEMES:
1. CRITICAL for 'secondaryColor': This color is used for secondary TEXT (e.g., album name, artist name).
    - It MUST have sufficient contrast against 'backgroundColor' to be easily readable.
    - Aim for a contrast ratio of at least 4.5:1 for accessibility.
2. 'wordColors' and 'lyricsIcons' should be the SAME for both themes (they represent the source text's meaning).

IMPORTANT for 'wordColors':
1. Extract 10-20 emotional standalone words. For Latin-script text, each 'word' MUST be one complete word only, not a phrase.
2. CRITICAL: Do NOT include punctuation, apostrophes, curly quotes, hyphens, or spaces in Latin-script 'word' values. Use clean whole words like "train", "gone", "hidden", "cities"; do NOT return "train\u2019s gone", "well-hidden", "set me free", or "shun the light".
3. Avoid function words such as articles, prepositions, pronouns, particles, and auxiliaries (for example: the, a, an, to, me, and, of, in, on).
4. For CJK lyrics, short meaningful semantic terms may contain multiple CJK characters, but do not select single particles unless they are emotionally meaningful.
5. The 'word' field MUST match text from the source snippet after removing surrounding punctuation. If the pure-instrumental title is very short, using the exact full title as a phrase is allowed.

IMPORTANT for 'lyricsIcons':
1. Identify 3-5 visual concepts/objects mentioned in or strongly implied by the source text.
2. Return them as valid Lucide React icon names (PascalCase, e.g., 'CloudLightning', 'HeartHandshake').`;
  const schemaPrompt = includeSchemaText ? `
Response MUST be a valid JSON object. Do not include markdown formatting like \`\`\`json. Just the raw JSON.

JSON Schema:
${JSON.stringify(THEME_JSON_SCHEMA, null, 2)}` : "";
  return `${instructionPrompt}${schemaPrompt}`;
};
var buildThemeSourcePrompt = (snippet, isPureMusic, songTitle) => `Pure instrumental: ${isPureMusic ? "yes" : "no"}
${isPureMusic && songTitle ? `Song title: ${songTitle}
` : ""}Source snippet:
${snippet}`;

// integrations/folia-host/theme-contract.mjs
function geminiThemeSchema() {
  const convert = (node) => Object.fromEntries(Object.entries(node).filter(([key]) => ["type", "properties", "required", "items", "enum", "description"].includes(key)).map(([key, value]) => [key, key === "type" ? String(value).toUpperCase() : key === "properties" ? Object.fromEntries(Object.entries(value).map(([name, child]) => [name, convert(child)])) : key === "items" ? convert(value) : value]));
  return convert(THEME_JSON_SCHEMA);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  THEME_JSON_SCHEMA,
  buildThemeSourcePrompt,
  buildThemeSystemPrompt,
  geminiThemeSchema,
  sanitizeDualTheme
});
