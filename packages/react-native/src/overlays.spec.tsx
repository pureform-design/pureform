import { useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformContainer, PureformProvider, placeOverlay } from ".";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { FullscreenDialog } from "./fullscreen-dialog";
import { IconButton } from "./icon-button";
import { Menu } from "./menu";
import { Popover } from "./popover";
import { RichTooltip } from "./rich-tooltip";
import { SideSheet } from "./side-sheet";
import { useSnackbar } from "./snackbar";
import type { Snackbars } from "./snackbar";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import {
    byTestId,
    interact,
    drag,
    laidOut,
    mount,
    outside,
    pointerAway,
    settle,
} from "./testing/render";
import { createToaster, Toaster } from "./toast";
import { LONG_PRESS_TOOLTIP_MS, Tooltip } from "./tooltip";

let registry: TestRegistry;

beforeAll(async () => {
    const names = [
        "menu",
        "button",
        "iconButton",
        "snackbar",
        "toast",
        "tooltip",
        "richTooltip",
        "popover",
        "dialog",
        "fullscreenDialog",
        "bottomSheet",
        "sideSheet",
        "dragHandle",
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

    it("cascades by default only when a submenu fits beside the menu within the nearest container too", async () => {
        const items = [
            { value: "cut", label: "Cut" },
            {
                value: "share",
                label: "Share",
                items: [{ value: "mail", label: "Mail" }],
            },
        ];
        const labels = () =>
            [...document.querySelectorAll('[role="menuitem"]')].map(
                (item) => item.textContent,
            );
        const openShare = async (container: ReactNode) => {
            document.body.innerHTML = "";
            await render(container, engine);
            await interact(() => userEvent.click(byTestId("pf-button-root")));
            await settle(400);
            await interact(() => userEvent.click(items_()[1]!));
        };
        const items_ = () => [
            ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
        ];
        // The window is wide enough for a submenu beside the menu either way.
        await openShare(
            <PureformContainer style={{ width: 200 }}>
                <Menu trigger="Edit" items={items} />
            </PureformContainer>,
        );
        await until(() => labels().includes("‹Share"));
        expect(labels()).toEqual(["‹Share", "Mail"]);
        await openShare(
            <PureformContainer style={{ width: 400 }}>
                <Menu trigger="Edit" items={items} />
            </PureformContainer>,
        );
        await until(() => labels().includes("Mail"));
        expect(labels()).toEqual(["Cut", "Share›", "Mail"]);
        // With no container around it, only the window counts.
        await openShare(<Menu trigger="Edit" items={items} />);
        await until(() => labels().includes("Mail"));
        expect(labels()).toEqual(["Cut", "Share›", "Mail"]);
    });

    it("decides with the container's position as of the menu opening, though it moved without resizing", async () => {
        const items = [
            { value: "cut", label: "Cut" },
            {
                value: "share",
                label: "Share",
                items: [{ value: "mail", label: "Mail" }],
            },
        ];
        const labels = () =>
            [...document.querySelectorAll('[role="menuitem"]')].map(
                (item) => item.textContent,
            );
        let move: (to: number) => void = () => undefined;
        const Moving = () => {
            const [x, setX] = useState(-300);
            move = setX;
            return (
                <PureformContainer
                    style={{ width: 400, transform: [{ translateX: x }] }}
                >
                    <Menu trigger="Edit" items={items} />
                </PureformContainer>
            );
        };
        document.body.innerHTML = "";
        await render(<Moving />, engine);
        await settle(200);
        // It moves by a transform, which doesn't lay it out again: its cached frame is stale.
        await interact(() => move(0));
        await settle(200);
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        await settle(400);
        await interact(() =>
            userEvent.click(
                document.querySelectorAll<HTMLElement>('[role="menuitem"]')[1]!,
            ),
        );
        // Measured when it opens, it's back in the window, so the submenu cascades.
        await until(() => labels().includes("Mail"));
        expect(labels()).toEqual(["Cut", "Share›", "Mail"]);
    });

    it("decides when the submenu opens, with the container as it is then, and never flips", async () => {
        const items = [
            { value: "cut", label: "Cut" },
            {
                value: "share",
                label: "Share",
                items: [{ value: "mail", label: "Mail" }],
            },
        ];
        const labels = () =>
            [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
                item.textContent?.trim(),
            );
        let move: (to: number) => void = () => undefined;
        const Moving = () => {
            const [x, setX] = useState(0);
            move = setX;
            return (
                <PureformContainer
                    style={{ width: 400, transform: [{ translateX: x }] }}
                >
                    <Menu trigger="Edit" items={items} />
                </PureformContainer>
            );
        };
        document.body.innerHTML = "";
        await render(<Moving />, engine);
        await settle(200);
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        await settle(400);
        // It moves by a transform after the menu is shown, then the submenu opens.
        await interact(() => move(-300));
        await settle(200);
        const seen: string[] = [];
        const watch = new MutationObserver(() => {
            const now = labels();
            if (now.includes("Mail") || now.includes("‹Share"))
                seen.push(now.join("|"));
        });
        watch.observe(document.body, { subtree: true, childList: true });
        await interact(() =>
            userEvent.click(
                document.querySelectorAll<HTMLElement>('[role="menuitem"]')[1]!,
            ),
        );
        await until(() => labels().includes("‹Share"));
        await settle(400);
        watch.disconnect();
        // Decided with the new position (drilled), and the first render shows the final mode.
        expect(labels()).toEqual(["‹Share", "Mail"]);
        expect(new Set(seen).size).toBe(1);
    });

    it("opens a cascaded submenu with the arrow toward the end and backs out with the other, on the web", async () => {
        const label = () =>
            (document.activeElement as HTMLElement | null)?.textContent;
        const picked: string[] = [];
        await render(
            <Menu
                trigger="Edit"
                submenu="cascade"
                items={[
                    { value: "cut", label: "Cut" },
                    {
                        value: "share",
                        label: "Share",
                        items: [
                            { value: "mail", label: "Mail" },
                            { value: "link", label: "Copy link" },
                        ],
                    },
                ]}
                onSelect={(details) => picked.push(details.value)}
            />,
            engine,
        );
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        await settle(400);
        await interact(() => userEvent.keyboard("{ArrowDown}"));
        expect(label()).toContain("Share");
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        await until(() => label() === "Mail");
        expect(label()).toBe("Mail");
        expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2);
        await interact(() => userEvent.keyboard("{ArrowDown}"));
        expect(label()).toBe("Copy link");
        await interact(() => userEvent.keyboard("{ArrowLeft}"));
        await until(
            () => document.querySelectorAll('[role="menu"]').length === 1,
        );
        expect(label()).toContain("Share");
        // In again, and Enter picks the leaf.
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        await until(() => label() === "Mail");
        expect(label()).toBe("Mail");
        await interact(() => userEvent.keyboard("{Enter}"));
        await until(() => picked.length > 0);
        expect(picked).toEqual(["mail"]);
    });

    it("opens against its trigger with defaultOpen, before any interaction", async () => {
        await render(
            <View style={{ paddingTop: 120, paddingLeft: 200 }}>
                <Menu defaultOpen trigger="Edit" items={ITEMS} />
            </View>,
            engine,
        );
        await until(() => {
            const surface = menu();
            return (
                surface !== null &&
                Math.abs(
                    box(surface).top - box(byTestId("pf-button-root")).bottom,
                ) < 16
            );
        });
        const trigger = box(byTestId("pf-button-root"));
        const surface = box(menu()!);
        // Below the trigger, at its start, as a menu opened by a press.
        expect(surface.top).toBeGreaterThanOrEqual(trigger.bottom);
        expect(surface.top - trigger.bottom).toBeLessThan(16);
        expect(Math.abs(surface.left - trigger.left)).toBeLessThan(1);
    });
});

