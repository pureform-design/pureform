import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRipple, readRippleTiming, ripple } from "./ripple";

const transitionStyle = (
    transitionProperty: string,
    transitionDuration: string,
    transitionTimingFunction: string,
) => ({ transitionProperty, transitionDuration, transitionTimingFunction });

describe("readRippleTiming", () => {
    it("reads the grow from transform and the fade from opacity", () => {
        expect(
            readRippleTiming(
                transitionStyle(
                    "transform, opacity",
                    "0.45s, 350ms",
                    "cubic-bezier(0.2, 0, 0, 1), linear",
                ),
            ),
        ).toEqual({
            grow: 450,
            fade: 350,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
        });
    });

    it("finds the entries in any order", () => {
        expect(
            readRippleTiming(
                transitionStyle(
                    "opacity, transform",
                    "200ms, 600ms",
                    "linear, ease-out",
                ),
            ),
        ).toEqual({ grow: 600, fade: 200, easing: "ease-out" });
    });

    it("repeats shorter lists, as CSS does", () => {
        expect(
            readRippleTiming(
                transitionStyle("transform, opacity", "300ms", "ease-in"),
            ),
        ).toEqual({ grow: 300, fade: 300, easing: "ease-in" });
    });

    it("falls back when the layer declares no transition", () => {
        const fallback = { grow: 1, fade: 2, easing: "linear" };
        expect(
            readRippleTiming(transitionStyle("all", "0s", "ease"), fallback),
        ).toEqual(fallback);
    });

    it("falls back for a zero duration", () => {
        expect(
            readRippleTiming(
                transitionStyle("transform, opacity", "0s, 0s", "ease"),
            ).grow,
        ).toBe(450);
    });
});

// jsdom has no Web Animations or PointerEvent; record animations and fire plain events.
type Recorded = {
    element: Element;
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
};
let animations: Recorded[] = [];

const pointer = (
    type: string,
    init: Partial<PointerEventInit & { pointerType: string }> = {},
) => {
    const event = new MouseEvent(type, {
        bubbles: true,
        clientX: init.clientX ?? 0,
        clientY: init.clientY ?? 0,
        button: init.button ?? 0,
    });
    Object.defineProperty(event, "pointerType", {
        value: init.pointerType ?? "mouse",
    });
    return event;
};

const surface = () => {
    const container = document.createElement("button");
    const layer = document.createElement("span");
    layer.dataset.rippleLayer = "";
    container.append(layer);
    document.body.append(container);
    layer.getBoundingClientRect = () =>
        ({ left: 100, top: 50, width: 200, height: 40 }) as DOMRect;
    return { container, layer };
};

beforeEach(() => {
    animations = [];
    vi.useFakeTimers();
    Element.prototype.animate = function (keyframes, options) {
        animations.push({
            element: this,
            keyframes: keyframes as Keyframe[],
            options: options as KeyframeAnimationOptions,
        });
        return { finished: new Promise(() => {}) } as unknown as Animation;
    };
});

afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
});

