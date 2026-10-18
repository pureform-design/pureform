// The shared floating button and the panel it opens: a modal side sheet (the dialog, docked to
// the inline end) with the settings that restyle the whole page and an app selector. It lives in
// the root layout, outside every app's own layout, so it stays put while the apps navigate.

import { css } from "$css";
import { PureformProvider } from "@pureform/solid";
import { Avatar } from "@pureform/solid/avatar";
import { Button } from "@pureform/solid/button";
import { Chip } from "@pureform/solid/chip";
import { Dialog } from "@pureform/solid/dialog";
import { Fab } from "@pureform/solid/fab";
import { IconButton } from "@pureform/solid/icon-button";
import { List } from "@pureform/solid/list";
import { Tabs } from "@pureform/solid/tabs";
import { Text } from "@pureform/solid/text";
import { TextField } from "@pureform/solid/text-field";
import type { JSX } from "@solidjs/web";
import { useLocation } from "@tanstack/solid-router";
import {
    createEffect,
    createSignal,
    createUniqueId,
    For,
    Show,
    untrack,
} from "solid-js";

import { APPS, appAt } from "../apps";
import {
    COLORS,
    DENSITIES,
    DIRECTIONS,
    FONTS,
    INDICATIONS,
    isHexColor,
    MOTIONS,
    SCHEMES,
    SHAPES,
} from "../lib/settings";
import type { Settings } from "../lib/settings";
import { Glyph } from "../ui/icons";
import { overlay } from "../ui/layers";
import { useSettings } from "./settings";
import { swatchTheme } from "./theme";

// The button sits at the bottom of the inline end, centered over the column an app's own FAB
// takes (a 56dp FAB, 16dp from the edge), and above it and an app's navigation bar (80dp, on
// compact screens) when the page has them: an app marks its FAB `data-app-fab` and its bar
// `data-bottom-bar`.
const FAB_HEIGHT = "token(spacing.12) + token(spacing.2)";
const NAVIGATION_BAR_HEIGHT = "token(spacing.16) + token(spacing.4)";
const fab = css({
    position: "fixed",
    zIndex: 1,
    insetInlineEnd: "calc(token(spacing.4) + token(spacing.2))",
    bottom: "4",
    "html:has([data-app-fab]) &": {
        bottom: `calc(${FAB_HEIGHT} + token(spacing.4) * 2)`,
    },
    mdDown: {
        "html:has([data-bottom-bar]) &": {
            bottom: `calc(${NAVIGATION_BAR_HEIGHT} + token(spacing.4))`,
        },
        "html:has([data-bottom-bar]):has([data-app-fab]) &": {
            bottom: `calc(${NAVIGATION_BAR_HEIGHT} + ${FAB_HEIGHT} + token(spacing.4) * 2)`,
        },
    },
});

// The sheet: full height at the inline end, as wide as Material's side sheet allows.
const sheet = css({
    height: "100%",
    width: "calc(token(spacing.16) * 6)",
    maxWidth: "calc(100% - token(spacing.12))",
    minWidth: "0",
    paddingInline: "0",
    paddingBlockEnd: "4",
    gap: "0",
    borderStartEndRadius: "0",
    borderEndEndRadius: "0",
});

const sheetHeader = css({
    display: "flex",
    alignItems: "center",
    gap: "2",
    paddingInlineStart: "6",
    paddingInlineEnd: "3",
    paddingBlockEnd: "2",
});

const grow = css({ flex: "1", minWidth: "0" });

const tabs = css({
    display: "flex",
    flexDirection: "column",
    flex: "1",
    minHeight: "0",
});

const panel = css({
    flex: "1",
    minHeight: "0",
    overflowY: "auto",
    paddingInline: "6",
    paddingBlock: "4",
});

const sections = css({ display: "grid", gap: "6" });

const section = css({ display: "grid", gap: "3" });

const chips = css({ display: "flex", flexWrap: "wrap", gap: "2" });

const actions = css({
    display: "flex",
    justifyContent: "flex-end",
    gap: "2",
    paddingInline: "6",
    paddingBlockStart: "4",
});

const sheetPositioner = {
    "justify-content": "flex-end",
    "align-items": "stretch",
    padding: "0",
} as const;

type Option<V extends string> = { readonly value: V; readonly label: string };

/** One setting as a row of filter chips, one of them selected. */
function ChipSetting<K extends keyof Settings>(props: {
    label: string;
    setting: K;
    options: readonly Option<Settings[K] & string>[];
}): JSX.Element {
    const { settings, update } = useSettings();
    const id = createUniqueId();
    return (
        <section class={section}>
            <Text textStyle="titleSmall" as="h3" id={id}>
                {props.label}
            </Text>
            <div class={chips} role="group" aria-labelledby={id}>
                <For each={props.options}>
                    {(option) => {
                        const selected = () =>
                            settings()[props.setting] === option.value;
                        return (
                            <Chip
                                label={option.label}
                                selected={selected()}
                                icon={
                                    selected() ? (
                                        <Glyph name="check" />
                                    ) : undefined
                                }
                                onSelectedChange={() =>
                                    update({
                                        [props.setting]: option.value,
                                    } as Partial<Settings>)
                                }
                            />
                        );
                    }}
                </For>
            </div>
        </section>
    );
}

/** The color setting: a swatch per palette, each drawn by the theme it would apply (a nested
 *  provider), and a field for any seed. */
