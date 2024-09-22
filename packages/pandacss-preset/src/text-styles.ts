import {
    defineTextStyles as pandaDefineTextStyles,
    type CompositionStyles,
} from "@pandacss/dev";
import {
    Typography,
    type BaseTextStyleName,
    type TextStyleArgs,
} from "@repo/ui-utils";

export type DefineTextStylesArgs<
    TCustomTextStyleNames extends string = BaseTextStyleName,
> = { custom?: TextStyleArgs<TCustomTextStyleNames>["custom"] } & {
    prefix?: string;
};

export function defineTextStyles<
    TCustomTextStyleNames extends string = BaseTextStyleName,
>(args?: DefineTextStylesArgs<TCustomTextStyleNames | BaseTextStyleName>) {
    const t = Typography.create({
        custom: args?.custom ?? {},
    });
    const all = t.all();

    const styles: CompositionStyles["textStyles"] = {};

    for (const name of Object.keys(all) as (keyof typeof all)[]) {
        const style = all[name];
        const actual = args?.prefix ? `${args.prefix}.${name}` : name;
        styles[actual] = {
            value: style,
        };
    }

    return pandaDefineTextStyles(styles);
}
