import { describe, expect, it } from "vitest";

import { hex, slot, when } from "./ast";
import { defineConfig, defineComponent, defineSlotComponent } from "./define";
import { SlotConditionError } from "./path";

const field = (
    labelColor: ReturnType<typeof when>,
    structure?: { root?: string[]; container?: string[] },
) =>
    defineConfig({
        tokens: {},
        semanticTokens: {},
        components: {
            field: defineSlotComponent({
                name: "field",
                slots: ["root", "container", "label", "helper"],
                ...(structure
                    ? {
                          structure: structure as {
                              root?: (
                                  | "root"
                                  | "container"
                                  | "label"
                                  | "helper"
                              )[];
                          },
                      }
                    : {}),
                recipe: {
                    base: {
                        container: {
                            color: when(
                                slot("container", "focusWithin"),
                                hex("#00f"),
                                hex("#000"),
                            ),
                        },
                        label: { color: labelColor },
                    },
                },
            }),
        },
    });

const STRUCTURE = { root: ["container", "helper"], container: ["label"] };

describe("slot", () => {
    it("builds a slot condition", () => {
        expect(slot("container", "invalid")).toEqual({
            type: "slot",
            slot: "container",
            state: "invalid",
        });
    });
});

describe("slot condition validation", () => {
    it("lets a slot read its own state without structure", () => {
        expect(() =>
            field(when(slot("label", "hover"), hex("#f00"), hex("#000"))),
        ).not.toThrow();
    });

    it("lets a slot read an ancestor's state", () => {
        expect(() =>
            field(
                when(slot("root", "invalid"), hex("#f00"), hex("#000")),
                STRUCTURE,
            ),
        ).not.toThrow();
    });

    it("lets a slot read a descendant's state", () => {
        expect(() =>
            defineConfig({
                tokens: {},
                semanticTokens: {},
                components: {
                    field: defineSlotComponent({
                        name: "field",
                        slots: ["root", "container", "label", "helper"],
                        structure: {
                            root: ["container", "helper"],
                            container: ["label"],
                        },
                        recipe: {
                            base: {
                                root: {
                                    color: when(
                                        slot("label", "hover"),
                                        hex("#f00"),
                                        hex("#000"),
                                    ),
                                },
                            },
                        },
                    }),
                },
            }),
        ).not.toThrow();
    });

    it("needs structure to read another slot", () => {
        expect(() =>
            field(when(slot("container", "invalid"), hex("#f00"), hex("#000"))),
        ).toThrow(
            'field slot "label" reads slot "container"; declare structure to read another slot\'s state',
        );
    });

    it("rejects a slot that is not an ancestor", () => {
        expect(() =>
            field(
                when(slot("helper", "invalid"), hex("#f00"), hex("#000")),
                STRUCTURE,
            ),
        ).toThrow(SlotConditionError);
    });

    it("rejects an unknown slot", () => {
        expect(() =>
            field(when(slot("box", "invalid"), hex("#f00"), hex("#000"))),
        ).toThrow('field slot "label" reads unknown slot "box"');
    });

    it("rejects an unknown slot in structure", () => {
        expect(() =>
            field(when(slot("label", "hover"), hex("#f00"), hex("#000")), {
                root: ["box"],
            }),
        ).toThrow('field structure names unknown slot "box"');
    });

    it("rejects a slot condition outside a slotted component", () => {
        expect(() =>
            defineConfig({
                tokens: {},
                semanticTokens: {},
                components: {
                    plain: defineComponent({
                        name: "plain",
                        recipe: {
                            base: {
                                color: when(
                                    slot("root", "hover"),
                                    hex("#f00"),
                                    hex("#000"),
                                ),
                            },
                        },
                    }),
                },
            }),
        ).toThrow("only valid inside a slotted component's recipe");
    });

    it("types structure against the declared slots", () => {
        defineSlotComponent({
            name: "typed",
            slots: ["root", "label"],
            // @ts-expect-error "box" is not a declared slot
            structure: { root: ["box"] },
            recipe: { base: {} },
        });
    });
});
