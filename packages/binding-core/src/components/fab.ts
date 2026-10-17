// The FAB's contract, shared by every binding: the props Root takes for itself, how they map onto
// the selection and the button machine, and the content of the ready-made FAB. A FAB doesn't
// toggle. With a label it's an extended FAB; without one it shows only its icon and needs an
// accessible name.

import type { fabAnatomy, PartName, TestIdOverride } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { ButtonElementIds } from "./button";
import type { InteractiveProps } from "./indication";
import type { VariantProp } from "./variants";

/** The FAB's parts: `"root" | "touchTarget" | "container" | "icon" | "label"`. */
export type FabPart = PartName<typeof fabAnatomy>;

/** The FAB's variant groups and instance tokens. */
export interface FabVariantProps {
    readonly color?: VariantProp<"fab", "color">;
    readonly variant?: VariantProp<"fab", "variant">;
    readonly size?: VariantProp<"fab", "size">;
    /** Room for a label beside the icon. The ready-made FAB sets it when given a `label`. */
    readonly extended?: VariantProp<"fab", "extended">;
    readonly shape?: VariantProp<"fab", "shape">;
    readonly tokens?: InstanceTokens<"fab"> | undefined;
}

/** What the button machine takes from Root's props: a button's, without the toggle. */
export interface FabBehaviorProps {
    /** A disabled fieldset around the FAB disables it too. */
    readonly disabled?: boolean | undefined;
    /** The native button type. @default "button" */
    readonly type?: "button" | "submit" | "reset" | undefined;
    readonly name?: string | undefined;
    readonly value?: string | undefined;
    /** The id of the form the button belongs to, for a FAB outside it. */
    readonly form?: string | undefined;
    /** The root element's id; the machine finds the element by it. */
    readonly id?: string | undefined;
    readonly ids?: ButtonElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface FabRootOwnProps
    extends FabVariantProps, FabBehaviorProps, InteractiveProps {
    /** A prefix for every part's test id (`compose` → `compose-icon`), or ids by part. */
    readonly testId?: TestIdOverride<FabPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<FabPart> | undefined;
}

/** The keys of `FabRootOwnProps`, which Root keeps off its element. */
export const FAB_ROOT_PROPS = [
    "color",
    "variant",
    "size",
    "extended",
    "shape",
    "tokens",
    "disabled",
    "type",
    "name",
    "value",
    "form",
    "id",
    "ids",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof FabRootOwnProps)[];

/** The registry selection from Root's props. */
export const fabSelection = (props: FabVariantProps): Selection<"fab"> => ({
    color: props.color,
    variant: props.variant,
    size: props.size,
    extended: props.extended,
    shape: props.shape,
    tokens: props.tokens,
});

/** The button machine's props from Root's, besides `id` and `dir`: never a toggle. */
export const fabMachineProps = (props: FabBehaviorProps) => ({
    disabled: props.disabled,
    type: props.type,
    name: props.name,
    value: props.value,
    form: props.form,
    toggle: false,
    ids: { root: props.id ?? props.ids?.root, label: props.ids?.label },
});

/** What the ready-made FAB renders inside Root, in the framework's node type. */
export interface FabContentProps<Node> {
    /** The icon, in the container. */
    readonly icon?: Node;
    /** The label beside the icon, which makes it an extended FAB. */
    readonly label?: Node;
    /** Flips the icon under right to left, for an icon that points. */
    readonly mirrorIcon?: boolean | undefined;
}

/** The keys of `FabContentProps`. */
export const FAB_CONTENT_PROPS = [
    "icon",
    "label",
    "mirrorIcon",
] as const satisfies readonly (keyof FabContentProps<unknown>)[];
