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
  ColorPickerContentProps,
  ColorPickerValueDetails,
  ColorPickerVariantProps,
} from "@pureform/binding-core";
import * as colorPicker from "@pureform/machines/color-picker";
import { useEffect, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import { PanResponder, Platform, View } from "react-native";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";

import { IconButton } from "../icon-button";
import { Glyph } from "../icon-style";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { useComponentSlots } from "../styles";
import { TextField } from "../text-field";

type Part = PartName<typeof colorPickerAnatomy>;
type Color = colorPicker.Color;
type Channel = "hue" | "alpha";

const ADJUSTABLE = [{ name: "increment" }, { name: "decrement" }];

/** The eye dropper's glyph. */
const COLORIZE = "⊙";

export interface ColorPickerProps
  extends ColorPickerVariantProps, ColorPickerContentProps<ReactNode> {
  /** The color, controlled: any CSS color (`#6750a4`, `rgb(…)`, `hsl(…)`). */
  readonly value?: string | undefined;
  /** The color to start with. @default "#6750a4" */
  readonly defaultValue?: string | undefined;
  /** Called as the color changes, while dragging too. */
  readonly onValueChange?:
    ((details: ColorPickerValueDetails) => void) | undefined;
  /** Called when a drag, an adjustment, a swatch or the text field settles on a color. */
  readonly onValueChangeEnd?:
    ((details: ColorPickerValueDetails) => void) | undefined;
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
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.enabled,
      onMoveShouldSetPanResponder: () => latest.current.enabled,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        measure();
        at(event.nativeEvent.pageX, event.nativeEvent.pageY);
      },
      onPanResponderMove: (_event, gesture) => at(gesture.moveX, gesture.moveY),
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
  const id = (part: Part) => testIdOf(colorPickerAnatomy, part, picker.testId);
  return (
    <v.area.View
      ref={drag.ref}
      onLayout={(event: LayoutChangeEvent) => {
        drag.onLayout(event);
        setSize(event.nativeEvent.layout);
      }}
      {...drag.pan.panHandlers}
      style={{ ...s.area, ...unselectable }}
      testID={id("area")}
    >
      <v.areaBackground.View
        pointerEvents="none"
        style={{
          ...s.areaBackground,
          backgroundColor: `hsl(${hue}, 100%, 50%)`,
          ...gradient(
            `linear-gradient(to top, #000, transparent), linear-gradient(to ${rtl ? "left" : "right"}, #fff, transparent)`,
          ),
        }}
        testID={id("areaBackground")}
      />
      <v.areaThumb.View
        pointerEvents="none"
        role="adjustable"
        aria-label="saturation and brightness"
        aria-valuetext={`saturation ${Math.round(saturation * 100)}, brightness ${Math.round(brightness * 100)}`}
        style={{
          ...s.areaThumb,
          left: x - thumb / 2,
          top: (1 - brightness) * size.height - thumb / 2,
          backgroundColor: color.withChannelValue("alpha", 1).toString("css"),
        }}
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
  const { picker, color, rtl, channel } = props;
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
  const id = (part: Part) => testIdOf(colorPickerAnatomy, part, picker.testId);
  const trackHeight =
    Number((s.channelSliderTrack as { height?: unknown }).height) || 16;
  return (
    <v.channelSlider.View
      ref={drag.ref}
      onLayout={(event: LayoutChangeEvent) => {
        drag.onLayout(event);
        setWidth(event.nativeEvent.layout.width);
      }}
      {...drag.pan.panHandlers}
      style={{ ...s.channelSlider, ...unselectable }}
      testID={id("channelSlider")}
    >
      {channel === "alpha" ? (
        <v.transparencyGrid.View
          pointerEvents="none"
          style={{ ...s.transparencyGrid, backgroundColor: "#fff" }}
          testID={id("transparencyGrid")}
        >
          <Grid width={width} height={trackHeight} />
        </v.transparencyGrid.View>
      ) : null}
      <v.channelSliderTrack.View
        pointerEvents="none"
        style={{ ...s.channelSliderTrack, ...gradient(track) }}
        testID={id("channelSliderTrack")}
      />
      <v.channelSliderThumb.View
        role="adjustable"
        aria-label={channel}
        aria-valuenow={Math.round(channel === "hue" ? now : now * 100)}
        aria-valuemin={0}
        aria-valuemax={channel === "hue" ? 360 : 100}
        aria-disabled={picker.disabled || undefined}
        focusable={interactive}
        accessibilityActions={ADJUSTABLE}
        onAccessibilityAction={(event: {
          nativeEvent: { actionName: string };
        }) =>
          adjust((event.nativeEvent.actionName === "increment" ? 1 : -1) * step)
        }
        {...({ onKeyDown } as object)}
        style={{
          ...s.channelSliderThumb,
          left: (rtl ? 1 - fraction : fraction) * width - thumb / 2,
          backgroundColor:
            channel === "hue"
              ? `hsl(${now}, 100%, 50%)`
              : color.toString("css"),
        }}
        testID={id("channelSliderThumb")}
      />
    </v.channelSlider.View>
  );
}

function SwatchTrigger(props: {
  readonly picker: ColorPickerProps;
  readonly value: string;
  readonly checked: boolean;
  readonly pick: (value: string) => void;
}): ReactNode {
  const { picker, value, checked } = props;
  const { styles: s, views: v } = useComponentSlots<Part>(
    "colorPicker",
    colorPickerSelection(picker),
    { selected: checked, disabled: !!picker.disabled },
  );
  const id = (part: Part) => testIdOf(colorPickerAnatomy, part, picker.testId);
  return (
    <v.swatchTrigger.Pressable
      role="button"
      aria-label={colorPickerSwatchLabel(value)}
      aria-pressed={checked}
      disabled={picker.disabled || picker.readOnly}
      onPress={() => props.pick(value)}
      style={s.swatchTrigger}
      testID={id("swatchTrigger")}
    >
      <v.swatch.View
        style={{ ...s.swatch, backgroundColor: value }}
        testID={id("swatch")}
      />
    </v.swatchTrigger.Pressable>
  );
}

function ColorPickerImpl(props: ColorPickerProps): ReactNode {
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
  const color = colorPickerHexOf(own) === colorPickerHex(hex) ? own : hsba(hex);
  const latest = useRef(color);
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
  const current = colorPickerHexOf(color);
  return (
    <v.root.View style={s.root} testID={id("root")}>
      {props.label === undefined ? null : (
        <v.label.Text style={s.label} testID={id("label")}>
          {props.label}
        </v.label.Text>
      )}
      <v.content.View style={s.content} testID={id("content")}>
        {props.area === false ? null : <Area {...parts} />}
        <ChannelSlider {...parts} channel="hue" />
        {props.alpha ? <ChannelSlider {...parts} channel="alpha" /> : null}
        <v.control.View style={s.control} testID={id("control")}>
          <v.valueSwatch.View
            aria-hidden
            style={{ ...s.valueSwatch, backgroundColor: current }}
            testID={id("valueSwatch")}
          />
          <View style={{ flexGrow: 1, flexShrink: 1 }}>
            <TextField
              variant="outlined"
              label={props.inputLabel ?? "Hex"}
              prefixText="#"
              disabled={props.disabled}
              readOnly={props.readOnly}
              invalid={draft !== null && colorPickerHex(draft) === undefined}
              value={draft ?? colorPickerHexText(current)}
              onValueChange={({ value }) => setDraft(value)}
              inputProps={{
                autoCapitalize: "characters",
                autoCorrect: false,
                maxLength: 8,
                onBlur: commit,
                onSubmitEditing: commit,
              }}
            />
          </View>
          {dropper && props.eyeDropper !== false ? (
            <IconButton
              icon={<Glyph glyph={COLORIZE} />}
              aria-label={
                props.eyeDropperLabel ?? "Pick a color from the screen"
              }
              disabled={props.disabled || props.readOnly}
              onPress={openDropper}
            />
          ) : null}
        </v.control.View>
        {props.swatches && props.swatches.length > 0 ? (
          <v.swatchGroup.View
            role="group"
            style={s.swatchGroup}
            testID={id("swatchGroup")}
          >
            {props.swatches.map((swatch) => (
              <SwatchTrigger
                key={swatch}
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
