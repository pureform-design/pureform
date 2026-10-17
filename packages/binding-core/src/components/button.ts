// The button's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and the button machine, and the content props of the ready-made button.

import type {
    buttonAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import type { VariantProp } from "./variants";

/** The button's parts: `"root" | "label" | "icon" | "touchTarget"`. */
export type ButtonPart = PartName<typeof buttonAnatomy>;

/** The button's variant groups and instance tokens. */
export interface ButtonVariantProps {
    readonly color?: VariantProp<"button", "color">;
    readonly variant?: VariantProp<"button", "variant">;
    readonly size?: VariantProp<"button", "size">;
    readonly density?: VariantProp<"button", "density">;
    readonly tokens?: InstanceTokens<"button"> | undefined;
}

/** The ids of the button's elements, for composition. */
export interface ButtonElementIds {
    readonly root?: string | undefined;
    readonly label?: string | undefined;
}

/** What the button machine takes from Root's props. */
export interface ButtonBehaviorProps extends Controllable<"selected", boolean> {
    /** A disabled fieldset around the button disables it too. */
    readonly disabled?: boolean | undefined;
    /** The native button type. @default "button" */
    readonly type?: "button" | "submit" | "reset" | undefined;
    readonly name?: string | undefined;
    readonly value?: string | undefined;
    /** The id of the form the button belongs to, for a button outside it. */
    readonly form?: string | undefined;
    /** Whether a press toggles `selected`, which `aria-pressed` reports.
     *  @default true when `selected` or `defaultSelected` is given */
    readonly toggle?: boolean | undefined;
    /** The root element's id; the machine finds the element by it. */
    readonly id?: string | undefined;
    readonly ids?: ButtonElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ButtonRootOwnProps
    extends ButtonVariantProps, ButtonBehaviorProps, InteractiveProps {
    /** A prefix for every part's test id (`save` → `save-root`), or ids by part. */
    readonly testId?: TestIdOverride<ButtonPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ButtonPart> | undefined;
}

/** The keys of `ButtonRootOwnProps`, which Root keeps off its element. */
export const BUTTON_ROOT_PROPS = [
    "color",
    "variant",
    "size",
    "density",
    "tokens",
    "disabled",
    "type",
    "name",
    "value",
    "form",
    "toggle",
    "id",
    "ids",
    "selected",
    "defaultSelected",
    "onSelectedChange",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof ButtonRootOwnProps)[];

/** The registry selection from Root's props. */
export const buttonSelection = (
    props: ButtonVariantProps,
): Selection<"button"> => ({
    color: props.color,
    variant: props.variant,
    size: props.size,
    density: props.density,
    tokens: props.tokens,
});

/** The button machine's props from Root's, besides `id`, `dir`, and the controllable `selected`
 *  (the binding's `useControllable`). Root's `id` becomes the machine's root id. */
export const buttonMachineProps = (props: ButtonBehaviorProps) => ({
    disabled: props.disabled,
    type: props.type,
    name: props.name,
    value: props.value,
    form: props.form,
    toggle: props.toggle,
    ids: { root: props.id ?? props.ids?.root, label: props.ids?.label },
});

/** What the ready-made button renders inside Root, in the framework's node type. */
export interface ButtonContentProps<Node> {
    /** The label's content. */
    readonly label?: Node;
    /** The icon's content; the icon part renders only when given. */
    readonly icon?: Node;
    /** Flips the icon under right to left, for an icon that points. */
    readonly mirrorIcon?: boolean | undefined;
}

/** The keys of `ButtonContentProps`. */
export const BUTTON_CONTENT_PROPS = [
    "label",
    "icon",
    "mirrorIcon",
] as const satisfies readonly (keyof ButtonContentProps<unknown>)[];
