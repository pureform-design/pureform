import {
  CorePalette,
  argbFromHex,
  hexFromArgb,
  TonalPalette as MaterialTonalPalette,
  Blend,
} from "@material/material-color-utilities";
import type {
  BaseColor,
  BaseElevationLevel,
  MaterialDesignTheme,
  ReferencePalette,
  TonalPalette,
  Pixel,
  SystemKeyColor,
  SystemColorScheme,
  BoxShadow,
  Elevation,
  Elevations,
  BaseKeyColor,
  BaseShapeSize,
  BaseTypescale,
  BaseState,
} from "../types";
import deepClone from "just-clone";
import deepMerge from "deepmerge";

export type DeepRequired<T extends Record<string, unknown>> = {
  [P in keyof T]-?: T[P] extends Record<string, unknown>
    ? DeepRequired<T[P]>
    : T[P];
};

export type DeepPartial<T extends Record<string, unknown>> = {
  [P in keyof T]+?: T[P] extends Record<string, unknown>
    ? DeepPartial<T[P]>
    : T[P];
};

export type DeepNullable<T extends Record<string, unknown>> = {
  [P in keyof T]: T[P] extends Record<string, unknown>
    ? DeepPartial<T[P]>
    : T[P] | null;
};

export type NullifyLeafNodes<T extends Record<string, unknown>> = {
  [P in keyof T]: T[P] extends Record<string, unknown>
    ? NullifyLeafNodes<T[P]>
    : null;
};

export type DeepReadOnly<T extends Record<string, unknown>> = {
  +readonly [P in keyof T]: T[P] extends Record<string, unknown>
    ? DeepPartial<T[P]>
    : T[P];
};

export type DeepMerge<
  T1 extends Record<string, unknown>,
  T2 extends Record<string, unknown>,
> = {
  [P in keyof T1 | keyof T2]: P extends Record<string, unknown>
    ? never
    : (T1 & T2)[P];
};

type HexColor = `#${string}`;

type ColorConfig = {
  hex: HexColor;
  /**
   * Harmonize color with the main color
   *
   * @default true
   */
  harmonize?: boolean;
};

type TypographyConfig = {
  font?: string;
};

type ColorOptions<TCustomKeyColors extends string = BaseKeyColor> = {
  scheme?: "dark" | "light";
  themeSeed?: HexColor;
  customColorSeeds?: Partial<Record<TCustomKeyColors | BaseColor, ColorConfig>>;
};

type ElevationOptions<CustomElevations extends string = BaseElevationLevel> =
  DeepPartial<
    Record<BaseElevationLevel, `${number}px`> &
      Record<CustomElevations, `${number}px`>
  >;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nullifyLeafNodesImpl(clone: any): any {
  for (const [k, v] of Object.entries(clone)) {
    if (typeof clone[k] === "object" && clone[k] !== null) {
      clone[k] = nullifyLeafNodesImpl(v);
    } else {
      clone[k] = null;
    }
  }

  return clone;
}

export function nullifyLeafNodes<T extends Record<string, unknown>>(
  o: T,
): NullifyLeafNodes<T> {
  // clone the object so we don't mutate the original, then nullify all values
  // in a recursive manner
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clone: any = deepClone(o);

  return nullifyLeafNodesImpl(clone) as NullifyLeafNodes<T>;
}

export type MaterialDesignConfig<
  CustomColors extends string = BaseKeyColor,
  CustomElevations extends string = BaseElevationLevel,
  CustomShapeSizes extends string = BaseShapeSize,
  CustomTypescales extends string = BaseTypescale,
  CustomStates extends string = BaseState,
> = {
  options?: {
    color?: ColorOptions<CustomColors>;
    elevation?: ElevationOptions<CustomElevations>;
    typography?: TypographyConfig;
  };
  overrides?: DeepPartial<
    MaterialDesignTheme<
      CustomColors,
      CustomElevations,
      CustomShapeSizes,
      CustomTypescales,
      CustomStates
    >
  >;
};

const materialDefaultOptions = {
  options: {
    color: {
      themeSeed: "#6750a4" as HexColor,
    },
    elevation: {
      level0: "0px" as `${number}px`,
      level1: "1px" as `${number}px`,
      level2: "2px" as `${number}px`,
      level3: "3px" as `${number}px`,
      level4: "4px" as `${number}px`,
      level5: "5px" as `${number}px`,
    },
  },
  overrides: {},
} satisfies DeepPartial<MaterialDesignConfig>;

