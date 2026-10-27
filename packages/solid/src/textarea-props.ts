import { isServer } from "@solidjs/web";

/** HTML parsing discards the first LF immediately after <textarea>. Solid's dynamic server
 *  renderer does not compensate, so add that LF only to server props, never to live values.
 *  Shared by plain Textarea and styled TextArea. React's server renderer already compensates;
 *  Native TextInput does not pass through the HTML parser. */
export const textareaServerProps = <
    T extends Readonly<Record<string, unknown>>,
>(
    attributes: T,
): T =>
    isServer &&
    typeof attributes.value === "string" &&
    attributes.value.startsWith("\n")
        ? { ...attributes, value: `\n${attributes.value}` }
        : attributes;
