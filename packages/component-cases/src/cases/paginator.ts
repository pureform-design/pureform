// The paginator: a range label, a page-size select, and first, previous, next and last buttons.
// Its `page` is shown by the range label ("11 – 20 of 95", read back as a page number); the next
// button steps it. The keyboard case hides the page-size select, so Tab reaches the next button
// first (the select has its own suite). Its triggers are icon buttons and its select the select, so
// the paginator has no indication of its own. The row sits at the inline end, which the direction
// suite mirrors.

import { testIds } from "@pureform/anatomy";

import { byRole, disabledOf, roleOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.paginator;

const PAGE_SIZE = 10;

/** A trigger's button: the part itself, or the button inside it (React Native wraps it). */
const button = (host: HTMLElement, id: string): HTMLElement => {
    const part = byTestId(host, id);
    return roleOf(part) === "button" ? part : byRole(part, "button");
};

/** The page the range label's text shows, checked against the buttons (`aria-disabled` or
 *  `disabled`): the first page has no previous
 *  button, the last no next. */
const read = (host: HTMLElement): number => {
    const label = byTestId(host, ids.rangeLabel).textContent ?? "";
    const start = Number(/^(\d+)\s–/.exec(label)?.[1]);
    if (Number.isNaN(start)) throw new Error(`range label is "${label}"`);
    const page = Math.floor((start - 1) / PAGE_SIZE) + 1;
    const prev = disabledOf(button(host, ids.prevTrigger));
    if (prev !== (page === 1)) {
        throw new Error(`previous is ${prev ? "" : "not "}disabled`);
    }
    return page;
};

export const paginator: ComponentCase = {
    component: "Paginator",
    props: { count: 95, hidePageSize: true },
    root: ids.root,
    examples: {
        "with the page size": { hidePageSize: false },
        "with first and last": {
            hidePageSize: false,
            showFirstLastButtons: true,
            defaultPage: 4,
        },
        "the last page": { defaultPage: 10, showFirstLastButtons: true },
        "page size options": {
            hidePageSize: false,
            pageSizeOptions: [5, 10, 20],
            defaultPageSize: 5,
        },
        "no items": { count: 0, hidePageSize: false },
        disabled: {
            disabled: true,
            hidePageSize: false,
            showFirstLastButtons: true,
        },
    },
    state: {
        prop: "page",
        from: 1,
        to: 2,
        props: { defaultPageSize: PAGE_SIZE },
        act: async (host, options: ActOptions = {}) => {
            await userEvent.click(button(host, ids.nextTrigger), options);
        },
        read,
    },
    keyboard: {
        focusable: (host) => button(host, ids.nextTrigger),
        keys: [
            { key: "{Enter}", does: "change" },
            { key: " ", does: "change" },
        ],
    },
};
