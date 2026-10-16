import { defineShape, morph, px, roundedPolygon } from "@pureform/core/ast";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { MATERIAL_SHAPES } from "../shapes";
import { createIconButton, iconButton } from "./icon-button";

describe("iconButton", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(iconButton)).not.toThrow();
    });

    it("draws the standard variant with no container", () => {
        const standard = iconButton.recipe.variants?.variant?.standard;
        expect(standard?.container?.backgroundColor).toMatchObject({
            type: "conditional",
            base: { type: "keyword", value: "transparent" },
        });
    });

    it("compiles to a stable Panda slot recipe", () => {
        // One shape keeps the snapshot readable; the shape tests cover the rest.
        const oneShape = createIconButton(undefined, undefined, {
            circle: MATERIAL_SHAPES.circle,
        });
        const preset = compilePreset(configWith(oneShape));
        expect(preset.theme?.slotRecipes).toMatchSnapshot();
    });
});

describe("toggle icon buttons", () => {
    const SELECTED =
        ".iconButton__root:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false]))";
    const accent = "var(--components-iconButton-accent, token(colors.primary))";
    const onAccent =
        "var(--components-iconButton-onAccent, token(colors.onPrimary))";

    // Container and content, unselected and selected, per fill, as Material's toggle icon
    // buttons draw them through the color group's tokens.
    const TOGGLES: Record<
        string,
        Record<"rest" | "selected", [string, string]>
    > = {
        standard: {
            rest: ["transparent", "token(colors.onSurfaceVariant)"],
            selected: ["transparent", accent],
        },
        filled: {
            rest: ["token(colors.surfaceContainerHighest)", accent],
            selected: [accent, onAccent],
        },
        tonal: {
            rest: [
                "token(colors.surfaceContainerHighest)",
                "token(colors.onSurfaceVariant)",
            ],
            selected: [
                "var(--components-iconButton-accentContainer, token(colors.primaryContainer))",
                "var(--components-iconButton-onAccentContainer, token(colors.onPrimaryContainer))",
            ],
        },
        outlined: {
            rest: ["transparent", "token(colors.onSurfaceVariant)"],
            selected: [
                "token(colors.inverseSurface)",
                "token(colors.inverseOnSurface)",
            ],
        },
        elevated: {
            rest: ["token(colors.surfaceContainerLow)", accent],
            selected: [accent, onAccent],
        },
    };

    type Css = Record<string, Record<string, unknown>>;

    // The compound variant a toggle of the given fill applies.
    const toggleCss = (variant: string): Css => {
        const compound = compilePreset(
            configWith(iconButton),
        ).theme?.slotRecipes?.iconButton?.compoundVariants?.find(
            (c) => c.variant === variant && c.toggle === true,
        );
        if (!compound) throw new Error(`no toggle compound for ${variant}`);
        return compound.css as Css;
    };

    const backgroundOf = (css: Css) =>
        css.container!.backgroundColor as Record<string, string>;

    it("offers toggle, off by default", () => {
        expect(iconButton.recipe.defaultVariants?.toggle).toBe("false");
    });

    it("draws Material's unselected and selected colors per fill", () => {
        const selectedRoot = `&${SELECTED.slice(".iconButton__root".length)}`;
        for (const [variant, { rest, selected }] of Object.entries(TOGGLES)) {
            const css = toggleCss(variant);
            const background = backgroundOf(css);
            const root = css.root!;
            expect([background.base, root.color], variant).toEqual(rest);
            expect(
                [
                    background[`${SELECTED} &`],
                    (root[selectedRoot] as { color: string }).color,
                ],
                variant,
            ).toEqual(selected);
        }
    });

    it("hides a selected outlined toggle's outline", () => {
        expect(toggleCss("outlined").outline).toEqual({
            display: { base: "flex", [`${SELECTED} &`]: "none" },
        });
    });

    it("keeps a faint container when a filled toggle is selected and disabled", () => {
        const background = backgroundOf(toggleCss("filled"));
        const key = Object.keys(background).find(
            (k) => k.startsWith(SELECTED) && k.includes(":disabled"),
        );
        expect(background[key!]).toBe(
            "color-mix(in srgb, transparent, token(colors.onSurface) token(opacity.disabledContainer))",
        );
    });
});

