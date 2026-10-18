import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider, placeOverlay } from ".";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { IconButton } from "./icon-button";
import { Menu } from "./menu";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, interact, mount, outside, settle } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    const names = ["menu", "button", "iconButton", "ripple"];
    registry = await presetRegistry(names);
});

const render = (node: ReactNode, engine: MotionEngine = animated) =>
    mount(
        <PureformProvider registry={registry} engine={engine} motion="reduce">
            <View style={{ width: 600, height: 400 }}>{node}</View>
        </PureformProvider>,
    );

const ITEMS = [
    { value: "cut", label: "Cut" },
    { value: "copy", label: "Copy" },
    { value: "paste", label: "Paste", disabled: true },
];

const box = (element: Element) => element.getBoundingClientRect();
const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
const items = () => [
    ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
];

describe("placeOverlay", () => {
    const bounds = { x: 0, y: 0, width: 400, height: 300 };
    const size = { width: 100, height: 80 };
    const place = (
        anchor: { x: number; y: number; width: number; height: number },
        placement: Parameters<typeof placeOverlay>[0]["placement"],
        rtl = false,
    ) =>
        placeOverlay({
            anchor,
            size,
            bounds,
            placement,
            gutter: 8,
            flip: true,
            rtl,
            padding: 8,
        });

    it("puts it on the placement's side, aligned to the trigger, start following the direction", () => {
        const anchor = { x: 100, y: 50, width: 40, height: 40 };
        expect(place(anchor, "bottom-start")).toMatchObject({
            left: 100,
            top: 98,
            side: "bottom",
            transformOrigin: "20px 0px",
        });
        expect(place(anchor, "bottom-start", true)).toMatchObject({
            left: 40,
        });
        expect(place(anchor, "bottom")).toMatchObject({ left: 70 });
        expect(place(anchor, "right")).toMatchObject({
            left: 148,
            top: 30,
            side: "right",
        });
    });

    it("flips to the side with room, and shifts to stay inside", () => {
        expect(
            place({ x: 100, y: 250, width: 40, height: 40 }, "bottom-start"),
        ).toMatchObject({
            top: 162,
            side: "top",
            transformOrigin: "20px 80px",
        });
        expect(
            place({ x: 380, y: 50, width: 20, height: 20 }, "bottom-start"),
        ).toMatchObject({ left: 292 });
    });
});

describe.each([animated, reanimated])("the menu with $name", (engine) => {
    it("opens under its trigger over the page, and picking an item closes it", async () => {
        const picked: string[] = [];
        await render(
            <View style={{ padding: 40, overflow: "hidden", height: 80 }}>
                <Menu
                    trigger="Edit"
                    items={ITEMS}
                    onSelect={(details) => picked.push(details.value)}
                />
                <View
                    testID="cover"
                    style={{ height: 300, backgroundColor: "white" }}
                />
            </View>,
            engine,
        );
        const trigger = byTestId("pf-button-root");
        expect(menu()).toBeNull();
        await interact(() => userEvent.click(trigger));
        await settle(400);
        expect(menu()).not.toBeNull();
        // Below the trigger, at its start, past the view that clips it.
        expect(box(menu()!).top).toBeCloseTo(box(trigger).bottom + 8, 0);
        expect(box(menu()!).left).toBeCloseTo(box(trigger).left, 0);
        const item = items()[1]!;
        const center = box(item);
        expect(
            item.contains(
                document.elementFromPoint(
                    center.left + center.width / 2,
                    center.top + center.height / 2,
                ),
            ),
        ).toBe(true);
        await interact(() => userEvent.click(item));
        expect(picked).toEqual(["copy"]);
        await settle(400);
        expect(menu()).toBeNull();
    });

    it("closes on a press outside and on Escape, and takes its open state from the app", async () => {
        const open = outside(false);
        const asked: boolean[] = [];
        await render(
            <open.Holder>
                {(value) => (
                    <Menu
                        open={value}
                        onOpenChange={(details) => asked.push(details.open)}
                        trigger={(trigger) => (
                            <IconButton
                                {...trigger}
                                aria-label="More"
                                icon="⋮"
                            />
                        )}
                        items={ITEMS}
                    />
                )}
            </open.Holder>,
            engine,
        );
        await interact(() => userEvent.click(byTestId("pf-icon-button-root")));
        expect(asked).toEqual([true]);
        expect(menu()).toBeNull();
        await open.set(true);
        await settle(400);
        expect(menu()).not.toBeNull();
        // What covers the page outside the menu takes the press.
        const page = document.elementFromPoint(300, 300) as HTMLElement;
        expect(menu()!.contains(page)).toBe(false);
        await interact(() => userEvent.click(page));
        expect(asked).toEqual([true, false]);
        await interact(() => userEvent.keyboard("{Escape}"));
        expect(asked).toEqual([true, false, false]);
        await open.set(false);
        await settle(400);
        expect(menu()).toBeNull();
    });

    it("takes focus on the web and moves it with the arrow keys", async () => {
        await render(<Menu trigger="Edit" items={ITEMS} />, engine);
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        await settle(400);
        expect(document.activeElement).toBe(items()[0]);
        await interact(() => userEvent.keyboard("{ArrowDown}"));
        expect(document.activeElement).toBe(items()[1]);
        // The disabled item is passed over.
        await interact(() => userEvent.keyboard("{ArrowDown}"));
        expect(document.activeElement).toBe(items()[0]);
        await interact(() => userEvent.keyboard("{Escape}"));
        await settle(400);
        expect(menu()).toBeNull();
        expect(document.activeElement).toBe(byTestId("pf-button-root"));
    });
});
