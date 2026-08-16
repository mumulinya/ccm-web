export declare const CC_ALIGNED_FILE_READ_MAX_TOKENS = 25000;
export declare const CC_ALIGNED_TOOL_RESULT_MAX_TOKENS = 100000;
export declare const CC_ALIGNED_GLOB_MAX_RESULTS = 100;
export declare const CC_ALIGNED_GREP_DEFAULT_HEAD_LIMIT = 250;
export declare const MAIN_AGENT_TOOL_RESULT_LIMIT_ERROR = "MAIN_AGENT_TOOL_RESULT_EXCEEDS_100K_TOKEN_BUDGET";
export declare const GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR = "GROUP_MAIN_TOOL_RESULT_EXCEEDS_100K_TOKEN_BUDGET";
export declare function boundedToolResultLimit(value?: number): number;
