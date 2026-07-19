import * as fs from "fs";
import * as path from "path";
import { spawn, execSync } from "child_process";
import {
  sendJson,
  PETS_FILE,
  PET_PID_FILE_GLOBAL,
  PUBLIC_DIR,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart
} from "../../core/utils";
import { runPetActivityCoordinatorSelfTest } from "./pet-activity-coordinator";

const PET_WEB_ASSETS_DIR = path.join(PUBLIC_DIR, "pets");
const PET_DESKTOP_ASSETS_DIR = path.resolve(__dirname, "..", "..", "..", "pet", "assets");
const MAX_PET_ASSET_BYTES = 2 * 1024 * 1024;

function syncGeneratedPetDisplayNames(customTypes: any[]) {
  const list = Array.isArray(customTypes) ? customTypes : [];
  for (const skin of list) {
    const id = String(skin?.id || "").trim();
    const name = String(skin?.name || "").trim();
    if (!id || !name) continue;
    if (!(skin?.generated || Number(skin?.spriteVersionNumber) === 2)) continue;

    const relativeDir = path.join("generated", id);
    const targets = [
      path.join(PET_WEB_ASSETS_DIR, relativeDir, "pet.json"),
      path.join(PET_DESKTOP_ASSETS_DIR, relativeDir, "pet.json"),
    ];
    const frontendRoot = path.resolve(PUBLIC_DIR, "..", "..", "frontend");
    if (fs.existsSync(frontendRoot)) {
      targets.push(path.join(frontendRoot, "public", "pets", relativeDir, "pet.json"));
    }

    for (const file of targets) {
      try {
        if (!fs.existsSync(file)) continue;
        const manifest = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (String(manifest.displayName || "") === name) continue;
        fs.writeFileSync(file, JSON.stringify({ ...manifest, displayName: name, id }, null, 2), "utf-8");
      } catch {}
    }
  }
}

function isPetRunning() {
  if (!fs.existsSync(PET_PID_FILE_GLOBAL)) return false;
  const pid = fs.readFileSync(PET_PID_FILE_GLOBAL, "utf-8").trim();
  try {
    process.kill(parseInt(pid), 0);
    return true;
  } catch {
    try { fs.unlinkSync(PET_PID_FILE_GLOBAL); } catch {}
    return false;
  }
}

function findElectronBin() {
  const petExe = path.resolve(__dirname, "..", "..", "..", "pet", "node_modules", "electron", "dist", "electron.exe");
  if (fs.existsSync(petExe)) return petExe;
  const mainExe = path.resolve(__dirname, "..", "..", "..", "node_modules", "electron", "dist", "electron.exe");
  if (fs.existsSync(mainExe)) return mainExe;
  
  const petBin = path.resolve(__dirname, "..", "..", "..", "pet", "node_modules", ".bin", "electron");
  if (fs.existsSync(petBin)) return petBin;
  const mainBin = path.resolve(__dirname, "..", "..", "..", "node_modules", ".bin", "electron");
  if (fs.existsSync(mainBin)) return mainBin;
  return null;
}

function launchPet(port: number) {
  try {
    if (isPetRunning()) return { success: false, error: "桌面宠物已在运行" };
    const petDir = path.resolve(__dirname, "..", "..", "..", "pet");
    if (!fs.existsSync(path.join(petDir, "main.js"))) return { success: false, error: "宠物应用未安装" };
    const electronBin = findElectronBin();
    const cmd = electronBin || "npx";
    const args = electronBin ? [petDir] : ["electron", petDir];
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
      shell: !electronBin,
      windowsHide: false,
      env: { ...process.env, CCM_PORT: String(port) }
    });
    child.on("error", (err: any) => console.error("[pet]", err.message));
    child.unref();
    fs.writeFileSync(PET_PID_FILE_GLOBAL, String(child.pid));
    return { success: true, pid: child.pid };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function stopPet() {
  if (!fs.existsSync(PET_PID_FILE_GLOBAL)) return { success: false, error: "桌面宠物未在运行" };
  const pid = fs.readFileSync(PET_PID_FILE_GLOBAL, "utf-8").trim();
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    } else {
      process.kill(parseInt(pid), "SIGTERM");
    }
  } catch {}
  try { fs.unlinkSync(PET_PID_FILE_GLOBAL); } catch {}
  return { success: true };
}

function normalizePetAssetPath(assetPath: string) {
  const normalized = String(assetPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) return "";
  const ext = path.extname(normalized).toLowerCase();
  if (ext !== ".svg" && ext !== ".png") return "";
  if (normalized.split("/").some(part => !/^[\w.-]+$/.test(part))) return "";
  return normalized;
}

