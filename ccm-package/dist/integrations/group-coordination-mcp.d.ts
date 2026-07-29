import { GroupCoordinationContext } from "../modules/collaboration/group-coordination-store";
import { InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const GROUP_COORDINATION_MCP_SERVER_NAME = "ccm__group_coordinator";
export declare function buildGroupCoordinationMcpServerConfig(context: GroupCoordinationContext): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
        CCM_INTERNAL_MCP_SECRET_FILE: string;
    };
};
export declare function validateGroupCoordinationMcpBinding(context: InternalMcpTaskContext): {
    task: any;
    group: any;
    session: any;
};
export declare function runGroupCoordinationMcpServer(): void;
