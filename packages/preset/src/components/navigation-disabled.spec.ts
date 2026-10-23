// A disabled destination or tab fades its icon and label to Material's disabled content opacity
// (38%): Compose's `NavigationBarItemDefaults.colors` and `NavigationRailItemDefaults.colors`
// (`InactiveIconColor.copy(alpha = DisabledAlpha)`), MDC-Android's `m3_tabs_text_color`.

import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { navigationBar } from "./navigation-bar";
import { navigationRail } from "./navigation-rail";
import { tabs } from "./tabs";

const disabledKeys = (style: unknown) =>
    Object.keys((style ?? {}) as Record<string, unknown>).filter((key) =>
        key.includes(":disabled"),
    );

describe("disabled navigation items", () => {
    for (const [name, preset, part] of [
        ["navigationBar", navigationBar, "item"],
        ["navigationRail", navigationRail, "item"],
        ["tabs", tabs, "tab"],
    ] as const) {
        it(`fades a disabled ${name} ${part}'s content`, () => {
            const recipe = compilePreset(configWith(preset)).theme
                ?.slotRecipes?.[name];
            const base = recipe?.base?.[part] as Record<string, unknown>;
            const [key] = disabledKeys(base);
            expect(key).toBeDefined();
            expect(JSON.stringify(base[key!])).toMatch(/disabled/i);
        });
    }

    it("fades a disabled destination's icon", () => {
        const recipe = compilePreset(configWith(navigationBar)).theme
            ?.slotRecipes?.["navigationBar"];
        const indicator = recipe?.base?.["indicator"] as {
            color?: Record<string, unknown>;
        };
        expect(
            Object.entries(indicator.color ?? {}).some(
                ([key, value]) =>
                    key.includes(":disabled") &&
                    String(value).includes("disabledIconColor"),
            ),
        ).toBe(true);
    });
});
