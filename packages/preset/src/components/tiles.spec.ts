import { px } from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import { positionCorners, runCorners } from "./tiles";

describe("tiles", () => {
    const outer = px(16);
    const inner = px(4);

    it("puts a block run's start corners on top, and an inline run's at the start", () => {
        expect(runCorners(outer, inner)).toEqual({
            borderStartStartRadius: outer,
            borderStartEndRadius: outer,
            borderEndStartRadius: inner,
            borderEndEndRadius: inner,
        });
        expect(runCorners(outer, inner, "inline")).toEqual({
            borderStartStartRadius: outer,
            borderEndStartRadius: outer,
            borderStartEndRadius: inner,
            borderEndEndRadius: inner,
        });
    });

    it("rounds a run's outside and squares where tiles meet, along either axis", () => {
        for (const axis of ["block", "inline"] as const) {
            const corners = positionCorners(outer, inner, axis);
            expect(corners.none).toEqual({});
            expect(corners.first).toEqual(runCorners(outer, inner, axis));
            expect(corners.middle).toEqual(runCorners(inner, inner, axis));
            expect(corners.last).toEqual(runCorners(inner, outer, axis));
            expect(corners.single).toEqual(runCorners(outer, outer, axis));
        }
    });
});
