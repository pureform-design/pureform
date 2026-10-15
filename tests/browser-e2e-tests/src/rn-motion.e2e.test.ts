// State transitions through React Native Web: a button's root animated by useAnimatedRecipe
// moves from its rest color to its hover color over the transition's duration, rather than at
// once, and changes at once under reduced motion.

import type { PrecomputedStyles } from "@pureform/rn-adapter";
import { useAnimatedRecipe } from "@pureform/rn-adapter/animated";
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
    const slots = useAnimatedRecipe("button", {}, { hover: props.hover });
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

describe("useAnimatedRecipe", () => {
    const mount = () => {
        host = document.createElement("div");
        document.body.append(host);
        root = createRoot(host);
    };

    it("moves to the hover color over the transition", async () => {
        mount();
        render(false, false);
        const rest = background();
        render(true, false);
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

    it("changes at once under reduced motion", async () => {
        mount();
        render(false, true);
        const rest = background();
        render(true, true);
        const now = background();
        await wait(400);
        expect(now).not.toBe(rest);
        expect(background()).toBe(now);
    });
});

const Spinner = () => {
    const slots = useAnimatedRecipe("circularProgress", {
        indeterminate: "true",
    });
    return createElement(Animated.View, {
        testID: "root",
        style: slots.root as never,
    });
};

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
