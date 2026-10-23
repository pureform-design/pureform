// The copy button's contract, shared by every binding. It's an icon button (`icon-button.ts`,
// drawn by the `iconButton` preset: Material 3 has no copy button) that copies `value` when
// pressed and shows it did: the icon swaps for a check and the accessible name for `copiedLabel`
// for `timeout` ms, and a polite live region announces `copiedLabel`. A write the platform denies
// shows nothing and calls `onCopyError`. On the web it runs Zag's clipboard machine beside the
// button machine; React Native copies through the app's `copy` function.

import type { IconButtonVariantProps } from "./icon-button";

/** What the copy button takes besides the icon button's variants and Root's own props. */
export interface CopyButtonBehaviorProps {
    /** The text to copy. */
    readonly value: string;
    /** How long it shows as copied, in ms. @default 3000 */
    readonly timeout?: number | undefined;
    /** Called once the value is copied. Show a snackbar from here. */
    readonly onCopy?: ((value: string) => void) | undefined;
    /** Called when the platform denies the write; the button doesn't show it copied. */
    readonly onCopyError?:
        | ((details: { value: string; error: Error }) => void)
        | undefined;
    /** The accessible name while idle. @default "Copy to clipboard" */
    readonly label?: string | undefined;
    /** The accessible name once copied. @default "Copied to clipboard" */
    readonly copiedLabel?: string | undefined;
}

/** The copy button's variant groups: the icon button's, without the toggle and group ones. */
export type CopyButtonVariantProps = Omit<IconButtonVariantProps, "position">;

/** What the ready-made copy button renders, in the framework's node type. */
export interface CopyButtonContentProps<Node> {
    /** The icon while idle. @default a pair of sheets */
    readonly icon?: Node;
    /** The icon while copied. @default a check */
    readonly copiedIcon?: Node;
}

/** The keys of `CopyButtonBehaviorProps` and `CopyButtonContentProps`, which the copy button keeps
 *  off the icon button. */
export const COPY_BUTTON_OWN_PROPS = [
    "value",
    "timeout",
    "onCopy",
    "onCopyError",
    "label",
    "copiedLabel",
    "icon",
    "copiedIcon",
] as const satisfies readonly (
    | keyof CopyButtonBehaviorProps
    | keyof CopyButtonContentProps<unknown>
)[];

export const COPY_LABEL = "Copy to clipboard";
export const COPIED_LABEL = "Copied to clipboard";

/** The live region that announces the copy: there to be read, not seen. Its keys are the same in
 *  React's and Solid's `style`. */
export const COPY_ANNOUNCEMENT_STYLE = {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    padding: "0",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    border: "0",
} as const;

/** The live region's text: `copiedLabel` while copied, else nothing. */
export const copyAnnouncement = (
    props: Pick<CopyButtonBehaviorProps, "copiedLabel">,
    copied: boolean,
): string => (copied ? (props.copiedLabel ?? COPIED_LABEL) : "");

/** The clipboard machine's props from the copy button's: the value, the timeout, the names,
 *  `onCopy` once copied and `onCopyError` when the write is denied. */
export const copyButtonMachineProps = (props: CopyButtonBehaviorProps) => ({
    value: props.value,
    timeout: props.timeout,
    translations: {
        triggerLabel: (copied: boolean) =>
            copied
                ? (props.copiedLabel ?? COPIED_LABEL)
                : (props.label ?? COPY_LABEL),
    },
    onStatusChange: ({ copied }: { copied: boolean }) => {
        if (copied) props.onCopy?.(props.value);
    },
    onCopyError: (details: { value: string; error: Error }) =>
        props.onCopyError?.(details),
});
