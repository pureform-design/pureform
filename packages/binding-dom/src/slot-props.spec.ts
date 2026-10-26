import { describe, expect, it, vi } from "vitest";

import { resolveWebSlotCustomization } from "./slot-props";

describe("resolveWebSlotCustomization", () => {
    it("resolves just the requested part without reading unused instance data", () => {
        const instance = vi.fn<() => never>(() => {
            throw new Error("not needed");
        });
        const other = vi.fn<() => void>();
        const props = { title: "label" };
        expect(
            resolveWebSlotCustomization(
                {
                    slotProps: { label: props, cell: other },
                    class: { label: "caps" },
                    style: { label: { color: "red" } },
                },
                "label",
                instance,
            ),
        ).toEqual({
            props,
            class: "caps",
            style: { color: "red" },
            unstyled: undefined,
        });
        expect(instance).not.toHaveBeenCalled();
        expect(other).not.toHaveBeenCalled();
    });

    it("shares one lazy instance across all function channels", () => {
        const instance = vi.fn<() => { index: number }>(() => ({ index: 2 }));
        const copy = (value: { index: number }) => value.index;
        expect(
            resolveWebSlotCustomization(
                {
                    slotProps: {
                        cell: (value: { index: number }) => ({
                            title: String(copy(value)),
                        }),
                    },
                    class: {
                        cell: (value: { index: number }) =>
                            `cell-${copy(value)}`,
                    },
                    style: {
                        cell: (value: { index: number }) => ({
                            order: copy(value),
                        }),
                    },
                    unstyled: {
                        cell: (value: { index: number }) => copy(value) === 2,
                    },
                },
                "cell",
                instance,
            ),
        ).toEqual({
            props: { title: "2" },
            class: "cell-2",
            style: { order: 2 },
            unstyled: true,
        });
        expect(instance).toHaveBeenCalledTimes(1);
    });

    it("leaves global unstyled to Root, and resolves keyed overrides", () => {
        for (const unstyled of [
            undefined,
            null,
            false,
            true,
            { cell: false },
        ]) {
            expect(
                resolveWebSlotCustomization({ unstyled }, "cell").unstyled,
            ).toBeUndefined();
        }
        expect(
            resolveWebSlotCustomization({ unstyled: { cell: true } }, "cell")
                .unstyled,
        ).toBe(true);
    });
});
