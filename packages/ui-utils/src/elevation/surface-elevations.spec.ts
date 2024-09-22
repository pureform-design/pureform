import { describe, expect, it } from "vitest";
import { ColorScheme, Hct } from "../color-scheme";
import {
    SurfaceElevations,
    type SurfaceElevationArgs,
} from "./surface-elevations";
import type { BaseElevation } from "./types";

describe("SurfaceElevations", () => {
    function createSurfaceElevations<
        TCustomElevation extends string = BaseElevation,
    >(args?: SurfaceElevationArgs<TCustomElevation>) {
        const colorScheme = ColorScheme.create({
            source: "#B040BF",
        });

        return SurfaceElevations.create<TCustomElevation>(colorScheme, args);
    }

    it("should be able to create a SurfaceElevations instance", () => {
        expect(createSurfaceElevations()).toBeInstanceOf(SurfaceElevations);
    });

    it.for([0, 1, 2, 3, 4, 5])(
        "should be able to get Hct surface elevation for default level%",
        (l) => {
            const se = createSurfaceElevations();

            const surface = se.getHct(`level${l}` as BaseElevation, "dark");

            expect(surface).toBeInstanceOf(Hct);
        },
    );

    it.for([0, 1, 2, 3, 4, 5])(
        "should be able to get hex surface elevation for default level%",
        (l) => {
            const se = createSurfaceElevations();

            const surface = se.getHex(`level${l}` as BaseElevation, "dark");

            expect(surface).toBeTypeOf("string");
        },
    );

    it.for([0, 1, 2, 3, 4, 5])(
        "should be able to get argb surface elevation for default level%",
        (l) => {
            const se = createSurfaceElevations();

            const surface = se.getArgb(`level${l}` as BaseElevation, "dark");

            expect(surface).toBeTypeOf("number");
        },
    );
});
