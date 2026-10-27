// Solid's rules for merging a part's props: classes join into Solid 2's array form, styles merge
// as objects (a string style is parsed), and handlers may be Solid's `[handler, data]` pairs.

import { combineProps } from "@pureform/binding-web";
import type { CombineRules } from "@pureform/binding-web";
import type { JSX } from "@solidjs/web";

/** The props a part takes, as one element's attributes. */
export type PartProps = JSX.HTMLAttributes<HTMLElement>;

type StyleObject = Record<string, string | number | undefined>;

const parseStyle = (style: string): StyleObject => {
    const parsed: StyleObject = {};
    for (const declaration of style.split(";")) {
        const colon = declaration.indexOf(":");
        if (colon < 0) continue;
        const property = declaration.slice(0, colon).trim();
        if (property) parsed[property] = declaration.slice(colon + 1).trim();
    }
    return parsed;
};

/** Styles merged in order, later properties winning. Strings are parsed into objects. */
export const mergeStyles = (styles: readonly unknown[]): StyleObject => {
    const merged: StyleObject = {};
    for (const style of styles) {
        if (typeof style === "string") Object.assign(merged, parseStyle(style));
        else if (style && typeof style === "object")
            Object.assign(merged, style);
    }
    return merged;
};

type BoundHandler = readonly [(data: unknown, event: unknown) => void, unknown];

const isBound = (value: unknown): value is BoundHandler =>
    Array.isArray(value) && typeof value[0] === "function";

const SOLID_RULES: CombineRules = {
    classKeys: ["class", "className"],
    joinClasses: (values) => (values.length === 1 ? values[0] : [...values]),
    joinStyles: mergeStyles,
    isHandler: (value) => typeof value === "function" || isBound(value),
    callHandler: (handler, event) => {
        if (isBound(handler)) handler[0](handler[1], event);
        else (handler as (event: unknown) => void)(event);
    },
};

/** Props from several sources in one object, for one part: classes join (earlier sources first,
 *  so the registry's come before the user's), styles merge, handlers all run, and any other key
 *  takes the last value that isn't `undefined`. */
export const combinePartProps = (
    sources: readonly (Readonly<Record<string, unknown>> | undefined)[],
): Record<string, unknown> => combineProps(sources, SOLID_RULES);

/** Two parts' props merged, the inner one's taking precedence: how nested providers combine
 *  their `slotProps`. */
export const mergePartProps = (outer: PartProps, inner: PartProps): PartProps =>
    combinePartProps([
        outer as Record<string, unknown>,
        inner as Record<string, unknown>,
    ]) as PartProps;
