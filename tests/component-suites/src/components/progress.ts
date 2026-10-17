// The linear and circular progress indicators: no state a user changes, and nothing focus
// reaches. Each is a `progressbar` with its value, or indeterminate without one.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "./types";

const examples = {
    "40 percent": {},
    empty: { value: 0 },
    full: { value: 100 },
    "3 from 1 to 5": { value: 3, min: 1, max: 5 },
    "unknown amount": { value: null },
    indeterminate: { indeterminate: true },
    "secondary color": { color: "secondary" },
};

export const linearProgress: ComponentCase = {
    component: "LinearProgress",
    props: { "aria-label": "Uploading", value: 40 },
    root: testIds.linearProgress.root,
    examples,
};

export const circularProgress: ComponentCase = {
    component: "CircularProgress",
    props: { "aria-label": "Loading", value: 40 },
    root: testIds.circularProgress.root,
    examples: { ...examples, "75 percent": { value: 75 } },
};
