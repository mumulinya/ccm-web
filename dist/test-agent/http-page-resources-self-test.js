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
exports.runTestAgentHttpPageResourcesSelfTest = runTestAgentHttpPageResourcesSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const agent_1 = require("./agent");
const artifact_verifier_1 = require("./artifact-verifier");
const artifacts_1 = require("./artifacts");
const cli_1 = require("./cli");
const contract_1 = require("./contract");
const work_order_1 = require("./work-order");
const http_page_resources_1 = require("./http-page-resources");
function sha256File(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
function refreshManifestItemIntegrity(manifestPath, artifactType) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const item = (manifest.files || []).find((entry) => entry.type === artifactType);
    if (!item?.path)
        return;
    const targetPath = path.resolve(item.path);
    const stat = fs.statSync(targetPath);
    const integrity = { exists: true, sizeBytes: stat.size, sha256: sha256File(targetPath) };
    for (const entry of manifest.files || []) {
        if (entry.type === artifactType || (entry.path && path.resolve(entry.path) === targetPath))
            entry.integrity = integrity;
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}
function listen(server) {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.off("error", reject);
            const address = server.address();
            resolve(typeof address === "object" && address ? address.port : 0);
        });
    });
}
function close(server) {
    return new Promise(resolve => server.close(() => resolve()));
}
function artifactPaths(report) {
    const files = (report.metadata?.artifactFiles || {});
    return {
        reportPath: String(files.reportJsonPath || ""),
        manifestPath: String(files.manifestPath || ""),
    };
}
function workOrder(dir, targetUrl, artifactName) {
    return {
        id: `http-page-resources-${artifactName}-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify the frontend entry page and browser-loaded same-origin resources.",
        acceptanceCriteria: [],
        requiredChecks: ["http"],
        projects: [{ name: artifactName, workDir: dir, targetUrl }],
        options: {
            artifactDir: path.join(dir, `${artifactName}-artifacts`),
            browserProvider: "none",
            maxHttpResourceChecks: 20,
            failOnHttpResourceError: true,
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "Resource probe self-test includes deliberately malformed subresources in a separate failing work order.",
        },
    };
}
async function runTestAgentHttpPageResourcesSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-page-resources-"));
    const requests = new Map();
    const pixel = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const server = http.createServer((request, response) => {
        const target = new URL(request.url || "/", "http://127.0.0.1");
        requests.set(target.pathname, (requests.get(target.pathname) || 0) + 1);
        if (target.pathname === "/ok") {
            response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
            response.end([
                "<!doctype html><html><head><title>Resource fixture</title>",
                "<link rel=\"stylesheet\" href=\"/assets/app.css\">",
                "<link rel=\"modulepreload\" href=\"/assets/chunk.js\">",
                "<link rel=\"manifest\" href=\"/site.webmanifest\">",
                "<link rel=\"canonical\" href=\"/danger\">",
                "<script src=\"/redirect-script.js\"></script>",
                "</head><body><main><h1>Resources ready</h1>",
                "<a href=\"/danger\">Do not probe navigation</a>",
                "<form action=\"/danger\"><button>Do not submit</button></form>",
                "<img src=\"/image?url=%2Fhero.png&amp;w=640\" srcset=\"/assets/hero-1.png 1x, /assets/hero-2.png 2x\">",
                "<div style=\"background-image:url('/assets/inline-bg.png')\">Styled</div>",
                "<img src=\"https://example.com/external.png\">",
                "<template><img src=\"/danger\"></template>",
                "</main></body></html>",
            ].join(""));
            return;
        }
        if (target.pathname === "/broken") {
            response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
            response.end([
                "<!doctype html><link rel=\"stylesheet\" href=\"/assets/bad.css\">",
                "<script src=\"/assets/missing.js\"></script>",
                "<script src=\"/cross-origin-script.js\"></script>",
                "<a href=\"/danger\">Navigation is not a subresource</a>",
            ].join(""));
            return;
        }
        if (target.pathname === "/redirect-script.js") {
            response.writeHead(302, { location: "/assets/app.js" });
            response.end();
            return;
        }
        if (target.pathname === "/cross-origin-script.js") {
            response.writeHead(302, { location: "https://example.com/external.js" });
            response.end();
            return;
        }
        if (target.pathname === "/assets/app.css") {
            response.writeHead(200, { "content-type": "text/css" });
            response.end("@import './theme.css'; @font-face{font-family:Fixture;src:url('./fixture.woff2?token=resource-secret')} body{background:url('./background.png')}");
            return;
        }
        if (target.pathname === "/assets/theme.css") {
            response.writeHead(200, { "content-type": "text/css" });
            response.end("main{background-image:url('./theme-bg.png')}");
            return;
        }
        if (target.pathname === "/assets/bad.css") {
            response.writeHead(200, { "content-type": "text/html" });
            response.end("<!doctype html><title>SPA fallback is not CSS</title>");
            return;
        }
        if (target.pathname === "/assets/missing.js") {
            response.writeHead(404, { "content-type": "text/plain" });
            response.end("missing");
            return;
        }
        if (target.pathname === "/assets/app.js" || target.pathname === "/assets/chunk.js") {
            response.writeHead(200, { "content-type": "text/javascript" });
            response.end("window.__resourceFixture = true;");
            return;
        }
        if (target.pathname === "/site.webmanifest") {
            response.writeHead(200, { "content-type": "application/manifest+json" });
            response.end('{"name":"Fixture"}');
            return;
        }
        if (target.pathname === "/assets/fixture.woff2") {
            response.writeHead(200, { "content-type": "font/woff2" });
            response.end(Buffer.from([0x77, 0x4f, 0x46, 0x32]));
            return;
        }
        if (target.pathname === "/image" || /\.(?:png)$/.test(target.pathname)) {
            response.writeHead(200, { "content-type": "image/png" });
            response.end(pixel);
            return;
        }
        if (target.pathname === "/danger") {
            response.writeHead(500, { "content-type": "text/plain" });
            response.end("navigation endpoint must not be probed");
            return;
        }
        response.writeHead(404, { "content-type": "text/plain" });
        response.end("not found");
    });
    const port = await listen(server);
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
        const zeroResourceWorkOrder = workOrder(dir, `${baseUrl}/ok`, "page-resources-disabled");
        zeroResourceWorkOrder.options.maxHttpResourceChecks = 0;
        const normalizedZeroResourceLimit = (0, work_order_1.normalizeTestAgentWorkOrder)(zeroResourceWorkOrder).workOrder.options.maxHttpResourceChecks;
        const extracted = (0, http_page_resources_1.extractHtmlPageResources)(`${baseUrl}/ok`, [
            '<script src="/assets/app.js"></script>',
            '<link rel="stylesheet" href="/assets/app.css">',
            '<img srcset="/assets/hero-1.png 1x, /assets/hero-2.png 2x">',
            '<a href="/danger">navigation</a>',
            '<link rel="canonical" href="/danger">',
        ].join(""));
        const passingReport = await (0, agent_1.runTestAgent)(workOrder(dir, `${baseUrl}/ok`, "page-resources-pass"));
        const failingReport = await (0, agent_1.runTestAgent)(workOrder(dir, `${baseUrl}/broken`, "page-resources-fail"));
        const passingResult = passingReport.httpResults.find(result => result.context?.pageResourceProbe === true);
        const failingResult = failingReport.httpResults.find(result => result.context?.pageResourceProbe === true);
        const passingSummary = (0, http_page_resources_1.buildHttpPageResourceSummary)(passingReport.httpResults);
        const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(passingReport);
        const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(passingReport);
        const paths = artifactPaths(passingReport);
        const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(paths.manifestPath);
        const failingArtifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(artifactPaths(failingReport).manifestPath);
        const originalReport = fs.readFileSync(paths.reportPath, "utf-8");
        const tamperedReport = JSON.parse(originalReport);
        const tamperedResource = tamperedReport.httpResults.find((result) => result.context?.pageResourceProbe)?.resourceChecks?.[0];
        if (tamperedResource)
            tamperedResource.contentType = "text/html";
        fs.writeFileSync(paths.reportPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
        refreshManifestItemIntegrity(paths.manifestPath, "report_json");
        const tamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(paths.manifestPath);
        const passingByPath = new Map((passingResult?.resourceChecks || []).map(resource => [new URL(resource.url).pathname, resource]));
        const failingByPath = new Map((failingResult?.resourceChecks || []).map(resource => [new URL(resource.url).pathname, resource]));
        const reportText = JSON.stringify(passingReport);
        const pass = extracted.some(item => item.source === "script[src]" && item.kind === "script")
            && extracted.some(item => item.source === "link[rel=stylesheet][href]" && item.kind === "stylesheet")
            && extracted.filter(item => item.source === "img[srcset]").length === 2
            && !extracted.some(item => new URL(item.url).pathname === "/danger")
            && normalizedZeroResourceLimit === 0
            && passingReport.status === "passed"
            && passingResult?.status === "passed"
            && passingResult.context?.maxHttpResourceChecks === 20
            && passingResult.resourceChecks.length >= 10
            && passingResult.resourceChecks.every(resource => resource.status === "passed")
            && passingByPath.get("/redirect-script.js")?.redirectCount === 1
            && passingByPath.get("/redirect-script.js")?.finalUrl?.includes("/assets/app.js")
            && passingByPath.get("/assets/app.css")?.kind === "stylesheet"
            && passingByPath.get("/assets/theme.css")?.source === "css:@import"
            && passingByPath.get("/assets/fixture.woff2")?.kind === "font"
            && passingByPath.get("/assets/background.png")?.source === "css:url()"
            && passingByPath.get("/image")?.kind === "image"
            && passingSummary.total === passingResult.resourceChecks.length
            && passingSummary.failed === 0
            && passingSummary.contentTypeMismatches === 0
            && (requests.get("/danger") || 0) === 0
            && !reportText.includes("resource-secret")
            && reportText.includes("%5Bredacted%5D")
            && failingReport.status === "failed"
            && failingResult?.status === "failed"
            && failingByPath.get("/assets/bad.css")?.status === "failed"
            && failingByPath.get("/assets/bad.css")?.contentTypeMatched === false
            && failingByPath.get("/assets/missing.js")?.statusCode === 404
            && failingByPath.get("/cross-origin-script.js")?.error?.includes("outside the verified page origin")
            && String(failingResult.error || "").includes("page resources failed")
            && (0, http_page_resources_1.httpPageResourceEvidenceErrors)(passingResult).length === 0
            && (0, contract_1.validateTestAgentReportContract)(passingReport).valid
            && (0, contract_1.validateTestAgentReportContract)(failingReport).valid
            && cliSummary.includes("HTTP page resources: total=")
            && cliSummary.includes("contentTypeMismatches=0")
            && markdown.includes("## HTTP Page Resource Summary")
            && markdown.includes("source=css:@import")
            && artifactVerification.status === "passed"
            && artifactVerification.items.some(item => item.type === "http_page_resource_evidence" && item.status === "passed")
            && failingArtifactVerification.status === "passed"
            && tamperedVerification.status === "failed"
            && tamperedVerification.items.some(item => item.type === "http_page_resource_evidence"
                && item.status === "failed"
                && String(item.error || "").includes("contentTypeMatched"));
        return {
            pass,
            passingReport,
            failingReport,
            extracted,
            artifactVerification,
            failingArtifactVerification,
            tamperedVerification,
            requests: Object.fromEntries(requests),
        };
    }
    finally {
        await close(server);
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=http-page-resources-self-test.js.map