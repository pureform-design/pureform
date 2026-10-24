// The code field: a row of single-character cells for a verification code, a one-time code or a
// PIN. React Native has no Zag machine, so binding-core's arithmetic runs here: typing a
// character fills its cell and moves on, Backspace removes one and moves back, and pasting a
// whole code (or the platform's one-time code) fills every cell, as Zag's pin input does on the
// web.

import { codeFieldAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    CODE_FIELD_LENGTH,
    codeFieldBackspace,
    codeFieldCellLabel,
    codeFieldCells,
    codeFieldComplete,
    codeFieldEnter,
    codeFieldSelection,
    codeFieldString,
    isPresent,
} from "@pureform/binding-core";
import type {
    CodeFieldBehaviorProps,
    CodeFieldContentProps,
    CodeFieldPart,
    CodeFieldVariantProps,
} from "@pureform/binding-core";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import type { TextInputKeyPressEvent } from "react-native";

import { testIdOf, withEngine } from "../parts";
import { nativeSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`; React Native's own
 *  `TextInput` props for every cell go in `slotProps.input`. */
export interface CodeFieldHosts {
    readonly root: "View";
    readonly label: "Text";
    readonly control: "View";
    readonly input: "TextInput";
    readonly supportingText: "Text";
}

export interface CodeFieldProps
    extends
        CodeFieldVariantProps,
        Pick<
            CodeFieldBehaviorProps,
            | "value"
            | "defaultValue"
            | "onValueChange"
            | "onValueComplete"
            | "length"
            | "type"
            | "otp"
            | "mask"
            | "blurOnComplete"
            | "placeholder"
            | "disabled"
            | "invalid"
            | "error"
            | "readOnly"
            | "cellLabel"
        >,
        CodeFieldContentProps<ReactNode>,
        NativeSlotProps<CodeFieldHosts> {
    /** A prefix for every part's test id (`otp` → `otp-input`), or ids by part. */
    readonly testId?: TestIdOverride<CodeFieldPart> | undefined;
}

// A cell's input, as far as moving focus goes.
interface Focusable {
    focus(): void;
    blur(): void;
}

const id = (part: CodeFieldPart, props: CodeFieldProps) =>
    testIdOf(codeFieldAnatomy, part, props.testId);

interface CellOptions {
    readonly props: CodeFieldProps;
    readonly index: number;
    readonly length: number;
    readonly value: string;
    readonly invalid: boolean;
    /** Whether Tab reaches it: the focused cell, else the first empty one. */
    readonly tabStop: boolean;
    readonly inputRef: (input: Focusable | null) => void;
    readonly onText: (text: string) => void;
    readonly onBackspace: () => void;
    readonly onFocus: () => void;
    readonly onBlur: () => void;
}

/** On the web, one cell is in the tab order (as the web's code field), and a disabled cell is
 *  `disabled` rather than `readonly` (React Native Web forwards it). */
const WEB = Platform.OS === "web";

// One cell, with its own states: the filled indicator and stroke follow its focus.
function CellImpl(options: CellOptions): ReactNode {
    const { props, index } = options;
    const slot = nativeSlots(props);
    const [focused, setFocused] = useState(false);
    const { styles: s, views: v } = useComponentSlots<CodeFieldPart>(
        "codeField",
        codeFieldSelection(props),
        {
            focus: focused,
            focusVisible: focused,
            filled: options.value !== "",
            invalid: options.invalid,
            disabled: props.disabled ?? false,
            ...(props.readOnly ? { readOnly: true } : {}),
        },
    );
    const numeric = (props.type ?? "numeric") === "numeric";
    return (
        <v.input.TextInput
            {...slot.props("input")}
            ref={options.inputRef}
            value={options.value}
            onChangeText={slot.on("input", "onChangeText", (text: string) => {
                // The new character is what the cell didn't hold.
                const typed =
                    text.length > 1 && text.startsWith(options.value)
                        ? text.slice(options.value.length)
                        : text;
                if (typed === "") options.onBackspace();
                else options.onText(typed);
            })}
            onKeyPress={slot.on(
                "input",
                "onKeyPress",
                (event: TextInputKeyPressEvent) => {
                    if (
                        event.nativeEvent.key === "Backspace" &&
                        options.value === ""
                    )
                        options.onBackspace();
                },
            )}
            onFocus={slot.on("input", "onFocus", () => {
                setFocused(true);
                options.onFocus();
            })}
            onBlur={slot.on("input", "onBlur", () => {
                setFocused(false);
                options.onBlur();
            })}
            editable={!(props.disabled && !WEB) && !props.readOnly}
            {...(WEB
                ? ({
                      tabIndex: options.tabStop ? 0 : -1,
                      ...(props.disabled ? { disabled: true } : {}),
                  } as object)
                : {})}
            keyboardType={numeric ? "number-pad" : "default"}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={props.mask ?? false}
            selectTextOnFocus
            placeholder={focused ? "" : (props.placeholder ?? "")}
            {...(props.otp
                ? {
                      autoComplete: "one-time-code",
                      textContentType: "oneTimeCode",
                  }
                : {})}
            aria-label={(props.cellLabel ?? codeFieldCellLabel)(
                index,
                options.length,
            )}
            aria-invalid={options.invalid}
            style={slot.style("input", s.input)}
            testID={id("input", props)}
        />
    );
}

const Cell = withEngine(CellImpl, "CodeFieldCell");

function CodeFieldImpl(props: CodeFieldProps): ReactNode {
    const length = props.length ?? CODE_FIELD_LENGTH;
    const type = props.type ?? "numeric";
    const controlled = props.value !== undefined;
    const [own, setOwn] = useState(() =>
        codeFieldCells(props.defaultValue, length),
    );
    const cells = codeFieldCells(controlled ? props.value : own, length);
    const inputs = useRef<(Focusable | null)[]>([]);
    const [focusedCount, setFocusedCount] = useState(0);
    const [focusedAt, setFocusedAt] = useState<number>();
    const firstEmpty = cells.indexOf("");
    const tabStop =
        focusedAt ?? (firstEmpty === -1 ? cells.length - 1 : firstEmpty);
    const invalid = (props.invalid ?? false) || props.error !== undefined;

    const change = (next: string[], focus: number) => {
        if (!controlled) setOwn(next);
        const details = { value: next, valueAsString: codeFieldString(next) };
        props.onValueChange?.(details);
        if (codeFieldComplete(next) && !codeFieldComplete(cells)) {
            props.onValueComplete?.(details);
            if (props.blurOnComplete) {
                inputs.current[focus]?.blur();
                return;
            }
        }
        inputs.current[focus]?.focus();
    };

    const { styles: s, views: v } = useComponentSlots<CodeFieldPart>(
        "codeField",
        codeFieldSelection(props),
        {
            focus: focusedCount > 0,
            focusVisible: focusedCount > 0,
            filled: cells.some((cell) => cell !== ""),
            invalid,
            disabled: props.disabled ?? false,
        },
    );
    const slot = nativeSlots(props);
    const supporting = props.error ?? props.supportingText;
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={id("root", props)}
        >
            {isPresent(props.label) ? (
                <v.label.Text
                    {...slot.props("label")}
                    selectable={false}
                    style={slot.style("label", s.label)}
                    testID={id("label", props)}
                >
                    {props.label}
                </v.label.Text>
            ) : null}
            <v.control.View
                {...slot.props("control")}
                style={slot.style("control", s.control)}
                testID={id("control", props)}
            >
                {cells.map((cell, index) => (
                    <Cell
                        key={index}
                        props={props}
                        index={index}
                        length={length}
                        value={cell}
                        invalid={invalid}
                        tabStop={index === tabStop}
                        inputRef={(input) => {
                            inputs.current[index] = input;
                        }}
                        onText={(text) => {
                            const next = codeFieldEnter(
                                cells,
                                index,
                                text,
                                type,
                            );
                            change(next.cells, next.focus);
                        }}
                        onBackspace={() => {
                            const next = codeFieldBackspace(cells, index);
                            change(next.cells, next.focus);
                        }}
                        onFocus={() => {
                            setFocusedCount((n) => n + 1);
                            setFocusedAt(index);
                        }}
                        onBlur={() => {
                            setFocusedCount((n) => Math.max(0, n - 1));
                            setFocusedAt((at) =>
                                at === index ? undefined : at,
                            );
                        }}
                    />
                ))}
            </v.control.View>
            {isPresent(supporting) ? (
                <v.supportingText.Text
                    {...slot.props("supportingText")}
                    style={slot.style("supportingText", s.supportingText)}
                    testID={id("supportingText", props)}
                >
                    {supporting}
                </v.supportingText.Text>
            ) : null}
        </v.root.View>
    );
}

/** A row of single-character cells for a verification code, a one-time code or a PIN:
 *  `<CodeField label="Code" length={6} otp />`. */
export const CodeField = withEngine(CodeFieldImpl, "CodeField");
