import { px } from "@pureform/core/ast";
import type { SlottedComponentSpec } from "@pureform/core/types";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { chipSet } from "./chip";
import { dialog } from "./dialog";
import { fullscreenDialog } from "./fullscreen-dialog";
import { list } from "./list";
import { listItem } from "./list-item";
import { loadingIndicator } from "./loading-indicator";
import { menu } from "./menu";
import { navigationBar } from "./navigation-bar";
import { navigationRail } from "./navigation-rail";
import { popover } from "./popover";
import { circularProgress, linearProgress } from "./progress";
import { richTooltip } from "./rich-tooltip";
import { searchBar } from "./search-bar";
import { select } from "./select";
import { slider } from "./slider";
import { snackbar } from "./snackbar";
import { tabs } from "./tabs";
import { positionCorners, POSITIONS } from "./tiles";
import { toast } from "./toast";
import { tooltip } from "./tooltip";

describe.each([
    ["list", list],
    ["listItem", listItem],
    ["menu", menu],
    ["tabs", tabs],
    ["chipSet", chipSet],
    ["dialog", dialog],
    ["fullscreenDialog", fullscreenDialog],
    ["searchBar", searchBar],
    ["select", select],
    ["navigationBar", navigationBar],
    ["navigationRail", navigationRail],
    ["snackbar", snackbar],
    ["toast", toast],
    ["tooltip", tooltip],
    ["richTooltip", richTooltip],
    ["popover", popover],
    ["slider", slider],
    ["linearProgress", linearProgress],
    ["circularProgress", circularProgress],
    ["loadingIndicator", loadingIndicator],
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

    it("round a segmented list's tiles by position, with no compound", () => {
        const corners = positionCorners(px(16), px(4));
        expect(corners.none).toEqual({});
        expect(corners.first.borderStartStartRadius).toEqual(px(16));
        expect(corners.first.borderEndEndRadius).toEqual(px(4));
        expect(corners.last.borderEndStartRadius).toEqual(px(16));
        expect(corners.middle.borderStartEndRadius).toEqual(px(4));
        expect(Object.keys(listItem.recipe.variants?.position ?? {})).toEqual([
            ...POSITIONS,
        ]);
        expect(listItem.recipe.compoundVariants ?? []).toEqual([]);
        expect(Object.keys(list.recipe.variants?.variant ?? {})).toEqual([
            "standard",
            "segmented",
        ]);
    });

    it("size a list item's leading part by its type", () => {
        expect(
            Object.keys(listItem.recipe.variants?.leadingType ?? {}),
        ).toEqual(["icon", "avatar", "thumbnail", "video"]);
        const video = recipe("listItem", listItem);
        expect(video).toContain("videoWidth");
        expect(video).toContain("avatarSize");
    });

    it("give the menu groups, supporting text, toggleable items, and vibrant colors", () => {
        expect(menu.slots).toEqual(
            expect.arrayContaining([
                "itemGroup",
                "itemGroupLabel",
                "itemContent",
                "itemSupportingText",
            ]),
        );
        const css = recipe("menu", menu);
        // A toggleable item, `aria-checked`, fills like a selected one.
        expect(css).toContain("aria-checked=true");
        expect(css).toContain("tertiaryContainer");
        expect(menu.recipe.compoundVariants ?? []).toEqual([]);
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
    it("runs indeterminate at Compose's pace: a 1750ms linear cycle and a 1500ms turn", () => {
        const recipes = compilePreset(
            configWith(linearProgress, circularProgress),
        ).theme?.slotRecipes;
        const slide = JSON.stringify(
            recipes?.linearProgress?.variants?.indeterminate?.true?.indicator
                ?.animation,
        );
        expect(slide).toContain(
            "--components-linearProgress-indeterminateDuration",
        );
        expect(slide).toContain("1750ms");
        const spin = JSON.stringify(
            recipes?.circularProgress?.variants?.indeterminate?.true?.root
                ?.animation,
        );
        expect(spin).toContain(
            "--components-circularProgress-rotationDuration",
        );
        expect(spin).toContain("1500ms");
        // A cycle is two turns.
        expect(spin).toContain("* 2");
    });

    it("grows and shrinks the indeterminate circular arc while it turns, as Compose's", () => {
        const recipes = compilePreset(configWith(circularProgress)).theme
            ?.slotRecipes;
        const indeterminate =
            recipes?.circularProgress?.variants?.indeterminate?.true;
        // The determinate arcs draw it, and the track turns with them, keeping its gaps.
        expect(indeterminate?.track).toBeUndefined();
        expect(indeterminate?.endHalf).toBeUndefined();
        expect(JSON.stringify(indeterminate?.root?.animation)).toContain(
            "circularProgressArc",
        );
        const frames = pureform().keyframes?.["circularProgressArc"];
        const value = (stop: string) =>
            JSON.stringify(frames?.[stop]?.tokens ?? {});
        expect(value("0%")).toContain('"value":10');
        expect(value("50%")).toContain('"value":87');
        expect(value("100%")).toContain('"value":10');
        // The tail catches up as the arc shrinks, two turns a cycle.
        expect(JSON.stringify(frames?.["50%"]?.transform)).toContain("221.4");
        expect(JSON.stringify(frames?.["100%"]?.transform)).toContain("720");
    });

    it("moves the indeterminate linear wave along the track, not with the bar", () => {
        const css = compilePreset(configWith(linearProgress)).theme?.slotRecipes
            ?.linearProgress;
        const compound = JSON.stringify(css?.compoundVariants);
        expect(compound).toContain('"shape":"wavy"');
        expect(compound).toContain("linearProgressWave");
        // The root clips to the travelling wave, which reads how far it has travelled.
        expect(compound).toContain("--components-linearProgress-waveDrift");
        const frames = pureform().keyframes?.["linearProgressWave"];
        expect(JSON.stringify(frames?.["to"]?.tokens)).toContain("40");
    });

    it("turns each half of the circular arc through its share of the value", () => {
        const base = compilePreset(configWith(circularProgress)).theme
            ?.slotRecipes?.circularProgress?.base;
        expect(
            (base?.endArc?.transform as { base: string } | undefined)?.base,
        ).toBe(
            "rotate(calc(-135deg + calc(min(var(--components-circularProgress-value, 0), 50) * 3.6deg)))",
        );
        expect(
            (base?.startArc?.transform as { base: string } | undefined)?.base,
        ).toBe(
            "rotate(calc(45deg + calc(max(calc(var(--components-circularProgress-value, 0) - 50), 0) * 3.6deg)))",
        );
    });

    it("draws the circular track as the rest of the circle, turned past the indicator and its gap", () => {
        const base = compilePreset(configWith(circularProgress)).theme
            ?.slotRecipes?.circularProgress?.base;
        expect(Object.keys(base ?? {})).toEqual(
            expect.arrayContaining([
                "track",
                "trackEndHalf",
                "trackEndArc",
                "trackStartHalf",
                "trackStartArc",
            ]),
        );
        expect(JSON.stringify(base?.track?.transform)).toContain(
            "var(--components-circularProgress-gap",
        );
        expect(JSON.stringify(base?.trackEndArc?.transform)).toContain(
            "var(--components-circularProgress-gap",
        );
        expect(base?.trackEndArc?.borderBlockStartColor).toContain(
            "trackColor",
        );
    });

    it("starts the linear track after the indicator and a gap, and while indeterminate draws it in two parts around the indicator, without the stop dot", () => {
        const css = compilePreset(configWith(linearProgress)).theme?.slotRecipes
            ?.linearProgress;
        expect(css?.base?.track?.insetInlineStart).toContain(
            "var(--components-linearProgress-gap",
        );
        expect(css?.base?.stopIndicator?.width).toContain("stopSize");
        const indeterminate = css?.variants?.indeterminate?.true;
        expect(indeterminate?.stopIndicator).toEqual({ display: "none" });
        expect(indeterminate?.track?.insetInlineStart).toBe("0px");
        expect(indeterminate?.track?.backgroundColor).toBe("transparent");
        expect(String(indeterminate?.trackBefore?.insetInlineStart)).toMatch(
            /^calc\(-100% - var\(--components-linearProgress-gap/,
        );
        expect(String(indeterminate?.trackAfter?.insetInlineStart)).toContain(
            "var(--components-linearProgress-indeterminateWidth",
        );
        expect(indeterminate?.trackAfter?.borderRadius).toBeDefined();
    });

    it("adds its keyframes to the pureform config", () => {
        expect(Object.keys(pureform().keyframes ?? {})).toEqual(
            expect.arrayContaining([
                "linearProgressSlide",
                "linearProgressSlideRtl",
                "linearProgressWave",
                "linearProgressWaveRtl",
                "linearProgressTrack",
                "linearProgressTrackRtl",
                "circularProgressArc",
                "circularProgressArcRtl",
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

describe("fullscreenDialog", () => {
    it("has a header over a body, and neither an icon nor an actions row", () => {
        expect(fullscreenDialog.slots).toEqual([
            "root",
            "header",
            "closeTrigger",
            "headline",
            "confirmAction",
            "body",
        ]);
        expect(dialog.slots).toEqual(
            expect.arrayContaining(["icon", "actions"]),
        );
        expect(fullscreenDialog.slots).not.toContain("icon");
        expect(fullscreenDialog.slots).not.toContain("actions");
        expect(fullscreenDialog.structure).toEqual({
            root: ["header", "body"],
            header: ["closeTrigger", "headline", "confirmAction"],
        });
    });

    it("fills its container with a square surface, and has no variants to count", () => {
        const base = fullscreenDialog.recipe.base!.root as Record<
            string,
            unknown
        >;
        expect(base).toHaveProperty("flexGrow");
        expect(base).not.toHaveProperty("borderRadius");
        expect(fullscreenDialog.recipe.variants ?? {}).toEqual({});
        expect(fullscreenDialog.recipe.compoundVariants ?? []).toEqual([]);
    });
});
