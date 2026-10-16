// How the web matches each state, checked in Chromium against fixtures. For every state, an
// element marked each allowed way (the native state, an ARIA attribute, or one of pureform's
// `data-pf-*` attributes) takes the state's style, and an element carrying only a behavior
// library's attributes (Zag's `data-state="checked"`, `data-hover`, `data-readonly`, …) does
// not. The selectors come from the shared lowering, as the CSS and Tailwind adapters emit them;
// the Panda adapter must lower each state to the same selector rather than to its own keys.

import { STATE_ATTRIBUTES } from "@pureform/core";
import type { PortableCondition, SlotState } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { conditionKey } from "@pureform/css-lowering";
import type { LowerCtx } from "@pureform/css-lowering";
import { pandaContext } from "@pureform/panda-adapter";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

const config = { tokens: {}, semanticTokens: {} } as unknown as CoreConfig;
const SLOT = { className: "fx", name: "root" };

const cssCtx: LowerCtx = {
    config,
    prefix: undefined,
    target: "css",
    tokenRef: (ref) => `var(--${ref})`,
    slot: SLOT,
};
const pandaCtx: LowerCtx = { ...pandaContext(config), slot: SLOT };

/** An action that puts the element in the state, returning how to undo it. */
type Act = (element: HTMLElement) => Promise<(() => Promise<void>) | void>;

interface Fixture {
    /** How the element is marked. */
    way: string;
    /** Markup whose `.fx` element is styled. */
    html: string;
    act?: Act;
}

const hover: Act = async (element) => {
    await userEvent.hover(element);
    return async () => {
        await userEvent.unhover(element);
    };
};

// Chromium marks a focused button `:active` while Space is held.
const press: Act = async (element) => {
    element.focus();
    await userEvent.keyboard("{ >}");
    return async () => {
        await userEvent.keyboard("{/ }");
        element.blur();
    };
};

const focus =
    (selector?: string): Act =>
    async (element) => {
        const target = selector
            ? element.querySelector<HTMLElement>(selector)!
            : element;
        target.focus();
        return async () => target.blur();
    };

const indeterminate: Act = async (element) => {
    const input = (
        element instanceof HTMLInputElement
            ? element
            : element.querySelector("input")!
    ) as HTMLInputElement;
    input.indeterminate = true;
};

const attr = (state: keyof typeof STATE_ATTRIBUTES) => STATE_ATTRIBUTES[state];

const HOVER: Fixture[] = [
    { way: ":hover", html: `<button class="fx">x</button>`, act: hover },
    { way: attr("hover"), html: `<div class="fx" ${attr("hover")}></div>` },
];
const PRESSED: Fixture[] = [
    { way: ":active", html: `<button class="fx">x</button>`, act: press },
    {
        way: attr("pressed"),
        html: `<button class="fx" ${attr("pressed")}>x</button>`,
    },
];
const SELECTED: Fixture[] = [
    {
        way: "aria-selected",
        html: `<div class="fx" aria-selected="true"></div>`,
    },
    {
        way: "aria-pressed",
        html: `<button class="fx" aria-pressed="true">x</button>`,
    },
    {
        way: "aria-current",
        html: `<a class="fx" href="#" aria-current="page">x</a>`,
    },
];
const FILLED: Fixture[] = [
    {
        way: "an input with a value",
        html: `<input class="fx" placeholder=" " value="x">`,
    },
    {
        way: "containing an input with a value",
        html: `<div class="fx"><input placeholder=" " value="x"></div>`,
    },
    { way: attr("filled"), html: `<div class="fx" ${attr("filled")}></div>` },
];
const CHECKED: Fixture[] = [
    { way: ":checked", html: `<input class="fx" type="checkbox" checked>` },
    {
        way: "aria-checked",
        html: `<div class="fx" role="checkbox" aria-checked="true"></div>`,
    },
];
const EXPANDED: Fixture[] = [
    {
        way: "aria-expanded",
        html: `<button class="fx" aria-expanded="true">x</button>`,
    },
];
const DISABLED: Fixture[] = [
    { way: ":disabled", html: `<button class="fx" disabled>x</button>` },
    {
        way: "aria-disabled",
        html: `<div class="fx" aria-disabled="true"></div>`,
    },
];
const INVALID_ARIA: Fixture[] = [
    { way: "aria-invalid", html: `<input class="fx" aria-invalid="true">` },
];

