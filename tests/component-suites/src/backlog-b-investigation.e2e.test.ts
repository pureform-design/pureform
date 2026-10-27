// Investigation-only characterizations of B1/B2/B8/B9. These assert what happens today,
// not the desired future API or screen-reader behavior. No production changes accompany them.
import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { harness } from "#binding";

describe("backlog B investigation", () => {
    it.each(["ListItem", "Slider"] as const)(
        "B1: records focus outline and clipping for %s",
        async (component) => {
            const mounted = harness.mount({
                component,
                props:
                    component === "ListItem"
                        ? {
                              headline: "Inbox",
                              as: "button",
                              swipeAction: "Delete",
                          }
                        : { "aria-label": "Volume", defaultValue: 40 },
            });
            await harness.settle();
            const focused = mounted.host.querySelector<HTMLElement>(
                component === "ListItem" ? "button" : '[role="slider"]',
            )!;
            await userEvent.keyboard("{Tab}");
            expect(document.activeElement).toBe(focused);
            const style = getComputedStyle(focused);
            const clips: string[] = [];
            for (
                let parent = focused.parentElement;
                parent && parent !== document.body;
                parent = parent.parentElement
            ) {
                const css = getComputedStyle(parent);
                if (
                    [css.overflowX, css.overflowY].some(
                        (value) => value === "hidden" || value === "clip",
                    )
                )
                    clips.push(parent.dataset.testid ?? parent.tagName);
            }
            expect(style.outlineStyle).toBe("solid");
            expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
            expect(clips).toEqual(
                component === "ListItem" ? [testIds.listItem.frame] : [],
            );
        },
    );

    it("B1: the swipeable row ring is inset rather than clipped away", async () => {
        const mounted = harness.mount({
            component: "ListItem",
            props: { headline: "Inbox", as: "button", swipeAction: "Delete" },
        });
        await harness.settle();
        await userEvent.keyboard("{Tab}");
        const focused = mounted.host.querySelector("button")!;
        expect(document.activeElement).toBe(focused);
        const style = getComputedStyle(focused);
        const frame = mounted.host
            .querySelector(`[data-testid="${testIds.listItem.frame}"]`)!
            .getBoundingClientRect();
        const root = focused.getBoundingClientRect();
        // The preset deliberately insets the ring by its thickness, keeping it within the frame.
        expect(style.outlineWidth).toBe("3px");
        expect(style.outlineOffset).toBe("-3px");
        expect(
            parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth),
        ).toBe(0);
        expect(root.top).toBeCloseTo(frame.top, 0);
        expect(root.height).toBeCloseTo(frame.height, 0);
    });

    it("B2: web ready-made slotProps can forward independent sources at runtime", async () => {
        const [action, close] = harness.sources(2);
        const seen: string[][] = [[], []];
        const stops = [action!, close!].map((source, index) =>
            source.subscribe((event) => seen[index]!.push(event.type)),
        );
        try {
            const mounted = harness.mount({
                component: "Snackbar",
                props: {
                    open: true,
                    duration: 0,
                    supportingText: "Saved",
                    action: "Undo",
                    closeLabel: "Dismiss",
                    slotProps: {
                        action: { interactionSource: action },
                        close: { interactionSource: close },
                    },
                },
            });
            await harness.settle();
            await userEvent.click(
                mounted.host.querySelector<HTMLElement>(
                    `[data-testid="${testIds.snackbar.action}"]`,
                )!,
            );
            expect(seen[0]).toContain("press");
            expect(seen[0]).toContain("release");
            expect(seen[1]).not.toContain("press");
            await userEvent.click(
                mounted.host.querySelector<HTMLElement>(
                    `[data-testid="${testIds.snackbar.close}"]`,
                )!,
            );
            expect(seen[1]).toContain("press");
        } finally {
            for (const stop of stops) stop();
        }
    });

    it("B8: reopening an identical Snackbar changes visibility, not message content", async () => {
        const mounted = harness.mount({
            component: "Snackbar",
            props: { open: false, supportingText: "Saved", duration: 0 },
        });
        await harness.settle();
        const region =
            mounted.host.querySelector<HTMLElement>('[role="status"]')!;
        const message = region.querySelector(
            `[data-testid="${testIds.snackbar.supportingText}"]`,
        )!;
        expect(region.hidden).toBe(true);
        expect(message.textContent).toBe("Saved");
        const records: MutationRecord[] = [];
        const observer = new MutationObserver((changes) =>
            records.push(...changes),
        );
        observer.observe(message, {
            subtree: true,
            childList: true,
            characterData: true,
        });
        try {
            await mounted.update({ open: true });
            expect(region.hidden).toBe(false);
            await mounted.update({ open: false });
            await mounted.update({ open: true });
            expect(mounted.host.querySelector('[role="status"]')).toBe(region);
            expect(records).toHaveLength(0);
        } finally {
            observer.disconnect();
        }
    });

    it("B9: a click-only activation runs Button onClick but emits no press/release", async () => {
        const [source] = harness.sources(1);
        const seen: string[] = [];
        let clicks = 0;
        const stop = source!.subscribe((event) => seen.push(event.type));
        try {
            const mounted = harness.mount({
                component: "Button",
                props: {
                    children: "Save",
                    interactionSource: source,
                    onClick: () => {
                        clicks++;
                    },
                },
            });
            await harness.settle();
            mounted.host.querySelector("button")!.click();
            await harness.settle();
            expect(clicks).toBe(1);
            expect(seen).not.toContain("press");
            expect(seen).not.toContain("release");
        } finally {
            stop();
        }
    });
});