describe.each([animated, reanimated])(
    "the menu's context trigger with $name",
    (engine) => {
        it("opens where it's right-clicked, or from the context menu key, without a trigger", async () => {
            await render(
                <Menu
                    contextTrigger={
                        <View style={{ width: 300, height: 200 }} />
                    }
                    items={ITEMS}
                />,
                engine,
            );
            const area = byTestId("pf-menu-context-trigger");
            expect(menu()).toBeNull();
            expect(
                document.querySelector('[data-testid="pf-button-root"]'),
            ).toBe(null);
            await interact(() => {
                area.dispatchEvent(
                    new MouseEvent("contextmenu", {
                        bubbles: true,
                        cancelable: true,
                        clientX: 120,
                        clientY: 90,
                    }),
                );
            });
            await settle(400);
            expect(menu()).not.toBeNull();
            // At the pointer, over the page; the placement's gutter is 8.
            expect(box(menu()!).left).toBeCloseTo(120, 0);
            expect(box(menu()!).top).toBeCloseTo(98, 0);
            await interact(() => userEvent.keyboard("{Escape}"));
            await until(() => menu() === null);
            await interact(() => {
                area.dispatchEvent(
                    new KeyboardEvent("keydown", {
                        bubbles: true,
                        cancelable: true,
                        key: "F10",
                        shiftKey: true,
                    }),
                );
            });
            await settle(400);
            expect(menu()).not.toBeNull();
        });
    },
);

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
            // The real pointer away: an earlier test's click on the action leaves it where this
            // snackbar shows, and its leaving as the snackbar grows would let it go.
            await pointerAway();
            await render(<Grab />, engine);
            const done: string[] = [];
            await interact(() => {
                snackbars.show({
                    supportingText: "Archived",
                    action: "Undo",
                    duration: 1000,
                    onAction: () => done.push("undo"),
                    onOpenChange: (details) => done.push(details.reason),
                });
            });
            const text = document.querySelector<HTMLElement>(
                '[data-testid="pf-snackbar-supporting-text"]',
            )!;
            const holder = roots()[0]!.parentElement!;
            // The pointer arrives from the page, at once: a hover command can come back after
            // the countdown has run out on a loaded machine.
            const pointer = { pointerType: "mouse", pointerId: 1 };
            await interact(() => {
                holder.dispatchEvent(new PointerEvent("pointerenter", pointer));
            });
            await settle(1500);
            expect(roots().length).toBe(1);
            await interact(() => {
                holder.dispatchEvent(new PointerEvent("pointerleave", pointer));
            });
            // A press on it holds it too, as a touch does.
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
            await settle(1500);
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

        it("sits above its offset, and takes its layout", async () => {
            await render(<Grab />, engine);
            await interact(() => {
                snackbars.show({
                    supportingText: "Raised",
                    action: "Undo",
                    duration: null,
                    offset: 80,
                    layout: "longAction",
                });
            });
            await settle(100);
            expect(
                window.innerHeight - box(roots()[0]!).bottom,
            ).toBeGreaterThanOrEqual(96);
            const root = roots()[0]!;
            expect(getComputedStyle(root).flexWrap).toBe("wrap");
            // The actions wrap below the text, at the end.
            const part = (name: string) =>
                box(
                    root.querySelector<HTMLElement>(
                        `[data-testid="pf-snackbar-${name}"]`,
                    )!,
                );
            expect(part("actions").top).toBeGreaterThanOrEqual(
                part("supporting-text").bottom,
            );
            expect(part("actions").right).toBeGreaterThan(
                part("supporting-text").right - 1,
            );
            expect(part("actions").left).toBeGreaterThan(box(root).left + 50);
            await interact(() => snackbars.dismiss());
            await until(() => roots().length === 0);
        });
    },
);

