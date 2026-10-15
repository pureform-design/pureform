// Condition lowering and the conditional-value object compiler.
//
// A `ConditionalNode` in a value slot compiles to a Panda conditional value object
// (`{ base, _hover, md, ... }`) rather than a flat string. Portable conditions map to Panda's
// built-in `_`-prefixed keys; a viewport breakpoint referencing a single `from` token maps to
// that breakpoint's name (a Panda condition); everything else lowers to a raw `@media` /
// `@container` at-rule or the target's raw selector.

import { getByPath, tokenValue } from "@pureform/core";
import type {
    Condition,
    ConditionalNode,
    SlotCondition,
    SlotState,
    NumericScalarNode,
    ValueNode,
} from "@pureform/core/ast";

import { compileNodeToCSS } from "./compile-node";
import { aliasTarget } from "./css";
import type { CompileCtx } from "./options";

// Interaction, form, color-scheme, and direction conditions that map to a Panda built-in key.
const CONDITION_KEY: Record<string, string> = {
    hover: "_hover",
    focus: "_focus",
    focusVisible: "_focusVisible",
    active: "_active",
    pressed: "_active",
    // Repeating the attribute raises specificity above hover, focus, and pressed, so the drag
    // tint wins wherever Panda orders the rules; the pointer is over the element while dragging.
    dragged: "&[data-dragging][data-dragging]",
    disabled: "_disabled",
    selected: "_selected",
    checked: "_checked",
    invalid: "_invalid",
    readOnly: "_readOnly",
    // An input or textarea with a value, or an element containing one, or anything marked
    // `data-filled`. CSS sees a value through `:placeholder-shown`, so the input needs a
    // placeholder (a single space works when none should show).
    filled: "&:is(:is(input, textarea):not(:placeholder-shown), :has(:is(input, textarea):not(:placeholder-shown)), [data-filled])",
    dark: "_dark",
    light: "_light",
    ltr: "_ltr",
    rtl: "_rtl",
    reducedMotion: "_motionReduce",
};

// Media features with no Panda built-in: lowered to a raw at-rule key.
const MEDIA_RULE: Record<string, string> = {
    moreContrast: "@media (prefers-contrast: more)",
    lessContrast: "@media (prefers-contrast: less)",
    print: "@media print",
    landscape: "@media (orientation: landscape)",
    portrait: "@media (orientation: portrait)",
    touch: "@media (pointer: coarse)",
    mouse: "@media (pointer: fine)",
};

// What each slot state matches on the slot's element, and how many times its selector repeats.
// Repeating raises specificity, so a later state wins wherever Panda orders the rules: hover,
// then focus, then invalid, then disabled. Each also takes a data attribute, for custom
// controls and native-like bindings that set the state by hand.
const SLOT_STATE: Record<SlotState, { match: string; rank: number }> = {
    hover: { match: ":hover, [data-hover]", rank: 1 },
    filled: {
        match: ":is(input, textarea):not(:placeholder-shown), :has(:is(input, textarea):not(:placeholder-shown)), [data-filled]",
        rank: 1,
    },
    focusWithin: { match: ":focus-within, [data-focused]", rank: 2 },
    focusVisibleWithin: {
        match: ":focus-visible, :has(:focus-visible), [data-focus-visible]",
        rank: 2,
    },
    invalid: {
        match: "[aria-invalid=true], :has([aria-invalid=true]), [data-invalid]",
        rank: 3,
    },
    disabled: { match: ":disabled, :has(:disabled), [data-disabled]", rank: 4 },
};

// The selector for a slot state: on the styled slot itself, or on an ancestor slot's class.
const slotSelector = (condition: SlotCondition, ctx: CompileCtx): string => {
    if (!ctx.slot) {
        throw new Error(
            `slot("${condition.slot}", "${condition.state}") is only valid inside a slotted component's recipe`,
        );
    }
    const { match, rank } = SLOT_STATE[condition.state];
    const state = `:is(${match})`.repeat(rank);
    if (condition.slot === ctx.slot.name) return `&${state}`;
    const prefix = ctx.tokenPrefix ? `${ctx.tokenPrefix}-` : "";
    return `.${prefix}${ctx.slot.className}__${condition.slot}${state} &`;
};

const sizeCss = (n: NumericScalarNode): string =>
    n.unit === "none" ? String(n.value) : `${n.value}${n.unit}`;

