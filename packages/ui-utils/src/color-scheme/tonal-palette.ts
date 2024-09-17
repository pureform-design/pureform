import {
    argbFromHex,
    type Hct,
    hexFromArgb,
    TonalPalette as MaterialTonalPalette,
} from "@material/material-color-utilities";
import type { HexColor } from "../types";

export class TonalPalette {
    private _matTp: MaterialTonalPalette;

    private constructor(tp: MaterialTonalPalette);
    private constructor(hax: HexColor);
    private constructor(hex: HexColor | MaterialTonalPalette) {
        if (typeof hex === "string") {
            this._matTp = MaterialTonalPalette.fromInt(argbFromHex(hex));
        } else {
            this._matTp = hex;
        }
    }

    public static fromHex(hex: HexColor) {
        return new TonalPalette(hex);
    }

    public static fromArgb(argb: number) {
        return new TonalPalette(hexFromArgb(argb) as HexColor);
    }

    public static fromHueAndChroma(hue: number, chroma: number) {
        const tp = MaterialTonalPalette.fromHueAndChroma(hue, chroma);
        return new TonalPalette(tp);
    }

    private static throwWhenInvalidTone(tone: number) {
        if (tone < 0 || tone > 100) {
            throw new Error(`Invalid tone: ${tone}, must be between 0 and 100`);
        }
    }

    public toneHex(tone: number): HexColor {
        TonalPalette.throwWhenInvalidTone(tone);

        return hexFromArgb(this._matTp.tone(tone)) as HexColor;
    }

    public toneHct(tone: number): Hct {
        TonalPalette.throwWhenInvalidTone(tone);

        return this._matTp.getHct(tone);
    }

    public toneArgb(tone: number): number {
        TonalPalette.throwWhenInvalidTone(tone);

        return this._matTp.tone(tone);
    }
}
