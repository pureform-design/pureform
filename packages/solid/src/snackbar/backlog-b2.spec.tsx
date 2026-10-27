import type { ComponentProps } from "solid-js";
import { expect, it } from "vitest";

import { Snackbar } from ".";

it("B2: the web runtime slot route is not represented in ready-made Snackbar types", () => {
    const slots: NonNullable<ComponentProps<typeof Snackbar>["slotProps"]> = {
        // @ts-expect-error Ready-made slots expose element props, not SnackbarButtonProps.
        action: { interactionSource: undefined },
    };
    const composed: ComponentProps<typeof Snackbar.Action> = {
        interactionSource: undefined,
    };
    expect(slots).toHaveProperty("action");
    expect(composed).toHaveProperty("interactionSource");
});
