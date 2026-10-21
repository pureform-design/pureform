// Indication on React Native Web (design doc §9.8), the component suites' rules through
// `@pureform/react-native`: hover, a press, keyboard focus, and the slider's drag tint the surface
// each anatomy entry names; a press ripples in the surface's layer, from the center when the entry
// says so, and not under reduced motion; `noIndication` on the provider tints nothing and keeps
// the focus indicator; a component's `indication` prop stays on it, off a component inside it; a
// shared source shows a press on another component (through its state) but never its focus, and
// `useInteractionState` reports it; disabling a pressed component (or a composite's item) ends the
// press; and an app's own interaction kind reaches subscribers and changes no state.
//
// The registry is the Panda fixture's config, precomputed for React Native. The pointer is the
// real mouse (a browser command). Focus that follows a press within `FOCUS_AFTER_PRESS_MS` isn't
// visible, so keyboard focus waits that long after any press.

import {
    accordionAnatomy,
    buttonAnatomy,
    cardAnatomy,
    carouselAnatomy,
    checkboxAnatomy,
    chipAnatomy,
    fabAnatomy,
    iconButtonAnatomy,
    listItemAnatomy,
    menuAnatomy,
    navigationBarAnatomy,
    navigationRailAnatomy,
    radioAnatomy,
    sliderAnatomy,
    snackbarAnatomy,
    toastAnatomy,
    switchControlAnatomy,
    tabsAnatomy,
    treeAnatomy,
} from "@pureform/anatomy";
import type { IndicationAnatomy } from "@pureform/anatomy";
import {
    FOCUS_AFTER_PRESS_MS,
    materialIndication,
    noIndication,
    PureformProvider,
    useInteractionSource,
    useInteractionState,
} from "@pureform/react-native";
import type {
    Indication,
    InteractionState,
    MutableInteractionSource,
} from "@pureform/react-native";
import { Accordion } from "@pureform/react-native/accordion";
import { Button } from "@pureform/react-native/button";
import { Card } from "@pureform/react-native/card";
import { Carousel } from "@pureform/react-native/carousel";
import { Checkbox } from "@pureform/react-native/checkbox";
import { Chip } from "@pureform/react-native/chip";
import { Fab } from "@pureform/react-native/fab";
import { IconButton } from "@pureform/react-native/icon-button";
import { ListItem } from "@pureform/react-native/list-item";
import { Menu } from "@pureform/react-native/menu";
import { NavigationBar } from "@pureform/react-native/navigation-bar";
import { NavigationRail } from "@pureform/react-native/navigation-rail";
import { RadioGroup } from "@pureform/react-native/radio-group";
import { Slider } from "@pureform/react-native/slider";
import { Snackbar } from "@pureform/react-native/snackbar";
import { Switch } from "@pureform/react-native/switch";
import { Tabs } from "@pureform/react-native/tabs";
import { Text } from "@pureform/react-native/text";
import { createToaster, Toaster } from "@pureform/react-native/toast";
import { Tree } from "@pureform/react-native/tree";
import { nativeFactory } from "@pureform/rn-adapter/factory";
import { createRegistry } from "@pureform/styling";
import type { Registry } from "@pureform/styling";
import { createElement } from "react";
import type { ComponentType, ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import * as ReactNative from "react-native";
import { View } from "react-native";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { RN_COMPONENTS } from "./rn-components";

// What a component's indication is checked with: its anatomy (whose entries name the surfaces),
// its props, and how a source, disabling, and opening reach it.
interface RnCase {
    readonly name: string;
    readonly component: ComponentType<never>;
    readonly anatomy: {
        readonly parts: Readonly<Record<string, { readonly testId: string }>>;
        readonly indication?: readonly IndicationAnatomy[];
    };
    readonly props: Readonly<Record<string, unknown>>;
    /** Props that give the first surface `source`. Left out: it takes none (the snackbar). */
    source?(source: MutableInteractionSource): Record<string, unknown>;
    /** Props that disable it. */
    readonly disabled?: Readonly<Record<string, unknown>> | undefined;
    /** Props that give the first item `source` and disable it alone. */
    itemDisabled?(source: MutableInteractionSource): Record<string, unknown>;
    readonly drags?: boolean;
    /** `false` for a region placed over the page (the toaster), which an app doesn't put in a
     *  card. */
    readonly inCard?: false;
}

const [CARD_ROOT_ENTRY, CARD_ACTION_AREA_ENTRY] = cardAnatomy.indication;

const ITEMS = [
    { value: "a", label: "Alpha", icon: "★" },
    { value: "b", label: "Beta", icon: "♥" },
];

const own = (
    name: string,
    component: ComponentType<never>,
    anatomy: RnCase["anatomy"],
    props: Record<string, unknown>,
    extra: Partial<RnCase> = {},
): RnCase => ({
    name,
    component,
    anatomy,
    props,
    source: (interactionSource) => ({ interactionSource }),
    disabled: { disabled: true },
    ...extra,
});

const items = (
    name: string,
    component: ComponentType<never>,
    anatomy: RnCase["anatomy"],
    props: Record<string, unknown>,
    extra: Partial<RnCase> = {},
): RnCase => {
    const first = (added: Record<string, unknown>) => ({
        items: (props.items as Record<string, unknown>[]).map((item, index) =>
            index === 0 ? { ...item, ...added } : item,
        ),
    });
    return {
        name,
        component,
        anatomy,
        props,
        source: (interactionSource) => first({ interactionSource }),
        disabled: { disabled: true },
        itemDisabled: (interactionSource) =>
            first({ interactionSource, disabled: true }),
        ...extra,
    };
};

const CASES: RnCase[] = [
    own("Button", Button as never, buttonAnatomy, { label: "Save" }),
    own("Chip", Chip as never, chipAnatomy, { label: "Vegan" }),
    own("IconButton", IconButton as never, iconButtonAnatomy, {
        "aria-label": "Favorite",
        icon: "★",
    }),
    own("Fab", Fab as never, fabAnatomy, {
        "aria-label": "Compose",
        icon: "✎",
    }),
    // The whole card acts: Root's entry.
    own(
        "Card",
        Card as never,
        { ...cardAnatomy, indication: [CARD_ROOT_ENTRY] },
        {
            onPress: () => {},
            children: createElement(Text, null, "Basic plan"),
        },
    ),
    // Its action beside its actions: the action area's entry, the container its surface.
    own(
        "Card with actions",
        Card as never,
        { ...cardAnatomy, indication: [CARD_ACTION_AREA_ENTRY] },
        {
            onPress: () => {},
            headline: "Basic plan",
            supportingText:
                "Everything in the free plan, with more storage and support.",
            actions: createElement(Button, { label: "Details" }),
        },
    ),
    own("ListItem", ListItem as never, listItemAnatomy, {
        headline: "Inbox",
        onPress: () => {},
    }),
    own("Checkbox", Checkbox as never, checkboxAnatomy, {
        "aria-label": "Accept",
    }),
    own("Switch", Switch as never, switchControlAnatomy, {
        "aria-label": "Wi-Fi",
    }),
    own(
        "Slider",
        Slider as never,
        sliderAnatomy,
        // The round slider: Expressive's bar slider draws no state layer, only its handle
        // narrowing on a press.
        { "aria-label": "Volume", defaultValue: 40, handleShape: "round" },
        { drags: true },
    ),
    items("RadioGroup", RadioGroup as never, radioAnatomy, {
        "aria-label": "Size",
        items: ITEMS,
    }),
    // The carousel has no disabled state of its own; an item's mask has.
    items(
        "Carousel",
        Carousel as never,
        carouselAnatomy,
        {
            "aria-label": "Places",
            items: [{ "aria-label": "Lisbon" }, { "aria-label": "Porto" }],
        },
        { disabled: undefined },
    ),
    items("Accordion", Accordion as never, accordionAnatomy, {
        items: [
            { value: "a", title: "Shipping", content: "Free" },
            { value: "b", title: "Returns", content: "30 days" },
        ],
    }),
    // The tree has no disabled state of its own; a node has.
    items(
        "Tree",
        Tree as never,
        treeAnatomy,
        {
            "aria-label": "Files",
            items: [
                { value: "a", label: "README.md" },
                { value: "b", label: "LICENSE" },
            ],
        },
        { disabled: undefined },
    ),
    // The tabs and the menu have no disabled state of their own; an item has.
    items(
        "Tabs",
        Tabs as never,
        tabsAnatomy,
        { "aria-label": "Trips", items: ITEMS },
        { disabled: undefined },
    ),
    items("NavigationBar", NavigationBar as never, navigationBarAnatomy, {
        "aria-label": "Main",
        items: ITEMS,
    }),
    items("NavigationRail", NavigationRail as never, navigationRailAnatomy, {
        "aria-label": "Main",
        items: ITEMS,
    }),
    items(
        "Menu",
        Menu as never,
        menuAnatomy,
        { items: ITEMS },
        { disabled: undefined },
    ),
    // Its action and its close button; the ready-made snackbar takes no source for either, and
    // has no disabled state.
    {
        name: "Snackbar",
        component: Snackbar as never,
        anatomy: snackbarAnatomy,
        props: {
            supportingText: "Message archived",
            action: "Undo",
            closeLabel: "Dismiss",
        },
    },
    // A toast's action and close button, as the snackbar's.
    {
        name: "Toast",
        component: Toaster as never,
        anatomy: toastAnatomy,
        inCard: false,
        get props() {
            // At the top, inside the page: the case's host has no height.
            const toaster = createToaster({ placement: "top-start" });
            toaster.info({
                title: "Archived",
                duration: Infinity,
                action: { label: "Undo", onClick: () => {} },
            });
            return { toaster };
        },
    },
];

let registry: Registry;

beforeAll(async () => {
    // The ripple too, which Material's indication draws with.
    const names = [...RN_COMPONENTS, "ripple"];
    const styles = await commands.rnStyles(names);
    const keys = await commands.rnTokenKeys(names);
    registry = createRegistry(
        Object.fromEntries(
            names.map((name) => [
                name,
                nativeFactory(name, styles, keys[name]),
            ]),
        ),
    ) as unknown as Registry;
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const roots: Root[] = [];
let mouseDown = false;
let lastPress = 0;

const corner = () => [window.innerWidth - 2, window.innerHeight - 2] as const;
const away = () => commands.mouse("move", ...corner());

/** Lets the mouse go away from everything, so the press clicks nothing. */
const release = async () => {
    await away();
    await commands.mouse("up", ...corner());
    mouseDown = false;
    lastPress = performance.now();
};

afterEach(async () => {
    if (mouseDown) await release();
    await away();
    for (const root of roots.splice(0)) root.unmount();
    document.body.innerHTML = "";
});

/** The real mouse at a point of `element`, by the fraction of its box across and down. */
const mouse = async (
    action: "move" | "down" | "up",
    element: Element,
    at: { x: number; y: number } = { x: 0.5, y: 0.5 },
) => {
    const box = element.getBoundingClientRect();
    const point = {
        x: box.left + box.width * at.x,
        y: box.top + box.height * at.y,
    };
    await commands.mouse(action, point.x, point.y);
    if (action === "down") mouseDown = true;
    if (action === "up") {
        mouseDown = false;
        lastPress = performance.now();
    }
    return point;
};

// Animated holds an interaction handle while each tween runs (React Native Web's
// `InteractionManager`, which React Native's types no longer have), so the handles open tell
// whether a fade is still running.
const { InteractionManager } = ReactNative as unknown as {
    InteractionManager: {
        createInteractionHandle(): number;
        clearInteractionHandle(handle: number): void;
    };
};
const tweens = new Set<number>();
const { createInteractionHandle, clearInteractionHandle } = InteractionManager;
InteractionManager.createInteractionHandle = () => {
    const handle = createInteractionHandle.call(InteractionManager);
    tweens.add(handle);
    return handle;
};
InteractionManager.clearInteractionHandle = (handle) => {
    tweens.delete(handle);
    clearInteractionHandle.call(InteractionManager, handle);
};

/** Waits until `read` gives the same value three frames running with no tween running (state
 *  colors fade). Frames alone can't tell: a fade's color can stay on one 8-bit step for three
 *  frames, more so under load, where React draws each step a render late. */
const stable = async <T>(read: () => T): Promise<T> => {
    let last = read();
    let same = 0;
    for (let i = 0; i < 120 && same < 3; i++) {
        await frame();
        const now = read();
        same = now === last && tweens.size === 0 ? same + 1 : 0;
        last = now;
    }
    return last;
};

const canvas = document.createElement("canvas");
canvas.width = canvas.height = 1;
const paint = canvas.getContext("2d", { willReadFrequently: true })!;

/** A color as 8-bit RGBA, however the browser writes it. */
const rgba = (color: string): number[] => {
    paint.clearRect(0, 0, 1, 1);
    paint.fillStyle = "transparent";
    paint.fillStyle = color;
    paint.fillRect(0, 0, 1, 1);
    return [...paint.getImageData(0, 0, 1, 1).data];
};

const distance = (a: string, b: string): number => {
    const [x, y] = [rgba(a), rgba(b)];
    return Math.max(...x.map((value, index) => Math.abs(value - y[index]!)));
};

const expectSame = (actual: string, expected: string, what = "color") =>
    expect(
        distance(actual, expected),
        `${what}: ${actual}, not ${expected}`,
    ).toBeLessThanOrEqual(1);

const expectDiffers = (actual: string, from: string, what = "color") =>
    expect(
        distance(actual, from),
        `${what}: ${actual}, the same as ${from}`,
    ).toBeGreaterThan(1);

const background = (element: Element) =>
    getComputedStyle(element).backgroundColor;

/** The focus indicator an element draws: its outline, or `"none"`. */
const outline = (element: Element) => {
    const style = getComputedStyle(element);
    return style.outlineStyle === "none" ||
        style.outlineStyle === "auto" ||
        style.outlineWidth === "0px"
        ? "none"
        : `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
};

/** The suites' own indication: Material's ripple with stronger tints and a thicker focus
 *  indicator. */
const CUSTOM: Indication = {
    ...materialIndication(),
    name: "app:suites",
    tokens: {
        stateHoverOpacity: 0.3,
        stateFocusOpacity: 0.3,
        statePressedOpacity: 0.4,
        focusIndicatorThickness: 6,
    },
};

interface Mount {
    readonly provider?: {
        motion?: "reduce" | "full";
        indication?: Indication;
    };
    readonly props?: Record<string, unknown>;
    /** A card with this indication beside the component: the card acts, and the component is
     *  one of its actions, outside its action area. */
    readonly inCard?: Indication;
}

/** Renders `view` in a new host, inside the provider. */
const render = (view: ReactNode, provider: Mount["provider"] = {}) => {
    const host = document.body.appendChild(document.createElement("div"));
    host.style.padding = "8px";
    const root = createRoot(host);
    roots.push(root);
    const tree = (node: ReactNode) =>
        createElement(
            PureformProvider as ComponentType<Record<string, unknown>>,
            { registry, motion: provider.motion ?? "reduce", ...provider },
            node,
        );
    flushSync(() => root.render(tree(view)));
    return {
        host,
        update: async (next: ReactNode) => {
            flushSync(() => root.render(tree(next)));
            await wait(50);
        },
    };
};

const testId = (rnCase: RnCase, part: string) => {
    const found = rnCase.anatomy.parts[part]?.testId;
    if (!found) throw new Error(`${rnCase.name} has no part ${part}`);
    return `[data-testid="${found}"]`;
};

/** The surface an entry names, and the parts around it, on its first element. */
const partsOf = (
    host: HTMLElement,
    rnCase: RnCase,
    entry: IndicationAnatomy,
) => {
    const surface = host.querySelector<HTMLElement>(
        testId(rnCase, entry.surface),
    );
    if (!surface) throw new Error(`no ${entry.surface} in ${rnCase.name}`);
    let focus: HTMLElement = surface;
    for (
        let scope: HTMLElement | null = surface;
        scope;
        scope = scope.parentElement
    ) {
        const found = scope.matches(testId(rnCase, entry.focus))
            ? scope
            : scope.querySelector<HTMLElement>(testId(rnCase, entry.focus));
        if (found) {
            focus = found;
            break;
        }
    }
    return {
        surface,
        focus,
        /** The layer: the surface's last element, which has no test id. */
        layer: () => {
            const last = surface.lastElementChild;
            return last && !last.hasAttribute("data-testid")
                ? (last as HTMLElement)
                : null;
        },
    };
};

const mountCase = async (
    rnCase: RnCase,
    entry: IndicationAnatomy,
    options: Mount = {},
) => {
    const view = (props: Record<string, unknown> = {}) => {
        // In a box of its own width: a slider takes its container's, which a card fits to its
        // content.
        const own = createElement(
            View,
            { style: { width: 280 } },
            createElement(
                rnCase.component as ComponentType<Record<string, unknown>>,
                { ...rnCase.props, ...options.props, ...props },
            ),
        );
        return options.inCard
            ? createElement(Card as ComponentType<Record<string, unknown>>, {
                  onPress: () => {},
                  indication: options.inCard,
                  testId: "outer",
                  headline: "Outer",
                  actions: own,
              })
            : own;
    };
    const mounted = render(view(), options.provider);
    await wait(50);
    await away();
    const parts = () => partsOf(mounted.host, rnCase, entry);
    await stable(() => background(parts().surface));
    return {
        host: mounted.host,
        parts,
        update: (props: Record<string, unknown>) => mounted.update(view(props)),
    };
};

/** Tab until focus is on (or around) the surface, once a press's focus can't be the cause. */
const focusByKeyboard = async (surface: () => HTMLElement) => {
    const since = performance.now() - lastPress;
    if (since < FOCUS_AFTER_PRESS_MS + 50) {
        await wait(FOCUS_AFTER_PRESS_MS + 50 - since);
    }
    (document.activeElement as HTMLElement | null)?.blur();
    // The focusable around the surface (or in it).
    const FOCUSABLE = "[tabindex]:not([tabindex='-1']), input, button";
    const on = () => {
        const target =
            surface().closest(FOCUSABLE) ?? surface().querySelector(FOCUSABLE);
        return target !== null && document.activeElement === target;
    };
    for (let i = 0; i < 30 && !on(); i++) await userEvent.tab();
    expect(on()).toBe(true);
};

/** What the surface draws at rest, hovered, pressed, and focused by the keyboard, and the focus
 *  indicator then. */
const drawn = async (parts: () => ReturnType<typeof partsOf>) => {
    const color = () => stable(() => background(parts().surface));
    const rest = await color();
    await mouse("move", parts().surface);
    const hovered = await color();
    await mouse("down", parts().surface);
    const pressed = await color();
    await release();
    await color();
    const before = outline(parts().focus);
    await focusByKeyboard(() => parts().surface);
    const focused = await color();
    const indicator = await stable(() => outline(parts().focus));
    (document.activeElement as HTMLElement | null)?.blur();
    await color();
    return { rest, hovered, pressed, focused, before, indicator };
};

/** Renders `useInteractionState` over a source of its own, which it hands out. */
const observe = () => {
    let source!: MutableInteractionSource;
    let state!: InteractionState;
    function Observer(): ReactNode {
        source = useInteractionSource();
        state = useInteractionState(source);
        return null;
    }
    render(createElement(Observer));
    return { source, state: () => state };
};

const entriesOf = (rnCase: RnCase) =>
    (rnCase.anatomy.indication ?? []).map(
        (entry, _, all) =>
            [all.length > 1 ? entry.surface : "surface", entry] as const,
    );

describe.each(CASES)("$name", (rnCase) => {
    describe.each(entriesOf(rnCase))("%s", (_, entry) => {
        it("hovering, pressing, and keyboard focus tint the surface", async () => {
            const { parts } = await mountCase(rnCase, entry);
            const shown = await drawn(parts);
            expectDiffers(shown.hovered, shown.rest, "hovered");
            expectDiffers(shown.pressed, shown.rest, "pressed");
            expectDiffers(shown.focused, shown.rest, "focused");
            expect(shown.before).toBe("none");
            expect(shown.indicator).not.toBe("none");
        });

        it(`a press ripples in the layer${entry.centered ? ", from the center" : ""}`, async () => {
            const { parts } = await mountCase(rnCase, entry, {
                provider: { motion: "full" },
            });
            expect(parts().layer()).not.toBeNull();
            expect(parts().layer()!.childElementCount).toBe(0);
            const at = await mouse("down", parts().surface, {
                x: 0.4,
                y: 0.45,
            });
            await wait(50);
            const ripple = parts().layer()!.firstElementChild;
            expect(ripple).not.toBeNull();
            // Where it started: a disc placed at the press point, which then moves to the center
            // as it grows.
            const style = getComputedStyle(ripple!);
            const size = Number.parseFloat(style.width);
            const start = {
                x: Number.parseFloat(style.left) + size / 2,
                y: Number.parseFloat(style.top) + size / 2,
            };
            const layer = parts().layer()!.getBoundingClientRect();
            const expected = entry.centered
                ? { x: layer.width / 2, y: layer.height / 2 }
                : { x: at.x - layer.left, y: at.y - layer.top };
            // Within a pixel: React Native Web's page points are whole pixels.
            expect(Math.abs(start.x - expected.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(start.y - expected.y)).toBeLessThanOrEqual(1);
        });

        it("no ripple under reduced motion, though the press still tints", async () => {
            const { parts } = await mountCase(rnCase, entry);
            const rest = background(parts().surface);
            await mouse("down", parts().surface);
            const pressed = await stable(() => background(parts().surface));
            expect(parts().layer()?.childElementCount ?? 0).toBe(0);
            expectDiffers(pressed, rest, "pressed");
        });

        it("noIndication on the provider tints nothing and keeps the focus indicator", async () => {
            const material = await mountCase(rnCase, entry);
            const withMaterial = await drawn(material.parts);
            for (const root of roots.splice(0)) root.unmount();
            document.body.innerHTML = "";
            const { parts } = await mountCase(rnCase, entry, {
                provider: { indication: noIndication },
            });
            const shown = await drawn(parts);
            expectSame(shown.rest, withMaterial.rest, "at rest");
            expectSame(shown.hovered, shown.rest, "hovered");
            expectSame(shown.pressed, shown.rest, "pressed");
            expectSame(shown.focused, shown.rest, "focused");
            expect(shown.indicator).toBe(withMaterial.indicator);
        });
    });

    const [, entry] = entriesOf(rnCase)[0]!;

    it.skipIf(rnCase.inCard === false)(
        "its indication prop doesn't reach it inside a card that has one",
        async () => {
            const plain = await mountCase(rnCase, entry);
            const alone = await drawn(plain.parts);
            for (const root of roots.splice(0)) root.unmount();
            document.body.innerHTML = "";
            const { host, parts } = await mountCase(rnCase, entry, {
                inCard: CUSTOM,
            });
            expect(
                host.querySelector('[data-testid="outer-root"]'),
            ).not.toBeNull();
            // Beside the card's action area, not inside it: no control inside another.
            const area = host.querySelector(
                '[data-testid="outer-action-area"]',
            );
            expect(area).not.toBeNull();
            expect(area!.contains(parts().surface)).toBe(false);
            expect(area!.querySelector("button, [role=button]")).toBeNull();
            const inside = await drawn(parts);
            for (const state of [
                "rest",
                "hovered",
                "pressed",
                "focused",
            ] as const) {
                expectSame(inside[state], alone[state], state);
            }
            expect(inside.indicator).toBe(alone.indicator);
        },
    );

    describe.runIf(rnCase.source)("with a source", () => {
        it("a shared source shows a press on another component, and useInteractionState reports it", async () => {
            const observed = observe();
            const { parts } = await mountCase(rnCase, entry, {
                props: rnCase.source!(observed.source),
            });
            const other = render(
                createElement(
                    Button as ComponentType<Record<string, unknown>>,
                    {
                        label: "Other",
                        testId: "other",
                        interactionSource: observed.source,
                    },
                ),
            );
            await wait(50);
            const button = other.host.querySelector<HTMLElement>(
                '[data-testid="other-root"]',
            )!;
            const buttonRest = await stable(() => background(button));
            const rest = background(parts().surface);

            await mouse("down", parts().surface);
            const pressed = await stable(() => background(parts().surface));
            expect(observed.state().pressed).toBe(true);
            expectDiffers(
                await stable(() => background(button)),
                buttonRest,
                "the other, pressed",
            );
            await release();
            expect(observed.state().pressed).toBe(false);
            expectSame(
                await stable(() => background(button)),
                buttonRest,
                "the other, released",
            );

            await mouse("down", button);
            expect(observed.state().pressed).toBe(true);
            expectSame(
                await stable(() => background(parts().surface)),
                pressed,
                "pressed from the other",
            );
            await release();
            expectSame(
                await stable(() => background(parts().surface)),
                rest,
                "at rest",
            );
        });

        it("a shared source never forwards focus", async () => {
            const observed = observe();
            const { parts } = await mountCase(rnCase, entry, {
                props: rnCase.source!(observed.source),
            });
            const other = render(
                createElement(
                    Button as ComponentType<Record<string, unknown>>,
                    {
                        label: "Other",
                        testId: "other",
                        interactionSource: observed.source,
                    },
                ),
            );
            await wait(50);
            const button = other.host.querySelector<HTMLElement>(
                '[data-testid="other-root"]',
            )!;
            await focusByKeyboard(() => parts().surface);
            await wait(50);
            expect(observed.state()).toMatchObject({
                focused: true,
                focusVisible: true,
            });
            expect(await stable(() => outline(button))).toBe("none");
        });

        it.runIf(rnCase.disabled)(
            "disabling it while it's pressed ends the press",
            async () => {
                const observed = observe();
                const props = rnCase.source!(observed.source);
                const { parts, update } = await mountCase(rnCase, entry, {
                    props,
                });
                await mouse("down", parts().surface);
                await wait(50);
                expect(observed.state().pressed).toBe(true);
                await update({ ...props, ...rnCase.disabled });
                expect(observed.source.state.pressed).toBe(false);
                expect(observed.state().pressed).toBe(false);
            },
        );

        it.runIf(rnCase.itemDisabled)(
            "disabling its item while it's pressed ends the press",
            async () => {
                const observed = observe();
                const { parts, update } = await mountCase(rnCase, entry, {
                    props: rnCase.source!(observed.source),
                });
                await mouse("down", parts().surface);
                await wait(50);
                expect(observed.state().pressed).toBe(true);
                await update(rnCase.itemDisabled!(observed.source));
                expect(observed.source.state.pressed).toBe(false);
                expect(observed.state().pressed).toBe(false);
            },
        );

        it("an app's own interaction kind reaches subscribers and changes no state", async () => {
            const observed = observe();
            const { parts } = await mountCase(rnCase, entry, {
                props: rnCase.source!(observed.source),
            });
            const rest = background(parts().surface);
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
            await wait(50);
            unsubscribe();
            expect(heard).toEqual(["app:longPress"]);
            expect(observed.source.state).toEqual(idle);
            expect(observed.state()).toEqual(idle);
            expectSame(background(parts().surface), rest, "at rest");
        });
    });
});
