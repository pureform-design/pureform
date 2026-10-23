import type { SlottedComponentSpec } from "@pureform/core/types";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import {
    horizontalSharedAxis,
    SHARED_AXIS_KEYFRAMES,
    sharedAxisScrimOpacity,
} from "./horizontal-shared-axis";

const recipe = () =>
    compilePreset(configWith(horizontalSharedAxis as SlottedComponentSpec))
        .theme?.slotRecipes?.["horizontalSharedAxis"];

const css = () => JSON.stringify(recipe());

describe("horizontal shared axis", () => {
    it("has a root, its pages and the scrim", () => {
        expect(recipe()?.slots).toEqual(["root", "page", "scrim"]);
    });

    it("slides each page a fifth of its width, mirrored under right to left", () => {
        expect(SHARED_AXIS_KEYFRAMES["sharedAxisFromRight"]).toMatchObject({
            from: {
                transform: { ops: [{ args: [{ value: 20, unit: "%" }] }] },
            },
        });
        const out = css();
        const forwardIn = out.slice(
            out.indexOf("&[data-state=entering][data-direction=forward]"),
        );
        expect(forwardIn).toMatch(/^[^}]*sharedAxisFromRight/);
        expect(forwardIn).toMatch(/_rtl[^}]*sharedAxisFromLeft/);
    });

    it("slides on the default spatial spring and fades linearly for 90ms after 50ms", () => {
        const out = css();
        expect(out).toContain(
            "var(--components-horizontalSharedAxis-slideSpring-duration, token(springs.spatialDefault.duration))",
        );
        expect(out).toContain(
            "var(--components-horizontalSharedAxis-fadeDuration, 90ms) linear var(--components-horizontalSharedAxis-fadeDelay, 50ms) both overlayFadeIn",
        );
        expect(out).toContain("overlayFadeIn");
        expect(out).toContain("overlayFadeOut");
    });

    it("keeps only the fade under reduced motion", () => {
        const out = css();
        const reduced = [...out.matchAll(/"_motionReduce":"([^"]*)"/g)].map(
            (m) => m[1]!,
        );
        expect(reduced.length).toBeGreaterThan(0);
        for (const run of reduced) {
            expect(run).not.toContain("sharedAxis");
            expect(run).toMatch(/overlayFade(In|Out)/);
        }
    });

    it("picks Compose's scrim opacity from the surface's luminance", () => {
        expect(sharedAxisScrimOpacity(0.9)).toBe(0.2);
        expect(sharedAxisScrimOpacity(0.05)).toBe(0.8);
        const tokens = pureform().components?.["horizontalSharedAxis"]
            ?.tokens as Record<string, unknown>;
        // The default theme's surface is light in light and dark in dark.
        expect(JSON.stringify(tokens["scrimOpacity"])).toContain("dark");
    });
});
