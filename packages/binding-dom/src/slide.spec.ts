import { afterEach, describe, expect, it } from "vitest";

import { slideIndicator, slideTransform, transformTiming } from "./index";

afterEach(() => {
    document.body.innerHTML = "";
});

const timing = (
    transitionProperty: string,
    transitionDuration: string,
    transitionTimingFunction = "ease",
    transitionDelay = "0s",
) =>
    transformTiming({
        transitionProperty,
        transitionDuration,
        transitionDelay,
        transitionTimingFunction,
    });

// Two indicators in a row, as two tabs draw theirs: the first 40px wide at 0, the second 100px
// wide at 200.
const row = (transition = "transform 200ms linear") => {
    document.body.innerHTML = `
        <div style="position: relative; height: 10px; width: 400px">
            <span id="a" style="position: absolute; left: 0; width: 40px; height: 3px; transition: ${transition}"></span>
            <span id="b" style="position: absolute; left: 200px; width: 100px; height: 3px; transition: ${transition}"></span>
        </div>`;
    return [
        document.getElementById("a")!,
        document.getElementById("b")!,
    ] as const;
};

const box = (element: Element) => {
    const { left, width } = element.getBoundingClientRect();
    return { left: Math.round(left), width: Math.round(width) };
};

describe("transformTiming", () => {
    it("reads the transform's transition, in milliseconds", () => {
        expect(
            timing("transform", "0.25s", "cubic-bezier(0.2, 0, 0, 1)"),
        ).toEqual({
            duration: 250,
            delay: 0,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
        });
        expect(
            timing(
                "background-color, transform",
                "150ms, 300ms",
                "linear, cubic-bezier(0.3, 0, 0, 1)",
                "0s, 50ms",
            ),
        ).toEqual({
            duration: 300,
            delay: 50,
            easing: "cubic-bezier(0.3, 0, 0, 1)",
        });
        // Shorter lists repeat.
        expect(timing("color, all", "0.2s")).toMatchObject({ duration: 200 });
    });

    it("finds none without a transform transition, or one that takes no time", () => {
        expect(timing("opacity", "0.2s")).toBeUndefined();
        expect(timing("none", "0s")).toBeUndefined();
        expect(timing("transform", "0s")).toBeUndefined();
    });
});

describe("slideTransform", () => {
    it("moves a box's center onto the other's and scales it to its width", () => {
        expect(
            slideTransform(
                { left: 0, top: 0, width: 40, height: 3 },
                { left: 200, top: 0, width: 100, height: 3 },
            ),
        ).toBe("translate(-230.000px, 0.000px) scaleX(0.40000)");
        expect(
            slideTransform(
                { left: 0, top: 0, width: 0, height: 0 },
                { left: 200, top: 0, width: 100, height: 3 },
            ),
        ).toBeUndefined();
    });
});

describe("slideIndicator", () => {
    it("starts the new indicator over the old one's box and ends it at its own", async () => {
        const [a, b] = row();
        const animation = slideIndicator(a, b)!;
        expect(animation).toBeDefined();
        animation.pause();
        animation.currentTime = 0;
        expect(box(b)).toEqual({ left: 0, width: 40 });
        animation.currentTime = 100;
        // Halfway, on a linear curve.
        expect(box(b)).toEqual({ left: 100, width: 70 });
        animation.finish();
        expect(box(b)).toEqual({ left: 200, width: 100 });
        expect(b.getAttribute("style")).not.toContain("translate");
    });

    it("retargets from where a running slide has got to", () => {
        const [a, b] = row();
        const first = slideIndicator(a, b)!;
        first.pause();
        first.currentTime = 100;
        const back = slideIndicator(b, a)!;
        back.pause();
        expect(first.playState).toBe("idle");
        back.currentTime = 0;
        expect(box(a)).toEqual({ left: 100, width: 70 });
    });

    it("changes at once without a transition, or without a previous indicator", () => {
        const [a, b] = row("none");
        expect(slideIndicator(a, b)).toBeUndefined();
        expect(slideIndicator(undefined, b)).toBeUndefined();
        expect(slideIndicator(b, b)).toBeUndefined();
        expect(b.getAnimations()).toEqual([]);
    });
});
