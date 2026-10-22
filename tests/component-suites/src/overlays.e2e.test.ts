// The overlays: each draws over a positioned element that follows it in the page, at its layer of
// the theme's stacking scale; it animates in as it opens, and as it closes it stays until its exit
// animations end, then hides; under reduced motion it fades without moving (design doc §5.8).

import { describe, expect, it } from "vitest";

import { COMPONENTS } from "./components";
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
        // The movement (on a spring) and the fade (on its tween) are two animations.
        const entering = animated(surface);
        expect(entering).toHaveLength(2);
        expect(entering).toEqual(
            expect.arrayContaining([["transform"], ["opacity"]]),
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
