import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { harness } from "#binding";

// Shared by React/Solid and CSS/Panda/Tailwind; Native's layout/press path has its own test.
describe.each(["ltr", "rtl"] as const)(
    "Rating half-star geometry (%s)",
    (dir) => {
        it("clips half the star and selects each side of its midpoint", async () => {
        const onValueChange = vi.fn<(details: { value: number }) => void>();
            const mounted = harness.mount({
                component: "Rating",
                provider: { dir },
                props: {
                    allowHalf: true,
                    defaultValue: 2.5,
                    name: "quality",
                    onValueChange,
                },
            });
            await harness.settle();
            const star = mounted.host.querySelectorAll<HTMLElement>(
                `[data-testid="${testIds.rating.item}"]`,
            )[2]!;
            const box = star.getBoundingClientRect();
            const icon = star
                .querySelector<HTMLElement>(
                    `[data-testid="${testIds.rating.icon}"]`,
                )!
                .getBoundingClientRect();
            const half = star
                .querySelector<HTMLElement>(
                    `[data-testid="${testIds.rating.halfFill}"]`,
                )!
                .getBoundingClientRect();
            expect(box.width).toBeGreaterThan(0);
            // The item includes touch padding; only the glyph, not the touch target, is half-filled.
            expect(half.width).toBeCloseTo(icon.width / 2, 0);
            expect(dir === "ltr" ? half.left : half.right).toBeCloseTo(
                dir === "ltr" ? icon.left : icon.right,
                0,
            );
            for (const [fraction, value] of [
                [0.25, 2.5],
                [0.75, 3],
                [0.49, 2.5],
                [0.51, 3],
            ] as const) {
                await mounted.update({ value: 0 });
                const x =
                    box.left +
                    box.width * (dir === "ltr" ? fraction : 1 - fraction);
                const y = box.top + box.height / 2;
                await commands.mouse("move", x, y);
                await commands.mouse("down", x, y);
                await commands.mouse("up", x, y);
                await harness.settle();
                expect(onValueChange).toHaveBeenLastCalledWith(
                    expect.objectContaining({ value }),
                );
            }
        });
    },
);
