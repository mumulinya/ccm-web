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
exports.MANAGED_LANGUAGE_SERVER_MANIFEST_SCHEMA = void 0;
exports.managedLanguageServerInstallSupported = managedLanguageServerInstallSupported;
exports.getManagedLanguageServerRecord = getManagedLanguageServerRecord;
exports.listManagedLanguageServerInstallations = listManagedLanguageServerInstallations;
exports.resolveManagedLanguageServerCommand = resolveManagedLanguageServerCommand;
exports.resolveManagedLanguageServerLaunch = resolveManagedLanguageServerLaunch;
exports.previewManagedLanguageServerInstall = previewManagedLanguageServerInstall;
exports.startManagedLanguageServerInstall = startManagedLanguageServerInstall;
exports.managedLanguageServerError = managedLanguageServerError;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const stream_1 = require("stream");
const promises_1 = require("stream/promises");
const atomic_json_file_1 = require("../core/atomic-json-file");
exports.MANAGED_LANGUAGE_SERVER_MANIFEST_SCHEMA = "ccm-managed-language-server-manifest-v1";
const STORE_ROOT = path.join(process.env.CCM_CODE_INTELLIGENCE_DIR || path.join(os.homedir(), ".ccm"), "code-intelligence");
const INSTALL_ROOT = path.join(STORE_ROOT, "language-servers");
const STATE_FILE = path.join(INSTALL_ROOT, "managed-installations.json");
const NPM_SPECS = [
    { serverId: "vue", languages: ["vue"], packageName: "@vue/language-server", commandName: "vue-language-server", source: "https://registry.npmjs.org/@vue/language-server" },
    { serverId: "pyright", languages: ["python"], packageName: "pyright", commandName: "pyright-langserver", source: "https://registry.npmjs.org/pyright" },
    { serverId: "php", languages: ["php"], packageName: "intelephense", commandName: "intelephense", source: "https://registry.npmjs.org/intelephense" },
    { serverId: "html-css-json", languages: ["html", "css", "json"], packageName: "vscode-langservers-extracted", commandName: "vscode-json-language-server", source: "https://registry.npmjs.org/vscode-langservers-extracted" },
];
const NATIVE_MANAGED_IDS = new Set(["gopls", "jdtls", "kotlin", "clangd", "csharp", "ruby", "lua"]);
function managedLanguageServerInstallSupported(serverId) {
    return NPM_SPECS.some(item => item.serverId === serverId) || NATIVE_MANAGED_IDS.has(serverId);
}
const pendingInstalls = new Map();
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function readState() {
    return (0, atomic_json_file_1.readJsonWithBackup)(STATE_FILE, {
        schema: "ccm-managed-language-server-installations-v1",
        installations: [],
    });
}
function writeRecord(record) {
    const current = readState();
    const installations = (Array.isArray(current.installations) ? current.installations : []).filter(item => item.serverId !== record.serverId);
    installations.push(record);
    (0, atomic_json_file_1.writeJsonAtomic)(STATE_FILE, { schema: "ccm-managed-language-server-installations-v1", installations });
    return record;
}
function publicRecord(record) {
    const { installerKind: _installerKind, packageName: _packageName, commandName: _commandName, executablePath: _executablePath, launchArgs: _launchArgs, launchEnvironment: _launchEnvironment, artifactUrl: _artifactUrl, artifactChecksumAlgorithm: _artifactChecksumAlgorithm, artifactRoot: _artifactRoot, toolchainVersion: _toolchainVersion, toolchainUrl: _toolchainUrl, toolchainChecksum: _toolchainChecksum, toolchainChecksumAlgorithm: _toolchainChecksumAlgorithm, packageUrl: _packageUrl, packageChecksum: _packageChecksum, extractorPackage: _extractorPackage, extractorVersion: _extractorVersion, extractorIntegrity: _extractorIntegrity, errorSummary: _errorSummary, updatedAt: _updatedAt, ...safe } = record;
    return safe;
}
function getManagedLanguageServerRecord(serverId) {
    return (readState().installations || []).find(item => item.serverId === serverId) || null;
}
function listManagedLanguageServerInstallations() {
    return (readState().installations || []).map(publicRecord);
}
function resolveManagedLanguageServerCommand(serverId) {
    const record = getManagedLanguageServerRecord(serverId);
    if (record?.installState !== "available" || !record.executablePath)
        return "";
    try {
        const resolvedRoot = fs.realpathSync(INSTALL_ROOT);
        const resolved = fs.realpathSync(record.executablePath);
        const relative = path.relative(resolvedRoot, resolved);
        return relative && !relative.startsWith("..") && !path.isAbsolute(relative) && fs.statSync(resolved).isFile() ? resolved : "";
    }
    catch {
        return "";
    }
}
function resolveManagedLanguageServerLaunch(serverId, workspaceRoot) {
    const record = getManagedLanguageServerRecord(serverId);
    const command = resolveManagedLanguageServerCommand(serverId);
    if (!record || !command)
        return null;
    const replaceWorkspace = (value) => value.replaceAll("${workspaceRoot}", workspaceRoot);
    const args = (record.launchArgs || []).map(replaceWorkspace);
    if (serverId === "jdtls") {
        const dataRoot = path.join(STORE_ROOT, "workspaces", "jdtls", digest(path.resolve(workspaceRoot)).slice(0, 24));
        fs.mkdirSync(dataRoot, { recursive: true });
        args.push("-data", dataRoot);
    }
    const env = Object.fromEntries(Object.entries(record.launchEnvironment || {}).map(([key, value]) => [key, replaceWorkspace(value)]));
    if (serverId === "ruby")
        env.PATH = `${path.dirname(command)}${path.delimiter}${process.env.PATH || ""}`;
    return {
        command,
        args,
        env,
    };
}
async function previewGoplsInstall() {
    const goOs = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "darwin" : process.platform;
    const goArch = process.arch === "x64" ? "amd64" : process.arch;
    const [releasesResponse, moduleResponse] = await Promise.all([
        fetch("https://go.dev/dl/?mode=json", { headers: { accept: "application/json", "user-agent": "ccm-code-intelligence" }, signal: AbortSignal.timeout(20_000) }),
        fetch("https://proxy.golang.org/golang.org/x/tools/gopls/@latest", { headers: { accept: "application/json", "user-agent": "ccm-code-intelligence" }, signal: AbortSignal.timeout(20_000) }),
    ]);
    if (!releasesResponse.ok || !moduleResponse.ok)
        throw new Error(`gopls安装清单读取失败：Go ${releasesResponse.status} / module ${moduleResponse.status}`);
    const releasePayload = await releasesResponse.json();
    const releases = Array.isArray(releasePayload) ? releasePayload : [];
    const module = await moduleResponse.json();
    const release = releases.find(item => item?.stable === true) || releases[0];
    const file = (release?.files || []).find((item) => item.os === goOs && item.arch === goArch && item.kind === "archive");
    const version = String(module?.Version || "");
    const sha256 = String(file?.sha256 || "").toLowerCase();
    const filename = String(file?.filename || "");
    if (!version || !/^v\d/.test(version) || !/^[a-f0-9]{64}$/.test(sha256) || !filename)
        throw new Error("官方Go/gopls清单缺少固定版本或SHA-256");
    const revision = Date.now();
    const unsigned = {
        schema: exports.MANAGED_LANGUAGE_SERVER_MANIFEST_SCHEMA,
        serverId: "gopls",
        version,
        languages: ["go"],
        platform: process.platform,
        architecture: process.arch,
        source: `https://go.dev/gopls/ · https://go.dev/dl/${filename}`,
        artifactChecksum: `sha256:${sha256}`,
        revision,
        installState: "previewed",
        installSupported: true,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        contentStored: false,
    };
    const record = {
        ...unsigned,
        manifestChecksum: digest(unsigned),
        installerKind: "go_toolchain",
        packageName: "golang.org/x/tools/gopls",
        commandName: process.platform === "win32" ? "gopls.exe" : "gopls",
        toolchainVersion: String(release?.version || ""),
        toolchainUrl: `https://go.dev/dl/${filename}`,
        toolchainChecksum: sha256,
        updatedAt: new Date().toISOString(),
    };
    writeRecord(record);
    return publicRecord(record);
}
function platformAssetToken() {
    if (process.platform === "win32")
        return "windows";
    if (process.platform === "darwin")
        return "mac";
    return "linux";
}
function githubArchitectureToken() {
    if (process.arch === "arm64")
        return "arm64";
    if (process.arch === "ia32")
        return "ia32";
    return "x64";
}
async function fetchJson(url) {
    const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "ccm-code-intelligence" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok)
        throw new Error(`语言服务安装清单读取失败：HTTP ${response.status}`);
    return response.json();
}
async function fetchText(url) {
    const response = await fetch(url, { headers: { accept: "text/plain", "user-agent": "ccm-code-intelligence" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok)
        throw new Error(`语言服务安装清单读取失败：HTTP ${response.status}`);
    return response.text();
}
function githubAsset(release, matcher) {
    const asset = (Array.isArray(release?.assets) ? release.assets : []).find((item) => matcher(String(item?.name || "")));
    const checksum = String(asset?.digest || "").match(/^sha256:([a-f0-9]{64})$/i)?.[1]?.toLowerCase() || "";
    const url = String(asset?.browser_download_url || "");
    if (!asset || !checksum || !url.startsWith("https://github.com/"))
        throw new Error("官方发布缺少当前平台安装包或SHA-256摘要");
    return { name: String(asset.name), url, checksum };
}
async function resolveTemurin21Runtime() {
    const osName = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "mac" : "linux";
    const architecture = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "aarch64" : process.arch;
    const assets = await fetchJson(`https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=${encodeURIComponent(architecture)}&image_type=jre&os=${encodeURIComponent(osName)}&vendor=eclipse`);
    const item = Array.isArray(assets) ? assets[0]?.binary?.package : null;
    const checksum = String(item?.checksum || "").toLowerCase();
    const url = String(item?.link || "");
    if (!/^[a-f0-9]{64}$/.test(checksum) || !url.startsWith("https://github.com/adoptium/"))
        throw new Error("Adoptium JRE 21清单缺少当前平台包或SHA-256");
    return { version: String(assets[0]?.version?.semver || assets[0]?.release_name || "21"), url, checksum };
}
function createNativePreview(input) {
    const revision = Date.now();
    const unsigned = {
        schema: exports.MANAGED_LANGUAGE_SERVER_MANIFEST_SCHEMA,
        serverId: input.serverId,
        version: input.version,
        languages: input.languages,
        platform: process.platform,
        architecture: process.arch,
        source: input.source,
        artifactChecksum: `${input.artifactChecksumAlgorithm || "sha256"}:${input.artifactChecksum}`,
        revision,
        installState: "previewed",
        installSupported: true,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        contentStored: false,
    };
    const record = {
        ...unsigned,
        manifestChecksum: digest(unsigned),
        installerKind: input.installerKind,
        packageName: input.packageName,
        commandName: input.commandName,
        artifactUrl: input.artifactUrl,
        artifactChecksumAlgorithm: input.artifactChecksumAlgorithm || "sha256",
        artifactRoot: input.artifactRoot,
        toolchainVersion: input.toolchain?.version,
        toolchainUrl: input.toolchain?.url,
        toolchainChecksum: input.toolchain?.checksum,
        toolchainChecksumAlgorithm: input.toolchain?.algorithm || "sha256",
        packageUrl: input.packageUrl,
        packageChecksum: input.packageChecksum,
        updatedAt: new Date().toISOString(),
    };
    writeRecord(record);
    return publicRecord(record);
}
async function previewLuaInstall() {
    const release = await fetchJson("https://api.github.com/repos/LuaLS/lua-language-server/releases/latest");
    const platform = process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux";
    const arch = githubArchitectureToken();
    const extension = process.platform === "win32" ? ".zip" : ".tar.gz";
    const asset = githubAsset(release, name => name.includes(`-${platform}-${arch}`) && name.endsWith(extension));
    return createNativePreview({ serverId: "lua", version: String(release.tag_name || ""), languages: ["lua"], source: "https://github.com/LuaLS/lua-language-server/releases", installerKind: "artifact_archive", artifactUrl: asset.url, artifactChecksum: asset.checksum, commandName: process.platform === "win32" ? "lua-language-server.exe" : "lua-language-server" });
}
async function previewClangdInstall() {
    const release = await fetchJson("https://api.github.com/repos/clangd/clangd/releases/latest");
    const platform = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "mac" : "linux";
    const asset = githubAsset(release, name => name === `clangd-${platform}-${String(release.tag_name || "")}.zip`);
    return createNativePreview({ serverId: "clangd", version: String(release.tag_name || ""), languages: ["c", "cpp", "objective-c"], source: "https://github.com/clangd/clangd/releases", installerKind: "artifact_archive", artifactUrl: asset.url, artifactChecksum: asset.checksum, commandName: process.platform === "win32" ? "clangd.exe" : "clangd" });
}
async function previewKotlinInstall() {
    if (!["win32", "linux", "darwin"].includes(process.platform))
        throw new Error("当前平台没有经过验证的Kotlin语言服务安装适配器");
    const runtime = await resolveTemurin21Runtime();
    return createNativePreview({
        serverId: "kotlin", version: "1.3.13", languages: ["kotlin"], source: "https://github.com/fwcd/kotlin-language-server/releases/tag/1.3.13",
        installerKind: "kotlin_bundle", artifactUrl: "https://github.com/fwcd/kotlin-language-server/releases/download/1.3.13/server.zip",
        artifactChecksum: "4fe7d71d087b307c7869036171bd9d8c6a4284cd7c25b89098b0a24eb2d9b6d2", commandName: process.platform === "win32" ? "java.exe" : "java",
        toolchain: { version: runtime.version, url: runtime.url, checksum: runtime.checksum },
    });
}
async function previewJdtlsInstall() {
    const directory = await fetchText("https://download.eclipse.org/jdtls/milestones/");
    const versions = [...directory.matchAll(/href=['"]\/jdtls\/milestones\/(\d+\.\d+\.\d+)['"]/g)].map(match => match[1]);
    versions.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
    const version = versions[0] || "";
    if (!version)
        throw new Error("Eclipse JDT.LS目录没有可用的稳定版本");
    const filename = (await fetchText(`https://download.eclipse.org/jdtls/milestones/${version}/latest.txt`)).trim();
    const checksum = (await fetchText(`https://download.eclipse.org/jdtls/milestones/${version}/${filename}.sha256`)).trim().match(/[a-f0-9]{64}/i)?.[0]?.toLowerCase() || "";
    if (!filename.endsWith(".tar.gz") || !checksum)
        throw new Error("Eclipse JDT.LS发布缺少固定文件名或SHA-256");
    const runtime = await resolveTemurin21Runtime();
    return createNativePreview({
        serverId: "jdtls", version, languages: ["java"], source: `https://download.eclipse.org/jdtls/milestones/${version}/`,
        installerKind: "jdtls_bundle", artifactUrl: `https://download.eclipse.org/jdtls/milestones/${version}/${filename}`,
        artifactChecksum: checksum, commandName: process.platform === "win32" ? "java.exe" : "java",
        toolchain: { version: runtime.version, url: runtime.url, checksum: runtime.checksum },
    });
}
async function previewCsharpInstall() {
    const versions = await fetchJson("https://api.nuget.org/v3-flatcontainer/csharp-ls/index.json");
    const version = String((versions?.versions || []).at(-1) || "");
    if (!version)
        throw new Error("NuGet没有可用的csharp-ls稳定版本");
    const registration = await fetchJson(`https://api.nuget.org/v3/registration5-gz-semver2/csharp-ls/${version}.json`);
    const catalog = await fetchJson(String(registration.catalogEntry || ""));
    const packageHash = String(catalog.packageHash || "");
    const packageUrl = String(registration.packageContent || "");
    if (catalog.packageHashAlgorithm !== "SHA512" || !packageHash || !packageUrl.startsWith("https://api.nuget.org/"))
        throw new Error("NuGet包缺少SHA-512或固定下载地址");
    const channel = "10.0";
    const releases = await fetchJson(`https://dotnetcli.blob.core.windows.net/dotnet/release-metadata/${channel}/releases.json`);
    const sdkVersion = String(releases?.["latest-sdk"] || "");
    const release = (releases?.releases || []).find((item) => String(item?.sdk?.version || "") === sdkVersion);
    const rid = `${process.platform === "win32" ? "win" : process.platform === "darwin" ? "osx" : "linux"}-${process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch}`;
    const file = (release?.sdk?.files || []).find((item) => item.rid === rid && /\.(zip|tar\.gz)$/.test(String(item.url || "")));
    const runtimeHash = String(file?.hash || "").toLowerCase();
    if (!String(file?.url || "").startsWith("https://") || !/^[a-f0-9]{128}$/.test(runtimeHash))
        throw new Error(".NET SDK清单缺少当前平台包或SHA-512");
    return createNativePreview({
        serverId: "csharp", version, languages: ["csharp"], source: "https://www.nuget.org/packages/csharp-ls",
        installerKind: "dotnet_tool", artifactUrl: packageUrl, artifactChecksum: packageHash, artifactChecksumAlgorithm: "sha512",
        commandName: process.platform === "win32" ? "csharp-ls.exe" : "csharp-ls", packageName: "csharp-ls",
        toolchain: { version: sdkVersion, url: String(file.url), checksum: runtimeHash, algorithm: "sha512" },
    });
}
async function previewRubyInstall() {
    if (process.platform !== "win32" || !["x64", "arm64"].includes(process.arch))
        throw new Error("Ruby受管运行时当前仅支持Windows x64/arm64");
    const release = await fetchJson("https://api.github.com/repos/oneclick/rubyinstaller2/releases/latest");
    const token = process.arch === "arm64" ? "arm" : "x64";
    const runtime = githubAsset(release, name => name.endsWith(`-${token}.7z`) && !name.includes("devkit"));
    const gem = await fetchJson("https://rubygems.org/api/v1/gems/ruby-lsp.json");
    const extractorMetadata = await fetchJson(npmRegistryUrl("7zip-bin"));
    const extractorVersion = String(extractorMetadata?.["dist-tags"]?.latest || "");
    const extractorIntegrity = String(extractorMetadata?.versions?.[extractorVersion]?.dist?.integrity || "");
    const gemHash = String(gem?.sha || "").toLowerCase();
    const gemUrl = String(gem?.gem_uri || "");
    if (!/^[a-f0-9]{64}$/.test(gemHash) || !gemUrl.startsWith("https://rubygems.org/") || !extractorVersion || !extractorIntegrity.startsWith("sha512-"))
        throw new Error("Ruby LSP或安全解压器缺少固定版本与完整性摘要");
    const preview = createNativePreview({
        serverId: "ruby", version: String(gem.version || ""), languages: ["ruby"], source: "https://shopify.github.io/ruby-lsp/",
        installerKind: "ruby_bundle", artifactUrl: runtime.url, artifactChecksum: runtime.checksum, commandName: "ruby.exe",
        toolchain: { version: String(release.tag_name || ""), url: runtime.url, checksum: runtime.checksum },
        packageUrl: gemUrl, packageChecksum: gemHash, packageName: "ruby-lsp",
    });
    const record = getManagedLanguageServerRecord("ruby");
    if (record)
        writeRecord({ ...record, extractorPackage: "7zip-bin", extractorVersion, extractorIntegrity });
    return preview;
}
function npmRegistryUrl(packageName) {
    return `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
}
async function previewManagedLanguageServerInstall(serverId) {
    if (serverId === "gopls")
        return previewGoplsInstall();
    if (serverId === "jdtls")
        return previewJdtlsInstall();
    if (serverId === "kotlin")
        return previewKotlinInstall();
    if (serverId === "clangd")
        return previewClangdInstall();
    if (serverId === "csharp")
        return previewCsharpInstall();
    if (serverId === "ruby")
        return previewRubyInstall();
    if (serverId === "lua")
        return previewLuaInstall();
    const spec = NPM_SPECS.find(item => item.serverId === serverId);
    if (!spec) {
        const base = {
            schema: exports.MANAGED_LANGUAGE_SERVER_MANIFEST_SCHEMA,
            serverId,
            version: "",
            languages: [],
            platform: process.platform,
            architecture: process.arch,
            source: "administrator-configured",
            artifactChecksum: "",
            revision: Date.now(),
            installState: "missing",
            installSupported: false,
            expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
            contentStored: false,
        };
        return { ...base, manifestChecksum: digest(base) };
    }
    const response = await fetch(npmRegistryUrl(spec.packageName), { headers: { accept: "application/json", "user-agent": "ccm-code-intelligence" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok)
        throw new Error(`语言服务包清单读取失败：HTTP ${response.status}`);
    const metadata = await response.json();
    const version = String(metadata?.["dist-tags"]?.latest || "");
    const release = metadata?.versions?.[version];
    const integrity = String(release?.dist?.integrity || "");
    if (!version || !integrity || !String(release?.dist?.tarball || "").startsWith("https://"))
        throw new Error("语言服务包缺少固定版本、HTTPS来源或完整性校验");
    const revision = Date.now();
    const unsigned = {
        schema: exports.MANAGED_LANGUAGE_SERVER_MANIFEST_SCHEMA,
        serverId,
        version,
        languages: spec.languages,
        platform: process.platform,
        architecture: process.arch,
        source: spec.source,
        artifactChecksum: integrity,
        revision,
        installState: "previewed",
        installSupported: true,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        contentStored: false,
    };
    const record = {
        ...unsigned,
        manifestChecksum: digest(unsigned),
        installerKind: "npm",
        packageName: spec.packageName,
        commandName: spec.commandName,
        updatedAt: new Date().toISOString(),
    };
    writeRecord(record);
    return publicRecord(record);
}
function npmCliPath() {
    const candidates = [
        String(process.env.npm_execpath || ""),
        path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    ].filter(Boolean);
    return candidates.find(candidate => fs.existsSync(candidate) && path.extname(candidate).toLowerCase() === ".js") || "";
}
function runNpmInstall(cli, installRoot, packageName, version) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(process.execPath, [cli, "install", "--prefix", installRoot, "--ignore-scripts", "--no-audit", "--no-fund", "--save-exact", `${packageName}@${version}`], {
            cwd: installRoot,
            shell: false,
            windowsHide: true,
            stdio: ["ignore", "ignore", "pipe"],
            env: { ...process.env, npm_config_ignore_scripts: "true", npm_config_audit: "false", npm_config_fund: "false" },
        });
        let errorText = "";
        child.stderr.on("data", chunk => { if (errorText.length < 8000)
            errorText += String(chunk); });
        const timer = setTimeout(() => { try {
            child.kill("SIGKILL");
        }
        catch { } }, 120_000);
        child.once("error", error => { clearTimeout(timer); reject(error); });
        child.once("exit", code => {
            clearTimeout(timer);
            if (code === 0)
                resolve();
            else
                reject(new Error(`受管安装失败（exit ${code ?? "unknown"}）：${errorText.replace(/\s+/g, " ").slice(0, 500)}`));
        });
    });
}
function packageBinPath(installRoot, packageName, commandName) {
    const packageRoot = path.join(installRoot, "node_modules", ...packageName.split("/"));
    const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[commandName];
    if (!bin)
        throw new Error("语言服务包没有声明预期的可执行入口");
    const executable = path.resolve(packageRoot, String(bin));
    const relative = path.relative(packageRoot, executable);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(executable))
        throw new Error("语言服务入口越过受管安装目录或不存在");
    return executable;
}
function verifyLockIntegrity(installRoot, packageName, expectedIntegrity) {
    const lock = JSON.parse(fs.readFileSync(path.join(installRoot, "package-lock.json"), "utf8"));
    const key = `node_modules/${packageName}`;
    if (String(lock?.packages?.[key]?.integrity || "") !== expectedIntegrity)
        throw new Error("语言服务安装后的artifact checksum与预览不一致");
}
function runManagedCommand(command, args, cwd, timeoutMs, env) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(command, args, { cwd, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: env || process.env });
        let output = "";
        let errorText = "";
        child.stdout.on("data", chunk => { if (output.length < 5_000_000)
            output += String(chunk); });
        child.stderr.on("data", chunk => { if (errorText.length < 8_000)
            errorText += String(chunk); });
        const timer = setTimeout(() => { try {
            child.kill("SIGKILL");
        }
        catch { } }, timeoutMs);
        child.once("error", error => { clearTimeout(timer); reject(error); });
        child.once("exit", code => {
            clearTimeout(timer);
            if (code === 0)
                resolve(output);
            else
                reject(new Error(`受管命令失败（exit ${code ?? "unknown"}）：${errorText.replace(/\s+/g, " ").slice(0, 500)}`));
        });
    });
}
async function downloadVerifiedArtifact(url, target, expectedChecksum, algorithm = "sha256", maxBytes = 300 * 1024 * 1024) {
    const response = await fetch(url, { headers: { "user-agent": "ccm-code-intelligence" }, signal: AbortSignal.timeout(10 * 60_000) });
    if (!response.ok || !response.body)
        throw new Error(`语言服务工具链下载失败：HTTP ${response.status}`);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > maxBytes)
        throw new Error(`语言服务工具链安装包超过${Math.round(maxBytes / 1024 / 1024)}MB安全上限`);
    const hashState = crypto.createHash(algorithm);
    let bytes = 0;
    const verifier = new stream_1.Transform({ transform(chunk, _encoding, callback) {
            bytes += chunk.length;
            if (bytes > maxBytes)
                return callback(new Error(`语言服务工具链下载超过${Math.round(maxBytes / 1024 / 1024)}MB安全上限`));
            hashState.update(chunk);
            callback(null, chunk);
        } });
    await (0, promises_1.pipeline)(stream_1.Readable.fromWeb(response.body), verifier, fs.createWriteStream(target, { flags: "wx" }));
    const normalizedExpected = expectedChecksum.trim();
    const actual = /^[a-f0-9]+$/i.test(normalizedExpected) ? hashState.digest("hex") : hashState.digest("base64");
    if (actual.toLowerCase() !== normalizedExpected.toLowerCase())
        throw new Error(`语言服务工具链${algorithm.toUpperCase()}与官方预览不一致`);
}
async function extractVerifiedArchive(archive, destination) {
    const tar = process.platform === "win32" ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "tar";
    const listing = await runManagedCommand(tar, ["-tf", archive], destination, 30_000);
    const entries = listing.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    if (!entries.length || entries.length > 100_000)
        throw new Error("语言服务工具链压缩包目录无效");
    for (const entry of entries) {
        const normalized = entry.replace(/\\/g, "/");
        if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized) || normalized.split("/").includes(".."))
            throw new Error("语言服务工具链压缩包包含越权路径");
    }
    await runManagedCommand(tar, ["-xf", archive, "-C", destination], destination, 5 * 60_000);
}
async function installGopls(record, finalRoot, stagingRoot) {
    const archive = path.join(stagingRoot, "go-toolchain.archive");
    const checksum = String(record.toolchainChecksum || "");
    if (!record.toolchainUrl?.startsWith("https://go.dev/dl/") || !/^[a-f0-9]{64}$/.test(checksum))
        throw new Error("gopls官方工具链清单无效");
    await downloadVerifiedArtifact(record.toolchainUrl, archive, checksum);
    await extractVerifiedArchive(archive, stagingRoot);
    const goRoot = path.join(stagingRoot, "go");
    const goExecutable = path.join(goRoot, "bin", process.platform === "win32" ? "go.exe" : "go");
    if (!fs.existsSync(goExecutable))
        throw new Error("官方Go工具链缺少go可执行文件");
    const outputDir = path.join(stagingRoot, "output");
    fs.mkdirSync(outputDir, { recursive: true });
    await runManagedCommand(goExecutable, ["install", `${record.packageName}@${record.version}`], stagingRoot, 10 * 60_000, {
        ...process.env,
        GOROOT: goRoot,
        GOBIN: outputDir,
        GOMODCACHE: path.join(stagingRoot, "gomodcache"),
        GOCACHE: path.join(stagingRoot, "gocache"),
        GOENV: "off",
        GOTOOLCHAIN: "local",
        CGO_ENABLED: "0",
    });
    const built = path.join(outputDir, String(record.commandName || (process.platform === "win32" ? "gopls.exe" : "gopls")));
    if (!fs.existsSync(built))
        throw new Error("gopls构建完成但未找到可执行文件");
    await runManagedCommand(built, ["version"], stagingRoot, 20_000);
    if (fs.existsSync(finalRoot))
        fs.rmSync(finalRoot, { recursive: true, force: true });
    const finalBin = path.join(finalRoot, "bin");
    fs.mkdirSync(finalBin, { recursive: true });
    const finalExecutable = path.join(finalBin, path.basename(built));
    fs.copyFileSync(built, finalExecutable);
    return finalExecutable;
}
function findManagedFile(root, predicate) {
    const queue = [root];
    let inspected = 0;
    while (queue.length) {
        const current = queue.shift();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            inspected += 1;
            if (inspected > 100_000)
                throw new Error("语言服务安装目录超过安全扫描上限");
            const full = path.join(current, entry.name);
            if (entry.isSymbolicLink())
                throw new Error("语言服务安装包包含符号链接");
            if (entry.isDirectory())
                queue.push(full);
            else if (entry.isFile() && predicate(full))
                return full;
        }
    }
    return "";
}
function javaExecutable(runtimeRoot) {
    const name = process.platform === "win32" ? "java.exe" : "java";
    const executable = findManagedFile(runtimeRoot, file => path.basename(file).toLowerCase() === name && path.basename(path.dirname(file)).toLowerCase() === "bin");
    if (!executable)
        throw new Error("受管JRE缺少java可执行文件");
    return executable;
}
async function stageArchive(record, stagingRoot, folder = "payload") {
    const archive = path.join(stagingRoot, "language-server.archive");
    if (!record.artifactUrl?.startsWith("https://"))
        throw new Error("语言服务安装包来源无效");
    await downloadVerifiedArtifact(record.artifactUrl, archive, String(record.artifactChecksum || "").replace(/^(sha256|sha512):/, ""), record.artifactChecksumAlgorithm || "sha256");
    const destination = path.join(stagingRoot, folder);
    fs.mkdirSync(destination, { recursive: true });
    await extractVerifiedArchive(archive, destination);
    fs.rmSync(archive, { force: true });
    return destination;
}
async function stageToolchain(record, stagingRoot, folder = "runtime") {
    if (!record.toolchainUrl?.startsWith("https://") || !record.toolchainChecksum)
        throw new Error("受管运行时清单无效");
    const archive = path.join(stagingRoot, "managed-runtime.archive");
    await downloadVerifiedArtifact(record.toolchainUrl, archive, record.toolchainChecksum, record.toolchainChecksumAlgorithm || "sha256");
    const destination = path.join(stagingRoot, folder);
    fs.mkdirSync(destination, { recursive: true });
    await extractVerifiedArchive(archive, destination);
    fs.rmSync(archive, { force: true });
    return destination;
}
async function installArtifactArchive(record, stagingRoot) {
    const payload = await stageArchive(record, stagingRoot);
    const expected = String(record.commandName || "").toLowerCase();
    const executable = findManagedFile(payload, file => path.basename(file).toLowerCase() === expected);
    if (!executable)
        throw new Error(`语言服务安装包缺少${record.commandName || "可执行入口"}`);
    await runManagedCommand(executable, [record.serverId === "lua" ? "-v" : "--version"], path.dirname(executable), 20_000);
    return { executablePath: executable };
}
async function installJdtlsBundle(record, stagingRoot) {
    const serverRoot = await stageArchive(record, stagingRoot, "server");
    const runtimeRoot = await stageToolchain(record, stagingRoot, "runtime");
    const java = javaExecutable(runtimeRoot);
    await runManagedCommand(java, ["-version"], stagingRoot, 20_000);
    const launcher = findManagedFile(serverRoot, file => /^org\.eclipse\.equinox\.launcher_.+\.jar$/i.test(path.basename(file)));
    const configName = process.platform === "win32" ? "config_win" : process.platform === "darwin" ? "config_mac" : "config_linux";
    const config = findManagedFile(serverRoot, file => path.basename(file) === "config.ini" && path.basename(path.dirname(file)) === configName);
    if (!launcher || !config)
        throw new Error("JDT.LS安装包缺少launcher或当前平台配置");
    return {
        executablePath: java,
        launchArgs: [
            "-Declipse.application=org.eclipse.jdt.ls.core.id1", "-Dosgi.bundles.defaultStartLevel=4",
            "-Declipse.product=org.eclipse.jdt.ls.core.product", "-Dlog.protocol=false", "-Dlog.level=WARNING",
            "-Xmx1536m", "--add-modules=ALL-SYSTEM", "--add-opens", "java.base/java.util=ALL-UNNAMED",
            "--add-opens", "java.base/java.lang=ALL-UNNAMED", "-jar", launcher, "-configuration", path.dirname(config),
        ],
    };
}
async function installKotlinBundle(record, stagingRoot) {
    const serverRoot = await stageArchive(record, stagingRoot, "server");
    const runtimeRoot = await stageToolchain(record, stagingRoot, "runtime");
    const java = javaExecutable(runtimeRoot);
    await runManagedCommand(java, ["-version"], stagingRoot, 20_000);
    const serverJar = findManagedFile(serverRoot, file => /^server-[\d.]+\.jar$/i.test(path.basename(file)));
    if (!serverJar)
        throw new Error("Kotlin语言服务安装包缺少server jar");
    return { executablePath: java, launchArgs: [`-DkotlinLanguageServer.version=${record.version}`, "-classpath", path.join(path.dirname(serverJar), "*"), "org.javacs.kt.MainKt"] };
}
async function installDotnetTool(record, stagingRoot) {
    const sdkRoot = await stageToolchain(record, stagingRoot, "dotnet");
    const dotnetName = process.platform === "win32" ? "dotnet.exe" : "dotnet";
    const dotnet = findManagedFile(sdkRoot, file => path.basename(file).toLowerCase() === dotnetName);
    if (!dotnet)
        throw new Error("受管.NET SDK缺少dotnet入口");
    await runManagedCommand(dotnet, ["--version"], stagingRoot, 30_000, { ...process.env, DOTNET_ROOT: path.dirname(dotnet), DOTNET_MULTILEVEL_LOOKUP: "0", DOTNET_NOLOGO: "1", DOTNET_CLI_TELEMETRY_OPTOUT: "1" });
    const sourceRoot = path.join(stagingRoot, "nuget-source");
    fs.mkdirSync(sourceRoot, { recursive: true });
    const packageFile = path.join(sourceRoot, `${record.packageName}.${record.version}.nupkg`);
    await downloadVerifiedArtifact(String(record.artifactUrl || ""), packageFile, String(record.artifactChecksum || "").replace(/^sha512:/, ""), "sha512", 100 * 1024 * 1024);
    const configFile = path.join(stagingRoot, "NuGet.Config");
    fs.writeFileSync(configFile, `<?xml version="1.0" encoding="utf-8"?><configuration><packageSources><clear/><add key="ccm-local" value="${sourceRoot.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"/></packageSources></configuration>`, "utf8");
    const outputRoot = path.join(stagingRoot, "tool");
    const env = { ...process.env, DOTNET_ROOT: path.dirname(dotnet), DOTNET_MULTILEVEL_LOOKUP: "0", DOTNET_NOLOGO: "1", DOTNET_CLI_TELEMETRY_OPTOUT: "1", NUGET_PACKAGES: path.join(stagingRoot, "nuget-packages") };
    await runManagedCommand(dotnet, ["tool", "install", String(record.packageName || "csharp-ls"), "--tool-path", outputRoot, "--version", record.version, "--configfile", configFile, "--no-cache"], stagingRoot, 5 * 60_000, env);
    const executable = findManagedFile(outputRoot, file => path.basename(file).toLowerCase() === String(record.commandName || "").toLowerCase());
    if (!executable)
        throw new Error("csharp-ls安装完成但缺少可执行入口");
    await runManagedCommand(executable, ["--version"], stagingRoot, 30_000, env);
    return { executablePath: executable, launchEnvironment: { DOTNET_ROOT: path.dirname(dotnet), DOTNET_MULTILEVEL_LOOKUP: "0", DOTNET_NOLOGO: "1", DOTNET_CLI_TELEMETRY_OPTOUT: "1" } };
}
async function extractSevenZipArchive(record, archive, destination, stagingRoot) {
    const cli = npmCliPath();
    if (!cli || record.extractorPackage !== "7zip-bin" || !record.extractorVersion || !record.extractorIntegrity)
        throw new Error("Ruby受管安装缺少已校验的7-Zip解压器");
    const extractorRoot = path.join(stagingRoot, "extractor");
    fs.mkdirSync(extractorRoot, { recursive: true });
    await runNpmInstall(cli, extractorRoot, record.extractorPackage, record.extractorVersion);
    verifyLockIntegrity(extractorRoot, record.extractorPackage, record.extractorIntegrity);
    const executableName = process.platform === "win32" ? "7za.exe" : "7za";
    const executable = findManagedFile(extractorRoot, file => path.basename(file).toLowerCase() === executableName);
    if (!executable)
        throw new Error("安全解压器安装完成但缺少7za入口");
    const listing = await runManagedCommand(executable, ["l", "-slt", archive], stagingRoot, 30_000);
    const entries = listing.split(/-{10,}/).slice(1).join("\n").split(/\r?\n/).filter(line => line.startsWith("Path = ")).map(line => line.slice(7).trim()).filter(Boolean);
    if (!entries.length || entries.length > 100_000)
        throw new Error("Ruby运行时压缩包目录无效");
    for (const entry of entries) {
        const normalized = entry.replace(/\\/g, "/");
        if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized) || normalized.split("/").includes(".."))
            throw new Error("Ruby运行时压缩包包含越权路径");
    }
    await runManagedCommand(executable, ["x", "-y", `-o${destination}`, archive], stagingRoot, 120_000);
    fs.rmSync(extractorRoot, { recursive: true, force: true });
}
async function installRubyBundle(record, stagingRoot) {
    const archive = path.join(stagingRoot, "ruby-runtime.7z");
    if (!record.artifactUrl?.startsWith("https://github.com/"))
        throw new Error("RubyInstaller来源无效");
    await downloadVerifiedArtifact(record.artifactUrl, archive, String(record.artifactChecksum || "").replace(/^sha256:/, ""), "sha256", 100 * 1024 * 1024);
    const runtimeRoot = path.join(stagingRoot, "ruby");
    fs.mkdirSync(runtimeRoot, { recursive: true });
    await extractSevenZipArchive(record, archive, runtimeRoot, stagingRoot);
    fs.rmSync(archive, { force: true });
    const ruby = findManagedFile(runtimeRoot, file => path.basename(file).toLowerCase() === "ruby.exe" && path.basename(path.dirname(file)).toLowerCase() === "bin");
    const gem = findManagedFile(runtimeRoot, file => path.basename(file).toLowerCase() === "gem" && path.basename(path.dirname(file)).toLowerCase() === "bin");
    if (!ruby || !gem)
        throw new Error("RubyInstaller安装包缺少ruby.exe或gem启动脚本");
    const packageFile = path.join(stagingRoot, `ruby-lsp-${record.version}.gem`);
    await downloadVerifiedArtifact(String(record.packageUrl || ""), packageFile, String(record.packageChecksum || ""), "sha256", 50 * 1024 * 1024);
    const gemHome = path.join(stagingRoot, "gems");
    const gemBin = path.join(gemHome, "bin");
    const env = { ...process.env, GEM_HOME: gemHome, GEM_PATH: gemHome, PATH: `${path.dirname(ruby)}${path.delimiter}${process.env.PATH || ""}` };
    await runManagedCommand(ruby, [gem, "install", packageFile, "--no-document", "--install-dir", gemHome, "--bindir", gemBin, "--clear-sources", "--source", "https://rubygems.org"], stagingRoot, 10 * 60_000, env);
    const entry = findManagedFile(gemBin, file => path.basename(file).toLowerCase() === "ruby-lsp");
    if (!entry)
        throw new Error("ruby-lsp安装完成但缺少启动脚本");
    await runManagedCommand(ruby, [gem, "list", "--local", "ruby-lsp", "--exact"], stagingRoot, 30_000, env);
    return { executablePath: ruby, launchArgs: [entry], launchEnvironment: { GEM_HOME: gemHome, GEM_PATH: gemHome } };
}
function rebaseInstallResult(result, stagingRoot, finalRoot) {
    const rebase = (value) => value.startsWith(stagingRoot) ? path.join(finalRoot, path.relative(stagingRoot, value)) : value;
    return {
        executablePath: rebase(result.executablePath),
        launchArgs: result.launchArgs?.map(rebase),
        launchEnvironment: result.launchEnvironment ? Object.fromEntries(Object.entries(result.launchEnvironment).map(([key, value]) => [key, value.split(path.delimiter).map(rebase).join(path.delimiter)])) : undefined,
    };
}
function commitStagingRoot(stagingRoot, finalRoot) {
    const backupRoot = `${finalRoot}.rollback-${Date.now()}`;
    if (fs.existsSync(finalRoot))
        fs.renameSync(finalRoot, backupRoot);
    try {
        fs.renameSync(stagingRoot, finalRoot);
        if (fs.existsSync(backupRoot))
            fs.rmSync(backupRoot, { recursive: true, force: true });
    }
    catch (error) {
        if (fs.existsSync(finalRoot))
            fs.rmSync(finalRoot, { recursive: true, force: true });
        if (fs.existsSync(backupRoot))
            fs.renameSync(backupRoot, finalRoot);
        throw error;
    }
}
function startManagedLanguageServerInstall(serverId, input) {
    const record = getManagedLanguageServerRecord(serverId);
    if (!record || record.installState !== "previewed" || !record.installSupported)
        throw new Error("请先生成有效的语言服务安装预览");
    if (Date.parse(record.expiresAt) <= Date.now())
        throw new Error("语言服务安装预览已过期，请重新预览");
    if (String(input.manifestChecksum || "") !== record.manifestChecksum || Number(input.revision || 0) !== record.revision)
        throw new Error("语言服务安装预览版本或checksum不匹配");
    if (pendingInstalls.has(serverId))
        return publicRecord({ ...record, installState: "installing" });
    const installing = writeRecord({ ...record, installState: "installing", updatedAt: new Date().toISOString() });
    const task = (async () => {
        const finalRoot = path.join(INSTALL_ROOT, serverId, record.version, `${process.platform}-${process.arch}`);
        const stagingRoot = `${finalRoot}.staging-${record.revision}`;
        fs.mkdirSync(path.dirname(finalRoot), { recursive: true });
        if (fs.existsSync(stagingRoot))
            fs.rmSync(stagingRoot, { recursive: true, force: true });
        fs.mkdirSync(stagingRoot, { recursive: true });
        try {
            let finalExecutable = "";
            let launchArgs;
            let launchEnvironment;
            if (record.installerKind === "go_toolchain") {
                finalExecutable = await installGopls(record, finalRoot, stagingRoot);
                fs.rmSync(stagingRoot, { recursive: true, force: true });
            }
            else if (["artifact_archive", "jdtls_bundle", "kotlin_bundle", "dotnet_tool", "ruby_bundle"].includes(String(record.installerKind || ""))) {
                let staged;
                if (record.installerKind === "artifact_archive")
                    staged = await installArtifactArchive(record, stagingRoot);
                else if (record.installerKind === "jdtls_bundle")
                    staged = await installJdtlsBundle(record, stagingRoot);
                else if (record.installerKind === "kotlin_bundle")
                    staged = await installKotlinBundle(record, stagingRoot);
                else if (record.installerKind === "dotnet_tool")
                    staged = await installDotnetTool(record, stagingRoot);
                else
                    staged = await installRubyBundle(record, stagingRoot);
                const installed = rebaseInstallResult(staged, stagingRoot, finalRoot);
                commitStagingRoot(stagingRoot, finalRoot);
                finalExecutable = installed.executablePath;
                launchArgs = installed.launchArgs;
                launchEnvironment = installed.launchEnvironment;
            }
            else {
                const cli = npmCliPath();
                if (!cli)
                    throw new Error("当前CCM运行环境没有可安全调用的npm-cli.js");
                await runNpmInstall(cli, stagingRoot, String(record.packageName || ""), record.version);
                verifyLockIntegrity(stagingRoot, String(record.packageName || ""), record.artifactChecksum);
                const executablePath = packageBinPath(stagingRoot, String(record.packageName || ""), String(record.commandName || ""));
                if (fs.existsSync(finalRoot))
                    fs.rmSync(finalRoot, { recursive: true, force: true });
                fs.renameSync(stagingRoot, finalRoot);
                finalExecutable = path.join(finalRoot, path.relative(stagingRoot, executablePath));
            }
            writeRecord({ ...record, installState: "available", executablePath: finalExecutable, launchArgs, launchEnvironment, errorSummary: "", updatedAt: new Date().toISOString() });
        }
        catch (error) {
            try {
                if (fs.existsSync(stagingRoot))
                    fs.rmSync(stagingRoot, { recursive: true, force: true });
            }
            catch { }
            writeRecord({ ...record, installState: "failed", errorSummary: String(error?.message || error).slice(0, 500), updatedAt: new Date().toISOString() });
            throw error;
        }
    })().finally(() => pendingInstalls.delete(serverId));
    pendingInstalls.set(serverId, task);
    task.catch(() => { });
    return publicRecord(installing);
}
function managedLanguageServerError(serverId) {
    return String(getManagedLanguageServerRecord(serverId)?.errorSummary || "").slice(0, 500);
}
//# sourceMappingURL=managed-language-servers.js.map