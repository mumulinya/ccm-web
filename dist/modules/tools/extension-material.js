"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginRelativePath = pluginRelativePath;
exports.validatePluginFiles = validatePluginFiles;
exports.parsePluginMaterial = parsePluginMaterial;
exports.fetchPluginMaterial = fetchPluginMaterial;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const secure_public_network_1 = require("../../tools/secure-public-network");
const extension_state_1 = require("../../tools/extension-state");
const marketplace_1 = require("./marketplace");
function pluginRelativePath(value) {
    const text = String(value || "").replace(/^\.\//, "");
    if (!text || text.includes("\\") || text.includes("\0") || path.posix.isAbsolute(text) || /^[a-z]:/i.test(text)
        || text.split("/").some(part => part === ".." || !part))
        throw new Error("插件资源必须使用包内相对路径");
    return text.replace(/\/$/, "");
}
function validatePluginFiles(root) {
    let size = 0;
    const files = [];
    const walk = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            const stat = fs.lstatSync(file);
            if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory()))
                throw new Error("插件禁止符号链接和特殊文件");
            if (stat.isDirectory())
                walk(file);
            else {
                size += stat.size;
                if (stat.size > 2 * 1024 * 1024 || size > 10 * 1024 * 1024 || files.length >= 300)
                    throw new Error("插件包超过文件或体积限制");
                files.push({ path: path.relative(root, file).replace(/\\/g, "/"), hash: (0, extension_state_1.extensionHash)(fs.readFileSync(file).toString("base64")), size: stat.size });
            }
        }
    };
    walk(root);
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { files, materialHash: (0, extension_state_1.extensionHash)(files) };
}
function parsePluginMaterial(root) {
    const portable = path.join(root, "plugin.json");
    const manifestFile = fs.existsSync(portable) ? portable : path.join(root, ".codex-plugin", "plugin.json");
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,59}$/.test(manifest.name || ""))
        throw new Error("插件名称无效");
    const overlay = manifest.extensions?.["com.openai"] || manifest;
    const mcpSpec = manifest.mcpServers || manifest.mcp || overlay.mcpServers || (fs.existsSync(path.join(root, "mcp.json")) ? "./mcp.json" : null);
    const mcp = typeof mcpSpec === "string" ? JSON.parse(fs.readFileSync(path.join(root, pluginRelativePath(mcpSpec)), "utf8")) : mcpSpec || {};
    const servers = mcp.mcpServers || mcp;
    const members = Object.entries(servers).map(([key, value]) => {
        if (!/^[a-zA-Z0-9_-]{1,60}$/.test(key) || (!value.command && !value.url))
            throw new Error("插件 MCP 声明无效");
        return { kind: "mcp", key, config: value };
    });
    const declared = manifest.skills || overlay.skills || (fs.existsSync(path.join(root, "skills")) ? "./skills" : []);
    for (const rel of Array.isArray(declared) ? declared : [declared]) {
        const skillRoot = path.join(root, pluginRelativePath(String(rel).replace(/\/$/, "")));
        const directories = fs.existsSync(path.join(skillRoot, "SKILL.md")) ? [skillRoot]
            : fs.readdirSync(skillRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => path.join(skillRoot, entry.name));
        for (const directory of directories) {
            const stats = (0, marketplace_1.validateSkillDirectory)(directory);
            const key = path.basename(directory);
            if (!/^[a-zA-Z0-9_-]{1,60}$/.test(key))
                throw new Error("插件技能目录名称无效");
            members.push({ kind: "skill", key, relativePath: path.relative(root, directory), materialHash: stats.treeHash });
        }
    }
    if (!members.length)
        throw new Error("插件未声明 MCP 或 Skill");
    if (new Set(members.map(member => `${member.kind}:${member.key}`)).size !== members.length)
        throw new Error("插件成员重复");
    const dependencies = manifest.dependencies || [];
    if (!Array.isArray(dependencies) || dependencies.some(value => typeof value !== "string"))
        throw new Error("插件 dependencies 必须是已安装扩展 ID 数组");
    return { name: manifest.name, description: String(manifest.description || ""), version: String(manifest.version || "0.0.0"),
        publisher: String(manifest.author?.name || manifest.author || ""), members, dependencies,
        hooksIgnored: !!(manifest.hooks || overlay.hooks || fs.existsSync(path.join(root, "hooks"))), ...validatePluginFiles(root) };
}
async function fetchPluginMaterial(sourceUrl) {
    const github = (0, marketplace_1.parseGithubSkillSource)(sourceUrl);
    if (!github)
        throw new Error("整包插件请提供 GitHub 插件目录地址");
    const repo = new URL(github.repository).pathname.slice(1);
    const commit = JSON.parse((await (0, secure_public_network_1.securePublicBuffer)(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(github.ref || "HEAD")}`, 2 * 1024 * 1024)).body.toString("utf8"));
    if (!/^[a-f0-9]{40}$/.test(commit.sha || ""))
        throw new Error("无法固定插件来源版本");
    const tree = JSON.parse((await (0, secure_public_network_1.securePublicBuffer)(`https://api.github.com/repos/${repo}/git/trees/${commit.sha}?recursive=1`, 4 * 1024 * 1024)).body.toString("utf8"));
    if (tree.truncated)
        throw new Error("插件来源文件清单不完整，请选择独立插件仓库");
    const prefix = github.subpath ? `${pluginRelativePath(github.subpath)}/` : "";
    const entries = (tree.tree || []).filter((entry) => entry.path.startsWith(prefix) && entry.type !== "tree");
    if (!entries.length || entries.length > 300 || entries.some((entry) => entry.type !== "blob" || !["100644", "100755"].includes(entry.mode) || entry.size > 2 * 1024 * 1024)
        || entries.reduce((sum, entry) => sum + entry.size, 0) > 10 * 1024 * 1024)
        throw new Error("插件包包含不支持的文件或超过大小限制");
    fs.mkdirSync(path.join(extension_state_1.EXTENSIONS_ROOT, "staging"), { recursive: true });
    const directory = fs.mkdtempSync(path.join(extension_state_1.EXTENSIONS_ROOT, "staging", "plugin-"));
    try {
        for (let index = 0; index < entries.length; index += 8) {
            await Promise.all(entries.slice(index, index + 8).map(async (entry) => {
                const relative = pluginRelativePath(entry.path.slice(prefix.length));
                const result = await (0, secure_public_network_1.securePublicBuffer)(`https://raw.githubusercontent.com/${repo}/${commit.sha}/${entry.path.split("/").map(encodeURIComponent).join("/")}`, 2 * 1024 * 1024);
                const file = path.join(directory, relative);
                fs.mkdirSync(path.dirname(file), { recursive: true });
                fs.writeFileSync(file, result.body);
            }));
        }
        const material = parsePluginMaterial(directory);
        return { directory, ...material, sourceRevision: commit.sha,
            sourceUrl: `${github.repository}${github.ref || github.subpath ? `/tree/${encodeURIComponent(github.ref || "HEAD")}${github.subpath ? `/${github.subpath}` : ""}` : ""}` };
    }
    catch (error) {
        fs.rmSync(directory, { recursive: true, force: true });
        throw error;
    }
}
//# sourceMappingURL=extension-material.js.map