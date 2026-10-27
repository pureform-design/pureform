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
import * as colorPicker from "@pureform/machines/color-picker";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import type { ElementType, KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { ColorizeIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import type { IconButtonProps } from "../icon-button";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { plainParts, useComponent, useSlotProps } from "../parts";
import type {
    ComponentScope,
    InnerPropsOf,
    PlainPartProps,
    SlotKeyedProps,
    SlotPropsOf,
} from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { TextField } from "../text-field";
import type { TextFieldProps } from "../text-field";

type Anatomy = typeof colorPickerAnatomy;
type Color = colorPicker.Color;

/** The hex a color reports: `#rrggbb`, or `#rrggbbaa` when it isn't opaque. */
/** What Root shares with its parts. */
interface ColorPickerContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: colorPicker.Api<PropTypes>;
    readonly hex: string;
    /** Sets the color from the text field or the eye dropper, and reports it settled. */
    readonly settle: (hex: string) => void;
    readonly disabled: boolean;
    readonly readOnly: boolean;
}

const context = createPartContext<ColorPickerContextValue>("ColorPicker");

/** Root's props: the value, its callbacks, `disabled`, `readOnly`, `name`, the tokens, `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface ColorPickerRootProps
    extends
        Omit<PartProps, keyof ColorPickerRootOwnProps>,
        ColorPickerRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** The picker's root: it runs the machine, holding the value and the form's hidden input. */
function Root(props: ColorPickerRootProps): ReactNode {
    const generated = useId();
    const dir = useDirection();
    const value = useControllable<"value", string, ColorPickerValueDetails>(
        "ColorPicker",
        "value",
        props,
    );
    // The last color the machine reported, so a controlled value that comes back as its hex
    // keeps the hue and saturation hex loses (a grey's hue, black's saturation).
    const last = useRef<Color | null>(null);
    const colorOf = (css: string): Color =>
        last.current && colorPickerHexOf(last.current) === colorPickerHex(css)
            ? last.current
            : colorPicker.parse(css);
    const latest = useRef(props);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks that run after render, not read while rendering
    latest.current = props;
    const service = useMachine(colorPicker.machine, {
        id: props.id ?? generated,
        dir,
        inline: true,
        defaultFormat: "hsba",
        disabled: props.disabled,
        readOnly: props.readOnly,
        name: props.name,
        // oxlint-disable-next-line react/refs -- colorOf reads, while rendering, the last color the machine reported (written only in onValueChange), so a controlled hex keeps its hue
        value: value.controlled ? colorOf(value.value!) : undefined,
        defaultValue: colorPicker.parse(
            value.defaultValue ?? COLOR_PICKER_DEFAULT,
        ),
        onValueChange: (details) => {
            last.current = details.value;
            value.machineProps.onValueChange?.({
                value: colorPickerHexOf(details.value),
            });
        },
        onValueChangeEnd: (details) =>
            latest.current.onValueChangeEnd?.({
                value: colorPickerHexOf(details.value),
            }),
    });
    const api = colorPicker.connect(service, normalizeProps);
    const [input, setInput] = useState<HTMLInputElement | null>(null);
    useFormReset(input, {
        resetsTo: colorPickerHexOf(
            colorPicker.parse(value.resetsTo ?? COLOR_PICKER_DEFAULT),
        ),
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                api.setValue(value.defaultValue ?? COLOR_PICKER_DEFAULT),
            ),
    });
    const scope = useComponent(colorPickerAnatomy, {
        selection: colorPickerSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const settle = (hex: string) => {
        api.setValue(hex);
        latest.current.onValueChangeEnd?.({ value: hex });
    };
    const { as, children, ...rest } = omitProps(props, COLOR_PICKER_ROOT_PROPS);
    const hex = colorPickerHexOf(api.value);
    // The form submits the value as hex, rather than Zag's own format.
    const { defaultValue: _default, ...hidden } =
        api.getHiddenInputProps() as Record<string, unknown>;
    return (
        <context.Provider
            value={{
                scope,
                api,
                hex,
                settle,
                disabled: !!props.disabled,
                readOnly: !!props.readOnly,
            }}
        >
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: {
                    ...rest,
                    children: (
                        <>
                            {children}
                            <input
                                {...hidden}
                                ref={setInput}
                                form={props.form}
                                value={hex}
                                readOnly
                            />
                        </>
                    ),
                },
            })}
        </context.Provider>
    );
}

