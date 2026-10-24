// The plain Field: connects the pieces inside it: the label's `htmlFor`, the control's
// `aria-describedby` (the description and the error it holds), and the disabled, invalid and
// required states, through `FieldContext`. Each piece also works alone, in its own module. With
// no children, Field renders a label, an Input, a description and an error from its `label`,
// `description` and `error`.

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
    FieldState,
} from "@pureform/binding-core";
import { useCallback, useId, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";

import { Description } from "../description/description";
import type { DescriptionProps } from "../description/description";
import { ErrorText } from "../error-text/error-text";
import type { ErrorTextProps } from "../error-text/error-text";
import { Input } from "../input/input";
import type { InputProps } from "../input/input";
import { Label } from "../label/label";
import type { LabelProps } from "../label/label";
import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { FieldContext } from "./context";

type Described = FieldState["described"];

/** Field's props: its states, the control's id, the ready-made content, its tokens, `testId`
 *  and `unstyled`, `as`, and the element's own props. */
export interface FieldProps
    extends
        Omit<PartProps, keyof FieldRootOwnProps | "children">,
        FieldRootOwnProps,
        FieldContentProps<ReactNode> {
    /** The pieces: a Label, an Input, a Textarea or a NativeSelect, a Description and an
     *  ErrorText. Left out, Field renders them from `label`, `description` and `error`. */
    readonly children?: ReactNode;
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
    /** The ready-made label's props: its `className`, `style`, `testId`, `unstyled`, `tokens`,
     *  and the element's own. */
    readonly labelProps?: Omit<LabelProps, "children"> | undefined;
    /** The ready-made input's props (`type`, `placeholder`, `className`, `tokens`, …). */
    readonly inputProps?: InputProps | undefined;
    /** The ready-made description's props. */
    readonly descriptionProps?: Omit<DescriptionProps, "children"> | undefined;
    /** The ready-made error text's props. */
    readonly errorTextProps?: Omit<ErrorTextProps, "children"> | undefined;
}

/** A column connecting the pieces inside it. */
export function Field(props: FieldProps): ReactNode {
    const generated = useId();
    const ids = useMemo(
        () => fieldIds(props.controlId ?? `${generated}-control`),
        [props.controlId, generated],
    );
    const readyMade = props.children === undefined;
    const [described, setDescribed] = useState<Described>(() => ({
        description: readyMade && isPresent(props.description),
        error: readyMade && isPresent(props.error),
    }));
    const state = fieldState(props, ids, described);
    const describe = useCallback(
        (piece: keyof Described, present: boolean) =>
            setDescribed((current) =>
                current[piece] === present
                    ? current
                    : { ...current, [piece]: present },
            ),
        [],
    );
    const scope = useComponent(fieldAnatomy, {
        selection: fieldSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const {
        as,
        children,
        labelProps,
        inputProps,
        descriptionProps,
        errorTextProps,
        ...rest
    } = omitProps(props, FIELD_ROOT_PROPS);
    return (
        <FieldContext value={{ state, describe }}>
            {scope.render("root", {
                element: "div",
                as,
                props: {
                    ...rest,
                    children: readyMade ? (
                        <>
                            {isPresent(props.label) && (
                                <Label {...labelProps}>{props.label}</Label>
                            )}
                            <Input {...inputProps} />
                            {isPresent(props.description) && (
                                <Description {...descriptionProps}>
                                    {props.description}
                                </Description>
                            )}
                            {isPresent(props.error) && (
                                <ErrorText {...errorTextProps}>
                                    {props.error}
                                </ErrorText>
                            )}
                        </>
                    ) : (
                        children
                    ),
                },
            })}
        </FieldContext>
    );
}
