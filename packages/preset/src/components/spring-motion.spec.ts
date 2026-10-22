import type { SlottedComponentSpec } from "@pureform/core/types";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { accordion } from "./accordion";
import { listItem } from "./list-item";
import { select } from "./select";
import { textField } from "./text-field";
import { tree } from "./tree";

const SPRING =
    "token(springs.spatialFast.duration) token(springs.spatialFast.easing)";
const TWEEN = "token(durations.short3) token(easings.standard)";

const recipe = (name: string, spec: SlottedComponentSpec) =>
    JSON.stringify(compilePreset(configWith(spec)).theme?.slotRecipes?.[name]);

describe("spring motion", () => {
    it.each([
        ["accordion", accordion],
        ["tree", tree],
        ["listItem", listItem],
        ["select", select],
    ] as const)(
        "turns %s's chevron on the fast spatial spring",
        (name, spec) => {
            const out = recipe(name, spec as SlottedComponentSpec);
            expect(out).toContain(`transform ${SPRING}, color ${TWEEN}`);
            // Reduced motion keeps the color's fade and drops the turn.
            expect(out).toContain(`"_motionReduce":"color ${TWEEN}"`);
        },
    );

    it("floats the field label on the fast spatial spring and fades its colors", () => {
        const out = recipe("textField", textField as SlottedComponentSpec);
        expect(out).toContain(`top ${SPRING}`);
        expect(out).toContain(`font-size ${SPRING}`);
        expect(out).not.toContain("springs.effectsDefault");
        expect(out).toContain(`background-color ${TWEEN}, color ${TWEEN}`);
    });

    it("settles a released swipe on the spring, and follows the drag at once", () => {
        const out = recipe("listItem", listItem as SlottedComponentSpec);
        expect(out).toContain(`--components-listItem-swipeOffset ${SPRING}`);
        expect(out).not.toContain(`swipeOffset ${TWEEN}`);
    });
});