const breakpointCss = (name: string, ctx: CompileCtx): string => {
    const bp = ctx.config.breakpoints?.[name];
    if (!bp) throw new Error(`unknown breakpoint token: ${name}`);
    return sizeCss(bp);
};

// Exclusive upper bound: CSS has no `<` on width ranges in the common syntax, so subtract a
// hair, matching how tooling emits half-open bands.
const exclusive = (css: string): string => `calc(${css} - 0.02px)`;

const rangeRule = (
    at: "media" | "container",
    container: string | undefined,
    min: string | undefined,
    max: string | undefined,
): string => {
    const parts: string[] = [];
    if (min) parts.push(`(min-width: ${min})`);
    if (max) parts.push(`(max-width: ${max})`);
    const query = parts.join(" and ");
    if (at === "container") {
        return `@container ${container ? `${container} ` : ""}${query}`;
    }
    return `@media ${query}`;
};

/** The Panda conditional-value key for one condition. */
export const conditionKey = (condition: Condition, ctx: CompileCtx): string => {
    if (typeof condition === "string") {
        return CONDITION_KEY[condition] ?? MEDIA_RULE[condition] ?? condition;
    }
    switch (condition.type) {
        case "viewportBreakpoint":
            // A plain `from` maps to the breakpoint name (a Panda condition); a band or an
            // open `until` becomes a raw media range.
            if (condition.from && !condition.until) return condition.from;
            return rangeRule(
                "media",
                undefined,
                condition.from ? breakpointCss(condition.from, ctx) : undefined,
                condition.until
                    ? exclusive(breakpointCss(condition.until, ctx))
                    : undefined,
            );
        case "viewportSize":
            return rangeRule(
                "media",
                undefined,
                condition.min ? sizeCss(condition.min) : undefined,
                condition.max ? sizeCss(condition.max) : undefined,
            );
        case "containerBreakpoint":
            return rangeRule(
                "container",
                condition.container,
                condition.from ? breakpointCss(condition.from, ctx) : undefined,
                condition.until
                    ? exclusive(breakpointCss(condition.until, ctx))
                    : undefined,
            );
        case "containerSize":
            return rangeRule(
                "container",
                condition.container,
                condition.min ? sizeCss(condition.min) : undefined,
                condition.max ? sizeCss(condition.max) : undefined,
            );
        case "rawCondition":
            return condition.by[ctx.target] ?? "";
        case "slot":
            return slotSelector(condition, ctx);
    }
};

export type CondObject = { [key: string]: string | CondObject };

const assignNested = (
    target: CondObject,
    keys: string[],
    value: string | CondObject,
): void => {
    const [head, ...tail] = keys;
    if (head === undefined) return;
    const existing = target[head];
    if (tail.length === 0) {
        // A case that shares a key with a longer one becomes the nested object's base.
        if (typeof existing === "object" && typeof value === "string") {
            existing.base = value;
        } else {
            target[head] = value;
        }
        return;
    }
    // A shorter case already holding this key keeps its value as the base.
    const next: CondObject =
        typeof existing === "string" ? { base: existing } : (existing ?? {});
    target[head] = next;
    assignNested(next, tail, value);
};

/** Compile a `ConditionalNode` to a Panda conditional value object. AND-lists nest their
 *  keys; several cases merge into one object. */
export const compileConditional = (
    node: ConditionalNode,
    ctx: CompileCtx,
): CondObject => {
    const out: CondObject = { base: compileValue(node.base, ctx) };
    for (const c of node.cases) {
        const conds = Array.isArray(c.on) ? c.on : [c.on];
        assignNested(
            out,
            conds.map((k) => conditionKey(k, ctx)),
            compileValue(c.value, ctx),
        );
    }
    return out;
};

/** Compile a value that may be conditional: a `ConditionalNode` becomes a conditional object,
 *  everything else a flat CSS string. An alias to a conditional token is followed first. */
export const compileValue = (
    node: ValueNode,
    ctx: CompileCtx,
): string | CondObject => {
    if (node.type === "conditional") return compileConditional(node, ctx);
    // A token tier emits its own conditional values, so an alias into one stays a token ref.
    // Anything else that resolves to a conditional (a component token) is unfolded in place.
    if (node.type === "alias" && aliasTarget(node.path).kind !== "token") {
        const resolved = tokenValue(
            getByPath(ctx.config, node.path),
        ) as ValueNode;
        if (resolved.type === "conditional") {
            return compileConditional(resolved, ctx);
        }
    }
    return compileNodeToCSS(node, ctx);
};
