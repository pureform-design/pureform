import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { button } from "./button";
import { GROUP_TRANSITION } from "./button-group";
import { chip } from "./chip";
import { fabMenu } from "./fab-menu";
import { iconButton } from "./icon-button";
import { navigationBar } from "./navigation-bar";
import { slider } from "./slider";
import { splitButton } from "./split-button";
import { switchControl } from "./switch";
import { tabs } from "./tabs";
import { timePicker } from "./time-picker";

type Component = Parameters<typeof configWith>[0];

// Every transition string in a compiled recipe, by its condition (`base`, `_motionReduce`, ...).
const transitions = (component: Component) => {
    const found: Record<string, string[]> = {};
    const walk = (value: unknown, key = "") => {
        if (typeof value === "string") {
            if (key === "transition") (found.base ??= []).push(value);
            return;
        }
        if (!value || typeof value !== "object") return;
        for (const [k, v] of Object.entries(value)) {
            if (key === "transition" && typeof v === "string") {
                (found[k] ??= []).push(v);
            } else walk(v, key === "transition" ? "transition" : k);
        }
    };
    walk(compilePreset(configWith(component)).theme?.slotRecipes);
    return found;
};

// Compose Material 3's MotionScheme role per component (see context/m2a.md).
const cases: [string, Component, string[]][] = [
    ["button", button, ["effectsDefault"]],
    ["icon button", iconButton, ["effectsDefault"]],
    ["chip", chip, ["spatialFast"]],
    ["FAB menu", fabMenu, ["spatialFast"]],
    ["split button", splitButton, ["effectsDefault", "spatialFast"]],
    ["navigation bar", navigationBar, ["spatialDefault", "effectsDefault"]],
    ["tabs", tabs, ["spatialDefault"]],
    ["switch", switchControl, ["spatialFast"]],
    ["slider", slider, ["spatialFast"]],
    ["time picker", timePicker, ["spatialDefault"]],
];

describe("spatial springs", () => {
    it.each(cases)(
        "%s moves on its spring, not the emphasized tween, and not under reduced motion",
        (_, component, roles) => {
            const found = transitions(component);
            const all = Object.values(found).flat().join("\n");
            for (const role of roles) expect(all).toContain(`springs.${role}`);
            expect(all).not.toContain("easings.emphasized");
            expect((found._motionReduce ?? []).join("\n")).not.toContain(
                "springs.spatial",
            );
        },
    );

    it("springs a grouped button's corners and width, as Compose's ButtonGroup does", () => {
        const text = JSON.stringify(GROUP_TRANSITION);
        expect(text).toContain("spatialFast");
        expect(text).not.toContain("emphasized");
    });
});
