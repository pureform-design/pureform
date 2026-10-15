// Values in React Native style templates, and their evaluation against a theme.
//
// A template value is concrete (a number or a string) or an expression left for when the theme
// is known: a token reference, a component token, a color mix, arithmetic, or a shadow. Plain
// arrays and objects (a transform list) hold values too. Everything is JSON, so templates and
// precomputed styles can be written to a module.

import { formatColor, mixSrgb, parseColor } from "./rgba";

export type Concrete = number | string;

/** A color layered over the background color, which selection composites into it: React
 *  Native's stand-in for a one-color background image. */
export const TINT = "backgroundTint";

export type Expr =
    | { $ref: string }
    | { $dyn: string; default?: Value }
    | { $mix: [base: Value, over: Value, amount: Value] }
    | { $calc: "+" | "-" | "*" | "/"; args: Value[] }
    | { $math: "min" | "max" | "clamp"; args: Value[] }
    | { $shadow: ShadowLayer[] };

export interface ShadowLayer {
    x: Value;
    y: Value;
    blur: Value;
    spread?: Value;
    color: Value;
    inset?: boolean;
}

export type Value = Concrete | Expr | Value[] | { [key: string]: Value };

/** Token values by reference (`colors.primary`) and component token values by path
 *  (`components.button.container`), for one scheme and named theme. */
export type ThemeValues = Record<string, Concrete>;

export const isExpr = (value: unknown): value is Expr =>
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).some((key) => key.startsWith("$"));

const number = (value: Concrete, what: string): number => {
    if (typeof value === "number") return value;
    throw new Error(`${what} needs a number, got "${value}"`);
};

// A share for a mix: a percentage or a number from 0 to 1.
const share = (value: Concrete): number =>
    typeof value === "string" && value.endsWith("%")
        ? Number.parseFloat(value) / 100
        : number(value, "a mix amount");

const px = (value: Concrete): string =>
    typeof value === "number" ? `${value}px` : value;

const ARITHMETIC = {
    "+": (a: number, b: number) => a + b,
    "-": (a: number, b: number) => a - b,
    "*": (a: number, b: number) => a * b,
    "/": (a: number, b: number) => a / b,
};

/** Evaluate a value against a theme. */
export const evaluate = (value: Value, theme: ThemeValues): Value => {
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((v) => evaluate(v, theme));
    if (!isExpr(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, v]) => [key, evaluate(v, theme)]),
        );
    }
    const concrete = (v: Value) => evaluate(v, theme) as Concrete;
    if ("$ref" in value) {
        const found = theme[value.$ref];
        if (found === undefined)
            throw new Error(`unknown token "${value.$ref}"`);
        return found;
    }
    if ("$dyn" in value) {
        const found = theme[value.$dyn];
        if (found !== undefined) return found;
        if (value.default === undefined) {
            throw new Error(`"${value.$dyn}" has no value and no default`);
        }
        return evaluate(value.default, theme);
    }
    if ("$mix" in value) {
        const [base, over, amount] = value.$mix;
        return formatColor(
            mixSrgb(
                parseColor(String(concrete(base))),
                parseColor(String(concrete(over))),
                share(concrete(amount)),
            ),
        );
    }
    if ("$calc" in value) {
        const args = value.args.map((a) => number(concrete(a), "calc"));
        return args.slice(1).reduce(ARITHMETIC[value.$calc], args[0]!);
    }
    if ("$math" in value) {
        const args = value.args.map((a) => number(concrete(a), value.$math));
        if (value.$math === "min") return Math.min(...args);
        if (value.$math === "max") return Math.max(...args);
        return Math.min(Math.max(args[1]!, args[0]!), args[2]!);
    }
    return value.$shadow
        .map((layer) =>
            [
                layer.inset ? "inset" : undefined,
                px(concrete(layer.x)),
                px(concrete(layer.y)),
                px(concrete(layer.blur)),
                layer.spread === undefined
                    ? undefined
                    : px(concrete(layer.spread)),
                concrete(layer.color),
            ]
                .filter((part) => part !== undefined)
                .join(" "),
        )
        .join(", ");
};

/** The tokens and component tokens a value reads. */
export const dependencies = (
    value: Value,
    into = new Set<string>(),
): Set<string> => {
    if (typeof value !== "object") return into;
    if (Array.isArray(value)) {
        for (const v of value) dependencies(v, into);
        return into;
    }
    if ("$ref" in value && typeof value.$ref === "string") into.add(value.$ref);
    if ("$dyn" in value && typeof value.$dyn === "string") into.add(value.$dyn);
    for (const v of Object.values(value)) {
        if (typeof v === "object") dependencies(v as Value, into);
    }
    return into;
};
