import {
    argbFromHex,
    Hct,
    hexFromArgb,
    TonalPalette as MaterialTonalPalette,
} from "@material/material-color-utilities";
import type { HexColor } from "../types";

export class TonalPalette {
    private _matTp: MaterialTonalPalette;
    private _cache = new Map<number, HexColor>();

    private constructor(tp: MaterialTonalPalette);
    private constructor(hax: HexColor);
    private constructor(tpOrHex: HexColor | MaterialTonalPalette) {
        if (typeof tpOrHex === "string") {
            this._matTp = MaterialTonalPalette.fromInt(argbFromHex(tpOrHex));
        } else {
            this._matTp = tpOrHex;
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

        if (this._cache.has(tone)) {
            return this._cache.get(tone) as HexColor;
        }

        const h = hexFromArgb(this._matTp.tone(tone)) as HexColor;

        this._cache.set(tone, h);

        return h;
    }

    public toneHct(tone: number): Hct {
        TonalPalette.throwWhenInvalidTone(tone);

        const argb = this.toneArgb(tone);

        return Hct.fromInt(argb);
    }

    public toneArgb(tone: number): number {
        TonalPalette.throwWhenInvalidTone(tone);
        const hex = this.toneHex(tone);
        return argbFromHex(hex);
    }
}
