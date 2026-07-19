// Behavior-freeze split from marketplace.ts (part 2/2).
import * as crypto from "crypto";
import * as dns from "dns/promises";
import * as fs from "fs";
import * as https from "https";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { sendJson } from "../../core/utils";
import {
  deleteMcpTool,
  deleteSkill,
  loadProjectConfigs,
  loadMcpTools,
  loadSkills,
  saveMcpTool,
  saveSkill,
  SKILL_PACKAGES_DIR,
} from "../../core/db";
import { loadGroups } from "../collaboration/storage";
import { buildToolAuthorizationOptions, normalizeToolAuthorization, parseMcpGrant } from "../../tools/tool-authorization";
import { listRecentRuntimeToolAudits, probeRuntimeToolReadiness, resyncMissingRuntimeToolSnapshots, resyncRecentRuntimeToolSnapshots, syncRuntimeToolsWithCatalog } from "../../tools/runtime-tool-sync";
import { assertCcmInternalSkillMutable } from "../../skills/internal-skill-catalog";
import { isInternalMcpName } from "../../tools/internal-mcp-registry";
const { toolManager } = require("../../tools/tool-manager");
import { type InstallationRecord, MarketplaceInstallStore, MarketplaceListOptions, MarketplaceSource, CCM_COMMUNITY_CATALOG_URL, CCM_DIR, DEFAULT_MARKETPLACE_PAGE_SIZE, MAX_CATALOG_BYTES, MAX_MARKETPLACE_PAGE_SIZE, MAX_SKILL_FILE_BYTES, SKILLS_SH_SEARCH_URL, SMITHERY_CONFIG_FILE, SMITHERY_SERVERS_URL, appendJsonlBounded, appendMarketplaceOperationAudit, assertSafeHttpsUrl, baseMarketplaceSourceId, buildMarketplaceAuthorizationImpact, buildMarketplaceRuntimeCatalog, buildMarketplaceRuntimeImpact, buildMarketplaceSourceProof, catalogItemsFromParsedJson, cloneGithubSkill, compareVersions, decorateInstallState, fetchRemote, githubRepoFromUrlOrShorthand, installStagedPackage, installationKey, isPrivateAddress, loadInstallations, loadMarketplaceSources, localMarketplaceItems, marketplaceSourceId, maybeAutoResyncMarketplaceRuntime, normalizeMarketplaceInstallRequest, normalizeMarketplaceItem, normalizeSavedSource, parseGithubSkillSource, parseSkillMarkdown, previewMarketplaceAuthorizationImpact, publicMarketplaceSources, readMarketplaceOperationAudit, removeManagedPackage, safeSlug, sanitizeMarketplacePreviewItem, sanitizeMarketplaceSourceProof, saveInstallations, saveMarketplaceSources, sha256, stageSkillPackage, validateSkillDirectory, writeJsonAtomic } from "./marketplace-part-01";
export async function runMarketplaceSelfTest() {
  const localItems = localMarketplaceItems();
  const feishu = localItems.find(item => item.name === "mcp-feishu");
  const filesystem = localItems.find(item => item.name === "filesystem-mcp");
  const parsedSkill = parseSkillMarkdown("---\nname: release-notes\ndescription: Produce release notes\n---\n\nUse {{input}}.");
  const claudeCatalogItems = catalogItemsFromParsedJson({
    name: "example-claude-marketplace",
    owner: { name: "Example" },
    metadata: { version: "9.9.9", description: "Example Claude plugin marketplace" },
    plugins: [{
      name: "release-tools",
      source: "./plugins/release-tools",
      description: "Release workflow helpers",
      skills: "./skills/release-notes",
      mcpServers: {
        github: {
          command: "node",
          args: ["github-mcp.js"],
          env: { GITHUB_TOKEN: "secret" },
        },
      },
    }],
  }, { id: "claude-test", label: "Claude Test", kind: "catalog", url: "https://raw.githubusercontent.com/example/claude-market/main/marketplace.json", trust: "community" }, "https://raw.githubusercontent.com/example/claude-market/main/marketplace.json");
  const claudeCatalogMcp = claudeCatalogItems.find(item => item.type === "mcp" && item.name === "release-tools-github");
  const claudeCatalogSkill = claudeCatalogItems.find(item => item.type === "skill" && item.name === "release-tools-release-notes");
  const savedSource = normalizeSavedSource({ label: "Example Catalog", url: "https://example.com/catalog.json", trust: "community" });
  const officialSource = normalizeSavedSource({ label: "Untrusted Official Claim", url: "https://example.com/official.json", trust: "official" });
  const httpSource = normalizeSavedSource({ label: "Plain HTTP", url: "http://example.com/catalog.json" });
  let invalidRejected = false;
  try {
    normalizeMarketplaceItem({ type: "unknown", name: "bad" }, { id: "test", label: "Test", kind: "builtin", trust: "official" });
  } catch {
    invalidRejected = true;
  }
  const authSource: MarketplaceSource = { id: "selftest-catalog", label: "Self-Test Catalog", kind: "catalog", url: "https://example.com/catalog.json", trust: "community" };
  const authMcpItem = normalizeMarketplaceItem({
    name: "github-search",
    type: "mcp",
    description: "Search repositories",
    command: "npx",
    args: ["-y", "@example/github-search-mcp"],
    env: { GITHUB_TOKEN: "secret" },
    version: "1.2.3",
    author: "Example",
  }, authSource);
  const authSkillItem = normalizeMarketplaceItem({
    name: "market-release-notes",
    type: "skill",
    description: "Write release notes",
    prompt: "---\nname: market-release-notes\ndescription: Write release notes\n---\n\nWrite concise release notes.",
    version: "3.4.5",
    author: "Example",
  }, authSource);
  const now = "2026-07-07T00:00:00.000Z";
  const installedMcp = buildMarketplaceMcpToolRecord(authMcpItem, now);
  const installedSkill = buildMarketplaceSkillRecord(
    authSkillItem,
    {
      parsed: parseSkillMarkdown(authSkillItem.prompt, authSkillItem.name, authSkillItem.description),
      packageStats: { files: 1, totalBytes: authSkillItem.prompt.length },
    },
    path.join(SKILL_PACKAGES_DIR, safeSlug(authSkillItem.name)),
    sha256(authSkillItem.prompt),
    now,
  );
  const installRecord = buildMarketplaceInstallationRecord(authMcpItem, sha256(JSON.stringify(installedMcp)), "", undefined, now);
  const authMcpPreview = await previewMarketplaceItem(authMcpItem);
  const authSkillPreview = await previewMarketplaceItem(authSkillItem);
  const authorizationOptions = buildToolAuthorizationOptions({
    mcpTools: [installedMcp],
    skills: [installedSkill],
    status: {
      mcp: [{ server: "github-search", name: "searchRepos", description: "Search repositories", schema: { type: "object" } }],
      servers: [{ name: "github-search", connected: true, state: "connected" }],
    },
  });
  const sourceBoundCatalogItem = normalizeMarketplaceItem({
    name: "source-bound-mcp",
    type: "mcp",
    description: "Canonical source-bound MCP",
    command: "node",
    args: ["trusted-server.js"],
    version: "1.0.0",
  }, authSource);
  const sourceBoundTamperedItem = {
    ...sourceBoundCatalogItem,
    command: "node",
    args: ["tampered-server.js"],
  };
  const sourceBoundResolved = await resolveMarketplaceItemForInstall(sourceBoundTamperedItem, "install", {
    loadInstallations: () => [],
    loadItemsForSource: async () => [sourceBoundCatalogItem],
  });
  let unsavedSourceRejected = false;
  try {
    await resolveMarketplaceItemForInstall({
      ...sourceBoundCatalogItem,
      source: { id: "custom-unsaved", label: "Unsaved", kind: "catalog", url: "https://example.com/unsaved.json", trust: "custom" },
    }, "install", {
      loadInstallations: () => [],
      loadItemsForSource: async () => { throw new Error("安装来源未保存或不可用；请先在工具商城保存外部来源再安装"); },
    });
  } catch {
    unsavedSourceRejected = true;
  }
  const sourceBoundUpdateResolved = await resolveMarketplaceItemForInstall({
    type: "mcp",
    name: "source-bound-mcp",
    source: authSource,
    command: "node",
    args: ["tampered-update.js"],
  }, "update", {
    loadInstallations: () => [buildMarketplaceInstallationRecord(sourceBoundCatalogItem, "old", "", undefined, now)],
    loadItemsForSource: async () => [{ ...sourceBoundCatalogItem, version: "1.1.0", args: ["trusted-update.js"] }],
  });
  const installE2E = await runMarketplaceInstallE2ESelfTest();
  const checks = {
    versionComparisonWorks: compareVersions("2.1.0", "2.0.9") > 0 && compareVersions("1.0.0", "1.0.0") === 0,
    privateAddressProtectionWorks: isPrivateAddress("127.0.0.1") && isPrivateAddress("192.168.1.5") && !isPrivateAddress("8.8.8.8"),
    invalidCatalogEntryRejected: invalidRejected,
    skillFrontmatterParsed: parsedSkill.name === "release-notes" && parsedSkill.description === "Produce release notes",
    claudePluginMarketplaceMcpConverted: claudeCatalogMcp?.command === "node"
      && claudeCatalogMcp?.args?.[0] === "github-mcp.js"
      && claudeCatalogMcp?.source?.label.includes("Claude Plugin"),
    claudePluginMarketplaceSkillConverted: claudeCatalogSkill?.sourceUrl === "https://github.com/example/claude-market/tree/main/plugins/release-tools/skills/release-notes"
      && claudeCatalogSkill?.source?.label.includes("Claude Plugin"),
    bundledFeishuPathResolved: !!feishu?.args?.[0] && fs.existsSync(feishu.args[0]),
    filesystemMcpUsesManagedSharedRoot: filesystem?.args?.[2] === path.join(CCM_DIR, "shared") && fs.existsSync(filesystem.args[2]),
    localItemsCarryOfficialTrust: localItems.every(item => item.source?.trust === "official"),
    savedSourceIdIsStable: savedSource?.id === marketplaceSourceId("https://example.com/catalog.json"),
    externalSourceKeepsCommunityTrust: savedSource?.trust === "community",
    externalSourceCannotClaimOfficialTrust: officialSource?.trust === "custom",
    plainHttpSourceRejected: httpSource === null,
    installedMcpEntersAuthorizationOptions: authorizationOptions.mcp[0]?.grant === "github-search"
      && authorizationOptions.mcp[0]?.tools?.[0]?.grant === "github-search/searchRepos",
    installedSkillEntersAuthorizationOptions: authorizationOptions.skill[0]?.grant === "market-release-notes"
      && authorizationOptions.skill[0]?.toolName === "skill:market-release-notes",
    marketplaceMetadataPreservedForAuthorization: authorizationOptions.mcp[0]?.marketplace?.itemId === authMcpItem.id
      && authorizationOptions.skill[0]?.marketplace?.itemId === authSkillItem.id,
    authorizationOptionsHideInstallSecrets: !("command" in authorizationOptions.mcp[0])
      && !("env" in authorizationOptions.mcp[0])
      && !("prompt" in authorizationOptions.skill[0]),
    installationRecordUsesStableKey: installRecord.key === "mcp:github-search" && installRecord.installedAt === now,
    marketplacePreviewReturnsSourceProof: authMcpPreview.preview?.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
      && authSkillPreview.preview?.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
      && !!authMcpPreview.preview?.sourceProof?.materialHash
      && !!authSkillPreview.preview?.sourceProof?.materialHash,
    marketplaceInstallationRecordCarriesSourceProof: installRecord.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
      && installRecord.sourceProof?.name === "github-search",
    sourceProofHidesSecretValues: !JSON.stringify(authMcpPreview.preview?.sourceProof || {}).includes("secret")
      && !JSON.stringify(installRecord.sourceProof || {}).includes("secret"),
    marketplacePreviewHidesSecretValues: !JSON.stringify(authMcpPreview).includes("secret"),
    sourceBoundInstallUsesCatalogMaterial: sourceBoundResolved.args?.[0] === "trusted-server.js",
    sourceBoundInstallRejectsUnsavedSource: unsavedSourceRejected,
    sourceBoundUpdateUsesCatalogMaterial: sourceBoundUpdateResolved.version === "1.1.0" && sourceBoundUpdateResolved.args?.[0] === "trusted-update.js",
    onlineMarketplaceQueryIsSanitized: cleanMarketplaceQuery("  react\n\ttesting  ") === "react testing",
    onlineMarketplacePaginationIsBounded: normalizeMarketplaceListOptions({ page: -4, pageSize: 500 }).page === 1
      && normalizeMarketplaceListOptions({ page: -4, pageSize: 500 }).pageSize === MAX_MARKETPLACE_PAGE_SIZE,
    skillsShIdentityIsSourceBound: skillsShRegistryIdFromItemId("skills-sh:vercel-labs/agent-skills/web-design-guidelines") === "vercel-labs/agent-skills/web-design-guidelines",
    smitheryIdentityIsSourceBound: smitheryQualifiedNameFromItemId("smithery:upstash/context7-mcp") === "upstash/context7-mcp",
    anonymousSourceStatusHidesCredentials: marketplaceSourceStatus({ id: "smithery", label: "Smithery", kind: "smithery", trust: "community" }).anonymous === true
      && !JSON.stringify(marketplaceSourceStatus({ id: "smithery", label: "Smithery", kind: "smithery", trust: "community" })).toLowerCase().includes("token"),
    marketplaceInstallE2E: installE2E.pass,
  };
  return { pass: Object.values(checks).every(Boolean), checks, localItems, authorizationOptions, installE2E };
}

