// The tags input: a text field whose values are input chips, laid before the input in the
// container's wrapping row. Submitting (or typing the delimiter) adds the typed text as a chip;
// Backspace on an empty input removes the last one, and each chip's remove button removes it.

import { inputChipAnatomy, tagsInputAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
  inputChipSelection,
  isPresent,
  tagsInputChipTestId,
  tagsInputFilled,
  tagsInputSelection,
} from "@pureform/binding-core";
import type {
  IndicationProps,
  InnerProps,
  InputChipPart,
  TagsInputBehaviorProps,
  TagsInputContentProps,
  TagsInputPart,
  TagsInputVariantProps,
} from "@pureform/binding-core";
import type { InstanceTokens } from "@pureform/styling";
import { useState } from "react";
import type { ReactNode } from "react";
import type { TextInputKeyPressEvent } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, useControllable, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { resolveText } from "../resolve-text";
import { ownText } from "../icon-style";

// The chip's and its remove button's.
const INDICATIONS = Object.fromEntries(
  inputChipAnatomy.indication.map((entry) => [entry.trigger, entry]),
);

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface TagsInputHosts {
  readonly root: "View";
  readonly container: "View";
  readonly leadingIcon: "View";
  readonly trailingIcon: "View";
  readonly input: "TextInput";
  readonly label: "Text";
  readonly supportingText: "Text";
}

/** What each part of a chip renders as. */
export interface InputChipHosts {
  readonly root: "Pressable";
  readonly touchTarget: "View";
  readonly avatar: "View";
  readonly icon: "View";
  readonly label: "Text";
  readonly remove: "Pressable";
}

export interface TagsInputProps
  extends
    Omit<TagsInputVariantProps, "leadingIcon" | "trailingIcon">,
    Pick<
      TagsInputBehaviorProps,
      | "value"
      | "defaultValue"
      | "onValueChange"
      | "disabled"
      | "invalid"
      | "error"
      | "readOnly"
      | "placeholder"
      | "max"
      | "maxLength"
      | "delimiter"
      | "allowDuplicates"
      | "validate"
      | "removeLabel"
    >,
    TagsInputContentProps<ReactNode>,
    IndicationProps,
    NativeSlotProps<TagsInputHosts> {
  /** Every chip's `tokens`, keyed `style` and `slotProps`, and `testId` (over the one from
   *  the field's). */
  readonly chipProps?:
    | InnerProps<
        {
          readonly tokens?: InstanceTokens<"inputChip">;
          readonly testId?: TestIdOverride<InputChipPart>;
        } & NativeSlotProps<InputChipHosts>
      >
    | undefined;
  /** A prefix for every part's test id (`tags` → `tags-input`), or ids by part. The chips'
   *  parts take the prefix too (`tags-chip-label`). */
  readonly testId?: TestIdOverride<TagsInputPart> | undefined;
}

interface ChipOptions {
  readonly props: TagsInputProps;
  readonly value: string;
  readonly onRemove: () => void;
}

const chipId = (part: InputChipPart, props: TagsInputProps) =>
  testIdOf(
    inputChipAnatomy,
    part,
    props.chipProps?.testId ?? tagsInputChipTestId(props.testId),
  );

function RemoveImpl(options: ChipOptions): ReactNode {
  const { props, value } = options;
  const slot = nativeSlots(props.chipProps);
  const indication = useSurfaceIndication(INDICATIONS["remove"]!, {
    indication: props.indication,
    disabled: props.disabled || props.readOnly,
  });
  const {
    styles: s,
    selected,
    views: v,
  } = useComponentSlots<InputChipPart>(
    "inputChip",
    indication.select({
      ...inputChipSelection(props.chip),
      tokens: props.chipProps?.tokens,
    }),
    indication.states(props.disabled ? { disabled: true } : {}),
  );
  return (
    <v.remove.Pressable
      {...slot.props("remove")}
      {...slot.with("remove", indication.handlers)}
      role="button"
      aria-label={props.removeLabel?.(value) ?? `Delete tag ${value}`}
      disabled={props.disabled || props.readOnly}
      onPress={slot.on("remove", "onPress", options.onRemove)}
      style={slot.style("remove", withUnselectable(s.remove))}
      testID={chipId("remove", props)}
    >
      <IconSlot {...iconSlot(selected, "remove")} motion={s.remove}>
        {isPresent(props.removeIcon) ? props.removeIcon : "✕"}
      </IconSlot>
      {indication.layer(selected)}
    </v.remove.Pressable>
  );
}

