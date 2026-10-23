// What a story's click spy records, and so what the Actions panel shows: a small plain summary of
// the event. Never the event itself: its `view` is `window`, which the panel would serialize
// whole (see `reaches-window.ts`).

export interface EventSummary {
    readonly type: string;
    readonly key?: string;
    readonly button?: number;
    readonly target?: { readonly role?: string; readonly name?: string };
}

/** The implicit roles of the elements a clicked target usually is. */
const IMPLICIT: Record<string, string> = {
    A: "link",
    BUTTON: "button",
    SELECT: "combobox",
    TEXTAREA: "textbox",
    LI: "listitem",
};

const INPUT_ROLES: Record<string, string> = {
    checkbox: "checkbox",
    radio: "radio",
    range: "slider",
    button: "button",
    submit: "button",
    reset: "button",
};

const roleOf = (el: Element): string | undefined => {
    const explicit = el.getAttribute("role");
    if (explicit) return explicit.split(" ")[0];
    if (el.tagName === "A" && !el.hasAttribute("href")) return undefined;
    if (el.tagName === "INPUT")
        return INPUT_ROLES[(el as HTMLInputElement).type] ?? "textbox";
    return IMPLICIT[el.tagName];
};

const MAX_NAME = 80;

/** The accessible name, roughly: `aria-label`, then `aria-labelledby`'s text, then the text. */
const nameOf = (el: Element): string | undefined => {
    const labelledBy = el
        .getAttribute("aria-labelledby")
        ?.split(/\s+/)
        .map((id) => el.ownerDocument.getElementById(id)?.textContent ?? "")
        .join(" ");
    const name = (
        el.getAttribute("aria-label") ||
        labelledBy ||
        el.textContent ||
        ""
    )
        .replace(/\s+/g, " ")
        .trim();
    return name ? name.slice(0, MAX_NAME) : undefined;
};

/** The element a click is about: the nearest one with a role, or the target itself. */
const targetOf = (event: { target?: unknown; currentTarget?: unknown }) => {
    for (const candidate of [event.currentTarget, event.target]) {
        if (candidate instanceof Element) {
            let el: Element | null = candidate;
            while (el && !roleOf(el)) el = el.parentElement;
            return el ?? candidate;
        }
    }
    return undefined;
};

/** The summary of a DOM event, a React synthetic event or a React Native press event. */
export const summarizeEvent = (event: unknown): EventSummary => {
    if (!event || typeof event !== "object") return { type: String(event) };
    const e = event as {
        type?: unknown;
        key?: unknown;
        button?: unknown;
        target?: unknown;
        currentTarget?: unknown;
    };
    const target = targetOf(e);
    const role = target && roleOf(target);
    const name = target && nameOf(target);
    return {
        type: typeof e.type === "string" ? e.type : "press",
        ...(typeof e.key === "string" ? { key: e.key } : {}),
        ...(typeof e.button === "number" ? { button: e.button } : {}),
        ...(target
            ? {
                  target: {
                      ...(role ? { role } : {}),
                      ...(name ? { name } : {}),
                  },
              }
            : {}),
    };
};
