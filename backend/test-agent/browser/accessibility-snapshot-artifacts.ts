import * as fs from "fs";
import * as path from "path";
import { BrowserEvidenceArtifact } from "../types";
import { compactText, ensureDir, safeSegment } from "../utils";

interface AccessibilitySnapshotReadResult {
  source: string;
  text: string;
}

async function readNativeAriaSnapshot(page: any): Promise<AccessibilitySnapshotReadResult | null> {
  const body = page?.locator?.("body");
  if (!body || typeof body.ariaSnapshot !== "function") return null;
  const text = String(await body.ariaSnapshot({ timeout: 1_000 }) || "").trim();
  return text ? { source: "playwright:locator.ariaSnapshot", text } : null;
}

async function readFallbackAccessibilityOutline(page: any): Promise<AccessibilitySnapshotReadResult | null> {
  if (!page?.evaluate) return null;
  const text = String(await page.evaluate(`(() => {
    const doc = globalThis.document;
    if (!doc || !doc.body) return "";
    const normalize = (value) => String(value || "").replace(/\\s+/g, " ").trim();
    const attr = (element, name) => element.getAttribute(name) || "";
    const byIdText = (ids) => normalize(String(ids || "").split(/\\s+/).map(id => doc.getElementById(id)?.textContent || "").join(" "));
    const visible = (element) => {
      if (!element || element.nodeType !== 1) return false;
      if (attr(element, "aria-hidden").toLowerCase() === "true") return false;
      const style = globalThis.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || "1") !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const labelsText = (element) => {
      if (element.labels && element.labels.length) {
        return normalize(Array.from(element.labels).map(label => label.textContent || "").join(" "));
      }
      const id = attr(element, "id");
      if (!id) return "";
      const escaped = globalThis.CSS && typeof globalThis.CSS.escape === "function"
        ? globalThis.CSS.escape(id)
        : String(id).replace(/["\\\\]/g, "\\\\$&");
      return normalize(Array.from(doc.querySelectorAll('label[for="' + escaped + '"]')).map(label => label.textContent || "").join(" "));
    };
    const implicitRole = (element) => {
      const tag = element.tagName.toLowerCase();
      const type = tag === "input" ? String(element.type || "text").toLowerCase() : "";
      if (tag === "button") return "button";
      if (tag === "a" && attr(element, "href")) return "link";
      if (/^h[1-6]$/.test(tag)) return "heading";
      if (tag === "main") return "main";
      if (tag === "nav") return "navigation";
      if (tag === "form") return "form";
      if (tag === "textarea") return "textbox";
      if (tag === "select") return "combobox";
      if (tag === "img") return "img";
      if (tag === "ul" || tag === "ol") return "list";
      if (tag === "li") return "listitem";
      if (tag === "table") return "table";
      if (tag === "tr") return "row";
      if (tag === "th") return "columnheader";
      if (tag === "td") return "cell";
      if (tag === "summary") return "button";
      if (tag === "input" && type === "checkbox") return "checkbox";
      if (tag === "input" && type === "radio") return "radio";
      if (tag === "input" && ["button", "submit", "reset"].includes(type)) return "button";
      if (tag === "input") return "textbox";
      return "";
    };
    const name = (element) => {
      const labelledBy = attr(element, "aria-labelledby");
      if (labelledBy) return byIdText(labelledBy);
      const ariaLabel = attr(element, "aria-label");
      if (ariaLabel) return normalize(ariaLabel);
      const labelText = labelsText(element);
      if (labelText) return labelText;
      const tag = element.tagName.toLowerCase();
      const type = tag === "input" ? String(element.type || "text").toLowerCase() : "";
      if (tag === "img" || type === "image") return normalize(attr(element, "alt"));
      if (["button", "submit", "reset"].includes(type)) return normalize(element.value);
      return normalize(element.innerText || element.textContent || attr(element, "title") || attr(element, "placeholder"));
    };
    const description = (element) => {
      const describedBy = attr(element, "aria-describedby");
      if (describedBy) return byIdText(describedBy);
      return normalize(attr(element, "aria-description"));
    };
    const stateParts = (element) => ["expanded", "pressed", "selected", "invalid", "required", "checked"]
      .map(state => {
        const value = attr(element, "aria-" + state);
        return value ? state + "=" + value : "";
      })
      .filter(Boolean);
    const depthOf = (element) => {
      let depth = 0;
      let current = element.parentElement;
      while (current && current !== doc.body) {
        if (current.matches && current.matches("main,nav,form,section,article,ul,ol,li,table,tr")) depth += 1;
        current = current.parentElement;
      }
      return Math.min(6, depth);
    };
    const interesting = "main,nav,form,h1,h2,h3,h4,h5,h6,button,a[href],input,textarea,select,img,[role],[aria-label],[aria-labelledby],[aria-describedby],summary,details,table,tr,th,td,ul,ol,li";
    const elements = Array.from(doc.body.querySelectorAll(interesting)).filter(visible).slice(0, 300);
    const lines = elements.map(element => {
      const role = attr(element, "role") || implicitRole(element) || element.tagName.toLowerCase();
      const accessibleName = name(element);
      const accessibleDescription = description(element);
      const states = stateParts(element);
      const depth = depthOf(element);
      const indent = "  ".repeat(depth);
      return indent + "- " + role
        + (accessibleName ? " " + JSON.stringify(accessibleName) : "")
        + (accessibleDescription ? " description=" + JSON.stringify(accessibleDescription) : "")
        + (states.length ? " [" + states.join(", ") + "]" : "");
    });
    return lines.join("\\n");
  })()`)) || "";
  return text.trim() ? { source: "playwright:fallback-accessibility-outline", text: text.trim() } : null;
}

export async function writePlaywrightAccessibilitySnapshotArtifact(
  page: any,
  artifactDir: string,
  projectName: string,
  checkName: string,
  index: number,
): Promise<BrowserEvidenceArtifact[]> {
  if (!page) return [];
  let snapshot: AccessibilitySnapshotReadResult | null = null;
  try { snapshot = await readNativeAriaSnapshot(page); } catch {}
  if (!snapshot) {
    try { snapshot = await readFallbackAccessibilityOutline(page); } catch {}
  }
  if (!snapshot?.text) return [];

  const snapshotDir = ensureDir(path.join(artifactDir, "accessibility-snapshots"));
  const base = `${safeSegment(projectName)}-${safeSegment(checkName)}-${index + 1}`;
  const snapshotPath = path.join(snapshotDir, `${base}.aria.txt`);
  const body = [
    `# Accessibility Snapshot`,
    `source: ${snapshot.source}`,
    `url: ${compactText(String(page.url?.() || ""), 1000)}`,
    "",
    compactText(snapshot.text, 40_000),
    "",
  ].join("\n");
  fs.writeFileSync(snapshotPath, body, "utf-8");
  return [{
    type: "accessibility_snapshot",
    title: `Accessibility snapshot: ${checkName}`,
    path: snapshotPath,
    source: snapshot.source,
    mediaType: "text/plain",
  }];
}
