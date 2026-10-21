import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { table } from "./table";

const json = (value: unknown) => JSON.stringify(value);

describe("table", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(table)).not.toThrow();
        expect(pureform().components.dataTable).toBeDefined();
    });

    it("has Angular's table and sort header parts", () => {
        expect(table.slots).toEqual([
            "root",
            "header",
            "body",
            "footer",
            "headerRow",
            "row",
            "alternateRow",
            "footerRow",
            "headerCell",
            "cell",
            "footerCell",
            "selectionCell",
            "sortHeader",
            "sortLabel",
            "sortIndicator",
        ]);
    });

    it("has a sticky header and density, and no compounds", () => {
        expect(Object.keys(table.recipe.variants ?? {})).toEqual([
            "stickyHeader",
            "density",
        ]);
        expect(table.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("sets density through the root's offset token, which every row's height adds", () => {
        const dense = table.recipe.variants?.density?.["-2"];
        expect(Object.keys(dense ?? {})).toEqual(["root"]);
        expect(Object.keys(dense?.root ?? {})).toEqual(["tokens"]);
        for (const slot of [
            "headerRow",
            "row",
            "alternateRow",
            "footerRow",
        ] as const) {
            expect(json(table.recipe.base?.[slot]?.minHeight)).toContain(
                "densityOffset",
            );
        }
    });

    it("sticks the header on the web only", () => {
        const header = json(table.recipe.variants?.stickyHeader?.true?.header);
        expect(header).toContain('"type":"platform"');
        expect(header).toContain("sticky");
        expect(header).toContain("insetBlockStart");
    });

    it("draws stripes from their own token, and selected rows from the selected tokens", () => {
        expect(json(table.recipe.base?.alternateRow)).toContain(
            "alternateContainer",
        );
        expect(json(table.recipe.base?.row)).not.toContain(
            "alternateContainer",
        );
        expect(json(table.recipe.base?.row)).toContain("selectedContainer");
    });

    it("declares indication on the sort header and fades the arrow in", () => {
        expect(table.indication?.map((entry) => entry.surface)).toEqual([
            "sortHeader",
        ]);
        const arrow = json(table.recipe.base?.sortIndicator);
        expect(arrow).toContain('"state":"filled"');
        expect(arrow).toContain("opacity");
    });

    it("uses logical properties only", () => {
        expect(json(table.recipe)).not.toMatch(
            /"(paddingLeft|paddingRight|marginLeft|marginRight|left|right|top|borderBottomWidth)"/,
        );
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(
            compilePreset(configWith(table)).theme?.slotRecipes?.dataTable,
        ).toMatchSnapshot();
    });
});
