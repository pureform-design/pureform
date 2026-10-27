// Field: a column connecting the plain form primitives inside it (Label, Input, Textarea,
// Description and ErrorText, each in its own module): the label's `for`, the control's
// `aria-describedby` (the description and the error it holds), and the disabled, invalid and
// required states. With no children, it renders a label, an Input, a description and an error
// from its `label`, `description` and `error`.

import { fieldAnatomy } from "@pureform/anatomy";
import {
    FIELD_ROOT_PROPS,
    fieldIds,
    fieldSelection,
    fieldState,
    isPresent,
} from "@pureform/binding-core";
import type {
    FieldContentProps,
    FieldRootOwnProps,
} from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    createMemo,
    createSignal,
    createUniqueId,
    merge,
    omit,
    Show,
} from "solid-js";

import { Description } from "../description/description";
import type { DescriptionProps } from "../description/description";
import { ErrorText } from "../error-text/error-text";
import type { ErrorTextProps } from "../error-text/error-text";
import { Input } from "../input/input";
import type { InputProps } from "../input/input";
import { Label } from "../label/label";
import type { LabelProps } from "../label/label";
import { useComponent } from "../parts";
import type { PartProps } from "../props";
import { FieldContext } from "./context";
import type { FieldDescribed } from "./context";

/** Field's props: its states, the control's id, the ready-made content, its tokens, `testId`
 *  and `unstyled`, `as`, and the element's own props. */
export interface FieldProps
    extends
        Omit<PartProps, keyof FieldRootOwnProps | "children">,
        FieldRootOwnProps,
        FieldContentProps<JSX.Element> {
    /** The pieces: a Label, an Input, a Textarea or a NativeSelect, a Description and an
     *  ErrorText. Left out, Field renders them from `label`, `description` and `error`. */
    readonly children?: JSX.Element;
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
    /** The ready-made label's props: its `class`, `style`, `testId`, `unstyled`, `tokens`, and
     *  the element's own. */
    readonly labelProps?: Omit<LabelProps, "children"> | undefined;
    /** The ready-made input's props (`type`, `placeholder`, `class`, `tokens`, …). */
    readonly inputProps?: InputProps | undefined;
    /** The ready-made description's props. */
    readonly descriptionProps?: Omit<DescriptionProps, "children"> | undefined;
    /** The ready-made error text's props. */
    readonly errorTextProps?: Omit<ErrorTextProps, "children"> | undefined;
}

/** A column connecting the pieces inside it. */
export function Field(props: FieldProps): JSX.Element {
    const generated = createUniqueId();
    const ids = createMemo(() =>
        fieldIds(props.controlId ?? `${generated}-control`),
    );
    const readyMade = () => !("children" in props);
    const [mounted, setMounted] = createSignal<FieldDescribed>(
        { description: false, error: false },
        { ownedWrite: true },
    );
    // The ready-made pieces are known from the props, so the server renders their ids too.
    const described = (): FieldDescribed => ({
        description:
            mounted().description ||
            (readyMade() && isPresent(props.description)),
        error: mounted().error || (readyMade() && isPresent(props.error)),
    });
    const state = createMemo(() => fieldState(props, ids(), described()));
    const describe = (piece: keyof FieldDescribed, present: boolean) =>
        setMounted((current) =>
            current[piece] === present
                ? current
                : { ...current, [piece]: present },
        );
    const scope = useComponent(fieldAnatomy, {
        selection: () => fieldSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const merged = merge(
        omit(
            props,
            "as",
            "children",
            "labelProps",
            "inputProps",
            "descriptionProps",
            "errorTextProps",
            ...FIELD_ROOT_PROPS,
        ),
        {
            get children() {
                // oxlint-disable-next-line solid/components-return-once -- a live props getter the part reads, not a component body
                return readyMade() ? (
                    <>
                        <Show when={isPresent(props.label)}>
                            <Label {...props.labelProps}>{props.label}</Label>
                        </Show>
                        <Input {...props.inputProps} />
                        <Show when={isPresent(props.description)}>
                            <Description {...props.descriptionProps}>
                                {props.description}
                            </Description>
                        </Show>
                        <Show when={isPresent(props.error)}>
                            <ErrorText {...props.errorTextProps}>
                                {props.error}
                            </ErrorText>
                        </Show>
                    </>
                ) : (
                    props.children
                );
            },
        },
    );
    return (
        <FieldContext value={{ state, describe }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: merged,
            })}
        </FieldContext>
    );
}
