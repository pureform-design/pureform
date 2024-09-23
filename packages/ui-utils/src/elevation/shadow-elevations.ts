import type { Pixel } from "../types";
import { type BaseElevationArgs, BaseElevations } from "./base-elevations";
import { precalculatedAtPixel } from "./precalculated";
import type {
    BaseElevation,
    BoxShadow,
    ElevationConfig,
    ShadowElevation,
} from "./types";

export type ShadowElevationArgs<
    TCustomElevation extends string = BaseElevation,
> = BaseElevationArgs<TCustomElevation>;

export class ShadowElevations<
    TCustomElevation extends string = BaseElevation,
> extends BaseElevations<TCustomElevation> {
    private elevationLevelCache: Record<string, ShadowElevation> = {};
    private elevationPxCache: Record<number, ShadowElevation> = {};

    public static create<TCustomElevation extends string = BaseElevation>(
        args?: ShadowElevationArgs<TCustomElevation>,
    ): ShadowElevations<TCustomElevation> {
        return new ShadowElevations<TCustomElevation>(args);
    }

    protected constructor(args?: ShadowElevationArgs<TCustomElevation>) {
        super(args);
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
        if (px === 0) return 0;

        const slope = 1.0;
        const intercept = 0.0;
        return Math.floor(slope * px + intercept);
    }

    private static penumbraBlurRadius(px: number): number {
        if (px === 0) return 0;

        const slope = 1.37;
        const intercept = 1.18;
        return Math.floor(slope * px + intercept);
    }

    private static penumbraSpreadRadius(px: number): number {
        if (px === 0) return 0;

        const slope = 0.13;
        const intercept = 0.03;
        return Math.floor(slope * px + intercept);
    }

    // Umbra functions
    private static umbraOffsetY(px: number): number {
        if (px === 0) return 0;

        const slope = 0.39;
        const intercept = 0.63;
        return Math.floor(slope * px + intercept);
    }

    private static umbraBlurRadius(px: number): number {
        if (px === 0) return 0;

        const slope = 0.56;
        const intercept = 1.02;
        return Math.floor(slope * px + intercept);
    }

    private static umbraSpreadRadius(px: number): number {
        if (px === 0) return 0;

        const slope = -0.26;
        const intercept = -0.12;
        return Math.floor(slope * px + intercept);
    }

    // Ambient functions
    private static ambientOffsetY(px: number): number {
        if (px === 0) return 0;

        const slope = 0.39;
        const intercept = 0.63;
        return Math.floor(slope * px + intercept);
    }

    private static ambientBlurRadius(px: number): number {
        if (px === 0) return 0;

        const slope = 1.52;
        const intercept = 2.33;
        return Math.floor(slope * px + intercept);
    }

    private static ambientSpreadRadius(px: number): number {
        if (px === 0) return 0;

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

    public getAtPixel(px: Pixel): ShadowElevation {
        const num = typeof px === "number" ? px : Number.parseInt(px);
        if (num < 0) {
            throw new Error("Invalid elevation pixel, must be greater than 0");
        }

        const cached = this.elevationPxCache[num];

        if (cached) {
            return cached;
        }

        if (num >= 0 && num <= 23) {
            return precalculatedAtPixel(num);
        }

        const shadow: ShadowElevation = {
            umbra: ShadowElevations.umbraAtPixel(num),
            penumbra: ShadowElevations.penumbraAtPixel(num),
            ambient: ShadowElevations.ambientAtPixel(num),
        };

        this.elevationPxCache[num] = shadow;

        return shadow;
    }

    public all(): Record<TCustomElevation | BaseElevation, ShadowElevation> {
        const config = this.elevationConfigs;
        const keys = Object.keys(config) as (
            | TCustomElevation
            | BaseElevation
        )[];

        return Object.fromEntries(
            keys.map((key) => [key, this.get(key)]),
        ) as Record<TCustomElevation | BaseElevation, ShadowElevation>;
    }
}
