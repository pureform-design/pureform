import { describe, expect, it } from "vitest";

import {
    SPLITTER_ANCHORS,
    splitterInitialSizes,
    splitterLimits,
    splitterMachineProps,
    splitterMoveBy,
    splitterSizeProps,
    splitterPercent,
    splitterSnap,
    splitterTriggerProps,
} from "./splitter";

const FREE = [
    { min: 0, max: 100 },
    { min: 0, max: 100 },
];

const near = (sizes: number[]) =>
    sizes.map((size) => Math.round(size * 100) / 100);

describe("splitter", () => {
    it("reads sizes in percent or pixels of the room", () => {
        expect(splitterPercent(30, 1000, 0)).toBe(30);
        expect(splitterPercent("40%", 1000, 0)).toBe(40);
        expect(splitterPercent("250px", 1000, 0)).toBe(25);
        expect(splitterPercent(undefined, 1000, 7)).toBe(7);
        expect(
            splitterLimits([{ id: "a", minSize: "100px" }, { id: "b" }], 1000),
        ).toEqual([
            { min: 10, max: 100 },
            { min: 0, max: 100 },
        ]);
    });

    it("shares out the room the given sizes leave", () => {
        expect(
            splitterInitialSizes(
                [{ id: "a" }, { id: "b" }, { id: "c" }],
                [40],
                1000,
            ),
        ).toEqual([40, 30, 30]);
        expect(
            splitterInitialSizes([{ id: "a" }, { id: "b" }], undefined, 0),
        ).toEqual([50, 50]);
    });

    it("moves a divider, stopping at its panes' limits", () => {
        expect(splitterMoveBy([50, 50], 0, 10, FREE)).toEqual([60, 40]);
        expect(
            splitterMoveBy([50, 50], 0, -45, [
                { min: 20, max: 100 },
                { min: 0, max: 100 },
            ]),
        ).toEqual([20, 80]);
        expect(splitterMoveBy([30, 30, 40], 1, 50, FREE)).toEqual([30, 70, 0]);
    });

    it("snaps to the nearest of Compose's anchors when let go slowly", () => {
        const snap = (first: number) =>
            near(
                splitterSnap({
                    sizes: [first, 100 - first],
                    index: 0,
                    room: 1000,
                    anchors: SPLITTER_ANCHORS,
                    limits: FREE,
                }),
            );
        expect(snap(20)).toEqual([24, 76]); // 240px from the start
        expect(snap(45)).toEqual([50, 50]);
        expect(snap(80)).toEqual([76, 24]); // 240px from the end
        expect(snap(5)).toEqual([0, 100]);
    });

    it("snaps to the next anchor the way it was flung", () => {
        const fling = (velocity: number) =>
            near(
                splitterSnap({
                    sizes: [45, 55],
                    index: 0,
                    room: 1000,
                    anchors: SPLITTER_ANCHORS,
                    limits: FREE,
                    velocity,
                }),
            );
        expect(fling(0)).toEqual([50, 50]);
        expect(fling(-500)).toEqual([24, 76]);
        expect(fling(500)).toEqual([50, 50]);
        expect(fling(150)).toEqual([50, 50]);
    });

    it("stops an anchor at a pane's least size, and stays without anchors", () => {
        expect(
            splitterSnap({
                sizes: [5, 95],
                index: 0,
                room: 1000,
                anchors: SPLITTER_ANCHORS,
                limits: [
                    { min: 30, max: 100 },
                    { min: 0, max: 100 },
                ],
            }),
        ).toEqual([30, 70]);
        expect(
            splitterSnap({
                sizes: [33, 67],
                index: 0,
                room: 1000,
                anchors: [],
                limits: FREE,
            }),
        ).toEqual([33, 67]);
    });

    it("maps Root's props onto Zag's and names the divider", () => {
        const onSizeChange = () => {};
        const panels = [{ id: "a" }, { id: "b" }];
        expect(
            splitterMachineProps({ panels, orientation: "vertical" })
                .orientation,
        ).toBe("vertical");
        const sizes = splitterSizeProps(
            { defaultSize: [30, 70], onSizeChange },
            panels,
        );
        expect(sizes.defaultSize).toEqual([30, 70]);
        expect(sizes.onResize).toBeTypeOf("function");
        // Without sizes, the panes share the room from the first render.
        expect(splitterSizeProps({}, panels).defaultSize).toEqual([50, 50]);
        expect(
            splitterSizeProps({ size: [20, 80] }, panels).defaultSize,
        ).toBeUndefined();
        expect(splitterTriggerProps({ dragging: true })).toEqual({
            "aria-label": "Resize panes",
            "data-pf-active": "",
        });
        expect(
            splitterTriggerProps({ label: "Resize list", dragging: false }),
        ).toEqual({ "aria-label": "Resize list", "data-pf-active": undefined });
    });
});