describe.each([animated, reanimated])("the toaster with $name", (engine) => {
    const roots = () => [
        ...document.querySelectorAll<HTMLElement>(
            '[data-testid="pf-toast-root"]',
        ),
    ];

    it("shows several at once, each with its type's icon, and closes each after its duration", async () => {
        const toaster = createToaster({ placement: "bottom-end" });
        await render(<Toaster toaster={toaster} />, engine);
        await interact(() => {
            toaster.success({ title: "Saved", duration: 300 });
            toaster.error({ title: "Failed", description: "Try again." });
        });
        await settle(100);
        expect(roots().map((root) => root.textContent)).toEqual([
            expect.stringContaining("Failed"),
            expect.stringContaining("Saved"),
        ]);
        expect(roots()[0]!.getAttribute("role")).toBe("status");
        await until(() => roots().length === 1, 2000);
        expect(roots().map((root) => root.textContent)).toEqual([
            expect.stringContaining("Failed"),
        ]);
        await interact(() => toaster.dismiss());
        await until(() => roots().length === 0, 2000);
        expect(roots()).toEqual([]);
    });

    it("runs the action, then closes; a loading toast stays", async () => {
        const toaster = createToaster();
        const onClick = vi.fn();
        await render(<Toaster toaster={toaster} closeLabel="Close" />, engine);
        await interact(() => {
            toaster.loading({ title: "Uploading", duration: 100 });
            toaster.info({
                title: "Archived",
                duration: Infinity,
                action: { label: "Undo", onClick },
            });
        });
        await settle(100);
        expect(document.querySelector('[aria-label="Close"]')).not.toBeNull();
        const action = document.querySelector<HTMLElement>(
            '[data-testid="pf-toast-action-trigger"]',
        )!;
        await interact(() => action.click());
        expect(onClick).toHaveBeenCalledOnce();
        await until(() => roots().length === 1, 2000);
        await settle(300);
        expect(roots().map((root) => root.textContent)).toEqual([
            expect.stringContaining("Uploading"),
        ]);
    });

    // Drags the toast's root sideways by `moves` (px from where it went down), then lets go.
    const swipe = async (root: HTMLElement, moves: readonly number[]) => {
        const from = box(root);
        const at = (dx: number) => ({
            bubbles: true,
            button: 0,
            buttons: 1,
            clientX: from.left + from.width / 2 + dx,
            clientY: from.top + from.height / 2,
        });
        await interact(() => {
            root.dispatchEvent(new MouseEvent("mousedown", at(0)));
        });
        for (const dx of moves) {
            await settle(120);
            await interact(() => {
                root.dispatchEvent(new MouseEvent("mousemove", at(dx)));
            });
        }
        return {
            from,
            release: () =>
                interact(() => {
                    root.dispatchEvent(
                        new MouseEvent("mouseup", at(moves.at(-1)!)),
                    );
                }),
        };
    };

    it("swipes a toast away sideways past half its width, holding its timer meanwhile", async () => {
        const toaster = createToaster();
        await render(<Toaster toaster={toaster} />, engine);
        await interact(() => {
            toaster.info({ title: "Archived", duration: 600 });
        });
        await settle(100);
        const root = roots()[0]!;
        const width = box(root).width;
        const { from, release } = await swipe(root, [
            20,
            width * 0.3,
            width * 0.6,
        ]);
        expect(box(root).left).toBeGreaterThan(from.left + width * 0.4);
        // Held past its duration: still there.
        await settle(700);
        expect(roots()).toHaveLength(1);
        await release();
        await until(() => roots().length === 0, 2000);
    });

    it("settles a short swipe back, and doesn't move a toast that can't be closed", async () => {
        const toaster = createToaster();
        await render(<Toaster toaster={toaster} />, engine);
        await interact(() => {
            toaster.info({ title: "Kept", duration: Infinity });
        });
        await settle(100);
        let root = roots()[0]!;
        const short = await swipe(root, [20, -40]);
        expect(box(root).left).toBeLessThan(short.from.left - 20);
        await short.release();
        await until(() => Math.abs(box(root).left - short.from.left) < 1);
        expect(roots()).toHaveLength(1);

        await interact(() => toaster.dismiss());
        await until(() => roots().length === 0, 2000);
        await interact(() => {
            toaster.info({
                title: "Stuck",
                duration: Infinity,
                closable: false,
            });
        });
        await settle(100);
        root = roots()[0]!;
        const stuck = await swipe(root, [20, 200]);
        expect(box(root).left).toBe(stuck.from.left);
        await stuck.release();
        await settle(300);
        expect(roots()).toHaveLength(1);
    });
});

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

