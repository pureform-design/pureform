// Navigation and surfaces: tabs, the navigation bar and rail, a menu, a dialog, a snackbar,
// and tooltips. Each destination, tab, or item tracks its own interaction state.

import type { ReactNode } from "react";

import { Button } from "./components";
import {
    atext,
    aview,
    Glyph,
    MPressable,
    MText,
    MView,
    unselectable,
    useInk,
    useMotionStyles,
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
    const s = useMotionStyles(
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
        <MPressable
            {...withInk(handlers, ink)}
            role="tab"
            aria-selected={props.selected}
            onPress={props.onPress}
            style={aview({ ...s.tab, ...unselectable })}
        >
            <MView style={aview(s.icon)}>
                <Glyph style={s.icon} glyph={props.item.glyph} />
            </MView>
            <MText selectable={false} style={atext(s.label)}>
                {props.item.label}
            </MText>
            <MView pointerEvents="none" style={aview(s.indicator)} />
            {ink.layer}
        </MPressable>
    );
}

export function Tabs(props: {
    items: Destination[];
    variant?: "primary" | "secondary";
    value: number;
    onChange: (index: number) => void;
}) {
    const variant = props.variant ?? "primary";
    const s = useMotionStyles("tabs", { variant, icon: "true" });
    return (
        <MView role="tablist" style={aview(s.root)}>
            {props.items.map((item, index) => (
                <Tab
                    key={item.label}
                    item={item}
                    variant={variant}
                    selected={props.value === index}
                    onPress={() => props.onChange(index)}
                />
            ))}
        </MView>
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
    const s = useMotionStyles(props.name, {}, state);
    const ink = useInk(props.name, {}, state, {
        slot: "indicator",
        centered: true,
    });
    return (
        <MPressable
            {...withInk(handlers, ink)}
            role="link"
            aria-current={props.selected ? "page" : undefined}
            onPress={props.onPress}
            style={aview({ ...s.item, ...unselectable })}
        >
            <MView style={aview(s.indicator)}>
                <MView pointerEvents="none" style={aview(s.activeIndicator)} />
                <MView style={aview(s.icon)}>
                    <Glyph style={s.icon} glyph={props.item.glyph} />
                </MView>
                {ink.layer}
            </MView>
            <MText selectable={false} style={atext(s.label)}>
                {props.item.label}
            </MText>
        </MPressable>
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
    const s = useMotionStyles(name);
    return (
        <MView role="navigation" style={aview(s.root)}>
            {props.items.map((item, index) => (
                <NavigationItem
                    key={item.label}
                    name={name}
                    item={item}
                    selected={props.value === index}
                    onPress={() => props.onChange(index)}
                />
            ))}
        </MView>
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
    const s = useMotionStyles("menu", {}, state);
    const ink = useInk("menu", {}, state, {
        slot: "item",
        ...(props.disabled ? { disabled: true } : {}),
    });
    return (
        <MPressable
            {...withInk(handlers, ink)}
            role="menuitem"
            disabled={props.disabled}
            onPress={props.onPress}
            style={aview({ ...s.item, ...unselectable })}
        >
            {props.item.glyph && (
                <MView style={aview(s.itemLeading)}>
                    <Glyph style={s.itemLeading} glyph={props.item.glyph} />
                </MView>
            )}
            <MText selectable={false} style={atext(s.itemLabel)}>
                {props.item.label}
            </MText>
            {props.item.shortcut && (
                <MText selectable={false} style={atext(s.itemTrailingText)}>
                    {props.item.shortcut}
                </MText>
            )}
            {ink.layer}
        </MPressable>
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
    const s = useMotionStyles("menu");
    return (
        <MView role="menu" style={aview(s.root)}>
            {props.items.map((item, index) => (
                <MenuItem
                    key={item.label}
                    item={item}
                    selected={props.value === index}
                    {...(item.disabled ? { disabled: true } : {})}
                    onPress={() => props.onChange(index)}
                />
            ))}
        </MView>
    );
}

export function Dialog(props: {
    glyph?: string;
    headline: string;
    children: ReactNode;
    actions: { label: string; onPress?: () => void }[];
}) {
    const s = useMotionStyles("dialog", {
        icon: props.glyph ? "true" : "false",
    });
    return (
        <MView role="dialog" aria-label={props.headline} style={aview(s.root)}>
            {props.glyph && (
                <MView style={aview(s.icon)}>
                    <Glyph style={s.icon} glyph={props.glyph} />
                </MView>
            )}
            <MText style={atext(s.headline)}>{props.headline}</MText>
            <MText style={atext(s.body)}>{props.children}</MText>
            <MView style={aview(s.actions)}>
                {props.actions.map((action) => (
                    <Button
                        key={action.label}
                        variant="text"
                        label={action.label}
                        {...(action.onPress ? { onPress: action.onPress } : {})}
                    />
                ))}
            </MView>
        </MView>
    );
}

function SnackbarButton(props: {
    slot: "action" | "close";
    label: string;
    text: string;
}) {
    const { state, handlers } = usePress({});
    const s = useMotionStyles("snackbar", {}, state);
    return (
        <MPressable
            {...handlers}
            role="button"
            aria-label={props.label}
            style={aview({ ...s[props.slot], ...unselectable })}
        >
            <Glyph style={s[props.slot]} glyph={props.text} />
        </MPressable>
    );
}

export function Snackbar(props: { message: string; action?: string }) {
    const s = useMotionStyles("snackbar");
    return (
        <MView role="status" style={aview(s.root)}>
            <MText style={atext(s.supportingText)}>{props.message}</MText>
            {props.action && (
                <SnackbarButton
                    slot="action"
                    label={props.action}
                    text={props.action}
                />
            )}
            <SnackbarButton slot="close" label="Dismiss" text="×" />
        </MView>
    );
}

export function Tooltip(props: { children: string; subhead?: string }) {
    const rich = props.subhead !== undefined;
    const s = useMotionStyles("tooltip", {
        variant: rich ? "rich" : "plain",
    });
    if (!rich) {
        return (
            <MView role="tooltip" style={aview(s.root)}>
                <Glyph style={s.root} glyph={props.children} />
            </MView>
        );
    }
    return (
        <MView role="tooltip" style={aview(s.root)}>
            <MText style={atext(s.subhead)}>{props.subhead}</MText>
            <MText style={atext(s.supportingText)}>{props.children}</MText>
        </MView>
    );
}
