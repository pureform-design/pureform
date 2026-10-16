import { defineComponent } from "@pureform/core";
import {
    alias,
    cubicBezier,
    dynamic,
    fontFamily,
    hex,
    numeric,
    px,
    when,
} from "@pureform/core/ast";
import { buttonConfig } from "@pureform/core/fixtures/button";
import { describe, expect, it } from "vitest";

import { compilePreset } from "./preset";

/** Narrow an indexed lookup (strict mode adds `| undefined`) and fail loudly if absent. */
const req = <T>(value: T | undefined): T => {
    if (value === undefined) throw new Error("missing preset entry");
    return value;
};

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => req(value) as Obj;

describe("compilePreset (canonical button)", () => {
    const preset = compilePreset(buttonConfig);
    const theme = obj(preset.theme);
    const button = () => obj(obj(theme.slotRecipes).button);

    it("produces a stable Panda preset shape", () => {
        expect(preset).toMatchSnapshot();
    });

    it("lowers primitive tokens into Panda categories", () => {
        const colors = obj(obj(theme.tokens).colors);
        expect(obj(colors.violet600).value).toBe("rgb(124 58 237)");
        const fontSizes = obj(obj(theme.tokens).fontSizes);
        expect(obj(fontSizes.md).value).toBe("16px");
    });

    it("emits semantic tokens as var-with-token-fallback and plain token refs", () => {
        const colors = obj(obj(theme.semanticTokens).colors);
        expect(obj(colors.brand).value).toBe(
            "var(--global-colors-brand, {colors.violet600})",
        );
        expect(obj(colors.onBrand).value).toBe("{colors.white}");
    });

    it("compiles the button as a slot recipe with its slots and variants", () => {
        const b = button();
        expect(b.slots).toEqual([
            "root",
            "label",
            "leadingIcon",
            "trailingIcon",
        ]);
        expect(b.className).toBe("btn");
        expect(b.jsx).toEqual(["Button"]);
        expect(Object.keys(obj(b.variants))).toEqual([
            "color",
            "variant",
            "size",
        ]);
    });

    it("keeps recipe color refs as token() refs, not inlined colors", () => {
        const variants = obj(button().variants);
        const danger = obj(obj(obj(variants.color).danger).root);
        expect(danger.backgroundColor).toBe("token(colors.danger)");
    });

    it("lowers the dynamic component token to a var() chain in the recipe base", () => {
        const root = obj(obj(button().base).root);
        expect(root.backgroundColor).toBe(
            "var(--ui-button-bg, var(--components-button-bg, token(colors.brand)))",
        );
    });

    it("lowers the opacity conditional and disabled state block", () => {
        const root = obj(obj(button().base).root);
        const disabled = "&:is(:disabled, [aria-disabled=true])";
        expect(root.opacity).toEqual({ base: "1", [disabled]: "0.38" });
        expect(root[disabled]).toMatchObject({ cursor: "not-allowed" });
    });

    it("defines the elevation utility with its steps", () => {
        const util = obj(obj(preset.utilities).shadowElevation);
        expect(util.values).toEqual(["level0", "level1", "level2"]);
    });
});

describe("compilePreset (boolean variant groups)", () => {
    const toggle = defineComponent({
        name: "toggle",
        recipe: {
            base: {},
            variants: {
                on: { true: {}, false: {} },
                size: { sm: {}, md: {} },
            },
            compoundVariants: [
                { match: { on: "true", size: "sm" }, style: {} },
            ],
            defaultVariants: { on: "false", size: "md" },
        },
    });
    const recipe = obj(
        obj(
            obj(
                compilePreset({
                    tokens: {},
                    semanticTokens: {},
                    components: { toggle },
                }).theme,
            ).recipes,
        ).toggle,
    );

    it("spells boolean selections as booleans so Panda's runtime matches them", () => {
        expect(recipe.defaultVariants).toEqual({ on: false, size: "md" });
        expect(req((recipe.compoundVariants as Obj[])[0])).toMatchObject({
            on: true,
            size: "sm",
        });
    });
});

