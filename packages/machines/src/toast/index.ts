// Zag's toast, with the icon pureform's toast draws: `anatomy` adds the `icon` part, and `connect`
// adds `getIconProps`. Everything else, the store, the group machine and the toast machine, is
// Zag's, unchanged.

import * as zag from "@zag-js/toast";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

export * from "@zag-js/toast";

/** Zag's toast parts and the icon: `group`, `root`, `title`, `description`, `actionTrigger`,
 *  `closeTrigger`, `icon`. */
export const anatomy = zag.anatomy.extendWith("icon");
const parts = anatomy.build();

/** Zag's toast API and the icon's props. */
export interface Api<T extends PropTypes = PropTypes> extends zag.Api<T> {
    /** The icon: decorative, with the toast's `data-type`. */
    getIconProps: () => T["element"];
}

/** Zag's `connect`, with `getIconProps`. */
export function connect<T extends PropTypes>(
    service: zag.Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zag.connect(service, normalize);
    return {
        ...api,
        getIconProps() {
            return normalize.element({
                ...parts.icon.attrs,
                "aria-hidden": true,
                "data-type": api.type,
            });
        },
    };
}
