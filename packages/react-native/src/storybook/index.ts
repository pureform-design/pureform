// `@pureform/react-native/storybook`: what a Storybook needs to render React Native's components,
// as a hook module `apps/storybook-web` reads (see its README): decorators that wrap every story,
// starting with the provider, and the args React Native names differently from the web.

import type { AnyRegistry } from "@pureform/binding-core";
import { createElement } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

import { animatedSvg } from "../engines/svg";
import { PureformProvider } from "../provider";

/** The story's theme from the toolbar: the scheme (`undefined` follows the system), and a named
 *  theme from the config. */
export interface StoryTheme {
    readonly scheme?: "light" | "dark" | undefined;
    readonly name?: string | undefined;
}

export interface StoryContext {
    readonly registry: AnyRegistry;
    readonly theme: StoryTheme;
    readonly globals: Readonly<Record<string, unknown>>;
}

/** Wraps the story, inner decorators first. */
export type Decorator = (
    story: () => ReactNode,
    context: StoryContext,
) => ReactNode;

/** The provider with the story's registry, its scheme, and its named theme. Without a scheme the
 *  provider follows `useColorScheme()`, which React Native Web reads from the system. It draws
 *  with the SVG engine (react-native-svg, which runs on React Native Web), so shaped parts (a
 *  shaped media, the loading indicator's shapes) draw as an app with that engine shows them;
 *  the default engine has no shapes. */
const withProvider: Decorator = (story, context) =>
    createElement(
        PureformProvider,
        {
            registry: context.registry,
            engine: animatedSvg,
            ...(context.theme.scheme ? { scheme: context.theme.scheme } : {}),
            theme: context.theme.name,
        },
        story(),
    );

/** A view around the story, as an app's root is: React Native lays out in flex columns, so
 *  what keeps its own size there (a badge's `alignSelf`) would otherwise stretch across the
 *  canvas's block element. */
const withAppRoot: Decorator = (story) =>
    createElement(View, { style: { flexGrow: 1 } }, story());

export const decorators: readonly Decorator[] = [withAppRoot, withProvider];

/** The stories' args as React Native's props: a press is `onPress`, where the web clicks, and the
 *  web's ready-made `body` (a dialog's, a sheet's) is the content React Native takes as
 *  `children`. */
export const args = ({
    onClick,
    ...rest
}: Readonly<Record<string, unknown>>): Record<string, unknown> => {
    const props: Record<string, unknown> =
        onClick === undefined ? rest : { onPress: onClick, ...rest };
    if (rest["body"] !== undefined && rest["children"] === undefined)
        props["children"] = rest["body"];
    return props;
};