function cleanMarketplaceQuery(value: any, maxLength = 120) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function marketplacePageNumber(value: any, fallback = 1) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeMarketplaceListOptions(options: MarketplaceListOptions = {}): Required<Omit<MarketplaceListOptions, "requestedItem">> & { requestedItem?: any } {
  return {
    query: cleanMarketplaceQuery(options.query),
    page: marketplacePageNumber(options.page, 1),
    pageSize: Math.min(MAX_MARKETPLACE_PAGE_SIZE, marketplacePageNumber(options.pageSize, DEFAULT_MARKETPLACE_PAGE_SIZE)),
    category: cleanMarketplaceQuery(options.category || "all", 40).toLowerCase() || "all",
    sort: ["relevance", "popular", "name"].includes(String(options.sort || "")) ? String(options.sort) : "popular",
    requestedItem: options.requestedItem,
  };
}

function marketplacePagination(page: number, pageSize: number, total: number, totalPages?: number) {
  const pages = Math.max(1, Number(totalPages || Math.ceil(total / pageSize) || 1));
  return {
    schema: "ccm-marketplace-pagination-v1",
    page,
    pageSize,
    total,
    totalPages: pages,
    hasPrevious: page > 1,
    hasNext: page < pages,
  };
}

function marketplaceSourceStatus(source: MarketplaceSource, input: any = {}) {
  return {
    schema: "ccm-marketplace-source-status-v1",
    id: source.id,
    label: source.label,
    online: input.online !== false,
    anonymous: input.anonymous !== false,
    authenticated: !!input.authenticated,
    upstream: cleanMarketplaceQuery(input.upstream || source.url || "", 300),
    resultLimited: !!input.resultLimited,
    message: cleanMarketplaceQuery(input.message || "", 300),
  };
}

function sortRegistryItems(items: any[], sort: string) {
  const next = [...items];
  if (sort === "name") return next.sort((left, right) => String(left.displayName || left.name).localeCompare(String(right.displayName || right.name)));
  if (sort === "popular") return next.sort((left, right) => Number(right.registryUsage || 0) - Number(left.registryUsage || 0));
  return next;
}

function friendlyRegistryError(label: string, error: any) {
  const message = String(error?.message || error || "");
  if (/HTTP 429/i.test(message)) return new Error(`${label} 请求过于频繁，请稍后重试`);
  if (/超时/i.test(message)) return new Error(`${label} 响应超时，请稍后重试`);
  return new Error(`${label} 暂时不可用：${message || "未知上游错误"}`);
}

const SKILLS_SH_CATEGORY_QUERIES: Record<string, string> = {
  development: "development",
  design: "design",
  data: "data analysis",
  writing: "writing",
  productivity: "productivity",
};

function skillsShRegistryIdFromItemId(value: any) {
  const id = String(value || "");
  return id.startsWith("skills-sh:") ? id.slice("skills-sh:".length) : "";
}

async function loadSkillsShItems(rawOptions: MarketplaceListOptions = {}) {
  const options = normalizeMarketplaceListOptions(rawOptions);
  const requestedRegistryId = skillsShRegistryIdFromItemId(options.requestedItem?.id);
  const requestedName = cleanMarketplaceQuery(options.requestedItem?.name || requestedRegistryId.split("/").pop() || "");
  const categoryQuery = SKILLS_SH_CATEGORY_QUERIES[options.category] || "";
  const appliedQuery = options.query || requestedName || categoryQuery || "agent";
  if (appliedQuery.length < 2) throw new Error("Skills.sh 搜索词至少需要 2 个字符");
  const params = new URLSearchParams({ q: appliedQuery, limit: "100" });
  let parsed: any;
  try {
    const remote = await fetchRemote(`${SKILLS_SH_SEARCH_URL}?${params.toString()}`, MAX_CATALOG_BYTES);
    parsed = JSON.parse(remote.body.toString("utf-8"));
  } catch (error) {
    throw friendlyRegistryError("Skills.sh", error);
  }
  const source: MarketplaceSource = { id: "skills-sh", label: "Skills.sh", kind: "skills-sh", url: "https://skills.sh", trust: "community" };
  const rawSkills = Array.isArray(parsed?.skills) ? parsed.skills : [];
  const normalized = rawSkills.map((skill: any) => {
    const registryId = cleanMarketplaceQuery(skill?.id, 260);
    const repository = cleanMarketplaceQuery(skill?.source, 180);
    const skillName = cleanMarketplaceQuery(skill?.skillId || skill?.name || registryId.split("/").pop(), 120);
    if (!registryId || !repository || !skillName || !githubRepoFromUrlOrShorthand(repository)) return null;
    return normalizeMarketplaceItem({
      id: `skills-sh:${registryId}`,
      name: skillName,
      displayName: skillName,
      registryId,
      type: "skill",
      description: `来自 ${repository} 的 Agent Skill`,
      author: repository.split("/")[0] || "Skills.sh",
      version: "0.0.0",
      sourceUrl: `https://github.com/${repository}`,
      homepage: `https://skills.sh/${registryId}`,
      registryUsage: Number(skill?.installs || 0),
      installs: Number(skill?.installs || 0),
      category: options.category,
    }, source);
  }).filter(Boolean);
  const exact = requestedRegistryId ? normalized.filter((item: any) => item.registryId === requestedRegistryId) : normalized;
  const sorted = sortRegistryItems(exact, options.sort);
  const total = sorted.length;
  const start = (options.page - 1) * options.pageSize;
  const items = sorted.slice(start, start + options.pageSize);
  return {
    needKey: false,
    items,
    pagination: marketplacePagination(options.page, options.pageSize, total),
    query: { text: options.query, applied: appliedQuery, category: options.category, sort: options.sort, defaulted: !options.query && !categoryQuery && !requestedName },
    sourceStatus: marketplaceSourceStatus(source, {
      upstream: SKILLS_SH_SEARCH_URL,
      resultLimited: rawSkills.length >= 100,
      message: rawSkills.length >= 100 ? "Skills.sh 单次搜索最多返回 100 条结果，可继续缩小搜索词" : "已通过 Skills.sh 官方公开搜索接口加载",
    }),
  };
}

