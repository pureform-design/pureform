import { springAt } from "@pureform/core";
import { afterEach, describe, expect, it } from "vitest";

import { fabMenuStagger } from "./fab-menu-stagger";
import { springRoleVar } from "./settle";

const registry = { vars: {} } as never;

// The theme writes a spring token's parameters under `<var>-stiffness`, `-damping` and `-mass`.
const writeSlowEffects = (stiffness = 800) => {
    const name = springRoleVar(registry, "effectsSlow")!;
    const root = document.documentElement.style;
    root.setProperty(`${name}-stiffness`, String(stiffness));
    root.setProperty(`${name}-damping`, "1");
    root.setProperty(`${name}-mass`, "1");
};

const list = (items: number) => {
    const element = document.createElement("div");
    for (let i = 0; i < items; i++)
        element.append(document.createElement("div"));
    document.body.append(element);
    return element;
};

const DELAY = "--components-fabMenu-staggerDelay";
const TOTAL = "--components-fabMenu-staggerTotal";

const delays = (element: HTMLElement) =>
    [...element.children].map((item) =>
        Number.parseFloat((item as HTMLElement).style.getPropertyValue(DELAY)),
    );

describe("fabMenuStagger", () => {
    afterEach(() => {
        document.body.replaceChildren();
        document.documentElement.removeAttribute("style");
    });

    it("gives each item its wait on the theme's slow effects spring, nearest the FAB first", () => {
        writeSlowEffects();
        const element = list(5);
        fabMenuStagger(element, { registry, open: true, reducedMotion: false });
        const waits = delays(element);
        // The last item is the nearest the FAB: it enters at once, the rest each later.
        expect(waits[4]).toBe(0);
        for (let i = 4; i > 0; i--) {
            expect(waits[i - 1]!).toBeGreaterThan(waits[i]!);
        }
    });

    it("leaves in reverse: the farthest item first", () => {
        writeSlowEffects();
        const element = list(5);
        fabMenuStagger(element, {
            registry,
            open: false,
            reducedMotion: false,
        });
        const waits = delays(element);
        expect(waits[0]).toBe(0);
        for (let i = 0; i < 4; i++) {
            expect(waits[i + 1]!).toBeGreaterThan(waits[i]!);
        }
    });

    it("holds the list for as long as its last item waits", () => {
        writeSlowEffects();
        const element = list(6);
        fabMenuStagger(element, {
            registry,
            open: false,
            reducedMotion: false,
        });
        const total = Number.parseFloat(element.style.getPropertyValue(TOTAL));
        expect(total).toBe(Math.max(...delays(element)));
        expect(total).toBeGreaterThan(0);
    });

    it("counts the items the list has, with no cap and no count handed to it", () => {
        writeSlowEffects();
        const element = list(20);
        fabMenuStagger(element, { registry, open: true, reducedMotion: false });
        const waits = delays(element);
        expect(waits).toHaveLength(20);
        expect(new Set(waits).size).toBe(20);
    });

    it("follows the spring: a stiffer one is a quicker sequence", () => {
        writeSlowEffects(200);
        const slow = list(6);
        fabMenuStagger(slow, { registry, open: true, reducedMotion: false });
        writeSlowEffects(1600);
        const fast = list(6);
        fabMenuStagger(fast, { registry, open: true, reducedMotion: false });
        expect(Math.max(...delays(fast))).toBeLessThan(
            Math.max(...delays(slow)),
        );
    });

    it("runs again for a new count, and for the other phase", () => {
        writeSlowEffects();
        const element = list(3);
        fabMenuStagger(element, { registry, open: true, reducedMotion: false });
        element.append(document.createElement("div"));
        fabMenuStagger(element, { registry, open: true, reducedMotion: false });
        expect(delays(element)).toHaveLength(4);
        expect(delays(element)[3]).toBe(0);
        fabMenuStagger(element, {
            registry,
            open: false,
            reducedMotion: false,
        });
        expect(delays(element)[0]).toBe(0);
    });

    it("leaves the items unstaggered under reduced motion, and takes back earlier waits", () => {
        writeSlowEffects();
        const element = list(4);
        fabMenuStagger(element, { registry, open: true, reducedMotion: false });
        expect(Math.max(...delays(element))).toBeGreaterThan(0);
        fabMenuStagger(element, { registry, open: true, reducedMotion: true });
        for (const item of element.children) {
            expect((item as HTMLElement).style.getPropertyValue(DELAY)).toBe(
                "",
            );
        }
        expect(element.style.getPropertyValue(TOTAL)).toBe("");
    });

    it("leaves the items unstaggered while the theme has no such spring, as on a first render", () => {
        const element = list(4);
        fabMenuStagger(element, { registry, open: true, reducedMotion: false });
        for (const item of element.children) {
            expect((item as HTMLElement).style.getPropertyValue(DELAY)).toBe(
                "",
            );
        }
    });

    it("takes no registry as no stagger", () => {
        writeSlowEffects();
        const element = list(3);
        fabMenuStagger(element, {
            registry: undefined,
            open: true,
            reducedMotion: false,
        });
        expect(element.style.getPropertyValue(TOTAL)).toBe("");
    });

    it("names its vars as the registry does, under a prefix", () => {
        const prefixed = { vars: { prefix: "pf" } } as never;
        const name = springRoleVar(prefixed, "effectsSlow")!;
        const root = document.documentElement.style;
        root.setProperty(`${name}-stiffness`, "800");
        root.setProperty(`${name}-damping`, "1");
        root.setProperty(`${name}-mass`, "1");
        const element = list(3);
        fabMenuStagger(element, {
            registry: prefixed,
            open: true,
            reducedMotion: false,
        });
        expect(
            (element.children[0] as HTMLElement).style.getPropertyValue(
                "--pf-components-fabMenu-staggerDelay",
            ),
        ).not.toBe("");
    });
});

