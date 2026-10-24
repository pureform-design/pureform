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
                <span class="${c.track}"><span class="${c.trackEndHalf}"><span class="${c.trackEndArc}"></span></span><span class="${c.trackStartHalf}"><span class="${c.trackStartArc}"></span></span></span>
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
            // The arcs draw it, and the track shows too, turned to start a gap after the arc
            // (Compose's wavy and linear indeterminate indicators keep their track).
            const part = (name: string) =>
                root.querySelector<HTMLElement>(`.${name.split(" ")[0]}`)!;
            expect(getComputedStyle(part(c.endHalf!)).display).not.toBe("none");
            const track = part(c.track!);
            expect(getComputedStyle(track).display).not.toBe("none");
            const angle = () => {
                const m = new DOMMatrix(getComputedStyle(track).transform);
                return (Math.atan2(m.b, m.a) * 180) / Math.PI;
            };
            // At 2250ms the arc is about halfway between its sizes; the track turns past it by
            // the gap (3% of the circle), so it follows the arc's value.
            const expected = (((value() + 3) * 3.6 + 180) % 360) - 180;
            expect(angle()).toBeCloseTo(expected, 0);
        });

        it("keeps the wavy circular halves' wave in the circle's frame, meeting at the seam", () => {
            const c = STYLINGS[styling].classes("circularProgress", {
                shape: "wavy",
            });
            const root =
                show(`<div data-root class="${c.root}" role="progressbar" style="--pf-components-circularProgress-value: 75">
                <span class="${c.endHalf}"><span class="${c.endArc}"></span></span>
                <span class="${c.startHalf}"><span class="${c.startArc}"></span></span>
            </div>`);
            const [end, start] = [...root.children] as HTMLElement[];
            // The halves clip; the arcs, which turn, don't, so their wave doesn't turn with them.
            expect(getComputedStyle(end!).clipPath).toMatch(/^shape\(/);
            expect(getComputedStyle(start!).clipPath).toMatch(/^shape\(/);
            expect(getComputedStyle(end!.firstElementChild!).clipPath).toBe(
                "none",
            );
            // Each half is clipped to its share of one ring: their first points (the top of the
            // circle) sit on the seam, the end half's left edge and the start half's right one.
            expect(getComputedStyle(end!).clipPath).toMatch(
                /^shape\(evenodd from 0%/,
            );
            expect(getComputedStyle(start!).clipPath).toMatch(
                /^shape\(evenodd from 100%/,
            );
            const box = (el: Element) => el.getBoundingClientRect();
            expect(box(end!).left).toBeCloseTo(box(start!).right, 0);
        });

        it("leaves a gap on each side of the sliding linear indicator", () => {
            const c = STYLINGS[styling].classes("linearProgress", {
                indeterminate: true,
            });
            const root =
                show(`<div data-root class="${c.root}" role="progressbar" style="width: 400px">
                <div class="${c.track}"></div>
                <div class="${c.indicator}"></div>
            </div>`);
            const [track, indicator] = [...root.children] as HTMLElement[];
            pauseAt(root, 700);
            const slide = Number(
                getComputedStyle(track!).getPropertyValue(
                    "--pf-components-linearProgress-slide",
                ),
            );
            // The track follows the indicator's slide, in step with it.
            expect(slide).toBeCloseTo(
                Number(
                    getComputedStyle(indicator!).getPropertyValue(
                        "--pf-components-linearProgress-slide",
                    ),
                ),
                3,
            );
            const image = getComputedStyle(track!).backgroundImage;
            expect(image).toMatch(/^linear-gradient\(90deg/);
            // The hole runs from the indicator's start less the gap to its end plus the gap.
            const bar = indicator!.getBoundingClientRect();
            const left = bar.left - root.getBoundingClientRect().left;
            // Chromium keeps each stop as `calc(<share>% ± 4px)`, the share of the track's width.
            const width = track!.getBoundingClientRect().width;
            const stops = [
                ...image.matchAll(
                    /rgba\(0, 0, 0, 0\) calc\(([-\d.]+)% ([-+]) ([\d.]+)px\)/g,
                ),
            ].map(
                (m) =>
                    (Number(m[1]) / 100) * width +
                    (m[2] === "-" ? -1 : 1) * Number(m[3]),
            );
            expect(stops, image).toHaveLength(2);
            expect(stops[0]).toBeCloseTo(left - 4, 0);
            expect(stops[1]).toBeCloseTo(left + bar.width + 4, 0);
            expect(getComputedStyle(track!).backgroundColor).toBe(
                "rgba(0, 0, 0, 0)",
            );
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
