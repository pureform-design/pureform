// Indication (design doc §9.8), for every interactive component, read from its anatomy's
// `indication` entries: hover, a press, keyboard focus, and the slider's drag tint the surface; a
// press ripples in the surface's layer, from the center when the entry says so, and not under
// reduced motion; `noIndication` on the provider tints nothing and keeps the focus indicator; a
// component's `indication` prop stays on it, off a component inside it; a shared source shows a
// press on another component (`data-pf-active`) but never its focus, and `useInteractionState`
// reports it; disabling a pressed component (or a composite's item) ends the press; an app's own
// interaction kind reaches subscribers and changes no state; and a custom indication hydrates.
//
// The pointer is the real mouse (a browser command), so `:hover` and `:active` match as they would
// for a user. The page emulates reduced motion, so the ripple's cases ask the provider for full
// motion.

import type { IndicationAnatomy } from "@pureform/anatomy";
import type { MutableInteractionSource } from "@pureform/solid";
import { afterEach, describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { harness } from "#binding";

import { COMPONENTS } from "./components";
import type { ComponentCase, IndicationCase } from "./components";
import type { Mounted } from "./harness/harness";
import { hydrate } from "./harness/hydration";
import { CUSTOM_PRESSED } from "./harness/indications";
import type {
    Scene,
    SceneIndication,
    SceneProps,
    SceneProvider,
    SceneWrapper,
} from "./harness/scene";

type Indicated = ComponentCase & { readonly indication: IndicationCase };

const INDICATED = COMPONENTS.filter(
    (component): component is Indicated => component.indication !== undefined,
);

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Waits a frame for styles to apply, then for the element's transitions to end. */
const settled = async (element: Element): Promise<void> => {
    await harness.settle();
    await frame();
    await Promise.all(
        element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
    );
};

// Where the pointer rests between steps: the corner farthest from the scenes.
const away = () =>
    commands.mouse("move", window.innerWidth - 2, window.innerHeight - 2);

let mouseDown = false;

/** The real mouse at a point of `element`, by the fraction of its box across and down. */
const mouse = async (
    action: "move" | "down" | "up",
    element: Element,
    at: { x: number; y: number } = { x: 0.5, y: 0.5 },
): Promise<{ x: number; y: number }> => {
    const box = element.getBoundingClientRect();
    const point = {
        x: box.left + box.width * at.x,
        y: box.top + box.height * at.y,
    };
    await commands.mouse(action, point.x, point.y);
    if (action === "down") mouseDown = true;
    if (action === "up") mouseDown = false;
    return point;
};

/** Lets the mouse go away from everything, so the press clicks nothing. */
const release = async () => {
    await away();
    await commands.mouse("up", window.innerWidth - 2, window.innerHeight - 2);
    mouseDown = false;
};

afterEach(async () => {
    if (mouseDown) await release();
    await away();
});

/** The elements one indication entry names, on the first element its trigger matches: the
 *  trigger, the surface it tints, the element its states are matched on (the root around a
 *  native input), and the element that draws the focus indicator. */
interface Parts {
    readonly trigger: HTMLElement;
    readonly surface: HTMLElement;
    readonly state: HTMLElement;
    readonly focus: HTMLElement;
    /** The surface's layer, when it has one now. */
    layer(): HTMLElement | null;
}

const byPart = (anatomy: IndicationCase["anatomy"], part: string) => {
    const testId = (anatomy.parts[part] as { testId?: string } | undefined)
        ?.testId;
    if (!testId) throw new Error(`${anatomy.scope} has no part "${part}"`);
    return `[data-testid="${testId}"]`;
};

/** The element matching `selector` nearest `from`: itself, inside it, or inside its nearest
 *  ancestor that has one. */
const near = (from: HTMLElement, selector: string): HTMLElement => {
    for (
        let scope: HTMLElement | null = from;
        scope;
        scope = scope.parentElement
    ) {
        if (scope.matches(selector)) return scope;
        const inside = scope.querySelector<HTMLElement>(selector);
        if (inside) return inside;
    }
    throw new Error(`nothing matches ${selector} near the trigger`);
};

const partsOf = (
    host: HTMLElement,
    anatomy: IndicationCase["anatomy"],
    entry: IndicationAnatomy,
): Parts => {
    const trigger = host.querySelector<HTMLElement>(
        byPart(anatomy, entry.trigger),
    );
    if (!trigger) throw new Error(`no ${entry.trigger} in ${anatomy.scope}`);
    const surface = near(trigger, byPart(anatomy, entry.surface));
    return {
        trigger,
        surface,
        state:
            entry.trigger === "input"
                ? near(trigger, byPart(anatomy, "root"))
                : trigger,
        focus: near(trigger, byPart(anatomy, entry.focus)),
        layer: () =>
            surface.querySelector<HTMLElement>(":scope > [data-ripple-layer]"),
    };
};

const entriesOf = (component: Indicated) =>
    (component.indication.anatomy.indication ?? []).map(
        (entry, index, all) =>
            [
                all.length > 1 ? `${entry.surface}` : "surface",
                entry,
                index,
            ] as const,
    );

interface MountOptions {
    readonly props?: SceneProps | undefined;
    readonly provider?: SceneProvider | undefined;
    readonly indication?: SceneIndication | undefined;
    readonly wrapper?: SceneWrapper | undefined;
}

/** Mounts the component showing its surfaces, and finds an entry's parts. */
const mountIndicated = async (
    component: Indicated,
    entry: IndicationAnatomy,
    options: MountOptions = {},
): Promise<{ mounted: Mounted; parts: () => Parts }> => {
    const scene: Scene = {
        component: component.component,
        props: {
            ...component.props,
            ...component.indication.props,
            ...options.props,
        },
        indication: options.indication,
        provider: options.provider,
        wrapper: options.wrapper,
    };
    const mounted = harness.mount(scene);
    await harness.settle();
    await component.indication.open?.(mounted.host);
    await harness.settle();
    await frame();
    await away();
    const parts = () =>
        partsOf(mounted.host, component.indication.anatomy, entry);
    await settled(parts().surface);
    return { mounted, parts };
};

const background = (element: Element) =>
    getComputedStyle(element).backgroundColor;

const canvas = document.createElement("canvas");
canvas.width = canvas.height = 1;
const paint = canvas.getContext("2d", { willReadFrequently: true })!;

/** A color as 8-bit RGBA, however the browser writes it (`oklch()`, `color(srgb …)`). */
const rgba = (color: string): number[] => {
    paint.clearRect(0, 0, 1, 1);
    paint.fillStyle = "transparent";
    paint.fillStyle = color;
    paint.fillRect(0, 0, 1, 1);
    return [...paint.getImageData(0, 0, 1, 1).data];
};

/** How far apart two colors are: the largest difference in a channel, out of 255. */
const distance = (a: string, b: string): number => {
    const [x, y] = [rgba(a), rgba(b)];
    return Math.max(...x.map((value, index) => Math.abs(value - y[index]!)));
};

/** The same color, give or take rounding. */
const expectSame = (actual: string, expected: string, what = "color") =>
    expect(
        distance(actual, expected),
        `${what}: ${actual}, not ${expected}`,
    ).toBeLessThanOrEqual(1);

/** A visibly different color. */
const expectDiffers = (actual: string, from: string, what = "color") =>
    expect(
        distance(actual, from),
        `${what}: ${actual}, the same as ${from}`,
    ).toBeGreaterThan(1);

/** The focus indicator an element draws: its outline, or `"none"`. */
const outline = (element: Element) => {
    const style = getComputedStyle(element);
    return style.outlineStyle === "none" || style.outlineStyle === "auto"
        ? "none"
        : `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
};

/** Moves keyboard focus to the trigger, as a keyboard user would: Tab from the page's start,
 *  or the case's own steps. */
const focusByKeyboard = async (
    component: Indicated,
    host: HTMLElement,
    parts: () => Parts,
): Promise<void> => {
    if (component.indication.focus) {
        await component.indication.focus(host);
    } else {
        (document.activeElement as HTMLElement | null)?.blur();
        for (
            let i = 0;
            i < 30 && document.activeElement !== parts().trigger;
            i++
        ) {
            await userEvent.tab();
        }
        expect(document.activeElement).toBe(parts().trigger);
    }
    await settled(parts().surface);
};

const blur = async (parts: () => Parts) => {
    (document.activeElement as HTMLElement | null)?.blur();
    await settled(parts().surface);
};

/** What the surface draws at rest, hovered, pressed, and focused by the keyboard, and the focus
 *  indicator then. Ends at rest. */
const drawn = async (
    component: Indicated,
    host: HTMLElement,
    parts: () => Parts,
) => {
    const rest = background(parts().surface);
    await mouse("move", parts().surface);
    await settled(parts().surface);
    const hovered = background(parts().surface);
    await mouse("down", parts().surface);
    await settled(parts().surface);
    const pressed = background(parts().surface);
    await release();
    await settled(parts().surface);
    await blur(parts);
    const before = outline(parts().focus);
    await focusByKeyboard(component, host, parts);
    const focused = background(parts().surface);
    const indicator = outline(parts().focus);
    await blur(parts);
    return { rest, hovered, pressed, focused, before, indicator };
};

describe.each(INDICATED)("$component", (component) => {
    const indication = component.indication;

    describe.each(entriesOf(component))("%s", (_, entry) => {
        it("hovering, pressing, and keyboard focus tint the surface", async () => {
            const { mounted, parts } = await mountIndicated(component, entry);
            const shown = await drawn(component, mounted.host, parts);
            expectDiffers(shown.hovered, shown.rest, "hovered");
            expectDiffers(shown.pressed, shown.rest, "pressed");
            expectDiffers(shown.focused, shown.rest, "focused");
            expect(shown.before).toBe("none");
            // A highlighted item isn't focused: the menu keeps focus.
            if (!indication.focus) expect(shown.indicator).not.toBe("none");
        });

        it.runIf(indication.drags)(
            "a drag tints the surface, and the source reports it",
            async () => {
                const observed = harness.observe();
                const { parts } = await mountIndicated(component, entry, {
                    props: indication.source!(observed.source),
                });
                const rest = background(parts().surface);
                await mouse("down", parts().surface);
                // Along the track: the handle follows the pointer.
                const box = parts().trigger.getBoundingClientRect();
                const along = {
                    x: box.left + box.width * 0.8,
                    y: box.top + box.height / 2,
                };
                await commands.mouse("move", along.x, along.y);
                await settled(parts().surface);
                expect(observed.state()).toMatchObject({
                    dragged: true,
                    pressed: true,
                });
                expectDiffers(background(parts().surface), rest, "dragged");
                await commands.mouse("up", along.x, along.y);
                mouseDown = false;
                await settled(parts().surface);
                expect(observed.state().dragged).toBe(false);
            },
        );

        it(`a press ripples in the layer, from ${entry.centered ? "the center" : "where it's pressed"}`, async () => {
            const { parts } = await mountIndicated(component, entry, {
                provider: { motion: "full" },
            });
            const layer = parts().layer();
            expect(layer).not.toBeNull();
            expect(layer!.getAttribute("aria-hidden")).toBe("true");
            // Off center, so a centered ripple shows.
            const at = await mouse("down", parts().surface, {
                x: 0.4,
                y: 0.45,
            });
            await harness.settle();
            const ripples =
                layer!.querySelectorAll<HTMLElement>("[data-ripple]");
            expect(ripples).toHaveLength(1);
            const ripple = ripples[0]!;
            const size = Number.parseFloat(ripple.style.width);
            const first = ripple.getAnimations()[0]!.effect as KeyframeEffect;
            const start = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(
                String(first.getKeyframes()[0]!.transform),
            )!;
            const box = layer!.getBoundingClientRect();
            const origin = {
                x: Number(start[1]) + size / 2,
                y: Number(start[2]) + size / 2,
            };
            const expected = entry.centered
                ? { x: box.width / 2, y: box.height / 2 }
                : { x: at.x - box.left, y: at.y - box.top };
            expect(origin.x).toBeCloseTo(expected.x, 0);
            expect(origin.y).toBeCloseTo(expected.y, 0);
        });

        it("no ripple under reduced motion, though the press still tints", async () => {
            const { parts } = await mountIndicated(component, entry);
            const rest = background(parts().surface);
            await mouse("down", parts().surface);
            await settled(parts().surface);
            await frame();
            expect(parts().layer()).not.toBeNull();
            expect(parts().layer()!.children).toHaveLength(0);
            expectDiffers(background(parts().surface), rest, "pressed");
        });

        it("noIndication on the provider tints nothing, draws no layer, and keeps the focus indicator", async () => {
            const { parts: material, mounted: first } = await mountIndicated(
                component,
                entry,
            );
            const withMaterial = await drawn(component, first.host, material);
            first.unmount();
            const { mounted, parts } = await mountIndicated(component, entry, {
                provider: { indication: "none" },
            });
            expect(parts().layer()).toBeNull();
            const shown = await drawn(component, mounted.host, parts);
            expectSame(shown.rest, withMaterial.rest, "at rest");
            expectSame(shown.hovered, shown.rest, "hovered");
            expectSame(shown.pressed, shown.rest, "pressed");
            expectSame(shown.focused, shown.rest, "focused");
            expect(shown.indicator).toBe(withMaterial.indicator);
        });
    });

    const [, entry] = entriesOf(component)[0]!;

    it("its indication prop doesn't reach it inside a card that has one", async () => {
        const plain = await mountIndicated(component, entry);
        const alone = await drawn(component, plain.mounted.host, plain.parts);
        plain.mounted.unmount();
        const { mounted, parts } = await mountIndicated(component, entry, {
            wrapper: {
                component: "Card",
                props: { interactive: true, testId: "outer" },
                indication: "custom",
            },
        });
        const outer = mounted.host.querySelector<HTMLElement>(
            '[data-testid="outer-root"]',
        )!;
        expect(outer).not.toBeNull();
        const inside = await drawn(component, mounted.host, parts);
        for (const state of [
            "rest",
            "hovered",
            "pressed",
            "focused",
        ] as const) {
            expectSame(inside[state], alone[state], state);
        }
        expect(inside.indicator).toBe(alone.indicator);
        // The card took it: its own layer, and its custom tint while the pointer is inside.
        expect(outer.querySelector(":scope > [data-ripple-layer]")).not.toBe(
            null,
        );
        expect(parts().surface.hasAttribute(CUSTOM_PRESSED)).toBe(false);
    });

    describe.runIf(indication.source)("with a source", () => {
        const sourceProps = (source: MutableInteractionSource) =>
            indication.source!(source);

        it("a shared source shows a press on another component, and useInteractionState reports it", async () => {
            const observed = harness.observe();
            const { parts } = await mountIndicated(component, entry, {
                props: sourceProps(observed.source),
            });
            const other = harness.mount({
                component: "Button",
                props: { label: "Other", interactionSource: observed.source },
            });
            await harness.settle();
            const button = other.host.querySelector<HTMLElement>("button")!;
            await settled(parts().surface);
            const rest = background(parts().surface);

            // Its own press shows on the button.
            await mouse("down", parts().surface);
            await settled(parts().surface);
            const pressed = background(parts().surface);
            expect(observed.state().pressed).toBe(true);
            expect(button.hasAttribute("data-pf-active")).toBe(true);
            await release();
            await settled(parts().surface);
            expect(observed.state().pressed).toBe(false);
            expect(button.hasAttribute("data-pf-active")).toBe(false);

            // The button's press shows on it, as its own does.
            await mouse("down", button);
            await settled(parts().surface);
            expect(observed.state().pressed).toBe(true);
            expect(parts().state.hasAttribute("data-pf-active")).toBe(true);
            expectSame(background(parts().surface), pressed, "pressed");
            await release();
            await settled(parts().surface);
            expect(parts().state.hasAttribute("data-pf-active")).toBe(false);
            expectSame(background(parts().surface), rest, "at rest");
        });

        it("a shared source never forwards focus", async () => {
            const observed = harness.observe();
            const { mounted, parts } = await mountIndicated(component, entry, {
                props: sourceProps(observed.source),
            });
            const other = harness.mount({
                component: "Button",
                props: { label: "Other", interactionSource: observed.source },
            });
            await harness.settle();
            const button = other.host.querySelector<HTMLElement>("button")!;
            const before = outline(button);
            await focusByKeyboard(component, mounted.host, parts);
            if (!indication.focus) {
                expect(observed.state()).toMatchObject({
                    focused: true,
                    focusVisible: true,
                });
            }
            expect(outline(button)).toBe(before);
            expect(button.matches(":focus-visible")).toBe(false);
            for (const attribute of button.getAttributeNames()) {
                expect(attribute).not.toMatch(/focus/);
            }
        });

        it.runIf(indication.disabled)(
            "disabling it while it's pressed ends the press",
            async () => {
                const observed = harness.observe();
                const { mounted, parts } = await mountIndicated(
                    component,
                    entry,
                    { props: sourceProps(observed.source) },
                );
                await mouse("down", parts().surface);
                await harness.settle();
                expect(observed.state().pressed).toBe(true);
                await mounted.update(indication.disabled!);
                await harness.settle();
                expect(observed.source.state.pressed).toBe(false);
                expect(observed.state().pressed).toBe(false);
            },
        );

        it.runIf(indication.itemDisabled)(
            "disabling its item while it's pressed ends the press",
            async () => {
                const observed = harness.observe();
                const { mounted, parts } = await mountIndicated(
                    component,
                    entry,
                    { props: sourceProps(observed.source) },
                );
                await mouse("down", parts().surface);
                await harness.settle();
                expect(observed.state().pressed).toBe(true);
                await mounted.update(indication.itemDisabled!(observed.source));
                await harness.settle();
                expect(observed.source.state.pressed).toBe(false);
                expect(observed.state().pressed).toBe(false);
            },
        );

        it("an app's own interaction kind reaches subscribers and changes no state", async () => {
            const observed = harness.observe();
            const { parts } = await mountIndicated(component, entry, {
                props: sourceProps(observed.source),
            });
            const heard: string[] = [];
            const unsubscribe = observed.source.subscribe((interaction) =>
                heard.push(interaction.type),
            );
            const idle = observed.source.state;
            observed.source.emit({
                type: "app:longPress",
                id: 1,
                duration: 600,
            } as never);
            await settled(parts().surface);
            unsubscribe();
            expect(heard).toEqual(["app:longPress"]);
            expect(observed.source.state).toEqual(idle);
            expect(observed.state()).toEqual(idle);
            expect(parts().state.hasAttribute("data-pf-active")).toBe(false);
            expect(parts().state.hasAttribute("data-pf-hover")).toBe(false);
        });
    });

    it("hydrates a custom indication, the provider's and its own, without a warning or a change", async () => {
        // Closed: an open overlay is placed in the browser alone.
        const { host, logged, changes } = await hydrate({
            component: component.component,
            props: component.props,
            indication: "custom",
            provider: { indication: "custom" },
        });
        expect(logged).toEqual([]);
        expect(changes).toEqual([]);
        // The layer rendered on the server, where the surface shows closed.
        const surface = host.querySelector(
            byPart(indication.anatomy, entry.surface),
        );
        if (!indication.props && !indication.open) {
            expect(surface).not.toBeNull();
            expect(
                surface!.querySelector(":scope > [data-ripple-layer]"),
            ).not.toBeNull();
        }
    });
});

// Known gaps, kept as tests that are expected to fail, so fixing one shows here.
describe("known gaps", () => {
    const button = INDICATED.find((each) => each.component === "Button")!;
    const [, entry] = entriesOf(button)[0]!;

    /** The opacity of the ink a press draws on the button. */
    const inkOpacity = async (indication?: SceneIndication) => {
        const { mounted, parts } = await mountIndicated(button, entry, {
            provider: { motion: "full" },
            indication,
        });
        await mouse("down", parts().surface);
        await harness.settle();
        const ripple = parts().layer()!.querySelector("[data-ripple]")!;
        const image = getComputedStyle(ripple).backgroundImage;
        const ink = /(?:color|rgba?|oklch)\([^)]*\)/.exec(image)![0];
        await release();
        mounted.unmount();
        return rgba(ink)[3]!;
    };

    // The ripple's own `opacity` token defaults to the theme's pressed opacity; a component's
    // `statePressedOpacity` (its `indication` prop) doesn't reach the ripple inside it.
    it.fails("a component's indication sets its ripple's opacity", async () => {
        const material = await inkOpacity();
        const custom = await inkOpacity("custom");
        expect(Math.abs(custom - material)).toBeGreaterThan(10);
    });

    // Each interactive component's root sets its indication tokens back to the theme's, so an
    // override of `components.<component>.<token>` above it doesn't reach it.
    it.fails("a provider's override of a component's indication token reaches it", async () => {
        const hovered = async (provider?: SceneProvider) => {
            const { mounted, parts } = await mountIndicated(button, entry, {
                provider,
            });
            await mouse("move", parts().surface);
            await settled(parts().surface);
            const color = background(parts().surface);
            await away();
            mounted.unmount();
            return color;
        };
        const theme = await hovered();
        const overridden = await hovered({
            overrides: { "components.button.stateHoverOpacity": "40%" },
        });
        expectDiffers(overridden, theme, "hovered");
    });
});
