import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { MATERIAL_SHAPES } from "../shapes";
import { createMedia, media } from "./media";

// One shape keeps the snapshot readable.
const oneShape = createMedia({ circle: MATERIAL_SHAPES.circle });
const compiled = () =>
    compilePreset(configWith(oneShape)).theme?.recipes?.media;

describe("media", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(media)).not.toThrow();
    });

    it("fills its container's width, cropping to fill", () => {
        expect(compiled()?.base).toMatchObject({
            width: "100%",
            objectFit: "cover",
        });
    });

    it("sets the aspect ratio, leaving auto to the content", () => {
        expect(compiled()?.variants?.aspect?.landscape).toEqual({
            aspectRatio: String(16 / 9),
        });
        expect(compiled()?.variants?.aspect?.auto).toEqual({});
    });

    it("takes the clip itself, keeping its corners where shapes aren't supported", () => {
        const circle = compiled()?.variants?.shape?.circle as Record<
            string,
            unknown
        >;
        expect(circle.clipPath).toMatch(/^shape\(from /);
        expect(circle.borderRadius).toMatchObject({
            base: "var(--components-media-radius, token(radii.medium))",
        });
    });

    it("compiles to a stable Panda recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
