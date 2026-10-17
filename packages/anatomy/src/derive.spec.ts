import { defineComponent, defineSlotComponent } from "@pureform/core";
import { scaleX, transform, unitless } from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import { deriveAnatomies, deriveAnatomy, renderAnatomyModule } from "./derive";

const flipped = {
    states: {
        rtl: {
            states: {
                mirrored: { transform: transform(scaleX(unitless(-1))) },
            },
        },
    },
};

const card = defineSlotComponent({
    name: "mediaCard",
    slots: ["root", "media", "body", "headline", "actionIcon"],
    structure: { root: ["media", "body"], body: ["headline", "actionIcon"] },
    recipe: {
        base: { root: {} },
        variants: { tone: { loud: { actionIcon: flipped } } },
    },
});

describe("deriveAnatomy", () => {
    it("makes one part per slot, nested as structure says", () => {
        const anatomy = deriveAnatomy(card);
        expect(anatomy.name).toBe("mediaCard");
        expect(anatomy.scope).toBe("media-card");
        expect(anatomy.root).toBe("root");
        expect(anatomy.partNames).toEqual([
            "root",
            "media",
            "body",
            "headline",
            "actionIcon",
        ]);
        expect(anatomy.parts.root).toMatchObject({
            parent: null,
            children: ["media", "body"],
        });
        expect(anatomy.parts.body).toMatchObject({
            parent: "root",
            children: ["headline", "actionIcon"],
        });
        expect(anatomy.parts.actionIcon).toEqual({
            name: "actionIcon",
            attribute: "action-icon",
            testId: "pf-media-card-action-icon",
            parent: "body",
            children: [],
            styled: true,
            mirror: true,
        });
    });

    it("marks a part mirror only when one of its styles reads mirrored", () => {
        const anatomy = deriveAnatomy(card);
        expect(
            anatomy.partNames.filter((part) => anatomy.parts[part]!.mirror),
        ).toEqual(["actionIcon"]);
        const compound = defineSlotComponent({
            name: "x",
            slots: ["root", "icon"],
            structure: { root: ["icon"] },
            recipe: {
                base: {},
                compoundVariants: [{ match: {}, style: { icon: flipped } }],
            },
        });
        expect(deriveAnatomy(compound).parts.icon!.mirror).toBe(true);
    });

    it("says where it shows indication, as the spec declares it", () => {
        expect(deriveAnatomy(card).indication).toBeUndefined();
        const pressable = defineSlotComponent({
            name: "pressable",
            slots: ["root", "surface"],
            structure: { root: ["surface"] },
            indication: [
                {
                    trigger: "root",
                    surface: "surface",
                    centered: true,
                    focus: "root",
                },
            ],
            recipe: { base: {} },
        });
        expect(deriveAnatomy(pressable).indication).toEqual([
            {
                trigger: "root",
                surface: "surface",
                centered: true,
                focus: "root",
            },
        ]);
        expect(() =>
            deriveAnatomy({
                ...pressable,
                indication: [
                    {
                        trigger: "root",
                        surface: "layer",
                        centered: false,
                        focus: "root",
                    },
                ],
            }),
        ).toThrow('pressable: indication names "layer", which is not a part');
    });

    it("gives a single-slot component a root part", () => {
        const icon = defineComponent({
            name: "glyph",
            recipe: { base: flipped },
        });
        expect(deriveAnatomy(icon)).toEqual({
            name: "glyph",
            scope: "glyph",
            root: "root",
            partNames: ["root"],
            parts: {
                root: {
                    name: "root",
                    attribute: "root",
                    testId: "pf-glyph-root",
                    parent: null,
                    children: [],
                    styled: true,
                    mirror: true,
                },
            },
        });
    });

    it("adds extra parts after the slots, unstyled", () => {
        const anatomy = deriveAnatomy(card, [
            { name: "hiddenInput", parent: "body" },
        ]);
        expect(anatomy.partNames.at(-1)).toBe("hiddenInput");
        expect(anatomy.parts.body!.children).toEqual([
            "headline",
            "actionIcon",
            "hiddenInput",
        ]);
        expect(anatomy.parts.hiddenInput).toMatchObject({
            parent: "body",
            styled: false,
            mirror: false,
            testId: "pf-media-card-hidden-input",
        });
    });

    it("takes the select's hidden select by default", () => {
        const select = defineSlotComponent({
            name: "select",
            slots: ["root", "input"],
            structure: { root: ["input"] },
            recipe: { base: {} },
        });
        expect(deriveAnatomy(select).partNames).toEqual([
            "root",
            "input",
            "hiddenSelect",
        ]);
    });

    it("rejects a slot nested twice, an unknown slot, or a misplaced extra", () => {
        const twice = defineSlotComponent({
            name: "twice",
            slots: ["root", "a", "b"],
            structure: { root: ["a", "b"], a: ["b"] },
            recipe: { base: {} },
        });
        expect(() => deriveAnatomy(twice)).toThrow(
            'twice: part "b" sits in both "root" and "a"',
        );
        expect(() =>
            deriveAnatomy({
                ...card,
                structure: { root: ["missing"] },
            } as typeof card),
        ).toThrow('mediaCard: structure names "missing", which is not a slot');
        expect(() =>
            deriveAnatomy(card, [{ name: "media", parent: "root" }]),
        ).toThrow('mediaCard: extra part "media" is a slot');
        expect(() =>
            deriveAnatomy(card, [{ name: "x", parent: "nowhere" }]),
        ).toThrow(
            'mediaCard: extra part "x" sits in "nowhere", which is not a slot',
        );
    });

    it("picks the first outermost slot as root when none is named root", () => {
        const loose = defineSlotComponent({
            name: "loose",
            slots: ["frame", "inner"],
            structure: { frame: ["inner"] },
            recipe: { base: {} },
        });
        expect(deriveAnatomy(loose).root).toBe("frame");
    });
});

describe("renderAnatomyModule", () => {
    it("writes a constant per component, the map, and the test ids", () => {
        const source = renderAnatomyModule(
            deriveAnatomies({ mediaCard: card }),
            { header: "// header" },
        );
        expect(source.startsWith("// header\n")).toBe(true);
        expect(source).toContain(
            'import type { ComponentAnatomy } from "@pureform/anatomy";',
        );
        expect(source).toContain(
            "export const mediaCardAnatomy = {" +
                JSON.stringify(deriveAnatomy(card)).slice(1) +
                " as const satisfies ComponentAnatomy;",
        );
        expect(source).toContain(
            "export const anatomy = { mediaCard: mediaCardAnatomy } as const;",
        );
        expect(source).toContain('"actionIcon":"pf-media-card-action-icon"');
    });
});
