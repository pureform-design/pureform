import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider, placeOverlay } from ".";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { IconButton } from "./icon-button";
import { Menu } from "./menu";
import { useSnackbar } from "./snackbar";
import type { Snackbars } from "./snackbar";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, interact, mount, outside, settle } from "./testing/render";
import { LONG_PRESS_TOOLTIP_MS, Tooltip } from "./tooltip";

let registry: TestRegistry;

beforeAll(async () => {
    const names = [
        "menu",
        "button",
        "iconButton",
        "snackbar",
        "tooltip",
        "dialog",
        "scrim",
        "ripple",
    ];
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

// Settles until `check` holds, or `ms` have passed.
const until = async (check: () => boolean, ms = 1000) => {
    for (let waited = 0; waited < ms && !check(); waited += 50) {
        await settle(50);
    }
};

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
        await until(() => menu() === null);
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
        await until(() => menu() === null);
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
        await until(() => menu() === null);
        expect(menu()).toBeNull();
        expect(document.activeElement).toBe(byTestId("pf-button-root"));
    });
});

describe.each([animated, reanimated])(
    "the snackbar queue with $name",
    (engine) => {
        let snackbars!: Snackbars;
        function Grab(): ReactNode {
            snackbars = useSnackbar();
            return null;
        }
        const roots = () => [
            ...document.querySelectorAll<HTMLElement>('[role="status"]'),
        ];

        it("shows one at a time at the bottom, each after the one before has gone", async () => {
            await render(<Grab />, engine);
            const closed: string[] = [];
            await interact(() => {
                snackbars.show({
                    supportingText: "First",
                    duration: 300,
                    onOpenChange: (details) =>
                        closed.push(`first ${details.reason}`),
                });
                snackbars.show({ supportingText: "Second", duration: null });
            });
            await settle(100);
            expect(roots().map((root) => root.textContent)).toEqual([
                expect.stringContaining("First"),
            ]);
            expect(roots()[0]!.getAttribute("aria-live")).toBe("polite");
            // At the bottom of the host's layer, over the page.
            expect(
                window.innerHeight - box(roots()[0]!).bottom,
            ).toBeGreaterThanOrEqual(16);
            await settle(700);
            expect(closed).toEqual(["first timeout"]);
            expect(roots().map((root) => root.textContent)).toEqual([
                expect.stringContaining("Second"),
            ]);
            await interact(() => snackbars.dismiss());
            await until(() => roots().length === 0);
            expect(roots()).toEqual([]);
        });

        it("holds while the pointer is over it, and closes by its action", async () => {
            await render(<Grab />, engine);
            const done: string[] = [];
            await interact(() => {
                snackbars.show({
                    supportingText: "Archived",
                    action: "Undo",
                    duration: 400,
                    onAction: () => done.push("undo"),
                    onOpenChange: (details) => done.push(details.reason),
                });
            });
            await settle(100);
            const text = document.querySelector<HTMLElement>(
                '[data-testid="pf-snackbar-supporting-text"]',
            )!;
            await interact(() => userEvent.hover(text));
            await settle(700);
            expect(roots().length).toBe(1);
            await interact(() => userEvent.unhover(text));
            // A press on it holds it too, as a touch does.
            const holder = roots()[0]!.parentElement!;
            const at = box(text);
            const point = {
                bubbles: true,
                button: 0,
                buttons: 1,
                clientX: at.left + 2,
                clientY: at.top + 2,
            };
            await interact(() => {
                holder.dispatchEvent(new MouseEvent("mousedown", point));
            });
            // React Native Web starts a press 50ms after the pointer goes down.
            await settle(100);
            await settle(700);
            expect(roots().length).toBe(1);
            await interact(() => {
                document.dispatchEvent(new MouseEvent("mouseup", point));
            });
            await interact(() =>
                userEvent.click(byTestId("pf-snackbar-action")),
            );
            expect(done).toEqual(["undo", "action"]);
            await until(() => roots().length === 0);
            expect(roots()).toEqual([]);
        });

        it("keeps the provider show was called under", async () => {
            await mount(
                <PureformProvider registry={registry} motion="reduce">
                    <PureformProvider
                        overrides={{
                            "components.snackbar.container": "#123456",
                        }}
                    >
                        <Grab />
                    </PureformProvider>
                </PureformProvider>,
            );
            await interact(() => {
                snackbars.show({ supportingText: "Teal", duration: null });
            });
            await settle(100);
            expect(getComputedStyle(roots()[0]!).backgroundColor).toBe(
                "rgb(18, 52, 86)",
            );
        });
    },
);

