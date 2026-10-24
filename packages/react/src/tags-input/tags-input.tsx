// The tags input: Root on Zag's tags input machine, the text field's parts as the preset draws
// them (a container holding the optional icons, a chip per value, the input and the floating
// label, then the supporting text), the input chip's parts, and the ready-made TagsInput over
// them. Enter (or the delimiter) adds the typed text as a chip; Backspace highlights the last chip
// and then removes it, and each chip's remove button removes it.

import { inputChipAnatomy, tagsInputAnatomy } from "@pureform/anatomy";
import {
    inputChipSelection,
    isPresent,
    TAGS_INPUT_ROOT_PROPS,
    tagsInputChipTestId,
    tagsInputFilled,
    tagsInputMachineProps,
    tagsInputSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    TagsInputContentProps,
    TagsInputRootOwnProps,
} from "@pureform/binding-core";
import * as tagsInput from "@pureform/machines/tags-input";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId, useState } from "react";

import { useControllable } from "../controllable";
import { renderErrorSupportingText } from "../error-supporting-text";
import { useFieldsetDisabled } from "../form";
import { CloseIcon } from "../glyphs";
import { useItemInteractionSources, useMachineButton } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, InnerPropsOf, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof tagsInputAnatomy;
type ChipAnatomy = typeof inputChipAnatomy;

/** What Root shares with its parts. */
interface TagsInputContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly chips: ComponentScope<ChipAnatomy>;
    readonly api: tagsInput.Api<PropTypes>;
    readonly sources: ItemInteractionSources;
    readonly error: string | undefined;
}

const context = createPartContext<TagsInputContextValue>("TagsInput");

/** What a chip shares with its parts. */
interface ChipContextValue {
    readonly item: tagsInput.ChipProps;
}

const chipContext = createPartContext<ChipContextValue>("TagsInput", "Chip");

/** Root's props: the variants and tokens (the chips' variants in `chip`, the rest of their
 *  customization in `chipProps`), the machine's props (`value`,
 *  `max`, `delimiter`, …), `testId` and `unstyled` for every part, `as`, and the element's own
 *  props. */
export interface TagsInputRootProps
    extends
        Omit<PartProps, keyof TagsInputRootOwnProps>,
        TagsInputRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
    /** Every chip's `className`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`, keyed
     *  by the input chip's parts. `testId` replaces the prefix the chips take from Root's. */
    readonly chipProps?: InnerPropsOf<typeof inputChipAnatomy> | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TagsInputPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface TagsInputIconProps extends TagsInputPartProps {
    readonly mirror?: boolean | undefined;
}

/** A chip's props: its value and place among the values, and the source its interactions are
 *  emitted to. */
export interface TagsInputChipProps
    extends TagsInputPartProps, InteractionSourceProps {
    readonly value: string;
    readonly index: number;
    readonly disabled?: boolean | undefined;
}

const noop = () => {};

/** The field's root, a `<div>` around the container, the supporting text, and the hidden input
 *  the values submit with. */
function Root(props: TagsInputRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string[]>(
        "TagsInput",
        "value",
        props,
    );
    const [hidden, setHidden] = useState<HTMLInputElement | null>(null);
    const fieldsetDisabled = useFieldsetDisabled(hidden);
    const sources = useItemInteractionSources();
    const service = useMachine(tagsInput.machine, {
        id: props.id ?? id,
        dir,
        ...sources.machineProps,
        ...tagsInputMachineProps(props),
        // Zag reads a disabled fieldset only for its own form control state.
        disabled: props.disabled || fieldsetDisabled || undefined,
        ...value.machineProps,
    });
    const api = tagsInput.connect(service, normalizeProps);
    const scope = useComponent(tagsInputAnatomy, {
        selection: tagsInputSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { chipProps } = props;
    const chips = useComponent(inputChipAnatomy, {
        selection: {
            ...inputChipSelection(props.chip),
            tokens: chipProps?.tokens,
        },
        testId: chipProps?.testId ?? tagsInputChipTestId(props.testId),
        unstyled: chipProps?.unstyled,
        indication: props.indication,
    });
    const {
        as,
        children,
        chipProps: _chipProps,
        ...rest
    } = omitProps(props, TAGS_INPUT_ROOT_PROPS);
    return (
        <context.Provider
            value={{ scope, chips, api, sources, error: props.error }}
        >
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: {
                    ...rest,
                    children: (
                        <>
                            {children}
                            {/* Its value follows the tags: Zag's sets it once. */}
                            <input
                                {...api.getHiddenInputProps()}
                                ref={setHidden}
                                defaultValue={undefined}
                                value={api.valueAsString}
                                onChange={noop}
                            />
                        </>
                    ),
                },
            })}
        </context.Provider>
    );
}

