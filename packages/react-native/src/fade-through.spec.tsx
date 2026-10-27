import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { PureformProvider, overlayMotion, useTokens } from ".";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { FadeThrough } from "./fade-through";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { mount, outside, settle, until } from "./testing/render";

const model = vi.hoisted(() => ({ states: [] as string[] }));
vi.mock("./page-transition", async (original) => {
    const actual = await original<typeof import("./page-transition")>();
    return {
        ...actual,
        useTransitionPages<C>(
            ...args: Parameters<typeof actual.useTransitionPages<C>>
        ) {
            const result = actual.useTransitionPages(...args);
            model.states = result.pages.map((page) => page.state);
            return result;
        },
    };
});

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["fadeThrough"]);
});

const PAGE = '[data-testid="pf-fade-through-page"]';
const pages = () => [...document.querySelectorAll<HTMLElement>(PAGE)];

// An element's opacity and its transform's scale.
const frame = (element: Element) => {
    const style = getComputedStyle(element);
    const matrix = /matrix\(([^)]*)\)/.exec(style.transform)?.[1];
    const scale = matrix ? Number(matrix.split(",")[0]) : 1;
    return { opacity: Number(style.opacity), scale };
};

const render = async (
    engine: MotionEngine,
    motion: "full" | "reduce" = "full",
) => {
    const value = outside("home");
    await mount(
        <PureformProvider
            registry={registry}
            engine={engine}
            motion={motion}
            timeScale={4}
        >
            <View style={{ width: 300, height: 200 }}>
                <value.Holder>
                    {(shown) => (
                        <FadeThrough value={shown}>
                            {(page) => <Text>{page}</Text>}
                        </FadeThrough>
                    )}
                </value.Holder>
            </View>
        </PureformProvider>,
    );
    return value;
};

describe("FadeThrough", () => {
    it("takes the theme's springs and durations, the fade in waiting for the fade out", async () => {
        let tokens!: import("@pureform/rn-adapter/factory").ThemeValues;
        function Read(): ReactNode {
            // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
            tokens = useTokens();
            return null;
        }
        await mount(
            <PureformProvider registry={registry}>
                <Read />
            </PureformProvider>,
        );
        const short2 = Number(tokens["durations.short2"]);
        const motion = overlayMotion("fadeThrough", tokens, false);
        expect(motion.enter).toMatchObject({
            from: { opacity: 0, scale: 0.8 },
            to: { opacity: 1, scale: 1 },
            duration: Number(tokens["springs.spatialDefault.duration"]),
            fade: {
                duration: Number(tokens["durations.short4"]),
                delay: short2,
            },
        });
        expect(motion.exit).toMatchObject({
            from: { opacity: 1, scale: 1 },
            to: { opacity: 0, scale: 1.05 },
            fade: { duration: short2 },
        });
        // Reduced motion keeps the fades, still waiting.
        const reduced = overlayMotion("fadeThrough", tokens, true);
        expect(reduced.enter).toMatchObject({
            from: { opacity: 0 },
            to: { opacity: 1 },
            duration: Number(tokens["durations.short4"]),
            delay: short2,
        });
        expect(reduced.enter.from.scale).toBeUndefined();
    });

    for (const [name, engine] of [
        ["Animated", animated],
        ["Reanimated", reanimated],
    ] as const) {
        it(`fades through to a new value on ${name}, then drops the old page`, async () => {
            const value = await render(engine);
            await settle(50);
            expect(pages()).toHaveLength(1);
            expect(frame(pages()[0]!)).toEqual({ opacity: 1, scale: 1 });
            await value.set("mail");
            const [out, into] = pages();
            expect(out!.textContent).toBe("home");
            expect(out!.getAttribute("aria-hidden")).toBe("true");
            expect(getComputedStyle(out!).position).toBe("absolute");
            expect(into!.textContent).toBe("mail");
            // The new page waits, unseen, for the old one to fade out.
            await settle(100);
            expect(frame(into!).opacity).toBe(0);
            await until(() => expect(pages()).toHaveLength(1));
            expect(pages()[0]!.textContent).toBe("mail");
            await until(() =>
                expect(frame(pages()[0]!)).toEqual({ opacity: 1, scale: 1 }),
            );
            await until(() => expect(model.states).toEqual(["current"]));
            const entered = pages()[0]!;
            await settle(50);
            expect(pages()[0]).toBe(entered);
            expect(frame(entered)).toEqual({ opacity: 1, scale: 1 });
        });
    }

    it("only fades under reduced motion", async () => {
        const value = await render(animated, "reduce");
        await value.set("mail");
        const into = pages()[1]!;
        let grew = false;
        await until(() => {
            if (frame(into).scale !== 1) grew = true;
            expect(frame(into).opacity).toBe(1);
        });
        expect(grew).toBe(false);
    });
});
