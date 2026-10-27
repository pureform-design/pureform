import { DEFAULT_RIPPLE_TIMING } from "@pureform/js-effects/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Transition } from "../values";
import { LINEAR } from "../values";
import { useRippleDrawn } from "./ripple";
import type { Ripples } from "./ripple";

const state = vi.hoisted(() => ({
    styles: { root: {} },
    transitions: { root: [] as Transition[] },
}));

vi.mock("../react", () => ({
    useComponentState: () => state,
    useTokens: () => ({}),
    useReducedMotion: () => false,
}));

const timing = () => {
    let ripples: Ripples | undefined;
    function Read() {
        ripples = useRippleDrawn({ color: "red" }, { Ripple: () => null });
        return null;
    }
    renderToStaticMarkup(createElement(Read));
    return (ripples!.layer.props as { timing: unknown }).timing;
};

afterEach(() => {
    state.transitions.root = [];
});

describe("Native ripple timing", () => {
    it("adapts the neutral default points without CSS timing transport", () => {
        expect(DEFAULT_RIPPLE_TIMING.easing).toEqual([0.2, 0, 0, 1]);
        expect(timing()).toEqual({
            grow: 450,
            fade: 375,
            easing: {
                type: "easing",
                kind: "cubicBezier",
                points: DEFAULT_RIPPLE_TIMING.easing,
            },
        });
    });

    it("still takes structured curves and durations from the Native transition", () => {
        state.transitions.root = [
            { property: "transform", duration: 600, easing: LINEAR, delay: 0 },
            { property: "opacity", duration: 200, easing: LINEAR, delay: 0 },
        ];
        expect(timing()).toEqual({ grow: 600, fade: 200, easing: LINEAR });
    });
});
