// Zag's clipboard, re-exported so bindings take every machine from one package. Its copy no longer
// rejects when the browser denies the write: it falls back to selecting a node and `execCommand`,
// and stays quiet if that fails too (the machine still shows the copy, as Zag's does). The copy
// button runs it beside the button machine, for the copying and the `copied` state.

import { machine as zagMachine, type Machine } from "@zag-js/clipboard";
import type { Machine as AnyMachine, Params } from "@zag-js/core";

import type { SchemaOf } from "./interaction";

type ClipboardSchema = SchemaOf<Machine>;

export * from "@zag-js/clipboard";

const selectAndCopy = (doc: Document, text: string): void => {
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
    if (selection) {
        selection.removeAllRanges();
        const range = doc.createRange();
        range.selectNodeContents(node);
        selection.addRange(range);
        doc.execCommand("copy");
        selection.removeAllRanges();
    }
    doc.body.removeChild(node);
};

/** Puts `text` on the clipboard: the async API, then the selection fallback. Never rejects. */
export const copyText = async (doc: Document, text: string): Promise<void> => {
    try {
        const clipboard = (doc.defaultView ?? window).navigator.clipboard;
        if (clipboard?.writeText === undefined) throw new Error("no clipboard");
        await clipboard.writeText(text);
    } catch {
        try {
            if (doc.body) selectAndCopy(doc, text);
        } catch {
            // Nothing else to try.
        }
    }
};

/** Zag's clipboard machine, whose copy never rejects. */
export const machine: AnyMachine<ClipboardSchema> = {
    ...zagMachine,
    implementations: {
        ...zagMachine.implementations,
        actions: {
            ...zagMachine.implementations?.actions,
            copyToClipboard: ({ context, scope }: Params<ClipboardSchema>) => {
                void copyText(scope.getDoc(), context.get("value"));
            },
        },
    },
};
