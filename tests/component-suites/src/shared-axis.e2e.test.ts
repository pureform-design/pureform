// The horizontal shared axis between tabs' panels (m3b), as Compose's
// `MaterialTransitions.HorizontalSharedAxis` moves pages: going to a later tab, the old panel
// slides a fifth of its width toward the start and fades out while the new one comes from the end
// and fades in; right to left mirrors the slide; the slide runs on the `spatialDefault` spring,
// the fades linearly over 90ms after 50ms; reduced motion keeps only the fades. The old panel
// leaves once its animations end. The suites' browser asks for reduced motion, so these scenes
// set the provider's `motion` to `"full"` unless they test reducing it.

import { sampleSpring } from "@pureform/core";
import { MATERIAL_SPRINGS } from "@pureform/material";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { harness } from "#binding";

import { tabsCase } from "./components";
import { mountCase, settlePlaced } from "./harness/page";
import type { SceneProps, SceneProvider } from "./harness/scene";

const FULL: SceneProvider = { motion: "full" };

const SPATIAL_DEFAULT = sampleSpring(
    MATERIAL_SPRINGS.standard.spatialDefault,
).duration;

const mount = async (props: SceneProps, provider: SceneProvider = FULL) => {
    const host = document.createElement("div");
    host.style.width = "600px";
    document.body.append(host);
    mountCase(
        tabsCase,
        { transition: "sharedAxis", defaultValue: "flights", ...props },
        { host, provider },
    );
    await settlePlaced();
    return host;
};

const pages = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLElement>('[data-pf-part="page"]'),
];

const tab = (host: HTMLElement, value: string) =>
    host.querySelector<HTMLElement>(
        `[data-pf-part="tab"][data-value="${value}"]`,
    )!;

/** A page's CSS animations, paused, by keyframes name. */
const held = (page: HTMLElement) =>
    Object.fromEntries(
        page.getAnimations().map((animation) => {
            animation.pause();
            return [(animation as CSSAnimation).animationName, animation];
        }),
    );

const go = async (host: HTMLElement, to: string) => {
    await userEvent.click(tab(host, to));
    await harness.settle();
};

