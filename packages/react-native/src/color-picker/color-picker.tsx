// The color picker: a saturation and brightness area, a hue slider and an optional alpha slider, a
// row with the value's swatch, the hex text field and (on the web, where the browser has one) the
// eye dropper, and preset swatches. Zag's color picker is the web's; here the area and sliders are
// pureform's own drags over Zag's color math (`parse`, in HSB). The gradients are React Native's
// `experimental_backgroundImage` (`backgroundImage` on React Native Web). Assistive technology
// adjusts the sliders (increment, decrement), and on the web the arrow keys do.

import { colorPickerAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    COLOR_PICKER_DEFAULT,
    colorPickerFraction,
    colorPickerHex,
    colorPickerHexOf,
    colorPickerHexText,
    colorPickerSelection,
    colorPickerSwatchLabel,
    hasEyeDropper,
} from "@pureform/binding-core";
import type {
    ColorPickerChannelInstance,
    ColorPickerContentProps,
    ColorPickerInstances,
    ColorPickerSwatchInstance,
    ColorPickerValueDetails,
    ColorPickerVariantProps,
} from "@pureform/binding-core";
import * as colorPicker from "@pureform/machines/color-picker";
import { useEffect, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import { PanResponder, Platform, View } from "react-native";
import type {
    GestureResponderEvent,
    LayoutChangeEvent,
    TextInputProps,
} from "react-native";

import { overDefaults } from "../defaults";
import { IconButton } from "../icon-button";
import type { IconButtonProps } from "../icon-button/icon-button";
import { Glyph } from "../icon-style";
import { testIdOf, useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { useNativeSlotReader, withUnselectable } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { TextField } from "../text-field";
import type { TextFieldProps } from "../text-input";

type Part = PartName<typeof colorPickerAnatomy>;
type Color = colorPicker.Color;
type Channel = "hue" | "alpha";

const ADJUSTABLE = [{ name: "increment" }, { name: "decrement" }];

/** The eye dropper's glyph. */
const COLORIZE = "⊙";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface ColorPickerHosts {
    readonly area: "View";
    readonly areaBackground: "View";
    readonly areaThumb: "View";
    readonly channelSlider: "View";
    readonly transparencyGrid: "View";
    readonly channelSliderTrack: "View";
    readonly channelSliderThumb: "View";
    readonly swatchTrigger: "Pressable";
    readonly swatch: "View";
    readonly root: "View";
    readonly label: "Text";
    readonly content: "View";
    readonly control: "View";
    readonly valueSwatch: "View";
    readonly swatchGroup: "View";
}

export interface ColorPickerProps
    extends
        ColorPickerVariantProps,
        ColorPickerContentProps<ReactNode>,
        NativeSlotProps<ColorPickerHosts, ColorPickerInstances> {
    /** The eye dropper button's `style`, `slotProps`, `tokens` and `testId`. */
    readonly iconButtonProps?: InnerPropsOf<IconButtonProps> | undefined;
    /** The hex field's `style`, `slotProps`, `tokens` and `testId`. */
    readonly textFieldProps?: InnerPropsOf<TextFieldProps> | undefined;
    /** The color, controlled: any CSS color (`#6750a4`, `rgb(…)`, `hsl(…)`). */
    readonly value?: string | undefined;
    /** The color to start with. @default "#6750a4" */
    readonly defaultValue?: string | undefined;
    /** Called as the color changes, while dragging too. */
    readonly onValueChange?:
        | ((details: ColorPickerValueDetails) => void)
        | undefined;
    /** Called when a drag, an adjustment, a swatch or the text field settles on a color. */
    readonly onValueChangeEnd?:
        | ((details: ColorPickerValueDetails) => void)
        | undefined;
    readonly disabled?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    readonly testId?: TestIdOverride<Part> | undefined;
}

/** The hex a color reports: `#rrggbb`, or `#rrggbbaa` when it isn't opaque. */
const hsba = (css: string): Color => colorPicker.parse(css).toFormat("hsba");

/** A gradient, on React Native or React Native Web. */
const gradient = (image: string) =>
    Platform.OS === "web"
        ? { backgroundImage: image }
        : { experimental_backgroundImage: image };

const HUES = "#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00";

/** Where a drag is, in the page, from its event or its gesture. */
interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** A drag over a box: it calls `move` with where it is (0 to 1 across and down) as it starts and
 *  moves, and `end` when it lets go. */
function useDrag(
    enabled: boolean,
    move: (x: number, y: number) => void,
    end: () => void,
) {
    const ref = useRef<ComponentRef<typeof View>>(null);
    const box = useRef<Box>({ x: 0, y: 0, width: 0, height: 0 });
    const latest = useRef({ enabled, move, end });
    // oxlint-disable-next-line react/refs -- the latest value for callbacks and gestures that run after render
    latest.current = { enabled, move, end };
    const measure = () =>
        ref.current?.measure((_x, _y, width, height, pageX, pageY) => {
            box.current = { x: pageX, y: pageY, width, height };
        });
    const at = (pageX: number, pageY: number) => {
        const { x, y, width, height } = box.current;
        latest.current.move(
            colorPickerFraction(pageX - x, width),
            colorPickerFraction(pageY - y, height),
        );
    };
    // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
    const pan = useRef(
        // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
        PanResponder.create({
            onStartShouldSetPanResponder: () => latest.current.enabled,
            onMoveShouldSetPanResponder: () => latest.current.enabled,
            onPanResponderGrant: (event: GestureResponderEvent) => {
                measure();
                at(event.nativeEvent.pageX, event.nativeEvent.pageY);
            },
            onPanResponderMove: (_event, gesture) =>
                at(gesture.moveX, gesture.moveY),
            onPanResponderRelease: () => latest.current.end(),
            onPanResponderTerminate: () => latest.current.end(),
        }),
    ).current;
    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        box.current = { ...box.current, width, height };
        measure();
    };
    return { ref, pan, onLayout, box };
}

interface PartsProps {
    readonly picker: ColorPickerProps;
    readonly color: Color;
    readonly rtl: boolean;
    readonly set: (color: Color) => void;
    readonly end: () => void;
}

function Area(props: PartsProps): ReactNode {
    const nativeSlots = useNativeSlotReader("colorPicker");
    const slot = nativeSlots(props.picker);
    const { picker, color, rtl } = props;
    const { styles: s, views: v } = useComponentSlots<Part>(
        "colorPicker",
        colorPickerSelection(picker),
        { disabled: !!picker.disabled },
    );
    const interactive = !picker.disabled && !picker.readOnly;
    const drag = useDrag(
        interactive,
        (x, y) =>
            props.set(
                color
                    .withChannelValue("saturation", (rtl ? 1 - x : x) * 100)
                    .withChannelValue("brightness", (1 - y) * 100),
            ),
        props.end,
    );
    const [size, setSize] = useState({ width: 0, height: 0 });
    const hue = color.getChannelValue("hue");
    const saturation = color.getChannelValue("saturation") / 100;
    const brightness = color.getChannelValue("brightness") / 100;
    const thumb = Number((s.areaThumb as { width?: unknown }).width) || 24;
    const x = (rtl ? 1 - saturation : saturation) * size.width;
    const id = (part: Part) =>
        testIdOf(colorPickerAnatomy, part, picker.testId);
    // A step of 1 in saturation (across, by direction) or brightness (up and down), from the
    // channels rounded, as the web's area thumb steps.
    const step = (channel: "saturation" | "brightness", by: number) => {
        if (!interactive) return;
        const rounded = color
            .withChannelValue("saturation", Math.round(saturation * 100))
            .withChannelValue("brightness", Math.round(brightness * 100));
        const next = rounded.getChannelValue(channel) + by;
        props.set(
            rounded.withChannelValue(channel, Math.min(100, Math.max(0, next))),
        );
        props.end();
    };
    const onKeyDown = (event: { nativeEvent: { key?: string } }) => {
        const key = event.nativeEvent.key;
        const forward = rtl ? "ArrowLeft" : "ArrowRight";
        const backward = rtl ? "ArrowRight" : "ArrowLeft";
        if (key === forward) step("saturation", 1);
        else if (key === backward) step("saturation", -1);
        else if (key === "ArrowUp") step("brightness", 1);
        else if (key === "ArrowDown") step("brightness", -1);
    };
    return (
        <v.area.View
            {...slot.props("area")}
            ref={drag.ref}
            onLayout={(event: LayoutChangeEvent) => {
                drag.onLayout(event);
                setSize(event.nativeEvent.layout);
            }}
            // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
            {...slot.with("area", drag.pan.panHandlers)}
            style={slot.style("area", withUnselectable(s.area))}
            testID={id("area")}
        >
            <v.areaBackground.View
                {...slot.props("areaBackground")}
                pointerEvents="none"
                style={slot.style("areaBackground", {
                    ...s.areaBackground,
                    backgroundColor: `hsl(${hue}, 100%, 50%)`,
                    ...gradient(
                        `linear-gradient(to top, #000, transparent), linear-gradient(to ${rtl ? "left" : "right"}, #fff, transparent)`,
                    ),
                })}
                testID={id("areaBackground")}
            />
            <v.areaThumb.View
                {...slot.props("areaThumb")}
                pointerEvents="none"
                role="adjustable"
                aria-label="saturation and brightness"
                focusable={interactive}
                {...({ onKeyDown } as object)}
                aria-valuetext={`saturation ${Math.round(saturation * 100)}, brightness ${Math.round(brightness * 100)}`}
                style={slot.style("areaThumb", {
                    ...s.areaThumb,
                    left: x - thumb / 2,
                    top: (1 - brightness) * size.height - thumb / 2,
                    backgroundColor: color
                        .withChannelValue("alpha", 1)
                        .toString("css"),
                })}
                testID={id("areaThumb")}
            />
        </v.area.View>
    );
}

/** A transparency grid: two rows of alternating squares, behind the alpha track. */
function Grid(props: { readonly width: number; readonly height: number }) {
    const cell = props.height / 2;
    const columns = cell > 0 ? Math.ceil(props.width / cell) : 0;
    return (
        <>
            {Array.from({ length: columns * 2 }, (_, at) => {
                const row = Math.floor(at / columns);
                const column = at % columns;
                return (column + row) % 2 === 0 ? null : (
                    <View
                        key={at}
                        style={{
                            position: "absolute",
                            top: row * cell,
                            left: column * cell,
                            width: cell,
                            height: cell,
                            backgroundColor: "#e0e0e0",
                        }}
                    />
                );
            })}
        </>
    );
}

function ChannelSlider(props: PartsProps & { readonly channel: Channel }) {
    const nativeSlots = useNativeSlotReader("colorPicker");
    const slot = nativeSlots(props.picker);
    const { picker, color, rtl, channel } = props;
    const each: ColorPickerChannelInstance | undefined =
        slot.each("channelSlider") ||
        slot.each("transparencyGrid") ||
        slot.each("channelSliderTrack") ||
        slot.each("channelSliderThumb")
            ? { channel }
            : undefined;
    const { styles: s, views: v } = useComponentSlots<Part>(
        "colorPicker",
        colorPickerSelection(picker),
        { disabled: !!picker.disabled },
    );
    const interactive = !picker.disabled && !picker.readOnly;
    const max = channel === "hue" ? 360 : 1;
    const step = channel === "hue" ? 1 : 0.01;
    const now = color.getChannelValue(channel);
    const setTo = (value: number) =>
        props.set(
            color.withChannelValue(channel, Math.min(max, Math.max(0, value))),
        );
    const drag = useDrag(
        interactive,
        (x) => setTo((rtl ? 1 - x : x) * max),
        props.end,
    );
    const [width, setWidth] = useState(0);
    const thumb =
        Number((s.channelSliderThumb as { width?: unknown }).width) || 24;
    const fraction = now / max;
    const opaque = color.withChannelValue("alpha", 1).toString("css");
    const toward = rtl ? "left" : "right";
    const track =
        channel === "hue"
            ? `linear-gradient(to ${toward}, ${HUES})`
            : `linear-gradient(to ${toward}, transparent, ${opaque})`;
    const adjust = (by: number) => {
        if (!interactive) return;
        setTo(now + by);
        props.end();
    };
    const onKeyDown = (event: { nativeEvent: { key?: string } }) => {
        const key = event.nativeEvent.key;
        const forward = rtl ? "ArrowLeft" : "ArrowRight";
        const backward = rtl ? "ArrowRight" : "ArrowLeft";
        if (key === forward || key === "ArrowUp") adjust(step);
        else if (key === backward || key === "ArrowDown") adjust(-step);
    };
    const id = (part: Part) =>
        testIdOf(colorPickerAnatomy, part, picker.testId);
    const trackHeight =
        Number((s.channelSliderTrack as { height?: unknown }).height) || 16;
    return (
        <v.channelSlider.View
            {...slot.props("channelSlider", each)}
            ref={drag.ref}
            onLayout={(event: LayoutChangeEvent) => {
                drag.onLayout(event);
                setWidth(event.nativeEvent.layout.width);
            }}
            // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
            {...slot.with("channelSlider", drag.pan.panHandlers, each)}
            style={slot.style(
                "channelSlider",
                withUnselectable(s.channelSlider),
                each,
            )}
            testID={id("channelSlider")}
        >
            {channel === "alpha" ? (
                <v.transparencyGrid.View
                    {...slot.props("transparencyGrid", each)}
                    pointerEvents="none"
                    style={slot.style(
                        "transparencyGrid",
                        {
                            ...s.transparencyGrid,
                            backgroundColor: "#fff",
                        },
                        each,
                    )}
                    testID={id("transparencyGrid")}
                >
                    <Grid width={width} height={trackHeight} />
                </v.transparencyGrid.View>
            ) : null}
            <v.channelSliderTrack.View
                {...slot.props("channelSliderTrack", each)}
                pointerEvents="none"
                style={slot.style(
                    "channelSliderTrack",
                    {
                        ...s.channelSliderTrack,
                        ...gradient(track),
                    },
                    each,
                )}
                testID={id("channelSliderTrack")}
            />
            <v.channelSliderThumb.View
                {...slot.props("channelSliderThumb", each)}
                role="adjustable"
                aria-label={channel}
                aria-valuenow={Math.round(channel === "hue" ? now : now * 100)}
                aria-valuemin={0}
                aria-valuemax={channel === "hue" ? 360 : 100}
                aria-disabled={picker.disabled || undefined}
                focusable={interactive}
                accessibilityActions={ADJUSTABLE}
                onAccessibilityAction={slot.on(
                    "channelSliderThumb",
                    "onAccessibilityAction",
                    (event: { nativeEvent: { actionName: string } }) =>
                        adjust(
                            (event.nativeEvent.actionName === "increment"
                                ? 1
                                : -1) * step,
                        ),
                    each,
                )}
                {...({ onKeyDown } as object)}
                style={slot.style(
                    "channelSliderThumb",
                    {
                        ...s.channelSliderThumb,
                        left:
                            (rtl ? 1 - fraction : fraction) * width - thumb / 2,
                        backgroundColor:
                            channel === "hue"
                                ? `hsl(${now}, 100%, 50%)`
                                : color.toString("css"),
                    },
                    each,
                )}
                testID={id("channelSliderThumb")}
            />
        </v.channelSlider.View>
    );
}

function SwatchTrigger(props: {
    readonly picker: ColorPickerProps;
    readonly value: string;
    readonly index: number;
    readonly checked: boolean;
    readonly pick: (value: string) => void;
}): ReactNode {
    const nativeSlots = useNativeSlotReader("colorPicker");
    const slot = nativeSlots(props.picker);
    const { picker, value, checked } = props;
    const each: ColorPickerSwatchInstance | undefined =
        slot.each("swatchTrigger") || slot.each("swatch")
            ? { color: value, index: props.index }
            : undefined;
    const { styles: s, views: v } = useComponentSlots<Part>(
        "colorPicker",
        colorPickerSelection(picker),
        { selected: checked, disabled: !!picker.disabled },
    );
    const id = (part: Part) =>
        testIdOf(colorPickerAnatomy, part, picker.testId);
    return (
        <v.swatchTrigger.Pressable
            {...slot.props("swatchTrigger", each)}
            role="button"
            aria-label={colorPickerSwatchLabel(value)}
            aria-pressed={checked}
            disabled={picker.disabled || picker.readOnly}
            onPress={slot.on(
                "swatchTrigger",
                "onPress",
                () => props.pick(value),
                each,
            )}
            style={slot.style("swatchTrigger", s.swatchTrigger, each)}
            testID={id("swatchTrigger")}
        >
            <v.swatch.View
                {...slot.props("swatch", each)}
                style={slot.style(
                    "swatch",
                    { ...s.swatch, backgroundColor: value },
                    each,
                )}
                testID={id("swatch")}
            />
        </v.swatchTrigger.Pressable>
    );
}

/** `own`, then the user's handler of the same name, if any. */
const after =
    <A extends unknown[]>(
        own: () => void,
        user: ((...args: A) => void) | undefined,
    ) =>
    (...args: A) => {
        own();
        user?.(...args);
    };

function ColorPickerImpl(props: ColorPickerProps): ReactNode {
    const nativeSlots = useNativeSlotReader("colorPicker");
    const userInput = props.textFieldProps?.slotProps?.input as
        | TextInputProps
        | undefined;
    const { styles: s, views: v } = useComponentSlots<Part>(
        "colorPicker",
        colorPickerSelection(props),
    );
    const rtl = useDirection() === "rtl";
    const [hex, setHex] = useControllable(
        "ColorPicker",
        "value",
        props.value === undefined
            ? undefined
            : (colorPickerHex(props.value) ?? props.value),
        props.defaultValue,
        undefined,
        COLOR_PICKER_DEFAULT,
    );
    // The color in HSB, kept while its hex is the value, so a grey keeps its hue and black its
    // saturation.
    const [own, setOwn] = useState<Color>(() => hsba(hex));
    const color =
        colorPickerHexOf(own) === colorPickerHex(hex) ? own : hsba(hex);
    const latest = useRef(color);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks and gestures that run after render
    latest.current = color;
    const set = (next: Color) => {
        setOwn(next);
        latest.current = next;
        const value = colorPickerHexOf(next);
        setHex(value);
        props.onValueChange?.({ value });
    };
    const end = () =>
        props.onValueChangeEnd?.({ value: colorPickerHexOf(latest.current) });
    const pick = (value: string) => {
        const next = hsba(value);
        if (colorPickerHexOf(next) === colorPickerHexOf(color)) return;
        set(next);
        props.onValueChangeEnd?.({ value: colorPickerHexOf(next) });
    };
    const [draft, setDraft] = useState<string | null>(null);
    const commit = () => {
        if (draft === null) return;
        const next = colorPickerHex(draft);
        setDraft(null);
        if (next !== undefined) pick(next);
    };
    const [dropper, setDropper] = useState(false);
    useEffect(() => {
        // oxlint-disable-next-line react/set-state-in-effect -- feature detection after mount, so the server and the first client render agree
        if (Platform.OS === "web") setDropper(hasEyeDropper());
    }, []);
    const openDropper = () => {
        const EyeDropper = (
            window as unknown as {
                EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> };
            }
        ).EyeDropper;
        new EyeDropper()
            .open()
            .then(({ sRGBHex }) => pick(sRGBHex))
            .catch(() => {});
    };
    const parts: PartsProps = { picker: props, color, rtl, set, end };
    const id = (part: Part) => testIdOf(colorPickerAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const current = colorPickerHexOf(color);
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            {props.label === undefined ? null : (
                <v.label.Text
                    {...slot.props("label")}
                    style={slot.style("label", s.label)}
                    testID={id("label")}
                >
                    {props.label}
                </v.label.Text>
            )}
            <v.content.View
                {...slot.props("content")}
                style={slot.style("content", s.content)}
                testID={id("content")}
            >
                {props.area === false ? null : <Area {...parts} />}
                <ChannelSlider {...parts} channel="hue" />
                {props.alpha ? (
                    <ChannelSlider {...parts} channel="alpha" />
                ) : null}
                <v.control.View
                    {...slot.props("control")}
                    style={slot.style("control", s.control)}
                    testID={id("control")}
                >
                    <v.valueSwatch.View
                        {...slot.props("valueSwatch")}
                        aria-hidden
                        style={slot.style("valueSwatch", {
                            ...s.valueSwatch,
                            backgroundColor: current,
                        })}
                        testID={id("valueSwatch")}
                    />
                    <View style={{ flexGrow: 1, flexShrink: 1 }}>
                        <TextField
                            {...overDefaults(props.textFieldProps, {
                                slotProps: {
                                    input: {
                                        autoCapitalize: "characters",
                                        autoCorrect: false,
                                        maxLength: 8,
                                        onBlur: after(
                                            // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
                                            commit,
                                            userInput?.onBlur,
                                        ),
                                        onSubmitEditing: after(
                                            // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
                                            commit,
                                            userInput?.onSubmitEditing,
                                        ),
                                    },
                                },
                            })}
                            variant="outlined"
                            label={props.inputLabel ?? "Hex"}
                            prefixText="#"
                            disabled={props.disabled}
                            readOnly={props.readOnly}
                            invalid={
                                draft !== null &&
                                colorPickerHex(draft) === undefined
                            }
                            value={draft ?? colorPickerHexText(current)}
                            onValueChange={({ value }) => setDraft(value)}
                        />
                    </View>
                    {dropper && props.eyeDropper !== false ? (
                        <IconButton
                            {...props.iconButtonProps}
                            icon={<Glyph glyph={COLORIZE} />}
                            aria-label={
                                props.eyeDropperLabel ??
                                "Pick a color from the screen"
                            }
                            disabled={props.disabled || props.readOnly}
                            onPress={openDropper}
                        />
                    ) : null}
                </v.control.View>
                {props.swatches && props.swatches.length > 0 ? (
                    <v.swatchGroup.View
                        {...slot.props("swatchGroup")}
                        role="group"
                        style={slot.style("swatchGroup", s.swatchGroup)}
                        testID={id("swatchGroup")}
                    >
                        {props.swatches.map((swatch, index) => (
                            <SwatchTrigger
                                key={swatch}
                                index={index}
                                picker={props}
                                value={swatch}
                                checked={colorPickerHex(swatch) === current}
                                pick={pick}
                            />
                        ))}
                    </v.swatchGroup.View>
                ) : null}
            </v.content.View>
        </v.root.View>
    );
}

/** A color picker, inline: `<ColorPicker label="Seed color" defaultValue="#6750a4"
 *  swatches={["#6750a4", "#006a6a"]} onValueChange={({ value }) => setSeed(value)} />`. */
export const ColorPicker = withEngine(ColorPickerImpl, "ColorPicker");
