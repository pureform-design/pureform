import type { DeepPartial } from "@pureform/type-utils";
import { deepMerge } from "@pureform/utils";

import type {
    BaseFontRole,
    BaseTextStyleName,
    FontStack,
    TextStyle,
} from "../types";

export type TypographyArgs<
    TCustomTextStyleName extends string = BaseTextStyleName,
    TFontRole extends string = never,
> = {
    /** Font stacks per role. `brand` and `plain` always exist and default to Roboto; set
     *  them to change the typeface, or name a new role (`mono`) to add one. */
    fonts?: Partial<Record<BaseFontRole, FontStack>> &
        Record<TFontRole, FontStack>;
    /** Changes to the built-in styles, or new styles. */
    custom?: {
        [
            K in BaseTextStyleName | TCustomTextStyleName
        ]?: K extends BaseTextStyleName
            ? DeepPartial<TextStyle<NoInfer<TFontRole>>>
            : TextStyle<NoInfer<TFontRole>>;
    };
};

const BASE_FONT_ROLES: BaseFontRole[] = ["brand", "plain"];

const DEFAULT_FONTS: Record<BaseFontRole, FontStack> = {
    brand: { families: ["Roboto"], generic: "sans-serif" },
    plain: { families: ["Roboto"], generic: "sans-serif" },
};

type Scale<TStyle extends string, TFont extends string> = Record<
    TStyle | BaseTextStyleName,
    TextStyle<TFont>
>;

const baseScale = (): Scale<BaseTextStyleName, never> => ({
    displayLarge: {
        font: "brand",
        lineHeight: "4rem",
        fontSize: "3.5625rem",
        letterSpacing: "0rem",
        fontWeight: 400,
    },
    displayMedium: {
        font: "brand",
        lineHeight: "3.25rem",
        fontSize: "2.8125rem",
        letterSpacing: "0rem",
        fontWeight: 400,
    },
    displaySmall: {
        font: "brand",
        lineHeight: "2.75rem",
        fontSize: "2.25rem",
        letterSpacing: "0rem",
        fontWeight: 400,
    },
    headlineLarge: {
        font: "brand",
        lineHeight: "2.5rem",
        fontSize: "2rem",
        letterSpacing: "0rem",
        fontWeight: 400,
    },
    headlineMedium: {
        font: "brand",
        lineHeight: "2.25rem",
        fontSize: "1.75rem",
        letterSpacing: "0rem",
        fontWeight: 400,
    },
    headlineSmall: {
        font: "brand",
        lineHeight: "2rem",
        fontSize: "1.5rem",
        letterSpacing: "0rem",
        fontWeight: 400,
    },
    titleLarge: {
        font: "brand",
        lineHeight: "1.75rem",
        fontSize: "1.375rem",
        letterSpacing: "0rem",
        fontWeight: 400,
    },
    titleMedium: {
        font: "brand",
        lineHeight: "1.5rem",
        fontSize: "1rem",
        letterSpacing: "0.009375rem",
        fontWeight: 500,
    },
    titleSmall: {
        font: "brand",
        lineHeight: "1.25rem",
        fontSize: "0.875rem",
        letterSpacing: "0.00625rem",
        fontWeight: 500,
    },
    bodyLarge: {
        font: "plain",
        lineHeight: "1.5rem",
        fontSize: "1rem",
        letterSpacing: "0.03125rem",
        fontWeight: 400,
    },
    bodyMedium: {
        font: "plain",
        lineHeight: "1.25rem",
        fontSize: "0.875rem",
        letterSpacing: "0.015625rem",
        fontWeight: 400,
    },
    bodySmall: {
        font: "plain",
        lineHeight: "1rem",
        fontSize: "0.75rem",
        letterSpacing: "0.025rem",
        fontWeight: 400,
    },
    labelLarge: {
        font: "plain",
        lineHeight: "1.25rem",
        fontSize: "14px",
        letterSpacing: "0.00625rem",
        fontWeight: 500,
    },
    labelMedium: {
        font: "plain",
        lineHeight: "1rem",
        fontSize: "0.75rem",
        letterSpacing: "0.03125rem",
        fontWeight: 500,
    },
    labelSmall: {
        font: "plain",
        lineHeight: "1rem",
        fontSize: "0.6875rem",
        letterSpacing: "0.03125rem",
        fontWeight: 500,
    },
});

export class Typography<
    TCustomTextStyleName extends string = BaseTextStyleName,
    TFontRole extends string = never,
> {
    private _fonts: Record<BaseFontRole | TFontRole, FontStack>;
    private _scale: Scale<TCustomTextStyleName, TFontRole>;

    public static create<
        TCustomTextStyleName extends string = BaseTextStyleName,
        TFontRole extends string = never,
    >(
        args?: TypographyArgs<TCustomTextStyleName, TFontRole>,
    ): Typography<TCustomTextStyleName, TFontRole> {
        return new Typography(args);
    }

    public copy(
        args?: DeepPartial<Scale<TCustomTextStyleName, TFontRole>>,
    ): Typography<TCustomTextStyleName, TFontRole> {
        const next = new Typography<TCustomTextStyleName, TFontRole>({
            fonts: this._fonts,
        } as TypographyArgs<TCustomTextStyleName, TFontRole>);
        next._scale = deepMerge(this._scale, args ?? {}) as Scale<
            TCustomTextStyleName,
            TFontRole
        >;
        return next;
    }

    protected constructor(
        args?: TypographyArgs<TCustomTextStyleName, TFontRole>,
    ) {
        this._fonts = { ...DEFAULT_FONTS, ...args?.fonts } as Record<
            BaseFontRole | TFontRole,
            FontStack
        >;
        this._scale = deepMerge(baseScale(), args?.custom ?? {}) as Scale<
            TCustomTextStyleName,
            TFontRole
        >;
    }

    public get(
        style: BaseTextStyleName | TCustomTextStyleName,
    ): TextStyle<TFontRole> {
        return this._scale[style];
    }

    public all(): Readonly<Scale<TCustomTextStyleName, TFontRole>> {
        return this._scale;
    }

    /** The font stack per role, built-in and added. */
    public get fonts(): Readonly<Record<BaseFontRole | TFontRole, FontStack>> {
        return this._fonts;
    }

    /** The font roles, built-in first, then added ones in order. */
    public get fontRoles(): (BaseFontRole | TFontRole)[] {
        return [
            ...BASE_FONT_ROLES,
            ...Object.keys(this._fonts).filter(
                (role) => !BASE_FONT_ROLES.includes(role as BaseFontRole),
            ),
        ] as (BaseFontRole | TFontRole)[];
    }
}
