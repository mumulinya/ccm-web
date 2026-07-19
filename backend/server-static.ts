import * as fs from "fs";
import * as path from "path";
import { PUBLIC_DIR } from "./core/utils";

export function sendFile(res: any, filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
    ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
    ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject",
    ".map": "application/json",
  };
  const contentType = types[ext] || "application/octet-stream";

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const headers: Record<string, string> = { "Content-Type": contentType };
  if (ext === ".html") {
    headers["Content-Type"] = "text/html; charset=utf-8";
    // Entry HTML must revalidate so hashed asset URLs update after frontend rebuilds.
    headers["Cache-Control"] = "no-cache";
  }
  if (ext === ".js" || ext === ".css") headers["Cache-Control"] = "public, max-age=31536000, immutable";
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}
