// Selection with the `rtl` state flips what logical properties can't: the switch's handle
// centers on its inline start from the other side, the indeterminate linear progress runs
// its keyframes the other way, and an icon marked `mirrored` flips.

import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { precompute } from "./build";
import { stylesFor } from "./resolve";
import { selectWithTransitions } from "./select";
import type { State } from "./select";

const styles = stylesFor(
    precompute(pureform(), {
        components: [
            "switchControl",
            "linearProgress",
            "iconButton",
            "textField",
        ],
    }),
    "base:light",
);

const selected = (
    name: string,
    rtl: boolean,
    variants: Record<string, string> = {},
    state: State = {},
) => selectWithTransitions(styles[name]!, variants, { ...state, rtl });

describe("selection in each direction", () => {
    it("centers the switch's handle and state layer on their inline start", () => {
        for (const slot of ["handle", "stateLayer"]) {
            const ltr = selected("switchControl", false).styles[slot]!;
            const rtl = selected("switchControl", true).styles[slot]!;
            expect(ltr.start).toBeDefined();
            expect(rtl.start).toEqual(ltr.start);
            expect(ltr.left).toBeUndefined();
            expect(ltr.transform).toEqual([
                { translateX: "-50%" },
                { translateY: "-50%" },
            ]);
            expect(rtl.transform).toEqual([
                { translateX: "50%" },
                { translateY: "-50%" },
            ]);
        }
    });

    it("runs the indeterminate linear progress the other way", () => {
        const name = (rtl: boolean) =>
            selected("linearProgress", rtl, { indeterminate: "true" })
                .animations.indicator?.name;
        expect(name(false)).toBe("linearProgressSlide");
        expect(name(true)).toBe("linearProgressSlideRtl");
    });

    it("flips an icon marked mirrored under rtl only", () => {
        const icon = (rtl: boolean, mirrored: boolean) =>
            selected("iconButton", rtl, {}, { mirrored }).styles.icon!
                .transform;
        expect(icon(true, true)).toEqual([{ scaleX: -1 }]);
        expect(icon(true, false)).toBeUndefined();
        expect(icon(false, true)).toBeUndefined();
    });

    it("keeps a field icon's centering when it flips", () => {
        expect(
            selected(
                "textField",
                true,
                { leadingIcon: "true" },
                { mirrored: true },
            ).styles.leadingIcon!.transform,
        ).toEqual([{ translateY: "-50%" }, { scaleX: -1 }]);
    });

    it("drops the icon font's fill axis, which React Native lacks", () => {
        const icon = selected("iconButton", false).styles.icon!;
        expect(icon).not.toHaveProperty("fontVariationSettings");
    });
});
