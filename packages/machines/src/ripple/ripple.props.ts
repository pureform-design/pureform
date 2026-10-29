import { createProps } from "@zag-js/types";
import { createSplitProps } from "@zag-js/utils";

import type { RippleProps } from "./ripple.types";

export const props = createProps<RippleProps>()([
    "allowPropagation",
    "centered",
    "color",
    "disabled",
    "decorateElement",
    "getRootNode",
    "getSurfaceEl",
    "id",
    "ids",
    "reducedMotion",
    "rippleClass",
    "sparkle",
    "timing",
    "variant",
]);

export const splitProps = createSplitProps<Partial<RippleProps>>(props);
