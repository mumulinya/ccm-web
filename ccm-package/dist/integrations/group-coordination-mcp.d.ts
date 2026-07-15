import { GroupCoordinationContext } from "../modules/collaboration/group-coordination-store";
export declare const GROUP_COORDINATION_MCP_SERVER_NAME = "ccm__group_coordinator";
export declare function buildGroupCoordinationMcpServerConfig(context: GroupCoordinationContext): {
    command: string;
    args: string[];
    env: {
        CCM_GROUP_COORDINATION_CONTEXT: string;
    };
};
export declare function runGroupCoordinationMcpServer(): void;
