import {
    argbFromHex,
    Blend,
    Hct,
    hexFromArgb,
} from "@material/material-color-utilities";
import type { BaseColorGroup, HexColor } from "../types";
import { TonalPalette } from "./tonal-palette";

export type ColorConfig =
    | {
          hex: HexColor;
          harmonize?: boolean;
      }
    | HexColor;

export class CorePalette<TCustomColorGroups extends string = BaseColorGroup> {
    private _palettes: Record<
        TCustomColorGroups | BaseColorGroup,
        TonalPalette
    >;

    private constructor(
        palettes: Record<TCustomColorGroups | BaseColorGroup, TonalPalette>,
    ) {
        this._palettes = palettes;
    }

    private static createBasePalettes(
        sourceSeed: HexColor,
    ): Record<BaseColorGroup, TonalPalette> {
        const sourceHct = Hct.fromInt(argbFromHex(sourceSeed));
        const sourceHue = sourceHct.hue;
        const sourceChroma = sourceHct.chroma;

        const tpPrimary = TonalPalette.fromHueAndChroma(
            sourceHue,
            sourceChroma,
        );
        const tpSecondary = TonalPalette.fromHueAndChroma(
            sourceHue,
            sourceChroma / 3,
        );
        const tpTertiary = TonalPalette.fromHueAndChroma(
            sourceHue + 60,
            sourceChroma / 2,
        );
        const tpNeutral = TonalPalette.fromHueAndChroma(
            sourceHue,
            Math.min(sourceChroma / 12, 4),
        );
        const tpNeutralVariant = TonalPalette.fromHueAndChroma(
            sourceHue,
            Math.min(sourceChroma / 6, 8),
        );
        const tpNegative = TonalPalette.fromHueAndChroma(25, 84);
        const tpInfo = TonalPalette.fromHex("#1DD2FF");
        const tpNotice = TonalPalette.fromHex("#FFDD1D");
        const tpPositive = TonalPalette.fromHex("#17D560");

        return {
            info: tpInfo,
            positive: tpPositive,
            notice: tpNotice,
            negative: tpNegative,
            neutral: tpNeutral,
            neutralVariant: tpNeutralVariant,
            primary: tpPrimary,
            secondary: tpSecondary,
            tertiary: tpTertiary,
        };
    }

    public static fromSourceHex(hex: HexColor): CorePalette<BaseColorGroup> {
        return new CorePalette(CorePalette.createBasePalettes(hex));
    }

    public static fromSourceHexWithCustomColors<
        TCustomColorGroup extends string = BaseColorGroup,
    >(
        sourceSeed: HexColor,
        customColorSeeds: Partial<
            Record<TCustomColorGroup | BaseColorGroup, ColorConfig>
        >,
    ): CorePalette<TCustomColorGroup> {
        const palettes = CorePalette.createBasePalettes(sourceSeed);

        for (const key of Object.keys(customColorSeeds)) {
            const value = customColorSeeds[key as TCustomColorGroup];
            if (value) {
                if (typeof value === "string") {
                    palettes[key as BaseColorGroup] = TonalPalette.fromHex(
                        value as HexColor,
                    );
                } else {
                    if (value.harmonize) {
                        const blended = Blend.harmonize(
                            argbFromHex(value.hex),
                            argbFromHex(sourceSeed),
                        );
                        palettes[key as BaseColorGroup] =
                            TonalPalette.fromArgb(blended);

                        continue;
                    }

                    palettes[key as BaseColorGroup] = TonalPalette.fromHex(
                        value.hex,
                    );
                }
            }
        }

        return new CorePalette(palettes) as CorePalette<TCustomColorGroup>;
    }

    public get(color: TCustomColorGroups | BaseColorGroup): TonalPalette {
        return this._palettes[color];
    }

    public get colorGroups(): (TCustomColorGroups | BaseColorGroup)[] {
        return Object.keys(this._palettes) as (
            | TCustomColorGroups
            | BaseColorGroup
        )[];
    }
}
