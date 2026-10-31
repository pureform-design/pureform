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

    // Records the widths on a short interval until stopped.
    const sample = () => {
        const frames: number[][] = [];
        const id = setInterval(() => {
            if (rows().length) frames.push(widths());
        }, 8);
        return {
            frames,
            stop: () => clearInterval(id),
        };
    };

    const open = () =>
        interact(() => userEvent.click(byTestId(ids.closeTrigger)));

    // Waits for the reveal to have begun (an item clipped to nearly nothing: before it's measured
    // an item has its own width, which would read as already open) and then to have finished.
    const revealed = async () => {
        await until(() => expect(Math.min(...widths())).toBeLessThan(5));
        await until(() => expect(Math.min(...widths())).toBeGreaterThan(40));
    };

    it("grows each item's width from nothing to its own, anchored to the end edge", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />);
        const recording = sample();
        await open();
        await revealed();
        await until(() => {
            const w = widths();
            const n = natural();
            expect(w.length).toBe(3);
            for (let i = 0; i < 3; i++) {
                expect(w[i]!).toBeGreaterThan(40);
                expect(Math.abs(w[i]! - n[i]!)).toBeLessThan(1);
            }
        });
        recording.stop();
        // It started from nothing once measured (the frame before that is invisible: the fade
        // starts at no opacity), and never got wider than it is.
        expect(Math.min(...recording.frames.flat())).toBeLessThan(5);
        const finals = widths();
        for (const frame of recording.frames) {
            frame.forEach((width, i) => {
                expect(width).toBeLessThanOrEqual(finals[i]! + 1);
            });
        }
        // It grew through widths between nothing and full, not in one jump.
        expect(
            recording.frames.some((f) =>
                f.some((w, i) => w > 4 && w < finals[i]! - 4),
            ),
        ).toBe(true);
    });

    it("doesn't squeeze or scale the content: the item keeps its own width while it's clipped", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />);
        const recording = sample();
        const itemWidths: number[][] = [];
        const track = setInterval(() => {
            if (rows().length) itemWidths.push(natural());
        }, 8);
        await open();
        await revealed();
        recording.stop();
        clearInterval(track);
        const final = natural();
        const clipped = recording.frames.filter((f) =>
            f.some((w, i) => w < final[i]! - 8),
        );
        expect(clipped.length).toBeGreaterThan(0);
        // Whatever the clip, the item itself stayed the width it measured.
        for (const frame of itemWidths) {
            frame.forEach((width, i) => {
                expect(Math.abs(width - final[i]!)).toBeLessThan(1.5);
            });
        }
    });

    // The aligned edge is the logical `end`, which a right-to-left device mirrors with its layout
    // (`I18nManager`). React Native Web resolves it from the global direction, not per subtree,
    // so the mirrored edge is a device check.
    it("anchors the item to the end edge while it grows", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />);
        const edges: number[] = [];
        const id = setInterval(() => {
            for (const item of rows()) {
                const wrapper = clip(item).getBoundingClientRect();
                const content = item.getBoundingClientRect();
                // The edge the item and its clip share is the aligned one.
                edges.push(Math.abs(content.right - wrapper.right));
            }
        }, 8);
        await open();
        await revealed();
        clearInterval(id);
        expect(edges.length).toBeGreaterThan(10);
        expect(Math.max(...edges)).toBeLessThan(1.5);
    });

    it("reveals the item nearest the FAB first and the farthest last", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />);
        const recording = sample();
        await open();
        // A moment with the nearest item (the last) well open while the farthest hasn't begun.
        await until(() => {
            const [first, , last] = widths();
            expect(last!).toBeGreaterThan(10);
            expect(first!).toBeLessThan(2);
        });
        await revealed();
        recording.stop();
        // While it grows, the nearest is never behind the farthest.
        const growing = recording.frames.filter(
            (f) => f.length === 3 && f.some((w) => w > 2 && w < 40),
        );
        expect(growing.length).toBeGreaterThan(0);
        expect(growing.every((f) => f[2]! >= f[0]! - 1)).toBe(true);
    });

    it("leaves its items fully shown for the fade under reduced motion", async () => {
        await renderFull(<FabMenu icon="+" fabLabel="Create" items={ITEMS} />, {
            motion: "reduce",
        });
        const recording = sample();
        await open();
        await until(() => expect(rows()).toHaveLength(3));
        await settle(150);
        recording.stop();
        const finals = natural();
        for (const frame of recording.frames.filter((f) => f.length === 3)) {
            frame.forEach((width, i) => {
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
        await until(() => expect(Math.max(...widths())).toBeGreaterThan(0));
        // Close once the nearest item is part of the way open.
        await until(() => {
            const w = widths()[2]!;
            expect(w).toBeGreaterThan(8);
            expect(w).toBeLessThan(natural()[2]! - 8);
        });
        const before = widths()[2]!;
        await shown.set(false);
        const after = widths()[2]!;
        // Within a frame or two of where it was: not back at nothing, not at full.
        expect(Math.abs(after - before)).toBeLessThan(25);
        expect(after).toBeGreaterThan(0);
    });
});
