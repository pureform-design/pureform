// The overlays: each draws over a positioned element that follows it in the page, at its layer of
// the theme's stacking scale; it animates in as it opens, and as it closes it stays until its exit
// animations end, then hides; under reduced motion it fades without moving (design doc §5.8).

import { compositeTestIds, testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { COMPONENTS, menu as menuCase, toastCase } from "./components";
import type { ComponentCase, OverlayCase } from "./components";
import { animationsDone } from "./harness/animations";
import { hostIn, mountCase, settlePlaced } from "./harness/page";
import type { SceneProps, SceneProvider } from "./harness/scene";

const overlays = COMPONENTS.filter(
    (component): component is ComponentCase & { overlay: OverlayCase } =>
        component.overlay !== undefined,
);

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const frames = async (count: number) => {
    for (let i = 0; i < count; i++) await frame();
};

// The properties each running animation's keyframes set.
const animated = (element: HTMLElement): string[][] =>
    element
        .getAnimations()
        .filter((animation) => animation.playState === "running")
        .map((animation) => [
            ...new Set(
                (animation.effect as KeyframeEffect)
                    .getKeyframes()
                    .flatMap((keyframe) =>
                        Object.keys(keyframe).filter(
                            (key) =>
                                ![
                                    "offset",
                                    "computedOffset",
                                    "easing",
                                    "composite",
                                ].includes(key),
                        ),
                    ),
            ),
        ]);

describe.each(overlays)("$component", (component) => {
    const { overlay } = component;

    // The scene, inside a host followed by a positioned element as tall as the viewport, which
    // the overlay must draw over, as a chip's ripple layer or a card would be.
    const mount = (props: SceneProps, provider?: SceneProvider) => {
        const host = hostIn(
            `<div><div data-host></div><div data-cover style="position: relative; height: 100vh; background: rgb(200 0 0)"></div></div>`,
        );
        const scene = mountCase(
            component,
            { ...overlay.props, defaultOpen: undefined, ...props },
            provider ? { host, provider } : { host },
        );
        overlay.place?.(host);
        return scene;
    };

    const shows = (host: HTMLElement) =>
        [overlay.surface(host), ...overlay.parts(host)].every(
            (element) => !element.hidden,
        );

    it("draws over a positioned element that follows it", async () => {
        const { host } = mount({ open: true });
        await settlePlaced();
        const surface = overlay.surface(host);
        // A plain tooltip lets the pointer through; the hit test needs it to stop there.
        surface.style.pointerEvents = "auto";
        const box = surface.getBoundingClientRect();
        expect(box.width).toBeGreaterThan(0);
        const hit = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
        );
        expect(surface.contains(hit)).toBe(true);
    });

    it("animates in as it opens, and stays while it animates out, then hides", async () => {
        const scene = mount({ open: false }, { motion: "full" });
        await settlePlaced();
        expect(shows(scene.host)).toBe(false);
        await scene.update({ open: true });
        await frames(2);
        const surface = overlay.surface(scene.host);
        const entered = overlay.moving?.enter(scene.host) ?? surface;
        expect(shows(scene.host)).toBe(true);
        // The movement (on a spring) and the fade (on its tween) are two animations. A popup
        // grows on the `scale` property (composing with its own transform), a sheet or dialog
        // moves on `transform`.
        const entering = animated(entered);
        expect(entering).toHaveLength(2);
        expect(entering).toEqual(
            expect.arrayContaining([
                [expect.stringMatching(/^(transform|scale)$/)],
                ["opacity"],
            ]),
        );
        await animationsDone();
        await scene.update({ open: false });
        await frames(2);
        expect(surface.dataset.state).toBe("closed");
        expect(shows(scene.host)).toBe(true);
        expect(
            animated(overlay.moving?.exit(scene.host) ?? surface).flat(),
        ).toContain("opacity");
        await animationsDone();
        await frames(3);
        expect(shows(scene.host)).toBe(false);
    });

    it("fades in and out without moving under reduced motion", async () => {
        const scene = mount({ open: false }, { motion: "reduce" });
        await settlePlaced();
        await scene.update({ open: true });
        await frames(2);
        const surface = overlay.surface(scene.host);
        expect(animated(overlay.moving?.enter(scene.host) ?? surface)).toEqual([
            ["opacity"],
        ]);
        await animationsDone();
        await scene.update({ open: false });
        await frames(2);
        expect(shows(scene.host)).toBe(true);
        expect(animated(overlay.moving?.exit(scene.host) ?? surface)).toEqual([
            ["opacity"],
        ]);
        await animationsDone();
        await frames(3);
        expect(shows(scene.host)).toBe(false);
    });
});

