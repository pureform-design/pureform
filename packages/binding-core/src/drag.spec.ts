import { describe, expect, it } from "vitest";

import { chooseAnchor, createDragVelocity } from "./drag";

describe("createDragVelocity", () => {
    it("measures a drag's speed over its last moves", () => {
        const drag = createDragVelocity();
        drag.add(0, 0);
        drag.add(10, 50);
        drag.add(30, 100);
        expect(drag.velocity()).toBe(300);
        drag.add(30, 250);
        expect(drag.velocity()).toBe(0);
        drag.reset();
        expect(drag.velocity()).toBe(0);
    });
});

describe("chooseAnchor", () => {
    const anchors = [0, 100, 300];
    const choose = (
        at: number,
        velocity: number,
        positional?: (distance: number) => number,
    ) =>
        chooseAnchor({
            anchors,
            at,
            velocity,
            velocityThreshold: 10,
            positionalThreshold: positional,
        });

    it("takes the nearest below the threshold without a positional one", () => {
        expect(choose(40, 5)).toBe(0);
        expect(choose(60, -5)).toBe(1);
        expect(choose(250, 0)).toBe(2);
    });

    it("takes the next one the way it was flung, or the nearest past the last", () => {
        expect(choose(10, 20)).toBe(1);
        expect(choose(100, 20)).toBe(2);
        expect(choose(110, -20)).toBe(1);
        expect(choose(300, 20)).toBe(2);
        expect(choose(0, -20)).toBe(0);
    });

    it("goes on past a positional threshold from the one behind, as Compose", () => {
        const half = (distance: number) => distance / 2;
        expect(choose(40, 5, half)).toBe(0);
        expect(choose(60, 5, half)).toBe(1);
        expect(choose(60, -5, half)).toBe(1);
        expect(choose(40, -5, half)).toBe(0);
        expect(choose(130, 5, () => 56)).toBe(1);
        expect(choose(160, 5, () => 56)).toBe(2);
        expect(choose(40, 0, () => 10)).toBe(0);
    });

    it("has nothing to choose without anchors", () => {
        expect(
            chooseAnchor({
                anchors: [],
                at: 0,
                velocity: 0,
                velocityThreshold: 1,
            }),
        ).toBe(-1);
    });
});
