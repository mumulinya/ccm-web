import { sendJson } from "../../core/utils";
import {
  decideTaskPermission,
  listTaskPermissionRequests,
  runTaskPermissionBrokerSelfTest,
} from "./task-permission-broker";

function readJsonBody(req: any) {
  return new Promise<any>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: any) => {
      body += String(chunk || "");
      if (body.length > 256 * 1024) reject(new Error("请求体过大"));
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}

export function handleTaskPermissionRoutes(pathname: string, req: any, res: any, parsed: any, ctx?: any) {
  if (pathname === "/api/tasks/permission-requests" && req.method === "GET") {
    const requests = listTaskPermissionRequests({
      taskId: String(parsed?.query?.task_id || parsed?.query?.taskId || ""),
      groupId: String(parsed?.query?.group_id || parsed?.query?.groupId || ""),
      project: String(parsed?.query?.project || ""),
      state: String(parsed?.query?.state || ""),
      originType: String(parsed?.query?.origin_type || parsed?.query?.originType || ""),
      originSessionId: String(parsed?.query?.origin_session_id || parsed?.query?.originSessionId || ""),
      originGroupId: String(parsed?.query?.origin_group_id || parsed?.query?.originGroupId || ""),
      originProject: String(parsed?.query?.origin_project || parsed?.query?.originProject || ""),
    });
    sendJson(res, { success: true, requests, pending_user_count: requests.filter(item => item.state === "awaiting_user").length });
    return true;
  }
  if (pathname === "/api/tasks/permission-requests/decide" && req.method === "POST") {
    void readJsonBody(req).then(payload => {
      const requestId = String(payload?.request_id || payload?.requestId || "").trim();
      if (!requestId) return sendJson(res, { success: false, error: "缺少权限申请 ID" }, 400);
      try {
        const request = decideTaskPermission(requestId, payload);
        let queueResult: any = null;
        if (request.state === "approved" && ctx && !request.taskId.startsWith("project-session:")) {
          const runtime = require("./collaboration-task-runtime");
          const service = require("./collaboration-task-service");
          service.updateTask(request.taskId, { status: "pending", status_detail: `用户已批准 ${request.operation} 限时权限，等待 Agent 继续执行` });
          queueResult = runtime.enqueueTask(request.taskId, ctx);
        }
        sendJson(res, { success: true, request, queue_result: queueResult });
      }
      catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 409); }
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
    return true;
  }
  if (pathname === "/api/tasks/permission-requests/self-test" && req.method === "GET") {
    const result = runTaskPermissionBrokerSelfTest();
    sendJson(res, result, result.pass ? 200 : 500);
    return true;
  }
  return false;
}