export function materialDesignTheme<
  CustomColors extends string = BaseKeyColor,
  CustomElevations extends string = BaseElevationLevel,
  CustomShapeSizes extends string = BaseShapeSize,
  CustomTypescales extends string = BaseTypescale,
  CustomStates extends string = BaseState,
>(
  opts?: MaterialDesignConfig<
    CustomColors,
    CustomElevations,
    CustomShapeSizes,
    CustomTypescales,
    CustomStates
  >,
) {
  const mergedOpts = deepMerge(materialDefaultOptions, opts ?? {});
  const refPalette = createReferencePalette<CustomColors>(
    mergedOpts.options.color,
  );
  const colorScheme = createColorScheme(
    refPalette,
    opts?.options?.color?.scheme ?? "light",
  );

  return deepMerge(
    {
      ref: {
        palette: refPalette,
      },
      sys: {
        color: colorScheme,
        state: {
          hovered: {
            stateLayer: { opacity: "8%" },
            content: {
              opacity: "100%",
            },
            container: {
              opacity: "100%",
            },
          },
          focused: {
            stateLayer: { opacity: "12%" },
            content: {
              opacity: "100%",
            },
            container: {
              opacity: "100%",
            },
          },
          pressed: {
            stateLayer: { opacity: "12%" },
            content: {
              opacity: "100%",
            },
            container: {
              opacity: "100%",
            },
          },
          dragged: {
            stateLayer: { opacity: "16%" },
            content: {
              opacity: "100%",
            },
            container: {
              opacity: "100%",
            },
          },
          enabled: {
            stateLayer: { opacity: "0%" },
            content: {
              opacity: "100%",
            },
            container: {
              opacity: "100%",
            },
          },
          activated: {
            stateLayer: { opacity: "0%" },
            content: {
              opacity: "100%",
            },
            container: {
              opacity: "100%",
            },
          },
          selected: {
            stateLayer: { opacity: "0%" },
            content: {
              opacity: "100%",
            },
            container: {
              opacity: "100%",
            },
          },
          disabled: {
            content: { opacity: "38%" },
            stateLayer: { opacity: "0%" },
            container: { opacity: "12%" },
          },
        },
        shape: {
          corner: {
            none: "0px",
            extraSmall: "4px",
            small: "8px",
            medium: "12px",
            large: "16px",
            extraLarge: "28px",
            full: "9999px",
          },
        },
        typescale: {
          displayLarge: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "4rem",
            size: "3.5625rem",
            tracking: "0rem",
            weight: "400",
          },
          displayMedium: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "3.25rem",
            size: "2.8125rem",
            tracking: "0rem",
            weight: "400",
          },
          displaySmall: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "2.75rem",
            size: "2.25rem",
            tracking: "0rem",
            weight: "400",
          },
          headlineLarge: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "2.5rem",
            size: "2rem",
            tracking: "0rem",
            weight: "400",
          },
          headlineMedium: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "2.25rem",
            size: "1.75rem",
            tracking: "0rem",
            weight: "400",
          },
          headlineSmall: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "2rem",
            size: "1.5rem",
            tracking: "0rem",
            weight: "400",
          },
          titleLarge: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "1.75rem",
            size: "1.375rem",
            tracking: "0rem",
            weight: "400",
          },
          titleMedium: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "1.5rem",
            size: "1rem",
            tracking: "0.009375rem",
            weight: "500",
          },
          titleSmall: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "1.25rem",
            size: "0.875rem",
            tracking: "0.00625rem",
            weight: "500",
          },
          bodyLarge: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "1.5rem",
            size: "1rem",
            tracking: "0.03125rem",
            weight: "400",
          },
          bodyMedium: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "1.25rem",
            size: "0.875rem",
            tracking: "0.015625rem",
            weight: "400",
          },
          bodySmall: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "1rem",
            size: "0.75rem",
            tracking: "0.025rem",
            weight: "400",
          },
          labelLarge: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "1.25rem",
            size: "14px",
            tracking: "0.00625rem",
            weight: "500",
          },
          labelMedium: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "1rem",
            size: "0.75rem",
            tracking: "0.03125rem",
            weight: "500",
          },
          labelSmall: {
            font: mergedOpts.options.typography?.font ?? "Roboto",
            lineHeight: "1rem",
            size: "0.6875rem",
            tracking: "0.03125rem",
            weight: "500",
          },
        },
        elevation: createElevations<CustomElevations>(
          mergedOpts?.options?.elevation ?? {},
        ),
      },
    },
    opts?.overrides ?? {},
  ) as unknown as MaterialDesignTheme<
    CustomColors,
    CustomElevations,
    CustomShapeSizes,
    CustomTypescales,
    CustomStates
  >;
}

