import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { ChildProcess, spawn, spawnSync } from "child_process";
import { CCM_DIR, LOG_DIR } from "../../core/utils";
import { getConfigs, getConfigInfo, loadProjectConfigs, saveProjectConfigs } from "../../core/db";
import { publishRuntimeEvent } from "../../system/runtime-events";
import { buildTestAgentSubprocessEnv, verificationCommandInvocation } from "../../test-agent/utils";
import { resolveContainedPath, validateProjectName, validateWorkDirectory } from "./project-validation";

export type ProjectRuntimeProfileV1 = {
  id: string;
  label: string;
  projectId: string;
  modulePath: string;
  projectType: "node" | "maven" | "gradle" | "go" | "rust" | "dotnet" | "custom";
  environment: string;
  runCommand: string;
  prepareCommand?: string;
  buildCommand: string;
  artifactPatterns: string[];
  source: "detected" | "manual";
  enabled: boolean;
  detectedChecksum: string;
  stale?: boolean;
};

export type ProjectJavaToolchainV1 = {
  schema: "ccm-project-java-toolchain-v1";
  jdkMode: "inherit" | "custom";
  jdkHome: string;
  mavenMode: "auto" | "wrapper" | "system" | "custom";
  mavenHome: string;
  settingsPath: string;
  localRepository: string;
  offline: boolean;
};

type RuntimeProcessState = {
  project: string;
  profileId: string;
  status: "starting" | "running" | "stopped" | "failed" | "unknown";
  pid: number;
  managerPid?: number;
  commandChecksum: string;
  workDir: string;
  startedAt: string;
  stoppedAt?: string;
  stopReason?: "user" | "exited" | "missing";
  exitCode?: number | null;
  error?: string;
};

type RuntimeBuildState = {
  project: string;
  profileId: string;
  status: "building" | "succeeded" | "failed";
  pid: number;
  managerPid?: number;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number | null;
  artifacts?: string[];
  error?: string;
};

const RUNTIME_DIR = path.join(CCM_DIR, "project-runtime");
const STATE_FILE = path.join(RUNTIME_DIR, "state.json");
const RUNTIME_LOG_DIR = path.join(LOG_DIR, "project-runtime");
// Bump when detected profile fields or command recovery behavior changes so
// existing projects are lazily rescanned without overwriting manual profiles.
const RUNTIME_DETECTOR_VERSION = 5;
const EXCLUDED_DIRS = new Set([".git", "node_modules", "target", "dist", "build", ".idea", ".vscode", "coverage"]);
const PROFILE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DEFAULT_JAVA_TOOLCHAIN: ProjectJavaToolchainV1 = {
  schema: "ccm-project-java-toolchain-v1",
  jdkMode: "inherit",
  jdkHome: "",
  mavenMode: "auto",
  mavenHome: "",
  settingsPath: "",
  localRepository: "",
  offline: false,
};
const liveProcesses = new Map<string, ChildProcess>();
const liveBuilds = new Map<string, ChildProcess>();
type RuntimeLogEvent = { type: "reset" | "chunk"; content: string };
const runtimeLogListeners = new Map<string, Set<(event: RuntimeLogEvent) => void>>();

function ensureRuntimeDirs() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.mkdirSync(RUNTIME_LOG_DIR, { recursive: true });
}

function runtimeKey(project: string, profileId: string) {
  return `${project}::${profileId}`;
}

function readState(): { processes: Record<string, RuntimeProcessState>; builds: Record<string, RuntimeBuildState> } {
  ensureRuntimeDirs();
  try {
    const value = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return { processes: value?.processes || {}, builds: value?.builds || {} };
  } catch {
    return { processes: {}, builds: {} };
  }
}

function writeState(state: { processes: Record<string, RuntimeProcessState>; builds: Record<string, RuntimeBuildState> }) {
  ensureRuntimeDirs();
  const temp = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), "utf-8");
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  fs.renameSync(temp, STATE_FILE);
}

export function resolveProjectIdentifier(project: unknown) {
  const requested = String(project || "").trim();
  const configs = getConfigs();
  const direct = configs.find(item => item.name.toLowerCase() === requested.toLowerCase());
  if (direct) return direct.name;
  const metadata = loadProjectConfigs();
  const matches = configs.filter(item => String(metadata[item.name]?.display_name || item.name).trim().toLowerCase() === requested.toLowerCase());
  if (matches.length > 1) throw new Error("项目显示名称匹配到多个项目，请使用内部项目 ID");
  if (matches.length === 1) return matches[0].name;
  throw new Error("项目不存在或已经归档");
}

function projectConfig(project: string) {
  const safeProject = validateProjectName(resolveProjectIdentifier(project));
  const config = getConfigs().find(item => item.name === safeProject);
  if (!config) throw new Error("项目不存在或已经归档");
  const workDir = validateWorkDirectory(getConfigInfo(config.path)[0]?.workDir || "");
  return { project: safeProject, workDir };
}

function cleanDisplayName(value: unknown) {
  const name = String(value || "").trim();
  if (!name) throw new Error("项目显示名称不能为空");
  if (name.length > 80) throw new Error("项目显示名称不能超过 80 个字符");
  if (/\p{C}/u.test(name)) throw new Error("项目显示名称包含无效字符");
  return name;
}

export function projectDisplayName(project: string) {
  const safeProject = validateProjectName(project);
  const configs = loadProjectConfigs();
  return String(configs[safeProject]?.display_name || safeProject).trim() || safeProject;
}

export function saveProjectDisplayName(project: string, displayName: unknown) {
  const safeProject = projectConfig(project).project;
  const safeDisplayName = cleanDisplayName(displayName);
  const configs = loadProjectConfigs();
  for (const config of getConfigs()) {
    if (config.name === safeProject) continue;
    const existing = String(configs[config.name]?.display_name || config.name).trim();
    if (existing.localeCompare(safeDisplayName, undefined, { sensitivity: "accent" }) === 0) {
      throw new Error("项目显示名称已被其他活动项目使用");
    }
  }
  if (!configs[safeProject]) configs[safeProject] = {};
  configs[safeProject].display_name = safeDisplayName;
  saveProjectConfigs(configs);
  publishRuntimeEvent("project", "project.display_name.changed", { project: safeProject });
  return safeDisplayName;
}

