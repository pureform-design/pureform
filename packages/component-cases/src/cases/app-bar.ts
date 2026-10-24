// The app bar: no state of its own and nothing focusable besides what it holds. The suites check
// its markup (axe, server rendering), direction (a mirrored back arrow), and themes, by size, with
// a subtitle, centered, scrolled, collapsed, and holding a search bar.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";

export const appBar: ComponentCase = {
    component: "AppBar",
    props: { headline: "Inbox", leading: "←", mirrorLeading: true },
    root: testIds.appBar.root,
    examples: {
        small: {},
        "with a subtitle": { subtitle: "12 unread", trailing: "⋮" },
        centered: { centered: true, trailing: "⋮" },
        "medium flexible": { size: "mediumFlexible", subtitle: "12 unread" },
        "large flexible": { size: "largeFlexible", trailing: "⋮" },
        scrolled: { scrolled: true },
        "collapsed by its offset": {
            size: "mediumFlexible",
            scrollOffset: 200,
        },
        pinned: {
            size: "largeFlexible",
            scrollBehavior: "pinned",
            scrollOffset: 200,
        },
        "with a search bar": {
            headline: undefined,
            searchBarProps: { "aria-label": "Search mail", placeholder: "Search" },
        },
    },
};
