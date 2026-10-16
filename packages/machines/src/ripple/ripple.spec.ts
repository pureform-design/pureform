import { afterEach, describe, expect, it } from "vitest";

import * as ripple from ".";
import { run, settle } from "../testing/vanilla";

let cleanup: (() => void) | undefined;
afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.innerHTML = "";
});

function mount(props: Partial<ripple.Props> = {}) {
    const surface = document.createElement("button");
    surface.style.cssText =
        "position: relative; width: 100px; height: 40px; overflow: hidden";
    const layer = document.createElement("span");
    layer.style.cssText = "position: absolute; inset: 0";
    surface.append(layer);
    document.body.append(surface);
    const running = run(
        ripple.machine,
        ripple.connect,
        { id: "save", ...props },
        (api, spread) => spread(layer, api.getLayerProps()),
    );
    cleanup = running.stop;
    return { ...running, surface, layer };
}

const press = (surface: Element) => {
    const { left, top } = surface.getBoundingClientRect();
    const init = {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
        clientX: left + 10,
        clientY: top + 10,
    };
    surface.dispatchEvent(new PointerEvent("pointerdown", init));
    surface.dispatchEvent(new PointerEvent("pointerup", init));
};

const ripples = (layer: Element) => layer.querySelectorAll("[data-ripple]");

describe("ripple machine", () => {
    it("renders the layer the ripples draw in", () => {
        const { layer } = mount();
        expect(layer.id).toBe("ripple:save:layer");
        expect(layer.hasAttribute("data-ripple-layer")).toBe(true);
        expect(layer.getAttribute("aria-hidden")).toBe("true");
        expect(layer.dataset["scope"]).toBe("ripple");
        expect(layer.dataset["part"]).toBe("layer");
    });

    it("ripples presses on the layer's parent", async () => {
        const { surface, layer } = mount({
            rippleClass: "ink",
            reducedMotion: false,
        });
        press(surface);
        await settle();
        const [drawn] = ripples(layer);
        expect(drawn?.localName).toBe("span");
        expect(drawn?.classList.contains("ink")).toBe(true);
    });

    it("reads its props at each press", async () => {
        const { surface, layer, setProps } = mount({ reducedMotion: false });
        setProps({ id: "save", reducedMotion: false, variant: "ink-sparkle" });
        await settle();
        press(surface);
        await settle();
        expect(ripples(layer)[0]?.localName).toBe("canvas");
    });

    it("skips presses while disabled or with reduced motion", async () => {
        const { surface, layer, setProps } = mount({
            disabled: true,
            reducedMotion: false,
        });
        press(surface);
        setProps({ id: "save", reducedMotion: true });
        press(surface);
        await settle();
        expect(ripples(layer)).toHaveLength(0);
    });

    it("ripples on another surface when given one", async () => {
        const other = document.createElement("div");
        document.body.append(other);
        const { surface, layer } = mount({
            reducedMotion: false,
            getSurfaceEl: () => other,
        });
        press(surface);
        await settle();
        expect(ripples(layer)).toHaveLength(0);
        press(other);
        await settle();
        expect(ripples(layer)).toHaveLength(1);
    });

    it("stops listening when stopped", async () => {
        const { surface, layer, stop } = mount({ reducedMotion: false });
        stop();
        press(surface);
        await settle();
        expect(ripples(layer)).toHaveLength(0);
    });
});