describe("tabs with transition=sharedAxis", () => {
    it.each([
        ["ltr", "sharedAxisToLeft", "sharedAxisFromRight"],
        ["rtl", "sharedAxisToRight", "sharedAxisFromLeft"],
    ] as const)(
        "slide forward a fifth of the width and fade (%s)",
        async (dir, out, into) => {
            const host = await mount({}, { ...FULL, dir });
            expect(pages(host)).toHaveLength(1);
            await go(host, "cars");
            const [leaving, entering] = pages(host);
            expect(leaving!.dataset["state"]).toBe("leaving");
            expect(entering!.dataset["state"]).toBe("entering");
            expect(leaving!.textContent).toBe("Flights panel");
            expect(entering!.textContent).toBe("Cars panel");
            const gone = held(leaving!);
            const come = held(entering!);
            expect(Object.keys(gone).sort()).toEqual(
                [out, "overlayFadeOut"].sort(),
            );
            expect(Object.keys(come).sort()).toEqual(
                ["overlayFadeIn", into].sort(),
            );
            // The slide on the spatial spring, the fade linear, 90ms after 50ms.
            const slide = come[into]!.effect!.getComputedTiming();
            expect(slide.duration).toBe(SPATIAL_DEFAULT);
            const fade = come["overlayFadeIn"]!.effect!.getComputedTiming();
            expect([fade.duration, fade.delay, fade.easing]).toEqual([
                90,
                50,
                "linear",
            ]);
            // At the start, the new panel sits a fifth of its width toward the end.
            come[into]!.currentTime = 0;
            const width = entering!.getBoundingClientRect().width;
            const shift = new DOMMatrix(getComputedStyle(entering!).transform)
                .m41;
            expect(shift).toBeCloseTo((dir === "ltr" ? 0.2 : -0.2) * width, 0);
            // The new panel draws over the old one going forward.
            expect(Number(getComputedStyle(entering!).zIndex)).toBeGreaterThan(
                Number(getComputedStyle(leaving!).zIndex),
            );
            for (const animation of [
                ...Object.values(gone),
                ...Object.values(come),
            ])
                animation.finish();
            await settlePlaced();
            expect(pages(host).map((page) => page.textContent)).toEqual([
                "Cars panel",
            ]);
            expect(pages(host)[0]!.dataset["state"]).toBe("current");
        },
    );

    it("go backward from the start's side, under the old panel", async () => {
        const host = await mount({ defaultValue: "cars" });
        await go(host, "flights");
        const [leaving, entering] = pages(host);
        expect(entering!.dataset["direction"]).toBe("backward");
        expect(Object.keys(held(entering!))).toContain("sharedAxisFromLeft");
        expect(Object.keys(held(leaving!))).toContain("sharedAxisToRight");
        expect(Number(getComputedStyle(leaving!).zIndex)).toBeGreaterThan(
            Number(getComputedStyle(entering!).zIndex),
        );
    });

    it("lets the latest change win and carries a called-back panel on from where it was", async () => {
        const host = await mount({});
        await go(host, "cars");
        await new Promise((resolve) => setTimeout(resolve, 60));
        const text = () => pages(host).map((page) => page.textContent);
        const flights = pages(host)[0]!;
        const x = (page: HTMLElement) =>
            new DOMMatrix(getComputedStyle(page).transform).m41;
        // Frozen part way, so what it carries on from can be read exactly.
        for (const animation of flights.getAnimations()) animation.pause();
        await Promise.all(
            flights.getAnimations().map((animation) => animation.ready),
        );
        const away = x(flights);
        expect(away).toBeLessThan(-1);
        await go(host, "flights");
        const back = pages(host).find(
            (page) => page.textContent === "Flights panel",
        )!;
        expect(text().filter((t) => t === "Flights panel")).toHaveLength(1);
        // Called back, it carries on from where it had got: an animation from there above its
        // entrance. Rewound to its start, the panel is where it was.
        const carry = back
            .getAnimations()
            .filter((animation) => !(animation instanceof CSSAnimation));
        expect(carry.length).toBeGreaterThan(0);
        for (const animation of carry) {
            animation.pause();
            animation.currentTime = 0;
        }
        expect(Math.abs(x(back) - away)).toBeLessThan(10);
        for (const animation of carry) animation.play();
        await go(host, "hotels");
        expect(text().filter((t) => t === "Hotels panel")).toHaveLength(1);
        for (let i = 0; i < 40 && pages(host).length > 1; i++) {
            await Promise.allSettled(
                pages(host).flatMap((page) =>
                    page.getAnimations().map((a) => a.finished),
                ),
            );
            await harness.settle();
        }
        expect(text()).toEqual(["Hotels panel"]);
        expect(x(pages(host)[0]!)).toBe(0);
    });

    it("only fade under reduced motion", async () => {
        const host = await mount({}, { motion: "reduce" });
        await go(host, "hotels");
        const [leaving, entering] = pages(host);
        expect(Object.keys(held(leaving!))).toEqual(["overlayFadeOut"]);
        expect(Object.keys(held(entering!))).toEqual(["overlayFadeIn"]);
    });

    it("veil the old panel with the theme's scrim, at the light surface's 20%", async () => {
        const host = await mount({ transitionScrim: true });
        expect(host.querySelector('[data-pf-part="scrim"]')).toBeNull();
        await go(host, "hotels");
        const scrim = host.querySelector<HTMLElement>(
            '[data-pf-part="scrim"]',
        )!;
        expect(scrim.getAttribute("aria-hidden")).toBe("true");
        const run = held(scrim)["overlayFadeIn"]!;
        run.finish();
        expect(getComputedStyle(scrim).backgroundColor).toMatch(
            /(0\.2\)|\/ 0\.2\))$/,
        );
    });
});
