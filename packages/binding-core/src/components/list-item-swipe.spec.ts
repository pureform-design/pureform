import { describe, expect, it } from "vitest";

import {
    swipeKeyAction,
    swipeOffsetOf,
    swipeRestOffset,
    swipeSettlesOpen,
    swipeTokens,
} from "./list-item-swipe";

describe("a swipeable list item", () => {
    it("slides toward the inline start, between closed and the action's width", () => {
        expect(swipeOffsetOf(0, 200, 150, 80, false)).toBe(50);
        expect(swipeOffsetOf(0, 200, 50, 80, false)).toBe(80);
        expect(swipeOffsetOf(0, 200, 260, 80, false)).toBe(0);
        // Mirrored: a drag to the right opens it.
        expect(swipeOffsetOf(0, 200, 250, 80, true)).toBe(50);
        expect(swipeOffsetOf(0, 200, 150, 80, true)).toBe(0);
        // From open, a drag back closes it.
        expect(swipeOffsetOf(80, 100, 130, 80, false)).toBe(50);
    });

    it("settles open past half the action", () => {
        expect(swipeSettlesOpen(39, 80)).toBe(false);
        expect(swipeSettlesOpen(40, 80)).toBe(true);
        expect(swipeRestOffset(true, 80)).toBe(80);
        expect(swipeRestOffset(false, 80)).toBe(0);
    });

    it("takes the arrow toward the inline start to reveal, and away or Escape to close", () => {
        expect(swipeKeyAction("ArrowLeft", false)).toBe("reveal");
        expect(swipeKeyAction("ArrowRight", false)).toBe("close");
        expect(swipeKeyAction("ArrowRight", true)).toBe("reveal");
        expect(swipeKeyAction("ArrowLeft", true)).toBe("close");
        expect(swipeKeyAction("Escape", false)).toBe("close");
        expect(swipeKeyAction("Enter", false)).toBeUndefined();
    });

    it("sets the preset's tokens", () => {
        expect(swipeTokens(30, 80)).toEqual({
            swipeOffset: 30,
            swipeWidth: 80,
        });
    });
});
