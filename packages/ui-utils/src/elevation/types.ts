import type { Pixel } from "../types";

export type BoxShadow = {
    offsetX: Pixel;
    offsetY: Pixel;
    spreadRadius: Pixel;
    blurRadius: Pixel;
};

export type ShadowElevation = {
    umbra: BoxShadow;
    penumbra: BoxShadow;
    ambient: BoxShadow;
};

export type BaseElevation =
    | "level0"
    | "level1"
    | "level2"
    | "level3"
    | "level4"
    | "level5";

export type ElevationConfig = {
    pixel: Pixel;
};
