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
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ChangeEvent,
    type ElementType,
    type ReactNode,
    useCallback,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { useControllable } from "./controllable";
import { useFormReset } from "./form";
import { useMachine } from "./machine";
import { createPartContext } from "./part-context";
import { useComponent, useSlotProps } from "./parts";
import type { ComponentScope, SlotKeyedProps } from "./parts";
import { combinePartProps, omitProps } from "./props";
import type { PartProps } from "./props";
import { useDirection } from "./provider";

type Anatomy = typeof textFieldAnatomy | typeof textAreaAnatomy;
type TextControl = HTMLInputElement | HTMLTextAreaElement;

/** What Root shares with its parts. */
interface TextInputContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: textField.Api<PropTypes>;
    readonly setInput: (input: TextControl | null) => void;
    /** Puts the input back to the controlled value after typing; see `Input`. Stable. */
    readonly restoreInput: (input: TextControl) => void;
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
    readonly as?: ElementType | undefined;
    readonly testId?: unknown;
    readonly unstyled?: unknown;
    readonly leadingIcon?: boolean | undefined;
    readonly trailingIcon?: boolean | undefined;
};

type ReadyMadeProps = Omit<RootProps, "leadingIcon" | "trailingIcon"> &
    SlotKeyedProps<Anatomy> &
    TextFieldContentProps<ReactNode>;

/** Builds a text input's parts and ready-made component. */
export function createTextInput<A extends Anatomy>(config: TextInputConfig<A>) {
    const context = createPartContext<TextInputContextValue>(config.component);

    /** The field's root, a `<div>` around the container and the supporting text. */
    function Root(props: RootProps & PartProps): ReactNode {
        const id = useId();
        const dir = useDirection();
        const value = useControllable<"value", string>(
            config.component,
            "value",
            props,
        );
        const [input, setInput] = useState<TextControl | null>(null);
        const service = useMachine(textField.machine, {
            id,
            dir,
            ...textFieldMachineProps(props),
            ...value.machineProps,
        });
        const api = textField.connect(service, normalizeProps);
        useFormReset(input, {
            resetsTo: textFieldNativeDefault(value.resetsTo),
            onBeforeReset: value.beforeReset,
            onReset: () =>
                value.reset(() =>
                    service.send({
                        type: "RESET",
                        value: value.defaultValue ?? "",
                    }),
                ),
        });
        // The controlled value as last committed, read after typing rather than captured by it.
        const control = useRef({
            controlled: value.controlled,
            value: value.value,
        });
        useLayoutEffect(() => {
            control.current = {
                controlled: value.controlled,
                value: value.value,
            };
        });
        const restoreInput = useCallback((element: TextControl) => {
            const { controlled, value: current } = control.current;
            if (controlled && current !== undefined)
                syncTextInput(element, current);
        }, []);
        const scope = useComponent(config.anatomy as Anatomy, {
            selection: config.selection(props as never) as Selection<
                Anatomy["name"]
            >,
            testId: props.testId as never,
            unstyled: props.unstyled as never,
        });
        const { as, ...rest } = omitProps(
            props as RootProps & PartProps & Record<string, unknown>,
            config.rootProps as never,
        ) as { as?: ElementType } & Record<string, unknown>;
        return (
            <context.Provider value={{ scope, api, setInput, restoreInput }}>
                {scope.render("root", {
                    element: "div",
                    as,
                    machine: api.getRootProps(),
                    props: rest,
                })}
            </context.Provider>
        );
    }

    /** The filled or outlined box holding the icons, the input, and the label. It reads its
     *  states from the input inside it. */
    function Container({ unstyled, ...props }: TextInputPartProps): ReactNode {
        const { scope, api } = context.use("Container");
        return scope.render("container", {
            element: "div",
            states: { filled: api.filled },
            unstyled,
            props,
        });
    }

    /** The native input or text area: it takes the typing, submits with the form, and validates.
     *  The label names it. */
    function Input({ unstyled, ...props }: TextInputPartProps): ReactNode {
        const { scope, api, setInput, restoreInput } = context.use("Input");
        // The browser shows the typed text before the machine hears of it. Once the machine has
        // sent the change and told the owner, a controlled input is put back to the value last
        // committed; the owner's update, if any, has moved it already.
        const onChange = (event: ChangeEvent<TextControl>) => {
            const element = event.currentTarget;
            queueMicrotask(() => restoreInput(element));
        };
        return scope.render("input", {
            element: config.element,
            machine: combinePartProps([
                (config.element === "textarea"
                    ? api.getTextAreaProps()
                    : api.getInputProps()) as Readonly<Record<string, unknown>>,
                { onChange },
            ]),
            ref: setInput as (element: HTMLElement | null) => void,
            unstyled,
            props,
        });
    }

    /** The floating label: a `<label>` for the input. */
    function Label({ unstyled, ...props }: TextInputPartProps): ReactNode {
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
        }: TextInputIconProps): ReactNode {
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

    /** Helper text under the field. While the field has an error, it shows the error instead. */
    function SupportingText({
        unstyled,
        ...props
    }: TextInputPartProps): ReactNode {
        const { scope, api } = context.use("SupportingText");
        return scope.render("supportingText", {
            element: "span",
            machine: api.getSupportingTextProps(),
            unstyled,
            props: { ...props, children: api.errorText ?? props.children },
        });
    }

    // Inside Root, so it can read whether an error shows.
    function Content({ own }: { readonly own: ReadyMadeProps }): ReactNode {
        const { api } = context.use("Root");
        const slot = useSlotProps(own);
        const showsSupporting =
            isPresent(own.supportingText) || api.errorText !== undefined;
        const inputProps: Record<string, unknown> = {};
        for (const key of config.inputProps)
            inputProps[key] = (own as Record<string, unknown>)[key];
        if (showsSupporting && inputProps["aria-describedby"] === undefined)
            inputProps["aria-describedby"] = api.supportingTextId;
        return (
            <>
                <Container {...slot("container")}>
                    {isPresent(own.leadingIcon) ? (
                        <LeadingIcon
                            mirror={own.mirrorLeadingIcon}
                            {...slot("leadingIcon")}
                        >
                            {own.leadingIcon}
                        </LeadingIcon>
                    ) : null}
                    <Input {...inputProps} {...slot("input")} />
                    <Label {...slot("label")}>{own.label}</Label>
                    {isPresent(own.trailingIcon) ? (
                        <TrailingIcon
                            mirror={own.mirrorTrailingIcon}
                            {...slot("trailingIcon")}
                        >
                            {own.trailingIcon}
                        </TrailingIcon>
                    ) : null}
                </Container>
                {showsSupporting ? (
                    <SupportingText {...slot("supportingText")}>
                        {own.supportingText}
                    </SupportingText>
                ) : null}
            </>
        );
    }

    const readyMadeOwn = [
        "className",
        "style",
        "slotProps",
        ...TEXT_FIELD_CONTENT_PROPS,
        ...config.inputProps,
    ];

    /** The ready-made field: every part, in the preset's structure; the icons and supporting text
     *  only when given (or while an error shows). */
    function ReadyMade(props: ReadyMadeProps): ReactNode {
        const slot = useSlotProps(props);
        const rootProps = omitProps(
            props as ReadyMadeProps & Record<string, unknown>,
            readyMadeOwn as never,
        ) as RootProps;
        return (
            <Root
                {...rootProps}
                leadingIcon={isPresent(props.leadingIcon) || undefined}
                trailingIcon={isPresent(props.trailingIcon) || undefined}
                // The root's slot props are an element's, whose `defaultValue` takes more types.
                {...(slot("root") as object)}
            >
                <Content own={props} />
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
