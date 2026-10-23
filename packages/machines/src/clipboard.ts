// Zag's clipboard, re-exported so bindings take every machine from one package. Its copy no longer
// rejects when the browser denies the write: it falls back to selecting a node and `execCommand`.
// Unlike Zag's, it shows `copied` only once the write went through; a write that fails both ways
// calls `onCopyError` and stays idle. The copy button runs it beside the button machine, for the
// copying and the `copied` state.

import {
    machine as zagMachine,
    type Machine,
    type Props,
} from "@zag-js/clipboard";
import type { Machine as AnyMachine, Params } from "@zag-js/core";

import type { SchemaOf } from "./interaction";

type ClipboardSchema = SchemaOf<Machine>;

export * from "@zag-js/clipboard";

const selectAndCopy = (doc: Document, text: string): boolean => {
    const node = doc.createElement("pre");
    Object.assign(node.style, {
        width: "1px",
        height: "1px",
        position: "fixed",
        top: "5px",
    });
    node.textContent = text;
    doc.body.appendChild(node);
    const selection = doc.defaultView?.getSelection();
    let copied = false;
    if (selection) {
        selection.removeAllRanges();
        const range = doc.createRange();
        range.selectNodeContents(node);
        selection.addRange(range);
        copied = doc.execCommand("copy");
        selection.removeAllRanges();
    }
    doc.body.removeChild(node);
    return copied;
};

/** Puts `text` on the clipboard: the async API, then the selection fallback. Never rejects:
 *  resolves `true` once written, else the error that stopped it. */
export const copyText = async (
    doc: Document,
    text: string,
): Promise<true | Error> => {
    let error: Error;
    try {
        const clipboard = (doc.defaultView ?? window).navigator.clipboard;
        if (clipboard?.writeText === undefined) throw new Error("no clipboard");
        await clipboard.writeText(text);
        return true;
    } catch (cause) {
        error = cause instanceof Error ? cause : new Error(String(cause));
    }
    try {
        if (doc.body && selectAndCopy(doc, text)) return true;
    } catch {
        // Nothing else to try.
    }
    return error;
};

/** What the copy reports when the write fails both ways. */
export interface CopyErrorDetails {
    readonly value: string;
    readonly error: Error;
}

/** The machine's props: Zag's, with `onCopyError`. */
export type CopyMachineProps = Props & {
    readonly onCopyError?: ((details: CopyErrorDetails) => void) | undefined;
};

// A press writes; the write's outcome moves the machine.
const copy = { actions: ["copyToClipboard"] };
const written = { target: "copied", actions: ["invokeOnCopy"] };

/** Zag's clipboard machine, whose copy never rejects and shows `copied` only once written. */
export const machine: AnyMachine<ClipboardSchema> = {
    ...zagMachine,
    on: { ...zagMachine.on, COPY: copy, "COPY.WRITTEN": written },
    states: {
        ...zagMachine.states,
        copied: {
            ...zagMachine.states.copied,
            on: {
                ...zagMachine.states.copied.on,
                COPY: copy,
                "COPY.WRITTEN": written,
            },
        },
    },
    implementations: {
        ...zagMachine.implementations,
        actions: {
            ...zagMachine.implementations?.actions,
            copyToClipboard: ({
                context,
                scope,
                send,
                prop,
            }: Params<ClipboardSchema>) => {
                const value = context.get("value");
                void copyText(scope.getDoc(), value).then((result) => {
                    if (result === true) {
                        send({ type: "COPY.WRITTEN" });
                        return;
                    }
                    const onCopyError = (
                        prop as unknown as (
                            key: "onCopyError",
                        ) => CopyMachineProps["onCopyError"]
                    )("onCopyError");
                    onCopyError?.({ value, error: result });
                });
            },
        },
    },
};
