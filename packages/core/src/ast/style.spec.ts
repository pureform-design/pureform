import { describe, expect, it } from "vitest";

import * as kw from "./helpers/keyword";
import { px } from "./index";
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
});
