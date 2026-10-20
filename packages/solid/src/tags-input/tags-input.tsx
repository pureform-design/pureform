// The tags input: Root on Zag's tags input machine, the text field's parts as the preset draws
// them (a container holding the optional icons, a chip per value, the input and the floating
// label, then the supporting text), the input chip's parts, and the ready-made TagsInput over
// them. Enter (or the delimiter) adds the typed text as a chip; Backspace highlights the last chip
// and then removes it, and each chip's remove button removes it.

import { inputChipAnatomy, tagsInputAnatomy } from "@pureform/anatomy";
import {
    inputChipSelection,
    isPresent,
    TAGS_INPUT_CONTENT_PROPS,
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
import { useFieldsetDisabled } from "../form";
import { CloseIcon } from "../glyphs";
import {
    itemInteractionSources,
    type ItemInteractionSources,
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof tagsInputAnatomy;
type ChipAnatomy = typeof inputChipAnatomy;

/** What Root shares with its parts. */
interface TagsInputContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly chips: ComponentScope<ChipAnatomy>;
    readonly api: Accessor<tagsInput.Api<PropTypes>>;
    readonly sources: ItemInteractionSources;
    readonly error: Accessor<string | undefined>;
}

const context = createPartContext<TagsInputContextValue>("TagsInput");

/** What a chip shares with its parts. */
interface ChipContextValue {
    readonly item: Accessor<tagsInput.ChipProps>;
}

const chipContext = createPartContext<ChipContextValue>("TagsInput.Chip");

/** Root's props: the variants and tokens (the chips' in `chip`), the machine's props (`value`,
 *  `max`, `delimiter`, …), `testId` and `unstyled` for every part, `as`, and the element's own
 *  props. */
export interface TagsInputRootProps
    extends
        Omit<PartProps, keyof TagsInputRootOwnProps>,
        TagsInputRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
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

/** The field's root, a `<div>` around the container, the supporting text, and the hidden input
 *  the values submit with. */
function Root(props: TagsInputRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string[]>(
        "TagsInput",
        "value",
        props,
    );
    const [hidden, setHidden] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const fieldsetDisabled = useFieldsetDisabled(hidden);
    const sources = itemInteractionSources();
    const service = useMachine(tagsInput.machine, () => ({
        id: props.id ?? id,
        dir: dir(),
        ...sources.machineProps,
        ...tagsInputMachineProps(props),
        // Zag reads a disabled fieldset only for its own form control state.
        disabled: props.disabled || fieldsetDisabled() || undefined,
        ...value.machineProps(),
    }));
    const api = createMemo(() => tagsInput.connect(service, normalizeProps));
    const scope = useComponent(tagsInputAnatomy, {
        selection: () => tagsInputSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const chips = useComponent(inputChipAnatomy, {
        selection: () => inputChipSelection(props.chip),
        testId: () => tagsInputChipTestId(props.testId),
        indication: () => props.indication,
    });
    return (
        <context.Provider
            value={{ scope, chips, api, sources, error: () => props.error }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: merge(omit(props, "as", ...TAGS_INPUT_ROOT_PROPS), {
                    get children() {
                        return (
                            <>
                                {props.children}
                                {/* Its value follows the tags: Zag's sets it once. */}
                                <input
                                    {...api().getHiddenInputProps()}
                                    ref={setHidden}
                                    value={api().valueAsString}
                                />
                            </>
                        );
                    },
                }),
            })}
        </context.Provider>
    );
}

/** The filled or outlined box holding the icons, the chips, the input, and the label. It counts
 *  as filled while it holds a chip, so the label floats. */
function Container(props: TagsInputPartProps): JSX.Element {
    const { scope, api } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: () => api().getContainerProps(),
        states: () => ({
            filled: tagsInputFilled(api().count, api().inputValue),
        }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The native input the values are typed into. The label names it. */
function Input(props: TagsInputPartProps): JSX.Element {
    const { scope, api } = context.use("Input");
    return scope.render("input", {
        element: "input",
        machine: () => api().getInputProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The floating label: a `<label>` for the input. */
function Label(props: TagsInputPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

const icon = (part: "leadingIcon" | "trailingIcon", name: string) =>
    function Icon(props: TagsInputIconProps): JSX.Element {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            machine: () => ({ "aria-hidden": "true" }),
            states: () => ({ mirrored: props.mirror }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "mirror"),
        });
    };

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon = icon("leadingIcon", "LeadingIcon");
/** An icon at the end of the field. Turn on Root's `trailingIcon` with it. */
const TrailingIcon = icon("trailingIcon", "TrailingIcon");

/** Helper text under the field. While Root has an `error`, it shows the error instead. */
function SupportingText(props: TagsInputPartProps): JSX.Element {
    const { scope, error } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return error() ?? props.children;
            },
        }),
    });
}

/** An input chip for one value: the machine's tag, which the arrow keys and Backspace highlight
 *  and its remove button removes. */
