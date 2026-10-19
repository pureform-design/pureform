// What the text field and the text area share: Root on pureform's text field machine, the
// field's parts as the preset draws them (a container holding the optional icons, the native
// input or text area, and the floating label, then the supporting text), and the ready-made
// component over them. Each component builds its own from `createTextInput`.

import type { textAreaAnatomy, textFieldAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    TEXT_FIELD_CONTENT_PROPS,
    textFieldMachineProps,
    textFieldNativeDefault,
} from "@pureform/binding-core";
import type {
    TextFieldBehaviorProps,
    TextFieldContentProps,
} from "@pureform/binding-core";
import { syncTextInput } from "@pureform/binding-core/dom";
import * as textField from "@pureform/machines/text-field";
import type { Selection } from "@pureform/styling";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    flush,
    merge,
    omit,
    Show,
    untrack,
} from "solid-js";

import { useControllable } from "./controllable";
import { useFormReset } from "./form";
import { normalizeProps, useMachine } from "./internal/zag";
import type { PropTypes } from "./internal/zag";
import { createPartContext } from "./part-context";
import { createSlotProps, useComponent } from "./parts";
import type { ComponentScope, SlotKeyedProps } from "./parts";
import { combinePartProps } from "./props";
import type { PartProps } from "./props";
import { useDirection } from "./provider";

type Anatomy = typeof textFieldAnatomy | typeof textAreaAnatomy;

/** What Root shares with its parts. */
interface TextInputContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<textField.Api<PropTypes>>;
    readonly setInput: (input: HTMLInputElement | HTMLTextAreaElement) => void;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TextInputPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface TextInputIconProps extends TextInputPartProps {
    readonly mirror?: boolean | undefined;
}

/** How one text input differs from the other. */
interface TextInputConfig<A extends Anatomy> {
    /** The component's name, for warnings and errors: `"TextField"`. */
    readonly component: string;
    readonly anatomy: A;
    /** The native element the input part renders. */
    readonly element: "input" | "textarea";
    /** Root's own props, kept off its element. */
    readonly rootProps: readonly string[];
    /** The ready-made component's props that go on the input. */
    readonly inputProps: readonly string[];
    readonly selection: (props: never) => Selection<A["name"]>;
}

type RootProps = TextFieldBehaviorProps & {
    readonly as?: ValidComponent | undefined;
    readonly testId?: unknown;
    readonly unstyled?: unknown;
    readonly leadingIcon?: boolean | undefined;
    readonly trailingIcon?: boolean | undefined;
};

type ReadyMadeProps = Omit<RootProps, "leadingIcon" | "trailingIcon"> &
    SlotKeyedProps<Anatomy> &
    TextFieldContentProps<JSX.Element>;

