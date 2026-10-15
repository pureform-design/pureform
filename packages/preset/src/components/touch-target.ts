// The pureform touch target: an invisible box centered on its parent that grows the hit area to
// the theme's minimum without changing the visible size. Put it first inside a positioned,
// interactive element. Components with a touchTarget slot draw it with the same style.

import { defineComponent } from "@pureform/core";

import { touchTarget as touchTargetStyle } from "./shared";

export const touchTarget = defineComponent({
    name: "touchTarget",
    $meta: {
        description:
            "Grows a small interactive element's hit area to the minimum touch target. Place it inside a positioned element.",
    },
    recipe: { base: touchTargetStyle },
});
