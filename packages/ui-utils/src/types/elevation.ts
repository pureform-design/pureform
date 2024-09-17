import type { Pixel } from ".";

export type BoxShadow = {
  offsetX: Pixel;
  offsetY: Pixel;
  spreadRadius: Pixel;
  blurRadius: Pixel;
};

export type Elevation = {
  shadow: {
    umbra: BoxShadow;
    penumbra: BoxShadow;
  };
};

export type BaseElevationLevel =
  | "level0"
  | "level1"
  | "level2"
  | "level3"
  | "level4"
  | "level5";

export type Elevations<CustomElevations extends string = BaseElevationLevel> =
  Record<BaseElevationLevel | CustomElevations, Elevation>;