describe("ripple", () => {
    it("skips ripples under reduced motion unless told not to", () => {
        vi.stubGlobal("matchMedia", (query: string) => ({
            matches: query === "(prefers-reduced-motion: reduce)",
        }));
        try {
            const { container, layer } = surface();
            const detach = ripple(container);
            container.dispatchEvent(pointer("pointerdown"));
            expect(layer.querySelector("[data-ripple]")).toBeNull();
            detach();

            ripple(container, { respectReducedMotion: false });
            container.dispatchEvent(pointer("pointerdown"));
            expect(layer.querySelector("[data-ripple]")).not.toBeNull();
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("grows a ripple from the press point while held", () => {
        const { container, layer } = surface();
        ripple(container, { class: "a b" });
        container.dispatchEvent(
            pointer("pointerdown", { clientX: 130, clientY: 60 }),
        );

        const element = layer.querySelector("[data-ripple]");
        expect(element?.className).toBe("a b");
        expect(animations).toHaveLength(1);
        expect(animations[0]?.keyframes[0]?.transform).toBe(
            "translate(10px, -10px) scale(1)",
        );
        expect(animations[0]?.options).toMatchObject({ duration: 450 });
    });

    it("fades on release after the rest of the minimum press", () => {
        const { container } = surface();
        ripple(container, { timing: { grow: 400, fade: 300 } });
        container.dispatchEvent(pointer("pointerdown"));
        vi.advanceTimersByTime(50);
        container.dispatchEvent(pointer("pointerup"));

        const fade = animations[1]?.options;
        expect(fade?.duration).toBe(300);
        expect(fade?.delay).toBeGreaterThan(140);
        expect(fade?.delay).toBeLessThanOrEqual(200);
    });

    it("ripples from the center on a keyboard click", () => {
        const { container } = surface();
        ripple(container);
        container.dispatchEvent(
            new MouseEvent("click", { bubbles: true, detail: 0 }),
        );

        expect(animations[0]?.keyframes[0]?.transform).toBe(
            "translate(80px, 0px) scale(1)",
        );
    });

    it("waits out the touch delay before rippling", () => {
        const { container } = surface();
        ripple(container);
        container.dispatchEvent(
            pointer("pointerdown", { pointerType: "touch" }),
        );
        expect(animations).toHaveLength(0);
        vi.advanceTimersByTime(150);
        expect(animations).toHaveLength(1);
    });

    it("skips a touch that turns into a scroll", () => {
        const { container } = surface();
        ripple(container);
        container.dispatchEvent(
            pointer("pointerdown", { pointerType: "touch" }),
        );
        container.dispatchEvent(pointer("pointercancel"));
        vi.advanceTimersByTime(200);
        expect(animations).toHaveLength(0);
    });

    it("still ripples a tap released inside the touch delay", () => {
        const { container } = surface();
        ripple(container);
        container.dispatchEvent(
            pointer("pointerdown", { pointerType: "touch" }),
        );
        container.dispatchEvent(pointer("pointerup"));
        expect(animations.map((a) => a.options.duration)).toEqual([450, 375]);
    });

    it("skips disabled surfaces and secondary buttons", () => {
        const { container } = surface();
        ripple(container);
        container.dispatchEvent(pointer("pointerdown", { button: 2 }));
        container.disabled = true;
        container.dispatchEvent(pointer("pointerdown"));
        expect(animations).toHaveLength(0);
    });

    it("lets only the innermost surface ripple", () => {
        const outer = surface();
        const inner = surface();
        outer.container.append(inner.container);
        ripple(outer.container);
        ripple(inner.container);
        inner.container.dispatchEvent(pointer("pointerdown"));
        expect(animations.map((a) => a.element.parentElement)).toEqual([
            inner.layer,
        ]);
    });

    it("stops listening once detached", () => {
        const { container } = surface();
        const detach = ripple(container);
        detach();
        container.dispatchEvent(pointer("pointerdown"));
        expect(animations).toHaveLength(0);
    });
});

describe("createRipple", () => {
    it("ripples from the presses it's told of", () => {
        const { layer } = surface();
        const controller = createRipple(() => layer);
        controller.press({ x: 130, y: 60 });
        expect(animations[0]?.keyframes[0]?.transform).toBe(
            "translate(10px, -10px) scale(1)",
        );
        controller.release();
        expect(animations.map((a) => a.options.duration)).toEqual([450, 375]);
    });

    it("ripples a key's press from the center", () => {
        const { layer } = surface();
        createRipple(() => layer).press("center");
        expect(animations[0]?.keyframes[0]?.transform).toBe(
            "translate(80px, 0px) scale(1)",
        );
    });

    it("waits out a touch, and never ripples a cancelled one", () => {
        const { layer } = surface();
        const controller = createRipple(() => layer);
        controller.press({ x: 0, y: 0 }, true);
        controller.cancel();
        vi.advanceTimersByTime(200);
        expect(animations).toHaveLength(0);

        controller.press({ x: 0, y: 0 }, true);
        controller.release();
        expect(animations.map((a) => a.options.duration)).toEqual([450, 375]);
    });

    it("reads its options at each press", () => {
        const { layer } = surface();
        let centered = false;
        const controller = createRipple(() => layer, {
            get centerOrigin() {
                return centered;
            },
        });
        centered = true;
        controller.press({ x: 130, y: 60 });
        expect(animations[0]?.keyframes[0]?.transform).toBe(
            "translate(80px, 0px) scale(1)",
        );
    });
});
