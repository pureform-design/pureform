import { Hct, type ColorScheme, type ColorSchemeMode } from "../color-scheme";
import type { BaseElevation } from "./types";
import type { BaseColorGroup, HexColor, Pixel } from "../types";
import { BaseElevations, type BaseElevationArgs } from "./base-elevations";
import {
    alphaFromArgb,
    argbFromHex,
    blueFromArgb,
    greenFromArgb,
    hexFromArgb,
    redFromArgb,
} from "@material/material-color-utilities";

export type SurfaceElevationArgs<
    TCustomElevation extends string = BaseElevation,
> = BaseElevationArgs<TCustomElevation>;

export class SurfaceElevations<
    TCustomElevation extends string = BaseElevation,
    TCustomColorGroups extends string = BaseColorGroup,
> extends BaseElevations<TCustomElevation> {
    private _cache = new Map<string, HexColor>();

    protected constructor(
        private colorScheme: ColorScheme<TCustomColorGroups>,
        args?: SurfaceElevationArgs<TCustomElevation>,
    ) {
        super(args);
    }

    public static create<
        TCustomElevation extends string = BaseElevation,
        TCustomColorGroups extends string = BaseColorGroup,
    >(
        colorScheme: ColorScheme<TCustomColorGroups>,
        args?: SurfaceElevationArgs<TCustomElevation>,
    ): SurfaceElevations<TCustomElevation, TCustomColorGroups> {
        return new SurfaceElevations(colorScheme, args);
    }

    private static setAlpha(argb: number, alpha: number): number {
        return (argb & 0x00ffffff) | (alpha << 24);
    }

    private static argb(a: number, r: number, g: number, b: number): number {
        return (a << 24) | (r << 16) | (g << 8) | b;
    }

    private static compositeComponent(
        fgC: number,
        bgC: number,
        fgA: number,
        bgA: number,
        a: number,
    ): number {
        if (a === 0) {
            return 0;
        }

        return (fgC * fgA + bgC * bgA * (1 - fgA)) / a;
    }

    private static compositeOver(fg: number, bg: number): number {
        const fgA = alphaFromArgb(fg);
        const fgR = redFromArgb(fg);
        const fgG = greenFromArgb(fg);
        const fgB = blueFromArgb(fg);
        const bgA = alphaFromArgb(bg);
        const bgR = redFromArgb(bg);
        const bgG = greenFromArgb(bg);
        const bgB = blueFromArgb(bg);

        const a = fgA + bgA * (1 - fgA);

        const r = SurfaceElevations.compositeComponent(fgR, bgR, fgA, bgA, a);
        const g = SurfaceElevations.compositeComponent(fgG, bgG, fgA, bgA, a);
        const b = SurfaceElevations.compositeComponent(fgB, bgB, fgA, bgA, a);

        return SurfaceElevations.argb(a, r, g, b);
    }

    private throwIfInvalidElevation(
        elevation: BaseElevation | TCustomElevation,
    ) {
        if (!Object.hasOwn(this.elevationConfigs, elevation)) {
            throw new Error(
                `No configuration found for elevation: ${elevation}`,
            );
        }
    }

    public getHex(
        elevation: BaseElevation | TCustomElevation,
        mode: ColorSchemeMode,
    ): HexColor {
        this.throwIfInvalidElevation(elevation);
        const px = this.elevationConfigs[elevation].pixel;

        return this.getHexAtPixel(px, mode);
    }

    public getArgb(
        elevation: BaseElevation | TCustomElevation,
        mode: ColorSchemeMode,
    ): number {
        this.throwIfInvalidElevation(elevation);
        const px = this.elevationConfigs[elevation].pixel;

        return this.getArgbAtPixel(px, mode);
    }

    public getHct(
        elevation: BaseElevation | TCustomElevation,
        mode: ColorSchemeMode,
    ): Hct {
        this.throwIfInvalidElevation(elevation);
        const px = this.elevationConfigs[elevation].pixel;

        return this.getHctAtPixel(px, mode);
    }

    public getTintAlphaAtPixel(px: Pixel): number {
        const num = typeof px === "number" ? px : Number.parseInt(px);

        return 4.5 * Math.log(num + 1) + 2;
    }

    public getTintAlpha(elevation: BaseElevation | TCustomElevation): number {
        this.throwIfInvalidElevation(elevation);
        const px = this.elevationConfigs[elevation].pixel;

        return this.getTintAlphaAtPixel(px);
    }

    public getHexAtPixel(px: Pixel, mode: ColorSchemeMode): HexColor {
        const num = typeof px === "number" ? px : Number.parseInt(px);
        const key = `${num}.${mode}`;
        if (this._cache.has(key)) {
            return this._cache.get(key) as HexColor;
        }

        const alpha = this.getTintAlphaAtPixel(num);
        const primary = this.colorScheme.getArgb("primary", mode);
        const surface = this.colorScheme.getArgb("surface", mode);
        const newPrimary = SurfaceElevations.setAlpha(primary, alpha);
        const newSurface = SurfaceElevations.compositeOver(newPrimary, surface);

        const h = hexFromArgb(newSurface) as HexColor;

        this._cache.set(key, h);

        return h;
    }

    public getArgbAtPixel(px: Pixel, mode: ColorSchemeMode): number {
        const hex = this.getHexAtPixel(px, mode);

        return argbFromHex(hex);
    }

    public getHctAtPixel(px: Pixel, mode: ColorSchemeMode): Hct {
        const argb = this.getArgbAtPixel(px, mode);

        return Hct.fromInt(argb);
    }

    private get configKeys() {
        return Object.keys(this.elevationConfigs) as (
            | TCustomElevation
            | BaseElevation
        )[];
    }

    private mapConfigKeyValueRecord<T>(
        fn: (key: TCustomElevation | BaseElevation) => T,
    ) {
        return Object.fromEntries(
            this.configKeys.map((key) => [key, fn(key)]),
        ) as Record<TCustomElevation | BaseElevation, T>;
    }

    public allHexElevations(
        mode: ColorSchemeMode,
    ): Record<TCustomElevation | BaseElevation, HexColor> {
        return this.mapConfigKeyValueRecord((key) => this.getHex(key, mode));
    }

    public allArgbElevations(
        mode: ColorSchemeMode,
    ): Record<TCustomElevation | BaseElevation, number> {
        return this.mapConfigKeyValueRecord((key) => this.getArgb(key, mode));
    }

    public allHctElevations(
        mode: ColorSchemeMode,
    ): Record<TCustomElevation | BaseElevation, Hct> {
        return this.mapConfigKeyValueRecord((key) => this.getHct(key, mode));
    }
}
