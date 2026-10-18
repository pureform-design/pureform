import { createRegistry } from "@pureform/styling";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    componentIndicationTokens,
    DEFAULT_INDICATION,
    defineIndication,
    dropsFocusIndicator,
    IndicationHost,
    indicationRoles,
    indicationTokenValues,
    materialIndication,
    noIndication,
    providerIndicationOverrides,
    rippleClasses,
    surfaceLayer,
} from "./indication";
import type { ForwardedStates, Indication } from "./indication";
import { createInteractionSource } from "./interaction";
import { resolveProvider } from "./provider";

const registry = createRegistry({
    ripple: () => ({
        root: { class: "layer" },
        ripple: { class: "ink" },
    }),
});

afterEach(() => {
    document.body.innerHTML = "";
});

describe("indication tokens", () => {
    it("lowers lengths given as numbers to pixels, and opacities to percentages", () => {
        expect(
            indicationTokenValues({
                stateHoverOpacity: 0.12,
                focusIndicatorThickness: 4,
                focusIndicatorOuterOffset: "0.5rem",
                focusIndicatorColor: "red",
            }),
        ).toEqual({
            stateHoverOpacity: "12%",
            focusIndicatorThickness: "4px",
            focusIndicatorOuterOffset: "0.5rem",
            focusIndicatorColor: "red",
        });
        expect(indicationTokenValues({})).toBeUndefined();
    });

    it("gives a provider the theme-level tokens, but not the color", () => {
        expect(providerIndicationOverrides(noIndication)).toEqual({
            "opacity.stateHover": "0%",
            "opacity.stateFocus": "0%",
            "opacity.statePressed": "0%",
            "opacity.stateDragged": "0%",
        });
        expect(
            providerIndicationOverrides(
                defineIndication({
                    name: "thick",
                    tokens: {
                        focusIndicatorThickness: 4,
                        focusIndicatorColor: "red",
                    },
                }),
            ),
        ).toEqual({ "sizes.focusIndicatorThickness": "4px" });
        expect(providerIndicationOverrides(DEFAULT_INDICATION)).toBeUndefined();
    });

    it("gives a component its prop's tokens over the providers' color", () => {
        expect(componentIndicationTokens(noIndication, "red")).toEqual({
            focusIndicatorColor: "red",
            stateHoverOpacity: "0%",
            stateFocusOpacity: "0%",
            statePressedOpacity: "0%",
            stateDraggedOpacity: "0%",
        });
        expect(
            componentIndicationTokens(
                { name: "blue", tokens: { focusIndicatorColor: "blue" } },
                "red",
            ),
        ).toEqual({ focusIndicatorColor: "blue" });
        expect(componentIndicationTokens(undefined, undefined)).toBeUndefined();
    });

    it("carries the nearest indication's color through nested providers", () => {
        const outer = resolveProvider(undefined, {
            indication: { name: "red", tokens: { focusIndicatorColor: "red" } },
        });
        const inner = resolveProvider(outer, { indication: noIndication });
        expect(inner.indication).toBe(noIndication);
        expect(inner.focusIndicatorColor).toBe("red");
        expect(resolveProvider(inner, {}).indication).toBe(noIndication);
    });

    it("tells when an indication hides the focus indicator", () => {
        expect(dropsFocusIndicator(noIndication)).toBe(false);
        expect(dropsFocusIndicator(DEFAULT_INDICATION)).toBe(false);
        for (const thickness of [0, "0", "0px"]) {
            expect(
                dropsFocusIndicator({
                    name: "flat",
                    tokens: { focusIndicatorThickness: thickness },
                }),
            ).toBe(true);
        }
    });
});

describe("the built-ins", () => {
    it("are the same object for the same options", () => {
        expect(materialIndication()).toBe(DEFAULT_INDICATION);
        expect(materialIndication({ ripple: "ink-well" })).toBe(
            DEFAULT_INDICATION,
        );
        expect(materialIndication({ ripple: "ink-sparkle" })).not.toBe(
            DEFAULT_INDICATION,
        );
    });

    it("draws in a layer unless the ripple is off", () => {
        expect(DEFAULT_INDICATION.layer).toBe(true);
        expect(materialIndication({ ripple: false }).layer).toBeFalsy();
        expect(materialIndication({ ripple: false }).web).toBeUndefined();
        expect(noIndication.layer).toBeFalsy();
        expect(noIndication.web).toBeUndefined();
    });

    it("reads the ripple's classes from the registry", () => {
        expect(rippleClasses(registry)).toEqual({
            root: { class: "layer" },
            ripple: { class: "ink" },
        });
        expect(rippleClasses(registry)).toBe(rippleClasses(registry));
        expect(rippleClasses(createRegistry({}))).toBeUndefined();
        expect(rippleClasses(undefined)).toBeUndefined();
    });
});

// A surface with its layer, placed so a ripple has room.
const surface = () => {
    const element = document.createElement("button");
    element.style.cssText = "position: relative; width: 100px; height: 40px";
    const layer = document.createElement("span");
    layer.style.cssText = "position: absolute; inset: 0; overflow: hidden";
    element.append(layer);
    document.body.append(element);
    return { element, layer };
};

const press = (
    id: number,
    origin: "center" | { x: number; y: number } = "center",
) => ({ type: "press", id, origin, pointer: "mouse" }) as const;

