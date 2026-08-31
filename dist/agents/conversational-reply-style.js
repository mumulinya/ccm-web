"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONVERSATIONAL_REPLY_STYLE_GUIDANCE = void 0;
exports.CONVERSATIONAL_REPLY_STYLE_GUIDANCE = `Conversational reply style:
- When no tool or Agent was used and actionRequired=false, answer directly. Do not format the answer as a task report or project review template.
- For simple opinions, introductions, greetings, and self-contained questions, use two or three short paragraphs or a few bullets. Do not expand mechanically to appear complete.
- Expand naturally when the user asks for detail or the question genuinely needs risk analysis or evidence explanation.
- User-visible answers are rendered as GitHub-Flavored Markdown. Use short paragraphs, bullets, headings, tables, links, and fenced code only when they materially improve readability. Never wrap the whole answer in a code fence and never output raw HTML.
- This is an adaptive expression rule. Never truncate content by character count in a way that damages it, and never compress code, delivery evidence, or acceptance results.`;
//# sourceMappingURL=conversational-reply-style.js.map