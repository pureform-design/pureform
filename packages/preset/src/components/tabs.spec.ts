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
});
