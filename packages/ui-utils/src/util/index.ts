import deepMerge from "deepmerge";
import deepClone from "just-clone";
import type {
    BaseColorGroup,
    BaseElevationLevel,
    BaseKeyColorGroup,
    BaseShapeSize,
    BaseStateName,
    BaseTextStyleName,
    BoxShadow,
    Elevation,
    Elevations,
    Pixel,
} from "../types";

export type DeepRequired<T extends Record<string, unknown>> = {
    [P in keyof T]-?: T[P] extends Record<string, unknown>
        ? DeepRequired<T[P]>
        : T[P];
};

export type DeepPartial<T extends Record<string, unknown>> = {
    [P in keyof T]+?: T[P] extends Record<string, unknown>
        ? DeepPartial<T[P]>
        : T[P];
};

export type DeepNullable<T extends Record<string, unknown>> = {
    [P in keyof T]: T[P] extends Record<string, unknown>
        ? DeepPartial<T[P]>
        : T[P] | null;
};

export type NullifyLeafNodes<T extends Record<string, unknown>> = {
    [P in keyof T]: T[P] extends Record<string, unknown>
        ? NullifyLeafNodes<T[P]>
        : null;
};

export type DeepReadOnly<T extends Record<string, unknown>> = {
    +readonly [P in keyof T]: T[P] extends Record<string, unknown>
        ? DeepPartial<T[P]>
        : T[P];
};

export type DeepMerge<
    T1 extends Record<string, unknown>,
    T2 extends Record<string, unknown>,
> = {
    [P in keyof T1 | keyof T2]: P extends Record<string, unknown>
        ? never
        : (T1 & T2)[P];
};

type HexColor = `#${string}`;

type ColorConfig = {
    hex: HexColor;
    /**
     * Harmonize color with the main color
     *
     * @default true
     */
    harmonize?: boolean;
};

type TypographyConfig = {
    font?: string;
};

type ColorOptions<TCustomKeyColors extends string = BaseKeyColorGroup> = {
    scheme?: "dark" | "light";
    themeSeed?: HexColor;
    customColorSeeds?: Partial<
        Record<TCustomKeyColors | BaseColorGroup, ColorConfig>
    >;
};

type ElevationOptions<CustomElevations extends string = BaseElevationLevel> =
    DeepPartial<
        Record<BaseElevationLevel, `${number}px`> &
            Record<CustomElevations, `${number}px`>
    >;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nullifyLeafNodesImpl(clone: any): any {
    for (const [k, v] of Object.entries(clone)) {
        if (typeof clone[k] === "object" && clone[k] !== null) {
            clone[k] = nullifyLeafNodesImpl(v);
        } else {
            clone[k] = null;
        }
    }

    return clone;
}

export function nullifyLeafNodes<T extends Record<string, unknown>>(
    o: T,
): NullifyLeafNodes<T> {
    // clone the object so we don't mutate the original, then nullify all values
    // in a recursive manner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clone: any = deepClone(o);

    return nullifyLeafNodesImpl(clone) as NullifyLeafNodes<T>;
}

export type MaterialDesignConfig<
    CustomColors extends string = BaseKeyColorGroup,
    CustomElevations extends string = BaseElevationLevel,
    CustomShapeSizes extends string = BaseShapeSize,
    CustomTypescales extends string = BaseTextStyleName,
    CustomStates extends string = BaseStateName,
> = {
    options?: {
        color?: ColorOptions<CustomColors>;
        elevation?: ElevationOptions<CustomElevations>;
        typography?: TypographyConfig;
    };
    overrides?: DeepPartial<
        MaterialDesignTheme<
            CustomColors,
            CustomElevations,
            CustomShapeSizes,
            CustomTypescales,
            CustomStates
        >
    >;
};

const materialDefaultOptions = {
    options: {
        color: {
            themeSeed: "#6750a4" as HexColor,
        },
        elevation: {
            level0: "0px" as `${number}px`,
            level1: "1px" as `${number}px`,
            level2: "2px" as `${number}px`,
            level3: "3px" as `${number}px`,
            level4: "4px" as `${number}px`,
            level5: "5px" as `${number}px`,
        },
    },
    overrides: {},
} satisfies DeepPartial<MaterialDesignConfig>;

export function materialDesignTheme<
    CustomColors extends string = BaseKeyColorGroup,
    CustomElevations extends string = BaseElevationLevel,
    CustomShapeSizes extends string = BaseShapeSize,
    CustomTypescales extends string = BaseTextStyleName,
    CustomStates extends string = BaseStateName,
