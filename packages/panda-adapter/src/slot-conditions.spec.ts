import { defineConfig, defineSlotComponent } from "@pureform/core";
import { hex, slot, when } from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import { compilePreset } from "./preset";

const config = defineConfig({
    tokens: {},
    semanticTokens: {},
    components: {
        field: defineSlotComponent({
            name: "field",
            slots: ["root", "container", "label"],
            structure: { root: ["container"], container: ["label"] },
            recipe: {
                base: {
                    container: {
                        color: when()
                            .on(slot("container", "hover"), hex("#111"))
                            .on(slot("container", "focusWithin"), hex("#222"))
                            .else(hex("#000")),
                    },
                    label: {
                        color: when()
                            .on(slot("container", "focusWithin"), hex("#222"))
                            .on(slot("root", "invalid"), hex("#333"))
                            .on(
                                [
                                    slot("root", "invalid"),
                                    slot("container", "focusWithin"),
                                ],
                                hex("#444"),
                            )
                            .else(hex("#000")),
                    },
                },
            },
        }),
    },
});

type Slots = Record<string, { base: Record<string, Record<string, unknown>> }>;
const recipe = (pandaPrefix?: string) => {
    const preset = compilePreset(config, pandaPrefix ? { pandaPrefix } : {});
    const recipes = preset.theme?.slotRecipes as Slots;
    return recipes.field!;
};

const FOCUS = ":is(:focus-within, [data-focused])";
const INVALID =
    ":is([aria-invalid=true], :has([aria-invalid=true]), [data-invalid])";

describe("slot conditions", () => {
    it("lowers a slot's own state onto itself", () => {
        expect(recipe().base.container?.color).toEqual({
            base: "rgb(0 0 0)",
            "&:is(:hover, [data-hover])": "rgb(17 17 17)",
            [`&${FOCUS}${FOCUS}`]: "rgb(34 34 34)",
        });
    });

    it("lowers an ancestor's state onto its class, ranked by repetition", () => {
        const color = recipe().base.label?.color as Record<string, unknown>;
        expect(color[`.field__container${FOCUS}${FOCUS} &`]).toBe(
            "rgb(34 34 34)",
        );
    });

    it("joins a case on several slots into one selector, outermost first", () => {
        const color = recipe().base.label?.color as Record<string, unknown>;
        const invalid = `${INVALID}${INVALID}${INVALID}${INVALID}`;
        expect(color[`.field__root${invalid} &`]).toBe("rgb(51 51 51)");
        expect(
            color[`.field__root${invalid} .field__container${FOCUS}${FOCUS} &`],
        ).toBe("rgb(68 68 68)");
    });

    it("joins two states of one slot on the same element", () => {
        const both = defineConfig({
            tokens: {},
            semanticTokens: {},
            components: {
                box: defineSlotComponent({
                    name: "box",
                    slots: ["root", "mark"],
                    structure: { root: ["mark"] },
                    recipe: {
                        base: {
                            root: {
                                color: when(
                                    [
                                        slot("root", "invalid"),
                                        slot("root", "hover"),
                                    ],
                                    hex("#111"),
                                    hex("#000"),
                                ),
                            },
                            mark: {
                                color: when(
                                    [
                                        slot("root", "invalid"),
                                        slot("root", "hover"),
                                    ],
                                    hex("#111"),
                                    hex("#000"),
                                ),
                            },
                        },
                    },
                }),
            },
        });
        const recipes = compilePreset(both).theme?.slotRecipes as Slots;
        const invalid = `${INVALID}${INVALID}${INVALID}${INVALID}`;
        const hover = ":is(:hover, [data-hover])";
        expect(recipes.box?.base.root?.color).toEqual({
            base: "rgb(0 0 0)",
            [`&${invalid}${hover}`]: "rgb(17 17 17)",
        });
        expect(recipes.box?.base.mark?.color).toEqual({
            base: "rgb(0 0 0)",
            [`.box__root${invalid}${hover} &`]: "rgb(17 17 17)",
        });
    });

    it("prefixes slot classes with Panda's prefix", () => {
        const color = recipe("pf").base.label?.color as Record<string, unknown>;
        expect(color).toHaveProperty([
            `.pf-field__container${FOCUS}${FOCUS} &`,
        ]);
    });
});

describe("selected and pressed slot states", () => {
    const chipLike = defineConfig({
        tokens: {},
        semanticTokens: {},
        components: {
            chipLike: defineSlotComponent({
                name: "chipLike",
                slots: ["root", "icon"],
                structure: { root: ["icon"] },
                recipe: {
                    base: {
                        icon: {
                            color: when()
                                .on(slot("root", "selected"), hex("#111"))
                                .on(slot("root", "pressed"), hex("#222"))
                                .else(hex("#000")),
                        },
                    },
                },
            }),
        },
    });

    it("matches toggles and presses on the named slot", () => {
        const recipes = compilePreset(chipLike).theme?.slotRecipes as Slots;
        expect(recipes.chipLike?.base.icon?.color).toEqual({
            base: "rgb(0 0 0)",
            ".chipLike__root:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false]), [data-selected]) &":
                "rgb(17 17 17)",
            ".chipLike__root:is(:active, [data-pressed]):is(:active, [data-pressed]):is(:active, [data-pressed]) &":
                "rgb(34 34 34)",
        });
    });
});

describe("checked and indeterminate slot states", () => {
    it("match a checked or indeterminate input inside the slot", () => {
        const box = defineConfig({
            tokens: {},
            semanticTokens: {},
            components: {
                box: defineSlotComponent({
                    name: "box",
                    slots: ["root", "mark"],
                    structure: { root: ["mark"] },
                    recipe: {
                        base: {
                            mark: {
                                color: when()
                                    .on(slot("root", "checked"), hex("#111"))
                                    .on(
                                        slot("root", "indeterminate"),
                                        hex("#222"),
                                    )
                                    .else(hex("#000")),
                            },
                        },
                    },
                }),
            },
        });
        const recipes = compilePreset(box).theme?.slotRecipes as Slots;
        const CHECKED =
            ":is(:checked, :has(:checked), [aria-checked=true], [data-checked])";
        const MIXED =
            ":is(:indeterminate, :has(:indeterminate), [aria-checked=mixed], [data-indeterminate])";
        expect(recipes.box?.base.mark?.color).toEqual({
            base: "rgb(0 0 0)",
            [`.box__root${CHECKED} &`]: "rgb(17 17 17)",
            [`.box__root${MIXED}${MIXED} &`]: "rgb(34 34 34)",
        });
    });
});

describe("expanded slot state", () => {
    it("matches a control inside the slot whose popup is open", () => {
        const field = defineConfig({
            tokens: {},
            semanticTokens: {},
            components: {
                field: defineSlotComponent({
                    name: "field",
                    slots: ["root", "arrow"],
                    structure: { root: ["arrow"] },
                    recipe: {
                        base: {
                            arrow: {
                                color: when()
                                    .on(slot("root", "expanded"), hex("#111"))
                                    .else(hex("#000")),
                            },
                        },
                    },
                }),
            },
        });
        const recipes = compilePreset(field).theme?.slotRecipes as Slots;
        expect(recipes.field?.base.arrow?.color).toEqual({
            base: "rgb(0 0 0)",
            ".field__root:is([aria-expanded=true], :has([aria-expanded=true]), [data-expanded]) &":
                "rgb(17 17 17)",
        });
    });
});
