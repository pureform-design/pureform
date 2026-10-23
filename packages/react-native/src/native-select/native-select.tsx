// The native select. On the web, React Native renders a real `<select>` (through React Native
// Web's element), drawn from the same styles. On iOS and Android the trigger is a pressable drawn
// like the web's box (the chosen label and the chevron), and the list is the platform's native menu
// through `@react-native-menu/menu` (iOS's UIMenu, with a check on the chosen option; Android's
// popup menu), an optional peer dependency. Without it installed, the trigger opens the Material
// menu instead, and a development warning says so.

import { nativeSelectAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    nativeSelectGroups,
    nativeSelectSelection,
    warnOnce,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    NativeSelectBehaviorProps,
    NativeSelectItem,
    NativeSelectPart,
    NativeSelectVariantProps,
} from "@pureform/binding-core";
import { createElement, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import * as ReactNative from "react-native";
import { Platform, Pressable, Text } from "react-native";

import { isDev } from "../env";
import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { Menu } from "../menu/menu";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useComponentSlots, useSelectedStyles } from "../styles";

const [INDICATION] = nativeSelectAnatomy.indication!;

/** `@react-native-menu/menu`'s `MenuView`, as far as this binding uses it. */
interface MenuViewProps {
    readonly actions: readonly NativeMenuAction[];
    readonly onPressAction: (event: {
        readonly nativeEvent: { readonly event: string };
    }) => void;
    readonly style?: object;
    readonly children?: ReactNode;
}

interface NativeMenuAction {
    readonly id: string;
    readonly title: string;
    readonly state?: "on" | "off";
    readonly attributes?: { readonly disabled?: boolean };
    readonly displayInline?: boolean;
    readonly subactions?: readonly NativeMenuAction[];
}

declare const require: (id: string) => unknown;

let menuView: ComponentType<MenuViewProps> | null | undefined;

// The optional peer, read once: `require` inside `try` is how Metro takes an optional dependency.
const nativeMenu = (): ComponentType<MenuViewProps> | null => {
    if (menuView === undefined) {
        try {
            menuView = (
                require("@react-native-menu/menu") as {
                    MenuView: ComponentType<MenuViewProps>;
                }
            ).MenuView;
        } catch {
            menuView = null;
        }
    }
    return menuView;
};

export const MISSING_MENU_MESSAGE =
    "pureform: NativeSelect uses the platform's menu through `@react-native-menu/menu`, which isn't installed, so it opens the Material menu instead. Install it (`npm i @react-native-menu/menu`) for the native list.";