// A pointer press on an element, held until `release` is called.
const hold = async (element: HTMLElement) => {
    const at = box(element);
    const point = {
        bubbles: true,
        button: 0,
        clientX: at.left + at.width / 2,
        clientY: at.top + at.height / 2,
    };
    await interact(() => {
        element.dispatchEvent(new MouseEvent("mousedown", point));
    });
    return () =>
        interact(() => {
            document.dispatchEvent(new MouseEvent("mouseup", point));
        });
};

describe.each([animated, reanimated])("the tooltip with $name", (engine) => {
    const tooltip = () =>
        document.querySelector<HTMLElement>('[role="tooltip"]');
    // When it last asked to show and to hide.
    const changed = { open: 0, closed: 0 };
    const saveButton = (onPress?: () => void) => {
        changed.open = changed.closed = 0;
        return (
            <View style={{ padding: 80 }}>
                <Tooltip
                    supportingText="Save to drafts"
                    onOpenChange={({ open }) => {
                        changed[open ? "open" : "closed"] = performance.now();
                    }}
                    trigger={(trigger) => (
                        <IconButton
                            {...trigger}
                            aria-label="Save"
                            icon="S"
                            onPress={onPress}
                        />
                    )}
                />
            </View>
        );
    };

    it("shows under its trigger once the pointer rests on it, and hides when it leaves", async () => {
        await render(saveButton(), engine);
        const trigger = byTestId("pf-icon-button-root");
        // When the pointer reaches the trigger: its first event, before the tooltip hears of it.
        let hoveredAt = 0;
        const hovers = new AbortController();
        window.addEventListener(
            "pointerover",
            (event) => {
                if (trigger.contains(event.target as Node))
                    hoveredAt ||= performance.now();
            },
            { capture: true, signal: hovers.signal },
        );
        await interact(() => userEvent.hover(trigger));
        hovers.abort();
        expect(hoveredAt).toBeGreaterThan(0);
        await until(() => tooltip() !== null && box(tooltip()!).top > 0, 3000);
        // A timer never fires early, however loaded the machine; the margin covers the clock's
        // coarsening.
        expect(changed.open - hoveredAt).toBeGreaterThanOrEqual(400 - 1);
        const shown = box(tooltip()!);
        const under = box(trigger);
        expect(shown.top).toBeGreaterThanOrEqual(under.bottom);
        expect(shown.left + shown.width / 2).toBeCloseTo(
            under.left + under.width / 2,
            0,
        );
        await interact(() => userEvent.unhover(trigger));
        await until(() => tooltip() === null, 3000);
        expect(tooltip()).toBeNull();
    });

    it("shows on a long press instead of pressing, and hides a while after it ends", async () => {
        const pressed: string[] = [];
        await render(
            saveButton(() => pressed.push("press")),
            engine,
        );
        const release = await hold(byTestId("pf-icon-button-root"));
        await until(() => tooltip() !== null, 3000);
        expect(tooltip()).not.toBeNull();
        const releasedAt = performance.now();
        await release();
        expect(pressed).toEqual([]);
        await until(() => tooltip() === null, 4000);
        expect(tooltip()).toBeNull();
        expect(changed.closed - releasedAt).toBeGreaterThanOrEqual(
            LONG_PRESS_TOOLTIP_MS - 1,
        );
    });

    it("shows when the keyboard focuses its trigger, and Escape hides it", async () => {
        await render(saveButton(), engine);
        await interact(() => userEvent.tab());
        await until(() => tooltip() !== null, 3000);
        expect(tooltip()).not.toBeNull();
        await interact(() => userEvent.keyboard("{Escape}"));
        await until(() => tooltip() === null);
        expect(tooltip()).toBeNull();
    });
});