/** The filled or outlined box holding the icons, the chips, the input, and the label. It counts
 *  as filled while it holds a chip, so the label floats. */
function Container({ unstyled, ...props }: TagsInputPartProps): ReactNode {
    const { scope, api } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: api.getContainerProps(),
        states: { filled: tagsInputFilled(api.count, api.inputValue) },
        unstyled,
        props,
    });
}

/** The native input the values are typed into. The label names it. */
function Input({ unstyled, ...props }: TagsInputPartProps): ReactNode {
    const { scope, api } = context.use("Input");
    return scope.render("input", {
        element: "input",
        machine: api.getInputProps(),
        unstyled,
        props,
    });
}

/** The floating label: a `<label>` for the input. */
function Label({ unstyled, ...props }: TagsInputPartProps): ReactNode {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

const icon = (part: "leadingIcon" | "trailingIcon", name: string) =>
    function Icon({
        unstyled,
        mirror,
        ...props
    }: TagsInputIconProps): ReactNode {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            machine: { "aria-hidden": "true" },
            states: { mirrored: mirror },
            unstyled,
            props,
        });
    };

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon = icon("leadingIcon", "LeadingIcon");
/** An icon at the end of the field. Turn on Root's `trailingIcon` with it. */
const TrailingIcon = icon("trailingIcon", "TrailingIcon");

/** Helper text under the field. While Root has an `error`, it shows the error instead. */
function SupportingText(props: TagsInputPartProps): ReactNode {
    const { scope, error } = context.use("SupportingText");
    return renderErrorSupportingText(scope, error, props);
}

/** An input chip for one value: the machine's tag, which the arrow keys and Backspace highlight
 *  and its remove button removes. */
function Chip({
    unstyled,
    value,
    index,
    disabled,
    interactionSource,
    ...props
}: TagsInputChipProps): ReactNode {
    const { chips, api, sources } = context.use("Chip");
    const item = { index, value, disabled };
    const state = api.getItemState(item);
    const source = sources.item(state.id, interactionSource);
    return (
        <chipContext.Provider value={{ item }}>
            {/* Zag's item, unstyled around the chip, keeps focus in it from blurring the field. */}
            <div {...(api.getChipItemProps(item) as object)}>
                {chips.render("root", {
                    element: "div",
                    interactionSource: source,
                    machine: api.getChipProps(item),
                    states: { hover: state.highlighted },
                    unstyled,
                    props,
                })}
            </div>
        </chipContext.Provider>
    );
}

/** The 48px touch target around a chip. Empty. */
function ChipTouchTarget({
    unstyled,
    ...props
}: TagsInputPartProps): ReactNode {
    const { chips } = context.use("ChipTouchTarget");
    return chips.render("touchTarget", { element: "span", unstyled, props });
}

const decoration = (part: "avatar" | "icon", name: string) =>
    function Decoration({
        unstyled,
        mirror,
        ...props
    }: TagsInputIconProps): ReactNode {
        const { chips, api } = context.use(name);
        return chips.render(part, {
            element: "span",
            machine: api.getChipDecorationProps(),
            states: { mirrored: mirror },
            unstyled,
            props,
        });
    };

/** A chip's leading avatar (an image or initials), round. Render it only when there's one. */
const ChipAvatar = decoration("avatar", "ChipAvatar");
/** A chip's leading icon, when it has no avatar. Render it only when there's one. */
const ChipIcon = decoration("icon", "ChipIcon");

/** A chip's text: its value, unless given other children. */
function ChipLabel({ unstyled, ...props }: TagsInputPartProps): ReactNode {
    const { chips, api } = context.use("ChipLabel");
    const { item } = chipContext.use("ChipLabel");
    return chips.render("label", {
        element: "span",
        machine: api.getChipLabelProps(item),
        unstyled,
        props: { ...props, children: props.children ?? item.value },
    });
}

/** A chip's remove button: a surface with its own source. Zag names it from the value. */
function ChipRemove(
    props: TagsInputPartProps & InteractionSourceProps,
): ReactNode {
    const { chips, api } = context.use("ChipRemove");
    const { item } = chipContext.use("ChipRemove");
    return chips.render(
        "remove",
        useMachineButton(
            props,
            [api.getChipRemoveProps(item) as Readonly<Record<string, unknown>>],
            api.getItemState(item).disabled,
        ),
    );
}