function ColorSetting(): JSX.Element {
    const { settings, update } = useSettings();
    const id = createUniqueId();
    const [seed, setSeed] = createSignal<string>(
        untrack(() => settings().customSeed),
    );
    const current = () =>
        COLORS.find((color) => color.value === settings().color)!;
    return (
        <section class={section}>
            <Text textStyle="titleSmall" as="h3" id={id}>
                Color
            </Text>
            <div class={chips} role="group" aria-labelledby={id}>
                <For each={COLORS}>
                    {(color) => (
                        <PureformProvider
                            theme={swatchTheme(color, settings().customSeed)}
                        >
                            <IconButton
                                variant="filled"
                                aria-label={color.label}
                                aria-pressed={
                                    settings().color === color.value
                                        ? "true"
                                        : "false"
                                }
                                icon={
                                    settings().color === color.value ? (
                                        <Glyph name="check" />
                                    ) : color.value === "custom" ? (
                                        <Glyph name="palette" />
                                    ) : undefined
                                }
                                onClick={() => update({ color: color.value })}
                            />
                        </PureformProvider>
                    )}
                </For>
            </div>
            <Text textStyle="bodySmall">
                {current().value === "baseline"
                    ? "Baseline: the config's own palette, in the stylesheet"
                    : current().value === "teal"
                      ? "Teal: a named theme compiled into the stylesheet"
                      : `${current().label}: generated in the browser from ${
                            current().seed ?? settings().customSeed
                        }`}
            </Text>
            <TextField
                label="Custom seed"
                value={seed()}
                onValueChange={(details) => {
                    setSeed(details.value);
                    if (isHexColor(details.value))
                        update({ color: "custom", customSeed: details.value });
                }}
                error={isHexColor(seed()) ? undefined : "A color as #rrggbb"}
                supportingText="Any #rrggbb color"
                leadingIcon={<Glyph name="palette" />}
                maxlength={7}
                autocomplete="off"
                spellcheck={false}
            />
        </section>
    );
}

function SettingsTab(): JSX.Element {
    return (
        <div class={sections}>
            <ChipSetting
                label="Color scheme"
                setting="scheme"
                options={SCHEMES}
            />
            <ColorSetting />
            <ChipSetting label="Shape" setting="shape" options={SHAPES} />
            <ChipSetting
                label="Density"
                setting="density"
                options={DENSITIES}
            />
            <ChipSetting label="Font" setting="font" options={FONTS} />
            <ChipSetting label="Direction" setting="dir" options={DIRECTIONS} />
            <ChipSetting label="Motion" setting="motion" options={MOTIONS} />
            <ChipSetting
                label="Indication"
                setting="indication"
                options={INDICATIONS}
            />
        </div>
    );
}

function AppsTab(): JSX.Element {
    const location = useLocation();
    const current = () => appAt(location().pathname)?.href ?? "/";
    return (
        <List
            items={[
                {
                    value: "/",
                    headline: "All apps",
                    supportingText: "The launcher",
                    leading: (
                        <Avatar color="secondary">
                            <Glyph name="apps" />
                        </Avatar>
                    ),
                    href: "/",
                    selected: current() === "/",
                },
                ...APPS.map((app) => ({
                    value: app.href,
                    headline: app.name,
                    supportingText: app.description,
                    leading: (
                        <Avatar color={app.color}>
                            <Glyph name={app.icon} />
                        </Avatar>
                    ),
                    href: app.href,
                    selected: current() === app.href,
                })),
            ]}
        />
    );
}

/** The floating button and its panel. */
export function SettingsPanel(): JSX.Element {
    const { reset } = useSettings();
    const location = useLocation();
    const [open, setOpen] = createSignal(false);
    const [tab, setTab] = createSignal<string | null>("settings");
    let button: HTMLElement | undefined;

    // Choosing an app navigates; the panel closes behind it.
    createEffect(
        () => location().pathname,
        () => {
            setOpen(false);
        },
    );

    return (
        <>
            <Fab
                ref={(element: HTMLElement) => {
                    button = element;
                }}
                class={{ root: fab }}
                size="small"
                variant="surface"
                icon={<Glyph name="tune" />}
                aria-label="Settings and apps"
                aria-haspopup="dialog"
                aria-expanded={open() ? "true" : "false"}
                onClick={() => {
                    setOpen(true);
                }}
                data-testid="settings-button"
            />
            <Dialog.Root
                open={open()}
                onOpenChange={(details) => setOpen(details.open)}
                finalFocusEl={() => button ?? null}
                tokens={{ container: "var(--colors-surface-container-low)" }}
                testId="settings"
            >
                <Dialog.Backdrop class={overlay} />
                <Dialog.Positioner class={overlay} style={sheetPositioner}>
                    <Dialog.Content class={sheet}>
                        <div class={sheetHeader}>
                            <Dialog.Headline class={grow}>
                                Settings
                            </Dialog.Headline>
                            <IconButton
                                icon={<Glyph name="close" />}
                                aria-label="Close"
                                onClick={() => setOpen(false)}
                            />
                        </div>
                        <Show when={open()}>
                            <Tabs
                                aria-label="Panel"
                                value={tab()}
                                onValueChange={(details) =>
                                    setTab(details.value)
                                }
                                class={{ root: tabs, content: panel }}
                                items={[
                                    {
                                        value: "settings",
                                        label: "Settings",
                                        icon: <Glyph name="palette" />,
                                        content: <SettingsTab />,
                                    },
                                    {
                                        value: "apps",
                                        label: "Apps",
                                        icon: <Glyph name="apps" />,
                                        content: <AppsTab />,
                                    },
                                ]}
                            />
                        </Show>
                        <div class={actions}>
                            <Button
                                variant="text"
                                label="Reset"
                                icon={<Glyph name="restart" />}
                                onClick={() => reset()}
                            />
                            <Button
                                label="Done"
                                onClick={() => setOpen(false)}
                            />
                        </div>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
        </>
    );
}
