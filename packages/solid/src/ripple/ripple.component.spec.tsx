import { testIds } from "@pureform/anatomy";
import { createWebRegistry } from "@pureform/styling-web";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";

import { Ripple } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

describe("Ripple", () => {
    it.each(["ink-well", "ink-sparkle"] as const)(
        "merges registry, provider and updated instance styling on %s ink",
        async (effect) => {
            const registry = createWebRegistry({
                ripple: () => ({
                    root: { class: "layer" },
                    ripple: {
                        class: "ink",
                        style: { color: "red", opacity: "0.1" },
                    },
                }),
            });
            const [opacity, setOpacity] = createSignal(0.6);
            mount(() => (
                <PureformProvider
                    registry={registry}
                    motion="full"
                    slotProps={{
                        ripple: {
                            ripple: {
                                class: "provided",
                                style: { opacity: 0.3, "margin-left": "4px" },
                            },
                        },
                    }}
                >
                    <button type="button">
                        <Ripple
                            effect={effect}
                            testId="styled"
                            slotProps={{
                                ripple: {
                                    class: "instance",
                                    style: { opacity: opacity() },
                                },
                            }}
                        />
                    </button>
                </PureformProvider>
            ));
            await settle();
            setOpacity(0.7);
            await settle();
            const layer = byTestId("styled-root");
            layer.parentElement!.dispatchEvent(
                new PointerEvent("pointerdown", {
                    bubbles: true,
                    button: 0,
                    isPrimary: true,
                    pointerType: "mouse",
                }),
            );
            await settle();
            const ink = layer.querySelector<HTMLElement>("[data-ripple]")!;
            expect(ink.className).toBe("ink provided instance");
            expect(ink.style.color).toBe("red");
            expect(ink.style.opacity).toBe("0.7");
            expect(ink.style.marginLeft).toBe("4px");
            expect(ink.dataset.testid).toBe("styled-ripple");
            expect(layer.hasAttribute("slotProps")).toBe(false);
        },
    );

    it("is a hidden layer that ripples presses on its surface with the ripple slot's class", async () => {
        mount(() => (
            <PureformProvider registry={displayRegistry()} motion="full">
                <button type="button" style={{ position: "relative" }}>
                    Press
                    <Ripple />
                </button>
            </PureformProvider>
        ));
        await settle();
        const layer = byTestId(testIds.ripple.root);
        expect(layer.getAttribute("aria-hidden")).toBe("true");
        expect(layer.hasAttribute("data-ripple-layer")).toBe(true);
        expect(layer.className).toBe("ripple");
        layer.parentElement!.dispatchEvent(
            new PointerEvent("pointerdown", {
                bubbles: true,
                button: 0,
                isPrimary: true,
                pointerType: "mouse",
                clientX: 4,
                clientY: 4,
            }),
        );
        await settle();
        expect(layer.querySelector(".ripple__ripple")).not.toBe(null);
    });

    it("draws nothing while motion is reduced", async () => {
        mount(() => (
            <PureformProvider registry={displayRegistry()} motion="reduce">
                <button type="button" style={{ position: "relative" }}>
                    Press
                    <Ripple />
                </button>
            </PureformProvider>
        ));
        await settle();
        const layer = byTestId(testIds.ripple.root);
        layer.parentElement!.dispatchEvent(
            new PointerEvent("pointerdown", {
                bubbles: true,
                button: 0,
                isPrimary: true,
                pointerType: "mouse",
            }),
        );
        await settle();
        expect(layer.children).toHaveLength(0);
    });
});
