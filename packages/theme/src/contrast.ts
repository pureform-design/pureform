// WCAG contrast between the color roles a theme pairs: each `on` role against the role it
// sits on, in light and dark.
//
// Roles resolve through conditionals (by scheme) and aliases to concrete colors. Colors in
// srgb, hsl, oklab, and oklch are evaluated; others (and mixes, dynamic values, keywords)
// cannot be, so their pairs are skipped.

import type { ColorNode } from "@pureform/core/ast";

import type { ColorContract } from "./contracts/color";

export type Scheme = "light" | "dark";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Every pair of a content role and the role it is drawn on, as `[content, background]`. */
export const contrastPairs = (
    groups: readonly string[],
): [string, string][] => [
    ["onSurface", "surface"],
    ["onSurface", "surfaceContainerLowest"],
    ["onSurface", "surfaceContainerLow"],
    ["onSurface", "surfaceContainer"],
    ["onSurface", "surfaceContainerHigh"],
    ["onSurface", "surfaceContainerHighest"],
    ["onSurfaceVariant", "surfaceVariant"],
    ["inverseOnSurface", "inverseSurface"],
    ...groups.flatMap((g): [string, string][] => [
        [`on${capitalize(g)}`, g],
        [`on${capitalize(g)}Container`, `${g}Container`],
    ]),
];

type Node = {
    type?: string;
    path?: string[];
    base?: unknown;
    cases?: { on: unknown; value: unknown }[];
};

const isOn = (on: unknown, condition: string) =>
    Array.isArray(on) ? on.includes(condition) : on === condition;

/** The concrete color a role takes in a scheme, or `undefined` when it is not a plain color. */
export const resolveColor = (
    contract: Pick<ColorContract<string>, "roles" | "primitives">,
    value: unknown,
    scheme: Scheme,
    depth = 0,
): ColorNode | undefined => {
    if (depth > 16) return undefined;
    const node = value as Node | undefined;
    switch (node?.type) {
        case "color":
            return value as ColorNode;
        case "conditional": {
            const hit =
                scheme === "dark"
                    ? node.cases?.find((c) => isOn(c.on, "dark"))
                    : undefined;
            return resolveColor(
                contract,
                hit ? hit.value : node.base,
                scheme,
                depth + 1,
            );
        }
        case "alias": {
            const [tier, group, name] = node.path ?? [];
            if (group !== "colors" || !name) return undefined;
            const pool: Record<string, unknown> | undefined =
                tier === "semanticTokens"
                    ? contract.roles
                    : tier === "tokens"
                      ? contract.primitives
                      : undefined;
            return resolveColor(contract, pool?.[name], scheme, depth + 1);
        }
        default:
            return undefined;
    }
};

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

// Linear-light sRGB channels (0..1), or undefined for a space this cannot evaluate.
const linearSrgb = ({ space, components }: ColorNode): number[] | undefined => {
    const [a = 0, b = 0, c = 0] = components;
    const decode = (v: number) =>
        v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    switch (space) {
        case "srgb":
            return [a, b, c].map((v) => decode(clamp01(v / 255)));
        case "hsl": {
            const s = b / 100;
            const l = c / 100;
            const k = (n: number) => (n + a / 30) % 12;
            const f = (n: number) =>
                l -
                s *
                    Math.min(l, 1 - l) *
                    Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
            return [f(0), f(8), f(4)].map((v) => decode(clamp01(v)));
        }
        case "oklch":
        case "oklab": {
            const [L, A, B] =
                space === "oklab"
                    ? [a, b, c]
                    : [
                          a,
                          b * Math.cos((c * Math.PI) / 180),
                          b * Math.sin((c * Math.PI) / 180),
                      ];
            const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
            const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
            const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
            return [
                4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
            ].map(clamp01);
        }
        default:
            return undefined;
    }
};

/** WCAG relative luminance, or `undefined` for a color space this cannot evaluate. */
export const luminance = (color: ColorNode): number | undefined => {
    const rgb = linearSrgb(color);
    if (!rgb) return undefined;
    const [r = 0, g = 0, b = 0] = rgb;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The WCAG contrast ratio between two colors, 1 to 21. */
export const contrastRatio = (
    a: ColorNode,
    b: ColorNode,
): number | undefined => {
    const la = luminance(a);
    const lb = luminance(b);
    if (la === undefined || lb === undefined) return undefined;
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
};

export interface ContrastFailure {
    content: string;
    background: string;
    scheme: Scheme;
    ratio: number;
}

/** Every role pair below `minimum` in either scheme. Pairs with a role that does not resolve to
 *  an evaluable color are skipped. */
export const contrastFailures = (
    contract: ColorContract<string>,
    minimum: number,
): ContrastFailure[] => {
    const failures: ContrastFailure[] = [];
    for (const [content, background] of contrastPairs(contract.groups)) {
        for (const scheme of ["light", "dark"] as const) {
            const fg = resolveColor(contract, contract.roles[content], scheme);
            const bg = resolveColor(
                contract,
                contract.roles[background],
                scheme,
            );
            const ratio = fg && bg ? contrastRatio(fg, bg) : undefined;
            if (ratio !== undefined && ratio < minimum) {
                failures.push({ content, background, scheme, ratio });
            }
        }
    }
    return failures;
};
