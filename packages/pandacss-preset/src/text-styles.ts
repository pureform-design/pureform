import {
    defineTextStyles as pandaDefineTextStyles,
    type CompositionStyles,
} from "@pandacss/dev";
import {
    Typography,
    type BaseTextStyleName,
    type TextStyleArgs,
} from "@repo/ui-utils";
import type { Prefix } from "./types";
import { normalizePrefix } from "./helpers";

export type DefineTextStylesArgs<
    TCustomTextStyleNames extends string = BaseTextStyleName,
> = { custom?: TextStyleArgs<TCustomTextStyleNames>["custom"] } & {
    prefix?: Prefix;
};

export function defineTextStyles<
    TCustomTextStyleNames extends string = BaseTextStyleName,
>(args?: DefineTextStylesArgs<TCustomTextStyleNames | BaseTextStyleName>) {
    const t = Typography.create({
        custom: args?.custom ?? {},
    });
    const all = t.all();

    const styles: CompositionStyles["textStyles"] = {};

    const prefix = normalizePrefix(args?.prefix);

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
