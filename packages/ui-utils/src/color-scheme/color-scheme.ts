import { Hct, argbFromHex } from "@material/material-color-utilities";
import { clone } from "@repo/utils";
import { type ColorConfig, CorePalette } from ".";
import type { BaseColorGroup, HexColor, SystemColor } from "../types";

export type ColorSchemeMode = "light" | "dark";

export type ColorSchemeArgs<TCustomColorGroups extends string> = {
    source: HexColor;
    customSeeds?: Partial<
        Record<TCustomColorGroups | BaseColorGroup, ColorConfig>
    >;
    overrides?: Partial<
        Record<
            SystemColor<TCustomColorGroups | BaseColorGroup>,
            HexColor | { dark?: HexColor; light?: HexColor }
        >
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
    lightOverride?: HexColor;
    darkOverride?: HexColor;
};

function capitalize<S extends string>(str: S): Capitalize<S> {
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<S>;
}

export class ColorScheme<TCustomColorGroups extends string = BaseColorGroup> {
    protected corePalette: CorePalette<TCustomColorGroups | BaseColorGroup>;
    private _cache: Partial<Record<string, HexColor>> = {};
    private _colorInfo: ColorInfoRecord<TCustomColorGroups>;

    public static create<TCustomColorGroups extends string = BaseColorGroup>(
        args: ColorSchemeArgs<TCustomColorGroups>,
    ): ColorScheme<TCustomColorGroups> {
        return new ColorScheme(args);
    }

    public getAllColorGroups() {
        return this.corePalette.colorGroups;
    }

