import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { FabMenu } from ".";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import {
    byTestId,
    interact,
    mount,
    outside,
    settle,
    startClock,
    stepClock,
    until,
} from "../testing/render";

const ids = testIds.fabMenu;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["fabMenu", "ripple"]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            <View style={{ width: 600, height: 400, padding: 160 }}>
                {node}
            </View>
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("FabMenu on React Native", () => {
    it("takes a function of each item in its parts' style and slotProps", async () => {
        await render(
            <FabMenu
                icon="+"
                fabLabel="Create"
                defaultOpen
                items={[
                    { value: "message", label: "Message", icon: "✉" },
                    { value: "call", label: "Call", icon: "☎" },
                ]}
                style={{
                    itemLabel: ({ index }) =>
                        index ? { opacity: 0.5 } : undefined,
                }}
                slotProps={{
                    item: ({ item }) => ({ accessibilityHint: item.value }),
                }}
            />,
        );
        await until(() => expect(all(ids.itemLabel)).toHaveLength(2));
        expect(
            all(ids.itemLabel).map((each) => getComputedStyle(each).opacity),
        ).toEqual(["1", "0.5"]);
    });
});

// Each item is revealed from the menu's aligned edge as Compose's is: its content is laid out at
// its own width and a wrapper clips it while its width springs from nothing, so it's uncovered
// rather than squeezed or scaled.
describe("FabMenu's item reveal on React Native", () => {
    const ITEMS = [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
        { value: "c", label: "Gamma" },
    ];

    const renderFull = (
        node: ReactNode,
        options: { motion?: "full" | "reduce" } = {},
    ) =>
        mount(
            <PureformProvider
                registry={registry}
                engine={animated}
                motion={options.motion ?? "full"}
                // Slowed, so every frame of the motion is there to sample.
                timeScale={6}
            >
                <View style={{ width: 600, height: 400, padding: 160 }}>
                    {node}
                </View>
            </PureformProvider>,
        );

    // The width wrapper that clips an item: its pressable's measuring view's parent.
    const clip = (item: HTMLElement) => item.parentElement!.parentElement!;
    const rows = () => all(ids.item);
    const widths = () =>
        rows().map((item) => clip(item).getBoundingClientRect().width);
    const natural = () =>
        rows().map((item) => item.getBoundingClientRect().width);

    const open = () =>
        interact(() => userEvent.click(byTestId(ids.closeTrigger)));

    // What the items measure after each frame of the animation clock, until `done` (the reveal
    // has finished) or `max` frames: the clip's width, the item's own width, and how far the
    // item's end edge is from the clip's.
    const record = async (
        done: (frame: { w: number[]; n: number[] }) => boolean = (frame) =>
            frame.w.every((width, i) => width >= frame.n[i]! - 0.5),
        max = 2000,
    ) => {
        const frames: { w: number[]; n: number[]; edges: number[] }[] = [];
        let begun = false;
        for (let i = 0; i < max; i++) {
            await stepClock();
            const items = rows();
            if (items.length !== 3) continue;
            const frame = {
                w: widths(),
                n: natural(),
                edges: items.map((item) =>
                    Math.abs(
                        item.getBoundingClientRect().right -
                            clip(item).getBoundingClientRect().right,
                    ),
                ),
            };
            frames.push(frame);
            // Before it's measured an item has its own width, which would read as already open.
            begun ||= Math.min(...frame.w) < 5;
            if (begun && done(frame)) break;
        }
        return frames;
    };

    it("grows each item's width from nothing to its own, anchored to the end edge", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />);
        startClock();
        await open();
        const frames = await record();
        const finals = frames.at(-1)!;
        for (let i = 0; i < 3; i++) {
            expect(finals.w[i]!).toBeGreaterThan(40);
            expect(Math.abs(finals.w[i]! - finals.n[i]!)).toBeLessThan(1);
        }
        // It started from nothing once measured (the frame before that is invisible: the fade
        // starts at no opacity), and never got wider than it is.
        expect(Math.min(...frames.flatMap((f) => f.w))).toBeLessThan(5);
        for (const frame of frames) {
            frame.w.forEach((width, i) => {
                expect(width).toBeLessThanOrEqual(finals.w[i]! + 1);
            });
        }
        // It grew through widths between nothing and full, not in one jump.
        expect(
            frames.some((f) =>
                f.w.some((w, i) => w > 4 && w < finals.w[i]! - 4),
            ),
        ).toBe(true);
    });

    it("doesn't squeeze or scale the content: the item keeps its own width while it's clipped", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />);
        startClock();
        await open();
        const frames = await record();
        const final = frames.at(-1)!.n;
        const clipped = frames.filter((f) =>
            f.w.some((w, i) => w < final[i]! - 8),
        );
        expect(clipped.length).toBeGreaterThan(0);
        // Whatever the clip, the item itself stayed the width it measured.
        for (const frame of frames) {
            frame.n.forEach((width, i) => {
                expect(Math.abs(width - final[i]!)).toBeLessThan(1.5);
            });
        }
    });

    // The aligned edge is the logical `end`, which a right-to-left device mirrors with its layout
    // (`I18nManager`). React Native Web resolves it from the global direction, not per subtree,
    // so the mirrored edge is a device check.
    it("anchors the item to the end edge while it grows", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />);
        startClock();
        await open();
        const edges = (await record()).flatMap((f) => f.edges);
        expect(edges.length).toBeGreaterThan(10);
        expect(Math.max(...edges)).toBeLessThan(1.5);
    });

    it("reveals the item nearest the FAB first and the farthest last", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />);
        startClock();
        await open();
        const frames = (await record()).map((f) => f.w);
        // A moment with the nearest item (the last) well open while the farthest hasn't begun.
        expect(frames.some((f) => f[2]! > 10 && f[0]! < 2)).toBe(true);
        // While it grows, the nearest is never behind the farthest.
        const growing = frames.filter((f) => f.some((w) => w > 2 && w < 40));
        expect(growing.length).toBeGreaterThan(0);
        expect(growing.every((f) => f[2]! >= f[0]! - 1)).toBe(true);
        // And it ends with every item open.
        expect(Math.min(...frames.at(-1)!)).toBeGreaterThan(40);
    });

    it("leaves its items fully shown for the fade under reduced motion", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />, {
            motion: "reduce",
        });
        startClock();
        await open();
        const frames = await record(() => false, 60);
        expect(frames.length).toBeGreaterThan(0);
        const finals = natural();
        for (const frame of frames) {
            frame.w.forEach((width, i) => {
                expect(Math.abs(width - finals[i]!)).toBeLessThan(1.5);
            });
        }
    });

    it("carries on from the width it's at when closed mid-reveal, rather than jumping", async () => {
        const shown = outside(true);
        await renderFull(
            <shown.Holder>
                {(value) => (
                    <FabMenu
                        icon="+"
                        fabLabel="Create"
                        items={ITEMS}
                        open={value}
                    />
                )}
            </shown.Holder>,
        );
        startClock();
        // Close once the nearest item is part of the way open.
        for (let i = 0; i < 2000; i++) {
            await stepClock();
            const w = rows().length === 3 ? widths()[2]! : 0;
            if (w > 8 && w < natural()[2]! - 8) break;
        }
        expect(widths()[2]!).toBeGreaterThan(8);
        const before = widths()[2]!;
        await shown.set(false);
        const after = widths()[2]!;
        // Within a frame or two of where it was: not back at nothing, not at full.
        expect(Math.abs(after - before)).toBeLessThan(25);
        expect(after).toBeGreaterThan(0);
    });
});
