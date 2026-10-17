// An icon slot's fill: React Native has no variable font axes, so selection returns the slot's
// `FILL` axis beside its style, and the style never holds `fontVariationSettings`. A toggle icon
// button fills its icon while selected, a navigation destination while current, and the
// standalone icon when its `filled` variant says so.

import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { precompute } from "./build";
import { nativeFactory } from "./factory";

const styles = precompute(pureform(), {
    components: ["iconButton", "navigationBar", "icon", "button"],
});
const factory = (name: string) => nativeFactory(name, styles);

describe("icon fills", () => {
    it("fill a toggle icon button's icon while it's selected", () => {
        const iconButton = factory("iconButton");
        expect(iconButton({ toggle: true }).icon!.iconFill).toBe(0);
        expect(
            iconButton({ toggle: true, selected: true }).icon!.iconFill,
        ).toBe(1);
        expect(iconButton({}).icon!.iconFill).toBe(0);
    });

    it("fill the current navigation destination's icon", () => {
        const bar = factory("navigationBar");
        expect(bar({}).icon!.iconFill).toBe(0);
        expect(bar({ selected: true }).icon!.iconFill).toBe(1);
    });

    it("follow the standalone icon's filled variant", () => {
        const icon = factory("icon");
        expect(icon({ filled: true }).root!.iconFill).toBe(1);
        expect(icon({ filled: false }).root!.iconFill).toBe(0);
        expect(icon({}).root!.iconFill).toBeUndefined();
    });

    it("follow an instance's own fill token", () => {
        const iconButton = factory("iconButton");
        expect(
            iconButton({
                tokens: { "components.iconButton.iconFill": 1 },
            }).icon!.iconFill,
        ).toBe(1);
    });

    it("stay out of every style", () => {
        for (const name of ["iconButton", "navigationBar", "icon", "button"]) {
            const selected = factory(name).selected({ selected: true });
            for (const style of Object.values(selected.styles)) {
                expect(style).not.toHaveProperty("fontVariationSettings");
                expect(style).not.toHaveProperty("iconFill");
            }
        }
    });
});
