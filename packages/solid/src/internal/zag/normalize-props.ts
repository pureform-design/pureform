// Turns Zag's React-shaped part props into Solid 2's: its event names, lowercase attribute
// names, and hyphenated style keys. Ported from @zag-js/solid 1.46.0 (MIT) to Solid 2.

import type { JSX } from "@solidjs/web";
import { createNormalizer } from "@zag-js/types";
import { isNumber, isObject, isString } from "@zag-js/utils";

// `element` is any element, so its props fit any of them, as in Zag's own adapters.
export type PropTypes = JSX.IntrinsicElements & {
    element: JSX.HTMLAttributes<any>;
    style: JSX.CSSProperties;
};

type Dict = Record<string, unknown>;

const RENAMED: Record<string, string> = {
    // Solid's focus events are the bubbling ones, and its `onInput` is React's `onChange`.
    onFocus: "onFocusIn",
    onBlur: "onFocusOut",
    onDoubleClick: "onDblClick",
    onChange: "onInput",
    // Zag passes the current state in these, for the framework to keep the element in step.
    defaultChecked: "checked",
    defaultValue: "value",
    htmlFor: "for",
    className: "class",
    // Solid 2 names attributes as HTML does, in lower case.
    tabIndex: "tabindex",
    readOnly: "readonly",
    autoComplete: "autocomplete",
    autoCorrect: "autocorrect",
    autoCapitalize: "autocapitalize",
    autoFocus: "autofocus",
    spellCheck: "spellcheck",
    maxLength: "maxlength",
    minLength: "minlength",
    inputMode: "inputmode",
    enterKeyHint: "enterkeyhint",
    contentEditable: "contenteditable",
    dateTime: "datetime",
    crossOrigin: "crossorigin",
    referrerPolicy: "referrerpolicy",
    accessKey: "accesskey",
};

export const normalizeProps = createNormalizer<PropTypes>((props: Dict) => {
    const normalized: Dict = {};
    for (const key in props) {
        const value = props[key];
        if (key === "readOnly" && value === false) continue;
        if (key === "style" && isObject(value)) {
            normalized["style"] = cssify(value as Dict);
            continue;
        }
        // Solid 2 writes `true` as an empty attribute, which ARIA reads as unset.
        if (key.startsWith("aria-") && typeof value === "boolean") {
            normalized[key] = String(value);
            continue;
        }
        if (key === "children") {
            if (isString(value)) normalized["textContent"] = value;
            continue;
        }
        normalized[RENAMED[key] ?? key] = value;
    }
    return normalized;
});

const cssify = (style: Dict): Dict => {
    const css: Dict = {};
    for (const property in style) {
        const value = style[property];
        if (!isString(value) && !isNumber(value)) continue;
        css[property.startsWith("--") ? property : hyphenate(property)] = value;
    }
    return css;
};

const hyphenated = new Map<string, string>();

const hyphenate = (name: string): string => {
    let result = hyphenated.get(name);
    if (result === undefined) {
        result = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
        if (result.startsWith("ms-")) result = `-${result}`;
        hyphenated.set(name, result);
    }
    return result;
};