>(
    opts?: MaterialDesignConfig<
        CustomColors,
        CustomElevations,
        CustomShapeSizes,
        CustomTypescales,
        CustomStates
    >,
) {
    const mergedOpts = deepMerge(materialDefaultOptions, opts ?? {});
    const refPalette = createReferencePalette<CustomColors>(
        mergedOpts.options.color,
    );
    const colorScheme = createColorScheme(
        refPalette,
        opts?.options?.color?.scheme ?? "light",
    );

    return deepMerge(
        {
            ref: {
                palette: refPalette,
            },
            sys: {
                color: colorScheme,
                state: {
                    hovered: {
                        stateLayer: { opacity: "8%" },
                        content: {
                            opacity: "100%",
                        },
                        container: {
                            opacity: "100%",
                        },
                    },
                    focused: {
                        stateLayer: { opacity: "12%" },
                        content: {
                            opacity: "100%",
                        },
                        container: {
                            opacity: "100%",
                        },
                    },
                    pressed: {
                        stateLayer: { opacity: "12%" },
                        content: {
                            opacity: "100%",
                        },
                        container: {
                            opacity: "100%",
                        },
                    },
                    dragged: {
                        stateLayer: { opacity: "16%" },
                        content: {
                            opacity: "100%",
                        },
                        container: {
                            opacity: "100%",
                        },
                    },
                    enabled: {
                        stateLayer: { opacity: "0%" },
                        content: {
                            opacity: "100%",
                        },
                        container: {
                            opacity: "100%",
                        },
                    },
                    activated: {
                        stateLayer: { opacity: "0%" },
                        content: {
                            opacity: "100%",
                        },
                        container: {
                            opacity: "100%",
                        },
                    },
                    selected: {
                        stateLayer: { opacity: "0%" },
                        content: {
                            opacity: "100%",
                        },
                        container: {
                            opacity: "100%",
                        },
                    },
                    disabled: {
                        content: { opacity: "38%" },
                        stateLayer: { opacity: "0%" },
                        container: { opacity: "12%" },
                    },
                },
                shape: {
                    corner: {
                        none: "0px",
                        extraSmall: "4px",
                        small: "8px",
                        medium: "12px",
                        large: "16px",
                        extraLarge: "28px",
                        full: "9999px",
                    },
                },
                typescale: {},
                elevation: createElevations<CustomElevations>(
                    mergedOpts?.options?.elevation ?? {},
                ),
            },
        },
        opts?.overrides ?? {},
    ) as unknown as MaterialDesignTheme<
        CustomColors,
        CustomElevations,
        CustomShapeSizes,
        CustomTypescales,
        CustomStates
    >;
}

function createElevation(distance: Pixel): Elevation {
    return {
        shadow: {
            umbra: shadowUmbra(distance),
            penumbra: shadowPenumbra(distance),
        },
    };
}

function createElevations<CustomElevations extends string = BaseElevationLevel>(
    options: ElevationOptions,
): Elevations<CustomElevations> {
    const el: Record<string, Elevation> = {};

    for (const [key, distance] of Object.entries(options)) {
        const x = createElevation(distance ?? `0px`);
        el[key] = x;
    }

    return el as Elevations<CustomElevations>;
}

// function surfaceTintOpacity(elevationLevel: Pixel): number {
//   const px = parseInt(`${elevationLevel}`);
//
//   if (px === 0) {
//     return 0;
//   }
//
//   return Math.round(0.02 * px ** 3 - 0.4686 * px ** 2 + 3.8613 * px + 0.5689);
// }

function shadowUmbra(distance: Pixel): BoxShadow {
    const px = parseInt(`${distance}`);

    return {
        offsetX: "0px",
        offsetY: `${Math.round(
            px === 0
                ? 0
                : 0.0054 * px ** 3 - 0.0756 * px ** 2 + 0.4406 * px + 0.2473,
        )}px`,
        blurRadius: `${Math.round(
            px === 0 ? 0 : 0.0076 * px - 0.1573 * px + 1.0961 * px + 0.3605,
        )}px`,
        spreadRadius: "0px",
    };
}

function shadowPenumbra(distance: Pixel): BoxShadow {
    const px = parseInt(`${distance}`);

    return {
        offsetX: "0px",
        offsetY: `${Math.round(
            px === 0 ? 0 : -0.0032 * px + 0.0533 * px + 0.4782 * px + 0.187,
        )}px`,
        blurRadius: `${Math.round(
            px === 0 ? 0 : -0.0637 * px ** 2 + 1.6862 * px + 0.7669,
        )}px`,
        spreadRadius: `${Math.round(
            px === 0
                ? 0
                : 0.0042 * px ** 3 - 0.0783 * px ** 2 + 0.8299 * px + 0.0984,
        )}px`,
    };
}
