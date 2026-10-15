// The class name runtime: a component's variant selections to its classes. It needs only a
// manifest of the component's variants, never its styles, and imports nothing, so ahead-of-time
// output ships just this file.
//
// Compound variants need no runtime: the stylesheet selects them by the variant classes chained.

/** What the runtime needs to know about a component. */
export interface ComponentManifest {
    /** The component's class, after any class prefix. */
    className: string;
    /** A slot component's slots, each of which gets its own classes. */
    slots?: readonly string[];
    /** Each variant group's values. */
    variants: Readonly<Record<string, readonly string[]>>;
    /** The value each group takes when a selection leaves it out. */
    defaultVariants: Readonly<Record<string, string>>;
}

/** A selection of variant values by group. A group whose values are `"true"` and `"false"`
 *  also takes a boolean. */
export type Choice<V> = {
    [G in keyof V]?: V[G] | ("true" extends V[G] ? boolean : never);
};

/** A component's class name function: its classes for a selection, or, for a slot component,
 *  each slot's classes. */
export type ComponentClasses<V, S extends string> = ((
    choice?: Choice<V>,
) => [S] extends [never] ? string : Record<S, string>) & {
    /** Each variant group's values. */
    readonly variantMap: { readonly [G in keyof V]: readonly V[G][] };
    /** The variant group names. */
    readonly variantKeys: readonly (keyof V & string)[];
    /** Split props into the variant selection and the rest. */
    splitVariantProps: <P extends Choice<V>>(
        props: P,
    ) => [Choice<V>, Omit<P, keyof V>];
};

const valueOf = (value: unknown): string | undefined =>
    value === true ? "true" : value === false ? "false" : (value as string);

const classList = (
    base: string,
    manifest: ComponentManifest,
    choice: Record<string, unknown>,
): string => {
    const classes = [base];
    for (const group of Object.keys(manifest.variants)) {
        const value = valueOf(choice[group]) ?? manifest.defaultVariants[group];
        if (value !== undefined) classes.push(`${base}--${group}_${value}`);
    }
    return classes.join(" ");
};

/** The class name function for a component's manifest. */
export const componentClasses = <
    V = Record<string, string>,
    S extends string = never,
>(
    manifest: ComponentManifest,
): ComponentClasses<V, S> => {
    const fn = (choice: Record<string, unknown> = {}) => {
        if (!manifest.slots)
            return classList(manifest.className, manifest, choice);
        return Object.fromEntries(
            manifest.slots.map((slot) => [
                slot,
                classList(`${manifest.className}__${slot}`, manifest, choice),
            ]),
        );
    };
    const keys = Object.keys(manifest.variants);
    return Object.assign(fn, {
        variantMap: manifest.variants,
        variantKeys: keys,
        splitVariantProps: (props: Record<string, unknown>) => {
            const choice: Record<string, unknown> = {};
            const rest: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(props)) {
                (keys.includes(key) ? choice : rest)[key] = value;
            }
            return [choice, rest];
        },
    }) as unknown as ComponentClasses<V, S>;
};