    protected constructor(args: ColorSchemeArgs<TCustomColorGroups>) {
        this.corePalette = CorePalette.fromSourceHexWithCustomColors(
            args.source,
            args.customSeeds ?? {},
        );
        const colorInfo = {
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

        const colorGroups = this.corePalette.colorGroups;

        for (const colorGroup of colorGroups) {
            const cg: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 40,
                darkTone: 80,
            };
            const onCg: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 100,
                darkTone: 20,
            };
            const onCgLow: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 90,
                darkTone: 10,
            };
            const onCgLowest: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 80,
                darkTone: 0,
            };
            const cgContainer: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 90,
                darkTone: 30,
            };
            const onCgContainer: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 30,
                darkTone: 90,
            };
            const onCgContainerLow: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 30,
                darkTone: 70,
            };
            const onCgContainerLowest: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 50,
                darkTone: 50,
            };
            const cgFixed: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 90,
                darkTone: 90,
            };
            const onCgFixed: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 10,
                darkTone: 10,
            };
            const onCgFixedVariant: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 30,
                darkTone: 30,
            };
            const cgFixedDim: ColorInfo<TCustomColorGroups> = {
                colorGroup: colorGroup,
                lightTone: 80,
                darkTone: 80,
            };

            colorInfo[colorGroup as SystemColor<TCustomColorGroups>] = cg;
            colorInfo[
                `on${capitalize(colorGroup)}` as SystemColor<TCustomColorGroups>
            ] = onCg;
            colorInfo[
                `on${capitalize(colorGroup)}Low` as SystemColor<TCustomColorGroups>
            ] = onCgLow;
            colorInfo[
                `on${capitalize(colorGroup)}Lowest` as SystemColor<TCustomColorGroups>
            ] = onCgLowest;
            colorInfo[
                `${colorGroup}Container` as SystemColor<TCustomColorGroups>
            ] = cgContainer;
            colorInfo[
                `on${capitalize(colorGroup)}Container` as SystemColor<TCustomColorGroups>
            ] = onCgContainer;
            colorInfo[
                `on${capitalize(colorGroup)}ContainerLow` as SystemColor<TCustomColorGroups>
            ] = onCgContainerLow;
            colorInfo[
                `on${capitalize(colorGroup)}ContainerLowest` as SystemColor<TCustomColorGroups>
            ] = onCgContainerLowest;
            colorInfo[`${colorGroup}Fixed` as SystemColor<TCustomColorGroups>] =
                cgFixed;
            colorInfo[
                `on${capitalize(colorGroup)}Fixed` as SystemColor<TCustomColorGroups>
            ] = onCgFixed;
            colorInfo[
                `on${capitalize(colorGroup)}FixedVariant` as SystemColor<TCustomColorGroups>
            ] = onCgFixedVariant;
            colorInfo[
                `${colorGroup}FixedDim` as SystemColor<TCustomColorGroups>
            ] = cgFixedDim;
        }

        for (const [key, value] of Object.entries(args.overrides ?? {})) {
            const k = key as SystemColor<TCustomColorGroups | BaseColorGroup>;
            const v = value as HexColor | { dark?: HexColor; light?: HexColor };

            if (typeof v === "string") {
                colorInfo[k].lightOverride = v;
                colorInfo[k].darkOverride = v;
            } else {
                if (v.light) {
                    colorInfo[k].lightOverride = v.light;
                }

                if (v.dark) {
                    colorInfo[k].darkOverride = v.dark;
                }
            }
        }

        this._colorInfo = colorInfo;
    }

    public getHex(
        color: SystemColor<TCustomColorGroups | BaseColorGroup>,
        mode: ColorSchemeMode,
    ): HexColor {
        if (mode === "light" && this._colorInfo[color].lightOverride) {
            return this._colorInfo[color].lightOverride;
        }

        if (mode === "dark" && this._colorInfo[color].darkOverride) {
            return this._colorInfo[color].darkOverride;
        }

        const key = `${color}.${mode}`;

        const cached = this._cache[key];

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
        this._cache[key] = hex;

        return hex;
    }

    public getArgb(
        color: SystemColor<TCustomColorGroups | BaseColorGroup>,
        mode: ColorSchemeMode,
    ): number {
        const hex = this.getHex(color, mode);

        return argbFromHex(hex);
    }

    public getHct(
        color: SystemColor<TCustomColorGroups | BaseColorGroup>,
        mode: ColorSchemeMode,
    ): Hct {
        const argb = this.getArgb(color, mode);

        return Hct.fromInt(argb);
    }

    public getAllHex(
        mode: ColorSchemeMode,
    ): Record<SystemColor<TCustomColorGroups | BaseColorGroup>, HexColor> {
        const result = {} as Record<
            SystemColor<TCustomColorGroups | BaseColorGroup>,
            HexColor
        >;

        const colors = Object.keys(this._colorInfo) as SystemColor<
            TCustomColorGroups | BaseColorGroup
        >[];

        for (const color of colors) {
            result[color] = this.getHex(color, mode);
        }

        return result;
    }

    public getAllArgb(
        mode: ColorSchemeMode,
    ): Record<SystemColor<TCustomColorGroups | BaseColorGroup>, number> {
        const hex = this.getAllHex(mode);

        return Object.fromEntries(
            Object.entries(hex).map(([key, value]) => [
                key,
                argbFromHex(value),
            ]),
        ) as Record<SystemColor<TCustomColorGroups | BaseColorGroup>, number>;
    }

    public getAllHct(
        mode: ColorSchemeMode,
    ): Record<SystemColor<TCustomColorGroups | BaseColorGroup>, Hct> {
        const argb = this.getAllArgb(mode);

        return Object.fromEntries(
            Object.entries(argb).map(([key, value]) => [
                key,
                Hct.fromInt(value),
            ]),
        ) as Record<SystemColor<TCustomColorGroups | BaseColorGroup>, Hct>;
    }

    public getInfo(
        color: SystemColor<TCustomColorGroups | BaseColorGroup>,
    ): ColorInfo<TCustomColorGroups> {
        return this._colorInfo[color];
    }

    public getAllInfo(): ColorInfoRecord<TCustomColorGroups> {
        return clone(this._colorInfo);
    }
}