function createElevation(distance: Pixel): Elevation {
  return {
    shadow: {
      umbra: shadowUmbra(distance),
      penumbra: shadowPenumbra(distance),
    },
  };
}

function createElevations<CustomElevations extends string = BaseElevationLevel>(
  options: ElevationOptions,
): Elevations<CustomElevations> {
  const el: Record<string, Elevation> = {};

  for (const [key, distance] of Object.entries(options)) {
    const x = createElevation(distance ?? `0px`);
    el[key] = x;
  }

  return el as Elevations<CustomElevations>;
}

function capitalize<S extends string>(s: S): Capitalize<S> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<S>;
}

function createSystemKeyColors<C extends string>(
  color: C,
  tp: TonalPalette,
  mode: "light" | "dark" = "light",
): SystemKeyColor<C> {
  if (mode === "light") {
    return {
      [`${color}`]: tp[40],
      [`on${capitalize(color)}`]: tp[100],
      // NOTE: This is an extension
      [`on${capitalize(color)}Low`]: tp[90],
      [`on${capitalize(color)}Lowest`]: tp[80],
      [`${color}Container`]: tp[90],
      [`on${capitalize(color)}Container`]: tp[10],
      // NOTE: This is an extension
      [`on${capitalize(color)}ContainerLow`]: tp[30],
      [`on${capitalize(color)}ContainerLowest`]: tp[50],
      [`${color}Fixed`]: tp[90],
      [`on${capitalize(color)}Fixed`]: tp[10],
      [`${color}FixedDim`]: tp[80],
      [`on${capitalize(color)}FixedVariant`]: tp[30],
    } as unknown as SystemKeyColor<C>;
  }

  return {
    [`${color}`]: tp[80],
    [`on${capitalize(color)}`]: tp[20],
    // NOTE: This is an extension
    [`on${capitalize(color)}Low`]: tp[10],
    [`on${capitalize(color)}Lowest`]: tp[0],
    [`${color}Container`]: tp[30],
    [`on${capitalize(color)}Container`]: tp[90],
    // NOTE: This is an extension
    [`on${capitalize(color)}ContainerLow`]: tp[70],
    [`on${capitalize(color)}ContainerLowest`]: tp[50],
    [`${color}Fixed`]: tp[90],
    [`on${capitalize(color)}Fixed`]: tp[10],
    [`${color}FixedDim`]: tp[80],
    [`on${capitalize(color)}FixedVariant`]: tp[30],
  } as unknown as SystemKeyColor<C>;
}

