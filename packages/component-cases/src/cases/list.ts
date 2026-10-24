// The list item and the list: no state of their own. A list item is a row, a link (`href`), or a
// button (`as="button"`), which Enter clicks; the list is a `<ul>` of them, each in an `<li>`.

import { listAnatomy, listItemAnatomy, testIds } from "@pureform/anatomy";

import { flagOf } from "../aria";
import type { ComponentCase } from "../types";
import { byTestId, ownSource } from "../types";
import { userEvent } from "../user-event";

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
        avatar: {
            leading: "A",
            leadingType: "avatar",
            lines: "two",
            supportingText: "Ada",
        },
        video: {
            leading: "▶",
            leadingType: "video",
            lines: "three",
            supportingText: "Clip",
        },
        "first of a segmented run": { position: "first", leading: "✉" },
        "with a mirrored trailing icon": {
            trailing: "→",
            mirrorTrailing: true,
        },
        selected: { selected: true, leading: "✉" },
        "selected, secondary color": { selected: true, color: "secondary" },
        compact: { density: "compact", supportingText: "3 new messages" },
        link: { as: undefined, href: "#inbox", selected: true },
        "not interactive": { as: undefined, supportingText: "Read only" },
        swipeable: { as: undefined, leading: "✉", swipeAction: "Delete" },
        "swipeable, revealed": {
            as: undefined,
            leading: "✉",
            swipeAction: "Delete",
            defaultRevealed: true,
        },
        "swipeable, destructive, revealed": {
            as: undefined,
            leading: "✉",
            swipeAction: "Delete",
            actionColor: "error",
            defaultRevealed: true,
        },
        disabled: { disabled: true, leading: "✉" },
    },
    keyboard: {
        focusable: root,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
    indication: ownSource(listItemAnatomy),
};

/** Whether an expandable item is expanded: its row's `aria-expanded`. */
const readExpanded = (host: HTMLElement): boolean =>
    flagOf(root(host), "expanded");

/** An expandable list item: the accordion's behaviour for one item. `expanded`, by a click on the
 *  row, which Enter and Space toggle too. */
export const expandableListItem: ComponentCase = {
    component: "ListItem",
    props: { headline: "Folders", region: "Work, Personal" },
    root: ids.root,
    examples: {
        collapsed: {},
        expanded: { defaultExpanded: true },
        "two lines, expanded": {
            defaultExpanded: true,
            supportingText: "2 folders",
            leading: "▤",
        },
        "swipeable, revealed": {
            swipeAction: "Delete",
            defaultRevealed: true,
        },
    },
    state: {
        prop: "expanded",
        from: false,
        to: true,
        act: async (host, options = {}) => {
            await userEvent.click(root(host), options);
        },
        read: readExpanded,
    },
    keyboard: {
        focusable: root,
        keys: [
            { key: "{Enter}", does: "change", to: true },
            { key: " ", does: "change", to: true },
        ],
    },
    indication: ownSource(listItemAnatomy),
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
    root: listAnatomy.parts.root.testId,
    examples: {
        links: {},
        segmented: { variant: "segmented" },
        "segmented, thumbnails": {
            variant: "segmented",
            leadingType: "thumbnail",
        },
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
