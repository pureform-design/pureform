import type { SlottedComponentSpec } from "@pureform/core/types";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { dialog } from "./dialog";
import { listItem } from "./list-item";
import { menu } from "./menu";
import { navigationBar } from "./navigation-bar";
import { navigationRail } from "./navigation-rail";
import { circularProgress, linearProgress } from "./progress";
import { searchBar } from "./search-bar";
import { select } from "./select";
import { slider } from "./slider";
import { snackbar } from "./snackbar";
import { tabs } from "./tabs";
import { tooltip } from "./tooltip";

describe.each([
    ["listItem", listItem],
    ["menu", menu],
    ["tabs", tabs],
    ["dialog", dialog],
    ["searchBar", searchBar],
    ["select", select],
    ["navigationBar", navigationBar],
    ["navigationRail", navigationRail],
    ["snackbar", snackbar],
    ["tooltip", tooltip],
    ["slider", slider],
    ["linearProgress", linearProgress],
    ["circularProgress", circularProgress],
] as const)("%s", (name, spec) => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(spec)).not.toThrow();
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(
            compilePreset(configWith(spec)).theme?.slotRecipes?.[name],
        ).toMatchSnapshot();
    });
});

describe("rows", () => {
    const recipe = (name: string, spec: SlottedComponentSpec) =>
        JSON.stringify(
            compilePreset(configWith(spec)).theme?.slotRecipes?.[name],
        );

    it("color a menu item's parts from the item, a list item's from the root", () => {
        expect(recipe("menu", menu)).toContain(".menu__item:is(");
        expect(recipe("listItem", listItem)).toContain(".listItem__root:is(");
    });
});

describe("tabs", () => {
    it("shows the indicator only on the selected tab", () => {
        const css = compilePreset(configWith(tabs)).theme?.slotRecipes?.tabs;
        expect(JSON.stringify(css?.base?.indicator)).toContain(
            '.tabs__tab:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false])) &":"1"',
        );
    });
});

describe("searchBar", () => {
    it("colors the placeholder through a raw rule", () => {
        const css = compilePreset(configWith(searchBar)).theme?.slotRecipes
            ?.searchBar;
        expect(css?.base?.input?.["&::placeholder"]).toEqual({
            color: "var(--components-searchBar-placeholderColor, token(colors.onSurfaceVariant))",
        });
    });
});

describe("navigation", () => {
    const base = () =>
        compilePreset(configWith(navigationBar)).theme?.slotRecipes
            ?.navigationBar?.base;

    it("grows the active indicator from the center of the current destination's pill", () => {
        const active = JSON.stringify(base()?.activeIndicator);
        expect(active).toContain(".navigationBar__item:is(");
        expect(active).toContain("aria-current");
        expect(active).toContain("secondaryContainer");
        expect(active).toContain('"insetInlineStart":{"base":"50%"');
    });

    it("keeps the pill's own state layer for destinations that aren't current", () => {
        expect(JSON.stringify(base()?.indicator?.backgroundColor)).toContain(
            "transparent",
        );
    });
});

describe("progress", () => {
    it("turns each half of the circular arc through its share of the value", () => {
        const base = compilePreset(configWith(circularProgress)).theme
            ?.slotRecipes?.circularProgress?.base;
        expect(base?.endArc?.transform).toBe(
            "rotate(calc(-135deg + calc(min(var(--components-circularProgress-value, 0), 50) * 3.6deg)))",
        );
        expect(base?.startArc?.transform).toBe(
            "rotate(calc(45deg + calc(max(calc(var(--components-circularProgress-value, 0) - 50), 0) * 3.6deg)))",
        );
    });

    it("adds its keyframes to the pureform config", () => {
        expect(Object.keys(pureform().keyframes ?? {})).toEqual(
            expect.arrayContaining([
                "linearProgressSlide",
                "linearProgressSlideRtl",
                "circularProgressSpin",
            ]),
        );
    });
});

describe("select", () => {
    it("turns the arrow over while the field is expanded", () => {
        const css = compilePreset(configWith(select)).theme?.slotRecipes
            ?.select;
        expect(css?.base?.trailingIcon?.transform).toEqual({
            base: "translateY(-50%)",
            ".select__container:is([aria-expanded=true], :has([aria-expanded=true])) &":
                "translateY(-50%) rotate(180deg)",
        });
        expect(
            (css?.defaultVariants as Record<string, unknown> | undefined)
                ?.trailingIcon,
        ).toBe(true);
    });
});