const part = plainParts(context.use, "div");

/** A ready-made picker's slot props for the parts a part draws inside it (the area's thumb, a
 *  slider's track, a swatch's color), by copy. */
export type ColorPickerSlots = SlotPropsOf<
    PartName<Anatomy>,
    ColorPickerInstances
>;

/** A part a part draws inside it, from the ready-made's slot props: its `unstyled` apart. */
const inner = (props: PartProps | undefined) => {
    const { unstyled, ...rest } = (props ?? {}) as PartProps & {
        readonly unstyled?: boolean | undefined;
    };
    return { unstyled, props: rest };
};

/** A part's props that draws other parts inside it: its own, and the ready-made's slot props for
 *  those. */
export interface ColorPickerOuterPartProps extends PlainPartProps {
    readonly slots?: ColorPickerSlots | undefined;
}

/** The picker's label. */
function Label({ unstyled, ...props }: PlainPartProps): ReactNode {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

/** Everything below the label. */
function Content({ unstyled, ...props }: PlainPartProps): ReactNode {
    const { scope, api } = context.use("Content");
    return scope.render("content", {
        element: "div",
        machine: api.getContentProps(),
        unstyled,
        props,
    });
}

/** The saturation and brightness area: its gradient and its thumb, which a drag or the arrow
 *  keys move. */
function Area({
    unstyled,
    slots,
    ...props
}: ColorPickerOuterPartProps): ReactNode {
    const { scope, api } = context.use("Area");
    return scope.render("area", {
        element: "div",
        machine: api.getAreaProps(),
        unstyled,
        props: {
            ...props,
            children: (
                <>
                    {scope.render("areaBackground", {
                        element: "div",
                        machine: api.getAreaBackgroundProps(),
                        ...inner(slots?.("areaBackground")),
                    })}
                    {scope.render("areaThumb", {
                        element: "div",
                        machine: api.getAreaThumbProps(),
                        ...inner(slots?.("areaThumb")),
                    })}
                </>
            ),
        },
    });
}

/** A channel slider's props: its channel, and the element's own. */
export interface ColorPickerChannelSliderProps extends ColorPickerOuterPartProps {
    /** `hue`, or `alpha` (drawn over a transparency grid). */
    readonly channel: ColorPickerChannel;
}

/** A slider over one channel: the hue, or the alpha over a transparency grid. */
function ChannelSlider({
    channel,
    unstyled,
    slots,
    ...props
}: ColorPickerChannelSliderProps): ReactNode {
    const { scope, api } = context.use("ChannelSlider");
    const slider = { channel, format: "hsba" } as const;
    const each =
        slots &&
        (slots.each("transparencyGrid") ||
            slots.each("channelSliderTrack") ||
            slots.each("channelSliderThumb"))
            ? { channel }
            : undefined;
    return scope.render("channelSlider", {
        element: "div",
        machine: api.getChannelSliderProps(slider),
        unstyled,
        props: {
            ...props,
            children: (
                <>
                    {channel === "alpha" &&
                        scope.render("transparencyGrid", {
                            element: "div",
                            machine: api.getTransparencyGridProps({
                                size: "8px",
                            }),
                            ...inner(slots?.("transparencyGrid", each)),
                        })}
                    {scope.render("channelSliderTrack", {
                        element: "div",
                        machine: api.getChannelSliderTrackProps(slider),
                        ...inner(slots?.("channelSliderTrack", each)),
                    })}
                    {scope.render("channelSliderThumb", {
                        element: "div",
                        machine: combinePartProps([
                            api.getChannelSliderThumbProps(slider),
                            { style: COLOR_PICKER_THUMB_CENTRE },
                        ]),
                        ...inner(slots?.("channelSliderThumb", each)),
                    })}
                </>
            ),
        },
    });
}

/** The row of the value's swatch, the hex field and the eye dropper. */
const Control = part("control", "Control");

/** The value's swatch. */
function ValueSwatch({ unstyled, ...props }: PlainPartProps): ReactNode {
    const { scope, api } = context.use("ValueSwatch");
    return scope.render("valueSwatch", {
        element: "div",
        machine: {
            ...api.getSwatchProps({ value: api.value }),
            "aria-hidden": "true",
        },
        unstyled,
        props,
    });
}

/** The hex field's props: the text field's, less its value, which the picker holds. */
export type ColorPickerHexFieldProps = Omit<
    TextFieldProps,
    "value" | "defaultValue" | "onValueChange"
>;

/** The value's hex in an outlined text field: Enter or leaving it sets the color; text that
 *  isn't a hex color marks it invalid until it's left, which puts the value back. */
function HexField(props: ColorPickerHexFieldProps): ReactNode {
    const { hex, settle, disabled, readOnly } = context.use("HexField");
    const [draft, setDraft] = useState<string | null>(null);
    const commit = () => {
        if (draft === null) return;
        const next = colorPickerHex(draft);
        setDraft(null);
        if (next !== undefined && next !== hex) settle(next);
    };
    const commitRef = useRef(commit);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks that run after render, not read while rendering
    commitRef.current = commit;
    // The field's own handlers on the input, before the user's there.
    const slotProps = useMemo(
        () => ({
            ...props.slotProps,
            // oxlint-disable-next-line react/refs -- the callback reads the ref when it runs, after render
            input: combinePartProps([
                {
                    onBlur: () => commitRef.current(),
                    onKeyDown: (event: KeyboardEvent) => {
                        if (event.key === "Enter") commitRef.current();
                    },
                },
                props.slotProps?.input as Record<string, unknown> | undefined,
            ]),
        }),
        [props.slotProps],
    );
    return (
        <TextField
            variant="outlined"
            label="Hex"
            prefixText="#"
            maxLength={8}
            spellCheck={false}
            autoComplete="off"
            disabled={disabled}
            readOnly={readOnly}
            invalid={draft !== null && colorPickerHex(draft) === undefined}
            {...props}
            slotProps={slotProps}
            value={draft ?? colorPickerHexText(hex)}
            // A form reset is the picker's: the field follows its value.
            onValueChange={({ value, reason }) => {
                if (reason !== "reset") setDraft(value);
            }}
        />
    );
}

/** The eye dropper's props: an icon button's, its name optional. */
export type ColorPickerEyeDropperTriggerProps = Omit<
    IconButtonProps,
    "icon" | "aria-label" | "aria-labelledby"
> & {
    readonly icon?: ReactNode;
    readonly "aria-label"?: string | undefined;
};

/** The eye dropper: an icon button that picks a color from the screen. It renders only where the
 *  browser has an eye dropper (Chromium's `EyeDropper`), once mounted. */
function EyeDropperTrigger(
    props: ColorPickerEyeDropperTriggerProps,
): ReactNode {
    const { api } = context.use("EyeDropperTrigger");
    const [supported, setSupported] = useState(false);
    // oxlint-disable-next-line react/set-state-in-effect -- feature detection after hydration, so the server and the first client render agree
    useEffect(() => setSupported(hasEyeDropper()), []);
    if (!supported) return null;
    const { icon, ...rest } = props;
    const { onClick, disabled } = api.getEyeDropperTriggerProps() as {
        onClick: () => void;
        disabled?: boolean;
    };
    return (
        <IconButton
            icon={icon ?? <ColorizeIcon />}
            aria-label="Pick a color from the screen"
            disabled={disabled}
            onClick={onClick}
            {...(rest as object)}
        />
    );
}

/** The group of preset swatches. */
function SwatchGroup({ unstyled, ...props }: PlainPartProps): ReactNode {
    const { scope, api } = context.use("SwatchGroup");
    return scope.render("swatchGroup", {
        element: "div",
        machine: { ...api.getSwatchGroupProps(), role: "group" },
        unstyled,
        props,
    });
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
function SwatchTrigger({
    value,
    disabled,
    unstyled,
    slots,
    index = 0,
    ...props
}: ColorPickerSwatchTriggerProps): ReactNode {
    const { scope, api } = context.use("SwatchTrigger");
    const state = api.getSwatchTriggerState({ value, disabled });
    return scope.render("swatchTrigger", {
        element: "button",
        machine: {
            ...api.getSwatchTriggerProps({ value, disabled }),
            "aria-label": colorPickerSwatchLabel(value),
            "aria-pressed": state.checked,
        },
        unstyled,
        props: {
            ...props,
            children: scope.render("swatch", {
                element: "div",
                machine: api.getSwatchProps({ value }),
                ...inner(
                    slots?.(
                        "swatch",
                        slots.each("swatch")
                            ? { color: value, index }
                            : undefined,
                    ),
                ),
            }),
        },
    });
}

/** The ready-made picker's props: Root's, with `className`, `style`, `slotProps` and `unstyled`
 *  keyed by part (a preset swatch's parts also by swatch, `ColorPickerSwatchInstance`; a channel
 *  slider's by channel, `ColorPickerChannelInstance`), and its content. */
export interface ColorPickerProps
    extends
        Omit<ColorPickerRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, ColorPickerInstances>,
        ColorPickerContentProps<ReactNode> {
    /** The hex field, drawn as a text field, keyed by its parts. */
    readonly textFieldProps?: InnerPropsOf<typeof textFieldAnatomy> | undefined;
    /** The eye dropper, drawn as an icon button. */
    readonly iconButtonProps?:
        | InnerPropsOf<typeof iconButtonAnatomy>
        | undefined;
}

/** The ready-made picker: the label, the area, the sliders, the field row and the swatches. */
function ReadyMade(props: ColorPickerProps): ReactNode {
    const slot = useSlotProps<Anatomy, never, ColorPickerInstances>(props);
    const eachSlider = slot.each("channelSlider");
    const eachSwatch = slot.each("swatchTrigger");
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        label,
        area = true,
        alpha = false,
        swatches,
        inputLabel,
        eyeDropper = true,
        eyeDropperLabel,
        textFieldProps,
        iconButtonProps,
        ...rootProps
    } = props;
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            {label === undefined ? null : (
                <Label {...slot("label")}>{label}</Label>
            )}
            <Content {...slot("content")}>
                {area && <Area {...slot("area")} slots={slot} />}
                <ChannelSlider
                    {...slot(
                        "channelSlider",
                        eachSlider ? { channel: "hue" } : undefined,
                    )}
                    channel="hue"
                    slots={slot}
                />
                {alpha && (
                    <ChannelSlider
                        {...slot(
                            "channelSlider",
                            eachSlider ? { channel: "alpha" } : undefined,
                        )}
                        channel="alpha"
                        slots={slot}
                    />
                )}
                <Control {...slot("control")}>
                    <ValueSwatch {...slot("valueSwatch")} />
                    <HexField {...textFieldProps} label={inputLabel ?? "Hex"} />
                    {eyeDropper && (
                        <EyeDropperTrigger
                            {...iconButtonProps}
                            aria-label={
                                eyeDropperLabel ??
                                "Pick a color from the screen"
                            }
                        />
                    )}
                </Control>
                {swatches && swatches.length > 0 && (
                    <SwatchGroup {...slot("swatchGroup")}>
                        {swatches.map((swatch, index) => (
                            <SwatchTrigger
                                key={swatch}
                                {...slot(
                                    "swatchTrigger",
                                    eachSwatch
                                        ? { color: swatch, index }
                                        : undefined,
                                )}
                                value={swatch}
                                index={index}
                                slots={slot}
                            />
                        ))}
                    </SwatchGroup>
                )}
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
