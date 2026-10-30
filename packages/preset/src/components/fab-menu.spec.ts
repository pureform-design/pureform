import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import {
    FAB_MENU_KEYFRAMES,
    FAB_MENU_STAGGER,
    FAB_MENU_STAGGERED,
    fabMenu,
} from "./fab-menu";

const list = () =>
    compilePreset(configWith(fabMenu)).theme?.slotRecipes?.fabMenu?.base
        ?.list as Record<string, { animation: { base: string } }>;

const OPEN = "&[data-state=open] > :nth-last-child";
const CLOSED = "&[data-state=closed] > :nth-child";
const WAIT = "calc(25ms * var(--components-fabMenu-staggering, 0) * ";

describe("fab menu items", () => {
    it("staggers 25ms a step, Compose's spring-driven stagger evenly spaced", () => {
        expect(FAB_MENU_STAGGER).toMatchObject({
            type: "numeric",
            value: 25,
            unit: "ms",
        });
    });

    it("shows a waiting item's first frame through its wait, so it isn't drawn before it enters", () => {
        const rules = list();
        expect(rules[`${OPEN}(2)`]!.animation.base).toContain("backwards");
        expect(rules[`${CLOSED}(2)`]!.animation.base).toContain("both");
    });

    it("grows the item nearest the FAB first, and each one after it a step later", () => {
        const rules = list();
        expect(rules[`${OPEN}(1)`]!.animation.base).not.toContain("calc(");
        for (let n = 1; n < FAB_MENU_STAGGERED - 1; n++) {
            expect(rules[`${OPEN}(${n + 1})`]!.animation.base).toContain(
                `${WAIT}${n})`,
            );
        }
    });

    it("shrinks them in reverse: the farthest item leaves first", () => {
        const rules = list();
        expect(rules[`${CLOSED}(1)`]!.animation.base).not.toContain("calc(");
        for (let n = 1; n < FAB_MENU_STAGGERED - 1; n++) {
            expect(rules[`${CLOSED}(${n + 1})`]!.animation.base).toContain(
                `${WAIT}${n})`,
            );
        }
    });

    it("gives the items past the staggered ones the last wait", () => {
        const rules = list();
        const last = `n+${FAB_MENU_STAGGERED}`;
        expect(rules[`${OPEN}(${last})`]!.animation.base).toContain(
            `${WAIT}${FAB_MENU_STAGGERED - 1})`,
        );
        expect(rules[`${CLOSED}(${last})`]!.animation.base).toContain(
            `${WAIT}${FAB_MENU_STAGGERED - 1})`,
        );
    });

    it("holds the list until its last item has left, by the count the bindings set, and moves none of it", () => {
        const rules = list();
        const closed = rules["&[data-state=closed]"]!.animation.base;
        expect(closed).toContain(
            `${WAIT}max(calc(min(var(--components-fabMenu-itemCount, ${FAB_MENU_STAGGERED}), ${FAB_MENU_STAGGERED}) - 1), 0))`,
        );
        expect(closed).toContain("overlayHold");
        // Presence waits for an exit that differs from the open state's animation.
        expect(rules["&[data-state=open]"]).toBeUndefined();
    });

    it("staggers nothing until the count is known, so a composed menu's first frame is still", () => {
        const rules = list();
        // The token's default is 0; the bindings set 1 once they know how many items there are.
        expect(rules[`${OPEN}(2)`]!.animation.base).toContain(
            "--components-fabMenu-staggering, 0)",
        );
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
        expect(
            reduced.filter((animation) => animation.includes("calc(")),
        ).toEqual([]);
    });
});

describe("fab menu item reveal", () => {
    const rules = () =>
        list() as Record<string, { animation: Record<string, string> }>;

    it("reveals each item from the menu's aligned edge instead of scaling it from its center", () => {
        const rule = rules()[`${OPEN}(1)`]!.animation.base!;
        expect(rule).toContain("fabMenuItemRevealIn");
        expect(rule).not.toContain("overlayGrowIn");
        const closed = rules()[`${CLOSED}(1)`]!.animation.base!;
        expect(closed).toContain("fabMenuItemRevealOut");
        expect(closed).not.toContain("overlayShrinkOut");
    });

    it("fades the item alongside the reveal, on its own spring", () => {
        const rule = rules()[`${OPEN}(1)`]!.animation.base!;
        expect(rule).toContain("overlayFadeIn");
        expect(rules()[`${CLOSED}(1)`]!.animation.base).toContain(
            "overlayFadeOut",
        );
    });

    it("mirrors the reveal under right to left", () => {
        const rtl = rules()[`${OPEN}(1)`]!.animation as Record<string, unknown>;
        expect(JSON.stringify(rtl)).toContain("fabMenuItemRevealInRtl");
        expect(JSON.stringify(rules()[`${CLOSED}(1)`]!.animation)).toContain(
            "fabMenuItemRevealOutRtl",
        );
    });

    it("clips to the item's own rounded shape, from the end edge, at full height", () => {
        const frames = FAB_MENU_KEYFRAMES;
        const text = (name: string, step: "from" | "to") =>
            JSON.stringify(frames[name]![step]);
        // Hidden: all of the width clipped from the start side, the end edge fixed.
        expect(text("fabMenuItemRevealIn", "from")).toContain(
            "inset(0 0 0 100% round var(--components-fabMenu-itemRadius))",
        );
        expect(text("fabMenuItemRevealIn", "to")).toContain(
            "inset(0 0 0 0 round var(--components-fabMenu-itemRadius))",
        );
        // Right to left: the aligned edge is the left one.
        expect(text("fabMenuItemRevealInRtl", "from")).toContain(
            "inset(0 100% 0 0 round var(--components-fabMenu-itemRadius))",
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
