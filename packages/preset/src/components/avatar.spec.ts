import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { MATERIAL_SHAPES } from "../shapes";
import { avatar, createAvatar } from "./avatar";

// One shape keeps the snapshot readable.
const oneShape = createAvatar(undefined, { circle: MATERIAL_SHAPES.circle });
const compiled = () =>
    compilePreset(configWith(oneShape)).theme?.recipes?.avatar;

describe("avatar", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(avatar)).not.toThrow();
    });

    it("crops a picture to fill it", () => {
        expect(compiled()?.base).toMatchObject({ objectFit: "cover" });
    });

    it("takes the clip itself, keeping its corners where shapes aren't supported", () => {
        const circle = compiled()?.variants?.shape?.circle as Record<
            string,
            unknown
        >;
        expect(circle.clipPath).toMatch(/^shape\(from /);
        expect(circle.borderRadius).toMatchObject({
            base: "var(--components-avatar-radius, token(radii.full))",
        });
    });

    it("draws a color group's container", () => {
        expect(avatar.recipe.variants?.color?.success).toMatchObject({
            backgroundColor: {
                path: ["semanticTokens", "colors", "successContainer"],
            },
        });
        expect(avatar.recipe.variants?.color?.primary).toEqual({});
    });

    it("compiles to a stable Panda recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
