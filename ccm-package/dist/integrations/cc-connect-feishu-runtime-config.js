"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableBlockingFeishuReaction = void 0;
exports.configureNativeFeishuReactionFeedback = configureNativeFeishuReactionFeedback;
exports.disableVisibleCcConnectIdleRotation = disableVisibleCcConnectIdleRotation;
function configureNativeFeishuReactionFeedback(content) {
    if (!/^\s*\[\[projects\.platforms\]\]\s*$/mi.test(content))
        return content;
    const newline = content.includes("\r\n") ? "\r\n" : "\n";
    const lines = content.split(/\r?\n/);
    const boundaries = [];
    for (let index = 0; index < lines.length; index += 1) {
        if (/^\s*\[\[projects\.platforms\]\]\s*$/i.test(lines[index])) {
            boundaries.push({ index, platform: true });
        }
        else if (/^\s*\[\[projects\]\]\s*$/i.test(lines[index])) {
            boundaries.push({ index, platform: false });
        }
    }
    for (let cursor = boundaries.length - 1; cursor >= 0; cursor -= 1) {
        const boundary = boundaries[cursor];
        if (!boundary.platform)
            continue;
        const end = boundaries[cursor + 1]?.index ?? lines.length;
        const typeLine = lines.slice(boundary.index + 1, end)
            .find(line => /^\s*type\s*=\s*"(?:feishu|lark)"\s*(?:#.*)?$/i.test(line));
        if (!typeLine)
            continue;
        const optionsStart = lines.findIndex((line, index) => (index > boundary.index
            && index < end
            && /^\s*\[projects\.platforms\.options\]\s*$/i.test(line)));
        if (optionsStart < 0) {
            let insertAt = end;
            while (insertAt > boundary.index + 1 && !lines[insertAt - 1].trim())
                insertAt -= 1;
            lines.splice(insertAt, 0, "", "[projects.platforms.options]", 'reaction_emoji = "OnIt"', 'done_emoji = "Done"');
            continue;
        }
        let optionsEnd = end;
        for (let index = optionsStart + 1; index < end; index += 1) {
            if (/^\s*\[/.test(lines[index])) {
                optionsEnd = index;
                break;
            }
        }
        for (const [key, value] of [["done_emoji", "Done"], ["reaction_emoji", "OnIt"]]) {
            const settingIndex = lines.findIndex((line, index) => (index > optionsStart
                && index < optionsEnd
                && new RegExp(`^\\s*${key}\\s*=`, "i").test(line)));
            if (settingIndex >= 0) {
                const indent = lines[settingIndex].match(/^\s*/)?.[0] || "";
                lines[settingIndex] = `${indent}${key} = "${value}"`;
            }
            else {
                let insertAt = optionsEnd;
                while (insertAt > optionsStart + 1 && !lines[insertAt - 1].trim())
                    insertAt -= 1;
                lines.splice(insertAt, 0, `${key} = "${value}"`);
                optionsEnd += 1;
            }
        }
    }
    return lines.join(newline);
}
// Preserve the old export for installed extensions while changing the private
// runtime projection to cc-connect's native reaction lifecycle.
exports.disableBlockingFeishuReaction = configureNativeFeishuReactionFeedback;
function disableVisibleCcConnectIdleRotation(content) {
    const marker = content.search(/\r?\n\[projects\.agent\]/i);
    if (marker < 0)
        return content;
    let projectBlock = content.slice(0, marker);
    if (/^\s*reset_on_idle_mins\s*=/mi.test(projectBlock)) {
        projectBlock = projectBlock.replace(/^\s*reset_on_idle_mins\s*=\s*\d+\s*(?:#.*)?$/mi, "reset_on_idle_mins = 0");
    }
    else {
        projectBlock = `${projectBlock.trimEnd()}\nreset_on_idle_mins = 0\n`;
    }
    return `${projectBlock}${content.slice(marker)}`;
}
//# sourceMappingURL=cc-connect-feishu-runtime-config.js.map