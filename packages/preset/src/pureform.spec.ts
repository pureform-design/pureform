import { typed } from "@pureform/core";
import { px } from "@pureform/core/ast";
import {
    materialColor,
    materialElevation,
    materialLayout,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { colorFromTokens, extend, resolveTheme } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import { scrim } from "./components/scrim";
import { pureform } from "./pureform";

describe("pureform", () => {
    it("includes every component", () => {
        expect(Object.keys(pureform().components)).toEqual([
            "button",
            "iconButton",
            "buttonGroup",
            "fab",
            "fabMenu",
            "splitButton",
            "avatar",
            "badge",
            "media",
            "chip",
            "inputChip",
            "textField",
            "textArea",
            "tagsInput",
            "searchBar",
            "select",
            "supportingText",
            "checkbox",
            "radio",
            "switchControl",
            "slider",
            "linearProgress",
            "circularProgress",
            "separator",
            "list",
            "listItem",
            "menu",
            "tabs",
            "navigationBar",
            "navigationRail",
            "dialog",
            "fullscreenDialog",
            "snackbar",
            "toast",
            "tooltip",
            "richTooltip",
            "card",
            "scrim",
            "ripple",
            "icon",
            "touchTarget",
            "text",
        ]);
    });

    it("regenerates the palette from the seed", () => {
        expect(
            pureform({ color: materialColor({ seed: "#006A60" }) }).tokens
                .colors?.primaryLight,
        ).not.toEqual(pureform().tokens.colors?.primaryLight);
    });

    it("ships both schemes by default", () => {
        const preset = compilePreset(pureform());
        const colors = (preset.theme?.semanticTokens?.colors ?? {}) as Record<
            string,
            { value: unknown }
        >;
        expect(colors.primary?.value).toEqual({
            base: "{colors.primaryLight}",
            _dark: "{colors.primaryDark}",
        });
    });

    it("compiles to a Panda preset with every slot recipe", () => {
        const preset = compilePreset(pureform());
        expect(Object.keys(preset.theme?.slotRecipes ?? {})).toEqual([
            "button",
            "iconButton",
            "buttonGroup",
            "fab",
            "fabMenu",
            "splitButton",
            "chip",
            "inputChip",
            "textField",
            "textArea",
            "tagsInput",
            "searchBar",
            "select",
            "checkbox",
            "radio",
            "switchControl",
            "slider",
            "linearProgress",
            "circularProgress",
            "list",
            "listItem",
            "menu",
            "tabs",
            "navigationBar",
            "navigationRail",
            "dialog",
            "fullscreenDialog",
            "snackbar",
            "toast",
            "tooltip",
            "richTooltip",
            "card",
            "scrim",
            "ripple",
        ]);
    });
});

describe("pureform color options", () => {
    const config = pureform({
        color: materialColor({
            customSeeds: { coral: "#FF7F50" },
            overrides: { surface: { light: "#FFFFFF" } },
        }),
    });

    it("gives the components a color variant for each custom group", () => {
        for (const name of ["button", "iconButton"]) {
            const spec = config.components[name];
            expect(
                spec && "recipe" in spec
                    ? Object.keys(spec.recipe.variants?.color ?? {})
                    : [],
                name,
            ).toContain("coral");
        }
    });

    it("points the button's group tokens at the custom group's colors", () => {
        const recipe = compilePreset(config).theme?.slotRecipes?.button;
        expect(recipe?.variants?.color?.coral?.root).toMatchObject({
            "--components-button-onAccent": "token(colors.onCoral)",
        });
    });

    it("passes overrides to the palette", () => {
        expect(config.tokens.colors?.surfaceLight).not.toEqual(
            pureform().tokens.colors?.surfaceLight,
        );
    });

    it("keeps the built-in groups when no custom seeds are given", () => {
        const spec = pureform().components.button;
        expect(
            spec && "recipe" in spec
                ? Object.keys(spec.recipe.variants?.color ?? {})
                : [],
        ).not.toContain("coral");
    });
});

describe("pureform providers", () => {
    it("replaces a domain with another provider", () => {
        const config = pureform({ shape: materialShape({ medium: 10 }) });
        expect(config.tokens.radii?.medium).toEqual(px(10));
    });

    it("takes a layout provider for spacing and sizes", () => {
        const config = pureform({
            layout: materialLayout({ grid: 8, sizes: { touchTarget: 56 } }),
        });
        expect(config.tokens.spacing?.["2"]).toEqual(px(16));
        expect(config.tokens.sizes?.touchTarget).toEqual(px(56));
    });

    it("checks contrast when asked", () => {
        expect(() => pureform({ requireContrast: 4.5 })).not.toThrow();
        expect(() => pureform({ requireContrast: 7 })).toThrow(
            "falls below 7:1 contrast",
        );
    });

    it("checks dark values when asked", () => {
        expect(() => pureform({ requireDark: true })).not.toThrow();
        const light = colorFromTokens({
            ...resolveTheme({
                color: materialColor({ mode: "light" }),
                typography: materialTypescale(),
                shape: materialShape(),
                layout: materialLayout(),
                state: materialState(),
                motion: materialMotion(),
                elevation: materialElevation(),
            }).color,
        });
        expect(() => pureform({ color: light, requireDark: true })).toThrow(
            "no dark value",
        );
    });

    it("takes an extended provider", () => {
        const config = pureform({
            shape: extend(materialShape(), (out) => ({
                ...out,
                radii: { ...out.radii, full: px(24) },
            })),
        });
        expect(config.tokens.radii?.full).toEqual(px(24));
    });

    it("lets the components function drop and add components", () => {
        const config = pureform({
            components: ({ defaults, theme }) => ({
                ...defaults,
                card: undefined,
                groups: { ...scrim, name: theme.color.groups.join() },
            }),
        });
        expect(Object.keys(config.components)).not.toContain("card");
        expect(config.components.groups).toBeDefined();
    });

    it("names the provider when a contract is not met", () => {
        const broken = extend(materialShape(), (out) => {
            const { medium: _, ...radii } = out.radii;
            return { radii: radii as typeof out.radii };
        });
        expect(() => pureform({ shape: broken })).toThrow(
            'shape provider "material+" is missing radius "medium"',
        );
    });
});

describe("pureform themes", () => {
    const config = pureform({
        themes: {
            teal: {
                color: materialColor({ seed: "#006A60" }),
                shape: materialShape({ medium: 4 }),
            },
        },
    });
    const teal = config.themes?.teal;

    it("emits only what a theme changes", () => {
        expect(teal?.tokens?.colors?.primaryLight).toBeDefined();
        expect(teal?.tokens?.radii).toEqual({ medium: px(4) });
        expect(teal?.tokens?.spacing).toBeUndefined();
        expect(teal?.fonts).toBeUndefined();
    });

    it("re-declares semantic tokens that read a changed token", () => {
        expect(teal?.semanticTokens?.colors?.primary).toBeDefined();
        expect(teal?.semanticTokens?.colors?.brand).toBeDefined();
        expect(teal?.semanticTokens?.shadows).toBeUndefined();
    });

    it("compiles to a Panda theme", () => {
        const preset = compilePreset(config);
        const themes = preset.themes as Record<string, { tokens: object }>;
        expect(themes.teal?.tokens).toHaveProperty("radii.medium.value", "4px");
    });

    it("rejects a theme that adds color groups", () => {
        expect(() =>
            pureform({
                themes: {
                    coral: {
                        color: materialColor({
                            customSeeds: { coral: "#FF7F50" },
                        }),
                    },
                },
            }),
        ).toThrow('theme "coral" adds color groups coral');
    });
});

describe("pureform text styles", () => {
    const code = {
        font: "mono" as const,
        fontSize: "0.875rem",
        lineHeight: "1.25rem",
        letterSpacing: "0rem",
        fontWeight: 400,
    };
    const config = pureform({
        typography: materialTypescale({
            fonts: {
                mono: { families: ["JetBrains Mono"], generic: "monospace" },
            },
            custom: { code },
        }),
    });

    it("gives the text component a style variant per text style", () => {
        const spec = config.components.text;
        const styles =
            spec && "recipe" in spec
                ? Object.keys(spec.recipe.variants?.style ?? {})
                : [];
        expect(styles).toHaveLength(16);
        expect(styles).toContain("code");
        expect(styles).toContain("labelLarge");
    });

    it("compiles an added style to a Panda text style variant", () => {
        const recipe = compilePreset(config).theme?.recipes?.text;
        expect(recipe?.variants?.style?.code).toEqual({ textStyle: "code" });
        expect(recipe?.defaultVariants).toEqual({ style: "bodyMedium" });
    });
});

describe("pureform result", () => {
    it("carries the typed theme without exposing it to adapters", () => {
        const config = pureform({
            typography: materialTypescale({
                fonts: { mono: { families: ["Menlo"], generic: "monospace" } },
                custom: {
                    code: {
                        font: "mono",
                        fontSize: "0.875rem",
                        lineHeight: "1.25rem",
                        letterSpacing: "0rem",
                        fontWeight: 400,
                    },
                },
            }),
        });
        const code: keyof typeof config.theme.typography.styles = "code";
        const label: keyof typeof config.theme.typography.styles = "labelLarge";
        const mono: keyof typeof config.theme.typography.fonts = "mono";
        expect([code, label, mono]).toEqual(["code", "labelLarge", "mono"]);
        expect(config.theme.color.groups).toContain("primary");
        expect(Object.keys(config)).not.toContain("theme");
        expect(() => compilePreset(config)).not.toThrow();
    });
});

describe("pureform with typed()", () => {
    it("offers the theme's roles, including custom groups and text styles", () => {
        const config = pureform({
            color: materialColor({ customSeeds: { brand: "#0b6e4f" } }),
        });
        const pf = typed(config);
        expect(
            pf.alias("semanticTokens", "colors", "onBrandContainer").path,
        ).toEqual(["semanticTokens", "colors", "onBrandContainer"]);
        pf.alias("tokens", "sizes", "densityOffset");
        pf.textStyle("titleMedium");
        // @ts-expect-error not a color group of this theme
        pf.alias("semanticTokens", "colors", "onLogoContainer");
    });
});

describe("component tokens with typed()", () => {
    it("are offered for every default component", () => {
        const pf = typed(pureform());
        pf.alias("components", "button", "radius");
        pf.alias("components", "textField", "focusColor");
        pf.alias("components", "iconButton", "outlineColor");
        // @ts-expect-error not one of the button's tokens
        pf.alias("components", "button", "radus");
    });

    it("follow the components function: dropped ones go, added ones come", () => {
        const badge = typed().component({
            name: "badge",
            tokens: { size: px(16) },
            recipe: () => ({ base: {} }),
        });
        const config = pureform({
            components: ({ defaults }) => ({
                ...defaults,
                tooltip: undefined,
                badge,
            }),
        });
        const pf = typed(config);
        pf.alias("components", "badge", "size");
        pf.alias("components", "button", "radius");
        // @ts-expect-error the tooltip was left out
        pf.alias("components", "tooltip", "container");
        expect(Object.keys(config.components)).toContain("badge");
        expect(Object.keys(config.components)).not.toContain("tooltip");
    });
});
