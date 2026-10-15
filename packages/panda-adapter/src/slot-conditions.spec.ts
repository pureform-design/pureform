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

    it("nests a case that needs every condition under the shorter one's base", () => {
        const color = recipe().base.label?.color as Record<string, unknown>;
        expect(color[`.field__root${INVALID}${INVALID}${INVALID} &`]).toEqual({
            base: "rgb(51 51 51)",
            [`.field__container${FOCUS}${FOCUS} &`]: "rgb(68 68 68)",
        });
    });

    it("prefixes slot classes with Panda's prefix", () => {
        const color = recipe("pf").base.label?.color as Record<string, unknown>;
        expect(color).toHaveProperty([
            `.pf-field__container${FOCUS}${FOCUS} &`,
        ]);
    });
});
