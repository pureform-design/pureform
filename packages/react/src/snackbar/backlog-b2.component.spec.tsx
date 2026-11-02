import type { ComponentProps } from "react";
import { expect, it } from "vitest";

import { Snackbar } from ".";

it("types the ready-made and composed Snackbar source routes", () => {
    const slots: NonNullable<ComponentProps<typeof Snackbar>["slotProps"]> = {
        action: { interactionSource: undefined },
    };
    const composed: ComponentProps<typeof Snackbar.Action> = {
        interactionSource: undefined,
    };
    expect(slots).toHaveProperty("action");
    expect(composed).toHaveProperty("interactionSource");
});
