// Where each component shows indication, checked against its styles: every declared surface
// draws a state layer from the component's own opacities, every declared focus part draws the
// focus indicator from its own tokens, and every component that draws a state layer declares
// where. Each such component sets its indication tokens back to the theme's on its root.

import { px } from "@pureform/core/ast";
import type { SlottedComponentSpec } from "@pureform/core/types";
import { materialState } from "@pureform/material";
import { describe, expect, it } from "vitest";

import { pureform } from "./pureform";
import { INDICATION_TOKENS } from "./state-layer";

const { components } = pureform();

const slotted = Object.values(components).filter(
    (spec): spec is SlottedComponentSpec => spec.kind === "slotComponent",
);

// Every style a slot takes: its base, each variant value's, and each compound's.
const slotStyles = (spec: SlottedComponentSpec, slot: string): unknown[] => {
    const { base, variants = {}, compoundVariants = [] } = spec.recipe;
    return [
        base[slot],
        ...Object.values(variants).flatMap((values) =>
            Object.values(values).map((bySlot) => bySlot[slot]),
        ),
        ...compoundVariants.map((compound) => compound.style[slot]),
    ].filter(Boolean);
};

// Whether a slot's styles read one of the component's own tokens.
const reads = (spec: SlottedComponentSpec, slot: string, token: string) =>
    slotStyles(spec, slot).some((style) =>
        JSON.stringify(style).includes(
            JSON.stringify(["components", spec.name, token]),
        ),
    );

const drawsStateLayer = (spec: SlottedComponentSpec) =>
    spec.slots.some((slot) => reads(spec, slot, "stateHoverOpacity"));

// Draws a state layer, but its field draws its own active indicator: no indication.
const WITHOUT_INDICATION = new Set(["searchBar"]);

const declaring = slotted.filter((spec) => spec.indication);

describe("indication", () => {
    it("is declared by every component that draws a state layer", () => {
        expect(
            slotted
                .filter(
                    (spec) =>
                        drawsStateLayer(spec) &&
                        !WITHOUT_INDICATION.has(spec.name),
                )
                .map((spec) => spec.name)
                .sort(),
        ).toEqual(declaring.map((spec) => spec.name).sort());
    });

    it.each(declaring.map((spec) => [spec.name, spec] as const))(
        "%s's surface draws its state layer and its focus part its focus indicator",
        (_, spec) => {
            for (const entry of spec.indication!) {
                for (const part of [
                    entry.trigger,
                    entry.surface,
                    entry.focus,
                ]) {
                    expect(spec.slots).toContain(part);
                }
                expect(reads(spec, entry.surface, "stateHoverOpacity")).toBe(
                    true,
                );
                expect(reads(spec, entry.surface, "statePressedOpacity")).toBe(
                    true,
                );
                for (const token of [
                    "focusIndicatorThickness",
                    "focusIndicatorOuterOffset",
                    "focusIndicatorColor",
                ]) {
                    expect(reads(spec, entry.focus, token)).toBe(true);
                }
            }
        },
    );

    it.each(
        slotted
            .filter(drawsStateLayer)
            .map((spec) => [spec.name, spec] as const),
    )(
        "%s sets its indication tokens back to the theme's on its root",
        (_, spec) => {
            const root = spec.recipe.base.root as { tokens?: object };
            expect(root.tokens).toMatchObject(
                Object.fromEntries(
                    Object.entries(INDICATION_TOKENS).map(([token, value]) => [
                        `components.${spec.name}.${token}`,
                        value,
                    ]),
                ),
            );
            for (const token of Object.keys(INDICATION_TOKENS)) {
                expect(spec.tokens?.[token]).toMatchObject({
                    default:
                        INDICATION_TOKENS[
                            token as keyof typeof INDICATION_TOKENS
                        ],
                });
            }
        },
    );
});

describe("focus ring", () => {
    const inset = materialState({}, {}, { focusRing: "inset" });

    it("is outer by default, and an explicit outer changes nothing", () => {
        const outer = pureform({
            state: materialState({}, {}, { focusRing: "outer" }),
        });
        expect(JSON.stringify(outer)).toBe(JSON.stringify(pureform()));
        expect(pureform().tokens.sizes?.focusIndicatorOuterOffset).toEqual(
            px(2),
        );
    });

    it("moves inside the element under an inset theme, at minus its thickness", () => {
        expect(
            pureform({ state: inset }).tokens.sizes?.focusIndicatorOuterOffset,
        ).toEqual(px(-3));
        const thick = pureform({
            state: materialState(
                {},
                { focusIndicatorThickness: 4, focusIndicatorOuterOffset: 6 },
                { focusRing: "inset" },
            ),
        });
        expect(thick.tokens.sizes?.focusIndicatorOuterOffset).toEqual(px(-4));
    });

    it("changes only the theme's offset, so every component's focus part follows it", () => {
        const config = pureform({ state: inset });
        expect(JSON.stringify(config.components)).toBe(
            JSON.stringify(pureform().components),
        );
        const { focusIndicatorOuterOffset: _, ...sizes } =
            config.tokens.sizes ?? {};
        const { focusIndicatorOuterOffset: __, ...defaults } =
            pureform().tokens.sizes ?? {};
        expect(sizes).toEqual(defaults);
    });

    it("can be a named theme's choice", () => {
        const config = pureform({ themes: { inset: { state: inset } } });
        expect(JSON.stringify(config.themes?.inset)).toContain(
            "focusIndicatorOuterOffset",
        );
        expect(config.tokens.sizes?.focusIndicatorOuterOffset).toEqual(px(2));
    });
});
