import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { nativeSelect } from "./native-select";

const compiled = () =>
    compilePreset(configWith(nativeSelect)).theme?.slotRecipes?.nativeSelect;

describe("nativeSelect", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(nativeSelect)).not.toThrow();
    });

    it("is a select in a root with a chevron, and the list's group and option", () => {
        expect(nativeSelect.slots).toEqual([
            "root",
            "select",
            "icon",
            "group",
            "option",
        ]);
    });

    it("draws the platform's arrow off, and a chevron that takes no pointer", () => {
        const base = compiled()?.base;
        expect(base?.select?.appearance).toBe("none");
        expect(base?.icon?.pointerEvents).toBe("none");
    });

    it("has one look: no variants and no compound variants", () => {
        expect(Object.keys(compiled()?.variants ?? {})).toEqual([]);
        expect(nativeSelect.recipe.compoundVariants ?? []).toHaveLength(0);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
