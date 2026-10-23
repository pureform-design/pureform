// The copy button: an icon button that copies `value` and shows it did. React Native has no
// clipboard of its own, so the app passes `copy` (`Clipboard.setString` from
// `@react-native-clipboard/clipboard`, or expo's `setStringAsync`); without one, React Native Web's
// `navigator.clipboard` is used. For `timeout` ms the icon is a check and the name says copied.

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

import { IconButton } from "../icon-button";
import { Glyph } from "../icon-style";

export interface CopyButtonProps
    extends
        CopyButtonVariantProps,
        CopyButtonBehaviorProps,
        CopyButtonContentProps<ReactNode>,
        InteractiveProps {
    /** Puts the text on the platform's clipboard. */
    readonly copy?: ((value: string) => void | Promise<void>) | undefined;
    readonly disabled?: boolean | undefined;
    readonly onPress?: (() => void) | undefined;
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
        return;
    }
    return clipboard.writeText(value);
};

/** An icon button that copies `value` and confirms it:
 *  `<CopyButton value={token} copy={Clipboard.setString} />`. */
export function CopyButton(props: CopyButtonProps): ReactNode {
    const {
        value,
        timeout = DEFAULT_TIMEOUT,
        onCopy,
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
    useEffect(() => () => clearTimeout(timer.current), []);
    return (
        <IconButton
            {...rest}
            aria-label={copied ? copiedLabel : label}
            icon={
                copied
                    ? (copiedIcon ?? <Glyph glyph="✓" />)
                    : (icon ?? <Glyph glyph="⧉" />)
            }
            onPress={() => {
                onPress?.();
                // The copy can fail (a denied permission); the button still confirms, as Zag's does.
                Promise.resolve(copy(value)).catch(() => {});
                setCopied(true);
                onCopy?.(value);
                clearTimeout(timer.current);
                timer.current = setTimeout(() => setCopied(false), timeout);
            }}
        />
    );
}