// Zag's attributes on an element not otherwise in the state.
const ZAG = {
    hover: [`<div class="fx" data-hover></div>`],
    pressed: [`<button class="fx" data-active data-pressed>x</button>`],
    focus: [`<input class="fx" data-focus>`],
    focusVisible: [`<input class="fx" data-focus-visible>`],
    focusWithin: [`<div class="fx" data-focus data-focused></div>`],
    dragged: [`<div class="fx" data-dragging></div>`],
    filled: [
        `<div class="fx" data-filled></div>`,
        `<input class="fx" placeholder=" " data-filled>`,
    ],
    checked: [
        `<div class="fx" data-state="checked" data-checked></div>`,
        `<input class="fx" type="checkbox" data-state="checked" data-checked>`,
    ],
    indeterminate: [
        `<div class="fx" data-state="indeterminate" data-indeterminate></div>`,
    ],
    selected: [
        `<div class="fx" data-state="on" data-selected></div>`,
        `<a class="fx" href="#" aria-current="false" data-selected>x</a>`,
    ],
    expanded: [`<button class="fx" data-state="open" data-expanded>x</button>`],
    invalid: [`<input class="fx" data-invalid>`],
    disabled: [`<button class="fx" data-disabled>x</button>`],
    readOnly: [`<input class="fx" data-readonly data-read-only>`],
};

interface Case {
    state: string;
    key: (ctx: LowerCtx) => string;
    matches: Fixture[];
    misses: string[];
}

const condition = (
    state: PortableCondition,
    matches: Fixture[],
    misses: string[],
): Case => ({ state, key: (ctx) => conditionKey(state, ctx), matches, misses });

const slotState = (
    state: SlotState,
    matches: Fixture[],
    misses: string[],
): Case => ({
    state: `slot ${state}`,
    key: (ctx) => conditionKey({ type: "slot", slot: "root", state }, ctx),
    matches,
    misses,
});

