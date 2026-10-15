// Compile a `StyleMap` to a style object.
//
// Each property value is compiled through `compileValue`, so a conditional becomes a nested
// conditional object. `apply` passes through as utility invocations (declared first so explicit
// properties win on conflict), `states` lower to condition keys, and `rawRules` emit the
// target's raw nested selectors.

import type { StyleMap } from "@pureform/core/ast";
import type { Condition, ValueNode } from "@pureform/core/ast";

import { compileNodeToCSS } from "./compile-node";
import { compileValue, conditionKey } from "./conditions";
import type { LowerCtx } from "./context";

type ApplyArg = string | ValueNode | Record<string, ValueNode> | ValueNode[];

const isNode = (v: unknown): v is ValueNode =>
    typeof v === "object" &&
    v !== null &&
    typeof (v as ValueNode).type === "string";

const compileApplyArg = (arg: ApplyArg, ctx: LowerCtx): unknown => {
    if (typeof arg === "string") return arg;
    if (Array.isArray(arg)) return arg.map((a) => compileNodeToCSS(a, ctx));
    if (isNode(arg)) return compileNodeToCSS(arg, ctx);
    return Object.fromEntries(
        Object.entries(arg).map(([k, v]) => [k, compileNodeToCSS(v, ctx)]),
    );
};

export const compileStyleMap = (
    map: StyleMap,
    ctx: LowerCtx,
): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    const m = map as Record<string, unknown>;

    // Utility invocations first, so explicit properties declared below override on conflict.
    const apply = m.apply as Record<string, ApplyArg> | undefined;
    if (apply) {
        for (const [name, arg] of Object.entries(apply)) {
            out[name] = compileApplyArg(arg, ctx);
        }
    }

    for (const [key, value] of Object.entries(m)) {
        if (key === "apply" || key === "states" || key === "rawRules") continue;
        out[key] = compileValue(value as ValueNode, ctx);
    }

    const states = m.states as
        | Partial<Record<Condition & string, StyleMap>>
        | undefined;
    if (states) {
        for (const [cond, sub] of Object.entries(states)) {
            if (sub) {
                out[conditionKey(cond as Condition, ctx)] = compileStyleMap(
                    sub,
                    ctx,
                );
            }
        }
    }

    const rawRules = m.rawRules as
        | Record<string, Record<string, StyleMap>>
        | undefined;
    const targetRules = rawRules?.[ctx.target];
    if (targetRules) {
        for (const [selector, sub] of Object.entries(targetRules)) {
            out[selector] = compileStyleMap(sub, ctx);
        }
    }

    return out;
};
