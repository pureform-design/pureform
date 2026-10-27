// The native select. On the web, React Native renders a real `<select>` (through React Native
// Web's element), drawn from the same styles. On iOS and Android the trigger is a pressable drawn
// like the web's box (the chosen label and the chevron), and the list is the platform's native menu
// through `@react-native-menu/menu` (iOS's UIMenu, with a check on the chosen option; Android's
// popup menu), an optional peer dependency. Without it installed, the trigger opens the Material
// menu instead, and a development warning says so.
//
// With `multiple`, several options can be chosen and the value is an array. The web's
// `<select multiple>` takes it natively (a form submits each value). The platform menu marks each
// chosen action `on` and toggles the pressed one; on iOS 16+ it stays open between presses
// (`attributes.keepsMenuPresented`), elsewhere it closes after each (unverified on a device). The
// Material menu draws checkbox items that toggle without closing.
//
// Inside a Field it takes the field's id, disabled, required and invalid states and descriptions,
// its own props winning, and is labelled by the field's label.

import { nativeSelectAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    nativeSelectGroups,
    fieldControlState,
    nativeSelectSelection,
    nativeSelectValue,
    nativeSelectValues,
    warnOnce,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    NativeSelectBehaviorProps,
    NativeSelectItem,
    NativeSelectPart,
    NativeSelectValue,
    NativeSelectValueProps,
    NativeSelectVariantProps,
} from "@pureform/binding-core";
import { createElement, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import * as ReactNative from "react-native";
import { Platform, Pressable, Text } from "react-native";

import { isDev } from "../env";
import { useField } from "../field/context";
import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { Menu } from "../menu/menu";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots, useSelectedStyles } from "../styles";

const [INDICATION] = nativeSelectAnatomy.indication!;

/** `@react-native-menu/menu`'s `MenuView` (2.0.0), as far as this binding uses it. */
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
    readonly state?: "on" | "off" | "mixed";
    readonly attributes?: {
        readonly disabled?: boolean;
        /** iOS 16+: the menu stays open after the action fires. */
        readonly keepsMenuPresented?: boolean;
    };
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

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface NativeSelectHosts {
    readonly root: "View";
    readonly select: "Pressable";
    readonly icon: "View";
}

interface NativeSelectBaseProps
    extends
        NativeSelectVariantProps,
        IndicationProps,
        Pick<
            NativeSelectBehaviorProps,
            "disabled" | "invalid" | "required" | "name" | "form" | "id"
        >,
        NativeSlotProps<NativeSelectHosts> {
    /** The options. */
    readonly items?: readonly NativeSelectItem[] | undefined;
    /** What shows while no option with a value is chosen; also the first option, with no value. */
    readonly placeholder?: string | undefined;
    /** The chevron. @default "▾" */
    readonly icon?: ReactNode;
    /** The accessible name. */
    readonly "aria-label"?: string | undefined;
    /** The id of what names it; inside a Field, its label. */
    readonly "aria-labelledby"?: string | undefined;
    /** The ids of what describes it; inside a Field, the field's description and error join
     *  after them. */
    readonly "aria-describedby"?: string | undefined;
    readonly testId?: TestIdOverride<NativeSelectPart> | undefined;
}

/** The native select's props; the value props are typed by `multiple` (a string, or an array of
 *  strings with `multiple`). */
