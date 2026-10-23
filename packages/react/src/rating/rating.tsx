// The rating: Root on Zag's rating group machine, its Label and Control (the radio group), an
// Item per star holding the empty Icon and, over it, the Fill or HalfFill the value reaches, and
// the ready-made Rating over them. The arrow keys, Home and End move the value, Space sets it, and
// with `allowHalf` the pointer's side of a star picks the half.

import { ratingAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    RATING_ROOT_PROPS,
    ratingMachineProps,
    ratingSelection,
    starFill,
} from "@pureform/binding-core";
import type {
    RatingContentProps,
    RatingRootOwnProps,
} from "@pureform/binding-core";
import * as ratingGroup from "@pureform/machines/rating-group";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { useControllable } from "../controllable";
import { StarIcon } from "../glyphs";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof ratingAnatomy;

/** What Root shares with its parts. */
interface RatingContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: ratingGroup.Api<PropTypes>;
}

const context = createPartContext<RatingContextValue>("Rating");

/** Root's props: the variants and tokens, the machine's props (`value`, `count`, `allowHalf`,
 *  `readOnly`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface RatingRootProps
    extends Omit<PartProps, keyof RatingRootOwnProps>, RatingRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface RatingPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An item's props: a part's, and the star's 1-based `index`. */
export interface RatingItemProps extends RatingPartProps {
    readonly index: number;
}

const noop = () => {};

/** The rating's root, a `<div>` around the label and the control, with the hidden input the value
 *  submits with. */
function Root(props: RatingRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", number>("Rating", "value", props);
    const service = useMachine(ratingGroup.machine, {
        id: props.id ?? id,
        dir,
        ...ratingMachineProps(props),
        ...value.machineProps,
    });
    const api = ratingGroup.connect(service, normalizeProps);
    const scope = useComponent(ratingAnatomy, {
        selection: ratingSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, children, ...rest } = omitProps(props, RATING_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: {
                    ...rest,
                    children: (
                        <>
                            {children}
                            {/* Its value follows the rating: Zag's sets it once. */}
                            <input
                                {...api.getHiddenInputProps()}
                                defaultValue={undefined}
                                value={api.value}
                                onChange={noop}
                            />
                        </>
                    ),
                },
            })}
        </context.Provider>
    );
}

/** The label, a `<label>` that names the group and moves focus to a star. */
function Label({ unstyled, ...props }: RatingPartProps): ReactNode {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

/** The row of stars, a `radiogroup`. */
function Control({ unstyled, ...props }: RatingPartProps): ReactNode {
    const { scope, api } = context.use("Control");
    return scope.render("control", {
        element: "div",
        machine: api.getControlProps(),
        unstyled,
        props,
    });
}

/** One star, a `radio`. Holds an Icon, and a Fill or HalfFill once the value reaches it. */
function Item({ unstyled, index, ...props }: RatingItemProps): ReactNode {
    const { scope, api } = context.use("Item");
    return scope.render("item", {
        element: "span",
        machine: api.getItemProps({ index }),
        unstyled,
        props,
    });
}

/** The empty star, in the item. */
function Icon({ unstyled, ...props }: RatingPartProps): ReactNode {
    const { scope } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: { "aria-hidden": "true" },
        unstyled,
        props,
    });
}

/** The filled star over the empty one. Render it for a star the value reaches
 *  (the ready-made one reads Zag's item state). */
function Fill({ unstyled, ...props }: RatingPartProps): ReactNode {
    const { scope } = context.use("Fill");
    return scope.render("fill", {
        element: "span",
        machine: { "aria-hidden": "true" },
        unstyled,
        props,
    });
}

/** The filled star's inline-start half, for a half value. */
function HalfFill({ unstyled, ...props }: RatingPartProps): ReactNode {
    const { scope } = context.use("HalfFill");
    return scope.render("halfFill", {
        element: "span",
        machine: { "aria-hidden": "true" },
        unstyled,
        props,
    });
}

/** The ready-made rating's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, a `label` and the star `icon`. */
export type RatingProps = Omit<
    RatingRootProps,
    keyof SlotKeyedProps<Anatomy> | "children"
> &
    SlotKeyedProps<Anatomy> &
    RatingContentProps<ReactNode>;

/** Each star of the ready-made rating, filled by the machine's item state. */
function Stars(props: {
    readonly icon: ReactNode;
    readonly slot: (part: PartName<Anatomy>) => PartProps;
}): ReactNode {
    const { api } = context.use("Rating");
    return api.items.map((index) => {
        const fill = starFill(api.getItemState({ index }));
        return (
            <Item key={index} index={index} {...props.slot("item")}>
                <Icon {...props.slot("icon")}>{props.icon}</Icon>
                {fill === "full" ? (
                    <Fill {...props.slot("fill")}>{props.icon}</Fill>
                ) : null}
                {fill === "half" ? (
                    <HalfFill {...props.slot("halfFill")}>
                        {props.icon}
                    </HalfFill>
                ) : null}
            </Item>
        );
    });
}

/** The ready-made rating: Root, an optional label, and the control with a star per count. */
function ReadyMade(props: RatingProps): ReactNode {
    const slot = useSlotProps(props);
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        label,
        icon,
        ...rootProps
    } = props;
    return (
        <Root
            {...rootProps}
            {...(slot("root") as Omit<PartProps, "defaultValue">)}
        >
            {label !== undefined ? (
                <Label {...slot("label")}>{label}</Label>
            ) : null}
            <Control {...slot("control")}>
                <Stars icon={icon ?? <StarIcon />} slot={slot} />
            </Control>
        </Root>
    );
}

/** A star rating, input or read-only. Use it ready-made,
 *  `<Rating label="Quality" allowHalf defaultValue={3.5} />`, or compose its parts under
 *  `Rating.Root`: `Label` and `Control` holding an `Item` per star, each with `Icon` and, once the
 *  value reaches it, `Fill` (or `HalfFill` for half). */
export const Rating = Object.assign(ReadyMade, {
    Root,
    Label,
    Control,
    Item,
    Icon,
    Fill,
    HalfFill,
});
