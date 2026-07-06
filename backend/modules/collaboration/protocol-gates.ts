import * as crypto from "crypto";

function normalizeStringArray(value: any): string[] {
  if (Array.isArray(value)) return value.map((item: any) => String(item || "").trim()).filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [String(value).trim()].filter(Boolean);
}

function uniqueStrings(...values: any[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const visit = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const text = String(value || "").trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    result.push(text);
  };
  values.forEach(visit);
  return result;
}

function compactMemoryText(value: any, max = 400) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function stableInjectionId(row: any) {
  const source = [
    row?.target || row?.consumer || "",
    row?.endpoint || row?.path || "",
    row?.type || "contract",
    row?.summary || row?.note || row?.response || row?.request || "",
  ].join("|");
  return `ci_${crypto.createHash("sha256").update(source).digest("hex").slice(0, 16)}`;
}

function normalizeConsumedInjectionIds(receipt: any) {
  return uniqueStrings(
    receipt?.consumedInjectionIds,
    receipt?.consumed_injection_ids,
    receipt?.contractInjectionConsumed,
    receipt?.contract_injection_consumed,
    receipt?.contractInjection?.consumedInjectionIds,
    receipt?.contract_injection?.consumed_injection_ids,
    ...(Array.isArray(receipt?.contractConsumption || receipt?.contract_consumption)
      ? (receipt.contractConsumption || receipt.contract_consumption).map((item: any) => item?.injection_id || item?.injectionId)
      : []),
  );
}

function normalizeContractConsumptionEntries(receipt: any) {
  const entries = [
    ...(Array.isArray(receipt?.contractConsumption) ? receipt.contractConsumption : []),
    ...(Array.isArray(receipt?.contract_consumption) ? receipt.contract_consumption : []),
    ...(Array.isArray(receipt?.contractInjection?.consumption) ? receipt.contractInjection.consumption : []),
    ...(Array.isArray(receipt?.contract_injection?.consumption) ? receipt.contract_injection.consumption : []),
  ];
  return entries
    .filter((item: any) => item && typeof item === "object")
    .map((item: any) => ({
      injection_id: String(item.injection_id || item.injectionId || item.id || "").trim(),
      status: String(item.status || item.result || item.decision || "").trim().toLowerCase(),
      summary: compactMemoryText(item.summary || item.note || item.reason || item.evidence || "", 240),
      evidence: normalizeStringArray(item.evidence || item.files || item.verification || item.tests).slice(0, 12),
    }))
    .filter((item: any) => item.injection_id);
}

function evaluateContractConsumptionQuality(receipt: any, injectionId: string) {
  const consumedIds = normalizeConsumedInjectionIds(receipt);
  if (!consumedIds.includes(injectionId)) {
    return { consumed: false, pass: false, status: "missing_reference", reason: "回执未引用 injection_id", entry: null };
  }
  const entries = normalizeContractConsumptionEntries(receipt);
  const entry = entries.find((item: any) => item.injection_id === injectionId) || null;
  if (!entry) {
    return { consumed: true, pass: false, status: "missing_consumption_detail", reason: "缺少 contractConsumption 消费结论", entry: null };
  }
  const status = entry.status;
  const okStatuses = ["adapted", "verified", "no_change", "no_change_needed", "not_required", "not_applicable", "ok", "passed"];
  if (["blocked", "needs_info", "failed", "partial", "unknown"].includes(status) || !okStatuses.includes(status)) {
    return { consumed: true, pass: false, status: status || "missing_status", reason: "contractConsumption 状态未通过", entry };
  }
  const files = normalizeStringArray(receipt?.filesChanged || receipt?.files_changed || receipt?.files);
  const verification = normalizeStringArray(receipt?.verification || receipt?.tests);
  const evidence = normalizeStringArray(entry.evidence);
  if (["adapted", "verified", "ok", "passed"].includes(status) && (!files.length || !verification.length) && !evidence.length) {
    return { consumed: true, pass: false, status: "missing_evidence", reason: "已适配契约但缺少文件或验证证据", entry };
  }
  return { consumed: true, pass: true, status, reason: entry.summary || "contractConsumption 消费结论已记录", entry };
}

