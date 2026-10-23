import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { precompute } from "./build";
import { overridesFor, stylesFor, withSetTokens } from "./resolve";
import type { Overrides } from "./resolve";
import { selectWithTransitions } from "./select";
import type { ThemeValues } from "./values";

// The corner-morphing components' round corner, `min(radius("full"), pillRadius)`, as the
// factory selects it: at every size and density it is half the root's height, as CSS computes
// the same formula, and a theme or an instance retunes it through `pillRadius`.
const precomputed = precompute(pureform(), {
    components: [
        "button",
        "iconButton",
        "chip",
        "inputChip",
        "splitButton",
        "fabMenu",
    ],
});
const KEY = "base:light";

const pick = (
    name: string,
    variants: Record<string, string>,
    overrides: ThemeValues = {},
    tokens?: Overrides,
) => {
    const resolved = stylesFor(precomputed, KEY, {
        ...overrides,
        ...(tokens ? overridesFor(tokens, "light") : {}),
    })[name]!;
    const from = (component: typeof resolved) =>
        selectWithTransitions(component, variants, { scheme: "light" });
    return withSetTokens(from(resolved), from, {
        styles: precomputed,
        key: KEY,
        name,
        scheme: "light",
        variants,
        state: { scheme: "light" },
        overrides,
        ...(tokens ? { tokens } : {}),
    });
};

const values = (name: string, group: string) =>
    precomputed.templates[name]!.variants[group] ?? [];

const cases = (name: string, extra: Record<string, string> = {}) => {
    const sizes = values(name, "size");
    return (sizes.length > 0 ? sizes : [undefined]).flatMap((size) =>
        values(name, "density").map((density) => ({
            ...extra,
            ...(size ? { size } : {}),
            density,
        })),
    );
};

describe("the pill radius", () => {
    for (const [name, extra] of [
        ["button", {}],
        ["iconButton", {}],
        ["chip", { corner: "round" }],
        ["inputChip", { corner: "round" }],
        ["splitButton", {}],
    ] as const) {
        it(`rounds ${name} to half its height at every size and density`, () => {
            const all = cases(name, extra);
            expect(all.length).toBeGreaterThan(1);
            for (const variants of all) {
                const selected = pick(name, variants);
                const height = selected.styles.root!.height as number;
                expect(typeof height, JSON.stringify(variants)).toBe("number");
                expect(
                    selected.tokens[`components.${name}.radius`],
                    JSON.stringify(variants),
                ).toBe(height / 2);
            }
        });

        it(`lets a theme and an instance retune ${name}'s pill radius`, () => {
            const [variants] = cases(name, extra);
            const key = `components.${name}.pillRadius`;
            expect(
                pick(name, variants!, { [key]: 6 }).tokens[
                    `components.${name}.radius`
                ],
            ).toBe(6);
            expect(
                pick(name, variants!, { [key]: 6 }, { [key]: 3 }).tokens[
                    `components.${name}.radius`
                ],
            ).toBe(3);
        });
    }

    it("lets a theme retune the FAB menu's close button", () => {
        for (const size of values("fabMenu", "size")) {
            const selected = pick(
                "fabMenu",
                { size },
                { "components.fabMenu.pillRadius": 4 },
            );
            expect(selected.tokens["components.fabMenu.closeRadius"]).toBe(4);
            expect(
                pick("fabMenu", { size }).tokens[
                    "components.fabMenu.closeRadius"
                ],
            ).toBeGreaterThan(4);
        }
    });

    it("keeps the theme's full radius when it is smaller", () => {
        const selected = pick("button", { size: "small" }, { "radii.full": 0 });
        expect(selected.tokens["components.button.radius"]).toBe(0);
    });
});