describe("iconButton shapes", () => {
    const recipe = () =>
        compilePreset(configWith(iconButton)).theme?.slotRecipes?.iconButton;

    it("offers none and Material's shapes", () => {
        const shapes = Object.keys(iconButton.recipe.variants?.shape ?? {});
        expect(shapes[0]).toBe("none");
        expect(shapes).toContain("cookie9Sided");
        expect(shapes).toHaveLength(36);
    });

    it("clips the container, keeping the corners where shapes aren't supported", () => {
        const circle = recipe()?.variants?.shape?.circle;
        expect(circle?.container?.clipPath).toMatch(/^shape\(from /);
        expect(circle?.container?.borderRadius).toMatchObject({
            "@supports (clip-path: shape(from 0 0, line to 0 0))": "0px",
        });
    });

    it("strokes a shaped outline as a ring", () => {
        const outline = recipe()?.variants?.shape?.heart?.outline;
        expect(outline?.clipPath).toMatch(/^shape\(evenodd from /);
    });

    it("leaves the root unclipped, casting elevation as drop shadows", () => {
        const { base, variants } = recipe() ?? {};
        expect(base?.root).not.toHaveProperty("clipPath");
        expect(variants?.variant?.filled?.root).toMatchObject({
            filterElevation: "level0",
        });
    });
});

describe("custom shapes", () => {
    it("come from pureform's shapes option", () => {
        const config = pureform({
            shapes: {
                ticket: defineShape(
                    roundedPolygon([
                        { at: [0, 0], rounding: 0.1 },
                        { at: [1, 0], rounding: 0.1 },
                        { at: [1, 1], rounding: 0.1 },
                        { at: [0, 1], rounding: 0.1 },
                    ]),
                    { fit: "fixed", size: px(40) },
                ),
            },
        });
        for (const name of ["iconButton", "fab"]) {
            const spec = config.components[name] as typeof iconButton;
            expect(
                Object.keys(spec.recipe.variants?.shape ?? {}),
                name,
            ).toEqual(["none", "ticket"]);
        }
        const css = compilePreset(config).theme?.slotRecipes?.iconButton;
        expect(css?.variants?.shape?.ticket?.container?.clipPath).toContain(
            "min(",
        );
    });
});

describe("morphing shapes", () => {
    const spec = createIconButton(undefined, undefined, {
        cookieToCircle: morph(
            MATERIAL_SHAPES.cookie9Sided,
            MATERIAL_SHAPES.circle,
        ),
    });
    const shape = () =>
        compilePreset(configWith(spec)).theme?.slotRecipes?.iconButton?.variants
            ?.shape?.cookieToCircle;

    it("rest as the first shape and change into the second while pressed", () => {
        const clip = shape()?.container?.clipPath as Record<string, string>;
        expect(clip.base).toMatch(/^shape\(/);
        const pressed = Object.entries(clip).find(([key]) =>
            key.includes(":active"),
        );
        expect(pressed?.[1]).toMatch(/^shape\(/);
        // Matching commands let the browser animate between them.
        const commands = (css: string) => css.match(/[a-z]+ to/g);
        expect(commands(pressed![1])).toEqual(commands(clip.base!));
    });

    it("animate the clip, and under reduced motion only the colors", () => {
        const transition = shape()?.container?.transition as Record<
            string,
            string
        >;
        expect(transition.base).toContain(
            "clip-path token(durations.medium2) token(easings.emphasized)",
        );
        expect(transition._motionReduce).not.toContain("clip-path");
        expect(transition._motionReduce).toContain(
            "background-color token(durations.short3)",
        );
        expect(transition._motionReduce).toContain(
            "box-shadow token(durations.medium1)",
        );
    });
});
