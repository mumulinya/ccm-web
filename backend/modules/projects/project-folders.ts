import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { getConfigs } from "../../core/db";
import { CCM_DIR } from "../../core/utils";
import { publishRuntimeEvent } from "../../system/runtime-events";
import { validateProjectName } from "./project-validation";

const FILE = path.join(CCM_DIR, "project-folders.json");

type ProjectFolder = { id: string; name: string; order: number; created_at: string; updated_at: string };
type ProjectFolderState = {
  schema: "ccm-project-folders-v1";
  folders: ProjectFolder[];
  assignments: Record<string, string>;
  updated_at: string;
};

function emptyState(): ProjectFolderState {
  return { schema: "ccm-project-folders-v1", folders: [], assignments: {}, updated_at: "" };
}

function folderName(value: unknown) {
  const name = String(value || "").trim();
  if (!name) throw new Error("文件夹名称不能为空");
  if (name.length > 40) throw new Error("文件夹名称不能超过 40 个字符");
  if (/\p{C}/u.test(name)) throw new Error("文件夹名称包含无效字符");
  return name;
}

function readState(): ProjectFolderState {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    const folders = Array.isArray(parsed?.folders) ? parsed.folders : [];
    return {
      schema: "ccm-project-folders-v1",
      folders: folders.map((item: any, index: number) => ({
        id: String(item.id || ""),
        name: String(item.name || "").trim(),
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
        created_at: String(item.created_at || item.createdAt || ""),
        updated_at: String(item.updated_at || item.updatedAt || ""),
      })).filter((item: ProjectFolder) => /^pf_[a-z0-9]+$/i.test(item.id) && item.name),
      assignments: parsed?.assignments && typeof parsed.assignments === "object" ? parsed.assignments : {},
      updated_at: String(parsed?.updated_at || ""),
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: ProjectFolderState) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const temp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), "utf-8");
  if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  fs.renameSync(temp, FILE);
}

function publicState(state = readState()) {
  const activeProjects = new Set(getConfigs().map(item => item.name));
  const validFolders = new Set(state.folders.map(item => item.id));
  const assignments = Object.fromEntries(Object.entries(state.assignments)
    .filter(([project, folderId]) => activeProjects.has(project) && validFolders.has(String(folderId))));
  return {
    schema: state.schema,
    folders: [...state.folders].sort((left, right) => left.order - right.order || left.name.localeCompare(right.name)),
    assignments,
    updated_at: state.updated_at,
  };
}

function requireFolder(state: ProjectFolderState, id: unknown) {
  const folder = state.folders.find(item => item.id === String(id || ""));
  if (!folder) throw new Error("项目文件夹不存在");
  return folder;
}

function ensureUniqueName(state: ProjectFolderState, name: string, exceptId = "") {
  if (state.folders.some(item => item.id !== exceptId && item.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0)) {
    throw new Error("项目文件夹名称已存在");
  }
}

export function getProjectFolderState() {
  return publicState();
}

export function updateProjectFolderState(input: any = {}) {
  const action = String(input.action || "").trim();
  const state = readState();
  const now = new Date().toISOString();
  let changedFolderId = "";
  let changedProject = "";

  if (action === "create") {
    const name = folderName(input.name);
    ensureUniqueName(state, name);
    const folder: ProjectFolder = {
      id: `pf_${crypto.randomBytes(8).toString("hex")}`,
      name,
      order: state.folders.length ? Math.max(...state.folders.map(item => item.order)) + 1 : 0,
      created_at: now,
      updated_at: now,
    };
    state.folders.push(folder);
    changedFolderId = folder.id;
  } else if (action === "rename") {
    const folder = requireFolder(state, input.folder_id || input.folderId);
    const name = folderName(input.name);
    ensureUniqueName(state, name, folder.id);
    folder.name = name;
    folder.updated_at = now;
    changedFolderId = folder.id;
  } else if (action === "delete") {
    const folder = requireFolder(state, input.folder_id || input.folderId);
    state.folders = state.folders.filter(item => item.id !== folder.id);
    state.assignments = Object.fromEntries(Object.entries(state.assignments).filter(([, folderId]) => folderId !== folder.id));
    changedFolderId = folder.id;
  } else if (action === "assign") {
    const project = validateProjectName(input.project);
    if (!getConfigs().some(item => item.name === project)) throw new Error("项目不存在或已经归档");
    const requestedFolder = String(input.folder_id || input.folderId || "").trim();
    if (requestedFolder) requireFolder(state, requestedFolder);
    if (requestedFolder) state.assignments[project] = requestedFolder;
    else delete state.assignments[project];
    changedProject = project;
    changedFolderId = requestedFolder;
  } else {
    throw new Error("不支持的项目文件夹操作");
  }

  state.updated_at = now;
  writeState(state);
  publishRuntimeEvent("project", "project.folder.changed", {
    project: changedProject,
    id: changedFolderId,
    status: action,
    source: "project-folder-manager",
  });
  return { success: true, ...publicState(state) };
}

export function runProjectFolderSelfTest() {
  const source = emptyState();
  const now = new Date().toISOString();
  source.folders = [{ id: "pf_demo", name: "业务平台", order: 0, created_at: now, updated_at: now }];
  source.assignments = { missing: "pf_demo" };
  const visible = publicState(source);
  return {
    pass: visible.folders.length === 1 && Object.keys(visible.assignments).length === 0,
    checks: { folder_shape_normalized: visible.folders[0]?.name === "业务平台", archived_project_assignment_hidden: Object.keys(visible.assignments).length === 0 },
  };
}