const Remove = withEngine(RemoveImpl, "TagsInputChipRemove");

function ChipImpl(options: ChipOptions): ReactNode {
  const { props, value } = options;
  const slot = nativeSlots(props.chipProps);
  const indication = useSurfaceIndication(INDICATIONS["root"]!, {
    indication: props.indication,
    disabled: props.disabled,
  });
  const {
    styles: s,
    selected,
    views: v,
  } = useComponentSlots<InputChipPart>(
    "inputChip",
    indication.select({
      ...inputChipSelection(props.chip),
      tokens: props.chipProps?.tokens,
    }),
    indication.states(props.disabled ? { disabled: true } : {}),
  );
  const avatar = props.chipAvatar?.(value);
  const icon = props.chipIcon?.(value);
  return (
    <v.root.Pressable
      {...slot.props("root")}
      {...slot.with("root", indication.handlers)}
      disabled={props.disabled}
      style={slot.style("root", withUnselectable(s.root))}
      testID={chipId("root", props)}
    >
      <v.touchTarget.View
        {...slot.props("touchTarget")}
        pointerEvents="none"
        style={slot.style("touchTarget", s.touchTarget)}
        testID={chipId("touchTarget", props)}
      />
      {isPresent(avatar) ? (
        <v.avatar.View
          {...slot.props("avatar")}
          style={slot.style("avatar", s.avatar)}
          testID={chipId("avatar", props)}
        >
          {resolveText(avatar, v.avatar, ownText(s.avatar))}
        </v.avatar.View>
      ) : isPresent(icon) ? (
        <v.icon.View
          {...slot.props("icon")}
          style={slot.style("icon", s.icon)}
          testID={chipId("icon", props)}
        >
          <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
            {icon}
          </IconSlot>
        </v.icon.View>
      ) : null}
      <v.label.Text
        {...slot.props("label")}
        selectable={false}
        style={slot.style("label", s.label)}
        testID={chipId("label", props)}
      >
        {value}
      </v.label.Text>
      <Remove {...options} />
      {indication.layer(selected)}
    </v.root.Pressable>
  );
}

const Chip = withEngine(ChipImpl, "TagsInputChip");

