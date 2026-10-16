// Runtime helpers generated web factories use: instance tokens as CSS vars, and joining classes.

import type { SlotClasses, TokenStyle, TokenValue } from "./types";

/** Each instance token's CSS var name, such as `{ value: "--components-circularProgress-value" }`. */
export type TokenVars<T extends string = string> = Readonly<
    Record<T, `--${string}`>
>;

/** An instance's tokens as CSS vars, or `undefined` when it sets none. Numbers become their
 *  string, so pass a length with its unit. Tokens missing from `vars` are left out. */
export const tokenStyle = (
    tokens: Readonly<Record<string, TokenValue | undefined>> | undefined,
    vars: TokenVars,
): TokenStyle | undefined => {
    if (!tokens) return undefined;
    let style: Record<`--${string}`, string> | undefined;
    for (const [name, value] of Object.entries(tokens)) {
        const v = vars[name];
        if (value === undefined || v === undefined) continue;
        (style ??= {})[v] = String(value);
    }
    return style;
};

/** `slots` with an instance's tokens added to one slot's `style` (the root by default). The
 *  same object when it sets none, so a cached result passes through untouched. */
export const withTokenStyle = <
    Slots extends Readonly<Record<string, SlotClasses>>,
>(
    slots: Slots,
    tokens: Readonly<Record<string, TokenValue | undefined>> | undefined,
    vars: TokenVars,
    slot = "root",
): Slots => {
    const style = tokenStyle(tokens, vars);
    const target = slots[slot];
    if (!style || !target) return slots;
    return Object.freeze({
        ...slots,
        [slot]: Object.freeze({
            ...target,
            style: Object.freeze({ ...target.style, ...style }),
        }),
    });
};

/** Join class names, skipping empty ones. */
export const joinClasses = (
    ...classes: (string | false | null | undefined)[]
): string => {
    let out = "";
    for (const c of classes) if (c) out = out ? `${out} ${c}` : c;
    return out;
};
