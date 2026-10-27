// State transitions through React Native Web: a button's root animated by useAnimatedComponentStyles
// moves from its rest color to its hover color over the transition's duration, rather than at
// once, with or without reduced motion, since a color fade doesn't move anything. A progress
// value, which does, moves over its transition and jumps under reduced motion.
//
// Animated times each frame by `Date.now()`, so the tests hold the clock and move it themselves:
// what a frame draws then depends on the time they set, not on how late the frame runs.

import type { PrecomputedStyles } from "@pureform/rn-adapter";
import { useAnimatedComponentStyles } from "@pureform/rn-adapter/animated";
import { PureformProvider } from "@pureform/rn-adapter/react";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Animated } from "react-native";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { commands } from "vitest/browser";

let styles: PrecomputedStyles;
let root: Root | undefined;
let host: HTMLElement | undefined;

beforeAll(async () => {
    styles = await commands.rnStyles();
});

afterEach(() => {
    root?.unmount();
    host?.remove();
    vi.useRealTimers();
});

/** Holds the clock Animated reads; `at` moves it to `ms` past the moment it was held. */
const holdClock = () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    return { at: (ms: number) => vi.setSystemTime(start + ms) };
};

/** Waits for the page to draw something other than `from`: Animated draws a step a frame, and
 *  a render, after the clock moves. */
const drawnOtherThan = async <T>(read: () => T, from: T): Promise<T> => {
    await vi.waitFor(() => expect(read()).not.toEqual(from), {
        timeout: 20_000,
    });
    return read();
};

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Waits a few frames, and renders, for what the clock's time draws. */
const frames = async (count = 5) => {
    for (let i = 0; i < count; i++) {
        await frame();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
};

const Button = (props: { hover: boolean }) => {
    const slots = useAnimatedComponentStyles(
        "button",
        {},
        { hover: props.hover },
    );
    return createElement(Animated.View, {
        testID: "root",
        style: slots.root as never,
    });
};

const render = (hover: boolean, reducedMotion: boolean) =>
    flushSync(() =>
        root!.render(
            createElement(
                PureformProvider,
                { styles, scheme: "light", reducedMotion },
                createElement(Button, { hover }),
            ),
        ),
    );

const background = () =>
    getComputedStyle(document.querySelector('[data-testid="root"]')!)
        .backgroundColor;

const channels = (color: string) =>
    (color.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3);

describe("useAnimatedComponentStyles", () => {
    const mount = () => {
        host = document.createElement("div");
        document.body.append(host);
        root = createRoot(host);
    };

    it.each([
        ["", false],
        [" under reduced motion too", true],
    ])("moves to the hover color over the transition%s", async (_, reduced) => {
        mount();
        const clock = holdClock();
        render(false, reduced);
        const rest = background();
        render(true, reduced);
        clock.at(40);
        const midway = await drawnOtherThan(background, rest);
        clock.at(1000);
        const hovered = await drawnOtherThan(background, midway);
        expect(hovered).not.toBe(rest);
        // Partway, each channel lies between the two ends, and isn't either.
        expect(midway).not.toBe(rest);
        expect(midway).not.toBe(hovered);
        const [a, m, b] = [channels(rest), channels(midway), channels(hovered)];
        for (let i = 0; i < 3; i++) {
            expect(m[i]!).toBeGreaterThanOrEqual(Math.min(a[i]!, b[i]!));
            expect(m[i]!).toBeLessThanOrEqual(Math.max(a[i]!, b[i]!));
        }
    });
});

const Progress = (props: { value: number }) => {
    const slots = useAnimatedComponentStyles(
        "circularProgress",
        { indeterminate: "false" },
        {},
        { "components.circularProgress.value": props.value },
    );
    return createElement(
        Animated.View,
        { style: slots.root as never },
        createElement(
            Animated.View,
            { style: slots.endHalf as never },
            createElement(Animated.View, {
                testID: "arc",
                style: slots.endArc as never,
            }),
        ),
    );
};

describe("a progress value", () => {
    const show = (value: number, reducedMotion: boolean) =>
        flushSync(() =>
            root!.render(
                createElement(
                    PureformProvider,
                    { styles, scheme: "light", reducedMotion },
                    createElement(Progress, { value }),
                ),
            ),
        );
    const arc = () =>
        getComputedStyle(document.querySelector('[data-testid="arc"]')!)
            .transform;

    it.each([
        ["moves over its transition", false],
        ["jumps under reduced motion", true],
    ])("%s", async (_, reduced) => {
        host = document.createElement("div");
        document.body.append(host);
        root = createRoot(host);
        const clock = holdClock();
        show(10, reduced);
        await frames();
        const rest = arc();
        show(40, reduced);
        clock.at(40);
        const soon = await drawnOtherThan(arc, rest);
        clock.at(1000);
        await frames();
        const done = reduced ? arc() : await drawnOtherThan(arc, soon);
        expect(done).not.toBe(rest);
        // Reduced motion draws the end at once; otherwise the arc is still moving after `soon`.
        expect(Object.is(soon, done)).toBe(reduced);
    });
});

const Spinner = () => {
    const slots = useAnimatedComponentStyles("circularProgress", {
        indeterminate: "true",
    });
    return createElement(Animated.View, {
        testID: "root",
        style: slots.root as never,
    });
};

const Elevated = (props: { hover: boolean }) => {
    const slots = useAnimatedComponentStyles(
        "button",
        { variant: "elevated" },
        { hover: props.hover },
    );
    return createElement(Animated.View, {
        testID: "root",
        style: slots.root as never,
    });
};

describe("transitioned shadows", () => {
    it("keep their shadow through a state change", async () => {
        host = document.createElement("div");
        document.body.append(host);
        root = createRoot(host);
        const show = (hover: boolean) =>
            flushSync(() =>
                root!.render(
                    createElement(
                        PureformProvider,
                        { styles, scheme: "light" },
                        createElement(Elevated, { hover }),
                    ),
                ),
            );
        const shadow = () =>
            getComputedStyle(document.querySelector('[data-testid="root"]')!)
                .boxShadow;
        const clock = holdClock();
        show(false);
        const rest = shadow();
        show(true);
        clock.at(1000);
        await drawnOtherThan(shadow, rest);
        await frames();
        expect(rest).toMatch(/px/);
        expect(shadow()).toMatch(/px/);
        expect(shadow()).not.toBe(rest);
    });
});

describe("keyframe animations", () => {
    it("turn an indeterminate circular progress indicator", async () => {
        host = document.createElement("div");
        document.body.append(host);
        root = createRoot(host);
        const clock = holdClock();
        flushSync(() =>
            root!.render(
                createElement(
                    PureformProvider,
                    { styles, scheme: "light" },
                    createElement(Spinner),
                ),
            ),
        );
        const transform = () =>
            getComputedStyle(document.querySelector('[data-testid="root"]')!)
                .transform;
        const seen = new Set<string>();
        let last = "";
        for (let i = 1; i <= 6; i++) {
            clock.at(i * 70);
            last = await drawnOtherThan(transform, last);
            seen.add(last);
        }
        expect(seen.size).toBeGreaterThan(3);
    });
});
