"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePluginCatalogItem = normalizePluginCatalogItem;
exports.decoratePluginCatalogItem = decoratePluginCatalogItem;
const extension_state_1 = require("../../tools/extension-state");
function normalizePluginCatalogItem(item, source) {
    const name = String(item.name || item.displayName || "").trim();
    if (!name || name.length > 120 || /[\\/\0\r\n]/.test(name))
        throw new Error("插件名称无效");
    const url = new URL(String(item.sourceUrl || item.repository || ""));
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.search || url.hash
        || url.pathname.split("/").filter(Boolean).length < 2)
        throw new Error("插件来源必须为 GitHub HTTPS 目录");
    return { id: `plugin-${(0, extension_state_1.extensionHash)(url.href).slice(0, 16)}`, type: "plugin", name,
        displayName: String(item.displayName || name), description: String(item.description || item.summary || ""),
        version: String(item.version || ""), author: String(item.author?.name || item.author || ""),
        category: String(item.category || ""), sourceUrl: url.href, source,
    };
}
function decoratePluginCatalogItem(item) {
    const record = (0, extension_state_1.readExtensionState)().items.find(row => row.state !== "removed" && row.source.url === item.sourceUrl);
    return { ...item, installed: record?.state === "active", installedVersion: record?.version || "",
        installationState: record?.state || "not_installed", updateAvailable: !!record && !!item.version && record.version !== item.version };
}
//# sourceMappingURL=extension-catalog.js.map