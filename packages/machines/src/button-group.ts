// Zag's toggle group, re-exported so bindings take every machine from one package, behind a
// selectable button group. The group's buttons are toggle buttons whatever the selection mode,
// so every item reports its state with `aria-pressed` (which the button's styles read) and the
// root is a plain `group`: Zag's single mode would make them radios with `aria-checked`. The arrow
// keys follow the direction.

import {
    connect as zagConnect,
    type Api,
    type Service,
} from "@zag-js/toggle-group";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { chainProps } from "./interaction";

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
        getItemProps: (props) => {
            const own = chainProps(
                normalize.button({
                    // Zag reads the arrows physically; under right to left, the left arrow moves
                    // on to the next button and the right one back, so its own handler stops.
                    onKeyDown(event) {
                        if (service.prop("dir") !== "rtl") return;
                        if (api.getItemState(props).disabled) return;
                        const next = { ArrowLeft: true, ArrowRight: false }[
                            event.key
                        ];
                        if (next === undefined || event.defaultPrevented)
                            return;
                        event.preventDefault();
                        service.send({
                            type: next
                                ? "TOGGLE.FOCUS_NEXT"
                                : "TOGGLE.FOCUS_PREV",
                        });
                    },
                }),
                api.getItemProps(props),
            ) as Record<string, unknown>;
            delete own.role;
            delete own["aria-checked"];
            return {
                ...own,
                ...normalize.button({
                    "aria-pressed": api.getItemState(props).pressed,
                }),
            } as ReturnType<Api<T>["getItemProps"]>;
        },
    };
}