const SMITHERY_CATEGORY_QUERIES: Record<string, string> = {
  development: "developer",
  data: "data",
  automation: "automation",
  productivity: "productivity",
  communication: "communication",
};

function smitheryQualifiedNameFromItemId(value: any) {
  const id = String(value || "");
  return id.startsWith("smithery:") ? id.slice("smithery:".length) : "";
}

function smitheryRegistryUrl(qualifiedName: string) {
  return `https://smithery.ai/servers/${qualifiedName.split("/").map(encodeURIComponent).join("/")}`;
}

function smitheryGatewayUrl(qualifiedName: string) {
  return `https://server.smithery.ai/${qualifiedName.split("/").map(encodeURIComponent).join("/")}`;
}

function smitheryServerItem(server: any, source: MarketplaceSource) {
  const qualifiedName = cleanMarketplaceQuery(server?.qualifiedName || server?.name || server?.slug, 180);
  if (!qualifiedName) return null;
  const connection = Array.isArray(server?.connections)
    ? server.connections.find((item: any) => item?.type === "http" && /^https:\/\//i.test(String(item?.deploymentUrl || "")))
    : null;
  const deploymentUrl = cleanMarketplaceQuery(server?.deploymentUrl || connection?.deploymentUrl || "", 500);
  const owner = typeof server?.owner === "string"
    ? server.owner
    : (server?.owner?.displayName || server?.owner?.name || server?.namespace || "Smithery");
  return normalizeMarketplaceItem({
    id: `smithery:${qualifiedName}`,
    name: safeSlug(qualifiedName.replace(/\//g, "--")),
    displayName: cleanMarketplaceQuery(server?.displayName || qualifiedName, 120),
    qualifiedName,
    type: "mcp",
    description: server?.description || server?.summary || "",
    url: deploymentUrl || smitheryGatewayUrl(qualifiedName),
    author: owner,
    version: String(server?.version || "0.0.0"),
    homepage: server?.homepage || smitheryRegistryUrl(qualifiedName),
    sourceUrl: smitheryRegistryUrl(qualifiedName),
    registryUsage: Number(server?.useCount || 0),
    useCount: Number(server?.useCount || 0),
    verified: server?.verified === true,
    remote: server?.remote !== false,
    deployed: server?.isDeployed !== false,
    iconUrl: /^https:\/\//i.test(String(server?.iconUrl || "")) ? String(server.iconUrl) : "",
  }, source);
}

async function loadSmitheryItems(rawOptions: MarketplaceListOptions = {}) {
  const options = normalizeMarketplaceListOptions(rawOptions);
  const source: MarketplaceSource = { id: "smithery", label: "Smithery", kind: "smithery", url: "https://smithery.ai", trust: "community" };
  const requestedQualifiedName = smitheryQualifiedNameFromItemId(options.requestedItem?.id);
  if (requestedQualifiedName) {
    try {
      const pathName = requestedQualifiedName.split("/").map(encodeURIComponent).join("/");
      const remote = await fetchRemote(`${SMITHERY_SERVERS_URL}/${pathName}`, MAX_CATALOG_BYTES);
      const detail = JSON.parse(remote.body.toString("utf-8"));
      const item = smitheryServerItem(detail, source);
      return {
        needKey: false,
        items: item ? [item] : [],
        pagination: marketplacePagination(1, 1, item ? 1 : 0),
        query: { text: requestedQualifiedName, applied: requestedQualifiedName, category: "all", sort: "relevance", defaulted: false },
        sourceStatus: marketplaceSourceStatus(source, { upstream: SMITHERY_SERVERS_URL, message: "已从 Smithery 官方详情接口复验安装材料" }),
      };
    } catch (error) {
      throw friendlyRegistryError("Smithery", error);
    }
  }
  const categoryQuery = SMITHERY_CATEGORY_QUERIES[options.category] || "";
  const appliedQuery = options.query || categoryQuery;
  const params = new URLSearchParams({ page: String(options.page), pageSize: String(options.pageSize) });
  if (appliedQuery) params.set("q", appliedQuery);
  let parsed: any;
  try {
    const remote = await fetchRemote(`${SMITHERY_SERVERS_URL}?${params.toString()}`, MAX_CATALOG_BYTES);
    parsed = JSON.parse(remote.body.toString("utf-8"));
  } catch (error) {
    throw friendlyRegistryError("Smithery", error);
  }
  const servers = Array.isArray(parsed) ? parsed : (parsed?.servers || parsed?.data || parsed?.items || []);
  const items = sortRegistryItems(servers.map((server: any) => smitheryServerItem(server, source)).filter(Boolean), options.sort);
  const upstreamPagination = parsed?.pagination || {};
  const total = Number(upstreamPagination.totalCount || items.length);
  const totalPages = Number(upstreamPagination.totalPages || Math.ceil(total / options.pageSize) || 1);
  return {
    needKey: false,
    items,
    pagination: marketplacePagination(options.page, options.pageSize, total, totalPages),
    query: { text: options.query, applied: appliedQuery, category: options.category, sort: options.sort, defaulted: !options.query && !categoryQuery },
    sourceStatus: marketplaceSourceStatus(source, { upstream: SMITHERY_SERVERS_URL, message: "匿名访问 Smithery 官方注册表，无需配置 API Key" }),
  };
}

async function loadCatalogItems(url: string, source: MarketplaceSource) {
  const github = parseGithubSkillSource(url);
  if (github) {
    const name = path.posix.basename(github.subpath || github.repository) || "github-skill";
    return [normalizeMarketplaceItem({
      name,
      type: "skill",
      description: `Skill package from ${github.repository}`,
      sourceUrl: url,
      homepage: github.repository,
      version: "0.0.0",
    }, { ...source, kind: "github" })];
  }
  const remote = await fetchRemote(url, MAX_CATALOG_BYTES);
  const text = remote.body.toString("utf-8");
  try {
    const parsed = JSON.parse(text);
    return catalogItemsFromParsedJson(parsed, { ...source, url: remote.finalUrl }, remote.finalUrl);
  } catch {
    const skill = parseSkillMarkdown(text, path.basename(new URL(remote.finalUrl).pathname, ".md") || "external-skill", "");
    if (!skill.name) throw new Error("外部来源既不是商城 JSON，也不是有效 SKILL.md");
    return [normalizeMarketplaceItem({
      name: skill.name,
      type: "skill",
      description: skill.description,
      downloadUrl: remote.finalUrl,
      sourceUrl: remote.finalUrl,
      version: "0.0.0",
    }, { ...source, kind: "direct", url: remote.finalUrl })];
  }
}

async function loadMarketplaceItemsForSource(source: MarketplaceSource, requestedItem: any = null): Promise<any[]> {
  const sourceId = String(source?.id || "");
  const baseSourceId = baseMarketplaceSourceId(sourceId);
  if (baseSourceId === "ccm-official" || source.kind === "builtin") return localMarketplaceItems();
  if (baseSourceId === "skills-sh" || source.kind === "skills-sh") {
    const result = await loadSkillsShItems({ requestedItem, page: 1, pageSize: 100, sort: "relevance" });
    return result.items;
  }
  if (baseSourceId === "smithery" || source.kind === "smithery") {
    const result = await loadSmitheryItems({ requestedItem, page: 1, pageSize: 50, sort: "relevance" });
    return result.items;
  }
  if (baseSourceId === "ccm-community") {
    return loadCatalogItems(CCM_COMMUNITY_CATALOG_URL, {
      id: "ccm-community",
      label: "CCM Community",
      kind: "catalog",
      url: CCM_COMMUNITY_CATALOG_URL,
      trust: "community",
    });
  }
  const savedSource = publicMarketplaceSources().find(item => item.id === baseSourceId);
  if (savedSource?.url) return loadCatalogItems(savedSource.url, savedSource);
  throw new Error("安装来源未保存或不可用；请先在工具商城保存外部来源再安装");
}

function marketplaceItemIdentity(item: any) {
  return {
    id: String(item?.id || ""),
    type: String(item?.type || "").toLowerCase(),
    name: String(item?.name || "").trim().toLowerCase(),
  };
}

function findMarketplaceItemMatch(items: any[], requested: any) {
  const request = marketplaceItemIdentity(requested);
  return items.find(item => {
    const candidate = marketplaceItemIdentity(item);
    return candidate.type === request.type && request.id && candidate.id === request.id;
  }) || items.find(item => {
    const candidate = marketplaceItemIdentity(item);
    return candidate.type === request.type && candidate.name === request.name;
  }) || null;
}

async function resolveMarketplaceItemForInstall(rawItem: any, mode: "install" | "update" = "install", options: any = {}) {
  const requested = normalizeMarketplaceInstallRequest(rawItem, { id: "custom", label: "Custom source", kind: "direct", trust: "custom" });
  const loadRecords = options.loadInstallations || loadInstallations;
  const previous = loadRecords().find((entry: InstallationRecord) => entry.key === installationKey(requested.type, requested.name));
  if (mode === "update" && !previous) throw new Error(`"${requested.name}" 尚未安装，不能执行更新`);
  const source = requested.source?.id ? requested.source : previous?.source;
  if (!source?.id) throw new Error("商城安装缺少来源标识，已拒绝未绑定来源的安装请求");
  const loadItemsForSource = options.loadItemsForSource || loadMarketplaceItemsForSource;
  const sourceItems = await loadItemsForSource(source, requested);
  const normalizedItems = (Array.isArray(sourceItems) ? sourceItems : [])
    .map((item: any) => normalizeMarketplaceItem(item, source))
    .filter((item: any) => baseMarketplaceSourceId(item.source?.id) === baseMarketplaceSourceId(source.id));
  const canonical = findMarketplaceItemMatch(normalizedItems, requested);
  if (!canonical) {
    throw new Error(`来源 ${source.label || source.id} 中未找到 ${requested.type}:${requested.name}，已拒绝安装`);
  }
  return canonical;
}

async function saveMarketplaceSource(payload: any) {
  const url = String(payload?.url || payload?.sourceUrl || "").trim();
  if (!url) throw new Error("外部来源 URL 不能为空");
  const parsed = await assertSafeHttpsUrl(url);
  const now = new Date().toISOString();
  const source = normalizeSavedSource({
    id: marketplaceSourceId(parsed.toString()),
    label: payload?.label || parsed.hostname,
    url: parsed.toString(),
    trust: payload?.trust,
    createdAt: now,
    updatedAt: now,
    enabled: true,
  });
  if (!source) throw new Error("外部来源配置无效");
  const items = await loadCatalogItems(source.url || "", source);
  const sources = loadMarketplaceSources();
  const previous = sources.find(item => item.id === source.id);
  const record = {
    ...source,
    createdAt: previous?.createdAt || source.createdAt,
    updatedAt: now,
  };
  saveMarketplaceSources([...sources.filter(item => item.id !== record.id), record]);
  return { source: record, itemCount: items.length };
}

function deleteMarketplaceSource(payload: any) {
  const id = String(payload?.id || "").trim();
  if (!id) throw new Error("外部来源 ID 不能为空");
  const sources = loadMarketplaceSources();
  const next = sources.filter(item => item.id !== id);
  saveMarketplaceSources(next);
  return { id, removed: next.length !== sources.length };
}

async function previewMarketplaceItem(rawItem: any) {
  const rawSourceId = baseMarketplaceSourceId(rawItem?.source?.id);
  const item = ["skills-sh", "smithery", "ccm-official", "ccm-community"].includes(rawSourceId)
    ? await resolveMarketplaceItemForInstall(rawItem, "install")
    : normalizeMarketplaceItem(rawItem, { id: "custom", label: "Custom source", kind: "direct", trust: "custom" });
  const sourceProof = buildMarketplaceSourceProof(item);
  if (item.type === "mcp") {
    const envKeys = item.env && typeof item.env === "object"
      ? Object.keys(item.env)
      : String(item.env || "").split(/\r?\n/).map((line: string) => line.split("=")[0]?.trim()).filter(Boolean);
    return {
      item: sanitizeMarketplacePreviewItem(item),
      preview: {
        transport: item.url ? "http" : "stdio",
        executable: item.command || "",
        args: item.args || [],
        url: item.url || "",
        envKeys,
        trust: item.source.trust,
        sourceProof,
      },
    };
  }
  if (item.prompt) {
    const parsed = parseSkillMarkdown(item.prompt, item.name, item.description);
    return { item: sanitizeMarketplacePreviewItem(item), preview: { name: parsed.name, description: parsed.description, content: parsed.content.slice(0, 20000), packageBacked: false, trust: item.source.trust, sourceProof } };
  }
  if (item.downloadUrl && !parseGithubSkillSource(item.downloadUrl)) {
    const remote = await fetchRemote(item.downloadUrl, MAX_SKILL_FILE_BYTES);
    const parsed = parseSkillMarkdown(remote.body.toString("utf-8"), item.name, item.description);
    return { item: sanitizeMarketplacePreviewItem(item), preview: { name: parsed.name, description: parsed.description, content: parsed.content.slice(0, 20000), packageBacked: false, trust: item.source.trust, sourceProof: buildMarketplaceSourceProof(item, { checksum: sha256(remote.body) }) } };
  }
  if (parseGithubSkillSource(item.sourceUrl || item.downloadUrl)) {
    const staging = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-skill-preview-"));
    try {
      await cloneGithubSkill(item, staging);
      const packageStats = validateSkillDirectory(staging);
      const content = fs.readFileSync(path.join(staging, "SKILL.md"), "utf-8");
      const parsed = parseSkillMarkdown(content, item.name, item.description);
      return {
        item: sanitizeMarketplacePreviewItem(item),
        preview: {
          name: parsed.name,
          description: parsed.description,
          content: parsed.content.slice(0, 20000),
          sourceUrl: item.sourceUrl,
          packageBacked: true,
          packageStats,
          trust: item.source.trust,
          sourceProof: buildMarketplaceSourceProof(item, { checksum: sha256(content), packageStats }),
          note: "已从 GitHub 拉取并校验 Skill 包；安装时仍会重新复验来源与内容限制。",
        },
      };
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  }
  return {
    item: sanitizeMarketplacePreviewItem(item),
    preview: {
      name: item.name,
      description: item.description,
      sourceUrl: item.sourceUrl,
      packageBacked: true,
      trust: item.source.trust,
      sourceProof,
      note: "GitHub package will be cloned and validated during installation.",
    },
  };
}

function buildMarketplaceMcpToolRecord(item: any, now: string) {
  return {
    name: item.name,
    type: "mcp",
    description: item.description,
    command: item.command,
    args: item.args,
    url: item.url,
    headers: item.headers && typeof item.headers === "object" ? item.headers : undefined,
    env: item.env || "",
    enabled: true,
    version: item.version,
    author: item.author,
    marketplace: { source: item.source, itemId: item.id, homepage: item.homepage || item.sourceUrl || "" },
    updated_at: now,
  };
}

function buildMarketplaceSkillRecord(item: any, staged: any, packagePath: string, checksum: string, now: string) {
  return {
    name: item.name,
    type: "skill",
    description: item.description || staged.parsed.description,
    prompt: staged.parsed.prompt,
    enabled: true,
    version: item.version,
    author: item.author,
    packagePath,
    skillFile: path.join(packagePath, "SKILL.md"),
    packageStats: staged.packageStats,
    contentHash: checksum.slice(0, 16),
    origin: "external",
    scope: "external",
    sourceType: "marketplace",
    immutable: false,
    deletable: true,
    editable: true,
    disableable: true,
    systemManaged: false,
    roleSkill: false,
    marketplace: { source: item.source, itemId: item.id, homepage: item.homepage || item.sourceUrl || "" },
    updated_at: now,
  };
}

function buildMarketplaceInstallationRecord(
  item: any,
  checksum: string,
  packagePath: string,
  previous: InstallationRecord | undefined,
  now: string,
  sourceProof: any = null,
): InstallationRecord {
  return {
    key: installationKey(item.type, item.name),
    name: item.name,
    type: item.type,
    version: item.version,
    checksum,
    source: item.source,
    sourceProof: sourceProof ? sanitizeMarketplaceSourceProof(sourceProof) : buildMarketplaceSourceProof(item, { checksum }),
    packagePath: packagePath || undefined,
    installedAt: previous?.installedAt || now,
    updatedAt: now,
  };
}

function readJsonObject(file: string) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function createFileBackedMarketplaceStore(root: string) {
  const mcpDir = path.join(root, "mcp");
  const skillsDir = path.join(root, "skills");
  const skillPackagesDir = path.join(root, "skill-packages");
  const installationsFile = path.join(root, "marketplace", "installations.json");
  const auditFile = path.join(root, "marketplace", "operations.jsonl");
  let reloads = 0;
  const filenameFor = (name: string) => `${safeSlug(name)}.json`;
  const loadJsonDir = (dir: string) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(file => file.endsWith(".json"))
      .map(file => readJsonObject(path.join(dir, file)))
      .filter(Boolean);
  };
  const store: MarketplaceInstallStore = {
    skillPackagesDir,
    loadInstallations: () => {
      const parsed = readJsonObject(installationsFile);
      return Array.isArray(parsed?.items) ? parsed.items : [];
    },
    saveInstallations: items => writeJsonAtomic(installationsFile, { version: 1, items }),
    saveMcpTool: tool => writeJsonAtomic(path.join(mcpDir, filenameFor(tool.name)), tool),
    saveSkill: skill => writeJsonAtomic(path.join(skillsDir, filenameFor(skill.name)), skill),
    deleteMcpTool: name => {
      const file = path.join(mcpDir, filenameFor(name));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    },
    deleteSkill: name => {
      const file = path.join(skillsDir, filenameFor(name));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    },
    reloadTools: () => { reloads += 1; },
    appendAudit: entry => appendJsonlBounded(auditFile, entry),
    loadAudit: () => fs.existsSync(auditFile)
      ? fs.readFileSync(auditFile, "utf-8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
      : [],
    loadMcpTools: () => loadJsonDir(mcpDir),
    loadSkills: () => loadJsonDir(skillsDir),
  };
  return {
    store,
    mcpDir,
    skillsDir,
    skillPackagesDir,
    auditFile,
    loadMcpTools: () => loadJsonDir(mcpDir),
    loadSkills: () => loadJsonDir(skillsDir),
    loadInstallations: () => store.loadInstallations ? store.loadInstallations() : [],
    loadAudit: () => fs.existsSync(auditFile)
      ? fs.readFileSync(auditFile, "utf-8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
      : [],
    reloadCount: () => reloads,
  };
}

async function runMarketplaceInstallE2ESelfTest() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-marketplace-install-"));
  try {
    const fixture = createFileBackedMarketplaceStore(tempRoot);
    let fixtureRuntimeAudits: any[] = [];
    const withCurrentCatalogRevision = (audit: any) => {
      if (!audit?.__freshMarketplaceCatalog) return audit;
      const next = { ...audit };
      delete next.__freshMarketplaceCatalog;
      const readiness = probeRuntimeToolReadiness(next, {
        record: false,
        catalog: buildMarketplaceRuntimeCatalog(fixture.store),
      });
      return { ...next, catalogRevision: readiness.currentCatalogRevision };
    };
    fixture.store.loadRuntimeAudits = () => fixtureRuntimeAudits.map(withCurrentCatalogRevision);
    const source: MarketplaceSource = { id: "e2e-catalog", label: "E2E Catalog", kind: "catalog", url: "https://example.com/catalog.json", trust: "community" };
    const mcpItem = normalizeMarketplaceItem({
      name: "e2e-market-mcp",
      type: "mcp",
      description: "Temporary E2E MCP",
      command: "node",
      args: ["server.js"],
      env: "TOKEN=secret",
      version: "1.0.0",
      author: "E2E",
    }, source);
    const skillItem = normalizeMarketplaceItem({
      name: "e2e-market-skill",
      type: "skill",
      description: "Temporary E2E Skill",
      prompt: "---\nname: e2e-market-skill\ndescription: Temporary E2E Skill\n---\n\nSummarize the installed marketplace tool.",
      version: "1.0.0",
      author: "E2E",
    }, source);
    fixture.store.loadProjectConfigs = () => ({
      "C:\\demo\\marketplace-project": {
        name: "Marketplace Project",
        tools: { mcp: ["e2e-market-mcp/invoke"], skill: ["e2e-market-skill"] },
      },
      "C:\\demo\\unrelated-project": {
        name: "Unrelated Project",
        tools: { mcp: ["unrelated-mcp"], skill: ["unrelated-skill"] },
      },
    });
    fixture.store.loadGroups = () => [
      {
        id: "group-marketplace",
        name: "Marketplace Group",
        tools: { mcp: ["mcp__ccm__e2e-market-mcp__invoke"], skill: ["e2e-market-skill"] },
      },
      {
        id: "group-unrelated",
        name: "Unrelated Group",
        tools: { mcp: ["unrelated-mcp"], skill: ["unrelated-skill"] },
      },
    ];
    let updateMissingRejected = false;
    try {
      await installMarketplaceItemWithStore(mcpItem, fixture.store, "update");
    } catch {
      updateMissingRejected = true;
    }

    await installMarketplaceItemWithStore(mcpItem, fixture.store);
    await installMarketplaceItemWithStore(skillItem, fixture.store);
    const preUpdateRuntimeWorkDir = path.join(tempRoot, "runtime-work-before-update");
    fs.mkdirSync(preUpdateRuntimeWorkDir, { recursive: true });
    const preUpdateRuntimeAudit = syncRuntimeToolsWithCatalog(
      preUpdateRuntimeWorkDir,
      "codex",
      { mcp: ["e2e-market-mcp"], skill: ["e2e-market-skill"] },
      {
        mcpTools: fixture.loadMcpTools(),
        skills: fixture.loadSkills(),
        skillPackagesDir: fixture.skillPackagesDir,
        runtimeStorageRoot: path.join(tempRoot, "agent-runtime-before-update"),
        codexGateway: {
          apiUrl: "https://gateway.example.test/v1",
          apiKey: "marketplace-runtime-secret-must-not-persist",
          model: "test-model",
        },
      },
    );
    const blockedFreshRuntimeWorkDir = path.join(tempRoot, "runtime-work-fresh-blocked");
    fs.mkdirSync(blockedFreshRuntimeWorkDir, { recursive: true });
    const blockedFreshReadiness = {
      schema: "ccm-tool-authorization-readiness-v1",
      dispatchReady: false,
      status: "needs_attention",
      requested: { mcp: 1, skill: 1 },
      available: { mcp: 0, skill: 0 },
      missing: { missing_mcp_servers: 0, missing_mcp_tools: 1, missing_skills: 1 },
      invalid_mcp_grants: 0,
      unavailable: {
        mcp: [{ raw: "e2e-market-mcp/missingTool", server: "e2e-market-mcp", tool: "missingTool", state: "missing_tool" }],
        skill: [{ name: "e2e-market-skill", state: "missing" }],
      },
    };
    const blockedFreshRuntimeAudit = syncRuntimeToolsWithCatalog(
      blockedFreshRuntimeWorkDir,
      "codex",
      { mcp: ["e2e-market-mcp"], skill: ["e2e-market-skill"] },
      {
        mcpTools: fixture.loadMcpTools(),
        skills: fixture.loadSkills(),
        skillPackagesDir: fixture.skillPackagesDir,
        runtimeStorageRoot: path.join(tempRoot, "agent-runtime-fresh-blocked"),
        codexGateway: {
          apiUrl: "https://gateway.example.test/v1",
          apiKey: "marketplace-runtime-secret-must-not-persist",
          model: "test-model",
        },
      },
      { authorizationReadiness: blockedFreshReadiness },
    );
    const blockedFreshRuntimeFixture = blockedFreshRuntimeAudit as any;
    blockedFreshRuntimeFixture.projectName = "marketplace-fresh-blocked-project";
    blockedFreshRuntimeFixture.groupId = "marketplace-fresh-blocked-group";
    blockedFreshRuntimeFixture.__freshMarketplaceCatalog = true;
    fixtureRuntimeAudits = [preUpdateRuntimeAudit, blockedFreshRuntimeAudit];
    const mcpUpdate = normalizeMarketplaceItem({
      ...mcpItem,
      args: ["server-v2.js"],
      version: "1.1.0",
    }, source);
    const skillUpdate = normalizeMarketplaceItem({
      ...skillItem,
      prompt: "---\nname: e2e-market-skill\ndescription: Temporary E2E Skill\n---\n\nSummarize the updated marketplace tool.",
      version: "1.1.0",
    }, source);
    const mcpPreflightImpact = previewMarketplaceAuthorizationImpact({ type: "mcp", name: "e2e-market-mcp", action: "update" }, fixture.store).authorizationImpact;
    const skillPreflightImpact = previewMarketplaceAuthorizationImpact({ type: "skill", name: "e2e-market-skill", action: "uninstall" }, fixture.store).authorizationImpact;
    const mcpUpdateResult = await installMarketplaceItemWithStore(mcpUpdate, fixture.store, "update", { autoResync: true });
    fixtureRuntimeAudits = [preUpdateRuntimeAudit];
    const skillUpdateResult = await installMarketplaceItemWithStore(skillUpdate, fixture.store, "update", { autoResync: true });

    const installedMcp = fixture.loadMcpTools();
    const installedSkills = fixture.loadSkills();
    const records = fixture.loadInstallations();
    const auditEntriesBeforeUninstall = fixture.loadAudit();
    const skillRecord = installedSkills.find((item: any) => item.name === "e2e-market-skill");
    const skillPackagePath = String(skillRecord?.packagePath || "");
    const skillPackageInstalledBeforeUninstall = !!skillPackagePath && fs.existsSync(path.join(skillPackagePath, "SKILL.md"));
    const authorizationOptions = buildToolAuthorizationOptions({
      mcpTools: installedMcp,
      skills: installedSkills,
      status: {
        mcp: [{ server: "e2e-market-mcp", name: "invoke", description: "Invoke E2E tool", schema: { type: "object" } }],
        servers: [{ name: "e2e-market-mcp", connected: true, state: "connected" }],
      },
    });
    const runtimeWorkDir = path.join(tempRoot, "runtime-work");
    fs.mkdirSync(runtimeWorkDir, { recursive: true });
    const runtimeAudit = syncRuntimeToolsWithCatalog(
      runtimeWorkDir,
      "codex",
      { mcp: ["e2e-market-mcp"], skill: ["e2e-market-skill"] },
      {
        mcpTools: installedMcp,
        skills: installedSkills,
        skillPackagesDir: fixture.skillPackagesDir,
        runtimeStorageRoot: path.join(tempRoot, "agent-runtime"),
        codexGateway: {
          apiUrl: "https://gateway.example.test/v1",
          apiKey: "marketplace-runtime-secret-must-not-persist",
          model: "test-model",
        },
      },
    );
    fixtureRuntimeAudits = [runtimeAudit];
    const runtimeConfigText = runtimeAudit.mcpConfigPath && fs.existsSync(runtimeAudit.mcpConfigPath)
      ? fs.readFileSync(runtimeAudit.mcpConfigPath, "utf-8")
      : "";
    const runtimeSkillStatus = (runtimeAudit.skill_statuses || []).find(item => item.name === "e2e-market-skill" && item.state === "synced");
    const runtimeSkillBody = runtimeSkillStatus?.skillPath && fs.existsSync(runtimeSkillStatus.skillPath)
      ? fs.readFileSync(runtimeSkillStatus.skillPath, "utf-8")
      : "";
    const runtimeSnapshot = runtimeAudit.snapshotPath ? readJsonObject(runtimeAudit.snapshotPath) : null;

    const uninstallMcpResult = await uninstallMarketplaceItemWithStore({ type: "mcp", name: "e2e-market-mcp" }, fixture.store, { autoResync: true });
    const uninstallSkillResult = await uninstallMarketplaceItemWithStore({ type: "skill", name: "e2e-market-skill" }, fixture.store, { autoResync: true });
    const auditEntries = fixture.loadAudit();
    const operationHistory = readMarketplaceOperationAudit({ limit: 4 }, fixture.store);

    const checks = {
      realMcpJsonPersisted: installedMcp.some((item: any) => item.name === "e2e-market-mcp" && item.marketplace?.itemId === mcpItem.id),
      realSkillJsonPersisted: installedSkills.some((item: any) => item.name === "e2e-market-skill" && item.marketplace?.itemId === skillItem.id),
      explicitUpdateRequiresExistingInstall: updateMissingRejected,
      marketplaceUpdatePersistsNewVersion: records.some(item => item.key === "mcp:e2e-market-mcp" && item.version === "1.1.0")
        && records.some(item => item.key === "skill:e2e-market-skill" && item.version === "1.1.0")
        && installedMcp.some((item: any) => item.name === "e2e-market-mcp" && item.args?.[0] === "server-v2.js")
        && installedSkills.some((item: any) => item.name === "e2e-market-skill" && item.prompt?.includes("updated marketplace tool"))
        && mcpUpdateResult.action === "update"
        && skillUpdateResult.action === "update",
      marketplaceOperationAuditRecordsInstallAndUpdate: auditEntriesBeforeUninstall.filter((entry: any) => entry.schema === "ccm-marketplace-operation-v1" && entry.action === "install").length === 2
        && auditEntriesBeforeUninstall.filter((entry: any) => entry.schema === "ccm-marketplace-operation-v1" && entry.action === "update").length === 2
        && auditEntriesBeforeUninstall.every((entry: any) => !JSON.stringify(entry).includes("TOKEN=secret")),
      marketplaceAuthorizationImpactPreflightWorks: mcpPreflightImpact.action === "update"
        && mcpPreflightImpact.summary.scopeCount === 2
        && mcpPreflightImpact.summary.mcpGrants === 2
        && skillPreflightImpact.action === "uninstall"
        && skillPreflightImpact.summary.scopeCount === 2
        && skillPreflightImpact.summary.skillGrants === 2,
      marketplaceUpdateReportsAuthorizationImpact: mcpUpdateResult.authorizationImpact?.summary?.projects === 1
        && mcpUpdateResult.authorizationImpact?.summary?.groups === 1
        && mcpUpdateResult.authorizationImpact?.summary?.mcpGrants === 2
        && skillUpdateResult.authorizationImpact?.summary?.projects === 1
        && skillUpdateResult.authorizationImpact?.summary?.groups === 1
        && skillUpdateResult.authorizationImpact?.summary?.skillGrants === 2,
      marketplaceUpdateReportsRuntimeImpact: mcpUpdateResult.runtimeImpact?.schema === "ccm-marketplace-runtime-impact-v1"
        && mcpUpdateResult.runtimeImpact?.summary?.runtimeSnapshots === 2
        && mcpUpdateResult.runtimeImpact?.summary?.catalogStale === 1
        && mcpUpdateResult.runtimeImpact?.summary?.dispatchBlocked === 1
        && mcpUpdateResult.runtimeImpact?.summary?.deliveryBlocked === 2
        && skillUpdateResult.runtimeImpact?.summary?.runtimeSnapshots === 1
        && skillUpdateResult.runtimeImpact?.summary?.catalogStale === 1,
      marketplaceUpdateReportsSourceProof: mcpUpdateResult.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
        && mcpUpdateResult.sourceProof?.materialKind === "stdio_mcp"
        && skillUpdateResult.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
        && skillUpdateResult.sourceProof?.materialKind === "inline_skill",
      marketplaceUpdateAutoResyncsRuntime: mcpUpdateResult.runtimeResync?.schema === "ccm-marketplace-runtime-resync-v1"
        && mcpUpdateResult.runtimeResync?.summary?.resynced === 2
        && mcpUpdateResult.runtimeResync?.items?.some((item: any) => item.before?.catalogStale === true && item.after?.catalogStale === false)
        && mcpUpdateResult.runtimeResync?.items?.some((item: any) => item.before?.catalogStale === false && item.before?.dispatchReady === false && item.action === "resynced")
        && !JSON.stringify(mcpUpdateResult.runtimeResync).includes(preUpdateRuntimeWorkDir),
      marketplaceImpactMatchesNativeMcpGrant: mcpUpdateResult.authorizationImpact?.scopes?.some((scope: any) => (
        scope.scope === "group" && scope.grants?.mcp?.includes("mcp__ccm__e2e-market-mcp__invoke")
      )),
      skillPackageInstalled: skillPackageInstalledBeforeUninstall,
      installationRecordsPersisted: records.some(item => item.key === "mcp:e2e-market-mcp")
        && records.some(item => item.key === "skill:e2e-market-skill"),
      installedResourcesReachAuthorizationOptions: authorizationOptions.mcp[0]?.grant === "e2e-market-mcp"
        && authorizationOptions.mcp[0]?.tools?.[0]?.grant === "e2e-market-mcp/invoke"
        && authorizationOptions.skill[0]?.grant === "e2e-market-skill",
      installedResourcesReachRuntimeSync: runtimeAudit.mode === "native-and-proxy"
        && runtimeAudit.errors.length === 0
        && runtimeConfigText.includes("ccm__e2e-market-mcp")
        && runtimeConfigText.includes("e2e-market-skill")
        && runtimeSkillStatus?.sourcePath === path.join(skillPackagePath, "SKILL.md")
        && runtimeSkillBody.includes("Summarize the updated marketplace tool.")
        && Array.isArray(runtimeSnapshot?.mcp_statuses)
        && runtimeSnapshot.mcp_statuses.some((item: any) => item.name === "e2e-market-mcp" && item.delivery === "native"),
      runtimeSyncDoesNotPersistGatewaySecret: !runtimeConfigText.includes("marketplace-runtime-secret-must-not-persist"),
      installHidesSecretsInAuthorizationOptions: !("command" in authorizationOptions.mcp[0])
        && !("env" in authorizationOptions.mcp[0])
        && !("prompt" in authorizationOptions.skill[0]),
      uninstallRemovesCatalogEntries: fixture.loadMcpTools().length === 0 && fixture.loadSkills().length === 0,
      uninstallRemovesSkillPackage: !!skillPackagePath && !fs.existsSync(skillPackagePath),
      uninstallRemovesInstallationRecords: fixture.loadInstallations().length === 0,
      uninstallOperationAuditRecorded: auditEntries.filter((entry: any) => entry.action === "uninstall").length === 2,
      uninstallReportsAffectedAuthorizations: uninstallMcpResult.authorizationImpact?.summary?.scopeCount === 2
        && uninstallMcpResult.authorizationImpact?.summary?.mcpGrants === 2
        && uninstallSkillResult.authorizationImpact?.summary?.scopeCount === 2
        && uninstallSkillResult.authorizationImpact?.summary?.skillGrants === 2,
      uninstallReportsRuntimeImpact: uninstallMcpResult.runtimeImpact?.summary?.runtimeSnapshots === 1
        && uninstallMcpResult.runtimeImpact?.summary?.catalogStale === 1
        && uninstallSkillResult.runtimeImpact?.summary?.runtimeSnapshots === 1
        && uninstallSkillResult.runtimeImpact?.summary?.catalogStale === 1,
      uninstallAutoResyncsRuntime: uninstallMcpResult.runtimeResync?.summary?.resynced === 1
        && uninstallSkillResult.runtimeResync?.summary?.resynced === 1
        && !JSON.stringify(uninstallMcpResult.runtimeResync).includes(runtimeWorkDir),
      marketplaceOperationAuditRecordsAuthorizationImpact: auditEntries.filter((entry: any) => entry.authorizationImpact?.schema === "ccm-marketplace-authorization-impact-v1").length === 6
        && auditEntries.some((entry: any) => entry.action === "uninstall" && entry.authorizationImpact?.summary?.scopeCount === 2)
        && auditEntries.every((entry: any) => !JSON.stringify(entry.authorizationImpact || {}).includes("TOKEN=secret"))
        && auditEntries.every((entry: any) => !JSON.stringify(entry.authorizationImpact || {}).includes("updated marketplace tool")),
      marketplaceOperationAuditRecordsRuntimeImpact: auditEntries.filter((entry: any) => entry.runtimeImpact?.schema === "ccm-marketplace-runtime-impact-v1").length === 6
        && auditEntries.some((entry: any) => entry.action === "uninstall" && entry.runtimeImpact?.summary?.catalogStale === 1)
        && auditEntries.every((entry: any) => !JSON.stringify(entry.runtimeImpact || {}).includes("TOKEN=secret")),
      marketplaceOperationAuditRecordsRuntimeResync: auditEntries.filter((entry: any) => entry.runtimeResync?.schema === "ccm-marketplace-runtime-resync-v1").length === 4
        && auditEntries.some((entry: any) => entry.action === "update" && entry.runtimeResync?.summary?.resynced === 1)
        && auditEntries.some((entry: any) => entry.action === "uninstall" && entry.runtimeResync?.summary?.resynced === 1)
        && auditEntries.every((entry: any) => !JSON.stringify(entry.runtimeResync || {}).includes("runtime-work")),
      marketplaceOperationAuditRecordsSourceProof: auditEntries.filter((entry: any) => entry.sourceProof?.schema === "ccm-marketplace-source-proof-v1").length === 6
        && auditEntries.some((entry: any) => entry.action === "uninstall" && entry.sourceProof?.name === "e2e-market-skill")
        && auditEntries.every((entry: any) => !JSON.stringify(entry.sourceProof || {}).includes("TOKEN=secret")),
      marketplaceOperationHistoryReadsRecentSanitizedEntries: operationHistory.schema === "ccm-marketplace-operations-v1"
        && operationHistory.items.length === 4
        && operationHistory.items[0]?.action === "uninstall"
        && operationHistory.items.some((entry: any) => entry.authorizationImpact?.schema === "ccm-marketplace-authorization-impact-v1")
        && operationHistory.items.some((entry: any) => entry.runtimeImpact?.schema === "ccm-marketplace-runtime-impact-v1")
        && operationHistory.items.some((entry: any) => entry.runtimeResync?.schema === "ccm-marketplace-runtime-resync-v1")
        && operationHistory.summary.impactedScopes >= 4
        && operationHistory.summary.impactedRuntimeSnapshots >= 4
        && operationHistory.summary.staleRuntimeSnapshots >= 4
        && operationHistory.summary.runtimeResynced >= 4
        && operationHistory.items.every((entry: any) => !JSON.stringify(entry).includes("TOKEN=secret"))
        && operationHistory.items.every((entry: any) => !JSON.stringify(entry).includes("updated marketplace tool")),
      marketplaceOperationHistoryIncludesSourceProof: operationHistory.items.some((entry: any) => entry.sourceProof?.schema === "ccm-marketplace-source-proof-v1")
        && operationHistory.items.every((entry: any) => !JSON.stringify(entry.sourceProof || {}).includes("TOKEN=secret")),
      reloadCalledForInstallUpdateAndUninstall: fixture.reloadCount() === 6,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  }
}

export async function installMarketplaceItemWithStore(rawItem: any, store: MarketplaceInstallStore = {}, mode: "install" | "update" = "install", options: any = {}) {
  const item = normalizeMarketplaceItem(rawItem, { id: "custom", label: "Custom source", kind: "direct", trust: "custom" });
  if (item.type === "skill") assertCcmInternalSkillMutable(item.name, mode === "update" ? "通过商城更新或覆盖" : "从商城安装或覆盖");
  if (item.type === "mcp" && isInternalMcpName(item.name)) throw new Error(`内部 MCP "${item.name}" 已随项目安装，不能通过商城覆盖`);
  const now = new Date().toISOString();
  let checksum = "";
  let packagePath = "";
  const skillPackagesDir = store.skillPackagesDir || SKILL_PACKAGES_DIR;
  const saveMcp = store.saveMcpTool || saveMcpTool;
  const saveInstalledSkill = store.saveSkill || saveSkill;
  const loadRecords = store.loadInstallations || loadInstallations;
  const saveRecords = store.saveInstallations || saveInstallations;
  const records = loadRecords();
  const key = installationKey(item.type, item.name);
  const previous = records.find(entry => entry.key === key);
  if (mode === "update" && !previous) throw new Error(`"${item.name}" 尚未安装，不能执行更新`);
  let sourceProof: any = null;

  if (item.type === "mcp") {
    if (item.url) await assertSafeHttpsUrl(item.url);
    const material = buildMarketplaceMcpToolRecord(item, now);
    checksum = sha256(JSON.stringify(material));
    sourceProof = buildMarketplaceSourceProof(item, { checksum });
    saveMcp(material);
  } else {
    const staged = await stageSkillPackage(item, skillPackagesDir);
    packagePath = installStagedPackage(staged.staging, item.name, skillPackagesDir);
    checksum = staged.checksum;
    sourceProof = buildMarketplaceSourceProof(item, { checksum, packageStats: staged.packageStats });
    saveInstalledSkill(buildMarketplaceSkillRecord(item, staged, packagePath, checksum, now));
  }

  const record = buildMarketplaceInstallationRecord(item, checksum, packagePath, previous, now, sourceProof);
  saveRecords([...records.filter(entry => entry.key !== key), record]);
  let toolManagerReloaded = false;
  if (store.reloadTools) await store.reloadTools();
  else await toolManager.loadTools();
  toolManagerReloaded = true;
  const action = previous ? "update" : "install";
  const authorizationImpact = buildMarketplaceAuthorizationImpact({ action, type: item.type, name: item.name }, store);
  let runtimeImpact = buildMarketplaceRuntimeImpact({ action, type: item.type, name: item.name }, store);
  const runtimeResync = maybeAutoResyncMarketplaceRuntime(runtimeImpact, options, store);
  if (runtimeResync?.summary?.resynced || runtimeResync?.summary?.created) {
    runtimeImpact = buildMarketplaceRuntimeImpact({ action, type: item.type, name: item.name }, store);
  }
  appendMarketplaceOperationAudit({
    action,
    key,
    type: item.type,
    name: item.name,
    source: item.source,
    previousVersion: previous?.version,
    version: record.version,
    previousChecksum: previous?.checksum,
    checksum: record.checksum,
    changed: !previous || previous.version !== record.version || previous.checksum !== record.checksum,
    packageManaged: item.type === "skill" && !!packagePath,
    toolManagerReloaded,
    authorizationImpact,
    runtimeImpact,
    runtimeResync,
    sourceProof,
  }, store);
  return { item, record, action, updated: action === "update", authorizationImpact, runtimeImpact, runtimeResync, sourceProof };
}

async function installMarketplaceItem(rawItem: any) {
  if (String(rawItem?.type || "").toLowerCase() === "skill") {
    assertCcmInternalSkillMutable(rawItem?.name, "从商城安装或覆盖");
  }
  const item = await resolveMarketplaceItemForInstall(rawItem, "install");
  const result = await installMarketplaceItemWithStore(item, {}, "install", { autoResync: rawItem?.autoResync });
  return { ...result, sourceVerified: true };
}

async function updateMarketplaceItem(rawItem: any) {
  if (String(rawItem?.type || "").toLowerCase() === "skill") {
    assertCcmInternalSkillMutable(rawItem?.name, "通过商城更新或覆盖");
  }
  const item = await resolveMarketplaceItemForInstall(rawItem, "update");
  const result = await installMarketplaceItemWithStore(item, {}, "update", { autoResync: rawItem?.autoResync });
  return { ...result, sourceVerified: true };
}

export async function uninstallMarketplaceItemWithStore(payload: any, store: MarketplaceInstallStore = {}, options: any = {}) {
  const type = String(payload?.type || "").toLowerCase();
  const name = String(payload?.name || "").trim();
  if (type === "mcp" && isInternalMcpName(name)) throw new Error(`内部 MCP "${name}" 由系统保护，不能卸载`);
  if (!["mcp", "skill"].includes(type) || !name) throw new Error("卸载参数无效");
  if (type === "skill") assertCcmInternalSkillMutable(name, "通过商城卸载");
  const skillPackagesDir = store.skillPackagesDir || SKILL_PACKAGES_DIR;
  const loadRecords = store.loadInstallations || loadInstallations;
  const saveRecords = store.saveInstallations || saveInstallations;
  const deleteMcp = store.deleteMcpTool || deleteMcpTool;
  const deleteInstalledSkill = store.deleteSkill || deleteSkill;
  const records = loadRecords();
  const key = installationKey(type, name);
  const record = records.find(entry => entry.key === key);
  if (type === "mcp") deleteMcp(name);
  else {
    deleteInstalledSkill(name);
    removeManagedPackage(record?.packagePath || "", skillPackagesDir);
  }
  saveRecords(records.filter(entry => entry.key !== key));
  let toolManagerReloaded = false;
  if (store.reloadTools) await store.reloadTools();
  else {
    toolManager.disconnect();
    await toolManager.loadTools();
  }
  toolManagerReloaded = true;
  const authorizationImpact = buildMarketplaceAuthorizationImpact({ action: "uninstall", type, name }, store);
  let runtimeImpact = buildMarketplaceRuntimeImpact({ action: "uninstall", type, name }, store);
  const runtimeResync = maybeAutoResyncMarketplaceRuntime(runtimeImpact, options, store);
  if (runtimeResync?.summary?.resynced || runtimeResync?.summary?.created) {
    runtimeImpact = buildMarketplaceRuntimeImpact({ action: "uninstall", type, name }, store);
  }
  appendMarketplaceOperationAudit({
    action: "uninstall",
    key,
    type,
    name,
    source: record?.source,
    previousVersion: record?.version,
    previousChecksum: record?.checksum,
    changed: !!record,
    packageManaged: type === "skill" && !!record?.packagePath,
    toolManagerReloaded,
    authorizationImpact,
    runtimeImpact,
    runtimeResync,
    sourceProof: record?.sourceProof,
  }, store);
  return { name, type, action: "uninstall", removed: !!record, authorizationImpact, runtimeImpact, runtimeResync };
}

async function uninstallMarketplaceItem(payload: any) {
  return uninstallMarketplaceItemWithStore(payload, {}, { autoResync: payload?.autoResync });
}

function readJsonBody(req: any, maxBytes = 2 * 1024 * 1024): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: any) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

export function handleMarketplaceApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (pathname === "/api/smithery/config" && req.method === "GET") {
    let key = "";
    try { key = String(JSON.parse(fs.readFileSync(SMITHERY_CONFIG_FILE, "utf-8")).key || ""); } catch {}
    sendJson(res, { success: true, configured: !!key, key: "" });
    return true;
  }

  if (pathname === "/api/smithery/config" && req.method === "POST") {
    readJsonBody(req)
      .then(payload => {
        writeJsonAtomic(SMITHERY_CONFIG_FILE, { key: String(payload.key || "") });
        sendJson(res, { success: true });
      })
      .catch(error => sendJson(res, { success: false, error: error.message }, 400));
    return true;
  }

  if (pathname === "/api/marketplace/installations" && req.method === "GET") {
    sendJson(res, { success: true, items: loadInstallations() });
    return true;
  }

  if (pathname === "/api/marketplace/operations" && req.method === "GET") {
    sendJson(res, { success: true, ...readMarketplaceOperationAudit({ limit: parsed.query.limit }) });
    return true;
  }

  if (pathname === "/api/marketplace/sources" && req.method === "GET") {
    sendJson(res, { success: true, sources: publicMarketplaceSources() });
    return true;
  }

  if (pathname === "/api/marketplace/sources" && req.method === "POST") {
    readJsonBody(req)
      .then(saveMarketplaceSource)
      .then(result => sendJson(res, { success: true, ...result }))
      .catch(error => sendJson(res, { success: false, error: error.message }, 400));
    return true;
  }

  if (pathname === "/api/marketplace/sources/delete" && req.method === "POST") {
    readJsonBody(req)
      .then(deleteMarketplaceSource)
      .then(result => sendJson(res, { success: true, ...result }))
      .catch(error => sendJson(res, { success: false, error: error.message }, 400));
    return true;
  }

  if (pathname === "/api/marketplace/list" && req.method === "GET") {
    const source = String(parsed.query.source || "local");
    const customUrl = String(parsed.query.url || "");
    const listOptions: MarketplaceListOptions = {
      query: String(parsed.query.query || parsed.query.q || ""),
      page: marketplacePageNumber(parsed.query.page, 1),
      pageSize: marketplacePageNumber(parsed.query.pageSize, DEFAULT_MARKETPLACE_PAGE_SIZE),
      category: String(parsed.query.category || "all"),
      sort: String(parsed.query.sort || "popular"),
    };
    (async () => {
      if (source === "skills-sh") return loadSkillsShItems(listOptions);
      if (source === "smithery") return loadSmitheryItems(listOptions);
      if (source === "local") {
        const items = localMarketplaceItems();
        return {
          items,
          needKey: false,
          pagination: marketplacePagination(1, items.length || DEFAULT_MARKETPLACE_PAGE_SIZE, items.length),
          query: { text: "", applied: "", category: "all", sort: "popular", defaulted: false },
          sourceStatus: marketplaceSourceStatus({ id: "ccm-official", label: "CCM 官方精选", kind: "builtin", trust: "official" }, { online: false, anonymous: true, message: "本地内置精选，无需联网" }),
        };
      }
      if (source === "github") {
        const items = await loadCatalogItems(CCM_COMMUNITY_CATALOG_URL, { id: "ccm-community", label: "CCM Community", kind: "catalog", url: CCM_COMMUNITY_CATALOG_URL, trust: "community" });
        return {
          items,
          needKey: false,
          pagination: marketplacePagination(1, items.length || DEFAULT_MARKETPLACE_PAGE_SIZE, items.length),
          query: { text: "", applied: "", category: "all", sort: "popular", defaulted: false },
          sourceStatus: marketplaceSourceStatus({ id: "ccm-community", label: "CCM Community", kind: "catalog", url: CCM_COMMUNITY_CATALOG_URL, trust: "community" }, { message: "已读取 CCM 社区精选源" }),
        };
      }
      if (source === "custom" && customUrl) {
        return {
          items: await loadCatalogItems(customUrl, { id: `custom-${sha256(customUrl).slice(0, 10)}`, label: new URL(customUrl).hostname, kind: "catalog", url: customUrl, trust: "custom" }),
          needKey: false,
        };
      }
      const savedSource = publicMarketplaceSources().find(item => item.id === source);
      if (savedSource?.url) {
        return {
          items: await loadCatalogItems(savedSource.url, savedSource),
          needKey: false,
        };
      }
      throw new Error("未指定有效的商城来源");
    })()
      .then((result: any) => sendJson(res, {
        success: true,
        needKey: false,
        items: decorateInstallState(result.items || []),
        pagination: result.pagination || marketplacePagination(1, (result.items || []).length || DEFAULT_MARKETPLACE_PAGE_SIZE, (result.items || []).length),
        query: result.query || { text: listOptions.query || "", applied: listOptions.query || "", category: listOptions.category || "all", sort: listOptions.sort || "popular", defaulted: false },
        sourceStatus: result.sourceStatus || null,
      }))
      .catch(error => sendJson(res, { success: false, error: error.message, items: [] }, 400));
    return true;
  }

  if (pathname === "/api/marketplace/preview" && req.method === "POST") {
    readJsonBody(req)
      .then(previewMarketplaceItem)
      .then(result => sendJson(res, { success: true, ...result }))
      .catch(error => sendJson(res, { success: false, error: error.message }, 400));
    return true;
  }

  if (pathname === "/api/marketplace/authorization-impact" && req.method === "POST") {
    readJsonBody(req)
      .then(previewMarketplaceAuthorizationImpact)
      .then(result => sendJson(res, { success: true, ...result }))
      .catch(error => sendJson(res, { success: false, error: error.message }, 400));
    return true;
  }

  if (pathname === "/api/marketplace/install" && req.method === "POST") {
    readJsonBody(req)
      .then(installMarketplaceItem)
      .then(result => sendJson(res, { success: true, ...result }))
      .catch(error => sendJson(res, { success: false, error: error.message, code: error.code }, Number(error.statusCode || 400)));
    return true;
  }

  if (pathname === "/api/marketplace/update" && req.method === "POST") {
    readJsonBody(req)
      .then(updateMarketplaceItem)
      .then(result => sendJson(res, { success: true, ...result }))
      .catch(error => sendJson(res, { success: false, error: error.message, code: error.code }, Number(error.statusCode || 400)));
    return true;
  }

  if (pathname === "/api/marketplace/uninstall" && req.method === "POST") {
    readJsonBody(req)
      .then(uninstallMarketplaceItem)
      .then(result => sendJson(res, { success: true, ...result }))
      .catch(error => sendJson(res, { success: false, error: error.message, code: error.code }, Number(error.statusCode || 400)));
    return true;
  }

  return false;
}

