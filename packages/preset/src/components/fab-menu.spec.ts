import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { FAB_MENU_KEYFRAMES, fabMenu } from "./fab-menu";

const list = () =>
    compilePreset(configWith(fabMenu)).theme?.slotRecipes?.fabMenu?.base
        ?.list as Record<string, { animation: { base: string } }>;

const OPEN = "&[data-state=open] > *";
const CLOSED = "&[data-state=closed] > *";
const DELAY = "var(--components-fabMenu-staggerDelay, 0ms)";

describe("fab menu items", () => {
    it("waits each item's own delay, which the bindings sample from the theme's spring", () => {
        const rules = list();
        for (const key of [OPEN, CLOSED]) {
            const base = rules[key]!.animation.base;
            // Both the reveal and its fade wait it, so they stay together.
            expect(base.split(DELAY)).toHaveLength(3);
        }
    });

    it("has one rule for every item rather than one for each position, so no count caps the stagger", () => {
        const positional = Object.keys(list()).filter((key) =>
            key.includes("nth-"),
        );
        expect(positional).toEqual([]);
        expect(Object.keys(list())).toEqual(
            expect.arrayContaining([OPEN, CLOSED]),
        );
    });

    it("shows a waiting item's first frame through its wait, so it isn't drawn before it enters", () => {
        const rules = list();
        expect(rules[OPEN]!.animation.base).toContain("backwards");
        expect(rules[CLOSED]!.animation.base).toContain("both");
    });

    it("holds the list until its last item has left, by the longest wait the bindings write, and moves none of it", () => {
        const rules = list();
        const closed = rules["&[data-state=closed]"]!.animation.base;
        expect(closed).toContain("var(--components-fabMenu-staggerTotal, 0ms)");
        expect(closed).toContain("overlayHold");
        // Presence waits for an exit that differs from the open state's animation.
        expect(rules["&[data-state=open]"]).toBeUndefined();
    });

    it("staggers nothing until the bindings know the spring, so a first render is still", () => {
        const tokens = JSON.stringify(
            compilePreset(configWith(fabMenu)).theme?.slotRecipes?.fabMenu,
        );
        expect(tokens).toContain("--components-fabMenu-staggerDelay, 0ms");
        expect(tokens).not.toContain("staggering");
        expect(tokens).not.toContain("itemCount");
    });

    it("drops the stagger under reduced motion", () => {
        const reduced = Object.entries(list())
            .filter(([key]) => key.startsWith("&"))
            .map(
                ([, rule]) =>
                    (rule.animation as unknown as Record<string, string>)
                        ._motionReduce,
            )
            .filter((animation): animation is string => Boolean(animation));
        expect(reduced.length).toBeGreaterThan(0);
        expect(
            reduced.filter((animation) => animation.includes("staggerDelay")),
        ).toEqual([]);
    });
});

describe("fab menu item reveal", () => {
    const rules = () =>
        list() as Record<string, { animation: Record<string, string> }>;

    it("reveals each item from the menu's aligned edge instead of scaling it from its center", () => {
        const rule = rules()[OPEN]!.animation.base!;
        expect(rule).toContain("fabMenuItemRevealIn");
        expect(rule).not.toContain("overlayGrowIn");
        const closed = rules()[CLOSED]!.animation.base!;
        expect(closed).toContain("fabMenuItemRevealOut");
        expect(closed).not.toContain("overlayShrinkOut");
    });

    it("fades the item alongside the reveal, on its own spring", () => {
        const rule = rules()[OPEN]!.animation.base!;
        expect(rule).toContain("overlayFadeIn");
        expect(rules()[CLOSED]!.animation.base).toContain("overlayFadeOut");
    });

    it("mirrors the reveal under right to left", () => {
        const rtl = rules()[OPEN]!.animation as Record<string, unknown>;
        expect(JSON.stringify(rtl)).toContain("fabMenuItemRevealInRtl");
        expect(JSON.stringify(rules()[CLOSED]!.animation)).toContain(
            "fabMenuItemRevealOutRtl",
        );
    });

    it("clips to the item's own rounded shape, from the end edge, at full height", () => {
        const frames = FAB_MENU_KEYFRAMES;
        const text = (name: string, step: "from" | "to") =>
            JSON.stringify(frames[name]![step]);
        // Hidden: all of the width clipped from the start side, the end edge fixed.
        expect(text("fabMenuItemRevealIn", "from")).toContain(
            "inset(0 0 0 100% round 9999px)",
        );
        expect(text("fabMenuItemRevealIn", "to")).toContain(
            "inset(0 0 0 0 round 9999px)",
        );
        // Right to left: the aligned edge is the left one.
        expect(text("fabMenuItemRevealInRtl", "from")).toContain(
            "inset(0 100% 0 0 round 9999px)",
        );
        // Leaving runs the same frames back.
        expect(text("fabMenuItemRevealOut", "to")).toBe(
            text("fabMenuItemRevealIn", "from"),
        );
        expect(text("fabMenuItemRevealOut", "from")).toBe(
            text("fabMenuItemRevealIn", "to"),
        );
    });

    it("keeps the reveal off the item's height: only the clip changes", () => {
        for (const name of Object.keys(FAB_MENU_KEYFRAMES)) {
            for (const step of ["from", "to"] as const) {
                expect(Object.keys(FAB_MENU_KEYFRAMES[name]![step]!)).toEqual([
                    "clipPath",
                ]);
            }
        }
    });
});
