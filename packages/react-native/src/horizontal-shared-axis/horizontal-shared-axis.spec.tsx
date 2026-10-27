import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { HorizontalSharedAxis } from ".";
import { PureformProvider } from "..";
import { Stepper } from "../stepper";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { mount, outside, settle, until } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "horizontalSharedAxis",
        "fadeThrough",
        "stepper",
        "ripple",
    ]);
});

afterEach(() => {
    document.body.innerHTML = "";
});

const pages = () => [
    ...document.querySelectorAll<HTMLElement>(
        '[data-testid="pf-horizontal-shared-axis-page"]',
    ),
];
const scrim = () =>
    document.querySelector('[data-testid="pf-horizontal-shared-axis-scrim"]');
const shown = () =>
    pages()
        .filter((page) => page.getAttribute("aria-hidden") !== "true")
        .map((page) => page.textContent);

// Slowed, so a change is still running when the test reads it.
const render = (
    node: ReactNode,
    options: { dir?: "ltr" | "rtl"; motion?: "full" | "reduce" } = {},
) =>
    mount(
        <PureformProvider
            registry={registry}
            dir={options.dir ?? "ltr"}
            motion={options.motion ?? "full"}
            timeScale={20}
        >
            <View style={{ width: 400 }}>{node}</View>
        </PureformProvider>,
    );

const translateOf = (page: HTMLElement) => {
    const match = /translateX\((-?[\d.]+)px\)/.exec(page.style.transform);
    return match ? Number(match[1]) : 0;
};

describe("HorizontalSharedAxis on React Native", () => {
    it("slides forward: the old page leaves toward the start, hidden, and goes once done", async () => {
        const index = outside(0);
        await render(
            <index.Holder>
                {(at) => (
                    <HorizontalSharedAxis index={at} scrim>
                        <Text>{`Page ${at}`}</Text>
                    </HorizontalSharedAxis>
                )}
            </index.Holder>,
        );
        await settle();
        expect(pages().map((page) => page.textContent)).toEqual(["Page 0"]);
        expect(scrim()).toBeNull();
        await index.set(1);
        await settle(100);
        expect(pages().map((page) => page.textContent)).toEqual([
            "Page 0",
            "Page 1",
        ]);
        expect(shown()).toEqual(["Page 1"]);
        expect(scrim()).not.toBeNull();
        // The root clips the moving pages, and not at rest.
        expect(getComputedStyle(pages()[0]!.parentElement!).overflow).toBe(
            "hidden",
        );
        // Under left to right the leaving page moves left, the entering one comes from the right.
        expect(translateOf(pages()[0]!)).toBeLessThan(0);
        expect(translateOf(pages()[1]!)).toBeGreaterThan(0);
        await until(
            () =>
                expect(pages().map((page) => page.textContent)).toEqual([
                    "Page 1",
                ]),
            30_000,
        );
        expect(scrim()).toBeNull();
        // Each page settles on its own spring, so the entering one can come to rest a frame
        // after the leaving one goes; the root clips until it has.
        await until(() => expect(pages()[0]!.style.transform).toBe(""), 30_000);
        expect(getComputedStyle(pages()[0]!.parentElement!).overflow).not.toBe(
            "hidden",
        );
    });

    it("mirrors the slide under right to left", async () => {
        const index = outside(0);
        await render(
            <index.Holder>
                {(at) => (
                    <HorizontalSharedAxis index={at}>
                        <Text>{`Page ${at}`}</Text>
                    </HorizontalSharedAxis>
                )}
            </index.Holder>,
            { dir: "rtl" },
        );
        await settle();
        await index.set(1);
        await settle(100);
        expect(translateOf(pages()[0]!)).toBeGreaterThan(0);
        expect(translateOf(pages()[1]!)).toBeLessThan(0);
    });

    it("only fades under reduced motion", async () => {
        const index = outside(1);
        await render(
            <index.Holder>
                {(at) => (
                    <HorizontalSharedAxis index={at}>
                        <Text>{`Page ${at}`}</Text>
                    </HorizontalSharedAxis>
                )}
            </index.Holder>,
            { motion: "reduce" },
        );
        await settle();
        await index.set(0);
        await settle(100);
        expect(pages()).toHaveLength(2);
        expect(pages().map(translateOf)).toEqual([0, 0]);
    });

    it("takes the instance's fade tokens", async () => {
        const opacityAfter = async (
            tokens: { fadeDuration: number; fadeDelay: number } | undefined,
        ) => {
            const index = outside(0);
            await render(
                <index.Holder>
                    {(at) => (
                        <HorizontalSharedAxis index={at} tokens={tokens}>
                            <Text>{`Page ${at}`}</Text>
                        </HorizontalSharedAxis>
                    )}
                </index.Holder>,
            );
            await settle();
            await index.set(1);
            // 400ms in: the default fade (slowed, 1.8s after 1s) hasn't started; 10ms at once has
            // (200ms slowed).
            await settle(400);
            const opacity = Number(pages()[1]!.style.opacity || 1);
            document.body.innerHTML = "";
            return opacity;
        };
        expect(await opacityAfter(undefined)).toBeLessThan(0.1);
        expect(
            await opacityAfter({ fadeDuration: 10, fadeDelay: 0 }),
        ).toBeGreaterThan(0.9);
    });

    it("moves a row stepper's content with transition=sharedAxis", async () => {
        const step = outside(0);
        await render(
            <step.Holder>
                {(at) => (
                    <Stepper
                        aria-label="Checkout"
                        transition="sharedAxis"
                        step={at}
                        items={[
                            { label: "One", content: <Text>Step one</Text> },
                            { label: "Two", content: <Text>Step two</Text> },
                        ]}
                    />
                )}
            </step.Holder>,
        );
        await settle();
        await step.set(1);
        await settle(100);
        expect(pages().map((page) => page.textContent)).toEqual([
            "Step one",
            "Step two",
        ]);
    });

    it("fades a row stepper's content through with transition=fadeThrough", async () => {
        const step = outside(0);
        await render(
            <step.Holder>
                {(at) => (
                    <Stepper
                        aria-label="Checkout"
                        transition="fadeThrough"
                        step={at}
                        items={[
                            { label: "One", content: <Text>Step one</Text> },
                            { label: "Two", content: <Text>Step two</Text> },
                        ]}
                    />
                )}
            </step.Holder>,
        );
        await settle();
        await step.set(1);
        await settle(100);
        expect(
            [
                ...document.querySelectorAll<HTMLElement>(
                    '[data-testid="pf-fade-through-page"]',
                ),
            ].map((page) => page.textContent),
        ).toEqual(["Step one", "Step two"]);
    });
});