// Toggling while the items are moving: each carries on from where it is.
describe("fabMenuStagger, toggled mid-motion", () => {
    // The theme's springs as the FAB menu runs them: its stagger on the slow effects spring, each
    // item's reveal on the fast spatial one, and its fade on the fast effects one.
    const SPRINGS = {
        effectsSlow: { stiffness: 800, damping: 1 },
        spatialFast: { stiffness: 1400, damping: 0.9 },
        effectsFast: { stiffness: 3800, damping: 1 },
    } as const;

    const writeSprings = (omit: readonly string[] = []) => {
        const root = document.documentElement.style;
        for (const [role, { stiffness, damping }] of Object.entries(SPRINGS)) {
            if (omit.includes(role)) continue;
            const name = springRoleVar(registry, role)!;
            root.setProperty(`${name}-stiffness`, String(stiffness));
            root.setProperty(`${name}-damping`, String(damping));
            root.setProperty(`${name}-mass`, "1");
        }
    };

    const FADE = "--components-fabMenu-fadeDelay";

    const spring = (role: keyof typeof SPRINGS) => ({
        type: "spring" as const,
        ...SPRINGS[role],
        mass: 1,
    });

    // How far a spring has run `ms` after it began, 0 to 1.
    const ran = (role: keyof typeof SPRINGS, ms: number) =>
        Math.min(1, Math.max(0, springAt(spring(role), ms / 1000)));

    const clip = (element: HTMLElement) => delays(element);
    const fade = (element: HTMLElement) =>
        [...element.children].map((item) =>
            Number.parseFloat(
                (item as HTMLElement).style.getPropertyValue(FADE),
            ),
        );

    // A clock the test sets, in ms.
    const clock = () => {
        const state = { now: 0 };
        return {
            at: (ms: number) => {
                state.now = ms;
            },
            now: () => state.now,
        };
    };

    const run = (
        element: HTMLElement,
        time: ReturnType<typeof clock>,
        open: boolean,
    ) =>
        fabMenuStagger(element, {
            registry,
            open,
            reducedMotion: false,
            now: time.now,
        });

    afterEach(() => {
        document.body.replaceChildren();
        document.documentElement.removeAttribute("style");
    });

    it("gives the item's fade its own wait, equal to the reveal's when nothing is moving", () => {
        writeSprings();
        const element = list(3);
        const time = clock();
        run(element, time, true);
        expect(fade(element)).toEqual(clip(element));
    });

    it("skips an item closed partway through opening ahead on each of its springs, to where it is", () => {
        writeSprings();
        const element = list(3);
        const time = clock();
        run(element, time, true);
        // 40ms in, the nearest item (the last, which waited nothing) is part open.
        time.at(40);
        run(element, time, false);
        const revealed = ran("spatialFast", 40);
        const faded = ran("effectsFast", 40);
        expect(revealed).toBeGreaterThan(0.1);
        expect(revealed).toBeLessThan(0.95);
        // Closing from here takes up the exit where the item is: skipped ahead (a negative wait)
        // to the point on the way out that has as much shown as it has now.
        expect(clip(element)[2]!).toBeLessThan(0);
        expect(1 - ran("spatialFast", -clip(element)[2]!)).toBeCloseTo(
            revealed,
            1,
        );
        expect(1 - ran("effectsFast", -fade(element)[2]!)).toBeCloseTo(
            faded,
            1,
        );
        // The two springs differ, so the skips do.
        expect(fade(element)[2]!).not.toBeCloseTo(clip(element)[2]!, 0);
    });

    it("leaves an item that hadn't started opening hidden, rather than showing it to close it", () => {
        writeSprings();
        const element = list(3);
        const time = clock();
        run(element, time, true);
        // The farthest item (the first) waits the longest to open, so 40ms in it hasn't begun.
        const waited = clip(element)[0]!;
        expect(waited).toBeGreaterThan(40);
        time.at(40);
        run(element, time, false);
        // Its exit is already over before it starts: skipped past the end.
        expect(clip(element)[0]!).toBeLessThan(-200);
        expect(fade(element)[0]!).toBeLessThan(-100);
    });

    it("reopens an item part closed from where it is, and leaves one still shown as it is", () => {
        writeSprings();
        const element = list(3);
        const time = clock();
        run(element, time, true);
        time.at(1000);
        run(element, time, false);
        // The farthest item leaves first (no wait), the nearest last: 40ms into closing, the
        // first is part closed and the last hasn't begun.
        const lastWait = clip(element)[2]!;
        expect(clip(element)[0]).toBe(0);
        expect(lastWait).toBeGreaterThan(40);
        time.at(1040);
        run(element, time, true);
        const shown = 1 - ran("spatialFast", 40);
        expect(shown).toBeGreaterThan(0.05);
        expect(shown).toBeLessThan(0.95);
        // Opening again from here: the enter taken up where it has as much shown.
        expect(clip(element)[0]!).toBeLessThan(0);
        expect(ran("spatialFast", -clip(element)[0]!)).toBeCloseTo(shown, 1);
        // The item that never began closing is still shown, so its opening is over already.
        expect(clip(element)[2]!).toBeLessThan(-200);
    });

    it("staggers a toggle that interrupts nothing exactly as a first one", () => {
        writeSprings();
        const element = list(4);
        const time = clock();
        run(element, time, true);
        const first = clip(element);
        time.at(2000);
        run(element, time, false);
        time.at(4000);
        run(element, time, true);
        // Everything had settled: opening again waits what it did the first time.
        expect(clip(element)).toEqual(first);
        expect(fade(element)).toEqual(first);
    });

    it("holds the list for the longest wait still ahead of its items", () => {
        writeSprings();
        const element = list(4);
        const time = clock();
        run(element, time, true);
        time.at(2000);
        run(element, time, false);
        const total = Number.parseFloat(element.style.getPropertyValue(TOTAL));
        expect(total).toBe(Math.max(0, ...clip(element)));
        expect(total).toBeGreaterThan(0);
    });

    it("leaves the items already moving alone when only their number changes", () => {
        writeSprings();
        const element = list(3);
        const time = clock();
        run(element, time, true);
        const before = clip(element);
        time.at(30);
        element.append(document.createElement("div"));
        run(element, time, true);
        // The running items keep the waits their animations are on; only the new one is given one.
        expect(clip(element).slice(0, 3)).toEqual(before);
        expect(Number.isFinite(clip(element)[3]!)).toBe(true);
    });

    it("forgets what was moving under reduced motion", () => {
        writeSprings();
        const element = list(3);
        const time = clock();
        run(element, time, true);
        time.at(40);
        fabMenuStagger(element, {
            registry,
            open: false,
            reducedMotion: true,
            now: time.now,
        });
        for (const item of element.children) {
            expect((item as HTMLElement).style.getPropertyValue(FADE)).toBe("");
        }
        // Back to full motion later, the next toggle starts every item as a first one does.
        time.at(60);
        run(element, time, true);
        expect(clip(element)[2]).toBe(0);
        expect(clip(element).every((wait) => wait >= 0)).toBe(true);
    });

    it("carries on without the two item springs, staggering as it did", () => {
        writeSprings(["spatialFast", "effectsFast"]);
        const element = list(3);
        const time = clock();
        run(element, time, true);
        time.at(40);
        run(element, time, false);
        expect(clip(element).every((wait) => wait >= 0)).toBe(true);
        expect(fade(element)).toEqual(clip(element));
    });
});
