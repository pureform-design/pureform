import { describe, expect, it } from "vitest";

import { createCheckbox } from "./checkbox";
import { createChip } from "./chip";
import { createListItem } from "./list-item";
import { createMenu } from "./menu";
import { createNavigationBar } from "./navigation-bar";
import { createNavigationRail } from "./navigation-rail";
import { createCircularProgress, createLinearProgress } from "./progress";
import { createRadio } from "./radio";
import { createSlider } from "./slider";
import { createSupportingText } from "./supporting-text";
import { createSwitch } from "./switch";
import { createTabs } from "./tabs";
import { createTextArea } from "./text-area";
import { createTextField } from "./text-field";

const GROUPS = ["primary", "tertiary", "brand"];

describe.each([
    ["checkbox", createCheckbox],
    ["radio", createRadio],
    ["switchControl", createSwitch],
    ["chip", createChip],
    ["textField", createTextField],
    ["textArea", createTextArea],
    ["listItem", createListItem],
    ["menu", createMenu],
    ["tabs", createTabs],
    ["slider", createSlider],
    ["linearProgress", createLinearProgress],
    ["circularProgress", createCircularProgress],
    ["navigationBar", createNavigationBar],
    ["navigationRail", createNavigationRail],
] as const)("%s color", (_, create) => {
    const spec = create(GROUPS);

    it("has a color variant per group, defaulting to primary", () => {
        expect(Object.keys(spec.recipe.variants?.color ?? {})).toEqual(GROUPS);
        expect(spec.recipe.defaultVariants?.color).toBe("primary");
    });

    it("leaves primary to the tokens and reads other groups' roles", () => {
        const variants = spec.recipe.variants?.color ?? {};
        expect(variants.primary).toEqual({});
        const brand = JSON.stringify([
            variants.brand,
            spec.recipe.compoundVariants?.filter(
                (c) => c.match.color === "brand",
            ),
        ]);
        expect(brand).toContain('"brand');
        expect(brand).not.toContain('"tertiary');
    });
});

describe("supportingText tone", () => {
    it("has neutral, error, and a tone per group", () => {
        const spec = createSupportingText(GROUPS);
        expect(Object.keys(spec.recipe.variants?.tone ?? {})).toEqual([
            "neutral",
            "error",
            ...GROUPS,
        ]);
    });
});
