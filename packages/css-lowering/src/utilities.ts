// Utility expansion: a dynamic utility's template, with its arg() filled in by a call-site value.

import type { StyleMap, ValueNode } from "@pureform/core/ast";

import type { LowerCtx } from "./context";
import { compileStyleMap } from "./style-map";

// Replace every utilityArg in a template with the call-site value, so a dynamic utility's
// transform can compile a concrete style. Single-arg only; object and array args pick a member
// by key.
export const substituteArgs = (node: ValueNode, value: string): ValueNode => {
    if (node.type === "utilityArg") {
        return { type: "literal", value };
    }
    const clone = structuredClone(node) as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(clone)) {
        if (Array.isArray(v)) {
            clone[k] = v.map((item) =>
                isNode(item) ? substituteArgs(item, value) : item,
            );
        } else if (isNode(v)) {
            clone[k] = substituteArgs(v, value);
        }
    }
    return clone as unknown as ValueNode;
};

const isNode = (v: unknown): v is ValueNode =>
    typeof v === "object" &&
    v !== null &&
    typeof (v as ValueNode).type === "string";

/** A dynamic utility's template, compiled for one call-site value. */
export const compileTemplate = (
    template: StyleMap,
    value: string,
    ctx: LowerCtx,
): Record<string, unknown> => {
    const substituted = Object.fromEntries(
        Object.entries(template as Record<string, unknown>).map(([k, v]) => [
            k,
            isNode(v) ? substituteArgs(v, value) : v,
        ]),
    ) as StyleMap;
    return compileStyleMap(substituted, ctx);
};
