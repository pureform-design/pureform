// The color picker: Root on Zag's color picker (inline), its parts, and the ready-made ColorPicker
// over them. A saturation and brightness area, a hue slider and an optional alpha slider, a row
// with the value's swatch, the hex text field and the eye dropper (where the browser has one), and
// preset swatches. The value is a CSS color string; changes report hex.

import { colorPickerAnatomy } from "@pureform/anatomy";
import type {
    iconButtonAnatomy,
    PartName,
    textFieldAnatomy,
} from "@pureform/anatomy";
import {
    COLOR_PICKER_DEFAULT,
    COLOR_PICKER_ROOT_PROPS,
    COLOR_PICKER_THUMB_CENTRE,
    colorPickerHex,
    colorPickerHexOf,
    colorPickerHexText,
    colorPickerSelection,
    colorPickerSwatchLabel,
    hasEyeDropper,
} from "@pureform/binding-core";
import type {
    ColorPickerChannel,
    ColorPickerContentProps,
    ColorPickerInstances,
    ColorPickerRootOwnProps,
    ColorPickerValueDetails,
} from "@pureform/binding-core";
import type { PropTypes } from "@pureform/machines";
import * as colorPicker from "@pureform/machines/color-picker";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    merge,
    omit,
    onSettled,
    Show,
} from "solid-js";

