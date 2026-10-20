// Zag's toggle group, re-exported so bindings take every machine from one package, behind a
// selectable button group. The group's buttons are toggle buttons whatever the selection mode,
// so every item reports its state with `aria-pressed` (which the button's styles read) and the
// root is a plain `group`: Zag's single mode would make them radios with `aria-checked`.

import {
    connect as zagConnect,
    type Api,
    type Service,
} from "@zag-js/toggle-group";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

export * from "@zag-js/toggle-group";

/** Zag's connect, with the root a `group` and each item a toggle button. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize);
    return {
        ...api,
        getRootProps: () => ({
            ...api.getRootProps(),
            ...normalize.element({ role: "group" }),
        }),
        getItemProps: (props) => ({
            ...api.getItemProps(props),
            ...normalize.button({
                role: undefined,
                "aria-checked": undefined,
                "aria-pressed": api.getItemState(props).pressed,
            }),
        }),
    };
}
