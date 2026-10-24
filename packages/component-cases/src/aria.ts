// Renderer-neutral readers: the state a component shows to assistive technology, read the same
// way from a web binding's DOM and from React Native Web's. They read roles (explicit, or the
// implicit role of a native element), ARIA states (an explicit `aria-*`, or a native element's
// implicit one: a checkbox input's checked state is its `aria-checked`), accessible names, and a
// textbox's value. They never read data attributes, inline styles or test ids below the root,
// which React Native Web draws differently or not at all.

/** The implicit role of a native element, the way the accessibility tree maps it. */
const implicitRole = (element: Element): string | null => {
    const tag = element.tagName.toLowerCase();
    if (tag === "button") return "button";
    if (tag === "a" && element.hasAttribute("href")) return "link";
    if (tag === "textarea") return "textbox";
    if (tag === "select") {
        return element.hasAttribute("multiple") ? "listbox" : "combobox";
    }
    if (tag === "input") {
        const type = (element.getAttribute("type") ?? "text").toLowerCase();
        if (type === "hidden") return null;
        if (type === "checkbox") return "checkbox";
        if (type === "radio") return "radio";
        if (type === "range") return "slider";
        if (type === "number") return "spinbutton";
        if (type === "button" || type === "submit" || type === "reset") {
            return "button";
        }
        if (type === "search") return "searchbox";
        return "textbox";
    }
    return null;
};

/** The element's role: its `role` attribute's first token, or its native element's. */
export const roleOf = (element: Element): string | null =>
    element.getAttribute("role")?.trim().split(/\s+/)[0] ||
    implicitRole(element);

const textOf = (element: Element | null | undefined): string =>
    (element?.textContent ?? "").replace(/\s+/g, " ").trim();

/** The element's accessible name, as far as the cases need it: `aria-label`,
 *  `aria-labelledby`'s text, a native control's `<label>`, or its own text. */
export const nameOf = (element: Element): string => {
    const label = element.getAttribute("aria-label");
    if (label) return label.trim();
    const by = element.getAttribute("aria-labelledby");
    if (by) {
        const doc = element.ownerDocument;
        const text = by
            .split(/\s+/)
            .map((id) => textOf(doc.getElementById(id)))
            .filter(Boolean)
            .join(" ");
        if (text) return text;
    }
    if (element.id) {
        const labelled = element.ownerDocument.querySelector(
            `label[for="${CSS.escape(element.id)}"]`,
        );
        if (labelled) return textOf(labelled);
    }
    const wrapping = element.closest("label");
    if (wrapping) return textOf(wrapping);
    return textOf(element);
};

export interface RoleQuery {
    /** The accessible name: exactly this string, or matching this pattern. */
    readonly name?: string | RegExp | undefined;
}

const named = (element: Element, name: RoleQuery["name"]) =>
    name === undefined ||
    (typeof name === "string"
        ? nameOf(element) === name
        : name.test(nameOf(element)));

/** Whether assistive technology skips the element: it, or what holds it, is `aria-hidden`. */
const ariaHidden = (element: Element) =>
    element.closest('[aria-hidden="true"]') !== null;

/** Every element inside `host` (and `host` itself) with the role, in document order, leaving
 *  out those hidden from assistive technology (`aria-hidden`: a select's native element). */
export const allByRole = <E extends HTMLElement = HTMLElement>(
    host: HTMLElement,
    role: string,
    query: RoleQuery = {},
): E[] =>
    [host, ...host.querySelectorAll<HTMLElement>("*")].filter(
        (element) =>
            roleOf(element) === role &&
            !ariaHidden(element) &&
            named(element, query.name),
    ) as E[];

/** The roles a list's choice has: a listbox's option, or a menu's item (React Native's select
 *  lists its options in a menu). */
export const CHOICE_ROLES = [
    "option",
    "menuitemradio",
    "menuitemcheckbox",
    "menuitem",
] as const;

/** The choice with this name, anywhere in `host`'s document (a list can open at the end of the
 *  body). */
export const choiceNamed = (host: HTMLElement, name: string): HTMLElement => {
    const found = CHOICE_ROLES.flatMap((role) =>
        allByRole(host.ownerDocument.body, role, { name }),
    );
    if (found.length !== 1) {
        throw new Error(`${found.length} choices named ${name}`);
    }
    return found[0]!;
};

/** The one element inside `host` with the role (and name), throwing if there's none or more. */
export const byRole = <E extends HTMLElement = HTMLElement>(
    host: HTMLElement,
    role: string,
    query: RoleQuery = {},
): E => {
    const found = allByRole<E>(host, role, query);
    const what = `role="${role}"${query.name === undefined ? "" : ` named ${String(query.name)}`}`;
    if (found.length === 0) throw new Error(`no element with ${what}`);
    if (found.length > 1) {
        throw new Error(`${found.length} elements with ${what}`);
    }
    return found[0]!;
};

const isNativeToggle = (element: Element): element is HTMLInputElement =>
    element.tagName === "INPUT" &&
    ["checkbox", "radio"].includes((element as HTMLInputElement).type);

/** `aria-checked`, explicit or a native checkbox's or radio's: `true`, `false` or `"mixed"`. */
export const checkedOf = (element: Element): boolean | "mixed" => {
    const value = element.getAttribute("aria-checked");
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "mixed") return "mixed";
    if (isNativeToggle(element)) {
        return element.indeterminate ? "mixed" : element.checked;
    }
    throw new Error(`aria-checked is ${String(value)}`);
};

/** A `true`/`false` ARIA state that the element must have (`aria-pressed`, `aria-selected`,
 *  `aria-expanded`). */
export const flagOf = (
    element: Element,
    state: "pressed" | "selected" | "expanded",
): boolean => {
    const value = element.getAttribute(`aria-${state}`);
    if (value === "true") return true;
    if (value === "false") return false;
    throw new Error(`aria-${state} is ${String(value)}`);
};

/** A `true`/`false` ARIA state where its absence means `false`. */
export const optionalFlagOf = (
    element: Element,
    state: "pressed" | "selected" | "expanded" | "current",
): boolean => {
    const value = element.getAttribute(`aria-${state}`);
    return value !== null && value !== "false";
};

/** Whether the element is disabled to assistive technology: `aria-disabled` or a native
 *  `disabled`. */
export const disabledOf = (element: Element): boolean =>
    element.getAttribute("aria-disabled") === "true" ||
    element.hasAttribute("disabled");

/** `aria-valuenow`, explicit or a native range or number input's value. */
export const valueNowOf = (element: Element): number => {
    const now = element.getAttribute("aria-valuenow");
    if (now !== null && now !== "") return Number(now);
    const tag = element.tagName;
    if (tag === "INPUT") return Number((element as HTMLInputElement).value);
    throw new Error(`aria-valuenow is ${String(now)}`);
};

/** A textbox's (or combobox's, spinbutton's) value: the text in it. */
export const textValueOf = (element: Element): string => {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        return (element as HTMLInputElement).value;
    }
    return textOf(element);
};