export type NativeSelectProps = NativeSelectBaseProps & NativeSelectValueProps;

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
    chosen: readonly string[],
    multiple: boolean,
): NativeMenuAction[] => {
    const action = (item: NativeSelectItem): NativeMenuAction => {
        const attributes = {
            ...(item.disabled ? { disabled: true } : {}),
            ...(multiple ? { keepsMenuPresented: true } : {}),
        };
        return {
            id: item.value,
            title: item.label,
            state: chosen.includes(item.value) ? "on" : "off",
            ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
        };
    };
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
    const multiple = props.multiple ?? false;
    const [value, setValue] = useControllable<"value", NativeSelectValue>(
        "NativeSelect",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange as
            | ((details: ChangeDetails<"value", NativeSelectValue>) => void)
            | undefined,
        multiple ? [] : first,
    );
    const chosen = nativeSelectValues(value);
    // Pressing an option: with `multiple` it toggles in the value, in the options' order.
    const choose = (picked: string) => {
        if (!multiple) {
            if (picked !== value) setValue(picked);
            return;
        }
        const next = chosen.includes(picked)
            ? chosen.filter((entry) => entry !== picked)
            : items
                  .map((item) => item.value)
                  .filter(
                      (entry) => entry === picked || chosen.includes(entry),
                  );
        setValue(nativeSelectValue(next, true));
    };
    const field = useField()?.state;
    const control = fieldControlState(field, {
        ...props,
        describedBy: props["aria-describedby"],
    });
    const disabled = control.disabled ?? false;
    const invalid = control.invalid;
    const web = Platform.OS === "web";
    const [focused, setFocused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const indication = useSurfaceIndication(INDICATION, {
        indication: props.indication,
        disabled,
        interactive: !web,
    });
    const selection = indication.select(nativeSelectSelection(props));
    const state = {
        ...(web ? {} : indication.states({})),
        ...(web && hovered ? { hover: true } : {}),
        ...(web && focused ? { focus: true, focusVisible: true } : {}),
        ...(invalid ? { invalid: true } : {}),
        ...(disabled ? { disabled: true } : {}),
    };
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<NativeSelectPart>("nativeSelect", selection, state);
    const plain = useSelectedStyles("nativeSelect", selection, state).styles;
    const id = (part: NativeSelectPart) =>
        testIdOf(nativeSelectAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const labels = items
        .filter((item) => chosen.includes(item.value))
        .map((item) => item.label);
    const shown =
        labels.length > 0
            ? multiple
                ? labels.join(", ")
                : labels[0]
            : (props.placeholder ?? "");
    const icon = (
        <v.icon.View
            {...slot.props("icon")}
            pointerEvents="none"
            style={slot.style("icon", s.icon)}
            testID={id("icon")}
        >
            <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                {props.icon ?? "▾"}
            </IconSlot>
        </v.icon.View>
    );
    const label = props["aria-label"];
    const labelledBy =
        props["aria-labelledby"] ??
        (field && !label ? field.ids.label : undefined);

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
            <v.root.View
                {...slot.props("root")}
                style={slot.style("root", s.root)}
                testID={id("root")}
            >
                {webElement("select", {
                    value: multiple ? chosen : value,
                    onChange: (event: {
                        target: {
                            selectedOptions: ArrayLike<{ value: string }>;
                        };
                    }) =>
                        setValue(
                            nativeSelectValue(
                                Array.from(
                                    event.target.selectedOptions,
                                    (option) => option.value,
                                ),
                                multiple,
                            ),
                        ),
                    onFocus: () => setFocused(true),
                    onBlur: () => setFocused(false),
                    onMouseEnter: () => setHovered(true),
                    onMouseLeave: () => setHovered(false),
                    id: control.id,
                    disabled: disabled || undefined,
                    required: control.required || undefined,
                    "aria-invalid": invalid ? "true" : undefined,
                    "aria-describedby": control.describedBy,
                    name: props.name,
                    form: props.form,
                    multiple: props.multiple || undefined,
                    "aria-label": label,
                    "aria-labelledby": labelledBy,
                    style: {
                        ...plain.select,
                        ...unselectable,
                    },
                    "data-testid": id("select"),
                    children: [
                        props.placeholder !== undefined && !multiple
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
            {...slot.props("select")}
            {...(onPress ? indication.handlers : {})}
            role="combobox"
            {...(label ? { "aria-label": label } : {})}
            {...(labelledBy ? { "aria-labelledby": labelledBy } : {})}
            {...(control.id ? { nativeID: control.id } : {})}
            aria-expanded={expanded ?? false}
            aria-invalid={invalid}
            aria-required={control.required || undefined}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            onPress={slot.on("select", "onPress", onPress)}
            style={slot.style(
                "select",
                withUnselectable(plain.select) as never,
            )}
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
            <v.root.View
                {...slot.props("root")}
                style={slot.style("root", s.root)}
                testID={id("root")}
            >
                <NativeMenu
                    actions={menuActions(items, chosen, multiple)}
                    onPressAction={({ nativeEvent }) =>
                        choose(nativeEvent.event)
                    }
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
            ...(multiple
                ? {
                      type: "checkbox" as const,
                      checked: chosen.includes(item.value),
                      closeOnSelect: false,
                  }
                : {}),
        })),
    }));
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            <Menu
                groups={groups}
                grouped={groups.some((run) => run.label !== undefined)}
                value={multiple ? null : (chosen[0] ?? null)}
                onSelect={(details) => choose(details.value)}
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
