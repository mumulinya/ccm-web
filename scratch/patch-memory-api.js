const fs = require('fs');

const mccPath = 'C:/Users/admin/.cc-connect/ccm/backend/modules/memory-control-center.ts';
let mccContent = fs.readFileSync(mccPath, 'utf-8');

const mccAppend = `
export function handleMemoryCenterApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (!pathname.startsWith("/api/memory-center/")) return false;

  const { sendJson } = require("../utils");

  if (pathname === "/api/memory-center/overview" && req.method === "GET") {
    sendJson(res, buildMemoryCenterOverview());
    return true;
  }

  if (pathname === "/api/memory-center/scope" && req.method === "GET") {
    sendJson(res, getMemoryCenterScope(parsed.query.scope, parsed.query.id));
    return true;
  }

  if (pathname === "/api/memory-center/audit" && req.method === "GET") {
    const limit = parseInt(parsed.query.limit) || 200;
    sendJson(res, { audit: listMemoryAudit(limit, parsed.query) });
    return true;
  }

  if (pathname === "/api/memory-center/evidence" && req.method === "GET") {
    sendJson(res, { evidence: findMemoryEvidence(parsed.query) });
    return true;
  }

  if (pathname === "/api/memory-center/control" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        updateMemoryControl(data);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/memory-center/operation" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        recordMemoryOperation(data);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/memory-center/acceptance" && req.method === "POST") {
    const acceptance = runMemoryAcceptanceSnapshot();
    const metrics = getMemoryMetrics();
    sendJson(res, { acceptance, metrics });
    return true;
  }

  if (pathname === "/api/memory-center/feedback" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        recordMemoryMetric("feedback", data);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  return false;
}
`;

if (!mccContent.includes('handleMemoryCenterApi')) {
  fs.writeFileSync(mccPath, mccContent + mccAppend);
}

const serverPath = 'C:/Users/admin/.cc-connect/ccm/backend/server.ts';
let serverContent = fs.readFileSync(serverPath, 'utf-8');

if (!serverContent.includes('handleMemoryCenterApi')) {
  serverContent = serverContent.replace(
    /if \(handleRagApi\(pathname, req, res, parsed\)\) return;/g,
    'if (handleRagApi(pathname, req, res, parsed)) return;\n  const { handleMemoryCenterApi } = require("./modules/memory-control-center");\n  if (handleMemoryCenterApi(pathname, req, res, parsed)) return;'
  );
  fs.writeFileSync(serverPath, serverContent);
}

console.log('Patch complete!');
