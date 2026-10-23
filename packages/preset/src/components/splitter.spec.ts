import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { splitter } from "./splitter";

const json = (value: unknown) => JSON.stringify(value);

describe("splitter", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(splitter)).not.toThrow();
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(
            compilePreset(configWith(splitter)).theme?.slotRecipes?.splitter,
        ).toMatchSnapshot();
    });

    it("adds no compound variants", () => {
        expect(splitter.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("has Zag's parts, the pill inside the divider", () => {
        expect(splitter.slots).toEqual([
            "root",
            "panel",
            "resizeTrigger",
            "resizeTriggerIndicator",
        ]);
        expect(splitter.structure).toEqual({
            root: ["panel", "resizeTrigger"],
            resizeTrigger: ["resizeTriggerIndicator"],
        });
    });

    it("draws Compose's drag handle: a 4×48 outline pill, 12×52 onSurface while pressed", () => {
        const tokens = json(splitter.tokens);
        expect(tokens).toContain('"outline"');
        expect(tokens).toContain('"onSurface"');
        const indicator = json(
            splitter.recipe.variants!.orientation!.horizontal!
                .resizeTriggerIndicator,
        );
        expect(indicator).toContain("handleThickness");
        expect(indicator).toContain("handleActiveThickness");
        expect(indicator).toContain('"pressed"');
    });

    it("lets a pane's content scroll natively", () => {
        expect(json(splitter.recipe.base!.panel)).toContain('"auto"');
    });
});
