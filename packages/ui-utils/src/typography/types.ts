export type TextStyle = {
    readonly fontFamily: string;
    readonly lineHeight: string;
    readonly fontSize: string;
    readonly fontWeight: string;
    readonly letterSpacing: string;
};

export type BaseTextStyleName =
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
