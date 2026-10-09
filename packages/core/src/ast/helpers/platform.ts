// Target-specific escape hatch.
import type { PlatformNode, ValueNode } from "../nodes";

/** `values` is keyed by adapter target id; `default` is the required portable fallback.
 *  For example `platform({ css: literal("100vh") }, px(800))`. */
export const platform = (
    values: Record<string, ValueNode>,
    defaultValue: ValueNode,
): PlatformNode => ({
    type: "platform",
    values,
    default: defaultValue,
});
