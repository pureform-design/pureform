import { testIds } from "@pureform/anatomy";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { harness } from "#binding";

it("shows the Slider value indicator on keyboard focus, updates it and hides on blur", async () => {
    const mounted = harness.mount({
        component: "Slider",
        props: {
            valueIndicator: true,
            defaultValue: [40],
            "aria-label": "Volume",
        },
    });
    await harness.settle();
    const indicator = mounted.host.querySelector<HTMLElement>(
        `[data-testid="${testIds.slider.valueIndicator}"]`,
    )!;
    const handle = mounted.host.querySelector<HTMLElement>('[role="slider"]')!;
    expect(getComputedStyle(indicator).display).toBe("none");
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(handle);
    await harness.settle();
    expect(getComputedStyle(indicator).display).not.toBe("none");
    await userEvent.keyboard("{ArrowRight}");
    await harness.settle();
    expect(indicator.textContent).toContain("41");
    handle.blur();
    await harness.settle();
    expect(getComputedStyle(indicator).display).toBe("none");
});