function checksum(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function relativeModule(root: string, dir: string) {
  const relative = path.relative(root, dir).replace(/\\/g, "/");
  return relative && relative !== "." ? relative : ".";
}

function profileId(type: string, modulePath: string, environment: string) {
  return `runtime_${crypto.createHash("sha1").update(`${type}:${modulePath}:${environment}`).digest("hex").slice(0, 16)}`;
}

function makeDetectedProfile(input: Omit<ProjectRuntimeProfileV1, "id" | "source" | "enabled" | "detectedChecksum">): ProjectRuntimeProfileV1 {
  const id = profileId(input.projectType, input.modulePath, input.environment);
  const base = { ...input, id, source: "detected" as const, enabled: true };
  return { ...base, detectedChecksum: checksum(base) };
}

function scanManifestDirectories(root: string, maxDepth = 3) {
  const directories: string[] = [];
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length && directories.length < 240) {
    const current = queue.shift()!;
    directories.push(current.dir);
    if (current.depth >= maxDepth) continue;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(current.dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      queue.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 });
    }
  }
  return directories;
}

function packageManagerFor(dir: string, manifest: any) {
  const declared = String(manifest?.packageManager || "").split("@")[0];
  if (["npm", "pnpm", "yarn", "bun"].includes(declared)) return declared;
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(dir, "bun.lock")) || fs.existsSync(path.join(dir, "bun.lockb"))) return "bun";
  return "npm";
}

function detectNodeProfiles(project: string, root: string, dir: string): ProjectRuntimeProfileV1[] {
  const file = path.join(dir, "package.json");
  if (!fs.existsSync(file)) return [];
  let manifest: any;
  try { manifest = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return []; }
  const scripts = manifest?.scripts && typeof manifest.scripts === "object" ? manifest.scripts : {};
  const names = Object.keys(scripts).filter(name => /^[A-Za-z0-9:_-]+$/.test(name));
  const runNames = names.filter(name => /^(dev|start|serve|preview)(?::|$)/i.test(name));
  const buildNames = names.filter(name => /^build(?::|$)/i.test(name));
  if (!runNames.length && !buildNames.length) return [];
  const manager = packageManagerFor(dir, manifest);
  const modulePath = relativeModule(root, dir);
  const moduleLabel = modulePath === "." ? String(manifest.name || project) : modulePath;
  const environments = new Set<string>();
  for (const name of [...runNames, ...buildNames]) environments.add(name.includes(":") ? name.split(":").slice(1).join(":") : "default");
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

function executableAt(root: string, base: "mvnw" | "gradlew") {
  const windows = path.join(root, `${base}.cmd`);
  const windowsBat = path.join(root, `${base}.bat`);
  const unix = path.join(root, base);
  if (process.platform === "win32" && fs.existsSync(windows)) return `.\\${base}.cmd`;
  if (process.platform === "win32" && fs.existsSync(windowsBat)) return `.\\${base}.bat`;
  if (fs.existsSync(unix)) return `./${base}`;
  return base === "mvnw" ? "mvn" : "gradle";
}

function stripXmlComments(value: string) {
  return value.replace(/<!--[\s\S]*?-->/g, "");
}

function hasSpringBootApplication(dir: string) {
  const roots = [path.join(dir, "src", "main", "java"), path.join(dir, "src", "main", "kotlin")]
    .filter(candidate => fs.existsSync(candidate));
  const queue = [...roots];
  let inspected = 0;
  while (queue.length && inspected < 1200) {
    const current = queue.shift()!;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(full);
        continue;
      }
      if (!entry.isFile() || !/\.(?:java|kt)$/i.test(entry.name)) continue;
      inspected += 1;
      try {
        if (/@SpringBootApplication\b/.test(fs.readFileSync(full, "utf-8"))) return true;
      } catch {}
    }
  }
  return false;
}

