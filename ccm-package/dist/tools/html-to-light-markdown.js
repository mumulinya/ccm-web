"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToLightMarkdown = htmlToLightMarkdown;
const ENTITY = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
};
function decodeEntities(value) {
    return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
        const named = ENTITY[entity.toLowerCase()];
        if (named)
            return named;
        if (/^#x/i.test(entity))
            return String.fromCodePoint(Number.parseInt(entity.slice(2), 16) || 32);
        if (entity.startsWith("#"))
            return String.fromCodePoint(Number.parseInt(entity.slice(1), 10) || 32);
        return " ";
    });
}
function collapseBlank(value) {
    return value.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function htmlToLightMarkdown(html) {
    let text = String(html || "")
        .replace(/<script\b[\s\S]*?<\/script>/gi, "\n")
        .replace(/<style\b[\s\S]*?<\/style>/gi, "\n")
        .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "\n")
        .replace(/<!--[\s\S]*?-->/g, "\n");
    text = text.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, body) => `\n\`\`\`\n${decodeEntities(body.replace(/<[^>]+>/g, "")).trim()}\n\`\`\`\n`);
    text = text.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, body) => `\`${decodeEntities(body.replace(/<[^>]+>/g, "")).trim()}\``);
    text = text.replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
        const title = decodeEntities(label.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() || href;
        return `[${title}](${href})`;
    });
    text = text.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, body) => {
        const title = decodeEntities(body.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
        return title ? `\n${"#".repeat(Number(level))} ${title}\n` : "\n";
    });
    text = text.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, body) => `- ${decodeEntities(body.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()}\n`);
    text = text.replace(/<(?:br|hr)\s*\/?>/gi, "\n");
    text = text.replace(/<\/(?:p|div|tr|table|ul|ol|section|article|header|footer)>/gi, "\n");
    text = text.replace(/<[^>]+>/g, " ");
    return collapseBlank(decodeEntities(text).replace(/[ \t]{2,}/g, " "));
}
//# sourceMappingURL=html-to-light-markdown.js.map