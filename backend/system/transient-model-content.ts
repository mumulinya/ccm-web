export type TransientModelBlock =
  | { type: "image"; mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: Buffer; label?: string }
  | { type: "text"; text: string };

export const CCM_TRANSIENT_MODEL_BLOCKS = Symbol.for("ccm.transient-model-blocks");

export function attachTransientModelBlocks<T extends object>(value: T, blocks: TransientModelBlock[]) {
  if (!blocks.length) return value;
  Object.defineProperty(value, CCM_TRANSIENT_MODEL_BLOCKS, {
    value: blocks,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return value as T & { [CCM_TRANSIENT_MODEL_BLOCKS]?: TransientModelBlock[] };
}

export function transientModelBlocks(value: any): TransientModelBlock[] {
  return Array.isArray(value?.[CCM_TRANSIENT_MODEL_BLOCKS]) ? value[CCM_TRANSIENT_MODEL_BLOCKS] : [];
}

export function collectTransientModelBlocks(values: any[]) {
  return (Array.isArray(values) ? values : []).flatMap(value => transientModelBlocks(value));
}