const CASES: Case[] = [
    condition("hover", HOVER, ZAG.hover),
    condition("pressed", PRESSED, ZAG.pressed),
    condition("active", PRESSED, ZAG.pressed),
    condition(
        "focus",
        [{ way: ":focus", html: `<input class="fx">`, act: focus() }],
        ZAG.focus,
    ),
    condition(
        "focusVisible",
        [{ way: ":focus-visible", html: `<input class="fx">`, act: focus() }],
        ZAG.focusVisible,
    ),
    condition(
        "dragged",
        [
            {
                way: attr("dragged"),
                html: `<div class="fx" ${attr("dragged")}></div>`,
            },
        ],
        ZAG.dragged,
    ),
    condition("filled", FILLED, ZAG.filled),
    condition("checked", CHECKED, ZAG.checked),
    condition("selected", SELECTED, ZAG.selected),
    condition("expanded", EXPANDED, ZAG.expanded),
    condition(
        "invalid",
        [
            { way: ":invalid", html: `<input class="fx" required>` },
            ...INVALID_ARIA,
        ],
        ZAG.invalid,
    ),
    condition("disabled", DISABLED, ZAG.disabled),
    condition(
        "mirrored",
        [
            {
                way: attr("mirrored"),
                html: `<span class="fx" ${attr("mirrored")}></span>`,
            },
        ],
        [`<span class="fx" data-mirror data-mirrored></span>`],
    ),
    condition(
        "readOnly",
        [
            { way: ":read-only", html: `<input class="fx" readonly>` },
            {
                way: "aria-readonly",
                html: `<input class="fx" aria-readonly="true">`,
            },
        ],
        ZAG.readOnly,
    ),
    slotState("hover", HOVER, ZAG.hover),
    slotState("pressed", PRESSED, ZAG.pressed),
    slotState("selected", SELECTED, ZAG.selected),
    slotState("filled", FILLED, ZAG.filled),
    slotState(
        "checked",
        [
            ...CHECKED,
            {
                way: "containing a checked input",
                html: `<label class="fx"><input type="checkbox" checked></label>`,
            },
        ],
        ZAG.checked,
    ),
    slotState(
        "indeterminate",
        [
            {
                way: ":indeterminate",
                html: `<input class="fx" type="checkbox">`,
                act: indeterminate,
            },
            {
                way: "containing an indeterminate input",
                html: `<label class="fx"><input type="checkbox"></label>`,
                act: indeterminate,
            },
            {
                way: "aria-checked=mixed",
                html: `<div class="fx" role="checkbox" aria-checked="mixed"></div>`,
            },
        ],
        ZAG.indeterminate,
    ),
    slotState(
        "focusWithin",
        [
            {
                way: ":focus-within",
                html: `<div class="fx"><input></div>`,
                act: focus("input"),
            },
        ],
        ZAG.focusWithin,
    ),
    slotState(
        "focusVisibleWithin",
        [
            { way: ":focus-visible", html: `<input class="fx">`, act: focus() },
            {
                way: "containing :focus-visible",
                html: `<div class="fx"><input></div>`,
                act: focus("input"),
            },
        ],
        ZAG.focusVisible,
    ),
    slotState(
        "expanded",
        [
            ...EXPANDED,
            {
                way: "containing aria-expanded",
                html: `<div class="fx"><button aria-expanded="true">x</button></div>`,
            },
        ],
        ZAG.expanded,
    ),
    // A text input's error look waits for the app, so an empty required field doesn't match.
    slotState(
        "invalid",
        [
            ...INVALID_ARIA,
            {
                way: "containing aria-invalid",
                html: `<div class="fx"><input aria-invalid="true"></div>`,
            },
        ],
        [...ZAG.invalid, `<input class="fx" required>`],
    ),
    slotState(
        "disabled",
        [
            ...DISABLED,
            {
                way: "containing a disabled input",
                html: `<div class="fx"><input disabled></div>`,
            },
        ],
        ZAG.disabled,
    ),
];

const REST = "rgb(0, 0, 0)";
const MATCHED = "rgb(0, 128, 0)";

let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

/** Render the markup under a rule for the selector, and return its `.fx` element's color. */
const colorOf = async (
    selector: string,
    html: string,
    act?: Act,
): Promise<string> => {
    const style = document.createElement("style");
    style.textContent = `.fx { color: ${REST}; ${selector} { color: ${MATCHED}; } }`;
    const root = document.createElement("div");
    root.innerHTML = html;
    document.head.append(style);
    document.body.append(root);
    cleanup = () => {
        style.remove();
        root.remove();
    };
    const element = root.querySelector<HTMLElement>(".fx")!;
    const undo = await act?.(element);
    const color = getComputedStyle(element).color;
    await undo?.();
    cleanup();
    cleanup = undefined;
    return color;
};

describe.each(CASES)("$state", ({ key, matches, misses }) => {
    const selector = key(cssCtx);

    it("lowers to the same selector for Panda as for plain CSS", () => {
        expect(key(pandaCtx)).toBe(selector);
    });

    it.each(matches)("matches an element marked by $way", async (fixture) => {
        expect(await colorOf(selector, fixture.html, fixture.act)).toBe(
            MATCHED,
        );
    });

    it.each(misses)("doesn't match %s", async (html) => {
        expect(await colorOf(selector, html)).toBe(REST);
    });
});
