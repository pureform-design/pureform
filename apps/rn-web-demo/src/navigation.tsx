// Navigation and surfaces: tabs, the navigation bar and rail, a menu, a dialog, a snackbar,
// and tooltips. Each destination, tab, or item tracks its own interaction state.

import { useAnimatedComponentStyles } from "@pureform/rn-adapter/animated";
import type { ReactNode } from "react";
import { Animated } from "react-native";

import { Button } from "./components";
import {
    AnimatedPressable,
    Glyph,
    aview,
    atext,
    unselectable,
    useInk,
    usePress,
    withInk,
} from "./parts";

interface Destination {
    label: string;
    glyph: string;
}

function Tab(props: {
    item: Destination;
    variant: "primary" | "secondary";
    selected: boolean;
    onPress: () => void;
}) {
    const { state, handlers } = usePress({ selected: props.selected });
    const s = useAnimatedComponentStyles(
        "tabs",
        { variant: props.variant, icon: "true" },
        state,
    );
    const ink = useInk(
        "tabs",
        { variant: props.variant, icon: "true" },
        state,
        {
            slot: "tab",
        },
    );
    return (
        <AnimatedPressable
            {...withInk(handlers, ink)}
            role="tab"
            aria-selected={props.selected}
            onPress={props.onPress}
            style={aview({ ...s.tab, ...unselectable })}
        >
            <Animated.View style={aview(s.icon)}>
                <Glyph style={s.icon} glyph={props.item.glyph} />
            </Animated.View>
            <Animated.Text selectable={false} style={atext(s.label)}>
                {props.item.label}
            </Animated.Text>
            <Animated.View pointerEvents="none" style={aview(s.indicator)} />
            {ink.layer}
        </AnimatedPressable>
    );
}

export function Tabs(props: {
    items: Destination[];
    variant?: "primary" | "secondary";
    value: number;
    onChange: (index: number) => void;
}) {
    const variant = props.variant ?? "primary";
    const s = useAnimatedComponentStyles("tabs", { variant, icon: "true" });
    return (
        <Animated.View role="tablist" style={aview(s.root)}>
            {props.items.map((item, index) => (
                <Tab
                    key={item.label}
                    item={item}
                    variant={variant}
                    selected={props.value === index}
                    onPress={() => props.onChange(index)}
                />
            ))}
        </Animated.View>
    );
}

type Navigation = "navigationBar" | "navigationRail";

function NavigationItem(props: {
    name: Navigation;
    item: Destination;
    selected: boolean;
    onPress: () => void;
}) {
    const { state, handlers } = usePress({ selected: props.selected });
    const s = useAnimatedComponentStyles(props.name, {}, state);
    const ink = useInk(props.name, {}, state, {
        slot: "indicator",
        centered: true,
    });
    return (
        <AnimatedPressable
            {...withInk(handlers, ink)}
            role="link"
            aria-current={props.selected ? "page" : undefined}
            onPress={props.onPress}
            style={aview({ ...s.item, ...unselectable })}
        >
            <Animated.View style={aview(s.indicator)}>
                <Animated.View
                    pointerEvents="none"
                    style={aview(s.activeIndicator)}
                />
                <Animated.View style={aview(s.icon)}>
                    <Glyph style={s.icon} glyph={props.item.glyph} />
                </Animated.View>
                {ink.layer}
            </Animated.View>
            <Animated.Text selectable={false} style={atext(s.label)}>
                {props.item.label}
            </Animated.Text>
        </AnimatedPressable>
    );
}

/** The navigation bar, or with `rail`, the navigation rail. */
export function NavigationBar(props: {
    items: Destination[];
    value: number;
    onChange: (index: number) => void;
    rail?: boolean;
}) {
    const name: Navigation = props.rail ? "navigationRail" : "navigationBar";
    const s = useAnimatedComponentStyles(name);
    return (
        <Animated.View role="navigation" style={aview(s.root)}>
            {props.items.map((item, index) => (
                <NavigationItem
                    key={item.label}
                    name={name}
                    item={item}
                    selected={props.value === index}
                    onPress={() => props.onChange(index)}
                />
            ))}
        </Animated.View>
    );
}

