// The button group's contract, shared by every binding: the props the group's Root takes for
// itself, how they map onto the selection and Zag's toggle group, the buttons the ready-made group
// takes as data, and each button's position. The group is the preset's `buttonGroup` (a row); its
// buttons are the preset's buttons and icon buttons, in the group's size, with a `position`: every
// button `single` in a standard group (it widens while pressed), and `first`, `middle` or `last`
// in a connected one (its inner corners square off). A selectable group makes them toggle buttons
// on Zag's toggle group, one or several on at once.

import type {
    buttonGroupAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { ButtonVariantProps } from "./button";
import type { IconButtonVariantProps } from "./icon-button";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import { tilePosition } from "./list";
import type { TilePosition } from "./list";
import type { VariantProp } from "./variants";

/** The group's own parts: `"root"`. */
export type ButtonGroupPart = PartName<typeof buttonGroupAnatomy>;

/** A grouped button's place: `single` in a standard group, its place in the run in a connected
 *  one. */
export type ButtonGroupPosition = TilePosition;

/** The group's variants and tokens. `size` is also every button's. */
export interface ButtonGroupVariantProps {
    /** The buttons' size, and the gap between them in a standard group. */
    readonly size?: VariantProp<"buttonGroup", "size">;
    /** Sets the buttons 2px apart with square inner corners, as the segmented button did. */
    readonly connected?: boolean | undefined;
    /** The group's own tokens (the button group recipe's). */
    readonly tokens?: InstanceTokens<"buttonGroup"> | undefined;
}

/** The buttons' variants, which the ready-made group gives every button. */
export interface ButtonGroupButtonVariantProps {
    readonly color?: ButtonVariantProps["color"];
    /** The buttons' fill (`filled`, `tonal`, `outlined`, …; an icon button's `standard` is a
     *  button's `text`). */
    readonly variant?: ButtonVariantProps["variant"];
    readonly corner?: ButtonVariantProps["corner"];
    readonly density?: ButtonVariantProps["density"];
}

/** What Zag's toggle group takes from Root's props. Without `selectable`, the group is a plain
 *  row of buttons. */
export interface ButtonGroupBehaviorProps extends Controllable<
    "value",
    string[]
> {
    /** Makes the buttons toggles: `single` keeps at most one on, `multiple` any number. */
    readonly selectable?: "single" | "multiple" | undefined;
    /** Whether a single-select group lets its one button go off again. @default true */
    readonly deselectable?: boolean | undefined;
    /** Disables every button. */
    readonly disabled?: boolean | undefined;
    /** The group element's id; the machine finds the element by it.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ButtonGroupRootOwnProps
    extends
        ButtonGroupVariantProps,
        ButtonGroupButtonVariantProps,
        ButtonGroupBehaviorProps,
        IndicationProps {
    /** The group element's test id: a prefix (`view` → `view-root`), or by part. */
    readonly testId?: TestIdOverride<ButtonGroupPart> | undefined;
    /** The group's parts, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ButtonGroupPart> | undefined;
}

/** The keys of `ButtonGroupRootOwnProps`, which Root keeps off its element. */
export const BUTTON_GROUP_ROOT_PROPS = [
    "size",
    "connected",
    "tokens",
    "color",
    "variant",
    "corner",
    "density",
    "selectable",
    "deselectable",
    "disabled",
    "id",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof ButtonGroupRootOwnProps)[];

/** One button of the ready-made group, as data. With a label it's a button; with only an icon,
 *  an icon button (name it with `aria-label`). */
export interface ButtonGroupItem<
    Node = unknown,
> extends InteractionSourceProps {
    /** Its value in a selectable group, and its key. @default its index */
    readonly value?: string | undefined;
    readonly label?: Node;
    readonly icon?: Node;
    /** The accessible name of an icon-only button. */
    readonly "aria-label"?: string | undefined;
    readonly disabled?: boolean | undefined;
    /** An icon button's width. */
    readonly width?: IconButtonVariantProps["width"];
    /** Called when it's pressed. */
    readonly onClick?: (() => void) | undefined;
    readonly testId?: string | undefined;
}

/** What the ready-made group renders inside Root. */
export interface ButtonGroupContentProps<Node> {
    /** The buttons, in order. */
    readonly items?: readonly ButtonGroupItem<Node>[] | undefined;
}

/** The keys of `ButtonGroupContentProps`. */
export const BUTTON_GROUP_CONTENT_PROPS = [
    "items",
] as const satisfies readonly (keyof ButtonGroupContentProps<unknown>)[];

/** The group's registry selection. `connected` only when on, so a standard group keeps its
 *  classes. */
export const buttonGroupSelection = (
    props: ButtonGroupVariantProps,
): Selection<"buttonGroup"> => ({
    size: props.size,
    connected: props.connected || undefined,
    tokens: props.tokens,
});

/** Where the button at `index` among `count` sits: `single` in a standard group, its place in
 *  the run in a connected one. */
export const buttonGroupPosition = (
    index: number,
    count: number,
    connected: boolean | undefined,
): ButtonGroupPosition => (connected ? tilePosition(index, count) : "single");

/** Zag's toggle group props from Root's, besides `id`, `dir`, and the controllable `value` (the
 *  binding's `useControllable`). */
export const buttonGroupMachineProps = (props: ButtonGroupBehaviorProps) => ({
    multiple: props.selectable === "multiple",
    deselectable: props.deselectable ?? true,
    disabled: props.disabled,
    orientation: "horizontal" as const,
});

/** Zag's root props for the group element: without its inline `style`, an outline reset the
 *  preset doesn't need. */
export const buttonGroupRootProps = <P extends object>(
    props: P,
): Omit<P, "style"> => {
    const { style: _style, ...rest } = props as P & { style?: unknown };
    return rest;
};

/** Zag's item props for a button in a selectable group, without what the button sets itself:
 *  its `id` and `disabled` (the button's own props), and `type`. */
export const buttonGroupItemProps = <P extends object>(
    props: P,
): Omit<P, "id" | "disabled" | "type"> => {
    const {
        id: _id,
        disabled: _disabled,
        type: _type,
        ...rest
    } = props as P & { id?: unknown; disabled?: unknown; type?: unknown };
    return rest;
};

/** A toggle group's value after pressing `value`, where no machine keeps it (React Native): on
 *  or off in a multiple-select group; alone, or off when deselectable, in a single-select one. */
export const toggleSelection = (
    current: readonly string[],
    value: string,
    multiple: boolean,
    deselectable: boolean,
): string[] => {
    const on = current.includes(value);
    if (multiple)
        return on ? current.filter((v) => v !== value) : [...current, value];
    return on ? (deselectable ? [] : [...current]) : [value];
};

/** What an item of a selectable group (a grouped button, a set's chip) takes from Zag's toggle
 *  group: its item props (`buttonGroupItemProps`), its `id` and `disabled`, and `selected` as
 *  its pressed state, which the group changes, not the item. */
export const toggleGroupItemProps = <I extends object, P extends object>(
    api: {
        getItemProps(item: I): P;
        getItemState(item: I): {
            readonly id: string;
            readonly disabled: boolean;
            readonly pressed: boolean;
        };
    },
    item: I,
) => {
    const state = api.getItemState(item);
    return {
        ...buttonGroupItemProps(api.getItemProps(item)),
        id: state.id,
        disabled: state.disabled,
        selected: state.pressed,
        onSelectedChange: () => {},
    };
};

/** The variants a grouped button takes from its group, under its own. */
export const groupedButtonVariants = <
    B extends ButtonGroupButtonVariantProps & {
        readonly size?: unknown;
        readonly position?: unknown;
    },
>(
    group: ButtonGroupVariantProps & ButtonGroupButtonVariantProps,
    button: B,
    position: ButtonGroupPosition,
) => ({
    color: button.color ?? group.color,
    variant: button.variant ?? group.variant,
    corner: button.corner ?? group.corner,
    density: button.density ?? group.density,
    size: (button.size ?? group.size) as B["size"],
    position: (button.position ?? position) as ButtonGroupPosition,
});
