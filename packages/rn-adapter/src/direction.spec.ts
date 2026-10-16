// Selection with the `rtl` state flips what logical properties can't: the switch's handle
// centers on its inline start from the other side, and the indeterminate linear progress runs
// its keyframes the other way.

import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { precompute } from "./build";
import { stylesFor } from "./resolve";
import { selectWithTransitions } from "./select";

const styles = stylesFor(
    precompute(pureform(), {
        components: ["switchControl", "linearProgress"],
    }),
    "base:light",
);

const selected = (
    name: string,
    rtl: boolean,
    variants: Record<string, string> = {},
) => selectWithTransitions(styles[name]!, variants, { rtl });

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
});
