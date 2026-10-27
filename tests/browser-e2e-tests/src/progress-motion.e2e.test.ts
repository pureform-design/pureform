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
            // At 2250ms the arc is about halfway between its sizes; the track turns past it so
            // the rounded ends' centres are the gap and a thickness apart (8px on a 44px middle
            // line), so it follows the arc's value.
            const apart = (2 * Math.asin(8 / 44) * 180) / Math.PI;
            const expected =
                ((((value() * 3.6 + apart + 180) % 360) + 360) % 360) - 180;
            expect(angle()).toBeCloseTo(expected, 0);
        });

        it.each([
            ["ltr", 48, 4, false],
            ["rtl", 48, 4, false],
            ["ltr", 48, 8, false],
            ["ltr", 24, 4, false],
            ["rtl", 96, 12, false],
            ["ltr", 48, 4, true],
            ["rtl", 48, 4, true],
            ["ltr", 64, 8, true],
        ] as const)(
            "rounds the circular arcs' ends, keeping the gap between them (%s, %ipx, %ipx thick, wavy %s)",
            (dir, size, thickness, wavy) => {
                const c = STYLINGS[styling].classes(
                    "circularProgress",
                    wavy ? { shape: "wavy" } : {},
                );
                // Only the size and thickness are set: the ends' angle follows them.
                const root =
                    show(`<div dir="${dir}"><div data-root class="${c.root}" role="progressbar" style="--pf-components-circularProgress-value: 40; --pf-components-circularProgress-size: ${size}px; --pf-components-circularProgress-thickness: ${thickness}px; transition: none">
                <span class="${c.track}" style="transition: none"><span class="${c.trackEndHalf}"><span class="${c.trackEndArc}"></span></span><span class="${c.trackStartHalf}"><span class="${c.trackStartArc}"></span></span><span class="${c.trackTailCap}"></span><span class="${c.trackHeadCap}"></span></span>
                <span class="${c.endHalf}"><span class="${c.endArc}"></span></span>
                <span class="${c.startHalf}"><span class="${c.startArc}"></span></span>
                <span class="${c.tailCap}"></span><span class="${c.headCap}"></span>
            </div></div>`);
                const box = root.getBoundingClientRect();
                const center = (name: string) => {
                    const el = root.querySelector(`.${name.split(" ")[0]}`)!;
                    const r = el.getBoundingClientRect();
                    expect(getComputedStyle(el).borderTopLeftRadius).not.toBe(
                        "0px",
                    );
                    expect(getComputedStyle(el).display).not.toBe("none");
                    expect((el as HTMLElement).offsetWidth).toBe(thickness);
                    return [
                        r.left + r.width / 2 - (box.left + box.width / 2),
                        r.top + r.height / 2 - (box.top + box.height / 2),
                    ] as const;
                };
                // Clockwise from the top (anticlockwise under right to left), on the ring's
                // middle line (the wavy track's, smaller by the 1.5px amplitude, and the wavy
                // indicator's, moving in and out with its nine waves).
                const amplitude = wavy ? 1.5 : 0;
                const middle = (size - thickness) / 2 - amplitude;
                const at = (percent: number, out = 0) => {
                    const a = (percent * 3.6 * Math.PI) / 180;
                    const x = (middle + out) * Math.sin(a);
                    return [
                        dir === "rtl" ? -x : x,
                        -(middle + out) * Math.cos(a),
                    ];
                };
                const near = (p: readonly number[], q: readonly number[]) => {
                    expect(p[0]).toBeCloseTo(q[0]!, 0);
                    expect(p[1]).toBeCloseTo(q[1]!, 0);
                };
                near(center(c.tailCap!), at(0));
                // The wave at 40%: sin(9 × 144°) of the amplitude out (in, here); right to left
                // mirrors the wave with the circle.
                const wave = Math.sin((9 * 144 * Math.PI) / 180);
                near(center(c.headCap!), at(40, amplitude * wave));
                // The track's ends' centres sit the gap and a thickness from the indicator's,
                // along the middle line, so the space between the rounded ends is the gap.
                const apart =
                    (2 * Math.asin((4 + thickness) / (2 * middle)) * 180) /
                    Math.PI /
                    3.6;
                near(center(c.trackTailCap!), at(40 + apart));
                near(center(c.trackHeadCap!), at(100 - apart));
                const gap = (a: readonly number[], b: readonly number[]) =>
                    Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!) - thickness;
                const gaps = [
                    gap(center(c.tailCap!), center(c.trackHeadCap!)),
                    ...(wavy
                        ? []
                        : [gap(center(c.headCap!), center(c.trackTailCap!))]),
                ];
                for (const between of gaps) expect(between).toBeCloseTo(4, 0);
            },
        );

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

        it.each(["ltr", "rtl"])(
            "leaves a gap on each side of the sliding linear indicator, the track in two rounded parts (%s)",
            (dir) => {
                const c = STYLINGS[styling].classes("linearProgress", {
                    indeterminate: true,
                });
                const root =
                    show(`<div dir="${dir}"><div data-root class="${c.root}" role="progressbar" style="width: 400px">
                <div class="${c.track}"><div class="${c.trackBefore}"></div><div class="${c.trackAfter}"></div></div>
                <div class="${c.indicator}"></div>
            </div></div>`);
                const [track, indicator] = [...root.children] as HTMLElement[];
                const [before, after] = [...track!.children] as HTMLElement[];
                pauseAt(root, 700);
                const bar = indicator!.getBoundingClientRect();
                const [lead, trail] =
                    dir === "rtl" ? [after!, before!] : [before!, after!];
                // Mid-slide, the parts stop a gap short of the indicator on each side.
                expect(lead.getBoundingClientRect().right).toBeCloseTo(
                    bar.left - 4,
                    0,
                );
                expect(trail.getBoundingClientRect().left).toBeCloseTo(
                    bar.right + 4,
                    0,
                );
                // Each part's ends are rounded; the track only clips them to its own.
                for (const part of [before!, after!]) {
                    const style = getComputedStyle(part);
                    expect(style.borderTopLeftRadius).not.toBe("0px");
                    expect(style.borderTopRightRadius).not.toBe("0px");
                    expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
                }
                expect(getComputedStyle(track!).backgroundColor).toBe(
                    "rgba(0, 0, 0, 0)",
                );
                expect(getComputedStyle(track!).overflow).toBe("hidden");
            },
        );

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
