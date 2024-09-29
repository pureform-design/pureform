import type {
    BaseColorGroup,
    BaseTextStyleName,
    ColorScheme,
    Typography,
} from "@pureform/ui-utils";
import type { NormalPrefix } from "../types";

export type BaseArgs = {
    prefix: NormalPrefix;
};

export type ColorArgs<TCustomColorGroups extends string = BaseColorGroup> = {
    colorScheme: ColorScheme<TCustomColorGroups>;
};

export type TypographyArgs<
    TCustomTextStyle extends string = BaseTextStyleName,
> = {
    typography: Typography<TCustomTextStyle>;
};