/** Builds a text input's parts and ready-made component. */
export function createTextInput<A extends Anatomy>(config: TextInputConfig<A>) {
    const context = createPartContext<TextInputContextValue>(config.component);

    /** The field's root, a `<div>` around the container and the supporting text. */
    function Root(props: RootProps & PartProps): JSX.Element {
        const id = createUniqueId();
        const dir = useDirection();
        const value = useControllable<"value", string>(
            config.component,
            "value",
            props,
        );
        const [input, setInput] = createSignal<
            HTMLInputElement | HTMLTextAreaElement | undefined
        >(undefined, { ownedWrite: true });
        const service = useMachine(textField.machine, () => ({
            id,
            dir: dir(),
            ...textFieldMachineProps(props),
            ...value.machineProps(),
        }));
        const api = createMemo(() =>
            textField.connect(service, normalizeProps),
        );
        useFormReset(input, {
            resetsTo: () => textFieldNativeDefault(value.resetsTo()),
            onBeforeReset: value.beforeReset,
            onReset: () =>
                value.reset(() =>
                    service.send({
                        type: "RESET",
                        value: value.defaultValue ?? "",
                    }),
                ),
        });
        const scope = useComponent(config.anatomy as Anatomy, {
            selection: () =>
                config.selection(props as never) as Selection<Anatomy["name"]>,
            testId: () => props.testId as never,
            unstyled: () => props.unstyled as never,
        });
        return (
            <context.Provider value={{ scope, api, setInput }}>
                {scope.render("root", {
                    element: "div",
                    as: () => props.as,
                    machine: () => api().getRootProps(),
                    props: omit(
                        props as Record<string, unknown>,
                        "as",
                        ...config.rootProps,
                    ),
                })}
            </context.Provider>
        );
    }

    /** The filled or outlined box holding the icons, the input, and the label. It reads its
     *  states from the input inside it. */
    function Container(props: TextInputPartProps): JSX.Element {
        const { scope, api } = context.use("Container");
        return scope.render("container", {
            element: "div",
            states: () => ({ filled: api().filled }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    /** The native input or text area: it takes the typing, submits with the form, and validates.
     *  The label names it. */
    function Input(props: TextInputPartProps): JSX.Element {
        const { scope, api, setInput } = context.use("Input");
        // The browser shows the typed text before the machine hears of it. Once the machine has
        // sent the change and the owner's update has applied, the input is put back to the
        // machine's value, so a controlled field the owner didn't change doesn't move.
        const onInput = (event: InputEvent) => {
            const element = event.currentTarget as
                | HTMLInputElement
                | HTMLTextAreaElement;
            queueMicrotask(() => {
                flush();
                syncTextInput(
                    element,
                    untrack(() => api().value),
                );
            });
        };
        return scope.render("input", {
            element: config.element,
            machine: () =>
                combinePartProps([
                    (config.element === "textarea"
                        ? api().getTextAreaProps()
                        : api().getInputProps()) as Readonly<
                        Record<string, unknown>
                    >,
                    { onInput },
                ]),
            ref: (element) =>
                setInput(element as HTMLInputElement | HTMLTextAreaElement),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    /** The floating label: a `<label>` for the input. */
    function Label(props: TextInputPartProps): JSX.Element {
        const { scope, api } = context.use("Label");
        return scope.render("label", {
            element: "label",
            machine: () => api().getLabelProps(),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    const icon = (part: "leadingIcon" | "trailingIcon", name: string) =>
        function Icon(props: TextInputIconProps): JSX.Element {
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

    /** Helper text under the field. While the field has an error, it shows the error instead. */
    function SupportingText(props: TextInputPartProps): JSX.Element {
        const { scope, api } = context.use("SupportingText");
        const children = {
            get children() {
                return api().errorText ?? props.children;
            },
        };
        return scope.render("supportingText", {
            element: "span",
            machine: () => api().getSupportingTextProps(),
            unstyled: () => props.unstyled,
            props: merge(omit(props, "unstyled"), children),
        });
    }

    const readyMadeOwn = [
        "class",
        "style",
        "slotProps",
        ...TEXT_FIELD_CONTENT_PROPS,
        ...config.inputProps,
    ] as const;

    // Inside Root, so it can read whether an error shows.
    function Content(props: {
        readonly own: ReadyMadeProps;
        readonly slots: (part: string) => PartProps;
    }): JSX.Element {
        const { api } = context.use("Root");
        const own = props.own;
        const container = props.slots("container");
        const leadingIcon = props.slots("leadingIcon");
        const input = props.slots("input");
        const label = props.slots("label");
        const trailingIcon = props.slots("trailingIcon");
        const supportingText = props.slots("supportingText");
        const showsSupporting = createMemo(
            () =>
                isPresent(own.supportingText) || api().errorText !== undefined,
        );
        const inputProps = () => {
            const picked: Record<string, unknown> = {};
            for (const key of config.inputProps)
                picked[key] = (own as Record<string, unknown>)[key];
            if (showsSupporting() && picked["aria-describedby"] === undefined)
                picked["aria-describedby"] = api().supportingTextId;
            return picked;
        };
        return (
            <>
                <Container {...container}>
                    <Show when={isPresent(own.leadingIcon)}>
                        <LeadingIcon
                            mirror={own.mirrorLeadingIcon}
                            {...leadingIcon}
                        >
                            {own.leadingIcon}
                        </LeadingIcon>
                    </Show>
                    <Input {...inputProps()} {...input} />
                    <Label {...label}>{own.label}</Label>
                    <Show when={isPresent(own.trailingIcon)}>
                        <TrailingIcon
                            mirror={own.mirrorTrailingIcon}
                            {...trailingIcon}
                        >
                            {own.trailingIcon}
                        </TrailingIcon>
                    </Show>
                </Container>
                <Show when={showsSupporting()}>
                    <SupportingText {...supportingText}>
                        {own.supportingText}
                    </SupportingText>
                </Show>
            </>
        );
    }

    /** The ready-made field: every part, in the preset's structure; the icons and supporting text
     *  only when given (or while an error shows). */
    function ReadyMade(props: ReadyMadeProps): JSX.Element {
        const slots = createSlotProps(props) as (part: string) => PartProps;
        const own = omit(
            props as Record<string, unknown>,
            ...readyMadeOwn,
        ) as RootProps;
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

    return {
        ReadyMade,
        parts: {
            Root,
            Container,
            LeadingIcon,
            Input,
            Label,
            TrailingIcon,
            SupportingText,
        },
    };
}