export interface NativeSelectProps
    extends
        NativeSelectVariantProps,
        IndicationProps,
        Pick<
            NativeSelectBehaviorProps,
            | "value"
            | "defaultValue"
            | "onValueChange"
            | "disabled"
            | "invalid"
            | "required"
            | "name"
            | "form"
        > {
    /** The options. */
    readonly items?: readonly NativeSelectItem[] | undefined;
    /** What shows while no option with a value is chosen; also the first option, with no value. */
    readonly placeholder?: string | undefined;
    /** The chevron. @default "▾" */
    readonly icon?: ReactNode;
    /** The accessible name. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<NativeSelectPart> | undefined;
}

// A style's text keys, for the label inside the box (a `Text` doesn't inherit from its parent).
const TEXT_KEYS = [
    "color",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
] as const;

const textOf = (style: Record<string, unknown> | undefined) => {
    const text: Record<string, unknown> = {};
    for (const key of TEXT_KEYS)
        if (style?.[key] !== undefined) text[key] = style[key];
    return text;
};

// React Native Web's own element: a real DOM element drawn from React Native styles.
const webElement = (
    ReactNative as unknown as {
        unstable_createElement?: (
            component: string,
            props: Record<string, unknown>,
        ) => ReactNode;
    }
).unstable_createElement;

// The platform menu's actions: options outside a group as they come, a group as an inline section.
const menuActions = (
    items: readonly NativeSelectItem[],
    value: string,
): NativeMenuAction[] => {
    const action = (item: NativeSelectItem): NativeMenuAction => ({
        id: item.value,
        title: item.label,
        state: item.value === value ? "on" : "off",
        ...(item.disabled ? { attributes: { disabled: true } } : {}),
    });
    return nativeSelectGroups(items).flatMap((run, index) =>
        run.group === undefined
            ? run.items.map(action)
            : [
                  {
                      id: `group-${index}`,
                      title: run.group,
                      displayInline: true,
                      subactions: run.items.map(action),
                  },
              ],
    );
};

function NativeSelectImpl(props: NativeSelectProps): ReactNode {
    const items = props.items ?? [];
    const first =
        props.placeholder !== undefined ? "" : (items[0]?.value ?? "");
    const [value, setValue] = useControllable<"value", string>(
        "NativeSelect",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        first,
    );
    const web = Platform.OS === "web";
    const [focused, setFocused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const indication = useSurfaceIndication(INDICATION, {
        indication: props.indication,
        disabled: props.disabled,
        interactive: !web,
    });
    const selection = indication.select(nativeSelectSelection(props));
    const state = {
        ...(web ? {} : indication.states({})),
        ...(web && hovered ? { hover: true } : {}),
        ...(web && focused ? { focus: true, focusVisible: true } : {}),
        ...(props.invalid ? { invalid: true } : {}),
        ...(props.disabled ? { disabled: true } : {}),
    };
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<NativeSelectPart>("nativeSelect", selection, state);
    const plain = useSelectedStyles("nativeSelect", selection, state).styles;
    const id = (part: NativeSelectPart) =>
        testIdOf(nativeSelectAnatomy, part, props.testId);
    const shown =
        items.find((item) => item.value === value)?.label ??
        (value === "" ? props.placeholder : undefined) ??
        "";
    const icon = (
        <v.icon.View pointerEvents="none" style={s.icon} testID={id("icon")}>
            <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                {props.icon ?? "▾"}
            </IconSlot>
        </v.icon.View>
    );
    const label = props["aria-label"];

    if (web && webElement) {
        // The state layer's tint and the focus ring come from the styles above; a raw element
        // reports its own hover and focus.
        const options = (list: readonly NativeSelectItem[]) =>
            list.map((item) =>
                createElement(
                    "option",
                    {
                        key: item.value,
                        value: item.value,
                        disabled: item.disabled,
                    },
                    item.label,
                ),
            );
        return (
            <v.root.View style={s.root} testID={id("root")}>
                {webElement("select", {
                    value,
                    onChange: (event: { target: { value: string } }) =>
                        setValue(event.target.value),
                    onFocus: () => setFocused(true),
                    onBlur: () => setFocused(false),
                    onMouseEnter: () => setHovered(true),
                    onMouseLeave: () => setHovered(false),
                    disabled: props.disabled,
                    required: props.required,
                    name: props.name,
                    form: props.form,
                    "aria-label": label,
                    "aria-invalid": props.invalid ? true : undefined,
                    style: {
                        ...plain.select,
                        ...unselectable,
                    },
                    "data-testid": id("select"),
                    children: [
                        props.placeholder !== undefined
                            ? createElement(
                                  "option",
                                  { key: "", value: "" },
                                  props.placeholder,
                              )
                            : null,
                        ...nativeSelectGroups(items).map((run, index) =>
                            run.group === undefined
                                ? options(run.items)
                                : createElement(
                                      "optgroup",
                                      {
                                          key: `group-${index}`,
                                          label: run.group,
                                      },
                                      options(run.items),
                                  ),
                        ),
                    ],
                })}
                {icon}
            </v.root.View>
        );
    }

    const NativeMenu = nativeMenu();
    if (!NativeMenu && isDev) warnOnce(MISSING_MENU_MESSAGE);
    const box = (onPress?: () => void, expanded?: boolean) => (
        <Pressable
            {...(onPress ? indication.handlers : {})}
            role="combobox"
            {...(label ? { "aria-label": label } : {})}
            aria-expanded={expanded ?? false}
            aria-invalid={props.invalid}
            disabled={props.disabled}
            onPress={onPress}
            style={[plain.select, unselectable] as never}
            testID={id("select")}
        >
            <Text
                numberOfLines={1}
                selectable={false}
                style={{ flexShrink: 1, ...textOf(plain.select) } as never}
            >
                {shown}
            </Text>
        </Pressable>
    );
    if (NativeMenu) {
        return (
            <v.root.View style={s.root} testID={id("root")}>
                <NativeMenu
                    actions={menuActions(items, value)}
                    onPressAction={({ nativeEvent }) => {
                        if (nativeEvent.event !== value)
                            setValue(nativeEvent.event);
                    }}
                    style={{ alignSelf: "stretch" }}
                >
                    {box()}
                </NativeMenu>
                {icon}
            </v.root.View>
        );
    }
    const groups = nativeSelectGroups(items).map((run, index) => ({
        id: run.group ?? `ungrouped-${index}`,
        label: run.group,
        items: run.items.map((item) => ({
            value: item.value,
            label: item.label,
            disabled: item.disabled,
        })),
    }));
    return (
        <v.root.View style={s.root} testID={id("root")}>
            <Menu
                groups={groups}
                grouped={groups.some((run) => run.label !== undefined)}
                value={value}
                onSelect={(details) => setValue(details.value)}
                trigger={(trigger, { open }) => box(trigger.onPress, open)}
            />
            {icon}
            {indication.layer(selected)}
        </v.root.View>
    );
}

/** A styled native select: `<NativeSelect aria-label="Size" items={sizes} defaultValue="m" />`. */
export const NativeSelect: ComponentType<NativeSelectProps> = withEngine(
    NativeSelectImpl,
    "NativeSelect",
);

export type { ChangeDetails };