describe.each([animated, reanimated])(
    "the modal dialog with $name",
    (engine) => {
        const dialog = () =>
            document.querySelector<HTMLElement>(
                '[data-testid="pf-dialog-root"]',
            );
        const scrim = () =>
            document.querySelector<HTMLElement>(
                '[data-testid="pf-scrim-root"]',
            );

        it("opens over a scrim from its trigger, and the scrim, Escape, and its actions close it", async () => {
            const asked: boolean[] = [];
            await render(
                <Dialog
                    trigger="Discard"
                    headline="Discard draft?"
                    onOpenChange={(details) => asked.push(details.open)}
                    actions={({ close }) => (
                        <Button variant="text" label="Cancel" onPress={close} />
                    )}
                >
                    Your changes won't be saved.
                </Dialog>,
                engine,
            );
            const open = async () => {
                await interact(() =>
                    userEvent.click(
                        [
                            ...document.querySelectorAll<HTMLElement>(
                                '[role="button"]',
                            ),
                        ].find((button) => button.textContent === "Discard")!,
                    ),
                );
                await settle(600);
                expect(dialog()).not.toBeNull();
            };
            expect(dialog()).toBeNull();
            await open();
            expect(scrim()).not.toBeNull();
            expect(dialog()!.getAttribute("aria-label")).toBe("Discard draft?");
            expect(dialog()!.closest('[aria-modal="true"]')).not.toBeNull();
            // The scrim lets presses through, so only the stacking shows it's behind: the
            // dialog's wrapper beside it draws over it.
            const holder = [...scrim()!.parentElement!.children].find(
                (sibling) => sibling.contains(dialog()),
            )!;
            expect(Number(getComputedStyle(holder).zIndex)).toBeGreaterThan(
                Number(getComputedStyle(scrim()!).zIndex),
            );
            // A press on the scrim, beside the dialog.
            const beside = document.elementFromPoint(4, 4) as HTMLElement;
            expect(dialog()!.contains(beside)).toBe(false);
            await interact(() =>
                userEvent.click(beside, { position: { x: 4, y: 4 } }),
            );
            await until(() => dialog() === null);
            expect(dialog()).toBeNull();
            expect(scrim()).toBeNull();

            await open();
            await interact(() => userEvent.keyboard("{Escape}"));
            await until(() => dialog() === null);
            expect(dialog()).toBeNull();

            await open();
            await interact(() =>
                userEvent.click(
                    [
                        ...document.querySelectorAll<HTMLElement>(
                            '[role="button"]',
                        ),
                    ].find((button) => button.textContent === "Cancel")!,
                ),
            );
            await until(() => dialog() === null);
            expect(dialog()).toBeNull();
            expect(asked).toEqual([true, false, true, false, true, false]);
        });

        it("draws a menu opened inside it over it, and Escape closes the menu first", async () => {
            await render(
                <Dialog
                    defaultOpen
                    role="alertdialog"
                    headline="Move to"
                    actions={<Menu trigger="Folder" items={ITEMS} />}
                >
                    Pick a folder.
                </Dialog>,
                engine,
            );
            await settle(600);
            expect(dialog()!.getAttribute("role")).toBe("alertdialog");
            // An alert dialog stays when the scrim is pressed.
            await interact(() =>
                userEvent.click(
                    document.elementFromPoint(4, 4) as HTMLElement,
                    {
                        position: { x: 4, y: 4 },
                    },
                ),
            );
            await settle(400);
            expect(dialog()).not.toBeNull();
            await interact(() =>
                userEvent.click(
                    [
                        ...document.querySelectorAll<HTMLElement>(
                            '[role="button"]',
                        ),
                    ].find((button) => button.textContent === "Folder")!,
                ),
            );
            await settle(400);
            const item = items()[0]!;
            const at = box(item);
            expect(
                item.contains(
                    document.elementFromPoint(
                        at.left + at.width / 2,
                        at.top + at.height / 2,
                    ),
                ),
            ).toBe(true);
            await interact(() => userEvent.keyboard("{Escape}"));
            await until(() => menu() === null);
            expect(menu()).toBeNull();
            expect(dialog()).not.toBeNull();
            await interact(() => userEvent.keyboard("{Escape}"));
            await until(() => dialog() === null);
            expect(dialog()).toBeNull();
        });
    },
);

it("stacks open overlays by their layers: a menu, then a snackbar, then a tooltip", async () => {
    let snackbars!: Snackbars;
    function Grab(): ReactNode {
        snackbars = useSnackbar();
        return null;
    }
    await render(
        <>
            <Grab />
            <Tooltip
                defaultOpen
                supportingText="Tip"
                trigger={(trigger) => (
                    <IconButton {...trigger} aria-label="Tip" icon="?" />
                )}
            />
            <Menu defaultOpen trigger="Edit" items={ITEMS} />
        </>,
    );
    await interact(() => {
        snackbars.show({ supportingText: "Saved", duration: null });
    });
    await settle(400);
    const order = [
        ...document.querySelectorAll(
            '[role="menu"], [role="status"], [role="tooltip"]',
        ),
    ].map((element) => element.getAttribute("role"));
    expect(order).toEqual(["menu", "status", "tooltip"]);
});