function createColorScheme<CustomColors extends string = BaseKeyColor>(
  ref: ReferencePalette<CustomColors>,
  mode: "light" | "dark" = "light",
): SystemColorScheme<CustomColors> {
  let keyColors: Record<string, string> = {};

  for (const [color, palette] of Object.entries(ref)) {
    if (!["neutral", "neutralVariant"].includes(color)) {
      keyColors = {
        ...keyColors,
        ...createSystemKeyColors(color, palette, mode),
      };
    }
  }

  return {
    ...keyColors,
    // Neutrals
    outline: mode === "light" ? ref.neutralVariant[50] : ref.neutralVariant[60],
    outlineVariant:
      mode === "light" ? ref.neutralVariant[80] : ref.neutralVariant[30],
    surfaceBright: mode === "light" ? ref.neutral[98] : ref.neutral[24],
    surface: mode === "light" ? ref.neutral[98] : ref.neutral[6],
    surfaceDim: mode === "light" ? ref.neutral[87] : ref.neutral[6],
    surfaceContainerHighest:
      mode === "light" ? ref.neutral[90] : ref.neutral[22],
    surfaceContainerHigh: mode === "light" ? ref.neutral[92] : ref.neutral[17],
    surfaceContainer: mode === "light" ? ref.neutral[94] : ref.neutral[12],
    surfaceContainerLow: mode === "light" ? ref.neutral[96] : ref.neutral[10],
    surfaceContainerLowest:
      mode === "light" ? ref.neutral[100] : ref.neutral[4],

    onSurface: mode === "light" ? ref.neutral[10] : ref.neutral[90],
    onSurfaceLow: mode === "light" ? ref.neutral[20] : ref.neutral[80],
    onSurfaceLowest: mode === "light" ? ref.neutral[30] : ref.neutral[70],

    surfaceVariant:
      mode === "light" ? ref.neutralVariant[90] : ref.neutralVariant[30],

    onSurfaceVariant:
      mode === "light" ? ref.neutralVariant[30] : ref.neutralVariant[80],
    onSurfaceVariantLow:
      mode === "light" ? ref.neutralVariant[40] : ref.neutralVariant[70],
    onSurfaceVariantLowest:
      mode === "light" ? ref.neutralVariant[50] : ref.neutralVariant[60],

    background: mode === "light" ? ref.neutral[98] : ref.neutral[6],

    onBackground: mode === "light" ? ref.neutral[10] : ref.neutral[90],
    onBackgroundLow: mode === "light" ? ref.neutral[20] : ref.neutral[80],
    onBackgroundLowest: mode === "light" ? ref.neutral[30] : ref.neutral[70],

    // Extras
    white: ref.neutral[100],
    black: ref.neutral[0],
    scrim: ref.neutral[0],
    shadow: ref.neutral[0],
    inversePrimary: mode === "light" ? ref.primary[80] : ref.primary[40],
    inverseSurface: mode === "light" ? ref.neutral[20] : ref.neutral[90],
    inverseOnSurface: mode === "light" ? ref.neutral[95] : ref.neutral[20],
    surfaceTint: keyColors["primary"],
  } as unknown as SystemColorScheme<CustomColors>;
}

function toInternalTonalPalette(tp: MaterialTonalPalette): TonalPalette {
  return {
    0: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(0))),
    2: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(2))),
    4: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(4))),
    6: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(6))),
    8: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(8))),
    10: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(10))),
    12: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(12))),
    17: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(17))),
    20: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(20))),
    22: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(22))),
    24: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(24))),
    30: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(30))),
    40: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(40))),
    50: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(50))),
    60: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(60))),
    70: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(70))),
    80: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(80))),
    87: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(87))),
    90: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(90))),
    92: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(92))),
    94: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(94))),
    95: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(95))),
    96: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(96))),
    98: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(98))),
    99: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(99))),
    100: hexToRGBSpaceSeparated(hexFromArgb(tp.tone(100))),
  };
}

function createReferencePalette<TCustomKeyColor extends string = BaseKeyColor>(
  options?: ColorOptions<TCustomKeyColor>,
): ReferencePalette<TCustomKeyColor> {
  const mainColorArgb = argbFromHex(options?.themeSeed ?? "#6750a4");
  const cp = CorePalette.of(mainColorArgb);
  const repl = { ...options?.customColorSeeds };
  const warningHex = "#FFF01F";
  const successHex = "#39FF14";

  const warning = MaterialTonalPalette.fromInt(
    Blend.harmonize(argbFromHex(warningHex), mainColorArgb),
  );
  const success = MaterialTonalPalette.fromInt(
    Blend.harmonize(argbFromHex(successHex), mainColorArgb),
  );

  const rp: Record<string, TonalPalette> = {
    primary: toInternalTonalPalette(cp.a1),
    secondary: toInternalTonalPalette(cp.a2),
    tertiary: toInternalTonalPalette(cp.a3),
    success: toInternalTonalPalette(success),
    warning: toInternalTonalPalette(warning),
    error: toInternalTonalPalette(cp.error),
    neutral: toInternalTonalPalette(cp.n1),
    neutralVariant: toInternalTonalPalette(cp.n2),
  };

  for (const [key, value] of Object.entries(repl)) {
    if (value.harmonize ?? true) {
      const tp = MaterialTonalPalette.fromInt(
        Blend.harmonize(argbFromHex(value.hex), mainColorArgb),
      );
      rp[key] = toInternalTonalPalette(tp);
    } else {
      const tp = MaterialTonalPalette.fromInt(argbFromHex(value.hex));
      rp[key] = toInternalTonalPalette(tp);
    }
  }

  return rp as unknown as ReferencePalette<TCustomKeyColor>;
}