// A toast isn't an overlay case (Zag adds it after hydration), but it leaves as the snackbar
// does: shrinking to 80% on the fast spatial spring as it fades.
describe("Toast", () => {
    const leave = async (motion: "full" | "reduce") => {
        const host = hostIn("<div data-host></div>");
        mountCase(
            toastCase,
            { toasts: [{ type: "info", title: "Synced" }] },
            { host, provider: { motion } },
        );
        let root: HTMLElement | null = null;
        for (let i = 0; i < 100 && !root; i++) {
            await frame();
            root = document.querySelector<HTMLElement>(
                `[data-testid="${testIds.toast.root}"]`,
            );
        }
        if (!root) throw new Error("no toast");
        await animationsDone();
        expect(getComputedStyle(root).scale).not.toBe("0.8");
        root.querySelector<HTMLElement>(
            `[data-testid="${testIds.toast.closeTrigger}"]`,
        )!.click();
        await frames(2);
        expect(root.dataset.state).toBe("closed");
        return root;
    };
    const animationNames = (element: HTMLElement) =>
        element
            .getAnimations()
            .map((animation) => (animation as CSSAnimation).animationName);

    it("shrinks to 80% as it fades out, with the popups' overlayShrinkOut", async () => {
        const root = await leave("full");
        expect(animationNames(root)).toContain("overlayShrinkOut");
        expect(getComputedStyle(root).scale).not.toBe("1");
    });

    it("only fades under reduced motion", async () => {
        const root = await leave("reduce");
        expect(animationNames(root)).not.toContain("overlayShrinkOut");
        expect(["1", "none"]).toContain(getComputedStyle(root).scale);
    });
});

// A grouped menu rounds its run's outside corners without clipping, so a submenu, drawn inside
// it, shows whole.
describe("Menu", () => {
    it("shows a submenu whole inside a grouped menu", async () => {
        const host = hostIn("<div data-host></div>");
        mountCase(
            menuCase,
            {
                open: true,
                items: [],
                groups: [
                    {
                        id: "edit",
                        label: "Edit",
                        items: [
                            { value: "cut", label: "Cut" },
                            {
                                value: "share",
                                label: "Share",
                                items: [
                                    { value: "mail", label: "Mail" },
                                    { value: "link", label: "Copy link" },
                                ],
                            },
                        ],
                    },
                ],
            },
            { host },
        );
        await settlePlaced();
        const menus = () => [
            ...document.querySelectorAll<HTMLElement>('[role="menu"]'),
        ];
        const share = [
            ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
        ].find((item) => item.textContent?.includes("Share"))!;
        share.click();
        for (let i = 0; i < 60 && !menus()[1]?.checkVisibility(); i++) {
            await frame();
        }
        await animationsDone();
        await settlePlaced();
        const [parent, submenu] = menus();
        const outer = parent!.getBoundingClientRect();
        const inner = submenu!.getBoundingClientRect();
        // It sits beside its parent, outside the parent's box.
        expect(inner.left).toBeGreaterThanOrEqual(outer.right - 1);
        const hit = document.elementFromPoint(
            inner.left + inner.width / 2,
            inner.top + inner.height / 2,
        );
        expect(submenu!.contains(hit)).toBe(true);
        // Nothing between it and its parent's surface clips it, whatever contains it (a
        // transform while the parent grows in makes the parent its containing block).
        for (
            let element = submenu!.parentElement;
            element && element !== parent!.parentElement;
            element = element.parentElement
        ) {
            expect(getComputedStyle(element).overflow).toBe("visible");
        }
        // The group still rounds the run's outside corners, marked as the first and last.
        const group = parent!.querySelector<HTMLElement>('[role="group"]')!;
        expect(group.hasAttribute("data-first")).toBe(true);
        expect(group.hasAttribute("data-last")).toBe(true);
        expect(getComputedStyle(group).borderTopLeftRadius).toBe(
            getComputedStyle(parent!).borderTopLeftRadius,
        );
        expect(getComputedStyle(group).borderBottomRightRadius).toBe(
            getComputedStyle(parent!).borderBottomRightRadius,
        );
    });
});

