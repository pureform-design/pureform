import type { Pixel } from ".";

export type BoxShadow = {
    offsetX: Pixel;
    offsetY: Pixel;
    spreadRadius: Pixel;
    blurRadius: Pixel;
};

export type BaseElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;
