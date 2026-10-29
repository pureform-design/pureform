import { cx } from "./class-names";
import type { ClassValue } from "./class-names";

/** Styling for the decorative ink owned by js-effects. Part merging happens in the binding,
 *  as for rendered parts; geometry and animation remain owned by the ripple renderer. */
export const styleRippleElement = (
    element: HTMLElement,
    input: object,
): void => {
    const props = input as Readonly<Record<string, unknown>>;
    element.className = cx([props.class, props.className] as ClassValue[]);
    if (typeof props.style === "string") element.style.cssText = props.style;
    else if (props.style && typeof props.style === "object") {
        for (const [name, value] of Object.entries(props.style)) {
            if (typeof value !== "string" && typeof value !== "number")
                continue;
            const property = name.startsWith("--")
                ? name
                : name.replace(
                      /[A-Z]/g,
                      (letter) => `-${letter.toLowerCase()}`,
                  );
            const css =
                typeof value === "number" &&
                !CSS.supports(property, String(value))
                    ? `${value}px`
                    : String(value);
            element.style.setProperty(property, css);
        }
    }
    for (const [name, value] of Object.entries(props)) {
        if (
            (typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean") &&
            (name.startsWith("data-") ||
                name.startsWith("aria-") ||
                ["id", "role", "title", "dir", "lang"].includes(name))
        ) {
            element.setAttribute(name, String(value));
        }
    }
};
