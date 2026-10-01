type IdentityRow = {
    filename: string;
    track_id: string;
    file_checksum: string;
};
/** 内容校验和用于去重，文件条目 ID 还必须能区分相同内容的多个副本。 */
export declare function assignCatalogTrackIdentities<T extends IdentityRow>(rows: T[], previous: IdentityRow[]): T[];
export {};
