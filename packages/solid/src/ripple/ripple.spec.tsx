import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { Ripple } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

describe("Ripple", () => {
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