describe("compilePreset (color schemes)", () => {
    const config = {
        tokens: {
            colors: { ink: hex("#111111"), paper: hex("#eeeeee") },
        },
        semanticTokens: {
            colors: {
                text: when(
                    "dark",
                    alias("tokens", "colors", "paper"),
                    alias("tokens", "colors", "ink"),
                ),
            },
        },
        components: {
            label: defineComponent({
                name: "label",
                recipe: {
                    base: { color: alias("semanticTokens", "colors", "text") },
                },
            }),
        },
    };
    const preset = compilePreset(config);
    const theme = obj(preset.theme);

    it("emits a scheme-dependent semantic token as a Panda conditional token", () => {
        expect(obj(obj(theme.semanticTokens).colors).text).toEqual({
            value: { base: "{colors.ink}", _dark: "{colors.paper}" },
        });
    });

    it("keeps a recipe's alias to that token as a token ref", () => {
        expect(obj(obj(obj(theme.recipes).label).base).color).toBe(
            "token(colors.text)",
        );
    });

    it("follows the system scheme unless a class overrides it", () => {
        expect(obj(obj(preset.conditions).extend).dark).toEqual({
            "@media (prefers-color-scheme: dark)": {
                ":root:not(.light) &": "@slot",
            },
            ".dark &": "@slot",
        });
    });

    it("declares both schemes to the browser only when a token varies by scheme", () => {
        expect(obj(preset.globalCss)[":root"]).toEqual({
            colorScheme: "light dark",
        });
        expect(compilePreset(buttonConfig).globalCss).toBeUndefined();
    });
});

describe("compilePreset (themes)", () => {
    const preset = compilePreset({
        ...buttonConfig,
        themes: {
            brand: {
                tokens: { fontSize: { body: px(18) }, radii: { md: px(2) } },
                semanticTokens: { colors: { brand: hex("#ff0000") } },
                fonts: { plain: fontFamily(["Inter"], "sans-serif") },
                durations: { fast: numeric(80, "ms") },
                easings: { standard: cubicBezier([0, 0, 1, 1]) },
            },
        },
    });
    const brand = (preset.themes as Record<string, any>).brand;

    it("maps theme token groups to Panda categories", () => {
        expect(brand.tokens.fontSizes.body).toEqual({ value: "18px" });
        expect(brand.tokens.radii.md).toEqual({ value: "2px" });
    });

    it("carries fonts and motion into the theme's tokens", () => {
        expect(brand.tokens.fonts.plain.value).toContain("Inter");
        expect(brand.tokens.durations.fast).toEqual({ value: "80ms" });
        expect(brand.tokens.easings.standard).toEqual({
            value: "cubic-bezier(0, 0, 1, 1)",
        });
    });

    it("keeps semantic overrides", () => {
        expect(brand.semanticTokens.colors.brand).toEqual({
            value: "rgb(255 0 0)",
        });
    });
});

describe("compilePreset (theme component tokens)", () => {
    it("sets a theme's component token overrides under its selector", () => {
        const preset = compilePreset({
            ...buttonConfig,
            themes: {
                brand: {
                    components: { button: { tokens: { radius: px(2) } } },
                },
            },
        });
        expect(obj(preset.globalCss)["[data-panda-theme=brand]"]).toEqual({
            "--components-button-radius": "2px",
        });
    });

    it("applies the var prefix", () => {
        const preset = compilePreset(
            {
                ...buttonConfig,
                themes: {
                    brand: {
                        components: { button: { tokens: { radius: px(2) } } },
                    },
                },
            },
            { prefix: "pf" },
        );
        expect(obj(preset.globalCss)["[data-panda-theme=brand]"]).toEqual({
            "--pf-components-button-radius": "2px",
        });
    });
});

describe("compilePreset (typed component tokens)", () => {
    it("registers them as global vars, so they transition", () => {
        const meter = defineComponent({
            name: "meter",
            tokens: {
                value: dynamic(
                    ["components", "meter", "value"],
                    numeric(0, "none"),
                    "number",
                ),
            },
            recipe: { base: {} },
        });
        const preset = compilePreset({
            ...buttonConfig,
            components: { ...buttonConfig.components, meter },
        }) as unknown as { globalVars: Record<string, unknown> };
        expect(preset.globalVars["--components-meter-value"]).toEqual({
            syntax: "<number>",
            inherits: true,
            initialValue: "0",
        });
    });

    it("sets tokens a variant points elsewhere as custom properties", () => {
        const meter = defineComponent({
            name: "meter",
            tokens: {
                value: dynamic(
                    ["components", "meter", "value"],
                    numeric(0, "none"),
                    "number",
                ),
            },
            recipe: {
                base: {},
                variants: {
                    full: {
                        yes: {
                            tokens: {
                                "components.meter.value": numeric(1, "none"),
                            },
                        },
                    },
                },
            },
        });
        const preset = compilePreset({
            ...buttonConfig,
            components: { ...buttonConfig.components, meter },
        });
        const recipe = obj(obj(obj(preset.theme).recipes).meter);
        expect(obj(obj(recipe.variants).full).yes).toEqual({
            "--components-meter-value": "1",
        });
    });
});
