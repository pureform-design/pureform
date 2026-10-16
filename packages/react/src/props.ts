// React's rules for merging a part's props: classes join into one `className` string (as `clsx`
// joins them), and styles merge as objects, later properties winning.

import { combineProps, cx } from "@pureform/binding-core";
import type { ClassValue, CombineRules } from "@pureform/binding-core";
import type { CSSProperties, HTMLAttributes, Ref } from "react";

/** The props a part takes, as one element's attributes, with its `ref`. */
export type PartProps = HTMLAttributes<HTMLElement> & {
    ref?: Ref<HTMLElement> | undefined;
};

/** Styles merged in order, later properties winning. */
export const mergeStyles = (styles: readonly unknown[]): CSSProperties => {
    const merged: Record<string, unknown> = {};
    for (const style of styles) {
        if (style && typeof style === "object") Object.assign(merged, style);
    }
    return merged as CSSProperties;
};

const REACT_RULES: CombineRules = {
    // The registry's slots give `class`; React's props give `className`. Both join into the latter.
    classKeys: ["className", "class"],
    joinClasses: (values) => cx(values as readonly ClassValue[]),
    joinStyles: mergeStyles,
};

/** Props from several sources in one object, for one part: classes join (earlier sources first,
 *  so the registry's come before the user's), styles merge, handlers all run, and any other key
 *  takes the last value that isn't `undefined`. */
export const combinePartProps = (
    sources: readonly (Readonly<Record<string, unknown>> | undefined)[],
): Record<string, unknown> => combineProps(sources, REACT_RULES);

/** `props` without `keys`: what a Root passes to its element once it has taken its own props
 *  (`BUTTON_ROOT_PROPS`). */
export const omitProps = <P extends object, K extends keyof P>(
    props: P,
    keys: readonly K[],
): Omit<P, K> => {
    const rest = { ...props };
    for (const key of keys) delete rest[key];
    return rest;
};

/** Two parts' props merged, the inner one's taking precedence: how nested providers combine
 *  their `slotProps`. */
export const mergePartProps = (outer: PartProps, inner: PartProps): PartProps =>
    combinePartProps([
        outer as Record<string, unknown>,
        inner as Record<string, unknown>,
    ]) as PartProps;
