// The table's sort arrow turns over (design doc §5.8.1) while it points descending: its column is
// sorted that way, or is unsorted and a press would sort it that way (`sortStart`). The arrow is
// always drawn pointing up, so the turn is a 180° rotation in its computed transform.

import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { table } from "./components/table";
import { mountCase, settlePlaced } from "./harness/page";
import type { SceneProps } from "./harness/scene";

const ids = testIds.dataTable;

/** The arrow's turn in degrees, from its computed transform: 0 upright, 180 turned over. */
const angle = (arrow: Element): number => {
    const { a, b } = new DOMMatrix(getComputedStyle(arrow).transform);
    return Math.abs(Math.round((Math.atan2(b, a) * 180) / Math.PI));
};

/** Mounts the table and returns each sortable column's arrow turn, by column id. The columns
 *  are, in order, "name" and "weight". */
const arrows = async (props: SceneProps) => {
    const scene = mountCase(table, props, { provider: { motion: "reduce" } });
    await settlePlaced();
    const [name, weight] = scene.host.querySelectorAll(
        `[data-testid="${ids.sortIndicator}"]`,
    );
    const turned = { name: angle(name!), weight: angle(weight!) };
    return (column: keyof typeof turned) => turned[column];
};

describe("Table sort arrow", () => {
    it("points up on an unsorted and an ascending column", async () => {
        const turned = await arrows({
            defaultSort: { column: "name", direction: "ascending" },
        });
        expect(turned("name")).toBe(0);
        expect(turned("weight")).toBe(0);
    });

    it("turns over on a column sorted descending", async () => {
        const turned = await arrows({
            defaultSort: { column: "weight", direction: "descending" },
        });
        expect(turned("name")).toBe(0);
        expect(turned("weight")).toBe(180);
    });

    it("hints the way a click would sort: turned on every unsorted column when sortStart is descending", async () => {
        const turned = await arrows({ sortStart: "descending" });
        expect(turned("name")).toBe(180);
        expect(turned("weight")).toBe(180);
    });

    it("turns back on a column sorted ascending even when sortStart is descending", async () => {
        const turned = await arrows({
            sortStart: "descending",
            defaultSort: { column: "name", direction: "ascending" },
        });
        expect(turned("name")).toBe(0);
        expect(turned("weight")).toBe(180);
    });
});
