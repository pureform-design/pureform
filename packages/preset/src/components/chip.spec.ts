import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { chip } from "./chip";

const compiled = () => compilePreset(configWith(chip)).theme?.slotRecipes?.chip;

describe("chip", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(chip)).not.toThrow();
    });

    it("fills a selected chip with the secondary container in every variant", () => {
        for (const variant of ["outlined", "elevated"]) {
            const root = compiled()?.variants?.variant?.[variant]
                ?.root as Record<string, unknown>;
            expect(JSON.stringify(root?._selected)).toContain(
                "components-chip-selectedContainer",
            );
        }
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