function writePetAsset(assetPath: string, sourcePath: string) {
  const safePath = normalizePetAssetPath(assetPath);
  if (!safePath) throw new Error("无效的宠物资源路径");
  const stat = fs.statSync(sourcePath);
  if (stat.size <= 0) throw new Error("上传文件为空");
  if (stat.size > MAX_PET_ASSET_BYTES) throw new Error("上传文件不能超过 2MB");

  const contentBuffer = fs.readFileSync(sourcePath);
  const ext = path.extname(safePath).toLowerCase();

  if (ext === ".svg") {
    const content = contentBuffer.toString("utf-8");
    if (!/<svg[\s>]/i.test(content)) throw new Error("请上传有效的 SVG 文件");
    if (/<script[\s>]/i.test(content) || /\son\w+\s*=/i.test(content)) {
      throw new Error("SVG 不能包含脚本或内联事件");
    }
  }

  const devWebAssetsDir = path.resolve(PUBLIC_DIR, "..", "..", "frontend", "public", "pets");
  const targets = [
    { root: PET_WEB_ASSETS_DIR, file: path.join(PET_WEB_ASSETS_DIR, safePath) },
    { root: PET_DESKTOP_ASSETS_DIR, file: path.join(PET_DESKTOP_ASSETS_DIR, safePath) },
  ];
  if (fs.existsSync(devWebAssetsDir)) {
    targets.push({ root: devWebAssetsDir, file: path.join(devWebAssetsDir, safePath) });
  }
  for (const target of targets) {
    const relative = path.relative(target.root, target.file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("资源路径越界");
    fs.mkdirSync(path.dirname(target.file), { recursive: true });
    fs.writeFileSync(target.file, contentBuffer);
  }

  return safePath;
}

// === 暴露供外部查询进程状态 ===
export { isPetRunning, launchPet, stopPet };

export function handlePetsApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: {
    PORT: number;
    getPetAgents: Function;
    getPetNavigationTarget: Function;
    broadcastPetNavigation: Function;
    broadcastPetConfigChanged: Function;
    getProjectPetActionStrategy?: Function;
    petWorkspaceClientsSize: number;
  }
): boolean {
  if (pathname === "/api/pets/agents" && req.method === "GET") {
    sendJson(res, { success: true, agents: ctx.getPetAgents() });
    return true;
  }

  if (pathname === "/api/pets/self-test" && req.method === "GET") {
    const activity = runPetActivityCoordinatorSelfTest();
    sendJson(res, { success: true, pass: activity.pass, activity });
    return true;
  }

  if (pathname === "/api/pets/navigate" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const agent = String(data.agent || "").trim();
        if (!agent) return sendJson(res, { success: false, error: "缺少 agent" }, 400);
        const target = ctx.getPetNavigationTarget(agent);
        const event = ctx.broadcastPetNavigation(agent, target);
        sendJson(res, {
          success: true,
          target,
          url: event.url,
          workspaceOpen: ctx.petWorkspaceClientsSize > 0,
        });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/pets/action-strategy" && req.method === "GET") {
    sendJson(res, {
      success: true,
      project: ctx.getProjectPetActionStrategy ? ctx.getProjectPetActionStrategy() : { idle: [], active: [], idleCycleSeconds: 0 },
    });
    return true;
  }

  if (pathname === "/api/pets/config" && req.method === "GET") {
    try {
      if (fs.existsSync(PETS_FILE)) {
        return sendJson(res, JSON.parse(fs.readFileSync(PETS_FILE, "utf-8")));
      }
    } catch {}
    sendJson(res, { configs: {}, positions: {} });
    return true;
  }

  if (pathname === "/api/pets/config" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        fs.writeFileSync(PETS_FILE, JSON.stringify(payload, null, 2));
        syncGeneratedPetDisplayNames(payload?.customTypes || []);
        ctx.broadcastPetConfigChanged();
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/pets/assets/upload" && req.method === "POST") {
    (async () => {
      let upload: any = null;
      try {
        const contentType = String(req.headers["content-type"] || "");
        const boundary = getMultipartBoundary(contentType);
        if (!boundary) return sendJson(res, { success: false, error: "请使用 multipart/form-data 上传" }, 400);
        const buffer = await collectRequestBuffer(req);
        const { files, fields } = parseMultipart(buffer, boundary);
        upload = files.find(f => f.field === "file") || files[0];
        if (!upload?.savedPath) return sendJson(res, { success: false, error: "缺少 SVG 文件" }, 400);

        const assetPath = writePetAsset(fields.assetPath, upload.savedPath);
        ctx.broadcastPetConfigChanged();
        sendJson(res, {
          success: true,
          assetPath,
          url: `/pets/${assetPath}?v=${Date.now()}`
        });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      } finally {
        if (upload?.savedPath) {
          try { fs.unlinkSync(upload.savedPath); } catch {}
        }
      }
    })();
    return true;
  }

  if (pathname === "/api/pets/launch" && req.method === "POST") {
    sendJson(res, launchPet(ctx.PORT));
    return true;
  }

  if (pathname === "/api/pets/close" && req.method === "POST") {
    sendJson(res, stopPet());
    return true;
  }

  if (pathname === "/api/pets/status" && req.method === "GET") {
    sendJson(res, { running: isPetRunning() });
    return true;
  }

  return false;
}
