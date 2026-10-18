import { testIds } from "@pureform/anatomy";
import { createRegistry, withTokenStyle } from "@pureform/styling";
import { act } from "@testing-library/react";
import { Profiler } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
    defineIndication,
    materialIndication,
    noIndication,
    PureformProvider,
    useIndication,
    useInteractionSource,
    useInteractionState,
} from ".";
import type { Indication, IndicationTarget, MutableInteractionSource } from ".";
import { navigationRegistry } from "./__fixtures__/registry";
import { Button } from "./button";
import { ListItem } from "./list-item";
import { mount, outside, settle } from "./testing/render";

const ids = testIds.button;

const TOKENS = [
    "stateHoverOpacity",
    "stateFocusOpacity",
    "statePressedOpacity",
    "stateDraggedOpacity",
    "focusIndicatorThickness",
    "focusIndicatorOuterOffset",
    "focusIndicatorColor",
] as const;

const VARS: Record<string, `--${string}`> = Object.fromEntries(
    TOKENS.map((token) => [token, `--pf-components-button-${token}` as const]),
);

// A button whose factory writes its instance tokens on its root, and the ripple.
const registry = () =>
    createRegistry(
        {
            button: (selection: { tokens?: Record<string, string> }) =>
                withTokenStyle(
                    {
                        root: { class: "button" },
                        label: { class: "button__label" },
                        icon: { class: "button__icon" },
                        touchTarget: { class: "button__touch-target" },
                    },
                    selection.tokens,
                    VARS,
                ),
            ripple: () => ({
                root: { class: "ripple" },
                ripple: { class: "ripple__ink" },
            }),
        },
        { vars: { prefix: "pf" } },
    );

/** The first element with a test id. */
const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

// Events dispatched inside `act`, so React applies what they cause.
const dispatch = (target: EventTarget, event: Event) =>
    act(() => {
        target.dispatchEvent(event);
    });

const layerOf = (element: Element) =>
    element.querySelector(":scope > [data-ripple-layer]");

// An indication that records the effect's target.
const recording = (targets: IndicationTarget[]): Indication =>
    defineIndication({
        name: "app:recording",
        layer: true,
        web(target) {
            targets.push(target);
            return () => {};
        },
    });

const pointer = (type: string, init: PointerEventInit = {}) =>
    new PointerEvent(type, {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
        clientX: 10,
        clientY: 10,
        ...init,
    });

