// The anatomy's shape: a component's parts, how they nest, and the attributes each one carries.

/** One part of a component: an element a binding renders. */
export interface PartAnatomy<P extends string = string> {
    /** The part's name: its AST slot's name, or an extra part's (`hiddenSelect`). */
    readonly name: P;
    /** The value of `data-pf-part`: the name in kebab case (`touch-target`). */
    readonly attribute: string;
    /** The default `data-testid`: `pf-<component>-<part>`, in kebab case. */
    readonly testId: string;
    /** The part directly around it in the AST's `structure`, or `null` for the outermost. */
    readonly parent: P | null;
    /** The parts directly inside it, in the order `structure` lists them. */
    readonly children: readonly P[];
    /** Whether the registry styles it: `true` for an AST slot, `false` for an extra part. */
    readonly styled: boolean;
    /** Whether it's an icon that flips under `rtl` when marked: the part takes a `mirror` prop
     *  and sets `data-pf-mirror` (or the `mirrored` state on React Native). */
    readonly mirror: boolean;
    /** The registry slot that styles it and takes the provider's `slotProps`, when that isn't
     *  its name, or `null` for none: a menu's surface is its `content` part, drawn by the menu's
     *  `root` slot, while its unstyled `root` wraps the trigger and the surface. */
    readonly slot?: string | null;
}

/** A component's anatomy: its parts, by name, and where they sit. */
export interface ComponentAnatomy<
    N extends string = string,
    P extends string = string,
> {
    /** The component's name in the config (`iconButton`). */
    readonly name: N;
    /** The value of `data-scope`: the name in kebab case (`icon-button`). */
    readonly scope: string;
    /** The outermost part. */
    readonly root: P;
    /** Every part's name: the AST's slots in order, then the extra parts. */
    readonly partNames: readonly P[];
    /** Every part, by name. */
    readonly parts: { readonly [K in P]: PartAnatomy<P> };
}

/** A component anatomy's part names. */
export type PartName<A extends ComponentAnatomy> = A["partNames"][number];

/** A part that isn't an AST slot, so the registry doesn't style it, such as the select's
 *  hidden native `<select>`. */
export interface ExtraPart {
    readonly name: string;
    /** The part it renders inside. */
    readonly parent: string;
}
