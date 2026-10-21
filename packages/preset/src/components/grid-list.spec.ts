import { describe, expect, it } from "vitest";

import { gridList } from "./grid-list";

describe("gridList", () => {
    it("has a tile, its media, a header and a footer under the root", () => {
        expect(gridList.slots).toEqual([
            "root",
            "tile",
            "content",
            "media",
            "header",
            "footer",
            "headline",
            "subhead",
        ]);
        expect(gridList.structure).toEqual({
            root: ["tile"],
            tile: ["content"],
            content: ["media", "header", "footer"],
            header: ["headline", "subhead"],
        });
    });

    it("sets tokens per group, with no compound", () => {
        const { variants, compoundVariants } = gridList.recipe;
        expect(compoundVariants ?? []).toHaveLength(0);
        expect(Object.keys(variants?.columns ?? {})).toEqual([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
        ]);
        expect(Object.keys(variants?.gutter ?? {})).toEqual([
            "none",
            "small",
            "medium",
            "large",
        ]);
        expect(Object.keys(variants?.aspect ?? {})).toEqual([
            "square",
            "landscape",
            "portrait",
            "wide",
        ]);
        for (const group of [
            variants?.columns,
            variants?.gutter,
            variants?.aspect,
        ]) {
            for (const style of Object.values(group ?? {})) {
                expect(Object.keys(style.root ?? {})).toEqual(["tokens"]);
            }
        }
    });

    it("lays the root out as a wrapping row and sizes each cell from the tokens", () => {
        const { root, tile, content, header, footer } =
            gridList.recipe.base ?? {};
        expect(root).toMatchObject({ flexWrap: { value: "wrap" } });
        expect(root?.marginInlineStart).toMatchObject({ type: "calc" });
        expect(tile?.width).toMatchObject({ type: "calc", op: "/" });
        expect(tile?.paddingInlineStart).toMatchObject({ type: "calc" });
        expect(content?.aspectRatio).toMatchObject({ type: "alias" });
        expect(header?.insetBlockStart).toBeDefined();
        expect(footer?.insetBlockEnd).toBeDefined();
    });
});