import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { ColorizeIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import type { IconButtonProps } from "../icon-button/icon-button";
import { normalizeProps, useMachine } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type {
    ComponentScope,
    InnerPropsOf,
    SlotKeyedProps,
    SlotPropsOf,
} from "../parts";
import { combinePartProps, mergePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { TextField } from "../text-field";
import type { TextFieldProps } from "../text-field/text-field";

type Anatomy = typeof colorPickerAnatomy;
type Color = colorPicker.Color;

/** The hex a color reports: `#rrggbb`, or `#rrggbbaa` when it isn't opaque. */
/** What Root shares with its parts. */
interface ColorPickerContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<colorPicker.Api<PropTypes>>;
    readonly hex: Accessor<string>;
    /** Sets the color from the text field, and reports it settled. */
    readonly settle: (hex: string) => void;
    readonly disabled: Accessor<boolean>;
    readonly readOnly: Accessor<boolean>;
}

const context = createPartContext<ColorPickerContextValue>("ColorPicker");

/** Root's props: the value, its callbacks, `disabled`, `readOnly`, `name`, the tokens, `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface ColorPickerRootProps
    extends
        Omit<PartProps, keyof ColorPickerRootOwnProps>,
        ColorPickerRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A plain part's props: the element's own, and `unstyled`. */
export interface ColorPickerPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The picker's root: it runs the machine, holding the value and the form's hidden input. */
function Root(props: ColorPickerRootProps): JSX.Element {
    const generated = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string, ColorPickerValueDetails>(
        "ColorPicker",
        "value",
        props,
    );
    // The last color the machine reported, so a controlled value that comes back as its hex
    // keeps the hue and saturation hex loses (a grey's hue, black's saturation).
    let last: Color | null = null;
    const colorOf = (css: string): Color =>
        last && colorPickerHexOf(last) === colorPickerHex(css)
            ? last
            : colorPicker.parse(css);
    const defaultValue = colorPicker.parse(
        value.defaultValue ?? COLOR_PICKER_DEFAULT,
    );
    const service = useMachine(colorPicker.machine, () => ({
        id: props.id ?? generated,
        dir: dir(),
        inline: true,
        defaultFormat: "hsba" as const,
        disabled: props.disabled,
        readOnly: props.readOnly,
        name: props.name,
        value: value.controlled() ? colorOf(value.value()!) : undefined,
        defaultValue,
        onValueChange: (details: colorPicker.ValueChangeDetails) => {
            last = details.value;
            value
                .machineProps()
                .onValueChange?.({ value: colorPickerHexOf(details.value) });
        },
        onValueChangeEnd: (details: colorPicker.ValueChangeDetails) =>
            props.onValueChangeEnd?.({
                value: colorPickerHexOf(details.value),
            }),
    }));
    const api = createMemo(() => colorPicker.connect(service, normalizeProps));
    const hex = createMemo(() => colorPickerHexOf(api().value));
    const [input, setInput] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    useFormReset(input, {
        resetsTo: () =>
            colorPickerHexOf(
                colorPicker.parse(value.resetsTo() ?? COLOR_PICKER_DEFAULT),
            ),
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                api().setValue(value.defaultValue ?? COLOR_PICKER_DEFAULT),
            ),
    });
    const scope = useComponent(colorPickerAnatomy, {
        selection: () => colorPickerSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const settle = (next: string) => {
        api().setValue(next);
        props.onValueChangeEnd?.({ value: next });
    };
    // The form submits the value as hex, rather than Zag's own format.
    const hidden = () => {
        const { defaultValue: _default, ...rest } =
            api().getHiddenInputProps() as Record<string, unknown>;
        return rest;
    };
    return (
        <context.Provider
            value={{
                scope,
                api,
                hex,
                settle,
                disabled: () => !!props.disabled,
                readOnly: () => !!props.readOnly,
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: merge(
                    omit(props, "as", "children", ...COLOR_PICKER_ROOT_PROPS),
                    {
                        get children() {
                            return (
                                <>
                                    {props.children}
                                    <input
                                        {...hidden()}
                                        ref={setInput}
                                        form={props.form}
                                        value={hex()}
                                        readonly
                                    />
                                </>
                            );
                        },
                    },
                ),
            })}
        </context.Provider>
    );
}

/** A part that only takes the machine's props and the user's. */
const machinePart =
    (
        part: "label" | "content" | "control" | "swatchGroup",
        label: string,
        element: "div" | "label",
        machine: (api: colorPicker.Api<PropTypes>) => object,
    ) =>
    (props: ColorPickerPartProps): JSX.Element => {
        const { scope, api } = context.use(label);
        return scope.render(part, {
            element,
            machine: () => machine(api()),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

/** The picker's label. */
const Label = machinePart("label", "Label", "label", (api) =>
    api.getLabelProps(),
);

/** Everything below the label. */
const Content = machinePart("content", "Content", "div", (api) =>
    api.getContentProps(),
);

/** The row of the value's swatch, the hex field and the eye dropper. */
const Control = machinePart("control", "Control", "div", () => ({}));

/** The group of preset swatches. */
const SwatchGroup = machinePart("swatchGroup", "SwatchGroup", "div", (api) => ({
    ...api.getSwatchGroupProps(),
    role: "group",
}));

/** A ready-made picker's slot props for the parts a part draws inside it (the area's thumb, a
 *  slider's track, a swatch's color), by copy. */
export type ColorPickerSlots = SlotPropsOf<
    PartName<Anatomy>,
    ColorPickerInstances
>;

/** A part a part draws inside it, from the ready-made's slot props: its `unstyled` apart. */
const inner = (props: PartProps | undefined) => {
    if (!props) return {};
    const own = props as PartProps & { readonly unstyled?: boolean };
    return { unstyled: () => own.unstyled, props: omit(own, "unstyled") };
};

/** A part's props that draws other parts inside it: its own, and the ready-made's slot props for
 *  those. */
export interface ColorPickerOuterPartProps extends ColorPickerPartProps {
    readonly slots?: ColorPickerSlots | undefined;
}

/** The saturation and brightness area: its gradient and its thumb, which a drag or the arrow
 *  keys move. */
function Area(props: ColorPickerOuterPartProps): JSX.Element {
    const { scope, api } = context.use("Area");
    return scope.render("area", {
        element: "div",
        machine: () => api().getAreaProps(),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled", "slots"), {
            get children() {
                return (
                    <>
                        {scope.render("areaBackground", {
                            element: "div",
                            machine: () => api().getAreaBackgroundProps(),
                            ...inner(props.slots?.("areaBackground")),
                        })}
                        {scope.render("areaThumb", {
                            element: "div",
                            machine: () => api().getAreaThumbProps(),
                            ...inner(props.slots?.("areaThumb")),
                        })}
                    </>
                );
            },
        }),
    });
}

/** A channel slider's props: its channel, and the element's own. */
export interface ColorPickerChannelSliderProps extends ColorPickerOuterPartProps {
    /** `hue`, or `alpha` (drawn over a transparency grid). */
    readonly channel: ColorPickerChannel;
}

/** A slider over one channel: the hue, or the alpha over a transparency grid. */
function ChannelSlider(props: ColorPickerChannelSliderProps): JSX.Element {
    const { scope, api } = context.use("ChannelSlider");
    const slider = () => ({ channel: props.channel, format: "hsba" }) as const;
    const each = () => ({ channel: props.channel });
    return scope.render("channelSlider", {
        element: "div",
        machine: () => api().getChannelSliderProps(slider()),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "channel", "unstyled", "slots"), {
            get children() {
                return (
                    <>
                        <Show when={props.channel === "alpha"}>
                            {scope.render("transparencyGrid", {
                                element: "div",
                                machine: () =>
                                    api().getTransparencyGridProps({
                                        size: "8px",
                                    }),
                                ...inner(
                                    props.slots?.("transparencyGrid", each),
                                ),
                            })}
                        </Show>
                        {scope.render("channelSliderTrack", {
                            element: "div",
                            machine: () =>
                                api().getChannelSliderTrackProps(slider()),
                            ...inner(props.slots?.("channelSliderTrack", each)),
                        })}
                        {scope.render("channelSliderThumb", {
                            element: "div",
                            machine: () =>
                                combinePartProps([
                                    api().getChannelSliderThumbProps(slider()),
                                    { style: COLOR_PICKER_THUMB_CENTRE },
                                ]),
                            ...inner(props.slots?.("channelSliderThumb", each)),
                        })}
                    </>
                );
            },
        }),
    });
}

