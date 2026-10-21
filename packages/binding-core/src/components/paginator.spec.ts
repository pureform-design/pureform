import { describe, expect, it } from "vitest";

import {
    paginatorClampPage,
    paginatorMachineProps,
    paginatorPageAfterSize,
    paginatorPageSizes,
    paginatorRange,
    paginatorRangeLabel,
    paginatorSelection,
    paginatorSizeItems,
    paginatorTotalPages,
    paginatorTriggerProps,
} from "./paginator";

describe("paginator", () => {
    it("offers the page sizes once, smallest first, with the current one", () => {
        expect(paginatorPageSizes(undefined, 10)).toEqual([10, 25, 50, 100]);
        expect(paginatorPageSizes([50, 5, 10], 20)).toEqual([5, 10, 20, 50]);
        expect(paginatorSizeItems([5, 10])).toEqual([
            { value: "5", label: "5" },
            { value: "10", label: "10" },
        ]);
    });

    it("counts pages, and keeps a page in range", () => {
        expect(paginatorTotalPages(95, 10)).toBe(10);
        expect(paginatorTotalPages(0, 10)).toBe(0);
        expect(paginatorClampPage(11, 95, 10)).toBe(10);
        expect(paginatorClampPage(0, 95, 10)).toBe(1);
        expect(paginatorClampPage(3, 0, 10)).toBe(1);
    });

    it("keeps the first item shown when the page size changes", () => {
        expect(paginatorPageAfterSize(4, 10, 25)).toBe(2);
        expect(paginatorPageAfterSize(1, 10, 50)).toBe(1);
        expect(paginatorPageAfterSize(6, 10, 5)).toBe(11);
    });

    it("words the range as Angular does", () => {
        expect(paginatorRange(1, 10, 95)).toEqual({
            start: 1,
            end: 10,
            count: 95,
        });
        expect(paginatorRange(10, 10, 95)).toEqual({
            start: 91,
            end: 95,
            count: 95,
        });
        expect(paginatorRangeLabel(paginatorRange(2, 10, 95))).toBe(
            "11 – 20 of 95",
        );
        expect(paginatorRangeLabel(paginatorRange(1, 10, 0))).toBe("0 of 0");
        expect(
            paginatorRangeLabel(paginatorRange(1, 10, 95), {
                range: ({ start, end, count }) => `${start}-${end}/${count}`,
            }),
        ).toBe("1-10/95");
    });

    it("maps the words onto Zag's translations, and disables the triggers", () => {
        expect(
            paginatorMachineProps({
                count: 5,
                translations: { nextPage: "Weiter" },
            }).translations.nextTriggerLabel,
        ).toBe("Weiter");
        expect(paginatorMachineProps({}).count).toBe(0);
        expect(paginatorTriggerProps({ type: "button" }, true)).toMatchObject({
            disabled: true,
        });
        const props = { type: "button" };
        expect(paginatorTriggerProps(props, false)).toBe(props);
        expect(paginatorSelection({ tokens: undefined })).toEqual({
            tokens: undefined,
        });
    });
});
