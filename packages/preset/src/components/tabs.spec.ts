import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { tabs } from "./tabs";

const recipe = () => compilePreset(configWith(tabs)).theme?.slotRecipes?.tabs;

describe("tabs", () => {
    it("times the indicator's slide with its own motion tokens, stopped under reduced motion", () => {
        expect(recipe()?.base?.indicator).toMatchObject({
            transition: {
                base: "transform var(--components-tabs-indicatorDuration, token(durations.medium1)) var(--components-tabs-indicatorEasing, token(easings.emphasized))",
                _motionReduce: "none",
            },
        });
    });

    it("draws the indicator over every tab, inside the tab list's own stacking context", () => {
        expect(recipe()?.base?.indicator).toMatchObject({ zIndex: "1" });
        expect(recipe()?.base?.root).toMatchObject({
            position: "relative",
            zIndex: "0",
        });
    });

    it("wraps each tab's icon, label, and indicator in its content", () => {
        expect(tabs.slots).toEqual([
            "root",
            "tab",
            "tabContent",
            "icon",
            "label",
            "indicator",
        ]);
        expect(tabs.structure).toEqual({
            root: ["tab"],
            tab: ["tabContent"],
            tabContent: ["icon", "label", "indicator"],
        });
    });

    it("sizes a primary indicator to the tab's content, at least 24px, and a secondary one to the tab", () => {
        const css = recipe();
        // The content fills the tab's height, centered and inset by the tab's padding; the
        // indicator spans it.
        expect(css?.base?.tab).toMatchObject({ alignItems: "stretch" });
        expect(css?.base?.tab).not.toHaveProperty("paddingInlineStart");
        expect(css?.base?.tabContent).toMatchObject({
            position: "relative",
            justifyContent: "center",
            minWidth: "var(--components-tabs-indicatorMinWidth, 24px)",
            marginInlineStart:
                "var(--components-tabs-paddingInline, token(spacing.4))",
            marginInlineEnd:
                "var(--components-tabs-paddingInline, token(spacing.4))",
        });
        expect(css?.base?.indicator).toMatchObject({
            position: "absolute",
            bottom: "0px",
            insetInlineStart: "0px",
            insetInlineEnd: "0px",
            height: "var(--components-tabs-indicatorHeight, 3px)",
            borderStartStartRadius:
                "var(--components-tabs-indicatorRadius, calc(token(radii.extraSmall) * 0.75))",
            borderStartEndRadius:
                "var(--components-tabs-indicatorRadius, calc(token(radii.extraSmall) * 0.75))",
        });
        // A secondary tab's content spans the tab, padded rather than inset.
        expect(css?.variants?.variant?.secondary?.tabContent).toEqual({
            flexGrow: "1",
            marginInlineStart: "0px",
            marginInlineEnd: "0px",
            paddingInlineStart:
                "var(--components-tabs-paddingInline, token(spacing.4))",
            paddingInlineEnd:
                "var(--components-tabs-paddingInline, token(spacing.4))",
        });
    });

    it("stacks a primary tab's icon over its label unless the icon is inline", () => {
        expect(recipe()?.compoundVariants).toEqual([
            {
                variant: "primary",
                icon: true,
                inlineIcon: false,
                css: {
                    tab: {
                        height: "var(--components-tabs-heightWithIcon, 64px)",
                    },
                    tabContent: { flexDirection: "column", gap: "2px" },
                },
            },
        ]);
        expect(recipe()?.defaultVariants).toMatchObject({ inlineIcon: false });
    });
});