function MenuItem(props: {
    item: { label: string; glyph?: string; shortcut?: string };
    selected: boolean;
    disabled?: boolean;
    onPress: () => void;
}) {
    const { state, handlers } = usePress({
        selected: props.selected,
        disabled: props.disabled ?? false,
    });
    const s = useAnimatedComponentStyles("menu", {}, state);
    const ink = useInk("menu", {}, state, {
        slot: "item",
        ...(props.disabled ? { disabled: true } : {}),
    });
    return (
        <AnimatedPressable
            {...withInk(handlers, ink)}
            role="menuitem"
            disabled={props.disabled}
            onPress={props.onPress}
            style={aview({ ...s.item, ...unselectable })}
        >
            {props.item.glyph && (
                <Animated.View style={aview(s.itemLeading)}>
                    <Glyph style={s.itemLeading} glyph={props.item.glyph} />
                </Animated.View>
            )}
            <Animated.Text selectable={false} style={atext(s.itemLabel)}>
                {props.item.label}
            </Animated.Text>
            {props.item.shortcut && (
                <Animated.Text
                    selectable={false}
                    style={atext(s.itemTrailingText)}
                >
                    {props.item.shortcut}
                </Animated.Text>
            )}
            {ink.layer}
        </AnimatedPressable>
    );
}

export function Menu(props: {
    items: {
        label: string;
        glyph?: string;
        shortcut?: string;
        disabled?: boolean;
    }[];
    value: number;
    onChange: (index: number) => void;
}) {
    const s = useAnimatedComponentStyles("menu");
    return (
        <Animated.View role="menu" style={aview(s.root)}>
            {props.items.map((item, index) => (
                <MenuItem
                    key={item.label}
                    item={item}
                    selected={props.value === index}
                    {...(item.disabled ? { disabled: true } : {})}
                    onPress={() => props.onChange(index)}
                />
            ))}
        </Animated.View>
    );
}

export function Dialog(props: {
    glyph?: string;
    headline: string;
    children: ReactNode;
    actions: { label: string; onPress?: () => void }[];
}) {
    const s = useAnimatedComponentStyles("dialog", {
        icon: props.glyph ? "true" : "false",
    });
    return (
        <Animated.View
            role="dialog"
            aria-label={props.headline}
            style={aview(s.root)}
        >
            {props.glyph && (
                <Animated.View style={aview(s.icon)}>
                    <Glyph style={s.icon} glyph={props.glyph} />
                </Animated.View>
            )}
            <Animated.Text style={atext(s.headline)}>
                {props.headline}
            </Animated.Text>
            <Animated.Text style={atext(s.body)}>
                {props.children}
            </Animated.Text>
            <Animated.View style={aview(s.actions)}>
                {props.actions.map((action) => (
                    <Button
                        key={action.label}
                        variant="text"
                        label={action.label}
                        {...(action.onPress ? { onPress: action.onPress } : {})}
                    />
                ))}
            </Animated.View>
        </Animated.View>
    );
}

function SnackbarButton(props: {
    slot: "action" | "close";
    label: string;
    text: string;
}) {
    const { state, handlers } = usePress({});
    const s = useAnimatedComponentStyles("snackbar", {}, state);
    return (
        <AnimatedPressable
            {...handlers}
            role="button"
            aria-label={props.label}
            style={aview({ ...s[props.slot], ...unselectable })}
        >
            <Glyph style={s[props.slot]} glyph={props.text} />
        </AnimatedPressable>
    );
}

export function Snackbar(props: { message: string; action?: string }) {
    const s = useAnimatedComponentStyles("snackbar");
    return (
        <Animated.View role="status" style={aview(s.root)}>
            <Animated.Text style={atext(s.supportingText)}>
                {props.message}
            </Animated.Text>
            {props.action && (
                <SnackbarButton
                    slot="action"
                    label={props.action}
                    text={props.action}
                />
            )}
            <SnackbarButton slot="close" label="Dismiss" text="×" />
        </Animated.View>
    );
}

export function Tooltip(props: { children: string; subhead?: string }) {
    const rich = props.subhead !== undefined;
    const s = useAnimatedComponentStyles("tooltip", {
        variant: rich ? "rich" : "plain",
    });
    if (!rich) {
        return (
            <Animated.View role="tooltip" style={aview(s.root)}>
                <Glyph style={s.root} glyph={props.children} />
            </Animated.View>
        );
    }
    return (
        <Animated.View role="tooltip" style={aview(s.root)}>
            <Animated.Text style={atext(s.subhead)}>
                {props.subhead}
            </Animated.Text>
            <Animated.Text style={atext(s.supportingText)}>
                {props.children}
            </Animated.Text>
        </Animated.View>
    );
}