function Chip(props: TagsInputChipProps): JSX.Element {
    const { chips, api, sources } = context.use("Chip");
    const item = () => ({
        index: props.index,
        value: props.value,
        disabled: props.disabled,
    });
    const source = sources.item(
        () => api().getItemState(item()).id,
        () => props.interactionSource,
    );
    return (
        <chipContext.Provider value={{ item }}>
            {/* Zag's item, unstyled around the chip, keeps focus in it from blurring the field. */}
            <div {...(api().getChipItemProps(item()) as object)}>
                {chips.render("root", {
                    element: "div",
                    interactionSource: source,
                    machine: () => api().getChipProps(item()),
                    states: () => ({
                        hover: api().getItemState(item()).highlighted,
                    }),
                    unstyled: () => props.unstyled,
                    props: omit(
                        props,
                        "unstyled",
                        "value",
                        "index",
                        "disabled",
                        "interactionSource",
                    ),
                })}
            </div>
        </chipContext.Provider>
    );
}

/** The 48px touch target around a chip. Empty. */
function ChipTouchTarget(props: TagsInputPartProps): JSX.Element {
    const { chips } = context.use("ChipTouchTarget");
    return chips.render("touchTarget", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

const decoration = (part: "avatar" | "icon", name: string) =>
    function Decoration(props: TagsInputIconProps): JSX.Element {
        const { chips, api } = context.use(name);
        return chips.render(part, {
            element: "span",
            machine: () => api().getChipDecorationProps(),
            states: () => ({ mirrored: props.mirror }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "mirror"),
        });
    };

/** A chip's leading avatar (an image or initials), round. Render it only when there's one. */
const ChipAvatar = decoration("avatar", "ChipAvatar");
/** A chip's leading icon, when it has no avatar. Render it only when there's one. */
const ChipIcon = decoration("icon", "ChipIcon");

/** A chip's text: its value, unless given other children. */
function ChipLabel(props: TagsInputPartProps): JSX.Element {
    const { chips, api } = context.use("ChipLabel");
    const { item } = chipContext.use("ChipLabel");
    return chips.render("label", {
        element: "span",
        machine: () => api().getChipLabelProps(item()),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return props.children ?? item().value;
            },
        }),
    });
}

/** A chip's remove button: a surface with its own source. Zag names it from the value. */
function ChipRemove(
    props: TagsInputPartProps & InteractionSourceProps,
): JSX.Element {
    const { chips, api } = context.use("ChipRemove");
    const { item } = chipContext.use("ChipRemove");
    const source = useOwnInteractionSource(() => props.interactionSource);
    const handlers = useInteractionHandlers(
        source,
        () => api().getItemState(item()).disabled,
    );
    return chips.render("remove", {
        element: "button",
        interactionSource: source,
        machine: () =>
            combinePartProps([
                api().getChipRemoveProps(item()) as Readonly<
                    Record<string, unknown>
                >,
                handlers(),
            ]),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "interactionSource"),
    });
}

/** The ready-made tags input's props: Root's, with `class`, `style`, and `slotProps` keyed by
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
        TagsInputContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...TAGS_INPUT_CONTENT_PROPS,
] as const;

// Inside Root, so it can read the values and whether an error shows.
function Content(props: {
    readonly own: TagsInputProps;
    readonly slots: (part: string) => PartProps;
}): JSX.Element {
    const { api, error } = context.use("Root");
    const own = props.own;
    const avatar = (value: string) => own.chipAvatar?.(value);
    const chipIcon = (value: string) => own.chipIcon?.(value);
    return (
        <>
            <Container {...props.slots("container")}>
                <Show when={isPresent(own.leadingIcon)}>
                    <LeadingIcon {...props.slots("leadingIcon")}>
                        {own.leadingIcon}
                    </LeadingIcon>
                </Show>
                <For each={api().value}>
                    {(value, index) => (
                        <Chip value={value} index={index()}>
                            <ChipTouchTarget />
                            <Show
                                when={isPresent(avatar(value))}
                                fallback={
                                    <Show when={isPresent(chipIcon(value))}>
                                        <ChipIcon>{chipIcon(value)}</ChipIcon>
                                    </Show>
                                }
                            >
                                <ChipAvatar>{avatar(value)}</ChipAvatar>
                            </Show>
                            <ChipLabel />
                            <ChipRemove>
                                {isPresent(own.removeIcon) ? (
                                    own.removeIcon
                                ) : (
                                    <CloseIcon />
                                )}
                            </ChipRemove>
                        </Chip>
                    )}
                </For>
                <Input {...props.slots("input")} />
                <Label {...props.slots("label")}>{own.label}</Label>
                <Show when={isPresent(own.trailingIcon)}>
                    <TrailingIcon {...props.slots("trailingIcon")}>
                        {own.trailingIcon}
                    </TrailingIcon>
                </Show>
            </Container>
            <Show when={isPresent(own.supportingText) || error() !== undefined}>
                <SupportingText {...props.slots("supportingText")}>
                    {own.supportingText}
                </SupportingText>
            </Show>
        </>
    );
}

/** The ready-made tags input: every part, in the preset's structure, with a chip per value; the
 *  icons and supporting text only when given (or while an error shows). */
function ReadyMade(props: TagsInputProps): JSX.Element {
    const slots = createSlotProps(props) as (part: string) => PartProps;
    const own = omit(props, ...READY_MADE_PROPS) as TagsInputRootProps;
    // The root's slot props are an element's, whose `id` also takes `false`.
    const root = slots("root") as object;
    return (
        <Root
            {...own}
            leadingIcon={isPresent(props.leadingIcon) || undefined}
            trailingIcon={isPresent(props.trailingIcon) || undefined}
            {...root}
        >
            <Content own={props} slots={slots} />
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
