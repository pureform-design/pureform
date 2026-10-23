import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { FAB_MENU_STAGGER, FAB_MENU_STAGGERED, fabMenu } from "./fab-menu";

const list = () =>
    compilePreset(configWith(fabMenu)).theme?.slotRecipes?.fabMenu?.base
        ?.list as Record<string, { animation: { base: string } }>;

const OPEN = "&[data-state=open] > :nth-last-child";
const CLOSED = "&[data-state=closed] > :nth-child";
const WAIT = "calc(25ms * ";

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
            `${WAIT}calc(min(var(--components-fabMenu-itemCount, ${FAB_MENU_STAGGERED}), ${FAB_MENU_STAGGERED}) - 1))`,
        );
        expect(closed).toContain("overlayHold");
        // Presence waits for an exit that differs from the open state's animation.
        expect(rules["&[data-state=open]"]).toBeUndefined();
    });

    it("drops the stagger under reduced motion", () => {
        for (const [key, rule] of Object.entries(list())) {
            if (!key.startsWith("&")) continue;
            const reduced = (
                rule.animation as unknown as Record<string, string>
            )._motionReduce;
            if (reduced) expect(reduced).not.toContain("calc(");
        }
    });
});