export function extractContractSyncHints(task: any, summary: any = {}) {
  const structured = (Array.isArray(summary.receipts) ? summary.receipts : [])
    .flatMap((item: any) => Array.isArray(item.contractChanges || item.contract_changes) ? (item.contractChanges || item.contract_changes) : [])
    .filter((item: any) => item && typeof item === "object");
  const text = [
    task?.title,
    task?.business_goal,
    task?.acceptance_criteria,
    ...(Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence.map((item: any) => `${item.project || ""} ${item.task || ""} ${item.reason || ""}`) : []),
    ...(Array.isArray(summary.receipts) ? summary.receipts.map((item: any) => `${item.agent || ""} ${item.summary || ""} ${(item.actions || []).join(" ")} ${(item.filesChanged || item.files_changed || item.files || []).join(" ")}`) : []),
  ].filter(Boolean).join("\n");
  const needsContract = /接口|API|api|schema|DTO|类型|字段|契约|前后端|请求|响应|路由|endpoint/i.test(text);
  const endpoints = uniqueStrings(
    structured.map((item: any) => item.endpoint).filter(Boolean),
    text.match(/(?:GET|POST|PUT|PATCH|DELETE)\s+\/[\w/:.-]+|\/api\/[\w/:.-]+/gi) || [],
  ).slice(0, 8);
  const files = uniqueStrings(text.match(/[\w@./-]+\.(?:ts|tsx|js|jsx|json|yaml|yml|sql|prisma|md)/gi) || []).slice(0, 8);
  return {
    required: needsContract,
    status: needsContract ? (structured.length ? "structured" : (endpoints.length || files.length ? "tracked" : "needs_sync")) : "not_required",
    summary: needsContract
      ? (structured.length ? `已收到 ${structured.length} 条结构化 contractChanges` : endpoints.length ? `检测到接口契约：${endpoints.join("、")}` : "检测到跨 Agent 契约信号，需要主 Agent 确认字段/接口一致")
      : "未检测到跨 Agent 契约同步需求",
    endpoints,
    files,
    changes: structured.slice(0, 8),
  };
}

export function buildAckPreflightReview(task: any, receipts: any[] = [], orders: any[] = []) {
  const rows = receipts.map((receipt: any) => {
    const ack = receipt.ack || null;
    const unclear = normalizeStringArray(ack?.unclear || []);
    const plannedScope = normalizeStringArray(ack?.plannedScope || ack?.scope || []);
    const forbiddenScope = normalizeStringArray(ack?.forbiddenScope || []);
    const goal = String(ack?.understoodGoal || ack?.goal || "").trim();
    const status = !ack ? "missing"
      : unclear.length ? "needs_rewrite"
        : goal && plannedScope.length ? "approved" : "weak";
    return {
      agent: receipt.agent || receipt.project || "",
      status,
      understood_goal: compactMemoryText(goal, 180),
      planned_scope: plannedScope.slice(0, 8),
      forbidden_scope: forbiddenScope.slice(0, 8),
      verification_plan: normalizeStringArray(ack?.verificationPlan || ack?.verification || []).slice(0, 8),
      unclear: unclear.slice(0, 8),
      reason: status === "approved" ? "ACK 目标和范围清晰"
        : status === "needs_rewrite" ? `ACK 仍有疑问：${unclear.join("；")}`
          : status === "weak" ? "ACK 缺少目标或计划范围"
            : "缺少结构化 ACK",
    };
  });
  const missingOrderAcks = orders
    .filter((order: any) => !rows.some((row: any) => String(row.agent || "").toLowerCase() === String(order.project || "").toLowerCase()))
    .map((order: any) => ({ agent: order.project, status: "waiting", reason: "等待接单 ACK", understood_goal: "", planned_scope: [], forbidden_scope: [], verification_plan: [], unclear: [] }));
  const allRows = [...rows, ...missingOrderAcks].slice(0, 12);
  const rejected = allRows.filter((row: any) => ["missing", "needs_rewrite", "weak"].includes(row.status));
  return {
    status: allRows.length && rejected.length === 0 ? "approved" : rejected.length ? "needs_review" : "waiting",
    rows: allRows,
    rejected,
    next_action: rejected.length ? "要求对应子 Agent 先补 ACK 或澄清范围，再继续验收" : "ACK 已通过，可继续执行/验收",
  };
}

export function buildContractTransferPlan(contractSync: any, orders: any[] = []) {
  const changes = Array.isArray(contractSync?.changes) ? contractSync.changes : [];
  const orderProjects = new Set(orders.map((item: any) => String(item.project || "").trim()).filter(Boolean));
  const rows = changes.flatMap((change: any, index: number) => {
    const consumers = normalizeStringArray(change.consumers || change.consumer || change.dependents);
    const targets = consumers.length ? consumers : [...orderProjects].filter(project => !normalizeStringArray(change.producers || change.provider || change.owner).includes(project));
    return targets.map((target: string) => ({
      id: `contract_transfer_${index + 1}_${target}`,
      injection_id: stableInjectionId({ ...change, target }),
      target,
      endpoint: change.endpoint || change.path || "",
      type: change.type || "contract",
      summary: compactMemoryText(change.note || change.summary || change.response || change.request || "契约变化需要同步给依赖 Agent", 220),
      status: orderProjects.has(target) ? "ready_to_inject" : "needs_target",
    }));
  }).slice(0, 12);
  return {
    required: changes.length > 0,
    status: rows.length ? (rows.some((row: any) => row.status === "needs_target") ? "needs_target" : "ready") : (contractSync?.required ? "needs_contract_changes" : "not_required"),
    rows,
    next_action: rows.length ? "将结构化契约变化注入给依赖子 Agent 或生成契约同步返工" : "暂无结构化契约需要传递",
  };
}

