import type { Pixel } from "./units";

export type BaseShapeSize =
    | "none"
    | "extraSmall"
    | "small"
    | "medium"
    | "large"
    | "extraLarge"
    | "full";

export type Shapes<CustomShapeSizes extends string = BaseShapeSize> = {
    corner: Record<BaseShapeSize | CustomShapeSizes, Pixel>;
};
