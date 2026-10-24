// The copy button: an icon button that copies `value` and shows it did. React Native has no
// clipboard of its own, so the app passes `copy` (`Clipboard.setString` from
// `@react-native-clipboard/clipboard`, or expo's `setStringAsync`); without one, React Native Web's
// `navigator.clipboard` is used. Once written, for `timeout` ms the icon is a check, the name says
// copied, and the screen reader announces it; a `copy` that throws or rejects calls `onCopyError`.

import type { TestIdOverride } from "@pureform/anatomy";
import { COPIED_LABEL, COPY_LABEL, warnOnce } from "@pureform/binding-core";
import type {
    CopyButtonBehaviorProps,
    CopyButtonContentProps,
    CopyButtonVariantProps,
    IconButtonPart,
    InteractiveProps,
} from "@pureform/binding-core";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AccessibilityInfo } from "react-native";
import type { GestureResponderEvent } from "react-native";

import { IconButton } from "../icon-button";
import type { IconButtonHosts } from "../icon-button/icon-button";
import { Glyph } from "../icon-style";
import type { NativeSlotProps } from "../slot-props";

export interface CopyButtonProps
    extends
        CopyButtonVariantProps,
        CopyButtonBehaviorProps,
        CopyButtonContentProps<ReactNode>,
        InteractiveProps,
        NativeSlotProps<IconButtonHosts> {
    /** Puts the text on the platform's clipboard. */
    readonly copy?: ((value: string) => void | Promise<void>) | undefined;
    readonly disabled?: boolean | undefined;
    readonly onPress?: ((event: GestureResponderEvent) => void) | undefined;
    readonly testId?: TestIdOverride<IconButtonPart> | undefined;
}

const DEFAULT_TIMEOUT = 3000;

const webClipboard = (value: string): void | Promise<void> => {
    const clipboard = (globalThis as { navigator?: { clipboard?: Clipboard } })
        .navigator?.clipboard;
    if (!clipboard) {
        warnOnce(
            "pureform: CopyButton has no clipboard. Pass `copy`, for example `Clipboard.setString` from @react-native-clipboard/clipboard.",
        );
        throw new Error("no clipboard");
    }
    return clipboard.writeText(value);
};

const asError = (cause: unknown): Error =>
    cause instanceof Error ? cause : new Error(String(cause));

/** An icon button that copies `value` and confirms it:
 *  `<CopyButton value={token} copy={Clipboard.setString} />`. */
export function CopyButton(props: CopyButtonProps): ReactNode {
    const {
        value,
        timeout = DEFAULT_TIMEOUT,
        onCopy,
        onCopyError,
        label = COPY_LABEL,
        copiedLabel = COPIED_LABEL,
        icon,
        copiedIcon,
        copy = webClipboard,
        onPress,
        ...rest
    } = props;
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            clearTimeout(timer.current);
        };
    }, []);
    return (
        <IconButton
            {...rest}
            aria-label={copied ? copiedLabel : label}
            icon={
                copied
                    ? (copiedIcon ?? <Glyph glyph="✓" />)
                    : (icon ?? <Glyph glyph="⧉" />)
            }
            onPress={(event: GestureResponderEvent) => {
                onPress?.(event);
                const written = () => {
                    if (!mounted.current) return;
                    setCopied(true);
                    onCopy?.(value);
                    AccessibilityInfo.announceForAccessibility(copiedLabel);
                    clearTimeout(timer.current);
                    timer.current = setTimeout(() => setCopied(false), timeout);
                };
                const denied = (cause: unknown) =>
                    onCopyError?.({ value, error: asError(cause) });
                let pending: void | Promise<void>;
                try {
                    pending = copy(value);
                } catch (cause) {
                    denied(cause);
                    return;
                }
                // A synchronous copy (`Clipboard.setString`) shows at once.
                if (pending instanceof Promise) pending.then(written, denied);
                else written();
            }}
        />
    );
}
