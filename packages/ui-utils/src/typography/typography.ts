import { deepMerge } from "@repo/utils";
import type { BaseTextStyleName, TextStyle } from "../types";
import type { DeepPartial } from "@repo/type-utils";

type OverrideTextStyles<
    TCustomTextStyleName extends string = BaseTextStyleName,
> = DeepPartial<Record<BaseTextStyleName, TextStyle>> &
    Partial<Record<TCustomTextStyleName, TextStyle>>;

export class Typography<
    TCustomTextStyleName extends string = BaseTextStyleName,
> {
    private _scale: Record<
        TCustomTextStyleName | BaseTextStyleName,
        TextStyle
    > = {
        displayLarge: {
            font: "Roboto",
            lineHeight: "4rem",
            size: "3.5625rem",
            tracking: "0rem",
            weight: "400",
        },
        displayMedium: {
            font: "Roboto",
            lineHeight: "3.25rem",
            size: "2.8125rem",
            tracking: "0rem",
            weight: "400",
        },
        displaySmall: {
            font: "Roboto",
            lineHeight: "2.75rem",
            size: "2.25rem",
            tracking: "0rem",
            weight: "400",
        },
        headlineLarge: {
            font: "Roboto",
            lineHeight: "2.5rem",
            size: "2rem",
            tracking: "0rem",
            weight: "400",
        },
        headlineMedium: {
            font: "Roboto",
            lineHeight: "2.25rem",
            size: "1.75rem",
            tracking: "0rem",
            weight: "400",
        },
        headlineSmall: {
            font: "Roboto",
            lineHeight: "2rem",
            size: "1.5rem",
            tracking: "0rem",
            weight: "400",
        },
        titleLarge: {
            font: "Roboto",
            lineHeight: "1.75rem",
            size: "1.375rem",
            tracking: "0rem",
            weight: "400",
        },
        titleMedium: {
            font: "Roboto",
            lineHeight: "1.5rem",
            size: "1rem",
            tracking: "0.009375rem",
            weight: "500",
        },
        titleSmall: {
            font: "Roboto",
            lineHeight: "1.25rem",
            size: "0.875rem",
            tracking: "0.00625rem",
            weight: "500",
        },
        bodyLarge: {
            font: "Roboto",
            lineHeight: "1.5rem",
            size: "1rem",
            tracking: "0.03125rem",
            weight: "400",
        },
        bodyMedium: {
            font: "Roboto",
            lineHeight: "1.25rem",
            size: "0.875rem",
            tracking: "0.015625rem",
            weight: "400",
        },
        bodySmall: {
            font: "Roboto",
            lineHeight: "1rem",
            size: "0.75rem",
            tracking: "0.025rem",
            weight: "400",
        },
        labelLarge: {
            font: "Roboto",
            lineHeight: "1.25rem",
            size: "14px",
            tracking: "0.00625rem",
            weight: "500",
        },
        labelMedium: {
            font: "Roboto",
            lineHeight: "1rem",
            size: "0.75rem",
            tracking: "0.03125rem",
            weight: "500",
        },
        labelSmall: {
            font: "Roboto",
            lineHeight: "1rem",
            size: "0.6875rem",
            tracking: "0.03125rem",
            weight: "500",
        },
    } as Record<TCustomTextStyleName | BaseTextStyleName, TextStyle>;

    public static create<
        TCustomTextStyleName extends string = BaseTextStyleName,
    >(
        overrides?: OverrideTextStyles<TCustomTextStyleName>,
    ): Typography<TCustomTextStyleName> {
        return new Typography(overrides);
    }

    public copy(
        overrides?: DeepPartial<
            Record<BaseTextStyleName | TCustomTextStyleName, TextStyle>
        >,
    ): Typography<TCustomTextStyleName> {
        const newTypography = new Typography<TCustomTextStyleName>();

        newTypography._scale = deepMerge(
            this._scale,
            (overrides ?? {}) as Record<BaseTextStyleName, TextStyle>,
        );

        return newTypography;
    }

    protected constructor(
        overrides?: OverrideTextStyles<TCustomTextStyleName>,
    ) {
        this._scale = deepMerge(
            this._scale,
            (overrides ?? {}) as Record<BaseTextStyleName, TextStyle>,
        );
    }

    public get(style: BaseTextStyleName | TCustomTextStyleName): TextStyle {
        return this._scale[style];
    }

    public all(): Readonly<
        Record<BaseTextStyleName | TCustomTextStyleName, TextStyle>
    > {
        return this._scale;
    }
}
