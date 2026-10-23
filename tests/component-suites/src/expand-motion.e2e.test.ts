// Expanding parts grow open and shrink shut (fix-motion): an accordion's content and a tree's
// group run their height on the default spatial spring as their `hidden` changes, as Compose's
// `AnimatedVisibility` expands and shrinks them. A part shutting stays drawn until its height
// reaches 0, then hides; under reduced motion it shows and hides at once. Nothing scrolls. The
// suites' browser asks for reduced motion, so these scenes set the provider's `motion` to `"full"`
// unless they test reducing it.

import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { COMPONENTS } from "./components";
import type { ComponentCase } from "./components";
import { mountCase, settlePlaced } from "./harness/page";
import type { SceneProvider } from "./harness/scene";

const FULL: SceneProvider = { motion: "full" };

const caseOf = (component: string): ComponentCase =>
    COMPONENTS.find((entry) => entry.component === component)!;
const accordionCase = caseOf("Accordion");
const treeCase = caseOf("Tree");

const part = (host: HTMLElement, name: string) => [
    ...host.querySelectorAll<HTMLElement>(`[data-pf-part="${name}"]`),
];

const heights = (element: HTMLElement) =>
    element
        .getAnimations()
        .filter(
            (animation) =>
                animation.playState !== "finished" &&
                animation.effect instanceof KeyframeEffect &&
                animation.effect
                    .getKeyframes()
                    .some((frame) => "height" in frame),
        );

const mount = async (
    component: ComponentCase,
    provider: SceneProvider = FULL,
) => {
    const host = document.createElement("div");
    host.style.width = "400px";
    document.body.append(host);
    const scene = mountCase(component, {}, { host, provider });
    await settlePlaced();
    return { ...scene, host };
};

describe("accordion", () => {
    it("grows its content open, and keeps it drawn while it shrinks shut", async () => {
        const { host } = await mount(accordionCase);
        const trigger = part(host, "trigger")[1]!;
        const content = part(host, "content")[1]!;
        expect(content.hidden).toBe(true);
        const scrollY = window.scrollY;

        await userEvent.click(trigger);
        expect(content.hidden).toBe(false);
        const opening = heights(content);
        expect(opening).toHaveLength(1);
        const [from, to] = (
            opening[0]!.effect as KeyframeEffect
        ).getKeyframes();
        expect(from!.height).toBe("0px");
        expect(Number.parseFloat(String(to!.height))).toBeGreaterThan(0);
        // On the spring's `linear()` curve, not a fixed ease.
        expect(opening[0]!.effect!.getTiming().easing).toMatch(/^linear\(/);
        opening[0]!.finish();

        await userEvent.click(trigger);
        expect(content.hidden).toBe(true);
        const closing = heights(content);
        expect(closing).toHaveLength(1);
        // Still drawn while it shrinks.
        expect(getComputedStyle(content).display).not.toBe("none");
        closing[0]!.finish();
        await settlePlaced();
        expect(getComputedStyle(content).display).toBe("none");
        expect(window.scrollY).toBe(scrollY);
        host.remove();
    });

    it("shows and hides its content at once under reduced motion", async () => {
        const { host } = await mount(accordionCase, {
            motion: "reduce",
        });
        const trigger = part(host, "trigger")[1]!;
        const content = part(host, "content")[1]!;
        await userEvent.click(trigger);
        expect(content.hidden).toBe(false);
        expect(heights(content)).toHaveLength(0);
        await userEvent.click(trigger);
        expect(heights(content)).toHaveLength(0);
        expect(getComputedStyle(content).display).toBe("none");
        host.remove();
    });
});

describe("tree", () => {
    it("grows a branch's group open", async () => {
        const { host } = await mount(treeCase);
        const group = part(host, "group").find((element) => element.hidden)!;
        const branch = group.closest<HTMLElement>('[data-pf-part="branch"]')!;
        const node = branch.querySelector<HTMLElement>(
            '[data-pf-part="node"]',
        )!;
        await userEvent.click(node);
        expect(group.hidden).toBe(false);
        expect(heights(group)).toHaveLength(1);
        host.remove();
    });
});
