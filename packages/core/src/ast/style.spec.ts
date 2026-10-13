import { describe, expect, it } from "vitest";

import * as kw from "./helpers/keyword";
import { pct, px, unitless } from "./index";
import type { StyleMap } from "./style";

// These assertions are enforced at type-check time. Each `@ts-expect-error` line must fail to
// compile; if the type ever widens enough to accept the bad value, tsc flags the now-unused
// directive and the build breaks, which is the signal we want.
describe("StyleMap typing", () => {
    it("accepts in-vocabulary keywords for each slot", () => {
        const ok: StyleMap = {
            display: kw.flex,
            alignItems: kw.center,
            justifyContent: kw.spaceBetween,
            borderStyle: kw.solid,
        };
        expect(ok.display).toEqual(kw.flex);
    });

    it("rejects an off-vocabulary keyword", () => {
        const bad: StyleMap = {
            // @ts-expect-error "center" is not a DisplayKeyword
            display: kw.center,
        };
        expect(bad).toBeDefined();
    });

    it("rejects a dimension where a color is expected", () => {
        const bad: StyleMap = {
            // @ts-expect-error a numeric dimension is not a Color
            color: px(4),
        };
        expect(bad).toBeDefined();
    });

    it("accepts the layout, outline, and pointer properties", () => {
        const ok: StyleMap = {
            position: kw.absolute,
            top: px(0),
            left: px(0),
            insetBlockStart: px(0),
            flexDirection: kw.row,
            overflow: kw.hidden,
            aspectRatio: unitless(1),
            minWidth: px(48),
            maxHeight: pct(100),
            outlineWidth: px(1),
            outlineStyle: kw.solid,
            outlineColor: kw.transparent,
            outlineOffset: px(2),
            pointerEvents: kw.none,
        };
        expect(ok.pointerEvents).toEqual(kw.none);
    });

    it("rejects off-vocabulary keywords on the new properties", () => {
        const bad: StyleMap = {
            // @ts-expect-error "pointer" is a cursor, not a PointerEventsKeyword
            pointerEvents: kw.pointer,
            // @ts-expect-error "center" is not an OverflowKeyword
            overflow: kw.center,
            // @ts-expect-error "absolute" is not a FlexDirectionKeyword
            flexDirection: kw.absolute,
        };
        expect(bad).toBeDefined();
    });
});
