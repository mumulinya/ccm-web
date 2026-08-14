import { type FeishuMessageResourceDescriptor } from "../modules/collaboration/feishu";
export type CcmFeishuInboundAttachmentV1 = {
    schema: "ccm-feishu-inbound-attachment-v1";
    id: string;
    messageId: string;
    kind: "image" | "file";
    name: string;
    mimeType: string;
    size: number;
    checksum: string;
    storageKey: string;
    source: "cc_connect_acp" | "event_callback";
    contentStored: false;
};
export type CcConnectAttachmentPathRef = {
    kind: "image" | "file";
    path: string;
};
export declare function extractCcConnectInboundAttachmentPaths(value: any): {
    text: string;
    refs: CcConnectAttachmentPathRef[];
};
export declare function extractFeishuEventResourceHints(payload: any): FeishuMessageResourceDescriptor[];
export declare function resolveFeishuInboundAttachments(input: {
    messageId: string;
    localRefs?: CcConnectAttachmentPathRef[];
    expectedWorkDir?: string;
    resourceHints?: FeishuMessageResourceDescriptor[];
    source: "cc_connect_acp" | "event_callback";
}): Promise<{
    attachments: CcmFeishuInboundAttachmentV1[];
    warnings: string[];
    failures: {
        name: string;
        reason: string;
    }[];
}>;
export declare function materializeFeishuInboundAttachments(value: any): {
    filename: string;
    name: string;
    savedPath: string;
    size: number;
    type: string;
    mimeType: string;
    feishuAttachmentId: string;
}[];
export declare function publicFeishuInboundAttachments(value: any): {
    id: string;
    name: string;
    kind: string;
    mimeType: string;
    size: number;
    checksum: string;
    status: string;
    contentStored: boolean;
}[];
export declare function runFeishuInboundAttachmentSelfTest(): {
    ok: boolean;
    text: string;
    refs: {
        kind: "file" | "image";
        name: string;
    }[];
};
