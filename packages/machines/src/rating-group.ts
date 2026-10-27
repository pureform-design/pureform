// Zag's rating group, re-exported so bindings take every machine from one package, with
// pureform's form rules on its machine: the browser's fieldset rule around the hidden input, and
// no reset of its own (the bindings own it; Zag's would reset during the `reset` event). Its
// anatomy has the preset's parts: each item draws the empty `icon`, and the `fill` and `halfFill`
// stars the binding lays over it (drawn only). Its connect leaves all stars unchecked at zero.

import {
    connect as zagConnect,
    machine as zagMachine,
    anatomy as zagAnatomy,
    type Api,
    type Machine,
    type Service,
} from "@zag-js/rating-group";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { withFieldsetRule, zagElement } from "./zag-form";

export * from "@zag-js/rating-group";

export const anatomy = zagAnatomy.extendWith("icon", "fill", "halfFill");
export const parts = anatomy.build();

/** Zag's rating group machine, with pureform's fieldset rule and no reset of its own. */
export const machine: Machine = withFieldsetRule(
    zagMachine,
    zagElement("hiddenInput", (id) => `rating:${id}:input`),
);

/** Zero is unrated, not one checked star; the first star remains a keyboard entry point. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service, normalize);
    return {
        ...api,
        getItemProps: (props) => ({
            ...api.getItemProps(props),
            ...(api.value <= 0
                ? normalize.element({ "aria-checked": false })
                : {}),
        }),
    };
}
