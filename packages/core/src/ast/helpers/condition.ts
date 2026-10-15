// Conditional value builder and size-query condition constructors.
import type {
    Condition,
    ConditionalCase,
    ConditionalNode,
    ContainerBreakpointCondition,
    ContainerSizeCondition,
    NumericScalarNode,
    RawCondition,
    SlotCondition,
    SlotState,
    ValueNode,
    ViewportBreakpointCondition,
    ViewportSizeCondition,
} from "../nodes";

export interface ConditionalBuilder {
    /** Add a case. `conditions` is one condition or an AND-list. Chainable. */
    on(
        conditions: Condition | Condition[],
        value: ValueNode,
    ): ConditionalBuilder;
    /** Supply the fallback and finish; returns the `ConditionalNode`. */
    else(base: ValueNode): ConditionalNode;
}

/** Conditional value. Two forms. `when(cond, value, base)` is the shorthand for a single
 *  condition. `when().on(cond, value)....else(base)` is the fluent builder for multiple or
 *  compound cases, where the terminal `else` supplies the required base. */
export function when(): ConditionalBuilder;
export function when(
    conditions: Condition | Condition[],
    value: ValueNode,
    base: ValueNode,
): ConditionalNode;
export function when(
    conditions?: Condition | Condition[],
    value?: ValueNode,
    base?: ValueNode,
): ConditionalBuilder | ConditionalNode {
    if (conditions !== undefined) {
        return {
            type: "conditional",
            base: base as ValueNode,
            cases: [{ on: conditions, value: value as ValueNode }],
        };
    }
    const cases: ConditionalCase[] = [];
    const builder: ConditionalBuilder = {
        on(c, v) {
            cases.push({ on: c, value: v });
            return builder;
        },
        else(b) {
            return { type: "conditional", base: b, cases };
        },
    };
    return builder;
}

/** Viewport `@media` range at breakpoint token(s). A string shorthand sets `from` (the
 *  common "token and up" case); the object form is for bands or `until` (exclusive upper
 *  bound). */
export const viewportBreakpoint = (
    bp: string | { from?: string; until?: string },
): ViewportBreakpointCondition => ({
    type: "viewportBreakpoint",
    ...(typeof bp === "string" ? { from: bp } : bp),
});

/** Viewport `@media` range at an ad-hoc, inclusive size. */
export const viewportSize = (opts: {
    min?: NumericScalarNode;
    max?: NumericScalarNode;
}): ViewportSizeCondition => ({ type: "viewportSize", ...opts });

/** Container `@container` range at breakpoint token(s) (reusing `CoreConfig.breakpoints`). A
 *  string shorthand sets `from`; `container` optionally targets a named container. */
export const containerBreakpoint = (
    bp: string | { from?: string; until?: string },
    container?: string,
): ContainerBreakpointCondition => ({
    type: "containerBreakpoint",
    ...(typeof bp === "string" ? { from: bp } : bp),
    ...(container ? { container } : {}),
});

/** Container `@container` range at an ad-hoc size (container optional; sizes are
 *  `NumericScalarNode`s). */
export const containerSize = (opts: {
    min?: NumericScalarNode;
    max?: NumericScalarNode;
    container?: string;
}): ContainerSizeCondition => ({ type: "containerSize", ...opts });

/** Escape hatch: a target-specific raw condition (selector or at-rule per target id). */
export const rawCondition = (by: Record<string, string>): RawCondition => ({
    type: "rawCondition",
    by,
});

/** A state of the slot `name` in the same component, for example
 *  `slot("container", "focusWithin")`. See `SlotCondition`. */
export const slot = (name: string, state: SlotState): SlotCondition => ({
    type: "slot",
    slot: name,
    state,
});
