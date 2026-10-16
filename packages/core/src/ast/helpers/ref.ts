// Reference nodes: build-time aliases and runtime dynamic overrides.
import type { AliasNode, DynamicNode, ValueNode, ValueType } from "../nodes";

/** Build-time reference to another node by path. */
export const alias = (...path: string[]): AliasNode => ({
    type: "alias",
    path,
});

/** Runtime dynamic override by path, with an optional fallback node and the type of value it
 *  holds. */
export const dynamic = (
    path: string[],
    defaultValue?: ValueNode,
    valueType?: ValueType,
): DynamicNode => ({
    type: "dynamic",
    path,
    ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    ...(valueType ? { valueType } : {}),
});