it("shows a rich tooltip's parts open, interactive by default", async () => {
    await render(
        <RichTooltip
            defaultOpen
            subhead="Drafts"
            supportingText="Drafts stay here."
            actions={<IconButton aria-label="More" icon="M" />}
            trigger={(trigger) => (
                <IconButton {...trigger} aria-label="Tip" icon="?" />
            )}
        />,
    );
    await settle(400);
    const tip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(tip).not.toBeNull();
    for (const part of ["subhead", "supporting-text", "actions"]) {
        expect(
            tip.querySelector(`[data-testid="pf-rich-tooltip-${part}"]`),
        ).not.toBeNull();
    }
    expect(tip.parentElement!.style.pointerEvents).toBe("auto");
});

describe.each([animated, reanimated])("the popover with $name", (engine) => {
    const popover = () =>
        document.querySelector<HTMLElement>('[role="dialog"]');

    it("opens from its trigger with its parts, closes on a press outside or Escape", async () => {
        const changes: boolean[] = [];
        await render(
            <Popover
                trigger="Filters"
                heading="Filters"
                body="Show only the items that match."
                actions={({ close }) => (
                    <IconButton aria-label="Done" icon="✓" onPress={close} />
                )}
                onOpenChange={({ open }) => changes.push(open)}
            />,
            engine,
        );
        expect(popover()).toBeNull();
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        await settle(400);
        expect(popover()).not.toBeNull();
        for (const part of ["title", "body", "actions"]) {
            expect(
                popover()!.querySelector(`[data-testid="pf-popover-${part}"]`),
            ).not.toBeNull();
        }
        expect(changes).toEqual([true]);
        const page = document.elementFromPoint(300, 300) as HTMLElement;
        expect(popover()!.contains(page)).toBe(false);
        await interact(() => userEvent.click(page));
        await until(() => popover() === null);
        expect(popover()).toBeNull();
        expect(changes).toEqual([true, false]);
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        await settle(400);
        expect(popover()).not.toBeNull();
        await interact(() => userEvent.keyboard("{Escape}"));
        await until(() => popover() === null);
        expect(popover()).toBeNull();
    });

    it("stays open on a press outside with closeOnInteractOutside off", async () => {
        await render(
            <Popover
                defaultOpen
                closeOnInteractOutside={false}
                trigger="Filters"
                heading="Filters"
            />,
            engine,
        );
        await settle(400);
        const page = document.elementFromPoint(300, 300) as HTMLElement;
        await interact(() => userEvent.click(page));
        await settle(400);
        expect(popover()).not.toBeNull();
    });
});

describe.each([animated, reanimated])(
    "the modal full-screen dialog with $name",
    (engine) => {
        const dialog = () =>
            document.querySelector<HTMLElement>(
                '[data-testid="pf-fullscreen-dialog-root"]',
            );
        const press = (name: string) =>
            interact(() =>
                userEvent.click(
                    [
                        ...document.querySelectorAll<HTMLElement>(
                            '[role="button"]',
                        ),
                    ].find(
                        (button) =>
                            button.textContent === name ||
                            button.getAttribute("aria-label") === name,
                    )!,
                ),
            );

        it("opens from its trigger, fills the screen, has no scrim, and its close button, Escape, and confirm action close it", async () => {
            const asked: boolean[] = [];
            await render(
                <FullscreenDialog
                    trigger="New event"
                    headline="New event"
                    onOpenChange={(details) => asked.push(details.open)}
                    confirmAction={({ close }) => (
                        <Button variant="text" label="Save" onPress={close} />
                    )}
                >
                    Fill in the details.
                </FullscreenDialog>,
                engine,
            );
            const open = async () => {
                await press("New event");
                await settle(600);
                expect(dialog()).not.toBeNull();
            };
            expect(dialog()).toBeNull();
            await open();
            expect(
                document.querySelector('[data-testid="pf-scrim-root"]'),
            ).toBeNull();
            expect(dialog()!.getAttribute("aria-label")).toBe("New event");
            expect(dialog()!.closest('[aria-modal="true"]')).not.toBeNull();
            expect(
                document.querySelector(
                    '[data-testid="pf-fullscreen-dialog-header"]',
                ),
            ).not.toBeNull();
            const at = box(dialog()!);
            // The dialog's `Modal` is a window, so it fills the viewport, not the test's frame.
            expect(at.width).toBeGreaterThanOrEqual(window.innerWidth - 1);
            expect(at.height).toBeGreaterThanOrEqual(window.innerHeight - 1);

            await press("Close");
            await until(() => dialog() === null);
            expect(dialog()).toBeNull();

            await open();
            await interact(() => userEvent.keyboard("{Escape}"));
            await until(() => dialog() === null);
            expect(dialog()).toBeNull();

            await open();
            await press("Save");
            await until(() => dialog() === null);
            expect(dialog()).toBeNull();
            expect(asked).toEqual([true, false, true, false, true, false]);
        });
    },
);

