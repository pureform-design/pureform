import { describe, expect, it } from "vitest";

import { tokenVar } from "./theme-vars";

describe("tokenVar", () => {
    it("names a token's var by its group and name", () => {
        expect(tokenVar("colors.primary")).toBe("--colors-primary");
        expect(tokenVar("colors.onPrimaryContainer")).toBe(
            "--colors-on-primary-container",
        );
        expect(tokenVar("fontSize.bodyLarge")).toBe("--font-sizes-body-large");
        expect(tokenVar("durations.medium2")).toBe("--durations-medium2");
    });

    it("applies the token prefix", () => {
        expect(tokenVar("radii.full", { tokenPrefix: "pf" })).toBe(
            "--pf-radii-full",
        );
    });

    it("names a component token's var with the component prefix", () => {
        expect(tokenVar("components.button.container")).toBe(
            "--components-button-container",
        );
        expect(tokenVar("components.button.container", { prefix: "pf" })).toBe(
            "--pf-components-button-container",
        );
    });

    it("passes vars through and drops what names nothing", () => {
        expect(tokenVar("--brand")).toBe("--brand");
        expect(tokenVar("primary")).toBeUndefined();
    });
});