/** The ready-made tags input's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, and the label, supporting text, icons, and chips' content. */
export interface TagsInputProps
    extends
        Omit<
            TagsInputRootProps,
            | keyof SlotKeyedProps<Anatomy>
            | "children"
            | "leadingIcon"
            | "trailingIcon"
        >,
        SlotKeyedProps<Anatomy>,
        TagsInputContentProps<ReactNode> {}

const NO_CHIP_PROPS: InnerPropsOf<typeof inputChipAnatomy> = {};

// Inside Root, so it can read the values and whether an error shows.
function ReadyMadeContent({
    own,
}: {
    readonly own: TagsInputProps;
}): ReactNode {
    const { api, error } = context.use("Root");
    const slot = useSlotProps(own);
    const chip = useSlotProps(own.chipProps ?? NO_CHIP_PROPS);
    return (
        <>
            <Container {...slot("container")}>
                {isPresent(own.leadingIcon) ? (
                    <LeadingIcon {...slot("leadingIcon")}>
                        {own.leadingIcon}
                    </LeadingIcon>
                ) : null}
                {api.value.map((value, index) => {
                    const avatar = own.chipAvatar?.(value);
                    const chipIcon = own.chipIcon?.(value);
                    return (
                        <Chip
                            key={`${index}-${value}`}
                            {...chip("root")}
                            value={value}
                            index={index}
                        >
                            <ChipTouchTarget {...chip("touchTarget")} />
                            {isPresent(avatar) ? (
                                <ChipAvatar {...chip("avatar")}>
                                    {avatar}
                                </ChipAvatar>
                            ) : isPresent(chipIcon) ? (
                                <ChipIcon {...chip("icon")}>
                                    {chipIcon}
                                </ChipIcon>
                            ) : null}
                            <ChipLabel {...chip("label")} />
                            <ChipRemove {...chip("remove")}>
                                {isPresent(own.removeIcon) ? (
                                    own.removeIcon
                                ) : (
                                    <CloseIcon />
                                )}
                            </ChipRemove>
                        </Chip>
                    );
                })}
                <Input {...slot("input")} />
                <Label {...slot("label")}>{own.label}</Label>
                {isPresent(own.trailingIcon) ? (
                    <TrailingIcon {...slot("trailingIcon")}>
                        {own.trailingIcon}
                    </TrailingIcon>
                ) : null}
            </Container>
            {isPresent(own.supportingText) || error !== undefined ? (
                <SupportingText {...slot("supportingText")}>
                    {own.supportingText}
                </SupportingText>
            ) : null}
        </>
    );
}

/** The ready-made tags input: every part, in the preset's structure, with a chip per value; the
 *  icons and supporting text only when given (or while an error shows). */
function ReadyMade(props: TagsInputProps): ReactNode {
    const slot = useSlotProps(props);
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        label: _label,
        supportingText: _supportingText,
        leadingIcon,
        trailingIcon,
        chipAvatar: _chipAvatar,
        chipIcon: _chipIcon,
        removeIcon: _removeIcon,
        ...rootProps
    } = props;
    return (
        <Root
            {...rootProps}
            leadingIcon={isPresent(leadingIcon) || undefined}
            trailingIcon={isPresent(trailingIcon) || undefined}
            // The root's slot props are an element's, whose `defaultValue` takes more types.
            {...(slot("root") as object)}
        >
            <ReadyMadeContent own={props} />
        </Root>
    );
}

/** Material's input chips in a text field. Use it ready-made, `<TagsInput label="Tags"
 *  defaultValue={["red"]} />`, or compose its parts under `TagsInput.Root`: `Container`,
 *  `LeadingIcon`, a `Chip` per value (with `ChipTouchTarget`, `ChipAvatar` or `ChipIcon`,
 *  `ChipLabel`, and `ChipRemove`), `Input`, `Label`, `TrailingIcon`, and `SupportingText`. */
export const TagsInput = Object.assign(ReadyMade, {
    Root,
    Container,
    LeadingIcon,
    Input,
    Label,
    TrailingIcon,
    SupportingText,
    Chip,
    ChipTouchTarget,
    ChipAvatar,
    ChipIcon,
    ChipLabel,
    ChipRemove,
});
