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
exports.resolveProjectIdentifier = resolveProjectIdentifier;
exports.projectDisplayName = projectDisplayName;
exports.saveProjectDisplayName = saveProjectDisplayName;
exports.detectProjectRuntimeProfilesAt = detectProjectRuntimeProfilesAt;
exports.detectProjectRuntimeProfiles = detectProjectRuntimeProfiles;
exports.getProjectRuntimeConfig = getProjectRuntimeConfig;
exports.rescanProjectRuntimeProfiles = rescanProjectRuntimeProfiles;
exports.saveProjectRuntimeConfig = saveProjectRuntimeConfig;
exports.detectProjectJavaToolchainCandidates = detectProjectJavaToolchainCandidates;
exports.resolveProjectJavaToolchainExecution = resolveProjectJavaToolchainExecution;
exports.testProjectJavaToolchain = testProjectJavaToolchain;
exports.stopManagedProjectRuntimesForShutdown = stopManagedProjectRuntimesForShutdown;
exports.startProjectRuntime = startProjectRuntime;
exports.stopProjectRuntime = stopProjectRuntime;
exports.restartProjectRuntime = restartProjectRuntime;
exports.buildProjectRuntime = buildProjectRuntime;
exports.getProjectRuntimeLogs = getProjectRuntimeLogs;
exports.subscribeProjectRuntimeLogs = subscribeProjectRuntimeLogs;
exports.getProjectRuntimeSnapshot = getProjectRuntimeSnapshot;
exports.getProjectRuntimeSummary = getProjectRuntimeSummary;
exports.executeProjectRuntimeAction = executeProjectRuntimeAction;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const runtime_events_1 = require("../../system/runtime-events");
const utils_2 = require("../../test-agent/utils");
const project_validation_1 = require("./project-validation");
const RUNTIME_DIR = path.join(utils_1.CCM_DIR, "project-runtime");
const STATE_FILE = path.join(RUNTIME_DIR, "state.json");
const RUNTIME_LOG_DIR = path.join(utils_1.LOG_DIR, "project-runtime");
// Bump when detected profile fields or command recovery behavior changes so
// existing projects are lazily rescanned without overwriting manual profiles.
const RUNTIME_DETECTOR_VERSION = 5;
const EXCLUDED_DIRS = new Set([".git", "node_modules", "target", "dist", "build", ".idea", ".vscode", "coverage"]);
const PROFILE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DEFAULT_JAVA_TOOLCHAIN = {
    schema: "ccm-project-java-toolchain-v1",
    jdkMode: "inherit",
    jdkHome: "",
    mavenMode: "auto",
    mavenHome: "",
    settingsPath: "",
    localRepository: "",
    offline: false,
};
const liveProcesses = new Map();
const liveBuilds = new Map();
const runtimeLogListeners = new Map();
function ensureRuntimeDirs() {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    fs.mkdirSync(RUNTIME_LOG_DIR, { recursive: true });
}
function runtimeKey(project, profileId) {
    return `${project}::${profileId}`;
}
function readState() {
    ensureRuntimeDirs();
    try {
        const value = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
        return { processes: value?.processes || {}, builds: value?.builds || {} };
    }
    catch {
        return { processes: {}, builds: {} };
    }
}
function writeState(state) {
    ensureRuntimeDirs();
    const temp = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(state, null, 2), "utf-8");
    if (fs.existsSync(STATE_FILE))
        fs.unlinkSync(STATE_FILE);
    fs.renameSync(temp, STATE_FILE);
}
function resolveProjectIdentifier(project) {
    const requested = String(project || "").trim();
    const configs = (0, db_1.getConfigs)();
    const direct = configs.find(item => item.name.toLowerCase() === requested.toLowerCase());
    if (direct)
        return direct.name;
    const metadata = (0, db_1.loadProjectConfigs)();
    const matches = configs.filter(item => String(metadata[item.name]?.display_name || item.name).trim().toLowerCase() === requested.toLowerCase());
    if (matches.length > 1)
        throw new Error("项目显示名称匹配到多个项目，请使用内部项目 ID");
    if (matches.length === 1)
        return matches[0].name;
    throw new Error("项目不存在或已经归档");
}
function projectConfig(project) {
    const safeProject = (0, project_validation_1.validateProjectName)(resolveProjectIdentifier(project));
    const config = (0, db_1.getConfigs)().find(item => item.name === safeProject);
    if (!config)
        throw new Error("项目不存在或已经归档");
    const workDir = (0, project_validation_1.validateWorkDirectory)((0, db_1.getConfigInfo)(config.path)[0]?.workDir || "");
    return { project: safeProject, workDir };
}
function cleanDisplayName(value) {
    const name = String(value || "").trim();
    if (!name)
        throw new Error("项目显示名称不能为空");
    if (name.length > 80)
        throw new Error("项目显示名称不能超过 80 个字符");
    if (/\p{C}/u.test(name))
        throw new Error("项目显示名称包含无效字符");
    return name;
}
function projectDisplayName(project) {
    const safeProject = (0, project_validation_1.validateProjectName)(project);
    const configs = (0, db_1.loadProjectConfigs)();
    return String(configs[safeProject]?.display_name || safeProject).trim() || safeProject;
}
function saveProjectDisplayName(project, displayName) {
    const safeProject = projectConfig(project).project;
    const safeDisplayName = cleanDisplayName(displayName);
    const configs = (0, db_1.loadProjectConfigs)();
    for (const config of (0, db_1.getConfigs)()) {
        if (config.name === safeProject)
            continue;
        const existing = String(configs[config.name]?.display_name || config.name).trim();
        if (existing.localeCompare(safeDisplayName, undefined, { sensitivity: "accent" }) === 0) {
            throw new Error("项目显示名称已被其他活动项目使用");
        }
    }
    if (!configs[safeProject])
        configs[safeProject] = {};
    configs[safeProject].display_name = safeDisplayName;
    (0, db_1.saveProjectConfigs)(configs);
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.display_name.changed", { project: safeProject });
    return safeDisplayName;
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function relativeModule(root, dir) {
    const relative = path.relative(root, dir).replace(/\\/g, "/");
    return relative && relative !== "." ? relative : ".";
}
function profileId(type, modulePath, environment) {
    return `runtime_${crypto.createHash("sha1").update(`${type}:${modulePath}:${environment}`).digest("hex").slice(0, 16)}`;
}
function makeDetectedProfile(input) {
    const id = profileId(input.projectType, input.modulePath, input.environment);
    const base = { ...input, id, source: "detected", enabled: true };
    return { ...base, detectedChecksum: checksum(base) };
}
function scanManifestDirectories(root, maxDepth = 3) {
    const directories = [];
    const queue = [{ dir: root, depth: 0 }];
    while (queue.length && directories.length < 240) {
        const current = queue.shift();
        directories.push(current.dir);
        if (current.depth >= maxDepth)
            continue;
        let entries = [];
        try {
            entries = fs.readdirSync(current.dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith("."))
                continue;
            queue.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 });
        }
    }
    return directories;
}
function packageManagerFor(dir, manifest) {
    const declared = String(manifest?.packageManager || "").split("@")[0];
    if (["npm", "pnpm", "yarn", "bun"].includes(declared))
        return declared;
    if (fs.existsSync(path.join(dir, "pnpm-lock.yaml")))
        return "pnpm";
    if (fs.existsSync(path.join(dir, "yarn.lock")))
        return "yarn";
    if (fs.existsSync(path.join(dir, "bun.lock")) || fs.existsSync(path.join(dir, "bun.lockb")))
        return "bun";
    return "npm";
}
function detectNodeProfiles(project, root, dir) {
    const file = path.join(dir, "package.json");
    if (!fs.existsSync(file))
        return [];
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return [];
    }
    const scripts = manifest?.scripts && typeof manifest.scripts === "object" ? manifest.scripts : {};
    const names = Object.keys(scripts).filter(name => /^[A-Za-z0-9:_-]+$/.test(name));
    const runNames = names.filter(name => /^(dev|start|serve|preview)(?::|$)/i.test(name));
    const buildNames = names.filter(name => /^build(?::|$)/i.test(name));
    if (!runNames.length && !buildNames.length)
        return [];
    const manager = packageManagerFor(dir, manifest);
    const modulePath = relativeModule(root, dir);
    const moduleLabel = modulePath === "." ? String(manifest.name || project) : modulePath;
    const environments = new Set();
    for (const name of [...runNames, ...buildNames])
        environments.add(name.includes(":") ? name.split(":").slice(1).join(":") : "default");
    return [...environments].map(environment => {
        const exactRun = runNames.find(name => (name.includes(":") ? name.split(":").slice(1).join(":") : "default") === environment) || "";
        const exactBuild = buildNames.find(name => (name.includes(":") ? name.split(":").slice(1).join(":") : "default") === environment)
            || (environment !== "default" ? buildNames.find(name => name === "build") : "") || "";
        return makeDetectedProfile({
            label: `${moduleLabel}${environment === "default" ? "" : ` · ${environment}`}`,
            projectId: project,
            modulePath,
            projectType: "node",
            environment,
            runCommand: exactRun ? `${manager} run ${exactRun}` : "",
            buildCommand: exactBuild ? `${manager} run ${exactBuild}` : "",
            artifactPatterns: ["dist", "build"],
        });
    });
}
function executableAt(root, base) {
    const windows = path.join(root, `${base}.cmd`);
    const windowsBat = path.join(root, `${base}.bat`);
    const unix = path.join(root, base);
    if (process.platform === "win32" && fs.existsSync(windows))
        return `.\\${base}.cmd`;
    if (process.platform === "win32" && fs.existsSync(windowsBat))
        return `.\\${base}.bat`;
    if (fs.existsSync(unix))
        return `./${base}`;
    return base === "mvnw" ? "mvn" : "gradle";
}
function stripXmlComments(value) {
    return value.replace(/<!--[\s\S]*?-->/g, "");
}
function hasSpringBootApplication(dir) {
    const roots = [path.join(dir, "src", "main", "java"), path.join(dir, "src", "main", "kotlin")]
        .filter(candidate => fs.existsSync(candidate));
    const queue = [...roots];
    let inspected = 0;
    while (queue.length && inspected < 1200) {
        const current = queue.shift();
        let entries = [];
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                queue.push(full);
                continue;
            }
            if (!entry.isFile() || !/\.(?:java|kt)$/i.test(entry.name))
                continue;
            inspected += 1;
            try {
                if (/@SpringBootApplication\b/.test(fs.readFileSync(full, "utf-8")))
                    return true;
            }
            catch { }
        }
    }
    return false;
}
function detectMavenProfiles(project, root, dir) {
    const file = path.join(dir, "pom.xml");
    if (!fs.existsSync(file))
        return [];
    const content = stripXmlComments(fs.readFileSync(file, "utf-8"));
    const modulePath = relativeModule(root, dir);
    const runner = executableAt(root, "mvnw");
    const selector = modulePath === "." ? "" : ` -pl ${modulePath.replace(/\\/g, "/")} -am`;
    const modulePom = modulePath === "." ? "" : ` -f ${modulePath.replace(/\\/g, "/")}/pom.xml`;
    const packaging = content.match(/<packaging>\s*([^<]+)\s*<\/packaging>/i)?.[1]?.trim() || "jar";
    const runnable = packaging !== "pom" && (/<mainClass>|<start-class>/i.test(content)
        || /spring-boot-maven-plugin/i.test(content)
        || hasSpringBootApplication(dir));
    if (!runnable && packaging !== "pom")
        return [];
    const label = modulePath === "."
        ? `${project} · ${runnable ? "Spring Boot" : "Maven 构建"}`
        : `${modulePath} · ${runnable ? "Spring Boot" : "Maven 构建"}`;
    return [makeDetectedProfile({
            label,
            projectId: project,
            modulePath: ".",
            projectType: "maven",
            environment: modulePath === "." ? "default" : modulePath,
            runCommand: runnable ? `${runner}${modulePom} spring-boot:run` : "",
            // Runtime hydration only installs reactor artifacts. Maven's skipTests still
            // compiles test sources, which can prevent an otherwise runnable service
            // from starting when stale tests exist in a sibling module.
            prepareCommand: runnable && modulePath !== "." ? `${runner}${selector} install -Dmaven.test.skip=true` : "",
            buildCommand: `${runner}${selector} package`,
            artifactPatterns: modulePath === "." ? ["target/*.jar", "*/target/*.jar", "*/*/target/*.jar"] : [`${modulePath}/target/*.jar`],
        })];
}
function detectGradleProfiles(project, root, dir) {
    const file = ["build.gradle.kts", "build.gradle"].map(name => path.join(dir, name)).find(candidate => fs.existsSync(candidate));
    if (!file)
        return [];
    const content = fs.readFileSync(file, "utf-8");
    const modulePath = relativeModule(root, dir);
    const runner = executableAt(root, "gradlew");
    const selector = modulePath === "." ? "" : `:${modulePath.replace(/\//g, ":")}:`;
    const springBoot = /org\.springframework\.boot/i.test(content) || hasSpringBootApplication(dir);
    const runnable = springBoot || /id\s*[('" ]+application|application\s*\{/i.test(content);
    return [makeDetectedProfile({
            label: modulePath === "."
                ? `${project} · ${springBoot ? "Spring Boot" : "Gradle"}`
                : `${modulePath} · ${springBoot ? "Spring Boot" : "Gradle"}`,
            projectId: project,
            modulePath: ".",
            projectType: "gradle",
            environment: modulePath === "." ? "default" : modulePath,
            runCommand: runnable ? `${runner} ${selector}${springBoot ? "bootRun" : "run"}` : "",
            buildCommand: `${runner} ${selector}build`,
            artifactPatterns: modulePath === "." ? ["build/libs/*.jar", "*/build/libs/*.jar"] : [`${modulePath}/build/libs/*.jar`],
        })];
}
function detectSimpleRootProfiles(project, root) {
    if (fs.existsSync(path.join(root, "go.mod")))
        return [makeDetectedProfile({ label: `${project} · Go`, projectId: project, modulePath: ".", projectType: "go", environment: "default", runCommand: "go run .", buildCommand: "go build ./...", artifactPatterns: [], })];
    if (fs.existsSync(path.join(root, "Cargo.toml")))
        return [makeDetectedProfile({ label: `${project} · Rust`, projectId: project, modulePath: ".", projectType: "rust", environment: "default", runCommand: "cargo run", buildCommand: "cargo build --release", artifactPatterns: ["target/release"], })];
    const dotnet = fs.readdirSync(root).find(name => /\.(?:sln|csproj)$/i.test(name));
    if (dotnet)
        return [makeDetectedProfile({ label: `${project} · .NET`, projectId: project, modulePath: ".", projectType: "dotnet", environment: "default", runCommand: "dotnet run", buildCommand: "dotnet build", artifactPatterns: ["bin"], })];
    return [];
}
function detectProjectRuntimeProfilesAt(project, workDir) {
    const safeProject = (0, project_validation_1.validateProjectName)(project);
    const safeWorkDir = (0, project_validation_1.validateWorkDirectory)(workDir);
    const profiles = [];
    for (const dir of scanManifestDirectories(safeWorkDir)) {
        profiles.push(...detectNodeProfiles(safeProject, safeWorkDir, dir));
        profiles.push(...detectMavenProfiles(safeProject, safeWorkDir, dir));
        profiles.push(...detectGradleProfiles(safeProject, safeWorkDir, dir));
    }
    profiles.push(...detectSimpleRootProfiles(safeProject, safeWorkDir));
    const unique = new Map();
    for (const profile of profiles)
        if (!unique.has(profile.id))
            unique.set(profile.id, profile);
    return [...unique.values()];
}
function detectProjectRuntimeProfiles(project) {
    const { project: safeProject, workDir } = projectConfig(project);
    return detectProjectRuntimeProfilesAt(safeProject, workDir);
}
function validateProfile(project, profile) {
    const safeProject = (0, project_validation_1.validateProjectName)(project);
    const id = String(profile?.id || "").trim();
    if (!PROFILE_ID_PATTERN.test(id))
        throw new Error("运行配置 ID 无效");
    const projectType = String(profile?.projectType || "custom");
    if (!["node", "maven", "gradle", "go", "rust", "dotnet", "custom"].includes(projectType))
        throw new Error("运行配置类型无效");
    const modulePath = String(profile?.modulePath || ".").trim().replace(/\\/g, "/") || ".";
    const { workDir } = projectConfig(safeProject);
    const moduleDir = (0, project_validation_1.resolveContainedPath)(workDir, modulePath);
    if (!fs.existsSync(moduleDir) || !fs.statSync(moduleDir).isDirectory())
        throw new Error(`运行模块目录不存在：${modulePath}`);
    const runCommand = String(profile?.runCommand || "").trim();
    const prepareCommand = String(profile?.prepareCommand || "").trim();
    const buildCommand = String(profile?.buildCommand || "").trim();
    for (const command of [runCommand, prepareCommand, buildCommand].filter(Boolean)) {
        const invocation = (0, utils_2.verificationCommandInvocation)(command);
        if (invocation.error)
            throw new Error(`运行命令不安全：${invocation.error}`);
    }
    const artifactPatterns = Array.isArray(profile?.artifactPatterns) ? profile.artifactPatterns.map((item) => String(item || "").trim().replace(/\\/g, "/")).filter(Boolean).slice(0, 12) : [];
    if (artifactPatterns.some((pattern) => path.isAbsolute(pattern) || pattern.split("/").includes("..")))
        throw new Error("产物路径不能超出项目目录");
    return {
        id,
        label: String(profile?.label || id).trim().slice(0, 100) || id,
        projectId: safeProject,
        modulePath,
        projectType,
        environment: String(profile?.environment || "default").trim().slice(0, 80) || "default",
        runCommand,
        prepareCommand,
        buildCommand,
        artifactPatterns,
        source: profile?.source === "manual" ? "manual" : "detected",
        enabled: profile?.enabled !== false,
        detectedChecksum: String(profile?.detectedChecksum || checksum(profile)),
        stale: profile?.stale === true,
    };
}
function normalizedToolchainPath(value, label) {
    const raw = String(value || "").trim().replace(/^"(.*)"$/, "$1");
    if (!raw)
        return "";
    if (/[\r\n\u0000]/.test(raw))
        throw new Error(`${label}包含无效字符`);
    if (/[&|<>`^%!;]/.test(raw))
        throw new Error(`${label}包含不允许的命令字符`);
    if (!path.isAbsolute(raw))
        throw new Error(`${label}必须使用绝对路径`);
    return path.normalize(raw);
}
function normalizeProjectJavaToolchain(input) {
    const jdkMode = String(input?.jdkMode || input?.jdk_mode || "inherit") === "custom" ? "custom" : "inherit";
    const requestedMavenMode = String(input?.mavenMode || input?.maven_mode || "auto");
    const mavenMode = (["auto", "wrapper", "system", "custom"].includes(requestedMavenMode) ? requestedMavenMode : "auto");
    return {
        schema: "ccm-project-java-toolchain-v1",
        jdkMode,
        jdkHome: normalizedToolchainPath(input?.jdkHome || input?.jdk_home, "JDK目录"),
        mavenMode,
        mavenHome: normalizedToolchainPath(input?.mavenHome || input?.maven_home, "Maven目录"),
        settingsPath: normalizedToolchainPath(input?.settingsPath || input?.settings_path, "settings.xml路径"),
        localRepository: normalizedToolchainPath(input?.localRepository || input?.local_repository, "Maven本地仓库路径"),
        offline: input?.offline === true,
    };
}
function existingExecutable(home, candidates) {
    for (const relative of candidates) {
        const file = path.join(home, ...relative.split("/"));
        try {
            if (fs.statSync(file).isFile())
                return file;
        }
        catch { }
    }
    return "";
}
function projectWrapperExecutable(workDir, base) {
    const candidates = process.platform === "win32"
        ? [`${base}.cmd`, `${base}.bat`, base]
        : [base, `${base}.cmd`, `${base}.bat`];
    return existingExecutable(workDir, candidates);
}
function validateProjectJavaToolchain(project, input) {
    const toolchain = normalizeProjectJavaToolchain(input || DEFAULT_JAVA_TOOLCHAIN);
    const { workDir } = projectConfig(project);
    if (toolchain.jdkMode === "custom") {
        if (!toolchain.jdkHome)
            throw new Error("请选择 JDK目录");
        if (!existingExecutable(toolchain.jdkHome, process.platform === "win32" ? ["bin/java.exe", "bin/java.cmd"] : ["bin/java"])) {
            throw new Error("JDK目录无效，未找到 bin/java");
        }
        if (!existingExecutable(toolchain.jdkHome, process.platform === "win32" ? ["bin/javac.exe", "bin/javac.cmd"] : ["bin/javac"])) {
            throw new Error("JDK目录无效，未找到 bin/javac");
        }
    }
    if (toolchain.mavenMode === "wrapper" && !projectWrapperExecutable(workDir, "mvnw")) {
        throw new Error("当前项目不存在 Maven Wrapper");
    }
    if (toolchain.mavenMode === "custom") {
        if (!toolchain.mavenHome)
            throw new Error("请选择 Maven目录");
        if (!existingExecutable(toolchain.mavenHome, process.platform === "win32" ? ["bin/mvn.cmd", "bin/mvn.bat", "bin/mvn.exe"] : ["bin/mvn"])) {
            throw new Error("Maven目录无效，未找到 bin/mvn");
        }
    }
    if (toolchain.settingsPath) {
        try {
            if (!fs.statSync(toolchain.settingsPath).isFile())
                throw new Error();
        }
        catch {
            throw new Error("settings.xml文件不存在或不可读取");
        }
    }
    if (toolchain.localRepository) {
        let parent = toolchain.localRepository;
        while (!fs.existsSync(parent)) {
            const next = path.dirname(parent);
            if (next === parent)
                break;
            parent = next;
        }
        try {
            if (!fs.statSync(parent).isDirectory())
                throw new Error();
        }
        catch {
            throw new Error("Maven本地仓库的上级目录不存在或不可读取");
        }
    }
    return toolchain;
}
function getProjectRuntimeConfig(project) {
    const safeProject = projectConfig(project).project;
    const configs = (0, db_1.loadProjectConfigs)();
    const runtime = configs[safeProject]?.runtime || {};
    if (Number(runtime.detector_version || 0) !== RUNTIME_DETECTOR_VERSION
        && Array.isArray(runtime.profiles)
        && runtime.profiles.some((profile) => profile?.source !== "manual")) {
        const snapshot = rescanProjectRuntimeProfiles(safeProject);
        return {
            profiles: snapshot.profiles,
            selectedProfileId: snapshot.selected_profile_id,
            toolchain: normalizeProjectJavaToolchain(snapshot.toolchain || runtime.toolchain || DEFAULT_JAVA_TOOLCHAIN),
        };
    }
    const profiles = Array.isArray(runtime.profiles) ? runtime.profiles.map((profile) => validateProfile(safeProject, profile)) : [];
    return {
        profiles,
        selectedProfileId: recommendedRuntimeProfileId(profiles, runtime.selected_profile_id),
        toolchain: normalizeProjectJavaToolchain(runtime.toolchain || DEFAULT_JAVA_TOOLCHAIN),
    };
}
function recommendedRuntimeProfileId(profiles, requested = "") {
    const available = profiles.filter(profile => profile.enabled && !profile.stale);
    const selected = String(requested || "");
    if (selected && available.some(profile => profile.id === selected))
        return selected;
    return available.find(profile => profile.runCommand)?.id
        || available.find(profile => profile.buildCommand)?.id
        || available[0]?.id
        || "";
}
function detectedProfileWasUnmodified(profile) {
    const recorded = String(profile?.detectedChecksum || "");
    if (!recorded)
        return false;
    const { detectedChecksum: _detectedChecksum, stale: _stale, ...base } = profile;
    return checksum(base) === recorded;
}
function rescanProjectRuntimeProfiles(project) {
    const safeProject = projectConfig(project).project;
    const detected = detectProjectRuntimeProfiles(safeProject);
    const configs = (0, db_1.loadProjectConfigs)();
    if (!configs[safeProject])
        configs[safeProject] = {};
    const existing = Array.isArray(configs[safeProject].runtime?.profiles) ? configs[safeProject].runtime.profiles : [];
    const detectedById = new Map(detected.map(profile => [profile.id, profile]));
    const merged = existing.map((profile) => {
        if (profile.source === "manual")
            return profile;
        const next = detectedById.get(profile.id);
        if (!next)
            return { ...profile, stale: true };
        detectedById.delete(profile.id);
        if (detectedProfileWasUnmodified(profile))
            return { ...next, stale: false };
        return { ...next, ...profile, projectId: safeProject, detectedChecksum: next.detectedChecksum, stale: false };
    });
    merged.push(...detectedById.values());
    const selected = String(configs[safeProject].runtime?.selected_profile_id || "");
    configs[safeProject].runtime = {
        ...(configs[safeProject].runtime || {}),
        profiles: merged,
        selected_profile_id: recommendedRuntimeProfileId(merged, selected),
        detector_version: RUNTIME_DETECTOR_VERSION,
        scanned_at: new Date().toISOString(),
    };
    (0, db_1.saveProjectConfigs)(configs);
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.runtime.profiles_rescanned", { project: safeProject, count: merged.length });
    return getProjectRuntimeSnapshot(safeProject);
}
function saveProjectRuntimeConfig(project, input) {
    const safeProject = projectConfig(project).project;
    const profiles = (Array.isArray(input?.profiles) ? input.profiles : []).map((profile) => validateProfile(safeProject, profile));
    const ids = new Set();
    for (const profile of profiles) {
        if (ids.has(profile.id))
            throw new Error("运行配置 ID 重复");
        ids.add(profile.id);
    }
    const selected = String(input?.selectedProfileId || input?.selected_profile_id || "");
    if (selected && !profiles.some(profile => profile.id === selected && profile.enabled))
        throw new Error("默认运行配置不存在或未启用");
    const configs = (0, db_1.loadProjectConfigs)();
    if (!configs[safeProject])
        configs[safeProject] = {};
    const currentRuntime = configs[safeProject].runtime || {};
    const toolchain = input?.toolchain === undefined
        ? normalizeProjectJavaToolchain(currentRuntime.toolchain || DEFAULT_JAVA_TOOLCHAIN)
        : validateProjectJavaToolchain(safeProject, input.toolchain);
    configs[safeProject].runtime = {
        ...currentRuntime,
        profiles,
        selected_profile_id: recommendedRuntimeProfileId(profiles, selected),
        toolchain,
        detector_version: RUNTIME_DETECTOR_VERSION,
        updated_at: new Date().toISOString(),
    };
    (0, db_1.saveProjectConfigs)(configs);
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.runtime.config_changed", { project: safeProject, count: profiles.length });
    return getProjectRuntimeSnapshot(safeProject);
}
function processExists(pid) {
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function normalizeProcessStates(project, state) {
    let changed = false;
    for (const [key, row] of Object.entries(state.processes)) {
        if (row.project !== project || !["starting", "running"].includes(row.status))
            continue;
        if (liveProcesses.has(key))
            continue;
        // CLI diagnostics and sibling CCM processes may read the shared state file.
        // A live owning server remains authoritative for its child process.
        if (row.managerPid && row.managerPid !== process.pid && processExists(row.managerPid) && processExists(row.pid))
            continue;
        if (!processExists(row.pid)) {
            row.status = "stopped";
            row.stoppedAt = row.stoppedAt || new Date().toISOString();
            row.stopReason = "missing";
            changed = true;
        }
        else if (!liveProcesses.has(key)) {
            row.status = "unknown";
            row.error = "CCM 重启后无法证明该 PID 仍属于原运行配置";
            changed = true;
        }
    }
    if (changed)
        writeState(state);
    return state;
}
function logFile(project, profileId, kind) {
    const dir = (0, project_validation_1.resolveContainedPath)(RUNTIME_LOG_DIR, (0, project_validation_1.validateProjectName)(project));
    fs.mkdirSync(dir, { recursive: true });
    return (0, project_validation_1.resolveContainedPath)(dir, `${profileId}.${kind}.log`);
}
function redactOutput(value) {
    return String(value || "")
        .replace(/(\b(?:api[_-]?key|token|secret|password|authorization|cookie)\b\s*[=:]\s*)([^\s,;]+)/gi, "$1[REDACTED]")
        .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]");
}
function appendLog(file, chunk) {
    ensureRuntimeDirs();
    const max = 4 * 1024 * 1024;
    try {
        if (fs.existsSync(file) && fs.statSync(file).size > max) {
            const content = fs.readFileSync(file);
            fs.writeFileSync(file, content.subarray(Math.max(0, content.length - Math.floor(max / 2))));
        }
        const content = redactOutput(chunk);
        fs.appendFileSync(file, content, "utf-8");
        for (const listener of runtimeLogListeners.get(file) || [])
            listener({ type: "chunk", content });
    }
    catch { }
}
function replaceLog(file, content) {
    const safeContent = redactOutput(content);
    fs.writeFileSync(file, safeContent, "utf-8");
    for (const listener of runtimeLogListeners.get(file) || [])
        listener({ type: "reset", content: safeContent });
}
function attachProcessLogs(child, file, profile, observe) {
    const javaConsole = process.platform === "win32" && ["maven", "gradle"].includes(profile.projectType);
    const stdoutDecoder = javaConsole ? new TextDecoder("gb18030") : null;
    const stderrDecoder = javaConsole ? new TextDecoder("gb18030") : null;
    const consume = (chunk, decoder) => {
        const content = decoder ? decoder.decode(chunk, { stream: true }) : String(chunk || "");
        observe?.(content);
        appendLog(file, content);
    };
    child.stdout?.on("data", chunk => consume(chunk, stdoutDecoder));
    child.stderr?.on("data", chunk => consume(chunk, stderrDecoder));
    child.on("close", () => {
        if (stdoutDecoder)
            appendLog(file, stdoutDecoder.decode());
        if (stderrDecoder)
            appendLog(file, stderrDecoder.decode());
    });
}
function needsMavenReactorPreparation(output) {
    return /Non-resolvable import POM|Could not find artifact .*SNAPSHOT|dependencies\.dependency\.version.+is missing|Failed to read artifact descriptor/i.test(output);
}
function localMavenRecoveryCommands(project, output) {
    const { workDir } = projectConfig(project);
    const missing = new Set();
    const artifactPattern = /(?:[A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+):(?:jar|pom|war):[^\s,;)]+/g;
    const resolutionErrors = output.split(/\r?\n/)
        .map(line => {
        const marker = line.search(/(?:the following artifacts could not be resolved|could not find artifact)\s*:?/i);
        return marker >= 0 ? line.slice(marker) : "";
    })
        .filter(Boolean)
        .join("\n");
    for (const match of resolutionErrors.matchAll(artifactPattern)) {
        if (/SNAPSHOT/i.test(match[0]))
            missing.add(match[1]);
    }
    if (!missing.size)
        return [];
    const runner = executableAt(workDir, "mvnw");
    let revisionArg = "";
    try {
        const rootPom = stripXmlComments(fs.readFileSync(path.join(workDir, "pom.xml"), "utf-8"));
        const revision = rootPom.match(/<revision>\s*([^<]+)\s*<\/revision>/i)?.[1]?.trim() || "";
        if (/^[A-Za-z0-9_.-]{1,100}$/.test(revision))
            revisionArg = ` -Drevision=${revision}`;
    }
    catch { }
    const commands = [];
    for (const dir of scanManifestDirectories(workDir)) {
        const pom = path.join(dir, "pom.xml");
        if (!fs.existsSync(pom))
            continue;
        let content = "";
        try {
            content = stripXmlComments(fs.readFileSync(pom, "utf-8")).replace(/<parent>[\s\S]*?<\/parent>/i, "");
        }
        catch {
            continue;
        }
        const artifactId = content.match(/<artifactId>\s*([^<]+)\s*<\/artifactId>/i)?.[1]?.trim();
        if (!artifactId || !missing.has(artifactId))
            continue;
        const modulePath = relativeModule(workDir, dir);
        if (modulePath === ".")
            continue;
        const packaging = content.match(/<packaging>\s*([^<]+)\s*<\/packaging>/i)?.[1]?.trim().toLowerCase() || "jar";
        commands.push({
            command: `${runner} -f ${modulePath.replace(/\\/g, "/")}/pom.xml install -Dmaven.test.skip=true${revisionArg}`,
            priority: packaging === "pom" ? 0 : 1,
        });
        if (commands.length >= 4)
            break;
    }
    return [...new Set(commands.sort((a, b) => a.priority - b.priority).map(item => item.command))];
}
function profileForAction(project, profileId) {
    const config = getProjectRuntimeConfig(project);
    const id = String(profileId || config.selectedProfileId || "");
    const profile = config.profiles.find(item => item.id === id);
    if (!profile || !profile.enabled || profile.stale)
        throw new Error("运行配置不存在、未启用或已经失效");
    return profile;
}
function executableFromPath(names) {
    const pathEntries = String(process.env.PATH || "").split(path.delimiter)
        .map(entry => entry.replace(/^"|"$/g, "").trim())
        .filter(Boolean);
    for (const directory of pathEntries) {
        for (const name of names) {
            const candidate = path.join(directory, name);
            try {
                if (fs.statSync(candidate).isFile())
                    return candidate;
            }
            catch { }
        }
    }
    return "";
}
function uniqueToolchainCandidates(rows) {
    const seen = new Set();
    return rows.filter(row => {
        if (!row.home)
            return false;
        const key = process.platform === "win32" ? row.home.toLowerCase() : row.home;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function detectProjectJavaToolchainCandidates(project) {
    const { project: safeProject, workDir } = projectConfig(project);
    const javaFromPath = executableFromPath(process.platform === "win32" ? ["java.exe", "java.cmd"] : ["java"]);
    const mavenFromPath = executableFromPath(process.platform === "win32" ? ["mvn.cmd", "mvn.bat", "mvn.exe"] : ["mvn"]);
    const jdkCandidates = uniqueToolchainCandidates([
        { home: String(process.env.JAVA_HOME || ""), source: "JAVA_HOME" },
        { home: String(process.env.JDK_HOME || ""), source: "JDK_HOME" },
        { home: javaFromPath ? path.dirname(path.dirname(javaFromPath)) : "", source: "PATH" },
    ]).map(row => ({ ...row, valid: !!existingExecutable(row.home, process.platform === "win32" ? ["bin/java.exe"] : ["bin/java"]) }));
    const mavenCandidates = uniqueToolchainCandidates([
        { home: String(process.env.MAVEN_HOME || ""), source: "MAVEN_HOME" },
        { home: String(process.env.M2_HOME || ""), source: "M2_HOME" },
        { home: mavenFromPath ? path.dirname(path.dirname(mavenFromPath)) : "", source: "PATH" },
    ]).map(row => ({ ...row, valid: !!existingExecutable(row.home, process.platform === "win32" ? ["bin/mvn.cmd", "bin/mvn.bat", "bin/mvn.exe"] : ["bin/mvn"]) }));
    const wrapper = projectWrapperExecutable(workDir, "mvnw");
    return {
        schema: "ccm-project-java-toolchain-candidates-v1",
        project: safeProject,
        jdk: jdkCandidates,
        maven: mavenCandidates,
        wrapper: { available: !!wrapper, path: wrapper },
    };
}
function resolveProjectJavaToolchainExecution(project, override) {
    const { workDir } = projectConfig(project);
    const configured = validateProjectJavaToolchain(project, override === undefined ? getProjectRuntimeConfig(project).toolchain : override);
    const wrapper = projectWrapperExecutable(workDir, "mvnw");
    let mavenExecutable = "mvn";
    if (configured.mavenMode === "wrapper" || (configured.mavenMode === "auto" && wrapper)) {
        if (!wrapper)
            throw new Error("当前项目不存在 Maven Wrapper，请选择系统 Maven或指定 Maven目录");
        mavenExecutable = wrapper;
    }
    else if (configured.mavenMode === "custom") {
        mavenExecutable = existingExecutable(configured.mavenHome, process.platform === "win32" ? ["bin/mvn.cmd", "bin/mvn.bat", "bin/mvn.exe"] : ["bin/mvn"]);
    }
    const javaExecutable = configured.jdkMode === "custom"
        ? existingExecutable(configured.jdkHome, process.platform === "win32" ? ["bin/java.exe", "bin/java.cmd"] : ["bin/java"])
        : "java";
    const prependPath = [
        configured.jdkMode === "custom" ? path.join(configured.jdkHome, "bin") : "",
        configured.mavenMode === "custom" ? path.join(configured.mavenHome, "bin") : "",
    ].filter(Boolean);
    const env = {};
    if (configured.jdkMode === "custom") {
        env.JAVA_HOME = configured.jdkHome;
        env.JDK_HOME = configured.jdkHome;
    }
    if (configured.mavenMode === "custom") {
        env.MAVEN_HOME = configured.mavenHome;
        env.M2_HOME = configured.mavenHome;
    }
    if (prependPath.length)
        env.PATH = [...prependPath, String(process.env.PATH || "")].filter(Boolean).join(path.delimiter);
    const mavenArgs = [];
    if (configured.settingsPath)
        mavenArgs.push("-s", configured.settingsPath);
    if (configured.localRepository) {
        fs.mkdirSync(configured.localRepository, { recursive: true });
        mavenArgs.push(`-Dmaven.repo.local=${configured.localRepository}`);
    }
    if (configured.offline)
        mavenArgs.push("-o");
    return {
        configured,
        env,
        javaExecutable,
        mavenExecutable,
        mavenArgs,
        checksum: checksum(configured),
    };
}
function runToolchainVersion(command, args, cwd, env) {
    const base = path.basename(command).toLowerCase().replace(/\.(?:exe|cmd|bat)$/i, "");
    const result = (0, child_process_1.spawnSync)(command, args, {
        cwd,
        env,
        shell: process.platform === "win32" && ["mvn", "mvnw"].includes(base),
        windowsHide: true,
        encoding: "utf-8",
        timeout: 20_000,
    });
    const output = redactOutput(`${result.stdout || ""}\n${result.stderr || ""}`).trim().slice(0, 5000);
    return {
        success: result.status === 0 && !result.error,
        exitCode: result.status,
        output,
        error: result.error?.message || "",
    };
}
function testProjectJavaToolchain(project, input) {
    const { project: safeProject, workDir } = projectConfig(project);
    const execution = resolveProjectJavaToolchainExecution(safeProject, input);
    const env = (0, utils_2.buildTestAgentSubprocessEnv)(execution.env);
    const java = runToolchainVersion(execution.javaExecutable, ["-version"], workDir, env);
    const maven = runToolchainVersion(execution.mavenExecutable, ["-version"], workDir, env);
    return {
        success: java.success && maven.success,
        project: safeProject,
        toolchain: execution.configured,
        java,
        maven,
    };
}
function spawnProfileCommand(project, profile, command) {
    const { workDir } = projectConfig(project);
    const cwd = (0, project_validation_1.resolveContainedPath)(workDir, profile.modulePath);
    const invocation = (0, utils_2.verificationCommandInvocation)(command);
    if (invocation.error)
        throw new Error(`命令被安全策略拒绝：${invocation.error}`);
    const toolchain = resolveProjectJavaToolchainExecution(project);
    let executable = invocation.executable;
    let args = [...invocation.args];
    const commandBase = path.basename(executable).toLowerCase().replace(/\.(?:exe|cmd|bat)$/i, "");
    if (profile.projectType === "maven" && ["mvn", "mvnw"].includes(commandBase)) {
        executable = toolchain.mavenExecutable;
        args = [...toolchain.mavenArgs, ...args];
    }
    const child = (0, child_process_1.spawn)(executable, args, {
        cwd,
        shell: invocation.requiresShell,
        windowsHide: true,
        detached: process.platform !== "win32",
        env: (0, utils_2.buildTestAgentSubprocessEnv)(toolchain.env),
        stdio: ["ignore", "pipe", "pipe"],
    });
    return { child, cwd, toolchainChecksum: toolchain.checksum };
}
function stopProcessTree(child) {
    const pid = Number(child.pid || 0);
    stopProcessPidTree(pid, child);
}
function stopProcessPidTree(pid, child) {
    if (!pid)
        return;
    if (process.platform === "win32") {
        const script = [
            `$rootPid=${pid}`,
            "$all=@(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId)",
            "$ids=New-Object System.Collections.Generic.List[int]",
            "$ids.Add([int]$rootPid)",
            "$changed=$true",
            "while($changed){$changed=$false;foreach($p in $all){if($ids.Contains([int]$p.ParentProcessId)-and -not $ids.Contains([int]$p.ProcessId)){$ids.Add([int]$p.ProcessId);$changed=$true}}}",
            "for($i=$ids.Count-1;$i-ge 0;$i--){Stop-Process -Id $ids[$i] -Force -ErrorAction SilentlyContinue}",
        ].join(";");
        const powershell = (0, child_process_1.spawnSync)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, stdio: "ignore", timeout: 15_000 });
        if (powershell.error || powershell.status !== 0)
            (0, child_process_1.spawnSync)("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        return;
    }
    try {
        process.kill(-pid, "SIGTERM");
    }
    catch {
        try {
            child?.kill("SIGTERM");
        }
        catch { }
    }
}
function stopManagedProjectRuntimesForShutdown() {
    const state = readState();
    const stoppedAt = new Date().toISOString();
    const processTargets = new Map();
    const buildTargets = new Map();
    for (const [key, row] of Object.entries(state.processes)) {
        if (row.managerPid === process.pid && ["starting", "running"].includes(row.status) && processExists(row.pid))
            processTargets.set(key, row.pid);
    }
    for (const [key, child] of liveProcesses) {
        const row = state.processes[key];
        const pid = Number(child.pid || 0);
        if (pid)
            processTargets.set(key, pid);
        if (row && row.pid === pid) {
            row.status = "stopped";
            row.stopReason = "user";
            row.exitCode = null;
            row.stoppedAt = stoppedAt;
        }
    }
    for (const [key, pid] of processTargets) {
        const row = state.processes[key];
        if (!row || row.pid !== pid)
            continue;
        row.status = "stopped";
        row.stopReason = "user";
        row.exitCode = null;
        row.stoppedAt = stoppedAt;
    }
    for (const [key, row] of Object.entries(state.builds)) {
        if (row.managerPid === process.pid && row.status === "building" && processExists(row.pid))
            buildTargets.set(key, row.pid);
    }
    for (const [key, child] of liveBuilds) {
        const row = state.builds[key];
        const pid = Number(child.pid || 0);
        if (pid)
            buildTargets.set(key, pid);
        if (row && row.pid === pid) {
            row.status = "failed";
            row.exitCode = null;
            row.finishedAt = stoppedAt;
            row.error = "CCM 服务正常关闭，构建任务已停止";
        }
    }
    for (const [key, pid] of buildTargets) {
        const row = state.builds[key];
        if (!row || row.pid !== pid)
            continue;
        row.status = "failed";
        row.exitCode = null;
        row.finishedAt = stoppedAt;
        row.error = "CCM 服务正常关闭，构建任务已停止";
    }
    // Commit ownership release before process termination so a forced server
    // shutdown cannot leave a dead PID marked as running.
    writeState(state);
    for (const pid of processTargets.values())
        stopProcessPidTree(pid);
    for (const pid of buildTargets.values())
        stopProcessPidTree(pid);
    liveProcesses.clear();
    liveBuilds.clear();
    return { stoppedProcesses: processTargets.size, stoppedBuilds: buildTargets.size };
}
function collectArtifacts(root, patterns, startedAt) {
    const results = [];
    const visit = (dir, depth) => {
        if (depth > 5 || results.length >= 30)
            return;
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (EXCLUDED_DIRS.has(entry.name) && !["target", "dist", "build"].includes(entry.name))
                continue;
            const full = path.join(dir, entry.name);
            const relative = path.relative(root, full).replace(/\\/g, "/");
            if (entry.isDirectory()) {
                if (patterns.includes(relative) || patterns.some(pattern => !pattern.includes("*") && relative.endsWith(pattern)))
                    results.push(relative);
                visit(full, depth + 1);
            }
            else if (entry.isFile()) {
                const matches = patterns.some(pattern => {
                    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
                    return new RegExp(`^${escaped}$`, "i").test(relative);
                });
                if (matches && fs.statSync(full).mtimeMs >= startedAt - 2000 && !/(?:sources|javadoc|original)-?\.jar$/i.test(entry.name))
                    results.push(relative);
            }
        }
    };
    visit(root, 0);
    return [...new Set(results)].slice(0, 20);
}
function startProjectRuntime(project, profileId) {
    const safeProject = projectConfig(project).project;
    const profile = profileForAction(safeProject, profileId);
    if (!profile.runCommand)
        throw new Error("当前运行配置没有启动命令");
    const key = runtimeKey(safeProject, profile.id);
    const initialState = normalizeProcessStates(safeProject, readState());
    const previous = initialState.processes[key];
    if (["starting", "running", "unknown"].includes(previous?.status || ""))
        throw new Error(previous?.status === "unknown" ? previous.error : "当前运行配置已经启动或正在准备依赖");
    const file = logFile(safeProject, profile.id, "run");
    replaceLog(file, `[${new Date().toISOString()}] START ${profile.label}\n`);
    const row = { project: safeProject, profileId: profile.id, status: "running", pid: 0, managerPid: process.pid, commandChecksum: "", workDir: "", startedAt: new Date().toISOString() };
    const finalize = (child, code, failed) => {
        if (liveProcesses.get(key) === child)
            liveProcesses.delete(key);
        const latest = readState();
        const current = latest.processes[key];
        if (!current || current.pid !== Number(child.pid || 0))
            return;
        const stoppedByUser = current.stopReason === "user";
        current.status = stoppedByUser || !failed ? "stopped" : "failed";
        current.exitCode = stoppedByUser ? null : code;
        current.stoppedAt = current.stoppedAt || new Date().toISOString();
        current.stopReason = stoppedByUser ? "user" : "exited";
        writeState(latest);
        (0, runtime_events_1.publishRuntimeEvent)("project", current.status === "failed" ? "project.runtime.failed" : "project.runtime.stopped", { project: safeProject, profileId: profile.id, status: current.status });
    };
    let localRecoveryQueue = [];
    let mavenRecoveryEvidence = "";
    const launch = (command, phase, retried) => {
        const { child, cwd, toolchainChecksum } = spawnProfileCommand(safeProject, profile, command);
        row.status = phase === "run" ? "running" : "starting";
        row.pid = Number(child.pid || 0);
        row.managerPid = process.pid;
        row.commandChecksum = checksum({ command, cwd, toolchainChecksum });
        row.workDir = cwd;
        delete row.stoppedAt;
        delete row.stopReason;
        delete row.exitCode;
        const latest = readState();
        latest.processes[key] = { ...row };
        writeState(latest);
        liveProcesses.set(key, child);
        let outputTail = "";
        attachProcessLogs(child, file, profile, content => { outputTail = (outputTail + content).slice(-120000); });
        child.on("error", error => appendLog(file, `\n[ERROR] ${error.message}\n`));
        child.on("close", code => {
            if (liveProcesses.get(key) === child)
                liveProcesses.delete(key);
            const current = readState().processes[key];
            if (!current || current.pid !== Number(child.pid || 0))
                return;
            if (current.stopReason === "user")
                return finalize(child, code, false);
            if (phase === "run" && code !== 0 && !retried && profile.prepareCommand && needsMavenReactorPreparation(outputTail)) {
                mavenRecoveryEvidence = outputTail;
                appendLog(file, `\n[CCM] 检测到项目内部 SNAPSHOT/BOM 尚未安装，正在准备 Maven reactor 依赖，完成后会自动重试。\n`);
                (0, runtime_events_1.publishRuntimeEvent)("project", "project.runtime.preparing", { project: safeProject, profileId: profile.id, status: "starting" });
                launch(profile.prepareCommand, "prepare", false);
                return;
            }
            if (phase === "prepare" && code !== 0) {
                localRecoveryQueue = localMavenRecoveryCommands(safeProject, `${mavenRecoveryEvidence}\n${outputTail}`);
                if (localRecoveryQueue.length) {
                    appendLog(file, `\n[CCM] Reactor 中发现被根 pom 排除的本地 SNAPSHOT 模块，正在逐个安装后重试：${localRecoveryQueue.length} 个。\n`);
                    launch(localRecoveryQueue.shift(), "hydrate_local", false);
                    return;
                }
            }
            if (phase === "hydrate_local" && code === 0) {
                if (localRecoveryQueue.length)
                    launch(localRecoveryQueue.shift(), "hydrate_local", false);
                else {
                    appendLog(file, `\n[CCM] 本地 SNAPSHOT 模块安装完成，正在重新准备 Maven reactor。\n`);
                    launch(profile.prepareCommand, "prepare_retry", false);
                }
                return;
            }
            if ((phase === "prepare" || phase === "prepare_retry") && code === 0) {
                appendLog(file, `\n[CCM] Maven reactor 依赖准备完成，正在重新启动目标 Spring Boot 模块。\n`);
                launch(profile.runCommand, "run", true);
                return;
            }
            finalize(child, code, code !== 0);
        });
        (0, runtime_events_1.publishRuntimeEvent)("project", phase === "run" ? "project.runtime.started" : "project.runtime.preparing", { project: safeProject, profileId: profile.id, status: row.status });
        return child;
    };
    launch(profile.runCommand, "run", false);
    return { success: true, profile, state: row };
}
function stopProjectRuntime(project, profileId) {
    const safeProject = projectConfig(project).project;
    const profile = profileForAction(safeProject, profileId);
    const key = runtimeKey(safeProject, profile.id);
    const state = normalizeProcessStates(safeProject, readState());
    const row = state.processes[key];
    if (!row || row.status === "stopped" || row.status === "failed")
        return { success: true, alreadyStopped: true, profile, state: row || null };
    if (row.status === "unknown" || !liveProcesses.has(key))
        throw new Error(row.error || "无法证明 PID 归属，已拒绝停止");
    row.stoppedAt = new Date().toISOString();
    row.stopReason = "user";
    writeState(state);
    stopProcessTree(liveProcesses.get(key));
    row.status = "stopped";
    writeState(state);
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.runtime.stopped", { project: safeProject, profileId: profile.id, status: "stopped" });
    return { success: true, profile, state: row };
}
function restartProjectRuntime(project, profileId) {
    const safeProject = projectConfig(project).project;
    const profile = profileForAction(safeProject, profileId);
    stopProjectRuntime(safeProject, profile.id);
    const result = startProjectRuntime(safeProject, profile.id);
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.runtime.restarted", { project: safeProject, profileId: profile.id, status: "running" });
    return result;
}
function buildProjectRuntime(project, profileId) {
    const { project: safeProject, workDir } = projectConfig(project);
    const profile = profileForAction(safeProject, profileId);
    if (!profile.buildCommand)
        throw new Error("当前运行配置没有构建命令");
    const key = runtimeKey(safeProject, profile.id);
    if (liveBuilds.has(key))
        throw new Error("当前运行配置正在构建");
    const { child } = spawnProfileCommand(safeProject, profile, profile.buildCommand);
    const file = logFile(safeProject, profile.id, "build");
    const startedAt = Date.now();
    replaceLog(file, `[${new Date(startedAt).toISOString()}] BUILD ${profile.label}\n`);
    attachProcessLogs(child, file, profile);
    const state = readState();
    const row = { project: safeProject, profileId: profile.id, status: "building", pid: Number(child.pid || 0), managerPid: process.pid, startedAt: new Date(startedAt).toISOString() };
    state.builds[key] = row;
    writeState(state);
    liveBuilds.set(key, child);
    child.on("close", code => {
        if (liveBuilds.get(key) === child)
            liveBuilds.delete(key);
        const latest = readState();
        const current = latest.builds[key] || row;
        current.status = code === 0 ? "succeeded" : "failed";
        current.exitCode = code;
        current.finishedAt = new Date().toISOString();
        current.artifacts = code === 0 ? collectArtifacts(workDir, profile.artifactPatterns, startedAt) : [];
        latest.builds[key] = current;
        writeState(latest);
        (0, runtime_events_1.publishRuntimeEvent)("project", code === 0 ? "project.runtime.build_succeeded" : "project.runtime.build_failed", { project: safeProject, profileId: profile.id, status: current.status });
    });
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.runtime.build_started", { project: safeProject, profileId: profile.id, status: "building" });
    return { success: true, profile, build: row };
}
function getProjectRuntimeLogs(project, profileId, kind, lines = 300) {
    const safeProject = projectConfig(project).project;
    const profile = profileForAction(safeProject, profileId);
    const safeKind = kind === "build" ? "build" : "run";
    const file = logFile(safeProject, profile.id, safeKind);
    if (!fs.existsSync(file))
        return { project: safeProject, profileId: profile.id, kind: safeKind, logs: "" };
    const content = fs.readFileSync(file, "utf-8").split(/\r?\n/).slice(-Math.max(1, Math.min(2000, Number(lines) || 300))).join("\n");
    return { project: safeProject, profileId: profile.id, kind: safeKind, logs: content };
}
function subscribeProjectRuntimeLogs(project, profileId, kind, listener) {
    const safeProject = projectConfig(project).project;
    const profile = profileForAction(safeProject, profileId);
    const safeKind = kind === "build" ? "build" : "run";
    const file = logFile(safeProject, profile.id, safeKind);
    if (!runtimeLogListeners.has(file))
        runtimeLogListeners.set(file, new Set());
    runtimeLogListeners.get(file).add(listener);
    return () => {
        const listeners = runtimeLogListeners.get(file);
        listeners?.delete(listener);
        if (!listeners?.size)
            runtimeLogListeners.delete(file);
    };
}
function getProjectRuntimeSnapshot(project) {
    const safeProject = projectConfig(project).project;
    const config = getProjectRuntimeConfig(safeProject);
    const state = normalizeProcessStates(safeProject, readState());
    const toolchainCandidates = detectProjectJavaToolchainCandidates(safeProject);
    return {
        success: true,
        project: safeProject,
        display_name: projectDisplayName(safeProject),
        profiles: config.profiles,
        selected_profile_id: config.selectedProfileId,
        toolchain: config.toolchain,
        toolchain_candidates: toolchainCandidates,
        processes: config.profiles.map(profile => state.processes[runtimeKey(safeProject, profile.id)] || { project: safeProject, profileId: profile.id, status: "stopped", pid: 0 }),
        builds: config.profiles.map(profile => state.builds[runtimeKey(safeProject, profile.id)]).filter(Boolean),
    };
}
function getProjectRuntimeSummary(project) {
    const snapshot = getProjectRuntimeSnapshot(project);
    return {
        profile_count: snapshot.profiles.length,
        running_count: snapshot.processes.filter(row => row.status === "running").length,
        unknown_count: snapshot.processes.filter(row => row.status === "unknown").length,
        building_count: snapshot.builds.filter(row => row.status === "building").length,
        selected_profile_id: snapshot.selected_profile_id,
    };
}
function executeProjectRuntimeAction(project, profileId, action) {
    const operation = String(action || "").trim();
    if (operation === "start")
        return startProjectRuntime(project, profileId);
    if (operation === "stop")
        return stopProjectRuntime(project, profileId);
    if (operation === "restart")
        return restartProjectRuntime(project, profileId);
    if (operation === "build")
        return buildProjectRuntime(project, profileId);
    throw new Error("不支持的项目运行操作");
}
//# sourceMappingURL=project-runtime.js.map