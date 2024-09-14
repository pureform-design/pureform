export type FontStyle = {
  font: string;
  lineHeight: string;
  size: string;
  weight: string;
  tracking: string;
};

export type BaseTypescale =
  | "displayLarge"
  | "displayMedium"
  | "displaySmall"
  | "headlineLarge"
  | "headlineMedium"
  | "headlineSmall"
  | "titleLarge"
  | "titleMedium"
  | "titleSmall"
  | "bodyLarge"
  | "bodyMedium"
  | "bodySmall"
  | "labelLarge"
  | "labelMedium"
  | "labelSmall";

export type Typescales<CustomTypescales extends string = BaseTypescale> =
  Record<BaseTypescale | CustomTypescales, FontStyle>;
