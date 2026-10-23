import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { fileUpload } from "./file-upload";

const compiled = () =>
    compilePreset(configWith(fileUpload)).theme?.slotRecipes?.fileUpload;

describe("file upload", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(fileUpload)).not.toThrow();
    });

    it("has the parts the machine and the list rows need", () => {
        expect(fileUpload.slots).toEqual([
            "root",
            "label",
            "dropzone",
            "icon",
            "headline",
            "supportingText",
            "itemGroup",
            "item",
            "error",
        ]);
    });

    it("draws the dropzone with a dashed outline, solid while files are dragged over it", () => {
        const dropzone = compiled()?.base?.dropzone as Record<string, unknown>;
        expect(JSON.stringify(dropzone)).toContain("dashed");
        expect(JSON.stringify(dropzone)).toContain("data-pf-dragging");
        expect(JSON.stringify(dropzone)).toContain("solid");
    });

    it("takes the drag-over colors from its color group", () => {
        const dropzone = JSON.stringify(compiled()?.base?.dropzone);
        expect(dropzone).toContain("components-fileUpload-accentContainer");
    });

    it("draws the invalid outline in the error color, with no compound variants", () => {
        const invalid = JSON.stringify(compiled()?.variants?.invalid?.true);
        expect(invalid).toContain("components-fileUpload-errorColor");
        expect(fileUpload.recipe.compoundVariants ?? []).toHaveLength(0);
    });

    it("indicates the dropzone as one surface", () => {
        expect(fileUpload.indication).toEqual([
            {
                trigger: "dropzone",
                surface: "dropzone",
                centered: false,
                focus: "dropzone",
            },
        ]);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
