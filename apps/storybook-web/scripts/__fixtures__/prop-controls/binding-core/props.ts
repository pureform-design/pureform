// Props as binding-core declares them, for `prop-controls.spec.ts`.

/** Resolves to `undefined` here, as with no registry: the group comes from the alias. */
export type VariantProp<C extends string, G extends string> =
    | C
    | G extends never
    ? never
    : undefined;

export interface FixtureVariantProps {
    readonly textStyle?: VariantProp<"text", "style">;
    readonly tone?: VariantProp<"text", "tone">;
}

export type Controllable<N extends string> = {
    readonly [K in N]?: boolean | undefined;
} & {
    /** @control none */
    readonly [K in `default${Capitalize<N>}`]?: boolean | undefined;
};

export interface FixtureProps
    extends FixtureVariantProps, Controllable<"selected"> {
    readonly size?: "small" | "large" | undefined;
    readonly disabled?: boolean | undefined;
    readonly placeholder?: string | undefined;
    readonly max?: number | undefined;
    readonly onChange?: ((value: string) => void) | undefined;
    readonly label?: string | number | { readonly type: string } | undefined;
    readonly ids?: { readonly root?: string } | undefined;
    readonly items?: readonly string[] | undefined;
    readonly mixed?: boolean | "indeterminate" | undefined;
    readonly count?: 1 | 2 | "auto" | undefined;
    readonly scale?: "xs" | "s" | "m" | "l" | undefined;
    /** @control radio */
    readonly wide?: "a" | "b" | "c" | "d" | undefined;
    /** @control select */
    readonly pair?: "left" | "right" | undefined;
    readonly flag?: true | false | undefined;
    readonly loose?: boolean | string | undefined;
    readonly tricky?: boolean | { readonly a: string } | undefined;
    /** Through an indexed access to a variant prop. */
    readonly color?: FixtureVariantProps["tone"];
    /** The root's id.
     *  @control none */
    readonly id?: string | undefined;
    /** @control text */
    readonly locale?: "en" | "fr" | undefined;
}
