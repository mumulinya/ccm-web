import { BrowserExistingSessionProvider } from "../types";
import { Caller, McpBrowserAdapter } from "./mcp-adapters-part-01";
export declare function createMcpBrowserAdapter(tools: string[], call: Caller, options?: {
    existingSession?: boolean;
    preferredAdapter?: BrowserExistingSessionProvider;
}): McpBrowserAdapter | null;