function detectMavenProfiles(project: string, root: string, dir: string): ProjectRuntimeProfileV1[] {
  const file = path.join(dir, "pom.xml");
  if (!fs.existsSync(file)) return [];
  const content = stripXmlComments(fs.readFileSync(file, "utf-8"));
  const modulePath = relativeModule(root, dir);
  const runner = executableAt(root, "mvnw");
  const selector = modulePath === "." ? "" : ` -pl ${modulePath.replace(/\\/g, "/")} -am`;
  const modulePom = modulePath === "." ? "" : ` -f ${modulePath.replace(/\\/g, "/")}/pom.xml`;
  const packaging = content.match(/<packaging>\s*([^<]+)\s*<\/packaging>/i)?.[1]?.trim() || "jar";
  const runnable = packaging !== "pom" && (
    /<mainClass>|<start-class>/i.test(content)
    || /spring-boot-maven-plugin/i.test(content)
    || hasSpringBootApplication(dir)
  );
  if (!runnable && packaging !== "pom") return [];
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

function detectGradleProfiles(project: string, root: string, dir: string): ProjectRuntimeProfileV1[] {
  const file = ["build.gradle.kts", "build.gradle"].map(name => path.join(dir, name)).find(candidate => fs.existsSync(candidate));
  if (!file) return [];
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

function detectSimpleRootProfiles(project: string, root: string): ProjectRuntimeProfileV1[] {
  if (fs.existsSync(path.join(root, "go.mod"))) return [makeDetectedProfile({ label: `${project} · Go`, projectId: project, modulePath: ".", projectType: "go", environment: "default", runCommand: "go run .", buildCommand: "go build ./...", artifactPatterns: [], })];
  if (fs.existsSync(path.join(root, "Cargo.toml"))) return [makeDetectedProfile({ label: `${project} · Rust`, projectId: project, modulePath: ".", projectType: "rust", environment: "default", runCommand: "cargo run", buildCommand: "cargo build --release", artifactPatterns: ["target/release"], })];
  const dotnet = fs.readdirSync(root).find(name => /\.(?:sln|csproj)$/i.test(name));
  if (dotnet) return [makeDetectedProfile({ label: `${project} · .NET`, projectId: project, modulePath: ".", projectType: "dotnet", environment: "default", runCommand: "dotnet run", buildCommand: "dotnet build", artifactPatterns: ["bin"], })];
  return [];
}

export function detectProjectRuntimeProfilesAt(project: string, workDir: string): ProjectRuntimeProfileV1[] {
  const safeProject = validateProjectName(project);
  const safeWorkDir = validateWorkDirectory(workDir);
  const profiles: ProjectRuntimeProfileV1[] = [];
  for (const dir of scanManifestDirectories(safeWorkDir)) {
    profiles.push(...detectNodeProfiles(safeProject, safeWorkDir, dir));
    profiles.push(...detectMavenProfiles(safeProject, safeWorkDir, dir));
    profiles.push(...detectGradleProfiles(safeProject, safeWorkDir, dir));
  }
  profiles.push(...detectSimpleRootProfiles(safeProject, safeWorkDir));
  const unique = new Map<string, ProjectRuntimeProfileV1>();
  for (const profile of profiles) if (!unique.has(profile.id)) unique.set(profile.id, profile);
  return [...unique.values()];
}

export function detectProjectRuntimeProfiles(project: string): ProjectRuntimeProfileV1[] {
  const { project: safeProject, workDir } = projectConfig(project);
  return detectProjectRuntimeProfilesAt(safeProject, workDir);
}

function validateProfile(project: string, profile: any): ProjectRuntimeProfileV1 {
  const safeProject = validateProjectName(project);
  const id = String(profile?.id || "").trim();
  if (!PROFILE_ID_PATTERN.test(id)) throw new Error("运行配置 ID 无效");
  const projectType = String(profile?.projectType || "custom") as ProjectRuntimeProfileV1["projectType"];
  if (!["node", "maven", "gradle", "go", "rust", "dotnet", "custom"].includes(projectType)) throw new Error("运行配置类型无效");
  const modulePath = String(profile?.modulePath || ".").trim().replace(/\\/g, "/") || ".";
  const { workDir } = projectConfig(safeProject);
  const moduleDir = resolveContainedPath(workDir, modulePath);
  if (!fs.existsSync(moduleDir) || !fs.statSync(moduleDir).isDirectory()) throw new Error(`运行模块目录不存在：${modulePath}`);
  const runCommand = String(profile?.runCommand || "").trim();
  const prepareCommand = String(profile?.prepareCommand || "").trim();
  const buildCommand = String(profile?.buildCommand || "").trim();
  if (["maven", "gradle"].includes(projectType) && /(?:^|\s)java(?:\.exe)?\s+-jar(?:\s|$)/i.test(runCommand)) {
    throw new Error("Java 项目的启动命令必须运行源码（Maven spring-boot:run 或 Gradle bootRun/run）；java -jar 仅用于已构建产物，不属于源码启动");
  }
  for (const command of [runCommand, prepareCommand, buildCommand].filter(Boolean)) {
    const invocation = verificationCommandInvocation(command);
    if (invocation.error) throw new Error(`运行命令不安全：${invocation.error}`);
  }
  const artifactPatterns = Array.isArray(profile?.artifactPatterns) ? profile.artifactPatterns.map((item: any) => String(item || "").trim().replace(/\\/g, "/")).filter(Boolean).slice(0, 12) : [];
  if (artifactPatterns.some((pattern: string) => path.isAbsolute(pattern) || pattern.split("/").includes(".."))) throw new Error("产物路径不能超出项目目录");
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

function normalizedToolchainPath(value: unknown, label: string) {
  const raw = String(value || "").trim().replace(/^"(.*)"$/, "$1");
  if (!raw) return "";
  if (/[\r\n\u0000]/.test(raw)) throw new Error(`${label}包含无效字符`);
  if (/[&|<>`^%!;]/.test(raw)) throw new Error(`${label}包含不允许的命令字符`);
  if (!path.isAbsolute(raw)) throw new Error(`${label}必须使用绝对路径`);
  return path.normalize(raw);
}

function normalizeProjectJavaToolchain(input: any): ProjectJavaToolchainV1 {
  const jdkMode = String(input?.jdkMode || input?.jdk_mode || "inherit") === "custom" ? "custom" : "inherit";
  const requestedMavenMode = String(input?.mavenMode || input?.maven_mode || "auto");
  const mavenMode = (["auto", "wrapper", "system", "custom"].includes(requestedMavenMode) ? requestedMavenMode : "auto") as ProjectJavaToolchainV1["mavenMode"];
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

function existingExecutable(home: string, candidates: string[]) {
  for (const relative of candidates) {
    const file = path.join(home, ...relative.split("/"));
    try {
      if (fs.statSync(file).isFile()) return file;
    } catch {}
  }
  return "";
}

function projectWrapperExecutable(workDir: string, base: "mvnw" | "gradlew") {
  const candidates = process.platform === "win32"
    ? [`${base}.cmd`, `${base}.bat`, base]
    : [base, `${base}.cmd`, `${base}.bat`];
  return existingExecutable(workDir, candidates);
}

function validateProjectJavaToolchain(project: string, input: any) {
  const toolchain = normalizeProjectJavaToolchain(input || DEFAULT_JAVA_TOOLCHAIN);
  const { workDir } = projectConfig(project);
  if (toolchain.jdkMode === "custom") {
    if (!toolchain.jdkHome) throw new Error("请选择 JDK目录");
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
    if (!toolchain.mavenHome) throw new Error("请选择 Maven目录");
    if (!existingExecutable(toolchain.mavenHome, process.platform === "win32" ? ["bin/mvn.cmd", "bin/mvn.bat", "bin/mvn.exe"] : ["bin/mvn"])) {
      throw new Error("Maven目录无效，未找到 bin/mvn");
    }
  }
  if (toolchain.settingsPath) {
    try {
      if (!fs.statSync(toolchain.settingsPath).isFile()) throw new Error();
    } catch {
      throw new Error("settings.xml文件不存在或不可读取");
    }
  }
  if (toolchain.localRepository) {
    let parent = toolchain.localRepository;
    while (!fs.existsSync(parent)) {
      const next = path.dirname(parent);
      if (next === parent) break;
      parent = next;
    }
    try {
      if (!fs.statSync(parent).isDirectory()) throw new Error();
    } catch {
      throw new Error("Maven本地仓库的上级目录不存在或不可读取");
    }
  }
  return toolchain;
}

export function getProjectRuntimeConfig(project: string) {
  const safeProject = projectConfig(project).project;
  const configs = loadProjectConfigs();
  const runtime = configs[safeProject]?.runtime || {};
  if (Number(runtime.detector_version || 0) !== RUNTIME_DETECTOR_VERSION
    && Array.isArray(runtime.profiles)
    && runtime.profiles.some((profile: any) => profile?.source !== "manual")) {
    const snapshot = rescanProjectRuntimeProfiles(safeProject);
    return {
      profiles: snapshot.profiles,
      selectedProfileId: snapshot.selected_profile_id,
      toolchain: normalizeProjectJavaToolchain(snapshot.toolchain || runtime.toolchain || DEFAULT_JAVA_TOOLCHAIN),
    };
  }
  const profiles = Array.isArray(runtime.profiles) ? runtime.profiles.map((profile: any) => validateProfile(safeProject, profile)) : [];
  return {
    profiles,
    selectedProfileId: recommendedRuntimeProfileId(profiles, runtime.selected_profile_id),
    toolchain: normalizeProjectJavaToolchain(runtime.toolchain || DEFAULT_JAVA_TOOLCHAIN),
  };
}

function recommendedRuntimeProfileId(profiles: ProjectRuntimeProfileV1[], requested: unknown = "") {
  const available = profiles.filter(profile => profile.enabled && !profile.stale);
  const selected = String(requested || "");
  if (selected && available.some(profile => profile.id === selected)) return selected;
  return available.find(profile => profile.runCommand)?.id
    || available.find(profile => profile.buildCommand)?.id
    || available[0]?.id
    || "";
}

function detectedProfileWasUnmodified(profile: any) {
  const recorded = String(profile?.detectedChecksum || "");
  if (!recorded) return false;
  const { detectedChecksum: _detectedChecksum, stale: _stale, ...base } = profile;
  return checksum(base) === recorded;
}

export function rescanProjectRuntimeProfiles(project: string) {
  const safeProject = projectConfig(project).project;
  const detected = detectProjectRuntimeProfiles(safeProject);
  const configs = loadProjectConfigs();
  if (!configs[safeProject]) configs[safeProject] = {};
  const existing = Array.isArray(configs[safeProject].runtime?.profiles) ? configs[safeProject].runtime.profiles : [];
  const detectedById = new Map(detected.map(profile => [profile.id, profile]));
  const merged = existing.map((profile: any) => {
    if (profile.source === "manual") return profile;
    const next = detectedById.get(profile.id);
    if (!next) return { ...profile, stale: true };
    detectedById.delete(profile.id);
    if (detectedProfileWasUnmodified(profile)) return { ...next, stale: false };
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
  saveProjectConfigs(configs);
  publishRuntimeEvent("project", "project.runtime.profiles_rescanned", { project: safeProject, count: merged.length });
  return getProjectRuntimeSnapshot(safeProject);
}

export function saveProjectRuntimeConfig(project: string, input: any) {
  const safeProject = projectConfig(project).project;
  const profiles = (Array.isArray(input?.profiles) ? input.profiles : []).map((profile: any) => validateProfile(safeProject, profile));
  const ids = new Set<string>();
  for (const profile of profiles) {
    if (ids.has(profile.id)) throw new Error("运行配置 ID 重复");
    ids.add(profile.id);
  }
  const selected = String(input?.selectedProfileId || input?.selected_profile_id || "");
  if (selected && !profiles.some(profile => profile.id === selected && profile.enabled)) throw new Error("默认运行配置不存在或未启用");
  const configs = loadProjectConfigs();
  if (!configs[safeProject]) configs[safeProject] = {};
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
  saveProjectConfigs(configs);
  publishRuntimeEvent("project", "project.runtime.config_changed", { project: safeProject, count: profiles.length });
  return getProjectRuntimeSnapshot(safeProject);
}

function processExists(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function normalizeProcessStates(project: string, state: ReturnType<typeof readState>) {
  let changed = false;
  for (const [key, row] of Object.entries(state.processes)) {
    if (row.project !== project || !["starting", "running"].includes(row.status)) continue;
    if (liveProcesses.has(key)) continue;
    // CLI diagnostics and sibling CCM processes may read the shared state file.
    // A live owning server remains authoritative for its child process.
    if (row.managerPid && row.managerPid !== process.pid && processExists(row.managerPid) && processExists(row.pid)) continue;
    if (!processExists(row.pid)) {
      row.status = "stopped";
      row.stoppedAt = row.stoppedAt || new Date().toISOString();
      row.stopReason = "missing";
      changed = true;
    } else if (!liveProcesses.has(key)) {
      row.status = "unknown";
      row.error = "CCM 重启后无法证明该 PID 仍属于原运行配置";
      changed = true;
    }
  }
  if (changed) writeState(state);
  return state;
}

function logFile(project: string, profileId: string, kind: "run" | "build") {
  const dir = resolveContainedPath(RUNTIME_LOG_DIR, validateProjectName(project));
  fs.mkdirSync(dir, { recursive: true });
  return resolveContainedPath(dir, `${profileId}.${kind}.log`);
}

function redactOutput(value: any) {
  return String(value || "")
    .replace(/(\b(?:api[_-]?key|token|secret|password|authorization|cookie)\b\s*[=:]\s*)([^\s,;]+)/gi, "$1[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]");
}

function appendLog(file: string, chunk: any) {
  ensureRuntimeDirs();
  const max = 4 * 1024 * 1024;
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > max) {
      const content = fs.readFileSync(file);
      fs.writeFileSync(file, content.subarray(Math.max(0, content.length - Math.floor(max / 2))));
    }
    const content = redactOutput(chunk);
    fs.appendFileSync(file, content, "utf-8");
    for (const listener of runtimeLogListeners.get(file) || []) listener({ type: "chunk", content });
  } catch {}
}

function replaceLog(file: string, content: string) {
  const safeContent = redactOutput(content);
  fs.writeFileSync(file, safeContent, "utf-8");
  for (const listener of runtimeLogListeners.get(file) || []) listener({ type: "reset", content: safeContent });
}

function attachProcessLogs(child: ChildProcess, file: string, profile: ProjectRuntimeProfileV1, observe?: (content: string) => void) {
  const javaConsole = process.platform === "win32" && ["maven", "gradle"].includes(profile.projectType);
  const stdoutDecoder = javaConsole ? new TextDecoder("gb18030") : null;
  const stderrDecoder = javaConsole ? new TextDecoder("gb18030") : null;
  const consume = (chunk: any, decoder: TextDecoder | null) => {
    const content = decoder ? decoder.decode(chunk, { stream: true }) : String(chunk || "");
    observe?.(content);
    appendLog(file, content);
  };
  child.stdout?.on("data", chunk => consume(chunk, stdoutDecoder));
  child.stderr?.on("data", chunk => consume(chunk, stderrDecoder));
  child.on("close", () => {
    if (stdoutDecoder) appendLog(file, stdoutDecoder.decode());
    if (stderrDecoder) appendLog(file, stderrDecoder.decode());
  });
}

function needsMavenReactorPreparation(output: string) {
  return /Non-resolvable import POM|Could not find artifact .*SNAPSHOT|dependencies\.dependency\.version.+is missing|Failed to read artifact descriptor/i.test(output);
}

function localMavenRecoveryCommands(project: string, output: string) {
  const { workDir } = projectConfig(project);
  const missing = new Set<string>();
  const artifactPattern = /(?:[A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+):(?:jar|pom|war):[^\s,;)]+/g;
  const resolutionErrors = output.split(/\r?\n/)
    .map(line => {
      const marker = line.search(/(?:the following artifacts could not be resolved|could not find artifact)\s*:?/i);
      return marker >= 0 ? line.slice(marker) : "";
    })
    .filter(Boolean)
    .join("\n");
  for (const match of resolutionErrors.matchAll(artifactPattern)) {
    if (/SNAPSHOT/i.test(match[0])) missing.add(match[1]);
  }
  if (!missing.size) return [];
  const runner = executableAt(workDir, "mvnw");
  let revisionArg = "";
  try {
    const rootPom = stripXmlComments(fs.readFileSync(path.join(workDir, "pom.xml"), "utf-8"));
    const revision = rootPom.match(/<revision>\s*([^<]+)\s*<\/revision>/i)?.[1]?.trim() || "";
    if (/^[A-Za-z0-9_.-]{1,100}$/.test(revision)) revisionArg = ` -Drevision=${revision}`;
  } catch {}
  const commands: Array<{ command: string; priority: number }> = [];
  for (const dir of scanManifestDirectories(workDir)) {
    const pom = path.join(dir, "pom.xml");
    if (!fs.existsSync(pom)) continue;
    let content = "";
    try { content = stripXmlComments(fs.readFileSync(pom, "utf-8")).replace(/<parent>[\s\S]*?<\/parent>/i, ""); } catch { continue; }
    const artifactId = content.match(/<artifactId>\s*([^<]+)\s*<\/artifactId>/i)?.[1]?.trim();
    if (!artifactId || !missing.has(artifactId)) continue;
    const modulePath = relativeModule(workDir, dir);
    if (modulePath === ".") continue;
    const packaging = content.match(/<packaging>\s*([^<]+)\s*<\/packaging>/i)?.[1]?.trim().toLowerCase() || "jar";
    commands.push({
      command: `${runner} -f ${modulePath.replace(/\\/g, "/")}/pom.xml install -Dmaven.test.skip=true${revisionArg}`,
      priority: packaging === "pom" ? 0 : 1,
    });
    if (commands.length >= 4) break;
  }
  return [...new Set(commands.sort((a, b) => a.priority - b.priority).map(item => item.command))];
}

function profileForAction(project: string, profileId: unknown) {
  const config = getProjectRuntimeConfig(project);
  const id = String(profileId || config.selectedProfileId || "");
  const profile = config.profiles.find(item => item.id === id);
  if (!profile || !profile.enabled || profile.stale) throw new Error("运行配置不存在、未启用或已经失效");
  return profile;
}

function runtimeLogTarget(project: string, profileId: unknown, kind: unknown) {
  const safeProject = projectConfig(project).project;
  const config = getProjectRuntimeConfig(safeProject);
  const id = String(profileId || config.selectedProfileId || "");
  if (!PROFILE_ID_PATTERN.test(id)) throw new Error("运行配置 ID 无效");
  const safeKind: "run" | "build" = kind === "build" ? "build" : "run";
  const file = logFile(safeProject, id, safeKind);
  const state = readState();
  const key = runtimeKey(safeProject, id);
  const known = config.profiles.some(item => item.id === id)
    || Boolean(state.processes[key])
    || Boolean(state.builds[key])
    || fs.existsSync(file);
  if (!known) throw new Error("找不到该运行配置的日志记录");
  return { safeProject, profileId: id, safeKind, file };
}

function executableFromPath(names: string[]) {
  const pathEntries = String(process.env.PATH || "").split(path.delimiter)
    .map(entry => entry.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
  for (const directory of pathEntries) {
    for (const name of names) {
      const candidate = path.join(directory, name);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {}
    }
  }
  return "";
}

function uniqueToolchainCandidates(rows: Array<{ home: string; source: string }>) {
  const seen = new Set<string>();
  return rows.filter(row => {
    if (!row.home) return false;
    const key = process.platform === "win32" ? row.home.toLowerCase() : row.home;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function detectProjectJavaToolchainCandidates(project: string) {
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
    schema: "ccm-project-java-toolchain-candidates-v1" as const,
    project: safeProject,
    jdk: jdkCandidates,
    maven: mavenCandidates,
    wrapper: { available: !!wrapper, path: wrapper },
  };
}

export function resolveProjectJavaToolchainExecution(project: string, override?: any) {
  const { workDir } = projectConfig(project);
  const configured = validateProjectJavaToolchain(
    project,
    override === undefined ? getProjectRuntimeConfig(project).toolchain : override,
  );
  const wrapper = projectWrapperExecutable(workDir, "mvnw");
  let mavenExecutable = "mvn";
  if (configured.mavenMode === "wrapper" || (configured.mavenMode === "auto" && wrapper)) {
    if (!wrapper) throw new Error("当前项目不存在 Maven Wrapper，请选择系统 Maven或指定 Maven目录");
    mavenExecutable = wrapper;
  } else if (configured.mavenMode === "custom") {
    mavenExecutable = existingExecutable(
      configured.mavenHome,
      process.platform === "win32" ? ["bin/mvn.cmd", "bin/mvn.bat", "bin/mvn.exe"] : ["bin/mvn"],
    );
  }
  const javaExecutable = configured.jdkMode === "custom"
    ? existingExecutable(configured.jdkHome, process.platform === "win32" ? ["bin/java.exe", "bin/java.cmd"] : ["bin/java"])
    : "java";
  const prependPath = [
    configured.jdkMode === "custom" ? path.join(configured.jdkHome, "bin") : "",
    configured.mavenMode === "custom" ? path.join(configured.mavenHome, "bin") : "",
  ].filter(Boolean);
  const env: Record<string, string> = {};
  if (configured.jdkMode === "custom") {
    env.JAVA_HOME = configured.jdkHome;
    env.JDK_HOME = configured.jdkHome;
  }
  if (configured.mavenMode === "custom") {
    env.MAVEN_HOME = configured.mavenHome;
    env.M2_HOME = configured.mavenHome;
  }
  if (prependPath.length) env.PATH = [...prependPath, String(process.env.PATH || "")].filter(Boolean).join(path.delimiter);
  const mavenArgs: string[] = [];
  if (configured.settingsPath) mavenArgs.push("-s", configured.settingsPath);
  if (configured.localRepository) {
    fs.mkdirSync(configured.localRepository, { recursive: true });
    mavenArgs.push(`-Dmaven.repo.local=${configured.localRepository}`);
  }
  if (configured.offline) mavenArgs.push("-o");
  return {
    configured,
    env,
    javaExecutable,
    mavenExecutable,
    mavenArgs,
    checksum: checksum(configured),
  };
}

function runToolchainVersion(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) {
  const base = path.basename(command).toLowerCase().replace(/\.(?:exe|cmd|bat)$/i, "");
  const result = spawnSync(command, args, {
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

export function testProjectJavaToolchain(project: string, input?: any) {
  const { project: safeProject, workDir } = projectConfig(project);
  const execution = resolveProjectJavaToolchainExecution(safeProject, input);
  const env = buildTestAgentSubprocessEnv(execution.env);
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

function spawnProfileCommand(project: string, profile: ProjectRuntimeProfileV1, command: string) {
  const { workDir } = projectConfig(project);
  const cwd = resolveContainedPath(workDir, profile.modulePath);
  const invocation = verificationCommandInvocation(command);
  if (invocation.error) throw new Error(`命令被安全策略拒绝：${invocation.error}`);
  const toolchain = resolveProjectJavaToolchainExecution(project);
  let executable = invocation.executable;
  let args = [...invocation.args];
  const commandBase = path.basename(executable).toLowerCase().replace(/\.(?:exe|cmd|bat)$/i, "");
  if (profile.projectType === "maven" && ["mvn", "mvnw"].includes(commandBase)) {
    executable = toolchain.mavenExecutable;
    args = [...toolchain.mavenArgs, ...args];
  }
  const child = spawn(executable, args, {
    cwd,
    shell: invocation.requiresShell,
    windowsHide: true,
    detached: process.platform !== "win32",
    env: buildTestAgentSubprocessEnv(toolchain.env),
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { child, cwd, toolchainChecksum: toolchain.checksum };
}

function stopProcessTree(child: ChildProcess) {
  const pid = Number(child.pid || 0);
  stopProcessPidTree(pid, child);
}

function stopProcessPidTree(pid: number, child?: ChildProcess) {
  if (!pid) return;
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
    const powershell = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, stdio: "ignore", timeout: 15_000 });
    if (powershell.error || powershell.status !== 0) spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    return;
  }
  try { process.kill(-pid, "SIGTERM"); } catch { try { child?.kill("SIGTERM"); } catch {} }
}

export function stopManagedProjectRuntimesForShutdown() {
  const state = readState();
  const stoppedAt = new Date().toISOString();
  const processTargets = new Map<string, number>();
  const buildTargets = new Map<string, number>();
  for (const [key, row] of Object.entries(state.processes)) {
    if (row.managerPid === process.pid && ["starting", "running"].includes(row.status) && processExists(row.pid)) processTargets.set(key, row.pid);
  }
  for (const [key, child] of liveProcesses) {
    const row = state.processes[key];
    const pid = Number(child.pid || 0);
    if (pid) processTargets.set(key, pid);
    if (row && row.pid === pid) {
      row.status = "stopped";
      row.stopReason = "user";
      row.exitCode = null;
      row.stoppedAt = stoppedAt;
    }
  }
  for (const [key, pid] of processTargets) {
    const row = state.processes[key];
    if (!row || row.pid !== pid) continue;
    row.status = "stopped";
    row.stopReason = "user";
    row.exitCode = null;
    row.stoppedAt = stoppedAt;
  }
  for (const [key, row] of Object.entries(state.builds)) {
    if (row.managerPid === process.pid && row.status === "building" && processExists(row.pid)) buildTargets.set(key, row.pid);
  }
  for (const [key, child] of liveBuilds) {
    const row = state.builds[key];
    const pid = Number(child.pid || 0);
    if (pid) buildTargets.set(key, pid);
    if (row && row.pid === pid) {
      row.status = "failed";
      row.exitCode = null;
      row.finishedAt = stoppedAt;
      row.error = "CCM 服务正常关闭，构建任务已停止";
    }
  }
  for (const [key, pid] of buildTargets) {
    const row = state.builds[key];
    if (!row || row.pid !== pid) continue;
    row.status = "failed";
    row.exitCode = null;
    row.finishedAt = stoppedAt;
    row.error = "CCM 服务正常关闭，构建任务已停止";
  }
  // Commit ownership release before process termination so a forced server
  // shutdown cannot leave a dead PID marked as running.
  writeState(state);
  for (const pid of processTargets.values()) stopProcessPidTree(pid);
  for (const pid of buildTargets.values()) stopProcessPidTree(pid);
  liveProcesses.clear();
  liveBuilds.clear();
  return { stoppedProcesses: processTargets.size, stoppedBuilds: buildTargets.size };
}

function collectArtifacts(root: string, patterns: string[], startedAt: number) {
  const results: string[] = [];
  const visit = (dir: string, depth: number) => {
    if (depth > 5 || results.length >= 30) return;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (EXCLUDED_DIRS.has(entry.name) && !["target", "dist", "build"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const relative = path.relative(root, full).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (patterns.includes(relative) || patterns.some(pattern => !pattern.includes("*") && relative.endsWith(pattern))) results.push(relative);
        visit(full, depth + 1);
      } else if (entry.isFile()) {
        const matches = patterns.some(pattern => {
          const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
          return new RegExp(`^${escaped}$`, "i").test(relative);
        });
        if (matches && fs.statSync(full).mtimeMs >= startedAt - 2000 && !/(?:sources|javadoc|original)-?\.jar$/i.test(entry.name)) results.push(relative);
      }
    }
  };
  visit(root, 0);
  return [...new Set(results)].slice(0, 20);
}

export function startProjectRuntime(project: string, profileId?: unknown) {
  const safeProject = projectConfig(project).project;
  const profile = profileForAction(safeProject, profileId);
  if (!profile.runCommand) throw new Error("当前运行配置没有启动命令");
  const key = runtimeKey(safeProject, profile.id);
  const initialState = normalizeProcessStates(safeProject, readState());
  const previous = initialState.processes[key];
  if (["starting", "running", "unknown"].includes(previous?.status || "")) throw new Error(previous?.status === "unknown" ? previous.error : "当前运行配置已经启动或正在准备依赖");
  const file = logFile(safeProject, profile.id, "run");
  replaceLog(file, `[${new Date().toISOString()}] START ${profile.label}\n`);
  const row: RuntimeProcessState = { project: safeProject, profileId: profile.id, status: "running", pid: 0, managerPid: process.pid, commandChecksum: "", workDir: "", startedAt: new Date().toISOString() };

  const finalize = (child: ChildProcess, code: number | null, failed: boolean) => {
    if (liveProcesses.get(key) === child) liveProcesses.delete(key);
    const latest = readState();
    const current = latest.processes[key];
    if (!current || current.pid !== Number(child.pid || 0)) return;
    const stoppedByUser = current.stopReason === "user";
    current.status = stoppedByUser || !failed ? "stopped" : "failed";
    current.exitCode = stoppedByUser ? null : code;
    current.stoppedAt = current.stoppedAt || new Date().toISOString();
    current.stopReason = stoppedByUser ? "user" : "exited";
    writeState(latest);
    publishRuntimeEvent("project", current.status === "failed" ? "project.runtime.failed" : "project.runtime.stopped", { project: safeProject, profileId: profile.id, status: current.status });
  };

  let localRecoveryQueue: string[] = [];
  let mavenRecoveryEvidence = "";
  const launch = (command: string, phase: "prepare" | "prepare_retry" | "hydrate_local" | "run", retried: boolean) => {
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
      if (liveProcesses.get(key) === child) liveProcesses.delete(key);
      const current = readState().processes[key];
      if (!current || current.pid !== Number(child.pid || 0)) return;
      if (current.stopReason === "user") return finalize(child, code, false);
      if (phase === "run" && code !== 0 && !retried && profile.prepareCommand && needsMavenReactorPreparation(outputTail)) {
        mavenRecoveryEvidence = outputTail;
        appendLog(file, `\n[CCM] 检测到项目内部 SNAPSHOT/BOM 尚未安装，正在准备 Maven reactor 依赖，完成后会自动重试。\n`);
        publishRuntimeEvent("project", "project.runtime.preparing", { project: safeProject, profileId: profile.id, status: "starting" });
        launch(profile.prepareCommand, "prepare", false);
        return;
      }
      if (phase === "prepare" && code !== 0) {
        localRecoveryQueue = localMavenRecoveryCommands(safeProject, `${mavenRecoveryEvidence}\n${outputTail}`);
        if (localRecoveryQueue.length) {
          appendLog(file, `\n[CCM] Reactor 中发现被根 pom 排除的本地 SNAPSHOT 模块，正在逐个安装后重试：${localRecoveryQueue.length} 个。\n`);
          launch(localRecoveryQueue.shift()!, "hydrate_local", false);
          return;
        }
      }
      if (phase === "hydrate_local" && code === 0) {
        if (localRecoveryQueue.length) launch(localRecoveryQueue.shift()!, "hydrate_local", false);
        else {
          appendLog(file, `\n[CCM] 本地 SNAPSHOT 模块安装完成，正在重新准备 Maven reactor。\n`);
          launch(profile.prepareCommand!, "prepare_retry", false);
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
    publishRuntimeEvent("project", phase === "run" ? "project.runtime.started" : "project.runtime.preparing", { project: safeProject, profileId: profile.id, status: row.status });
    return child;
  };

  launch(profile.runCommand, "run", false);
  return { success: true, profile, state: row };
}

export function stopProjectRuntime(project: string, profileId?: unknown) {
  const safeProject = projectConfig(project).project;
  const profile = profileForAction(safeProject, profileId);
  const key = runtimeKey(safeProject, profile.id);
  const state = normalizeProcessStates(safeProject, readState());
  const row = state.processes[key];
  if (!row || row.status === "stopped" || row.status === "failed") return { success: true, alreadyStopped: true, profile, state: row || null };
  if (row.status === "unknown" || !liveProcesses.has(key)) throw new Error(row.error || "无法证明 PID 归属，已拒绝停止");
  row.stoppedAt = new Date().toISOString();
  row.stopReason = "user";
  writeState(state);
  stopProcessTree(liveProcesses.get(key)!);
  row.status = "stopped";
  writeState(state);
  publishRuntimeEvent("project", "project.runtime.stopped", { project: safeProject, profileId: profile.id, status: "stopped" });
  return { success: true, profile, state: row };
}

export function stopAllProjectRuntimes(project: string) {
  const safeProject = projectConfig(project).project;
  const state = normalizeProcessStates(safeProject, readState());
  const stoppedAt = new Date().toISOString();
  const processTargets: Array<{ key: string; row: RuntimeProcessState; child: ChildProcess }> = [];
  const buildTargets: Array<{ key: string; row: RuntimeBuildState; child: ChildProcess }> = [];
  const failures: Array<{ profileId: string; kind: "run" | "build"; error: string }> = [];

  for (const [key, row] of Object.entries(state.processes)) {
    if (row.project !== safeProject || !["starting", "running", "unknown"].includes(row.status)) continue;
    const child = liveProcesses.get(key);
    if (row.status === "unknown" || !child || Number(child.pid || 0) !== Number(row.pid || 0)) {
      failures.push({ profileId: row.profileId, kind: "run", error: row.error || "无法证明 PID 归属，已拒绝停止" });
      continue;
    }
    row.stoppedAt = stoppedAt;
    row.stopReason = "user";
    row.exitCode = null;
    processTargets.push({ key, row, child });
  }
  for (const [key, row] of Object.entries(state.builds)) {
    if (row.project !== safeProject || row.status !== "building") continue;
    const child = liveBuilds.get(key);
    if (!child || Number(child.pid || 0) !== Number(row.pid || 0)) {
      failures.push({ profileId: row.profileId, kind: "build", error: "无法证明构建进程归属，已拒绝停止" });
      continue;
    }
    row.status = "failed";
    row.finishedAt = stoppedAt;
    row.exitCode = null;
    row.error = "项目已断开，构建任务已停止";
    buildTargets.push({ key, row, child });
  }

  // 先持久化用户停止意图，避免 close 事件把主动断开误记成运行失败。
  writeState(state);
  for (const target of processTargets) {
    stopProcessTree(target.child);
    liveProcesses.delete(target.key);
    target.row.status = "stopped";
    publishRuntimeEvent("project", "project.runtime.stopped", { project: safeProject, profileId: target.row.profileId, status: "stopped", reason: "project_disconnected" });
  }
  for (const target of buildTargets) {
    stopProcessTree(target.child);
    liveBuilds.delete(target.key);
    publishRuntimeEvent("project", "project.runtime.build_failed", { project: safeProject, profileId: target.row.profileId, status: "failed", reason: "project_disconnected" });
  }
  writeState(state);
  return {
    success: failures.length === 0,
    project: safeProject,
    stoppedProcesses: processTargets.length,
    stoppedBuilds: buildTargets.length,
    failures,
  };
}

export function restartProjectRuntime(project: string, profileId?: unknown) {
  const safeProject = projectConfig(project).project;
  const profile = profileForAction(safeProject, profileId);
  stopProjectRuntime(safeProject, profile.id);
  const result = startProjectRuntime(safeProject, profile.id);
  publishRuntimeEvent("project", "project.runtime.restarted", { project: safeProject, profileId: profile.id, status: "running" });
  return result;
}

export function buildProjectRuntime(project: string, profileId?: unknown) {
  const { project: safeProject, workDir } = projectConfig(project);
  const profile = profileForAction(safeProject, profileId);
  if (!profile.buildCommand) throw new Error("当前运行配置没有构建命令");
  const key = runtimeKey(safeProject, profile.id);
  if (liveBuilds.has(key)) throw new Error("当前运行配置正在构建");
  const { child } = spawnProfileCommand(safeProject, profile, profile.buildCommand);
  const file = logFile(safeProject, profile.id, "build");
  const startedAt = Date.now();
  replaceLog(file, `[${new Date(startedAt).toISOString()}] BUILD ${profile.label}\n`);
  attachProcessLogs(child, file, profile);
  const state = readState();
  const row: RuntimeBuildState = { project: safeProject, profileId: profile.id, status: "building", pid: Number(child.pid || 0), managerPid: process.pid, startedAt: new Date(startedAt).toISOString() };
  state.builds[key] = row;
  writeState(state);
  liveBuilds.set(key, child);
  child.on("close", code => {
    if (liveBuilds.get(key) === child) liveBuilds.delete(key);
    const latest = readState();
    const current = latest.builds[key] || row;
    current.status = code === 0 ? "succeeded" : "failed";
    current.exitCode = code;
    current.finishedAt = new Date().toISOString();
    current.artifacts = code === 0 ? collectArtifacts(workDir, profile.artifactPatterns, startedAt) : [];
    latest.builds[key] = current;
    writeState(latest);
    publishRuntimeEvent("project", code === 0 ? "project.runtime.build_succeeded" : "project.runtime.build_failed", { project: safeProject, profileId: profile.id, status: current.status });
  });
  publishRuntimeEvent("project", "project.runtime.build_started", { project: safeProject, profileId: profile.id, status: "building" });
  return { success: true, profile, build: row };
}

export function getProjectRuntimeLogs(project: string, profileId: unknown, kind: unknown, lines = 300) {
  const { safeProject, profileId: id, safeKind, file } = runtimeLogTarget(project, profileId, kind);
  if (!fs.existsSync(file)) return { project: safeProject, profileId: id, kind: safeKind, logs: "" };
  const content = fs.readFileSync(file, "utf-8").split(/\r?\n/).slice(-Math.max(1, Math.min(2000, Number(lines) || 300))).join("\n");
  return { project: safeProject, profileId: id, kind: safeKind, logs: content };
}

export function subscribeProjectRuntimeLogs(project: string, profileId: unknown, kind: unknown, listener: (event: RuntimeLogEvent) => void) {
  const { file } = runtimeLogTarget(project, profileId, kind);
  if (!runtimeLogListeners.has(file)) runtimeLogListeners.set(file, new Set());
  runtimeLogListeners.get(file)!.add(listener);
  return () => {
    const listeners = runtimeLogListeners.get(file);
    listeners?.delete(listener);
    if (!listeners?.size) runtimeLogListeners.delete(file);
  };
}

export function getProjectRuntimeSnapshot(project: string) {
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

export function getProjectRuntimeSummary(project: string) {
  const snapshot = getProjectRuntimeSnapshot(project);
  return {
    profile_count: snapshot.profiles.length,
    running_count: snapshot.processes.filter(row => row.status === "running").length,
    unknown_count: snapshot.processes.filter(row => row.status === "unknown").length,
    building_count: snapshot.builds.filter(row => row.status === "building").length,
    selected_profile_id: snapshot.selected_profile_id,
  };
}

export function executeProjectRuntimeAction(project: string, profileId: unknown, action: unknown) {
  const operation = String(action || "").trim();
  if (operation === "start") return startProjectRuntime(project, profileId);
  if (operation === "stop") return stopProjectRuntime(project, profileId);
  if (operation === "restart") return restartProjectRuntime(project, profileId);
  if (operation === "build") return buildProjectRuntime(project, profileId);
  throw new Error("不支持的项目运行操作");
}
