// The rating: Root on Zag's rating group machine, its Label and Control (the radio group), an
// Item per star holding the empty Icon and, over it, the Fill or HalfFill the value reaches, and
// the ready-made Rating over them. The arrow keys, Home and End move the value, Space sets it, and
// with `allowHalf` the pointer's side of a star picks the half.

import { ratingAnatomy } from "@pureform/anatomy";
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
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    merge,
    omit,
    Show,
} from "solid-js";

import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { StarIcon } from "../glyphs";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof ratingAnatomy;

/** What Root shares with its parts. */
interface RatingContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<ratingGroup.Api<PropTypes>>;
}

const context = createPartContext<RatingContextValue>("Rating");

/** Root's props: the variants and tokens, the machine's props (`value`, `count`, `allowHalf`,
 *  `readOnly`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface RatingRootProps
    extends Omit<PartProps, keyof RatingRootOwnProps>, RatingRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface RatingPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An item's props: a part's, and the star's 1-based `index`. */
export interface RatingItemProps extends RatingPartProps {
    readonly index: number;
}

/** The rating's root, a `<div>` around the label and the control, with the hidden input the value
 *  submits with. */
function Root(props: RatingRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", number>("Rating", "value", props);
    const [input, setInput] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const service = useMachine(ratingGroup.machine, () => ({
        id: props.id ?? id,
        dir: dir(),
        ...ratingMachineProps(props),
        ...value.machineProps(),
        // Zag's none is -1; the rating's is 0, which the hidden input and a reset show too.
        defaultValue: value.machineProps().defaultValue ?? 0,
    }));
    const api = createMemo(() => ratingGroup.connect(service, normalizeProps));
    useFormReset(input, {
        resetsTo: () => value.resetsTo() ?? 0,
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                service.send({
                    type: "SET_VALUE",
                    value: value.defaultValue ?? 0,
                }),
            ),
    });
    const scope = useComponent(ratingAnatomy, {
        selection: () => ratingSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: merge(omit(props, "as", ...RATING_ROOT_PROPS), {
                    get children() {
                        return (
                            <>
                                {props.children}
                                {/* Its value follows the rating: Zag's sets it once. */}
                                <input
                                    {...api().getHiddenInputProps()}
                                    ref={setInput}
                                    name={props.name}
                                    value={api().value}
                                />
                            </>
                        );
                    },
                }),
            })}
        </context.Provider>
    );
}

/** The label, a `<label>` that names the group and moves focus to a star. */
function Label(props: RatingPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The row of stars, a `radiogroup`. */
function Control(props: RatingPartProps): JSX.Element {
    const { scope, api } = context.use("Control");
    return scope.render("control", {
        element: "div",
        machine: () => api().getControlProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** One star, a `radio`. Holds an Icon, and a Fill or HalfFill once the value reaches it. */
function Item(props: RatingItemProps): JSX.Element {
    const { scope, api } = context.use("Item");
    return scope.render("item", {
        element: "span",
        machine: () => api().getItemProps({ index: props.index }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "index"),
    });
}

const star = (part: "icon" | "fill" | "halfFill", name: string) =>
    function Star(props: RatingPartProps): JSX.Element {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            machine: () => ({ "aria-hidden": "true" }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

/** The empty star, in the item. */
const Icon = star("icon", "Icon");
/** The filled star over the empty one. Render it for a star the value reaches (the ready-made one
 *  reads Zag's item state). */
const Fill = star("fill", "Fill");
/** The filled star's inline-start half, for a half value. */
const HalfFill = star("halfFill", "HalfFill");

/** The ready-made rating's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  a `label` and the star `icon`. */
export type RatingProps = Omit<
    RatingRootProps,
    keyof SlotKeyedProps<Anatomy> | "children"
> &
    SlotKeyedProps<Anatomy> &
    RatingContentProps<JSX.Element>;

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "label",
    "icon",
] as const;

/** Each star of the ready-made rating, filled by the machine's item state. */
function Stars(props: {
    readonly icon: JSX.Element;
    readonly slots: ReturnType<typeof createSlotProps<Anatomy>>;
}): JSX.Element {
    const { api } = context.use("Rating");
    return (
        <For each={api().items}>
            {(index) => {
                const fill = createMemo(() =>
                    starFill(api().getItemState({ index })),
                );
                return (
                    <Item index={index} {...props.slots("item")}>
                        <Icon {...props.slots("icon")}>{props.icon}</Icon>
                        <Show when={fill() === "full"}>
                            <Fill {...props.slots("fill")}>{props.icon}</Fill>
                        </Show>
                        <Show when={fill() === "half"}>
                            <HalfFill {...props.slots("halfFill")}>
                                {props.icon}
                            </HalfFill>
                        </Show>
                    </Item>
                );
            }}
        </For>
    );
}

/** The ready-made rating: Root, an optional label, and the control with a star per count. */
function ReadyMade(props: RatingProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as RatingRootProps;
    const root = slots("root") as object;
    return (
        <Root {...own} {...root}>
            <Show when={props.label !== undefined}>
                <Label {...slots("label")}>{props.label}</Label>
            </Show>
            <Control {...slots("control")}>
                <Stars icon={props.icon ?? <StarIcon />} slots={slots} />
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
