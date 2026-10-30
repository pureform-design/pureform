// The web FAB menu's motion, checked in Chromium against each styling's real output: the Panda
// preset, the CSS adapter, and Tailwind through it. These read what the browser renders (a
// clip that's drawn, the delay an animation actually waits), not the keyframes' text or the
// names of the animations, which can all be right while nothing renders: a keyframe whose var has
// no value is dropped as invalid at computed-value time, and a binding that writes a var the CSS
// doesn't read changes nothing.

import * as pandaRecipes from "$recipes";
import { fabMenuStagger } from "@pureform/binding-web";
import { classesFor } from "@pureform/css-adapter";
import { tokenVar } from "@pureform/styling-web/theme-vars";
import { afterAll, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../panda-fixture/panda.pureform";
import type { Adapter } from "./commands";

import pandaCss from "#/styles.css?inline";

const OPTIONS = { prefix: "pf", themeAttribute: "data-panda-theme" };

type ClassFn = (selection: object) => Record<string, string>;

const STYLINGS: Record<
    "Panda" | Adapter,
    { classes: () => Record<string, string>; css: () => Promise<string> }
> = {
    Panda: {
        classes: () =>
            (pandaRecipes as unknown as Record<string, ClassFn>).fabMenu!({}),
        css: async () => pandaCss,
    },
    CSS: {
        classes: () =>
            (classesFor(pureformConfig) as Record<string, ClassFn>).fabMenu!(
                {},
            ),
        css: () => commands.adapterCss("CSS", OPTIONS),
    },
    Tailwind: {
        classes: () =>
            (classesFor(pureformConfig) as Record<string, ClassFn>).fabMenu!(
                {},
            ),
        css: () => commands.adapterCss("Tailwind", OPTIONS),
    },
};

// How the stylesheets name the vars: every component token under the `pf` prefix.
const REGISTRY = { vars: { prefix: OPTIONS.prefix } } as const;

afterAll(async () => {
    // The suite's browser context reduces motion; put it back for the files after this one.
    await commands.emulateReducedMotion("reduce");
});

interface Menu {
    readonly win: Window;
    readonly list: HTMLElement;
    readonly items: HTMLElement[];
    readonly dispose: () => void;
}

/** A FAB menu's root, list and `count` items, rendered under the styling's stylesheet in a frame
 *  of their own, closed. */
const menu = async (name: keyof typeof STYLINGS, count = 4): Promise<Menu> => {
    await commands.emulateReducedMotion("no-preference");
    const classes = STYLINGS[name].classes();
    const frame = document.createElement("iframe");
    frame.style.cssText = "width: 600px; height: 600px; border: 0";
    document.body.append(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(
        `<!doctype html><html><head><style>${await STYLINGS[name].css()}</style></head><body>` +
            `<div class="${classes.root}"><div class="${classes.list}" data-state="closed" style="position: static">` +
            Array.from(
                { length: count },
                () =>
                    `<div class="${classes.item}" style="width: 200px"></div>`,
            ).join("") +
            `</div></div></body></html>`,
    );
    doc.close();
    const list = doc.querySelector<HTMLElement>("[data-state]")!;
    return {
        win: frame.contentWindow!,
        list,
        items: [...list.children] as HTMLElement[],
        dispose: () => frame.remove(),
    };
};

// The share of an `inset(... round ...)` clip's start side that's covered, 0 to 100, or
// `undefined` when there's no clip (`none`): 100 is hidden, 0 is shown.
const covered = (clip: string): number | undefined => {
    const match = /^inset\(([^)]*?)(?: round [^)]*)?\)$/.exec(clip);
    if (!match) return undefined;
    const sides = match[1]!.trim().split(/\s+/);
    // Top, end, bottom, start: one of the two sides along the row is the aligned edge's far side.
    return Math.max(
        Number.parseFloat(sides[1] ?? "0"),
        Number.parseFloat(sides[3] ?? "0"),
    );
};

// The item's reveal animation, paused so a test can scrub its timeline to fixed points rather
// than sample it against the clock, which a slow first frame would miss.
const reveal = (item: HTMLElement): CSSAnimation => {
    // Not `instanceof CSSAnimation`: the item is in a frame, whose class isn't this window's.
    const found = (item.getAnimations() as CSSAnimation[]).find((animation) =>
        animation.animationName?.startsWith("fabMenuItemReveal"),
    );
    if (!found) throw new Error("no reveal animation on the item");
    found.pause();
    return found;
};

const duration = (animation: CSSAnimation): number =>
    Number(animation.effect!.getComputedTiming().duration);

