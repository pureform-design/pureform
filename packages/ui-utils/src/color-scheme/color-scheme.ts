import {
    argbFromHex,
    Hct,
    hexFromArgb,
} from "@material/material-color-utilities";
import { CorePalette, type ColorConfig } from ".";
import type {
    BaseColorGroup,
    BaseKeyColorGroup,
    HexColor,
    SystemColor,
} from "../types";

export type ColorSchemeMode = "light" | "dark";

export type ColorSchemeArgs<TCustomColorGroups extends string> = {
    sourceColor: HexColor;
    customColorSeeds?: Partial<
        Record<TCustomColorGroups | BaseColorGroup, ColorConfig>
    >;
};

export type ColorInfoRecord<
    TCustomColorGroups extends string = BaseColorGroup,
> = Record<
    SystemColor<TCustomColorGroups | BaseColorGroup>,
    ColorInfo<TCustomColorGroups>
>;

export type ColorInfo<TCustomColorGroups extends string = BaseColorGroup> = {
    colorGroup: TCustomColorGroups | BaseColorGroup;
    lightTone: number;
    darkTone: number;
};

function capitalize<S extends string>(str: S): Capitalize<S> {
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<S>;
}

export class ColorScheme<TCustomColorGroups extends string = BaseColorGroup> {
    protected corePalette: CorePalette<TCustomColorGroups | BaseColorGroup>;
    private _cache: Partial<
        Record<SystemColor<TCustomColorGroups | BaseColorGroup>, HexColor>
    > = {};
    private _colorInfo: ColorInfoRecord<TCustomColorGroups>;

    private static keyColorGroups: BaseKeyColorGroup[] = [
        "info",
        "negative",
        "notice",
        "positive",
        "primary",
        "secondary",
        "tertiary",
    ];

    private static isKeyColorGroup(color: string): boolean {
        return ColorScheme.keyColorGroups.includes(color as BaseKeyColorGroup);
    }

    public static create<TCustomColorGroups extends string = BaseColorGroup>(
        args: ColorSchemeArgs<TCustomColorGroups>,
    ): ColorScheme<TCustomColorGroups> {
        return new ColorScheme(args);
    }