describe("Material's ripple", () => {
    const context = (reduced = false, centered = false) => ({
        centered,
        reducedMotion: () => reduced,
        dir: () => "ltr" as const,
        registry,
    });

    it("draws a ripple in the layer for each press the source hears", () => {
        const { element, layer } = surface();
        const source = createInteractionSource();
        const cleanup = DEFAULT_INDICATION.web!(
            { trigger: element, surface: element, layer },
            source,
            context(),
        );
        expect(layer.children).toHaveLength(0);
        source.emit(press(1));
        expect(layer.querySelectorAll("[data-ripple]")).toHaveLength(1);
        expect(layer.querySelector("[data-ripple]")?.className).toBe("ink");
        source.emit({ type: "release", id: 1 });
        cleanup();
        source.emit(press(2));
        expect(layer.querySelectorAll("[data-ripple]")).toHaveLength(1);
    });

    it("draws none while motion is reduced", () => {
        const { element, layer } = surface();
        const source = createInteractionSource();
        DEFAULT_INDICATION.web!(
            { trigger: element, surface: element, layer },
            source,
            context(true),
        );
        source.emit(press(1));
        expect(layer.children).toHaveLength(0);
    });

    it("waits out a touch press", () => {
        vi.useFakeTimers();
        try {
            const { element, layer } = surface();
            const source = createInteractionSource();
            DEFAULT_INDICATION.web!(
                { trigger: element, surface: element, layer },
                source,
                context(),
            );
            source.emit({
                type: "press",
                id: 1,
                origin: "center",
                pointer: "touch",
            });
            expect(layer.children).toHaveLength(0);
            source.emit({ type: "cancel", id: 1 });
            vi.advanceTimersByTime(300);
            expect(layer.children).toHaveLength(0);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe("IndicationHost", () => {
    const ENTRIES = [
        { trigger: "input", surface: "root", centered: true, focus: "root" },
    ];

    it("names a part's roles, marking an input's states on root", () => {
        expect(indicationRoles(ENTRIES, "input")).toEqual([
            { entry: 0, role: "trigger" },
        ]);
        expect(indicationRoles(ENTRIES, "root")).toEqual([
            { entry: 0, role: "surface" },
            { entry: 0, role: "state" },
        ]);
        expect(indicationRoles(ENTRIES, "box")).toEqual([]);
        expect(indicationRoles(undefined, "root")).toEqual([]);
    });

    const recording = (calls: string[]): Indication => ({
        name: "recording",
        layer: true,
        web(target, _source, context) {
            calls.push(`start ${target.trigger.tagName} ${context.centered}`);
            return () => calls.push("stop");
        },
    });

    it("runs the effect once the trigger and surface are attached", () => {
        const calls: string[] = [];
        const host = new IndicationHost(ENTRIES, {
            reducedMotion: () => false,
            dir: () => "ltr",
        });
        host.configure(recording(calls), registry);
        const source = createInteractionSource();
        const { element } = surface();
        const input = document.createElement("input");
        const detachRoot = host.instance(0, source).attach("surface", element);
        expect(calls).toEqual([]);
        const detachInput = host.instance(0, source).attach("trigger", input);
        expect(calls).toEqual(["start INPUT true"]);
        host.configure(recording(calls), registry);
        expect(calls).toEqual(["start INPUT true", "stop", "start INPUT true"]);
        detachInput();
        expect(calls.at(-1)).toBe("stop");
        detachRoot();
    });

    it("finds the layer in the surface when the effect reads it", () => {
        const layers: (HTMLElement | undefined)[] = [];
        let read: () => void = () => {};
        const host = new IndicationHost(ENTRIES, {
            reducedMotion: () => false,
            dir: () => "ltr",
        });
        host.configure(
            {
                name: "reading",
                layer: true,
                web(target) {
                    read = () => layers.push(target.layer);
                    return () => {};
                },
            },
            registry,
        );
        const source = createInteractionSource();
        const element = document.createElement("button");
        document.body.append(element);
        const detachRoot = host.instance(0, source).attach("surface", element);
        const detachInput = host.instance(0, source).attach("trigger", element);
        read();
        // Mounted after the effect started, as a binding's layer may be.
        const layer = document.createElement("span");
        layer.setAttribute("data-ripple-layer", "");
        element.append(layer);
        read();
        expect(layers).toEqual([undefined, layer]);
        expect(surfaceLayer(element)).toBe(layer);
        detachInput();
        detachRoot();
    });

    it("forwards hover and press from other origins, never its own", () => {
        const host = new IndicationHost(ENTRIES, {
            reducedMotion: () => false,
            dir: () => "ltr",
        });
        const source = createInteractionSource();
        const { element } = surface();
        const instance = host.instance(0, source);
        const detach = instance.attach("state", element);
        const seen: ForwardedStates[] = [];
        const stop = instance.subscribeForwarded((states) => seen.push(states));

        source.emit({ type: "hoverEnter" }, element);
        source.emit(press(1), element);
        expect(seen).toEqual([]);
        source.emit({ type: "release", id: 1 }, element);

        source.emit({ type: "hoverEnter" });
        source.emit(press(2), document.body);
        source.emit({ type: "focus", visible: true });
        expect(instance.forwarded).toEqual({ hover: true, pressed: true });
        source.emit({ type: "cancel", id: 2 });
        source.emit({ type: "hoverExit" });
        expect(seen).toEqual([
            { hover: true, pressed: false },
            { hover: true, pressed: true },
            { hover: true, pressed: false },
            { hover: false, pressed: false },
        ]);
        stop();
        detach();
    });
});
