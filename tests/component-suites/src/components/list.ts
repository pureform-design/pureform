// The list item and the list: no state of their own. A list item is a row, a link (`href`), or a
// button (`as="button"`), which Enter clicks; the list is a `<ul>` of them, each in an `<li>`.

import { compositeTestIds, testIds } from "@pureform/anatomy";

import type { ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = testIds.listItem;

const root = (host: HTMLElement) => byTestId(host, ids.root);

export const listItem: ComponentCase = {
    component: "ListItem",
    props: { headline: "Inbox", as: "button" },
    root: ids.root,
    examples: {
        "one line": {},
        "two lines": { supportingText: "3 new messages", leading: "✉" },
        "three lines": {
            overline: "Mail",
            supportingText: "3 new messages",
            leading: "✉",
            trailingText: "3",
        },
        "with a mirrored trailing icon": {
            trailing: "→",
            mirrorTrailing: true,
        },
        selected: { selected: true, leading: "✉" },
        "selected, secondary color": { selected: true, color: "secondary" },
        compact: { density: "compact", supportingText: "3 new messages" },
        link: { as: undefined, href: "#inbox", selected: true },
        "not interactive": { as: undefined, supportingText: "Read only" },
        disabled: { disabled: true, leading: "✉" },
    },
    keyboard: {
        focusable: root,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
};

const ITEMS = [
    {
        headline: "Inbox",
        supportingText: "3 new",
        href: "#inbox",
        leading: "✉",
    },
    { headline: "Sent", href: "#sent", leading: "➤", mirrorLeading: true },
    { headline: "Drafts", href: "#drafts", selected: true, trailingText: "2" },
];

const links = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLElement>(`[data-testid="${ids.root}"]`),
];

export const list: ComponentCase = {
    component: "List",
    props: { "aria-label": "Mailboxes", items: ITEMS },
    root: compositeTestIds.list.root,
    examples: {
        links: {},
        "secondary color, compact": { color: "secondary", density: "compact" },
        "not interactive": {
            items: [
                { headline: "Inbox", supportingText: "3 new" },
                { headline: "Sent" },
            ],
        },
    },
    keyboard: {
        focusable: (host) => links(host)[0]!,
        disables: false,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "nothing" },
        ],
    },
};