    protected constructor(args: ColorSchemeArgs<TCustomColorGroups>) {
        this.corePalette = CorePalette.fromSourceHexWithCustomColors(
            args.sourceColor,
            args.customColorSeeds ?? {},
        );

        const colorInfo: ColorInfoRecord<TCustomColorGroups> = {
            outline: {
                colorGroup: "neutralVariant",
                lightTone: 50,
                darkTone: 60,
            },
            outlineVariant: {
                colorGroup: "neutralVariant",
                lightTone: 80,
                darkTone: 30,
            },
            surface: {
                colorGroup: "neutral",
                lightTone: 98,
                darkTone: 6,
            },
            onSurface: {
                colorGroup: "neutral",
                lightTone: 10,
                darkTone: 90,
            },
            surfaceVariant: {
                colorGroup: "neutralVariant",
                lightTone: 90,
                darkTone: 30,
            },
            onSurfaceVariant: {
                colorGroup: "neutralVariant",
                lightTone: 30,
                darkTone: 80,
            },
            surfaceContainerHighest: {
                colorGroup: "neutral",
                lightTone: 90,
                darkTone: 22,
            },
            surfaceContainerHigh: {
                colorGroup: "neutral",
                lightTone: 92,
                darkTone: 17,
            },
            surfaceContainer: {
                colorGroup: "neutral",
                lightTone: 94,
                darkTone: 12,
            },
            surfaceContainerLow: {
                colorGroup: "neutral",
                lightTone: 96,
                darkTone: 10,
            },
            surfaceContainerLowest: {
                colorGroup: "neutral",
                lightTone: 100,
                darkTone: 4,
            },
            inverseSurface: {
                colorGroup: "neutral",
                lightTone: 20,
                darkTone: 90,
            },
            inverseOnSurface: {
                colorGroup: "neutral",
                lightTone: 95,
                darkTone: 20,
            },
            background: {
                colorGroup: "neutral",
                lightTone: 98,
                darkTone: 6,
            },
            onBackground: {
                colorGroup: "neutral",
                lightTone: 10,
                darkTone: 90,
            },
            surfaceBright: {
                colorGroup: "neutral",
                lightTone: 98,
                darkTone: 24,
            },
            surfaceDim: {
                colorGroup: "neutral",
                lightTone: 87,
                darkTone: 6,
            },
            scrim: {
                colorGroup: "neutral",
                darkTone: 0,
                lightTone: 0,
            },
            shadow: {
                colorGroup: "neutral",
                darkTone: 0,
                lightTone: 0,
            },
            black: {
                colorGroup: "neutral",
                darkTone: 0,
                lightTone: 0,
            },
            white: {
                colorGroup: "negative",
                darkTone: 100,
                lightTone: 100,
            },
            surfaceTint: {
                colorGroup: "primary",
                lightTone: 40,
                darkTone: 80,
            },
            surfaceTintColor: {
                colorGroup: "primary",
                lightTone: 40,
                darkTone: 80,
            },
            inversePrimary: {
                colorGroup: "primary",
                lightTone: 80,
                darkTone: 40,
            },
        } as ColorInfoRecord<TCustomColorGroups>;

        const keyColors = this.corePalette.colorGroups.filter(
            ColorScheme.isKeyColorGroup,
        );

        for (const color of keyColors) {
            const key: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 40,
                darkTone: 80,
            };
            const onKey: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 100,
                darkTone: 20,
            };
            const onKeyLow: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 90,
                darkTone: 10,
            };
            const onKeyLowest: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 80,
                darkTone: 0,
            };
            const keyContainer: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 90,
                darkTone: 30,
            };
            const onKeyContainer: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 30,
                darkTone: 90,
            };
            const onKeyContainerLow: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 30,
                darkTone: 70,
            };
            const onKeyContainerLowest: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 50,
                darkTone: 50,
            };
            const keyFixed: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 90,
                darkTone: 90,
            };
            const onKeyFixed: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 10,
                darkTone: 10,
            };
            const onKeyFixedVariant: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 30,
                darkTone: 30,
            };
            const keyFixedDim: ColorInfo<TCustomColorGroups> = {
                colorGroup: color,
                lightTone: 80,
                darkTone: 80,
            };

            colorInfo[color as SystemColor<TCustomColorGroups>] = key;
            colorInfo[
                `on${capitalize(color)}` as SystemColor<TCustomColorGroups>
            ] = onKey;
            colorInfo[
                `on${capitalize(color)}Low` as SystemColor<TCustomColorGroups>
            ] = onKeyLow;
            colorInfo[
                `on${capitalize(color)}Lowest` as SystemColor<TCustomColorGroups>
            ] = onKeyLowest;
            colorInfo[`${color}Container` as SystemColor<TCustomColorGroups>] =
                keyContainer;
            colorInfo[
                `on${capitalize(color)}Container` as SystemColor<TCustomColorGroups>
            ] = onKeyContainer;
            colorInfo[
                `on${capitalize(color)}ContainerLow` as SystemColor<TCustomColorGroups>
            ] = onKeyContainerLow;
            colorInfo[
                `on${capitalize(color)}ContainerLowest` as SystemColor<TCustomColorGroups>
            ] = onKeyContainerLowest;
            colorInfo[`${color}Fixed` as SystemColor<TCustomColorGroups>] =
                keyFixed;
            colorInfo[
                `on${capitalize(color)}Fixed` as SystemColor<TCustomColorGroups>
            ] = onKeyFixed;
            colorInfo[
                `on${capitalize(color)}FixedVariant` as SystemColor<TCustomColorGroups>
            ] = onKeyFixedVariant;
            colorInfo[`${color}FixedDim` as SystemColor<TCustomColorGroups>] =
                keyFixedDim;
        }

        this._colorInfo = colorInfo;
    }

    public getHex(
        color: SystemColor<TCustomColorGroups | BaseColorGroup>,
        mode: ColorSchemeMode,
    ): HexColor {
        const cached = this._cache[color];

        if (cached) {
            return cached;
        }

        const info = this._colorInfo[color];

        const cp = this.corePalette.get(info.colorGroup);

        let hex: HexColor = "#";
        if (mode === "light") {
            hex = cp.toneHex(info.lightTone);
        } else {
            hex = cp.toneHex(info.darkTone);
        }

        this._cache[color] = hex;

        return hex;
    }

    public getArgb(
        color: SystemColor<TCustomColorGroups | BaseColorGroup>,
        mode: ColorSchemeMode,
    ): number {
        const cached = this._cache[color];

        if (cached) {
            return argbFromHex(cached);
        }

        const info = this._colorInfo[color];

        const cp = this.corePalette.get(info.colorGroup);

        let argb = 0;
        if (mode === "light") {
            argb = cp.toneArgb(info.lightTone);
        } else {
            argb = cp.toneArgb(info.darkTone);
        }

        this._cache[color] = hexFromArgb(argb) as HexColor;

        return argb;
    }

    public getHct(
        color: SystemColor<TCustomColorGroups | BaseColorGroup>,
        mode: ColorSchemeMode,
    ): Hct {
        const cached = this._cache[color];

        if (cached) {
            return Hct.fromInt(argbFromHex(cached));
        }

        const info = this._colorInfo[color];

        const cp = this.corePalette.get(info.colorGroup);

        const hct =
            mode === "light"
                ? cp.toneHct(info.lightTone)
                : cp.toneHct(info.darkTone);

        this._cache[color] = hexFromArgb(hct.toInt()) as HexColor;

        return hct;
    }
}
