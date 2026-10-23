// The fade through: content the app switches by `value`. At rest it's the one page it shows, which
// the suites check like any static component (markup, direction, server rendering); its motion
// has its own suite (`fade-through.e2e.test.ts`). It draws no color of its own.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";

export const fadeThrough: ComponentCase = {
    component: "FadeThrough",
    props: { value: "home", children: "Home" },
    root: testIds.fadeThrough.root,
    examples: {
        page: {},
        "numeric value": { value: 2, children: "Second" },
    },
    themed: false,
};
