// The loading indicator: a `progressbar` with no value, turning and morphing until it's gone.
// No state a user changes, and nothing focus reaches.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";

export const loadingIndicator: ComponentCase = {
    component: "LoadingIndicator",
    props: { "aria-label": "Loading" },
    root: testIds.loadingIndicator.root,
    examples: {
        uncontained: {},
        contained: { variant: "contained" },
        "tertiary contained": { variant: "contained", color: "tertiary" },
    },
};
