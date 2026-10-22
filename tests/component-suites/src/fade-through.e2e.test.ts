// The fade through's motion (m3a), as Compose's `MaterialTransitions.FadeThrough` runs it: a new
// `value` fades the shown page out as it grows to 105%, then fades the new page in, once the old
// one has faded out, as it grows from 80% on the default spatial spring. The old page leaves the
// flow, takes no input, and goes once its exit ends. Mounting doesn't animate, and reduced motion
// keeps only the fades. The suites' browser asks for reduced motion, so these scenes set the
// provider's `motion` to `"full"` unless they test reducing it.

import { describe, expect, it } from "vitest";

import { harness } from "#binding";

import { fadeThrough } from "./components";
import { mountCase, settlePlaced } from "./harness/page";
import type { SceneProvider } from "./harness/scene";

// The theme's `linear` easing, as the browser serializes it.
const LINEAR = /^(linear|cubic-bezier\(0, 0, 1, 1\))$/;

const pages = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLElement>('[data-pf-part="page"]'),
];

/** Each animation's name and timing on `element`. */
const motions = (element: Element) =>
    element.getAnimations().map((animation) => {
        const timing = animation.effect!.getComputedTiming();
        // CSS animations ease per keyframe, so the curve is the element's.
        return {
            name: (animation as CSSAnimation).animationName,
            duration: Number(timing.duration),
            delay: timing.delay ?? 0,
        };
    });

const mount = async (provider: SceneProvider = { motion: "full" }) => {
    const scene = mountCase(fadeThrough, {}, { provider });
    await settlePlaced();
    return scene;
};

describe("FadeThrough", () => {
    it("shows its first page without animating", async () => {
        const { host } = await mount();
        expect(pages(host)).toHaveLength(1);
        expect(pages(host)[0]!.getAnimations()).toEqual([]);
        expect(pages(host)[0]!.textContent).toBe("Home");
    });

    it("fades the old page out as it grows, then the new one in as it grows from 80%", async () => {
        const { host, update } = await mount();
        await update({ value: "mail", children: "Mail" });
        const [out, into] = pages(host);
        expect(out!.textContent).toBe("Home");
        expect(into!.textContent).toBe("Mail");

        // The old page leaves the flow, hidden and out of reach.
        const leaving = getComputedStyle(out!);
        expect(leaving.position).toBe("absolute");
        expect(leaving.pointerEvents).toBe("none");
        expect(out!.getAttribute("aria-hidden")).toBe("true");
        expect(out!.inert).toBe(true);

        const exit = motions(out!);
        expect(exit.map((motion) => motion.name)).toEqual([
            "fadeThroughGrowOut",
            "overlayFadeOut",
        ]);
        const fadeOut = exit[1]!;
        const curves = (element: Element) =>
            getComputedStyle(element).animationTimingFunction.split(
                /,\s*(?![^(]*\))/,
            );
        expect(curves(out!)[1]).toMatch(LINEAR);

        const enter = motions(into!);
        expect(enter.map((motion) => motion.name)).toEqual([
            "fadeThroughGrowIn",
            "overlayFadeIn",
        ]);
        const [grow, fadeIn] = enter;
        // The growth springs at once; the fade waits for the old page's fade out.
        expect(grow!.delay).toBe(0);
        // The growth's spring, sampled as a `linear()` curve.
        expect(curves(into!)[0]).toMatch(/^linear\(/);
        expect(fadeIn!.delay).toBe(fadeOut.duration);
        expect(fadeIn!.duration).toBeGreaterThan(fadeOut.duration);
        expect(curves(into!)[1]).toMatch(LINEAR);
        // ...unseen meanwhile.
        expect(getComputedStyle(into!).opacity).toBe("0");

        await Promise.allSettled(
            [out!, into!].flatMap((page) =>
                page.getAnimations().map((animation) => animation.finished),
            ),
        );
        await harness.settle();
        expect(pages(host)).toEqual([into]);
        expect(getComputedStyle(into!).opacity).toBe("1");
    });

    it("only fades under reduced motion", async () => {
        const { host, update } = await mount({ motion: "reduce" });
        await update({ value: "mail", children: "Mail" });
        const [out, into] = pages(host);
        expect(motions(out!).map((motion) => motion.name)).toEqual([
            "overlayFadeOut",
        ]);
        const [fadeIn] = motions(into!);
        expect(motions(into!)).toHaveLength(1);
        expect(fadeIn!.name).toBe("overlayFadeIn");
        expect(fadeIn!.delay).toBe(motions(out!)[0]!.duration);
    });
});
