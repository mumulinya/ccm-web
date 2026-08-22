import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export async function loadSessionTaskTimelineFixture(name) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `ccm-${name}-`));
  process.env.CCM_TASK_STORE_DIR = directory;
  return import("../ccm-package/dist/tasks/session-task-timeline.js");
}
