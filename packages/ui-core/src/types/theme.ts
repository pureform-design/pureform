import type {
  BaseElevationLevel,
  BaseKeyColor,
  BaseShapeSize,
  BaseState,
  BaseTypescale,
  Elevations,
  ReferencePalette,
  Shapes,
  States,
  SystemColorScheme,
  Typescales,
} from ".";

export type MaterialDesignTheme<
  TCustomKeyColors extends string = BaseKeyColor,
  TCustomElevations extends string = BaseElevationLevel,
  TCustomShapeSizes extends string = BaseShapeSize,
  TCustomTypescales extends string = BaseTypescale,
  TCustomStates extends string = BaseState,
> = {
  ref: { palette: ReferencePalette<TCustomKeyColors> };
  sys: {
    color: SystemColorScheme<TCustomKeyColors>;
    state: States<TCustomStates>;
    shape: Shapes<TCustomShapeSizes>;
    elevation: Elevations<TCustomElevations>;
    typescale: Typescales<TCustomTypescales>;
  };
};
