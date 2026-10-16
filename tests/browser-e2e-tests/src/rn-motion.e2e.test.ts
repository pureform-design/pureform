// State transitions through React Native Web: a button's root animated by useAnimatedComponentStyles
// moves from its rest color to its hover color over the transition's duration, rather than at
// once, with or without reduced motion, since a color fade doesn't move anything. A progress
// value, which does, moves over its transition and jumps under reduced motion.

import type { PrecomputedStyles } from "@pureform/rn-adapter";
import { useAnimatedComponentStyles } from "@pureform/rn-adapter/animated";
import { PureformProvider } from "@pureform/rn-adapter/react";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Animated } from "react-native";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
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
});

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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
        render(false, reduced);
        const rest = background();
        render(true, reduced);
        await wait(40);
        const midway = background();
        await wait(400);
        const hovered = background();
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
        show(10, reduced);
        await wait(40);
        const rest = arc();
        show(40, reduced);
        await wait(40);
        const soon = arc();
        await wait(400);
        const done = arc();
        expect(done).not.toBe(rest);
        if (reduced) expect(soon).toBe(done);
        else expect(soon).not.toBe(done);
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
        show(false);
        const rest = shadow();
        show(true);
        await wait(400);
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
        for (let i = 0; i < 6; i++) {
            seen.add(transform());
            await wait(70);
        }
        expect(seen.size).toBeGreaterThan(3);
    });
});