export function getTaskAckRewriteRows(task: any) {
  const summary = task?.delivery_summary || {};
  const rows = Array.isArray(summary.ack_review?.rows) ? summary.ack_review.rows : [];
  return rows
    .filter((row: any) => ["missing", "needs_rewrite", "weak", "waiting"].includes(String(row?.status || "")))
    .map((row: any) => ({
      agent: String(row?.agent || "").trim() || task?.target_project || "子 Agent",
      status: row?.status || "missing",
      reason: row?.reason || "ACK 未通过前置审核",
      unclear: normalizeStringArray(row?.unclear || []),
      planned_scope: normalizeStringArray(row?.planned_scope || row?.plannedScope || []),
      understood_goal: row?.understood_goal || row?.understoodGoal || "",
    }))
    .filter((row: any) => row.agent)
    .slice(0, 12);
}

export function getTaskContractInjectionRows(task: any) {
  const summary = task?.delivery_summary || {};
  const orders = Array.isArray(summary.assignment_evidence)
    ? summary.assignment_evidence.map((item: any) => ({ project: item.project || item.agent || item.target_project, objective: item.task || item.summary || "" }))
    : [];
  const sync = extractContractSyncHints(task, summary);
  const transfer = buildContractTransferPlan(sync, orders);
  return {
    sync,
    transfer,
    rows: (Array.isArray(transfer.rows) ? transfer.rows : [])
      .filter((row: any) => row?.target)
      .map((row: any) => ({
        ...row,
        injection_id: row.injection_id || stableInjectionId(row),
        target: String(row.target || "").trim(),
        status: row.status || "ready_to_inject",
      }))
      .slice(0, 20),
  };
}

export function evaluateContractInjectionGate(rows: any[] = [], assignments: any[] = [], receipts: any[] = []) {
  const normalizedRows = (rows || []).filter((row: any) => row?.target);
  const injected = normalizedRows.map((row: any) => {
    const injectionId = row.injection_id || stableInjectionId(row);
    const target = String(row.target || "").toLowerCase();
    const endpoint = String(row.endpoint || "").toLowerCase();
    const type = String(row.type || "").toLowerCase();
    const found = (assignments || []).find((assignment: any) => {
      const project = String(assignment?.project || assignment?.agent || assignment?.target_project || "").toLowerCase();
      const taskText = [
        assignment?.task,
        assignment?.reason,
        assignment?.continuationStrategy,
        assignment?.continuation_strategy,
      ].filter(Boolean).join("\n").toLowerCase();
      if (project !== target) return false;
      if (/contract[_ -]?inject|contractchanges|契约注入|注入.*契约|接口契约|字段契约|schema|endpoint/.test(taskText)) return true;
      if (endpoint && taskText.includes(endpoint)) return true;
      return !!type && !["contract", "api", "接口"].includes(type) && taskText.includes(type);
    });
    const consumerReceipt = (receipts || []).find((receipt: any) => {
      const agent = String(receipt?.agent || receipt?.project || "").toLowerCase();
      if (agent !== target) return false;
      return normalizeConsumedInjectionIds(receipt).includes(injectionId);
    });
    const consumptionQuality = consumerReceipt ? evaluateContractConsumptionQuality(consumerReceipt, injectionId) : null;
    return {
      ...row,
      injection_id: injectionId,
      injected: !!found,
      consumed: !!consumerReceipt && consumptionQuality?.pass === true,
      consumption_status: consumptionQuality?.status || "",
      consumption_reason: consumptionQuality?.reason || "",
      consumption_entry: consumptionQuality?.entry || null,
      consumer_receipt_status: consumerReceipt?.status || "",
      assignment_message_id: found?.message_id || "",
      assignment_source: found?.source || "",
      missing_reason: !found ? "needs_injection" : !consumerReceipt ? "needs_consumption_receipt" : consumptionQuality?.pass !== true ? "needs_consumption_evidence" : "",
    };
  });
  const missing = injected.filter((row: any) => !row.injected);
  const unconsumed = injected.filter((row: any) => row.injected && !row.consumed);
  return {
    required: normalizedRows.length > 0,
    pass: missing.length === 0 && unconsumed.length === 0,
    rows: injected,
    missing,
    unconsumed,
    status: !normalizedRows.length ? "not_required" : missing.length ? "needs_injection" : unconsumed.length ? "needs_consumption" : "injected",
    summary: !normalizedRows.length
      ? "无依赖 Agent 契约注入需求"
      : missing.length
        ? `仍需注入 ${missing.length} 个依赖 Agent`
        : unconsumed.length
          ? `仍有 ${unconsumed.length} 个依赖 Agent 未引用 injection_id 回执消费结果`
          : "结构化 contractChanges 已注入并被依赖 Agent 回执消费",
  };
}
