import { testIds } from "@pureform/anatomy";
import { createRegistry, withTokenStyle } from "@pureform/styling";
import { describe, expect, it, vi } from "vitest";

import {
    createInteractionSource,
    defineIndication,
    materialIndication,
    noIndication,
    PureformProvider,
    useIndication,
    useInteractionState,
} from ".";
import type { Indication, IndicationTarget, MutableInteractionSource } from ".";
import { Button } from "./button";
import { byTestId, mount, settle } from "./testing/mount";

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
        mount(() => (
            <PureformProvider registry={registry()}>
                <Button label="Save" />
            </PureformProvider>
        ));
        await settle();
        const root = byTestId(ids.root);
        const layer = layerOf(root);
        expect(layer?.className).toBe("ripple");
        expect(layer?.getAttribute("aria-hidden")).toBe("true");
        expect(root.firstElementChild).toBe(layer);
        root.dispatchEvent(pointer("pointerdown"));
        await settle();
        expect(layer?.querySelector("[data-ripple]")?.className).toBe(
            "ripple__ink",
        );
        window.dispatchEvent(pointer("pointerup"));
    });

    it("takes the provider's indication, written as theme-level vars on its element", async () => {
        const host = mount(() => (
            <PureformProvider registry={registry()} indication={noIndication}>
                <Button label="Save" />
            </PureformProvider>
        ));
        await settle();
        const provider = host.firstElementChild as HTMLElement;
        expect(provider.style.getPropertyValue("--opacity-state-hover")).toBe(
            "0",
        );
        expect(provider.style.getPropertyValue("--opacity-state-pressed")).toBe(
            "0",
        );
        const root = byTestId(ids.root);
        expect(layerOf(root)).toBe(null);
        expect(root.getAttribute("style")).toBe(null);
    });

    it("lets a nested provider and a component's prop override it, the prop's tokens on its root", async () => {
        const targets: IndicationTarget[] = [];
        mount(() => (
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
            </PureformProvider>
        ));
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
        ).toBe("0.2");
        expect(nested.getAttribute("style")).toBe(null);
    });

    it("carries a provider's focus indicator color to each component's root", async () => {
        mount(() => (
            <PureformProvider
                registry={registry()}
                indication={{
                    name: "app:red",
                    tokens: { focusIndicatorColor: "red" },
                }}
            >
                <Button label="Save" />
            </PureformProvider>
        ));
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
            mount(() => (
                <PureformProvider registry={registry()}>
                    <Button
                        label="Save"
                        indication={{
                            name: "app:hidden-focus",
                            tokens: { focusIndicatorThickness: 0 },
                        }}
                    />
                </PureformProvider>
            ));
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
        let pressed!: () => boolean;
        mount(() => {
            source = createInteractionSource();
            const state = useInteractionState(source);
            pressed = () => state().pressed;
            return (
                <PureformProvider registry={registry()}>
                    <Button label="A" testId="a" interactionSource={source} />
                    <Button label="B" testId="b" interactionSource={source} />
                </PureformProvider>
            );
        });
        await settle();
        const a = byTestId("a-root");
        const b = byTestId("b-root");
        a.dispatchEvent(pointer("pointerdown"));
        await settle();
        expect(pressed()).toBe(true);
        expect(b.hasAttribute("data-pf-active")).toBe(true);
        // Both surfaces ripple from the one press.
        expect(layerOf(a)?.children).toHaveLength(1);
        expect(layerOf(b)?.children).toHaveLength(1);

        source.emit({ type: "hoverEnter" });
        await settle();
        expect(a.hasAttribute("data-pf-hover")).toBe(true);
        expect(b.hasAttribute("data-pf-hover")).toBe(true);
        window.dispatchEvent(pointer("pointerup"));
        source.emit({ type: "hoverExit" });
        await settle();
        expect(pressed()).toBe(false);
        expect(b.hasAttribute("data-pf-active")).toBe(false);
        expect(b.hasAttribute("data-pf-hover")).toBe(false);
    });

    it("gives an app's own surface the provider's indication with useIndication", async () => {
        let source!: MutableInteractionSource;
        function Surface() {
            source = createInteractionSource();
            const indication = useIndication(source, { centered: true });
            return (
                <div data-testid="surface" {...indication.surface}>
                    {indication.layer}
                    Tap
                </div>
            );
        }
        mount(() => (
            <PureformProvider
                registry={registry()}
                indication={materialIndication({ ripple: "ink-sparkle" })}
            >
                <Surface />
            </PureformProvider>
        ));
        await settle();
        const surface = byTestId("surface");
        const layer = layerOf(surface);
        expect(layer?.className).toBe("ripple");
        surface.dispatchEvent(pointer("pointerdown"));
        await settle();
        expect(source.state.pressed).toBe(true);
        expect(layer?.querySelector("canvas[data-ripple]")).not.toBe(null);
        // Its own press is matched by :active, so it isn't marked as forwarded.
        expect(surface.hasAttribute("data-pf-active")).toBe(false);
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        expect(source.state.pressed).toBe(false);

        source.emit({
            type: "press",
            id: -1,
            origin: "center",
            pointer: "virtual",
        });
        await settle();
        expect(surface.hasAttribute("data-pf-active")).toBe(true);
        source.emit({ type: "release", id: -1 });
    });
});
