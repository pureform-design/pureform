import { describe, expect, it } from "vitest";

import {
    codeFieldBackspace,
    codeFieldCells,
    codeFieldComplete,
    codeFieldEnter,
    codeFieldMachineProps,
    codeFieldString,
} from "./code-field";

describe("code field", () => {
    const empty = codeFieldCells(undefined, 4);

    it("pads or cuts the value to the cells", () => {
        expect(empty).toEqual(["", "", "", ""]);
        expect(codeFieldCells(["1", "2", "3", "4", "5"], 4)).toEqual([
            "1",
            "2",
            "3",
            "4",
        ]);
    });

    it("fills a cell and moves on, dropping characters the type doesn't take", () => {
        expect(codeFieldEnter(empty, 0, "7", "numeric")).toEqual({
            cells: ["7", "", "", ""],
            focus: 1,
        });
        expect(codeFieldEnter(empty, 1, "a", "numeric")).toEqual({
            cells: empty,
            focus: 1,
        });
        expect(codeFieldEnter(empty, 3, "9", "numeric").focus).toBe(3);
    });

    it("fills every cell from a pasted code, wherever it lands", () => {
        const { cells, focus } = codeFieldEnter(empty, 2, "12-34", "numeric");
        expect(cells).toEqual(["1", "2", "3", "4"]);
        expect(focus).toBe(3);
        expect(codeFieldComplete(cells)).toBe(true);
        expect(codeFieldString(cells)).toBe("1234");
    });

    it("removes on Backspace, moving the characters after up, then moves back", () => {
        expect(codeFieldBackspace(["1", "2", "3", ""], 1)).toEqual({
            cells: ["1", "3", "", ""],
            focus: 0,
        });
        const cells = ["1", "2", "", ""];
        expect(codeFieldBackspace(cells, 1)).toEqual({
            cells: ["1", "", "", ""],
            focus: 0,
        });
        expect(codeFieldBackspace(cells, 2)).toEqual({
            cells: ["1", "", "", ""],
            focus: 1,
        });
    });

    it("gives Zag the cell count, numeric cells and an empty placeholder by default", () => {
        expect(codeFieldMachineProps({})).toMatchObject({
            count: 4,
            type: "numeric",
            placeholder: "",
        });
        expect(codeFieldMachineProps({ error: "Wrong" }).invalid).toBe(true);
    });
});
