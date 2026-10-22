// The overlays: each draws over a positioned element that follows it in the page, at its layer of
// the theme's stacking scale; it animates in as it opens, and as it closes it stays until its exit
// animations end, then hides; under reduced motion it fades without moving (design doc §5.8).

import { testIds } from "@pureform/anatomy";
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
        expect(shows(scene.host)).toBe(true);
        // The movement (on a spring) and the fade (on its tween) are two animations. A popup
        // grows on the `scale` property (composing with its own transform), a sheet or dialog
        // moves on `transform`.
        const entering = animated(surface);
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
        expect(animated(surface).flat()).toContain("opacity");
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
        expect(animated(surface)).toEqual([["opacity"]]);
        await animationsDone();
        await scene.update({ open: false });
        await frames(2);
        expect(shows(scene.host)).toBe(true);
        expect(animated(surface)).toEqual([["opacity"]]);
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
