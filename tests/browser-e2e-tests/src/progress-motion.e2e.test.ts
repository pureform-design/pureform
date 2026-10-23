// Indeterminate progress moves as Compose's does, checked in Chromium on each web target (the
// Panda preset, the CSS adapter, and Tailwind through it): the circular arc grows and shrinks
// as it turns, and the wavy line's wave travels along the track rather than riding the bar.

import * as pandaRecipes from "$recipes";
import { classesFor } from "@pureform/css-adapter";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../panda-fixture/panda.pureform";
import type { Adapter } from "./commands";

import pandaCss from "#/styles.css?inline";

const OPTIONS = { prefix: "pf", themeAttribute: "data-panda-theme" };

type Classes = (
    name: string,
    selection?: Record<string, string | boolean>,
) => Record<string, string>;

const classesOf =
    (fns: Record<string, (selection: object) => unknown>): Classes =>
    (name, selection = {}) => {
        const fn = fns[name];
        if (!fn) throw new Error(`no classes for ${name}`);
        return fn(selection) as Record<string, string>;
    };

const adapterClasses = classesOf(
    classesFor(pureformConfig) as Record<
        string,
        (selection: object) => unknown
    >,
);

const STYLINGS: Record<
    "Panda" | Adapter,
    { classes: Classes; css: () => Promise<string> }
> = {
    Panda: {
        classes: classesOf(
            pandaRecipes as unknown as Record<
                string,
                (selection: object) => unknown
            >,
        ),
        css: async () => pandaCss,
    },
    CSS: {
        classes: adapterClasses,
        css: () => commands.adapterCss("CSS", OPTIONS),
    },
    Tailwind: {
        classes: adapterClasses,
        css: () => commands.adapterCss("Tailwind", OPTIONS),
    },
};

/** Pause every animation under `root` at `time` milliseconds. */
const pauseAt = (root: Element, time: number) => {
    const animations = root.getAnimations({ subtree: true });
    expect(animations.length).toBeGreaterThan(0);
    for (const animation of animations) {
        animation.pause();
        animation.currentTime = time;
    }
};

describe.each(Object.keys(STYLINGS) as (keyof typeof STYLINGS)[])(
    "%s: indeterminate progress",
    (styling) => {
        let frame: HTMLIFrameElement;
        const doc = () => frame.contentDocument!;
        const show = (markup: string) => {
            doc().body.innerHTML = markup;
            return doc().querySelector<HTMLElement>("[data-root]")!;
        };

        beforeAll(async () => {
            frame = document.createElement("iframe");
            frame.style.cssText = "width: 800px; height: 600px; border: 0";
            document.body.append(frame);
            doc().open();
            doc().write(
                `<!doctype html><html><head><style>${await STYLINGS[styling].css()}</style></head><body></body></html>`,
            );
            doc().close();
        });

        afterAll(() => frame.remove());

        it("grows the circular arc from a tenth of the circle to 87% and back as it turns", () => {
            const c = STYLINGS[styling].classes("circularProgress", {
                indeterminate: "true",
            });
            const root =
                show(`<div data-root class="${c.root}" role="progressbar">
                <span class="${c.track}"></span>
                <span class="${c.endHalf}"><span class="${c.endArc}"></span></span>
                <span class="${c.startHalf}"><span class="${c.startArc}"></span></span>
            </div>`);
            const value = () =>
                Number.parseFloat(
                    getComputedStyle(root).getPropertyValue(
                        "--pf-components-circularProgress-value",
                    ),
                );
            const turn = () => getComputedStyle(root).transform;
            // A cycle is two 1500ms turns: shortest at its ends, longest halfway.
            pauseAt(root, 0);
            expect(value()).toBeCloseTo(10, 0);
            const start = turn();
            pauseAt(root, 1500);
            expect(value()).toBeCloseTo(87, 0);
            expect(turn()).not.toBe(start);
            pauseAt(root, 2250);
            expect(value()).toBeGreaterThan(10);
            expect(value()).toBeLessThan(87);
            // The arcs draw it: the halves show, the track doesn't.
            const shown = (selector: string) =>
                getComputedStyle(root.querySelector(selector)!).display;
            expect(shown(`.${c.endHalf!.split(" ")[0]}`)).not.toBe("none");
            expect(shown(`.${c.track!.split(" ")[0]}`)).toBe("none");
        });

        it("moves the wavy line's wave along the track, a wavelength a second", () => {
            const c = STYLINGS[styling].classes("linearProgress", {
                // A boolean, as Panda's compound variants match it.
                indeterminate: true,
                shape: "wavy",
            });
            const root =
                show(`<div data-root class="${c.root}" role="progressbar" style="width: 320px">
                <div class="${c.track}"></div>
                <div class="${c.indicator}"></div>
            </div>`);
            const indicator = root.lastElementChild as HTMLElement;
            // The bar clips to the wave; the flat track and the root don't.
            expect(getComputedStyle(root).clipPath).toBe("none");
            expect(getComputedStyle(indicator).clipPath).toMatch(/^shape\(/);
            const drift = () =>
                getComputedStyle(root).getPropertyValue(
                    "--pf-components-linearProgress-waveDrift",
                );
            const slide = () =>
                Number(
                    getComputedStyle(indicator).getPropertyValue(
                        "--pf-components-linearProgress-slide",
                    ),
                );
            pauseAt(root, 0);
            expect(drift()).toBe("0px");
            expect(slide()).toBe(-1);
            pauseAt(root, 500);
            expect(drift()).toBe("20px");
            // The bar has slid; its clip undoes that, so the wave stays on the track.
            expect(slide()).toBeGreaterThan(-1);
            const clip = getComputedStyle(indicator).clipPath;
            pauseAt(root, 750);
            expect(getComputedStyle(indicator).clipPath).not.toBe(clip);
        });
    },
);
