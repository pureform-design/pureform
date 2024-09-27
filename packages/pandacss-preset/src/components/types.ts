import type {
    BaseColorGroup,
    BaseTextStyleName,
    ColorScheme,
    Typography,
} from "@repo/ui-utils";
import type { Prefix } from "../types";

export type BaseArgs = {
    prefix?: Prefix;
};

export type ColorArgs<TCustomColorGroups extends string = BaseColorGroup> = {
    colorScheme: ColorScheme<TCustomColorGroups>;
};

export type TypographyArgs<
    TCustomTextStyle extends string = BaseTextStyleName,
> = {
    typography: Typography<TCustomTextStyle>;
};
