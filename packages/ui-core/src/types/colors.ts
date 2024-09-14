export type Tones =
  | 0
  | 2
  | 4
  | 6
  | 8
  | 10
  | 12
  | 17
  | 20
  | 22
  | 24
  | 30
  | 40
  | 50
  | 60
  | 70
  | 80
  | 87
  | 90
  | 92
  | 94
  | 95
  | 96
  | 98
  | 99
  | 100;

export type TonalPalette = Record<Tones, string>;

export type AccentColor = "primary" | "secondary" | "tertiary";

export type SemanticColor = "success" | "warning" | "error";

export type BaseKeyColor = AccentColor | SemanticColor;

export type NeutralColor = "neutral" | "neutralVariant";

export type BaseColor = AccentColor | SemanticColor | NeutralColor;

export type SystemKeyColor<KeyColor extends string> = Record<
  | `${KeyColor}`
  | `on${Capitalize<KeyColor>}`
  | `on${Capitalize<KeyColor>}Low`
  | `on${Capitalize<KeyColor>}Lowest`
  | `${KeyColor}Container`
  | `on${Capitalize<KeyColor>}Container`
  | `on${Capitalize<KeyColor>}ContainerLow`
  | `on${Capitalize<KeyColor>}ContainerLowest`
  // Additional
  | `${KeyColor}Fixed`
  | `${KeyColor}FixedDim`
  | `on${Capitalize<KeyColor>}Fixed`
  | `on${Capitalize<KeyColor>}FixedVariant`,
  string
>;

export type SystemNeutralColors = {
  surface: string;
  surfaceDim: string;
  surfaceBright: string;

  surfaceContainerHighest: string;
  surfaceContainerHigh: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerLowest: string;

  onSurface: string;
  onSurfaceLow: string;
  onSurfaceLowest: string;

  surfaceVariant: string;
  onSurfaceVariant: string;
  onSurfaceVariantLow: string;
  onSurfaceVariantLowest: string;

  background: string;
  onBackground: string;
  onBackgroundLow: string;
  onBackgroundLowest: string;

  outline: string;
  outlineVariant: string;

  inverseSurface: string;
  inverseOnSurface: string;

  scrim: string;
  shadow: string;
  black: string;
  white: string;
};

export type SystemExtraColors = {
  surfaceTint: string;
  inversePrimary: string;
};

export type ReferencePalette<CustomColors extends string = BaseKeyColor> =
  Record<NeutralColor, TonalPalette> &
    Record<CustomColors | BaseKeyColor, TonalPalette>;

export type SystemColorScheme<CustomKeyColors extends string = BaseKeyColor> =
  SystemNeutralColors &
    SystemExtraColors &
    SystemKeyColor<CustomKeyColors | BaseKeyColor>;
