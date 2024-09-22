import { describe, expect, it } from "vitest";
import { ShadowElevations } from "./shadow-elevations";
import type { BaseElevation } from "./types";

describe("ShadowElevations", () => {
    it("should be able to create a shadow elevation instance", () => {
        const se = ShadowElevations.create();

        expect(se).toBeInstanceOf(ShadowElevations);
    });

    it("should be able to get a shadow elevation with a level of 0", () => {
        const se = ShadowElevations.create();

        const shadow = se.get("level0");

        expect(shadow).toEqual({
            umbra: {
                offsetX: "0px",
                offsetY: "0px",
                blurRadius: "0px",
                spreadRadius: "0px",
            },
            penumbra: {
                offsetX: "0px",
                offsetY: "0px",
                blurRadius: "0px",
                spreadRadius: "0px",
            },
            ambient: {
                offsetX: "0px",
                offsetY: "0px",
                blurRadius: "0px",
                spreadRadius: "0px",
            },
        });
    });

    it("should be able to get a shadow elevation with a level of 1 to 5", () => {
        const se = ShadowElevations.create();

        for (let i = 1; i <= 5; i++) {
            const shadow = se.get(`level${i}` as BaseElevation);

            expect(shadow).toBeTypeOf("object");
        }
    });

    it.for(new Array(24).fill(0).map((_, i) => i + 1))(
        "should match the snapshot shadow elevation for %i",
        (i) => {
            const se = ShadowElevations.create();

            const shadow = se.getAtPixel(i);
            expect(shadow).toMatchSnapshot();
        },
    );

    it("should be able to get a shadow elevation using custom elevation", () => {
        const se = ShadowElevations.create({
            elevations: {
                level10: 10,
                level20: 20,
            },
        });

        const shadow = se.get("level10");
        const shadow2 = se.get("level20");

        expect(shadow).toBeTypeOf("object");
        expect(shadow2).toBeTypeOf("object");
    });

    it("should throw when trying to get a shadow elevation with an invalid elevation", () => {
        const se = ShadowElevations.create();

        expect(() => se.get("invalid" as BaseElevation)).toThrow();
    });

    it("should throw when trying to get a shadow elevation with an negative pixel", () => {
        const se = ShadowElevations.create();

        expect(() => se.getAtPixel(-1)).toThrow();
    });
});
