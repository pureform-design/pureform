import {
    type CompositionStyles,
    defineTextStyles as pandaDefineTextStyles,
} from "@pandacss/dev";
import {
    type BaseTextStyleName,
    type TextStyleArgs,
    Typography,
} from "@pureform/ui-utils";
import type { NormalPrefix } from "./types";

export type DefineTextStylesArgs<
    TCustomTextStyleNames extends string = BaseTextStyleName,
> = { custom?: TextStyleArgs<TCustomTextStyleNames>["custom"] } & {
    prefix: NormalPrefix;
};

export function defineTextStyles<
    TCustomTextStyleNames extends string = BaseTextStyleName,
>(args: DefineTextStylesArgs<TCustomTextStyleNames | BaseTextStyleName>) {
    const t = Typography.create({
        custom: args?.custom ?? {},
    });
    const all = t.all();

    const styles: CompositionStyles["textStyles"] = {};

    const prefix = args.prefix;

    for (const name of Object.keys(all) as (keyof typeof all)[]) {
        const style = all[name];
        const actual = prefix.textStylePrefix
            ? `${prefix.textStylePrefix}.${name}`
            : name;
        styles[actual] = {
            value: style,
        };
    }

    return pandaDefineTextStyles(styles);
}
