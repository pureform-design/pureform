import { deepMerge } from "@repo/utils";
import type { BaseTextStyleName, TextStyle } from "../types";
import type { DeepPartial } from "@repo/type-utils";

export type TextStyleArgs<
    TCustomTextStyleName extends string = BaseTextStyleName,
> = {
    custom: DeepPartial<Record<BaseTextStyleName, TextStyle>> &
        Partial<Record<TCustomTextStyleName, TextStyle>>;
};

export class Typography<
    TCustomTextStyleName extends string = BaseTextStyleName,
> {
    private _scale: Record<
        TCustomTextStyleName | BaseTextStyleName,
        TextStyle
    > = {
        displayLarge: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "4rem",
            fontSize: "3.5625rem",
            letterSpacing: "0rem",
            fontWeight: "400",
        },
        displayMedium: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "3.25rem",
            fontSize: "2.8125rem",
            letterSpacing: "0rem",
            fontWeight: "400",
        },
        displaySmall: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "2.75rem",
            fontSize: "2.25rem",
            letterSpacing: "0rem",
            fontWeight: "400",
        },
        headlineLarge: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "2.5rem",
            fontSize: "2rem",
            letterSpacing: "0rem",
            fontWeight: "400",
        },
        headlineMedium: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "2.25rem",
            fontSize: "1.75rem",
            letterSpacing: "0rem",
            fontWeight: "400",
        },
        headlineSmall: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "2rem",
            fontSize: "1.5rem",
            letterSpacing: "0rem",
            fontWeight: "400",
        },
        titleLarge: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "1.75rem",
            fontSize: "1.375rem",
            letterSpacing: "0rem",
            fontWeight: "400",
        },
        titleMedium: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "1.5rem",
            fontSize: "1rem",
            letterSpacing: "0.009375rem",
            fontWeight: "500",
        },
        titleSmall: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "1.25rem",
            fontSize: "0.875rem",
            letterSpacing: "0.00625rem",
            fontWeight: "500",
        },
        bodyLarge: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "1.5rem",
            fontSize: "1rem",
            letterSpacing: "0.03125rem",
            fontWeight: "400",
        },
        bodyMedium: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "1.25rem",
            fontSize: "0.875rem",
            letterSpacing: "0.015625rem",
            fontWeight: "400",
        },
        bodySmall: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "1rem",
            fontSize: "0.75rem",
            letterSpacing: "0.025rem",
            fontWeight: "400",
        },
        labelLarge: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "1.25rem",
            fontSize: "14px",
            letterSpacing: "0.00625rem",
            fontWeight: "500",
        },
        labelMedium: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "1rem",
            fontSize: "0.75rem",
            letterSpacing: "0.03125rem",
            fontWeight: "500",
        },
        labelSmall: {
            fontFamily: "Roboto, sans-serif",
            lineHeight: "1rem",
            fontSize: "0.6875rem",
            letterSpacing: "0.03125rem",
            fontWeight: "500",
        },
    } as Record<TCustomTextStyleName | BaseTextStyleName, TextStyle>;

    public static create<
        TCustomTextStyleName extends string = BaseTextStyleName,
    >(
        args?: TextStyleArgs<TCustomTextStyleName>,
    ): Typography<TCustomTextStyleName> {
        return new Typography(args);
    }

    public copy(
        args?: DeepPartial<
            Record<BaseTextStyleName | TCustomTextStyleName, TextStyle>
        >,
    ): Typography<TCustomTextStyleName> {
        const newTypography = new Typography<TCustomTextStyleName>();

        newTypography._scale = deepMerge(this._scale, args ?? {});

        return newTypography;
    }

    protected constructor(args?: TextStyleArgs<TCustomTextStyleName>) {
        this._scale = deepMerge(
            this._scale,
            (args?.custom ?? {}) as Record<BaseTextStyleName, TextStyle>,
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
