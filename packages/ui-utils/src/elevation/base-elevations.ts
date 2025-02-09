import { deepMerge } from "@pureform/utils";
import type { Pixel } from "../types";
import type { BaseElevation, ElevationConfig } from "./types";

type Config = ElevationConfig | Pixel;

export type BaseElevationArgs<TCustomElevation extends string = BaseElevation> =
    { elevations?: Partial<Record<BaseElevation | TCustomElevation, Config>> };

export abstract class BaseElevations<
    TCustomElevation extends string = BaseElevation,
> {
    private static defaultElevationOptions: BaseElevationArgs = {
        elevations: {
            level0: 0,
            level1: 1,
            level2: 3,
            level3: 6,
            level4: 8,
            level5: 12,
        },
    };

    protected elevationConfigs: Record<
        TCustomElevation | BaseElevation,
        ElevationConfig
    >;

    protected constructor(args?: BaseElevationArgs<TCustomElevation>) {
        const options = deepMerge(
            BaseElevations.defaultElevationOptions as BaseElevationArgs<TCustomElevation>,
            args ?? {},
        );
        const configs = {} as Record<
            TCustomElevation | BaseElevation,
            ElevationConfig
        >;

        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        const el = options.elevations!;

        if (el) {
            for (const key of Object.keys(el)) {
                const value = el[key as TCustomElevation];
                let numPx = -1;
                if (typeof value === "number" || typeof value === "string") {
                    numPx =
                        typeof value === "number"
                            ? value
                            : Number.parseInt(value);
                } else if (typeof value === "object") {
                    numPx =
                        typeof value.pixel === "number"
                            ? value.pixel
                            : Number.parseInt(value.pixel as string);
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
        }

        this.elevationConfigs = configs;
    }

    public allConfigs(): Record<
        TCustomElevation | BaseElevation,
        ElevationConfig
    > {
        return this.elevationConfigs;
    }

    public getConfig(
        elevation: TCustomElevation | BaseElevation,
    ): ElevationConfig {
        return this.elevationConfigs[elevation];
    }
}