// The menu's context trigger opens it at the pointer: a right-click, a touch held down, or the
// context menu key and Shift+F10 beside the focused element.
describe("Menu context trigger", () => {
    const mountContext = () => {
        const host = hostIn(
            `<div style="padding: 120px"><div data-host></div></div>`,
        );
        mountCase(
            menuCase,
            { contextTrigger: "Right-click here", trigger: undefined },
            { host },
        );
        const area = host.querySelector<HTMLElement>(
            `[data-testid="${compositeTestIds.menu.contextTrigger}"]`,
        )!;
        const content = () =>
            host.querySelector<HTMLElement>(
                `[data-testid="${compositeTestIds.menu.content}"]`,
            )!;
        const shown = () => {
            const surface = content();
            return (
                !!surface &&
                !surface.hidden &&
                !surface.parentElement!.hidden &&
                surface.dataset.state !== "closed"
            );
        };
        return { host, area, content, shown };
    };

    const opens = async (shown: () => boolean) => {
        for (let i = 0; i < 20 && !shown(); i++) await frame();
        await settlePlaced();
        expect(shown()).toBe(true);
    };

    it("opens at a right-click, where the pointer is", async () => {
        const { area, content, shown } = mountContext();
        expect(shown()).toBe(false);
        const at = { clientX: 260, clientY: 190 };
        const event = new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            button: 2,
            ...at,
        });
        area.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        await opens(shown);
        const box = content().getBoundingClientRect();
        expect(Math.abs(box.left - at.clientX)).toBeLessThan(24);
        expect(Math.abs(box.top - at.clientY)).toBeLessThan(24);
    });

    it("opens at a touch held down, where it is", async () => {
        const { area, content, shown } = mountContext();
        const at = { clientX: 240, clientY: 200 };
        area.dispatchEvent(
            new PointerEvent("pointerdown", {
                bubbles: true,
                pointerType: "touch",
                ...at,
            }),
        );
        await new Promise((resolve) => setTimeout(resolve, 900));
        await opens(shown);
        const box = content().getBoundingClientRect();
        expect(Math.abs(box.left - at.clientX)).toBeLessThan(24);
        expect(Math.abs(box.top - at.clientY)).toBeLessThan(24);
    });

    it("doesn't open when the touch lifts first", async () => {
        const { area, shown } = mountContext();
        area.dispatchEvent(
            new PointerEvent("pointerdown", {
                bubbles: true,
                pointerType: "touch",
                clientX: 240,
                clientY: 200,
            }),
        );
        area.dispatchEvent(
            new PointerEvent("pointerup", {
                bubbles: true,
                pointerType: "touch",
            }),
        );
        await new Promise((resolve) => setTimeout(resolve, 900));
        expect(shown()).toBe(false);
    });

    it.each([
        ["the context menu key", { key: "ContextMenu" }],
        ["Shift+F10", { key: "F10", shiftKey: true }],
    ])("opens from %s", async (_, init) => {
        const { area, content, shown } = mountContext();
        const event = new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            ...init,
        });
        area.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        await opens(shown);
        const anchor = area.getBoundingClientRect();
        const box = content().getBoundingClientRect();
        expect(Math.abs(box.left - anchor.left)).toBeLessThan(24);
        expect(box.top).toBeGreaterThanOrEqual(anchor.bottom - 1);
    });

    it("ignores other keys", async () => {
        const { area, shown } = mountContext();
        area.dispatchEvent(
            new KeyboardEvent("keydown", { bubbles: true, key: "F10" }),
        );
        await frames(5);
        expect(shown()).toBe(false);
    });
});

// The FAB menu's items enter from the one nearest the FAB, each a step after it, and leave in
// reverse; its list only holds still until the last has left.
const fabMenuCase = COMPONENTS.find(
    (component) => component.component === "FabMenu",
)!;