describe("the sheets", () => {
    // Drags the handle down by each of `moves` in turn, from where it rests now. Each move is
    // its own task: the pan responder takes a move's distance over the time since the last, so
    // moves dispatched within one tick (one timestamp) would be dropped.
    // Down by each of `moves`, from near the handle's top left.
    const dragDown = (handle: HTMLElement, moves: readonly number[]) =>
        drag(
            handle,
            moves.map((dy) => [0, dy] as const),
            { x: 4, y: 4 },
        );
    const sheet = (scope: string) =>
        document.querySelector<HTMLElement>(`[data-testid="pf-${scope}-root"]`);
    const press = (name: string) =>
        interact(() =>
            userEvent.click(
                [
                    ...document.querySelectorAll<HTMLElement>(
                        '[role="button"]',
                    ),
                ].find(
                    (button) =>
                        button.textContent === name ||
                        button.getAttribute("aria-label") === name,
                )!,
            ),
        );

    it("opens a modal bottom sheet from its trigger, over a scrim, and its drag handle and Escape close it", async () => {
        const asked: boolean[] = [];
        await render(
            <BottomSheet
                trigger="Share"
                aria-label="Share"
                onOpenChange={(details) => asked.push(details.open)}
            >
                Share to
            </BottomSheet>,
        );
        const open = async () => {
            await press("Share");
            await settle(600);
            expect(sheet("bottom-sheet")).not.toBeNull();
        };
        expect(sheet("bottom-sheet")).toBeNull();
        await open();
        expect(
            document.querySelector('[data-testid="pf-scrim-root"]'),
        ).not.toBeNull();
        expect(
            sheet("bottom-sheet")!.closest('[aria-modal="true"]'),
        ).not.toBeNull();
        // Only a dialog says it's modal on the web (axe's aria-allowed-attr): React Native Web's
        // Modal is that dialog.
        for (const modal of document.querySelectorAll("[aria-modal]"))
            expect(modal.getAttribute("role")).toBe("dialog");

        await press("Close sheet");
        await until(() => sheet("bottom-sheet") === null);

        await open();
        await interact(() => userEvent.keyboard("{Escape}"));
        await until(() => sheet("bottom-sheet") === null);
        expect(asked).toEqual([true, false, true, false]);
    });

    it("asks onClose before Escape, the scrim, or the drag handle's press closes a modal bottom sheet", async () => {
        const asked: boolean[] = [];
        let answer = false;
        let questions = 0;
        await render(
            <BottomSheet
                defaultOpen
                aria-label="Share"
                onOpenChange={(details) => asked.push(details.open)}
                onClose={() => {
                    questions++;
                    return answer;
                }}
            >
                Share to
            </BottomSheet>,
        );
        await settle(600);
        expect(sheet("bottom-sheet")).not.toBeNull();
        await interact(() => userEvent.keyboard("{Escape}"));
        await press("Close sheet");
        const beside = document.elementFromPoint(4, 4) as HTMLElement;
        expect(sheet("bottom-sheet")!.contains(beside)).toBe(false);
        await interact(() =>
            userEvent.click(beside, { position: { x: 4, y: 4 } }),
        );
        await settle(100);
        expect(questions).toBe(3);
        expect(asked).toEqual([]);
        expect(sheet("bottom-sheet")).not.toBeNull();
        answer = true;
        await press("Close sheet");
        await until(() => sheet("bottom-sheet") === null);
        expect(questions).toBe(4);
        expect(asked).toEqual([false]);
    });

    it("renders a standard bottom sheet as its surface alone", async () => {
        await render(<BottomSheet modal={false}>Share to</BottomSheet>);
        expect(sheet("bottom-sheet")).not.toBeNull();
        expect(
            sheet("bottom-sheet")!.closest('[aria-modal="true"]'),
        ).toBeNull();
        expect(
            document.querySelector('[data-testid="pf-scrim-root"]'),
        ).toBeNull();
    });

    it("lays a standalone bottom sheet out as its surface would be, whatever its parent's layout", async () => {
        for (const layout of [
            { alignItems: "center" },
            { flexDirection: "row" },
            {},
        ] as const) {
            await render(
                <View style={{ width: 600, height: 400, ...layout }}>
                    <BottomSheet modal={false}>Share to</BottomSheet>
                </View>,
            );
            const root = sheet("bottom-sheet")!;
            const parent = root.parentElement!.parentElement!;
            expect(box(root).width).toBe(box(parent).width);
            expect(box(root).left).toBe(box(parent).left);
            expect(box(root).height).toBeGreaterThan(0);
            // Its layer (`raised`, as a standard sheet) orders it among its parent's children.
            expect(["auto", "0"]).not.toContain(
                getComputedStyle(root.parentElement!).zIndex,
            );
        }
    });

    it("settles a dragged bottom sheet back when the app keeps it open", async () => {
        const asked: boolean[] = [];
        await render(
            <BottomSheet
                modal={false}
                open
                onOpenChange={(details) => asked.push(details.open)}
            >
                Share to
            </BottomSheet>,
        );
        const root = sheet("bottom-sheet")!;
        const handle = document.querySelector<HTMLElement>(
            '[data-testid="pf-bottom-sheet-drag-handle"]',
        )!;
        // A drag closes it past Compose's thresholds, from its height, which it knows once laid
        // out.
        await laidOut(root);
        const start = box(root).top;
        const release = await dragDown(handle, [20, 100, 200, 300]);
        expect(box(root).top).toBeGreaterThan(start + 100);
        await release();
        expect(asked).toEqual([false]);
        await until(() => box(root).top === start);
        expect(box(root).top).toBe(start);
    });

    it("rests a tall bottom sheet partly open by default, and moves it between partly and fully open", async () => {
        const expanded: boolean[] = [];
        const tall = window.innerHeight;
        await render(
            <View style={{ height: tall }}>
                <BottomSheet
                    modal={false}
                    open
                    onExpandedChange={(details) =>
                        expanded.push(details.expanded)
                    }
                >
                    <View style={{ height: tall }} />
                </BottomSheet>
            </View>,
        );
        const root = sheet("bottom-sheet")!;
        const frame = root.parentElement!.parentElement!;
        await laidOut(root);
        const partial = box(root).height - tall / 2;
        await until(
            () => Math.abs(box(root).top - box(frame).top - partial) < 2,
        );
        // Opening where it rests isn't a change of the user's.
        expect(expanded).toEqual([]);
        await press("Expand sheet");
        await until(() => Math.abs(box(root).top - box(frame).top) < 1);
        expect(expanded).toEqual([true]);
        await press("Collapse sheet");
        await until(
            () => Math.abs(box(root).top - box(frame).top - partial) < 2,
        );
        expect(expanded).toEqual([true, false]);
        // A short drag up, past Compose's 56px, goes on to fully open.
        const handle = document.querySelector<HTMLElement>(
            '[data-testid="pf-bottom-sheet-drag-handle"]',
        )!;
        await (
            await drag(
                handle,
                [
                    [0, -20],
                    [0, -40],
                    [0, -70],
                ],
                { x: 4, y: 4 },
            )
        )();
        await until(() => Math.abs(box(root).top - box(frame).top) < 1);
        expect(expanded).toEqual([true, false, true]);
    });

    it("opens a tall bottom sheet fully given partiallyExpandable={false} or defaultExpanded", async () => {
        const tall = window.innerHeight;
        for (const props of [
            { partiallyExpandable: false },
            { defaultExpanded: true },
        ]) {
            await render(
                <View style={{ height: tall }}>
                    <BottomSheet modal={false} open {...props}>
                        <View style={{ height: tall }} />
                    </BottomSheet>
                </View>,
            );
            const root = sheet("bottom-sheet")!;
            const frame = root.parentElement!.parentElement!;
            await laidOut(root);
            await settle(100);
            expect(Math.abs(box(root).top - box(frame).top)).toBeLessThan(1);
            expect(
                document.querySelector(
                    props.partiallyExpandable === false
                        ? '[aria-label="Close sheet"]'
                        : '[aria-label="Collapse sheet"]',
                ),
            ).not.toBeNull();
        }
    });

    it("follows a controlled expanded, and settles back where it says when the app doesn't follow", async () => {
        const expanded: boolean[] = [];
        const tall = window.innerHeight;
        const value = outside(true);
        await render(
            <value.Holder>
                {(expandedProp) => (
                    <View style={{ height: tall }}>
                        <BottomSheet
                            modal={false}
                            open
                            expanded={expandedProp}
                            onExpandedChange={(details) =>
                                expanded.push(details.expanded)
                            }
                        >
                            <View style={{ height: tall }} />
                        </BottomSheet>
                    </View>
                )}
            </value.Holder>,
        );
        const root = sheet("bottom-sheet")!;
        const frame = root.parentElement!.parentElement!;
        await laidOut(root);
        await settle(100);
        expect(Math.abs(box(root).top - box(frame).top)).toBeLessThan(1);
        const partial = box(root).height - tall / 2;
        // The prop moves it, without calling back.
        await value.set(false);
        await until(
            () => Math.abs(box(root).top - box(frame).top - partial) < 2,
        );
        expect(expanded).toEqual([]);
        // A press asks; kept partly open, it settles back.
        await press("Expand sheet");
        expect(expanded).toEqual([true]);
        await settle(600);
        expect(Math.abs(box(root).top - box(frame).top - partial)).toBeLessThan(
            2,
        );
    });

    it("places a partly open bottom sheet again when its content changes size", async () => {
        const tall = window.innerHeight;
        const content = outside(tall);
        await render(
            <content.Holder>
                {(height) => (
                    <View style={{ height: tall }}>
                        <BottomSheet modal={false} open>
                            <View style={{ height }} />
                        </BottomSheet>
                    </View>
                )}
            </content.Holder>,
        );
        const root = sheet("bottom-sheet")!;
        const frame = root.parentElement!.parentElement!;
        await laidOut(root);
        const offset = () => box(root).top - box(frame).top;
        await until(
            () => Math.abs(offset() - (box(root).height - tall / 2)) < 2,
        );
        await content.set(tall - 100);
        await until(
            () => Math.abs(offset() - (box(root).height - tall / 2)) < 2,
        );
        expect(box(root).height).toBeLessThan(tall);
        // Too short to rest partly open: fully open, and the handle closes it.
        await content.set(40);
        await until(() => Math.abs(offset()) < 1);
        expect(
            document.querySelector('[aria-label="Close sheet"]'),
        ).not.toBeNull();
    });

    it("holds a dragged bottom sheet until onClose answers, then springs back or leaves", async () => {
        const asked: boolean[] = [];
        let answer: (yes: boolean) => void = () => {};
        await render(
            <BottomSheet
                modal={false}
                open
                onOpenChange={(details) => asked.push(details.open)}
                onClose={() =>
                    new Promise<boolean>((resolve) => {
                        answer = resolve;
                    })
                }
            >
                Share to
            </BottomSheet>,
        );
        const root = sheet("bottom-sheet")!;
        const handle = document.querySelector<HTMLElement>(
            '[data-testid="pf-bottom-sheet-drag-handle"]',
        )!;
        await laidOut(root);
        const start = box(root).top;
        const drag = async () =>
            (await dragDown(handle, [20, 100, 200, 300]))();

        // It holds where it was let go while the app thinks, then springs back on false.
        await drag();
        const held = box(root).top;
        expect(held).toBeGreaterThan(start + 100);
        await settle(100);
        expect(box(root).top).toBe(held);
        expect(asked).toEqual([]);
        await interact(async () => answer(false));
        await until(() => box(root).top === start);
        expect(box(root).top).toBe(start);
        expect(asked).toEqual([]);

        // On true, it asks to close (and, kept open here, settles back).
        await drag();
        expect(box(root).top).toBeGreaterThan(start + 100);
        await interact(async () => answer(true));
        expect(asked).toEqual([false]);
        await until(() => box(root).top === start);
        expect(box(root).top).toBe(start);
    });

    it("closes a modal side sheet from its close button, and its back button calls onBack", async () => {
        const backs: number[] = [];
        await render(
            <SideSheet
                trigger="Filters"
                headline="Filters"
                onBack={() => backs.push(1)}
                actions={<Button label="Apply" />}
            >
                Narrow it down.
            </SideSheet>,
        );
        await press("Filters");
        await settle(600);
        expect(sheet("side-sheet")).not.toBeNull();
        expect(sheet("side-sheet")!.getAttribute("aria-label")).toBe("Filters");
        await press("Back");
        expect(backs).toEqual([1]);
        await press("Close");
        await until(() => sheet("side-sheet") === null);
        expect(sheet("side-sheet")).toBeNull();
    });

    it("drags a modal side sheet toward its edge, settling back short of halfway and closing past it", async () => {
        await render(
            <SideSheet trigger="Filters" headline="Filters">
                Narrow it down.
            </SideSheet>,
        );
        await press("Filters");
        await settle(600);
        const root = sheet("side-sheet")!;
        const start = box(root).left;
        // Slow moves, so the release isn't a flick.
        const slowly = async (
            moves: readonly (readonly [number, number])[],
        ) => {
            const from = box(root);
            const x = from.left + from.width / 2;
            const y = from.top + from.height / 2;
            const at = ([dx, dy]: readonly [number, number]) => ({
                bubbles: true,
                button: 0,
                buttons: 1,
                clientX: x + dx,
                clientY: y + dy,
            });
            await interact(() => {
                root.dispatchEvent(new MouseEvent("mousedown", at([0, 0])));
            });
            for (const move of moves) {
                await settle(120);
                await interact(() => {
                    root.dispatchEvent(new MouseEvent("mousemove", at(move)));
                });
            }
            return () =>
                interact(() => {
                    root.dispatchEvent(
                        new MouseEvent("mouseup", at(moves.at(-1) ?? [0, 0])),
                    );
                });
        };
        const short = await slowly([
            [20, 0],
            [40, 0],
            [42, 0],
        ]);
        // It follows the pointer once the move is past the slop.
        expect(box(root).left).toBeGreaterThan(start + 15);
        await short();
        await until(() => Math.abs(box(root).left - start) < 1);
        expect(sheet("side-sheet")).not.toBeNull();
        expect(Math.abs(box(root).left - start)).toBeLessThan(1);
        // Mostly down: its content's, not a drag.
        const down = await slowly([
            [2, 20],
            [4, 60],
        ]);
        expect(box(root).left).toBe(start);
        await down();
        const width = box(root).width;
        const far = await slowly([
            [20, 0],
            [width * 0.4, 0],
            [width * 0.7, 0],
            [width * 0.7 + 1, 0],
        ]);
        await far();
        await until(() => sheet("side-sheet") === null);
        expect(sheet("side-sheet")).toBeNull();
    });

    it.each([false, true])(
        "drags a standard side sheet (coplanar: %s) closed, asking through onOpenChange",
        async (coplanar) => {
            const onOpenChange = vi.fn();
            await render(
                <SideSheet
                    modal={false}
                    coplanar={coplanar}
                    open
                    onOpenChange={onOpenChange}
                    headline="Details"
                >
                    Info
                </SideSheet>,
            );
            await settle(600);
            const root = sheet("side-sheet")!;
            const from = box(root);
            const x = from.left + from.width / 2;
            const y = from.top + from.height / 2;
            const at = (dx: number) => ({
                bubbles: true,
                button: 0,
                buttons: 1,
                clientX: x + dx,
                clientY: y,
            });
            await interact(() => {
                root.dispatchEvent(new MouseEvent("mousedown", at(0)));
            });
            for (const dx of [20, from.width * 0.4, from.width * 0.7]) {
                await settle(120);
                await interact(() => {
                    root.dispatchEvent(new MouseEvent("mousemove", at(dx)));
                });
            }
            expect(box(root).left).toBeGreaterThan(from.left + 15);
            await interact(() => {
                root.dispatchEvent(
                    new MouseEvent("mouseup", at(from.width * 0.7)),
                );
            });
            await until(() => onOpenChange.mock.calls.length > 0);
            expect(onOpenChange).toHaveBeenCalledWith({ open: false });
            // The app kept it open: it settles back.
            await until(() => Math.abs(box(root).left - from.left) < 1);
        },
    );

    it("renders a coplanar side sheet as its surface alone", async () => {
        await render(
            <SideSheet modal={false} coplanar headline="Details">
                Info
            </SideSheet>,
        );
        expect(sheet("side-sheet")).not.toBeNull();
        expect(sheet("side-sheet")!.closest('[aria-modal="true"]')).toBeNull();
        expect(
            document.querySelector(
                '[data-testid="pf-side-sheet-close-trigger"]',
            ),
        ).not.toBeNull();
    });
});

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