describe("indication", () => {
    it("draws Material's by default: a layer in the surface, and a ripple on a press", async () => {
        mount(
            <PureformProvider registry={registry()}>
                <Button label="Save" />
            </PureformProvider>,
        );
        await settle();
        const root = byTestId(ids.root);
        const layer = layerOf(root);
        expect(layer?.className).toBe("ripple");
        expect(layer?.getAttribute("aria-hidden")).toBe("true");
        expect(root.firstElementChild).toBe(layer);
        await dispatch(root, pointer("pointerdown"));
        await settle();
        expect(layer?.querySelector("[data-ripple]")?.className).toBe(
            "ripple__ink",
        );
        await dispatch(window, pointer("pointerup"));
    });

    it("renders a surface once as it mounts: its element and layer aren't kept in state", async () => {
        const commits: string[] = [];
        mount(
            <PureformProvider registry={navigationRegistry()}>
                <Profiler
                    id="items"
                    onRender={(_, phase) => commits.push(phase)}
                >
                    <ListItem headline="Inbox" href="#inbox" />
                    <ListItem headline="Sent" href="#sent" />
                </Profiler>
            </PureformProvider>,
        );
        await settle();
        expect(document.querySelectorAll("[data-ripple-layer]")).toHaveLength(
            2,
        );
        expect(commits).toEqual(["mount"]);
    });

    it("finds the layer at a press, after the indication turns it on", async () => {
        const indication = outside<Indication>(
            materialIndication({ ripple: false }),
        );
        mount(
            <PureformProvider registry={registry()}>
                <indication.Holder>
                    {(value) => <Button label="Save" indication={value} />}
                </indication.Holder>
            </PureformProvider>,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(layerOf(root)).toBe(null);
        await indication.set(materialIndication());
        await settle();
        const layer = layerOf(root);
        expect(layer).not.toBe(null);
        await dispatch(root, pointer("pointerdown"));
        await settle();
        expect(layer?.querySelectorAll("[data-ripple]")).toHaveLength(1);
        await dispatch(window, pointer("pointerup"));
    });

    it("takes the provider's indication, written as theme-level vars on its element", async () => {
        const host = mount(
            <PureformProvider registry={registry()} indication={noIndication}>
                <Button label="Save" />
            </PureformProvider>,
        );
        await settle();
        const provider = host.firstElementChild as HTMLElement;
        expect(provider.style.getPropertyValue("--opacity-state-hover")).toBe(
            "0%",
        );
        expect(provider.style.getPropertyValue("--opacity-state-pressed")).toBe(
            "0%",
        );
        const root = byTestId(ids.root);
        expect(layerOf(root)).toBe(null);
        expect(root.getAttribute("style")).toBe(null);
    });

    it("lets a nested provider and a component's prop override it, the prop's tokens on its root", async () => {
        const targets: IndicationTarget[] = [];
        mount(
            <PureformProvider registry={registry()} indication={noIndication}>
                <PureformProvider indication={recording(targets)}>
                    <Button label="Nested" testId="nested" />
                </PureformProvider>
                <Button
                    label="Own"
                    testId="own"
                    indication={defineIndication({
                        name: "app:thick",
                        tokens: {
                            focusIndicatorThickness: 4,
                            stateHoverOpacity: 0.2,
                        },
                    })}
                />
            </PureformProvider>,
        );
        await settle();
        const nested = byTestId("nested-root");
        expect(layerOf(nested)).not.toBe(null);
        expect(targets).toHaveLength(1);
        // Compared one by one: React keeps its fibers on the elements.
        expect(targets[0]?.trigger).toBe(nested);
        expect(targets[0]?.surface).toBe(nested);
        expect(targets[0]?.layer).toBe(layerOf(nested));
        const own = byTestId("own-root");
        expect(
            own.style.getPropertyValue(
                "--pf-components-button-focusIndicatorThickness",
            ),
        ).toBe("4px");
        expect(
            own.style.getPropertyValue(
                "--pf-components-button-stateHoverOpacity",
            ),
        ).toBe("20%");
        expect(nested.getAttribute("style")).toBe(null);
    });

    it("carries a provider's focus indicator color to each component's root", async () => {
        mount(
            <PureformProvider
                registry={registry()}
                indication={{
                    name: "app:red",
                    tokens: { focusIndicatorColor: "red" },
                }}
            >
                <Button label="Save" />
            </PureformProvider>,
        );
        await settle();
        expect(
            byTestId(ids.root).style.getPropertyValue(
                "--pf-components-button-focusIndicatorColor",
            ),
        ).toBe("red");
    });

    it("warns once in development when an indication hides the focus indicator", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            mount(
                <PureformProvider registry={registry()}>
                    <Button
                        label="Save"
                        indication={{
                            name: "app:hidden-focus",
                            tokens: { focusIndicatorThickness: 0 },
                        }}
                    />
                </PureformProvider>,
            );
            await settle();
            expect(warn).toHaveBeenCalledWith(
                expect.stringContaining('"app:hidden-focus"'),
            );
        } finally {
            warn.mockRestore();
        }
    });

    it("shows a press on a component sharing the source with another, and reports it", async () => {
        let source!: MutableInteractionSource;
        let pressed = false;
        function Shared(): ReactNode {
            source = useInteractionSource();
            pressed = useInteractionState(source).pressed;
            return (
                <>
                    <Button label="A" testId="a" interactionSource={source} />
                    <Button label="B" testId="b" interactionSource={source} />
                </>
            );
        }
        mount(
            <PureformProvider registry={registry()}>
                <Shared />
            </PureformProvider>,
        );
        await settle();
        const a = byTestId("a-root");
        const b = byTestId("b-root");
        await dispatch(a, pointer("pointerdown"));
        await settle();
        expect(pressed).toBe(true);
        expect(b.hasAttribute("data-pf-active")).toBe(true);
        // Both surfaces ripple from the one press.
        expect(layerOf(a)?.children).toHaveLength(1);
        expect(layerOf(b)?.children).toHaveLength(1);

        await act(() => source.emit({ type: "hoverEnter" }));
        await settle();
        expect(a.hasAttribute("data-pf-hover")).toBe(true);
        expect(b.hasAttribute("data-pf-hover")).toBe(true);
        await dispatch(window, pointer("pointerup"));
        await act(() => source.emit({ type: "hoverExit" }));
        await settle();
        expect(pressed).toBe(false);
        expect(b.hasAttribute("data-pf-active")).toBe(false);
        expect(b.hasAttribute("data-pf-hover")).toBe(false);
    });

    it("gives an app's own surface the provider's indication with useIndication", async () => {
        let source!: MutableInteractionSource;
        function Surface(): ReactNode {
            source = useInteractionSource();
            const indication = useIndication(source, { centered: true });
            return (
                <div data-testid="surface" {...indication.surface}>
                    {indication.layer}
                    Tap
                </div>
            );
        }
        mount(
            <PureformProvider
                registry={registry()}
                indication={materialIndication({ ripple: "ink-sparkle" })}
            >
                <Surface />
            </PureformProvider>,
        );
        await settle();
        const surface = byTestId("surface");
        const layer = layerOf(surface);
        expect(layer?.className).toBe("ripple");
        await dispatch(surface, pointer("pointerdown"));
        await settle();
        expect(source.state.pressed).toBe(true);
        expect(layer?.querySelector("canvas[data-ripple]")).not.toBe(null);
        // Its own press is matched by :active, so it isn't marked as forwarded.
        expect(surface.hasAttribute("data-pf-active")).toBe(false);
        await dispatch(window, pointer("pointerup"));
        await settle();
        expect(source.state.pressed).toBe(false);

        await act(() =>
            source.emit({
                type: "press",
                id: -1,
                origin: "center",
                pointer: "virtual",
            }),
        );
        expect(surface.hasAttribute("data-pf-active")).toBe(true);
        await act(() => source.emit({ type: "release", id: -1 }));
    });
});