describe("FabMenu", () => {
    const delays = (items: HTMLElement[]) =>
        items.map((item) =>
            Math.max(
                ...item
                    .getAnimations()
                    .map((animation) =>
                        Number(animation.effect!.getTiming().delay),
                    ),
            ),
        );
    const run = async (motion: "full" | "reduce") => {
        const host = hostIn(`<div><div data-host></div></div>`);
        const scene = mountCase(
            fabMenuCase,
            { ...fabMenuCase.overlay!.props, open: false },
            { host, provider: { motion } },
        );
        fabMenuCase.overlay!.place?.(host);
        const items = () => [
            ...host.querySelectorAll<HTMLElement>(
                `[data-testid="${testIds.fabMenu.item}"]`,
            ),
        ];
        await settlePlaced();
        await scene.update({ open: true });
        await frames(2);
        const entering = delays(items());
        await animationsDone();
        await scene.update({ open: false });
        await frames(2);
        const leaving = delays(items());
        const list = host.querySelector<HTMLElement>(
            `[data-testid="${testIds.fabMenu.list}"]`,
        )!;
        const holding = Math.max(
            ...list
                .getAnimations()
                .map((animation) =>
                    Number(animation.effect!.getTiming().delay),
                ),
        );
        await animationsDone();
        return { entering, leaving, holding };
    };

    it("waits longer to enter the farther an item is from the FAB, and longer to leave the nearer", async () => {
        const { entering, leaving, holding } = await run("full");
        expect(entering).toHaveLength(3);
        // Items run from the top; the FAB is under the last.
        expect(entering[2]).toBe(0);
        expect(entering[1]).toBeGreaterThan(0);
        expect(entering[0]).toBeGreaterThan(entering[1]!);
        expect(leaving[0]).toBe(0);
        expect(leaving[1]).toBeGreaterThan(0);
        expect(leaving[2]).toBeGreaterThan(leaving[1]!);
        // The list holds exactly as long as its last item waits: the bindings set its count.
        expect(holding).toBeCloseTo(leaving[2]!, 0);
    });

    it("drops the stagger under reduced motion", async () => {
        const { entering, leaving } = await run("reduce");
        expect([...entering, ...leaving].every((delay) => delay === 0)).toBe(
            true,
        );
    });
});

describe("Overlays inside a dialog or a sheet", () => {
    const find = (name: string) =>
        COMPONENTS.find((component) => component.component === name)!;

    // The host overlay opened, then the nested one mounted into its body, as an app rendering it
    // in place there would.
    const nest = async (
        hostName: string,
        body: string,
        hostProps: SceneProps,
        nestedName: string,
    ) => {
        const outer = hostIn(`<div><div data-host></div></div>`);
        mountCase(find(hostName), hostProps, { host: outer });
        await settlePlaced();
        const inner = document.createElement("div");
        inner.setAttribute("data-host", "");
        outer
            .querySelector<HTMLElement>(`[data-testid="${body}"]`)!
            .append(inner);
        const nested = find(nestedName);
        mountCase(nested, { open: true }, { host: inner });
        await settlePlaced();
        return { outer, surface: nested.overlay!.surface(inner) };
    };

    const drawnWhole = (surface: HTMLElement) => {
        surface.style.pointerEvents = "auto";
        const box = surface.getBoundingClientRect();
        expect(box.width).toBeGreaterThan(0);
        for (const [x, y] of [
            [box.left + box.width / 2, box.top + box.height / 2],
            // Inside the rounded corners, which the hit test follows.
            [box.left + 16, box.top + 16],
            [box.right - 16, box.bottom - 16],
        ] as const)
            expect(surface.contains(document.elementFromPoint(x, y))).toBe(
                true,
            );
    };

    it.each([
        [
            "Dialog",
            compositeTestIds.dialog.body,
            { defaultOpen: true, body: "Body" },
        ],
        [
            "SideSheet",
            compositeTestIds.sideSheet.body,
            { defaultOpen: true, body: "Body" },
        ],
        [
            "BottomSheet",
            compositeTestIds.bottomSheet.body,
            { defaultOpen: true, body: "Body" },
        ],
    ] as const)(
        "draws a popover and a menu opened inside a %s over it, whole",
        async (hostName, body, props) => {
            for (const nestedName of ["Popover", "Menu"]) {
                const { outer, surface } = await nest(
                    hostName,
                    body,
                    props,
                    nestedName,
                );
                drawnWhole(surface);
                outer.remove();
            }
        },
    );
});
