// The text: its children in one of the theme's text styles, chosen with `textStyle` (the preset's
// `style` variant group, which an element's `style` prop already names).

import { textAnatomy } from "@pureform/anatomy";
import { TEXT_ROOT_PROPS, textSelection } from "@pureform/binding-core";
import type { TextRootOwnProps } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import type { PartProps } from "../props";
import { createSinglePart } from "../single-part";

/** The text's props: its own (variants, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface TextProps
    extends Omit<PartProps, keyof TextRootOwnProps>, TextRootOwnProps {
    /** Another element or component to render instead of `<span>`: `"h2"`, `"p"`. */
    readonly as?: ElementType | undefined;
}

const Root = createSinglePart({
    anatomy: textAnatomy,
    element: (_props: TextProps) => "span",
    ownProps: TEXT_ROOT_PROPS,
    selection: textSelection,
});

/** Text in one of the theme's text styles: `<Text textStyle="titleLarge" as="h2">Inbox</Text>`. */
export const Text: ((props: TextProps) => ReactNode) & {
    readonly Root: (props: TextProps) => ReactNode;
} = Object.assign(Root, { Root });