describe("onClose on the dialog, the full-screen dialog and the side sheet", () => {
    const byRole = (name: string) =>
        [...document.querySelectorAll<HTMLElement>('[role="button"]')].find(
            (button) =>
                button.textContent === name ||
                button.getAttribute("aria-label") === name,
        )!;
    const press = (name: string) =>
        interact(() => userEvent.click(byRole(name)));
    const surface = (testId: string) =>
        document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

    const cases = [
        {
            name: "dialog",
            testId: "pf-dialog-root",
            scrim: true,
            closer: "Cancel",
            view: (props: {
                onClose: () => boolean;
                onOpenChange: (details: { open: boolean }) => void;
            }) => (
                <Dialog
                    trigger="Open"
                    headline="Discard draft?"
                    {...props}
                    actions={({ close }) => (
                        <Button variant="text" label="Cancel" onPress={close} />
                    )}
                >
                    Your changes won't be saved.
                </Dialog>
            ),
        },
        {
            name: "full-screen dialog",
            testId: "pf-fullscreen-dialog-root",
            scrim: false,
            closer: "Close",
            view: (props: {
                onClose: () => boolean;
                onOpenChange: (details: { open: boolean }) => void;
            }) => (
                <FullscreenDialog
                    trigger="Open"
                    headline="New event"
                    {...props}
                >
                    Fill in the details.
                </FullscreenDialog>
            ),
        },
        {
            name: "side sheet",
            testId: "pf-side-sheet-root",
            scrim: true,
            closer: "Close",
            view: (props: {
                onClose: () => boolean;
                onOpenChange: (details: { open: boolean }) => void;
            }) => (
                <SideSheet trigger="Open" headline="Filters" {...props}>
                    Narrow it down.
                </SideSheet>
            ),
        },
    ];

    it.each(cases)(
        "asks onClose before Escape, the scrim or the close control closes the $name, refused and allowed",
        async ({ testId, scrim, closer, view }) => {
            const asked: boolean[] = [];
            let answer = false;
            let questions = 0;
            await render(
                view({
                    onClose: () => {
                        questions++;
                        return answer;
                    },
                    onOpenChange: (details) => asked.push(details.open),
                }),
            );
            await press("Open");
            await settle(600);
            expect(surface(testId)).not.toBeNull();
            await interact(() => userEvent.keyboard("{Escape}"));
            if (scrim) {
                const beside = document.elementFromPoint(4, 4) as HTMLElement;
                expect(surface(testId)!.contains(beside)).toBe(false);
                await interact(() =>
                    userEvent.click(beside, { position: { x: 4, y: 4 } }),
                );
            }
            await press(closer);
            await settle(100);
            expect(questions).toBe(scrim ? 3 : 2);
            expect(asked).toEqual([true]);
            expect(surface(testId)).not.toBeNull();
            answer = true;
            await press(closer);
            await until(() => surface(testId) === null);
            expect(questions).toBe(scrim ? 4 : 3);
            expect(asked).toEqual([true, false]);
        },
    );
});
