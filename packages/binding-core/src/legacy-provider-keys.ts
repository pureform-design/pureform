// Provider `slotProps` once keyed a component by the preset's style slots, and now key it by
// anatomy part, as an instance's props are. A key such as `dialog.root` is still a part (the
// unstyled wrapper), so a stale provider isn't an error: this names the keys that changed meaning,
// in development, so they're moved. Each message is for a binding to give once.

import { renamedSlotPart } from "@pureform/anatomy";

/** What a binding says about its platform's parts. */
export interface LegacyProviderKeyOptions {
    /** Whether the platform renders the unstyled wrapper `root` around an overlay (the web does,
     *  React Native doesn't). @default true */
    readonly wrapper?: boolean | undefined;
    /** Components whose old key still means the same on this platform (React Native's tabs have no
     *  wrapper, so their `root` is the list). */
    readonly keeps?: ((component: string) => boolean) | undefined;
}

/** A message for each key of `slotProps` that was a preset slot with another part's name now. */
export const legacyProviderKeyMessages = (
    slotProps: object | undefined,
    options: LegacyProviderKeyOptions = {},
): string[] => {
    const messages: string[] = [];
    const wrapper = options.wrapper ?? true;
    for (const [component, parts] of Object.entries(slotProps ?? {})) {
        if (!parts || options.keeps?.(component)) continue;
        for (const key of Object.keys(parts as object)) {
            const part = renamedSlotPart(component, key);
            if (part === undefined) continue;
            const was = `slotProps.${component}.${key}`;
            const now = `slotProps.${component}.${part}`;
            const note =
                key === "root" && wrapper
                    ? ` \`root\` now addresses the unstyled wrapper around it.`
                    : key === "root"
                      ? " `root` isn't a part on this platform."
                      : ` \`${key}\` now addresses the part of that name.`;
            messages.push(
                `pureform: ${was} used to style the preset's \`${key}\` slot, which is the \`${part}\` part: a provider's slotProps are keyed by part name now, as an instance's are. Move those props to ${now}.${note}`,
            );
        }
    }
    return messages;
};
