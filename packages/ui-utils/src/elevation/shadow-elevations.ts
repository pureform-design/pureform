import { deepMerge } from "@repo/utils";
import type { Pixel } from "../types";
import type {
    BaseElevation,
    BoxShadow,
    ElevationConfig,
    ShadowElevation,
} from "./types";
import {
    ambientMap,
    penumbraMap,
    precalculatedAtPixel,
    umbraMap,
} from "./precalculated";

type Config = ElevationConfig | Pixel;

export type ShadowElevationArgs<
    TCustomElevation extends string = BaseElevation,
> = { elevations: Partial<Record<BaseElevation | TCustomElevation, Config>> };

export class ShadowElevations<TCustomElevation extends string = BaseElevation> {
    private static defaultElevationOptions: ShadowElevationArgs = {
        elevations: {
            level0: 0,
            level1: 1,
            level2: 2,
            level3: 3,
            level4: 4,
            level5: 5,
        },
    };

    private elevationConfigs: Record<
        TCustomElevation | BaseElevation,
        ElevationConfig
    >;

    private elevationLevelCache: Record<string, ShadowElevation> = {};
    private elevationPxCache: Record<number, ShadowElevation> = {};

    public static create<TCustomElevation extends string = BaseElevation>(
        args?: ShadowElevationArgs<TCustomElevation>,
    ): ShadowElevations<TCustomElevation> {
        return new ShadowElevations<TCustomElevation>(args);
    }

    protected constructor(args?: ShadowElevationArgs<TCustomElevation>) {
        const options = deepMerge(
            ShadowElevations.defaultElevationOptions as ShadowElevationArgs<TCustomElevation>,
            args ?? {},
        );
        const configs = {} as Record<
            TCustomElevation | BaseElevation,
            ElevationConfig
        >;

        for (const key of Object.keys(options.elevations)) {
            const value = options.elevations[key as TCustomElevation];
            let numPx = -1;
            if (typeof value === "number" || typeof value === "string") {
                numPx =
                    typeof value === "number" ? value : Number.parseInt(value);
            } else if (typeof value === "object") {
                numPx =
                    typeof value.pixel === "number"
                        ? value.pixel
                        : Number.parseInt(value.pixel);
            } else {
                throw new Error(
                    "Invalid elevation value, must be a number or object with a pixel property",
                );
            }

            if (numPx < 0) {
                throw new Error(
                    "Invalid elevation pixel, must be greater than 0",
                );
            }

            configs[key as TCustomElevation] = {
                pixel: numPx,
            };
        }

        this.elevationConfigs = configs;
    }

    public get(elevation: TCustomElevation | BaseElevation): ShadowElevation {
        const cached = this.elevationLevelCache[elevation];

        if (cached) {
            return cached;
        }

        const config = this.elevationConfigs[elevation];

        if (!config) {
            throw new Error(`Invalid elevation: ${elevation}`);
        }

        const px = config.pixel;

        const numPx = typeof px === "number" ? px : Number.parseInt(px);

        const shadow = this.getAtPixel(numPx);

        this.elevationLevelCache[elevation] = shadow;

        return shadow;
    }

    // Penumbra functions
    private static penumbraOffsetY(px: number): number {
        const slope = 1.0;
        const intercept = 0.0;
        return Math.floor(slope * px + intercept);
    }

    private static penumbraBlurRadius(px: number): number {
        const slope = 1.37;
        const intercept = 1.18;
        return Math.floor(slope * px + intercept);
    }

    private static penumbraSpreadRadius(px: number): number {
        const slope = 0.13;
        const intercept = 0.03;
        return Math.floor(slope * px + intercept);
    }

    // Umbra functions
    private static umbraOffsetY(px: number): number {
        const slope = 0.39;
        const intercept = 0.63;
        return Math.floor(slope * px + intercept);
    }

    private static umbraBlurRadius(px: number): number {
        const slope = 0.56;
        const intercept = 1.02;
        return Math.floor(slope * px + intercept);
    }

    private static umbraSpreadRadius(px: number): number {
        const slope = -0.26;
        const intercept = -0.12;
        return Math.floor(slope * px + intercept);
    }

    // Ambient functions
    private static ambientOffsetY(px: number): number {
        const slope = 0.39;
        const intercept = 0.63;
        return Math.floor(slope * px + intercept);
    }

    private static ambientBlurRadius(px: number): number {
        const slope = 1.52;
        const intercept = 2.33;
        return Math.floor(slope * px + intercept);
    }

    private static ambientSpreadRadius(px: number): number {
        const slope = 0.29;
        const intercept = 0.0;
        return Math.floor(slope * px + intercept);
    }

    private static umbraAtPixel(px: number): BoxShadow {
        return {
            offsetX: "0px",
            offsetY: `${ShadowElevations.umbraOffsetY(px)}px`,
            blurRadius: `${ShadowElevations.umbraBlurRadius(px)}px`,
            spreadRadius: `${ShadowElevations.umbraSpreadRadius(px)}px`,
        };
    }

    private static penumbraAtPixel(px: number): BoxShadow {
        return {
            offsetX: "0px",
            blurRadius: `${ShadowElevations.penumbraBlurRadius(px)}px`,
            offsetY: `${ShadowElevations.penumbraOffsetY(px)}px`,
            spreadRadius: `${ShadowElevations.penumbraSpreadRadius(px)}px`,
        };
    }

    private static ambientAtPixel(px: number): BoxShadow {
        return {
            offsetX: "0px",
            blurRadius: `${ShadowElevations.ambientBlurRadius(px)}px`,
            offsetY: `${ShadowElevations.ambientOffsetY(px)}px`,
            spreadRadius: `${ShadowElevations.ambientSpreadRadius(px)}px`,
        };
    }

    public getAtPixel(px: number): ShadowElevation {
        if (px < 0) {
            throw new Error("Invalid elevation pixel, must be greater than 0");
        }

        const cached = this.elevationPxCache[px];

        if (cached) {
            return cached;
        }

        if (px >= 0 && px <= 23) {
            return precalculatedAtPixel(px);
        }

        const shadow: ShadowElevation = {
            umbra: ShadowElevations.umbraAtPixel(px),
            penumbra: ShadowElevations.penumbraAtPixel(px),
            ambient: ShadowElevations.ambientAtPixel(px),
        };

        this.elevationPxCache[px] = shadow;

        return shadow;
    }
}
