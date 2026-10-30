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