function hexToRGB(h: string): [number, number, number] {
  if (!isHexColor(h)) {
    throw new Error(`Invalid hex color: ${h}`);
  }

  const singleDigit = h.length === 4;

  const r = singleDigit ? parseInt(h[1]!) : parseInt(h[1]! + h[2]!, 16);
  const g = singleDigit ? parseInt(h[2]!) : parseInt(h[3]! + h[4]!, 16);
  const b = singleDigit ? parseInt(h[3]!) : parseInt(h[5]! + h[6]!, 16);

  return [r, g, b];
}

function hexToRGBSpaceSeparated(h: string): `${number} ${number} ${number}` {
  const [r, g, b] = hexToRGB(h);

  return `${r} ${g} ${b}`;
}

// function surfaceTintOpacity(elevationLevel: Pixel): number {
//   const px = parseInt(`${elevationLevel}`);
//
//   if (px === 0) {
//     return 0;
//   }
//
//   return Math.round(0.02 * px ** 3 - 0.4686 * px ** 2 + 3.8613 * px + 0.5689);
// }

function shadowUmbra(distance: Pixel): BoxShadow {
  const px = parseInt(`${distance}`);

  return {
    offsetX: "0px",
    offsetY: `${Math.round(
      px === 0 ? 0 : 0.0054 * px ** 3 - 0.0756 * px ** 2 + 0.4406 * px + 0.2473,
    )}px`,
    blurRadius: `${Math.round(
      px === 0 ? 0 : 0.0076 * px - 0.1573 * px + 1.0961 * px + 0.3605,
    )}px`,
    spreadRadius: "0px",
  };
}

function shadowPenumbra(distance: Pixel): BoxShadow {
  const px = parseInt(`${distance}`);

  return {
    offsetX: "0px",
    offsetY: `${Math.round(
      px === 0 ? 0 : -0.0032 * px + 0.0533 * px + 0.4782 * px + 0.187,
    )}px`,
    blurRadius: `${Math.round(
      px === 0 ? 0 : -0.0637 * px ** 2 + 1.6862 * px + 0.7669,
    )}px`,
    spreadRadius: `${Math.round(
      px === 0 ? 0 : 0.0042 * px ** 3 - 0.0783 * px ** 2 + 0.8299 * px + 0.0984,
    )}px`,
  };
}

export function defineThemeConfig<
  CustomColors extends string = BaseKeyColor,
  CustomElevations extends string = BaseElevationLevel,
  CustomShapeSizes extends string = BaseShapeSize,
  CustomTypescales extends string = BaseTypescale,
  CustomStates extends string = BaseState,
>(
  opts: MaterialDesignConfig<
    CustomColors,
    CustomElevations,
    CustomShapeSizes,
    CustomTypescales,
    CustomStates
  >,
) {
  return opts;
}

export function extendThemeConfig<
  CustomColors extends string = BaseKeyColor,
  CustomElevations extends string = BaseElevationLevel,
  CustomShapeSizes extends string = BaseShapeSize,
  CustomTypescales extends string = BaseTypescale,
  CustomStates extends string = BaseState,
>(
  defaultOpts: MaterialDesignConfig<
    CustomColors,
    CustomElevations,
    CustomShapeSizes,
    CustomTypescales,
    CustomStates
  >,
  extendOpts: MaterialDesignConfig<
    CustomColors,
    CustomElevations,
    CustomShapeSizes,
    CustomTypescales,
    CustomStates
  >,
) {
  return deepMerge(defaultOpts, extendOpts);
}

function isHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function omit<TObject extends object, TRemove extends keyof TObject>(
  obj: TObject,
  keys: TRemove[],
): Omit<TObject, TRemove> {
  const ret: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(obj)) {
    if (!keys.find((i) => i === k)) {
      ret[k] = v;
    }
  }

  return ret as Omit<TObject, TRemove>;
}