describe.each(Object.keys(STYLINGS) as (keyof typeof STYLINGS)[])(
    "%s: a FAB menu's item reveal renders",
    (name) => {
        const scrub = (
            win: Window,
            item: HTMLElement,
            animation: CSSAnimation,
        ) =>
            [0, 0.25, 0.5, 0.75, 0.99].map((share) => {
                animation.currentTime = share * duration(animation);
                return covered(win.getComputedStyle(item).clipPath);
            });

        it("clips the item from nothing as it opens, uncovering it from the aligned edge", async () => {
            const { win, list, items, dispose } = await menu(name, 1);
            try {
                const item = items[0]!;
                list.dataset.state = "open";
                const animation = reveal(item);
                const shares = scrub(win, item, animation);
                // The clip is drawn at every point (a var with no value would drop it for `none`).
                expect(shares.every((share) => share !== undefined)).toBe(true);
                const drawn = shares as number[];
                // It starts all clipped away, ends uncovered, and uncovers throughout.
                expect(drawn[0]).toBeGreaterThan(99);
                expect(drawn[4]).toBeLessThan(5);
                // A spring has settled before its last points, so it never uncovers less.
                for (let i = 1; i < drawn.length; i++) {
                    expect(drawn[i]!).toBeLessThanOrEqual(drawn[i - 1]!);
                }
                // On the way it's partly uncovered, not a jump from hidden to shown.
                expect(drawn.some((share) => share > 5 && share < 95)).toBe(
                    true,
                );
                // Done, no clip is left on it.
                animation.finish();
                expect(win.getComputedStyle(item).clipPath).toBe("none");
            } finally {
                dispose();
            }
        });

        it("clips the item away again as it closes", async () => {
            const { win, list, items, dispose } = await menu(name, 1);
            try {
                const item = items[0]!;
                list.dataset.state = "open";
                reveal(item).finish();
                list.dataset.state = "closed";
                const drawn = scrub(win, item, reveal(item));
                expect(drawn.every((share) => share !== undefined)).toBe(true);
                const shares = drawn as number[];
                expect(shares[0]).toBeLessThan(1);
                expect(shares[4]).toBeGreaterThan(95);
                for (let i = 1; i < shares.length; i++) {
                    expect(shares[i]!).toBeGreaterThanOrEqual(shares[i - 1]!);
                }
                expect(shares.some((share) => share > 5 && share < 95)).toBe(
                    true,
                );
            } finally {
                dispose();
            }
        });

        it("clips from the left under right to left, where the aligned edge is", async () => {
            const { win, list, items, dispose } = await menu(name, 1);
            try {
                win.document.documentElement.dir = "rtl";
                list.dataset.state = "open";
                const item = items[0]!;
                const animation = reveal(item);
                animation.currentTime = 0;
                expect(animation.animationName).toBe("fabMenuItemRevealInRtl");
                const clip = win.getComputedStyle(item).clipPath;
                const sides = /^inset\(([^)]*?)(?: round [^)]*)?\)$/
                    .exec(clip)![1]!
                    .trim()
                    .split(/\s+/);
                // The clipped inset is on the end side (the right one is the other's mirror).
                expect(Number.parseFloat(sides[1]!)).toBeGreaterThan(90);
                expect(Number.parseFloat(sides[3] ?? "0")).toBe(0);
            } finally {
                dispose();
            }
        });
    },
);

describe.each(Object.keys(STYLINGS) as (keyof typeof STYLINGS)[])(
    "%s: a FAB menu's stagger runs the delays the binding writes",
    (name) => {
        const delaysOf = (win: Window, items: HTMLElement[]) =>
            // The reveal and its fade wait the same delay, which the browser reports in seconds.
            items.map((item) =>
                win
                    .getComputedStyle(item)
                    .animationDelay.split(",")
                    .map((delay) =>
                        Math.round(Number.parseFloat(delay) * 1000),
                    ),
            );

        it("the animations wait the waits written, the item nearest the FAB first when it opens", async () => {
            const { win, list, items, dispose } = await menu(name, 4);
            try {
                list.dataset.state = "open";
                fabMenuStagger(list, {
                    registry: REGISTRY,
                    open: true,
                    reducedMotion: false,
                });
                const written = items.map((item) =>
                    Number.parseFloat(
                        item.style.getPropertyValue(
                            tokenVar(
                                "components.fabMenu.staggerDelay",
                                REGISTRY.vars,
                            )!,
                        ),
                    ),
                );
                expect(written.every(Number.isFinite)).toBe(true);
                const waits = delaysOf(win, items);
                // What the browser makes the animations wait is what the binding wrote, for the
                // reveal and the fade alike.
                waits.forEach((pair, index) => {
                    expect(pair, `item ${index}`).toEqual([
                        Math.round(written[index]!),
                        Math.round(written[index]!),
                    ]);
                });
                expect(written[3]).toBe(0);
                for (let i = 3; i > 0; i--) {
                    expect(written[i - 1]!).toBeGreaterThan(written[i]!);
                }
            } finally {
                dispose();
            }
        });

        it("leaves in reverse, and the list waits for the longest wait", async () => {
            const { win, list, items, dispose } = await menu(name, 4);
            try {
                list.dataset.state = "closed";
                fabMenuStagger(list, {
                    registry: REGISTRY,
                    open: false,
                    reducedMotion: false,
                });
                const waits = delaysOf(win, items).map(([reveal]) => reveal!);
                expect(waits[0]).toBe(0);
                for (let i = 0; i < 3; i++) {
                    expect(waits[i + 1]!).toBeGreaterThan(waits[i]!);
                }
                // The list's own exit holds until its last item has left.
                const [hold] = win
                    .getComputedStyle(list)
                    .animationDelay.split(",")
                    .map((delay) =>
                        Math.round(Number.parseFloat(delay) * 1000),
                    );
                expect(hold).toBe(Math.max(...waits));
            } finally {
                dispose();
            }
        });

        it("waits nothing before the binding has run, so a first render is still", async () => {
            const { win, list, items, dispose } = await menu(name, 4);
            try {
                list.dataset.state = "open";
                for (const [reveal, fade] of delaysOf(win, items)) {
                    expect(reveal).toBe(0);
                    expect(fade).toBe(0);
                }
            } finally {
                dispose();
            }
        });
    },
);
