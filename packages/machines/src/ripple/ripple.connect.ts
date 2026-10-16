import type { Service } from "@zag-js/core";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { parts } from "./ripple.anatomy";
import * as dom from "./ripple.dom";
import type { RippleApi, RippleSchema } from "./ripple.types";

export function connect<T extends PropTypes>(
    service: Service<RippleSchema>,
    normalize: NormalizeProps<T>,
): RippleApi<T> {
    const { scope } = service;
    return {
        getLayerProps() {
            return normalize.element({
                ...parts.layer.attrs,
                id: dom.getLayerId(scope),
                "data-ripple-layer": "",
                "aria-hidden": true,
            });
        },
    };
}
