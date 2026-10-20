// The drag handle: a button holding the pill. A press is the app's (a sheet closes), so Enter and
// Space click it; a disabled one is out of the Tab order, as any button.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "./types";
import { byTestId } from "./types";

export const dragHandle: ComponentCase = {
    component: "DragHandle",
    props: { "aria-label": "Close sheet" },
    root: testIds.dragHandle.root,
    examples: {
        horizontal: {},
        vertical: { orientation: "vertical" },
    },
    keyboard: {
        focusable: (host) => byTestId(host, testIds.dragHandle.root),
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
};