function TagsInputImpl(props: TagsInputProps): ReactNode {
  const [values, setValues] = useControllable<"value", string[]>(
    "TagsInput",
    "value",
    props.value,
    props.defaultValue,
    props.onValueChange,
    [],
  );
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const invalid = (props.invalid ?? false) || props.error !== undefined;
  const editable = !props.disabled && !props.readOnly;
  const {
    styles: s,
    selected,
    views: v,
  } = useComponentSlots<TagsInputPart>(
    "tagsInput",
    tagsInputSelection({
      ...props,
      leadingIcon: isPresent(props.leadingIcon),
      trailingIcon: isPresent(props.trailingIcon),
    }),
    {
      focus: focused,
      focusVisible: focused,
      filled: tagsInputFilled(values.length, text),
      invalid,
      disabled: props.disabled ?? false,
      ...(props.readOnly ? { readOnly: true } : {}),
    },
  );
  const id = (part: TagsInputPart) =>
    testIdOf(tagsInputAnatomy, part, props.testId);
  const slot = nativeSlots(props);

  // The values with each of `entries` added that may be, or `current` when none may.
  const added = (current: string[], entries: readonly string[]) => {
    let next = current;
    for (const entry of entries) {
      const value = entry.trim();
      if (value === "") continue;
      if (!props.allowDuplicates && next.includes(value)) continue;
      if (props.max !== undefined && next.length >= props.max) continue;
      if (props.validate && !props.validate({ inputValue: value, value: next }))
        continue;
      next = [...next, value];
    }
    return next;
  };
  const commit = (entries: readonly string[], rest: string) => {
    const next = added(values, entries);
    if (next !== values) setValues(next);
    setText(rest);
  };
  const onChangeText = (typed: string) => {
    const delimiter = props.delimiter ?? ",";
    const pieces = typed.split(delimiter);
    if (pieces.length < 2) return setText(typed);
    commit(pieces.slice(0, -1), pieces.at(-1) ?? "");
  };
  const remove = (index: number) =>
    setValues(values.filter((_, at) => at !== index));

  const icon = (part: "leadingIcon" | "trailingIcon", node: ReactNode) => {
    const Slot = v[part];
    return isPresent(node) ? (
      <Slot.View
        {...slot.props(part)}
        {...(part === "trailingIcon" ? { pointerEvents: "none" } : {})}
        style={slot.style(part, s[part])}
        testID={id(part)}
      >
        <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
          {node}
        </IconSlot>
      </Slot.View>
    ) : null;
  };
  const supporting = props.error ?? props.supportingText;
  return (
    <v.root.View
      {...slot.props("root")}
      style={slot.style("root", s.root)}
      testID={id("root")}
    >
      <v.container.View
        {...slot.props("container")}
        style={slot.style("container", s.container)}
        testID={id("container")}
      >
        {icon("leadingIcon", props.leadingIcon)}
        {values.map((value, index) => (
          <Chip
            // Duplicates may repeat a value, so its place keys it too.
            key={`${index}:${value}`}
            props={props}
            value={value}
            onRemove={() => remove(index)}
          />
        ))}
        <v.input.TextInput
          {...slot.props("input")}
          value={text}
          onChangeText={slot.on("input", "onChangeText", onChangeText)}
          onSubmitEditing={slot.on("input", "onSubmitEditing", () =>
            commit([text], ""),
          )}
          submitBehavior="submit"
          blurOnSubmit={false}
          onKeyPress={slot.on(
            "input",
            "onKeyPress",
            (event: TextInputKeyPressEvent) => {
              if (
                event.nativeEvent.key === "Backspace" &&
                text === "" &&
                values.length > 0
              )
                remove(values.length - 1);
            },
          )}
          onFocus={slot.on("input", "onFocus", () => setFocused(true))}
          onBlur={slot.on("input", "onBlur", () => setFocused(false))}
          editable={editable}
          placeholder={props.placeholder ?? " "}
          maxLength={props.maxLength}
          {...(typeof props.label === "string"
            ? { "aria-label": props.label }
            : {})}
          aria-invalid={invalid}
          style={slot.style("input", s.input)}
          testID={id("input")}
        />
        <v.label.Text
          {...slot.props("label")}
          selectable={false}
          pointerEvents="none"
          style={slot.style("label", s.label)}
          testID={id("label")}
        >
          {props.label}
        </v.label.Text>
        {icon("trailingIcon", props.trailingIcon)}
      </v.container.View>
      {isPresent(supporting) ? (
        <v.supportingText.Text
          {...slot.props("supportingText")}
          style={slot.style("supportingText", s.supportingText)}
          testID={id("supportingText")}
        >
          {supporting}
        </v.supportingText.Text>
      ) : null}
    </v.root.View>
  );
}

/** Material's input chips in a text field: `<TagsInput label="Tags" defaultValue={["red"]} />`.
 *  Submitting or typing the delimiter adds a chip; Backspace on an empty input removes the last. */
export const TagsInput = withEngine(TagsInputImpl, "TagsInput");