/** The value's swatch. */
function ValueSwatch(props: ColorPickerPartProps): JSX.Element {
    const { scope, api } = context.use("ValueSwatch");
    return scope.render("valueSwatch", {
        element: "div",
        machine: () => ({
            ...api().getSwatchProps({ value: api().value }),
            "aria-hidden": "true",
        }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The hex field's props: the text field's, less its value, which the picker holds. */
export type ColorPickerHexFieldProps = Omit<
    TextFieldProps,
    "value" | "defaultValue" | "onValueChange"
>;

/** The value's hex in an outlined text field: Enter or leaving it sets the color; text that
 *  isn't a hex color marks it invalid until it's left, which puts the value back. */
function HexField(props: ColorPickerHexFieldProps): JSX.Element {
    const { hex, settle, disabled, readOnly } = context.use("HexField");
    const [draft, setDraft] = createSignal<string | null>(null);
    const commit = () => {
        const text = draft();
        if (text === null) return;
        const next = colorPickerHex(text);
        setDraft(null);
        if (next !== undefined && next !== hex()) settle(next);
    };
    // The field's own handlers on the input, before the user's there.
    const own = {
        onBlur: commit,
        onKeyDown: (event: KeyboardEvent) => {
            if (event.key === "Enter") commit();
        },
    };
    const slotProps = createMemo(() => ({
        ...props.slotProps,
        input: mergePartProps(own, props.slotProps?.input ?? {}),
    }));
    return (
        <TextField
            variant="outlined"
            label="Hex"
            prefixText="#"
            maxlength={8}
            spellcheck={false}
            autocomplete="off"
            disabled={disabled()}
            readOnly={readOnly()}
            invalid={draft() !== null && colorPickerHex(draft()!) === undefined}
            {...props}
            slotProps={slotProps()}
            value={draft() ?? colorPickerHexText(hex())}
            // A form reset is the picker's: the field follows its value.
            onValueChange={({
                value,
                reason,
            }: {
                value: string;
                reason?: string;
            }) => {
                if (reason !== "reset") setDraft(value);
            }}
        />
    );
}

/** The eye dropper's props: an icon button's, its icon and name optional. */
export type ColorPickerEyeDropperTriggerProps = Omit<
    IconButtonProps,
    "icon" | "aria-label" | "aria-labelledby"
> & {
    readonly icon?: JSX.Element;
    readonly "aria-label"?: string | undefined;
};

/** The eye dropper: an icon button that picks a color from the screen. It renders only where the
 *  browser has an eye dropper (Chromium's `EyeDropper`), once mounted. */
function EyeDropperTrigger(
    props: ColorPickerEyeDropperTriggerProps,
): JSX.Element {
    const { api } = context.use("EyeDropperTrigger");
    const [supported, setSupported] = createSignal(false);
    onSettled(() => {
        setSupported(hasEyeDropper());
    });
    const trigger = () =>
        api().getEyeDropperTriggerProps() as {
            onClick: () => void;
            disabled?: boolean;
        };
    return (
        <Show when={supported()}>
            <IconButton
                icon={props.icon ?? <ColorizeIcon />}
                aria-label="Pick a color from the screen"
                disabled={trigger().disabled}
                onClick={() => trigger().onClick()}
                {...(omit(props, "icon") as object)}
            />
        </Show>
    );
}

/** A swatch trigger's props: its color, and the element's own. */
export interface ColorPickerSwatchTriggerProps extends ColorPickerOuterPartProps {
    /** The color it picks. */
    readonly value: string;
    readonly disabled?: boolean | undefined;
    /** Its index among the swatches, for a function of the copy in `slots`. */
    readonly index?: number | undefined;
}

/** A preset swatch: a button that picks its color, ringed while it's the value. */
function SwatchTrigger(props: ColorPickerSwatchTriggerProps): JSX.Element {
    const { scope, api } = context.use("SwatchTrigger");
    const swatch = () => ({ value: props.value, disabled: props.disabled });
    return scope.render("swatchTrigger", {
        element: "button",
        machine: () => ({
            ...api().getSwatchTriggerProps(swatch()),
            "aria-label": colorPickerSwatchLabel(props.value),
            "aria-pressed": String(
                api().getSwatchTriggerState(swatch()).checked,
            ),
        }),
        unstyled: () => props.unstyled,
        props: merge(
            omit(props, "value", "disabled", "unstyled", "slots", "index"),
            {
                get children() {
                    return scope.render("swatch", {
                        element: "div",
                        machine: () =>
                            api().getSwatchProps({ value: props.value }),
                        ...inner(
                            props.slots?.("swatch", () => ({
                                color: props.value,
                                index: props.index ?? 0,
                            })),
                        ),
                    });
                },
            },
        ),
    });
}

/** The ready-made picker's props: Root's, with `class`, `style`, `slotProps` and `unstyled` keyed
 *  by part (a preset swatch's parts also by swatch, `ColorPickerSwatchInstance`; a channel
 *  slider's by channel, `ColorPickerChannelInstance`), and its content. */
export interface ColorPickerProps
    extends
        Omit<ColorPickerRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, ColorPickerInstances>,
        ColorPickerContentProps<JSX.Element> {
    /** The hex field, drawn as a text field, keyed by its parts. */
    readonly textFieldProps?: InnerPropsOf<typeof textFieldAnatomy> | undefined;
    /** The eye dropper, drawn as an icon button. */
    readonly iconButtonProps?:
        | InnerPropsOf<typeof iconButtonAnatomy>
        | undefined;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "textFieldProps",
    "iconButtonProps",
    "label",
    "area",
    "alpha",
    "swatches",
    "inputLabel",
    "eyeDropper",
    "eyeDropperLabel",
] as const;

/** The ready-made picker: the label, the area, the sliders, the field row and the swatches. */
function ReadyMade(props: ColorPickerProps): JSX.Element {
    const slots = createSlotProps<Anatomy, never, ColorPickerInstances>(props);
    const own = omit(props, ...READY_MADE_PROPS) as ColorPickerRootProps;
    return (
        <Root {...own} {...(slots("root") as object)}>
            <Show when={props.label !== undefined}>
                <Label {...(slots("label") as object)}>{props.label}</Label>
            </Show>
            <Content {...(slots("content") as object)}>
                <Show when={props.area !== false}>
                    <Area {...(slots("area") as object)} slots={slots} />
                </Show>
                <ChannelSlider
                    {...(slots("channelSlider", () => ({
                        channel: "hue",
                    })) as object)}
                    channel="hue"
                    slots={slots}
                />
                <Show when={props.alpha}>
                    <ChannelSlider
                        {...(slots("channelSlider", () => ({
                            channel: "alpha",
                        })) as object)}
                        channel="alpha"
                        slots={slots}
                    />
                </Show>
                <Control {...(slots("control") as object)}>
                    <ValueSwatch {...(slots("valueSwatch") as object)} />
                    <HexField
                        {...props.textFieldProps}
                        label={props.inputLabel ?? "Hex"}
                    />
                    <Show when={props.eyeDropper !== false}>
                        <EyeDropperTrigger
                            {...props.iconButtonProps}
                            aria-label={
                                props.eyeDropperLabel ??
                                "Pick a color from the screen"
                            }
                        />
                    </Show>
                </Control>
                <Show when={(props.swatches?.length ?? 0) > 0}>
                    <SwatchGroup {...(slots("swatchGroup") as object)}>
                        <For
                            each={props.swatches ?? []}
                            keyed={(swatch) => swatch}
                        >
                            {(swatch: Accessor<string>, index) => (
                                <SwatchTrigger
                                    {...(slots("swatchTrigger", () => ({
                                        color: swatch(),
                                        index: index(),
                                    })) as object)}
                                    value={swatch()}
                                    index={index()}
                                    slots={slots}
                                />
                            )}
                        </For>
                    </SwatchGroup>
                </Show>
            </Content>
        </Root>
    );
}

/** A color picker, inline: `<ColorPicker label="Seed color" defaultValue="#6750a4"
 *  swatches={["#6750a4", "#006a6a"]} onValueChange={({ value }) => setSeed(value)} />`, or compose
 *  its parts under `ColorPicker.Root`: `Label`, `Content` holding `Area`, `ChannelSlider`s,
 *  `Control` (`ValueSwatch`, `HexField`, `EyeDropperTrigger`) and `SwatchGroup` of
 *  `SwatchTrigger`s. */
export const ColorPicker = Object.assign(ReadyMade, {
    Root,
    Label,
    Content,
    Area,
    ChannelSlider,
    Control,
    ValueSwatch,
    HexField,
    EyeDropperTrigger,
    SwatchGroup,
    SwatchTrigger,
});
